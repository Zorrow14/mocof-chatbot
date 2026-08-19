// =============================================================
// FILE: lib/googleSheets.js
// Minimal Google Sheets API client for Phase 4 (lead + event logging).
//
// Deliberately implemented with ONLY Node's built-in `crypto` + native
// `fetch` — no `googleapis` package — to match this repo's existing
// zero-npm-dependency approach (see package.json: no "dependencies" key
// at all). The service-account JWT bearer flow this replaces what
// `googleapis` would otherwise do for you is ~60 lines of well-documented,
// stable Google OAuth2 protocol — not worth a multi-MB dependency for.
//
// SETUP (see README.md "Lead & event logging" section for the full
// walkthrough with screenshots-equivalent steps):
//   1. In Google Cloud Console: create/reuse a project, enable the Google
//      Sheets API, create a Service Account, and create a JSON key for it.
//   2. Create a Google Sheet with two tabs named exactly `Leads` and
//      `Events` (header rows are documented in the README, not enforced
//      here — this file only ever appends rows, it never creates tabs or
//      headers).
//   3. Share that Sheet with the service account's email address (found in
//      the JSON key as `client_email`) with Editor access — the service
//      account has ZERO access to any sheet it hasn't been explicitly
//      shared with, same as any other Google account.
//   4. Set these three Vercel environment variables:
//        GOOGLE_SERVICE_ACCOUNT_EMAIL        (the JSON key's client_email)
//        GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY  (the JSON key's private_key,
//          pasted as-is — see privateKey normalization below)
//        GOOGLE_SHEETS_SPREADSHEET_ID        (from the sheet's URL:
//          docs.google.com/spreadsheets/d/THIS_PART_HERE/edit)
//
// If any of the three env vars are missing, every exported function here
// is a safe no-op that returns false/skips — this module NEVER throws out
// of appendRow(), and logging failures NEVER affect the customer-facing
// chat reply in api/chat.js. You can deploy Phase 4's code before
// finishing the Google Cloud setup with zero risk to the live bot.
// =============================================================

import crypto from 'node:crypto';

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

function getConfig() {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    if (!email || !rawKey || !spreadsheetId) return null;

    // Most env-var UIs (Vercel included) can't store a real multi-line PEM
    // key cleanly if it's pasted with actual newlines — the common
    // workaround is pasting it with literal backslash-n sequences instead.
    // Restore those to real newlines before handing the key to
    // crypto.createSign(), or RSA signing fails with an opaque
    // "error:1E08010C:DECODER routines" error that gives no hint why.
    const privateKey = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;

    return { email, privateKey, spreadsheetId };
}

// True once all three env vars are set — lets callers skip doing extra
// work (like an LLM extraction call) when there's nowhere to log the
// result to yet, without needing to know this module's internals.
export function isSheetsConfigured() {
    return getConfig() !== null;
}

function base64url(buffer) {
    return Buffer.from(buffer)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// Builds and RS256-signs a Google service-account JWT assertion — the
// standard OAuth2 "JWT bearer" flow Google's own client libraries also use
// under the hood. Node's built-in crypto module handles the RSA signing.
function buildSignedJwt(email, privateKey) {
    const nowSec = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claims = {
        iss: email,
        scope: SHEETS_SCOPE,
        aud: TOKEN_URL,
        iat: nowSec,
        exp: nowSec + 3600 // Google caps this at 1 hour regardless of what's requested
    };
    const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
    const signature = crypto.createSign('RSA-SHA256').update(signingInput).sign(privateKey);
    return `${signingInput}.${base64url(signature)}`;
}

// Module-scope cache — reused across warm invocations of the same
// serverless container (saves a full token exchange round-trip on every
// single chat turn), but never relied upon for correctness: a cold start
// or an expired entry just re-authenticates transparently.
let cachedToken = null; // { accessToken, expiresAtMs }

async function getAccessToken(config) {
    const now = Date.now();
    if (cachedToken && cachedToken.expiresAtMs - now > 60_000) {
        return cachedToken.accessToken;
    }

    const jwt = buildSignedJwt(config.email, config.privateKey);
    const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt
        })
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Google token exchange failed: ${res.status} ${errText}`);
    }

    const data = await res.json();
    if (!data.access_token) {
        throw new Error('Google token exchange succeeded but returned no access_token');
    }

    cachedToken = {
        accessToken: data.access_token,
        expiresAtMs: now + (data.expires_in || 3600) * 1000
    };
    return cachedToken.accessToken;
}

function withTimeout(promise, ms) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`googleSheets call timed out after ${ms}ms`)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function doAppendRow(config, tabName, rowValues) {
    const accessToken = await getAccessToken(config);
    // A1 notation range of just column A on the target tab — combined with
    // `append`, Sheets finds the end of whatever data already exists in
    // that tab and inserts after it. This is the standard idiom for
    // "add a row to the end" without needing to track the last row number.
    const range = encodeURIComponent(`${tabName}!A:A`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ values: [rowValues] })
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Sheets API append to '${tabName}' failed: ${res.status} ${errText}`);
    }
}

/**
 * Appends one row to the given tab of the configured spreadsheet.
 * NEVER throws — returns true on success, false on ANY failure (missing
 * config, expired/invalid credentials, network error, timeout, or the tab
 * not existing). Every failure is console.error'd (or console.warn for the
 * expected "not configured yet" case) so it's visible in Vercel logs, but
 * never propagates to the caller.
 *
 * @param {string} tabName    - e.g. 'Leads' or 'Events'. Must already exist
 *                               as a tab in the spreadsheet — this function
 *                               does not create tabs.
 * @param {Array}  rowValues  - one cell per array entry, left to right.
 * @param {number} [timeoutMs=6000] - caller should pass a short timeout
 *                               (~1-2s) for logging that runs on every chat
 *                               turn, and can afford a longer one (~8s) for
 *                               rare, high-value events like a completed
 *                               lead — see api/chat.js call sites.
 * @returns {Promise<boolean>}
 */
export async function appendRow(tabName, rowValues, timeoutMs = 6000) {
    const config = getConfig();
    if (!config) {
        // Expected during initial setup (or if Phase 4 logging is simply
        // not wanted) — not an error, so this stays a warn, not an error.
        console.warn(`googleSheets.appendRow('${tabName}') skipped: GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY / GOOGLE_SHEETS_SPREADSHEET_ID not fully set in the environment`);
        return false;
    }

    try {
        await withTimeout(doAppendRow(config, tabName, rowValues), timeoutMs);
        return true;
    } catch (err) {
        console.error(`googleSheets.appendRow('${tabName}') failed:`, err.message || err);
        return false;
    }
}