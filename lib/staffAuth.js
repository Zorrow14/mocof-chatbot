// =============================================================
// FILE: lib/staffAuth.js
// Staff session auth for the invoice tool. Stateless and DB-free, like the
// rest of this project: the session IS the token, an expiry timestamp signed
// with HMAC-SHA256 using STAFF_SESSION_SECRET. Nothing is stored server-side,
// so there is nothing to look up and nothing to leak.
//
// Uses node:crypto directly rather than adding a JWT library, mirroring
// lib/sheetsLogger.js, which hand-signs its Google JWT with createSign for the
// same reason: `stripe` is the project's only runtime dependency and it is
// worth keeping it that way.
//
// THE SECURITY BOUNDARY. The customer endpoint /api/chat is deliberately open
// to the world (Access-Control-Allow-Origin: *, no auth). Everything the staff
// invoice tool can do — spending money's worth of Stripe invoices in MOCOF's
// name — sits behind requireStaffAuth() below, and nothing in this file or the
// staff routes is reachable from that public endpoint. Keep it that way: no
// staff route may ever be imported by, or import from, the customer chat path.
// =============================================================

import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

// 8 hours: long enough for a full shift without re-entering the passcode,
// short enough that a forgotten open tab on a shared terminal stops working
// the same day.
export const STAFF_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
export const STAFF_COOKIE_NAME = 'mocof_staff_session';

function getSessionSecret() {
    const secret = process.env.STAFF_SESSION_SECRET;
    if (typeof secret !== 'string' || secret.trim() === '') return null;
    return secret;
}

function sign(payload, secret) {
    return createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

/**
 * `${expiryTimestamp}.${hmac}`. The expiry is in the clear on purpose — it is
 * not a secret, and putting it in the signed payload is what stops a client
 * editing it: changing the number invalidates the signature.
 */
export function signStaffToken(nowMs = Date.now()) {
    const secret = getSessionSecret();
    if (!secret) throw new Error('STAFF_SESSION_SECRET is not configured');
    const expiry = nowMs + STAFF_SESSION_TTL_MS;
    return `${expiry}.${sign(String(expiry), secret)}`;
}

/**
 * True only for a token this server signed that has not yet expired. Never
 * compares signatures with === : that short-circuits on the first differing
 * byte, so response timing leaks how much of a guessed signature was right.
 */
export function verifyStaffToken(token, nowMs = Date.now()) {
    const secret = getSessionSecret();
    if (!secret) return false;
    if (typeof token !== 'string' || token === '') return false;

    const dot = token.indexOf('.');
    if (dot <= 0 || dot === token.length - 1) return false;

    const expiryPart = token.slice(0, dot);
    const signaturePart = token.slice(dot + 1);
    if (!/^\d+$/.test(expiryPart)) return false;

    const supplied = Buffer.from(signaturePart, 'utf8');
    const expected = Buffer.from(sign(expiryPart, secret), 'utf8');

    // timingSafeEqual throws on a length mismatch, so lengths are checked
    // first. A wrong LENGTH is not a secret — it only says the token is
    // malformed, not how close a guess was — so returning early is fine.
    if (supplied.length !== expected.length) return false;
    if (!timingSafeEqual(supplied, expected)) return false;

    return Number(expiryPart) > nowMs;
}

/**
 * Constant-time passcode check. Both sides are hashed to a fixed-size digest
 * first so the comparison length never depends on the real passcode — a plain
 * length check before comparing would leak how long it is.
 */
export function passcodeMatches(supplied, expected) {
    if (typeof supplied !== 'string' || typeof expected !== 'string') return false;
    if (supplied === '' || expected === '') return false;
    const a = createHash('sha256').update(supplied, 'utf8').digest();
    const b = createHash('sha256').update(expected, 'utf8').digest();
    return timingSafeEqual(a, b);
}

export function readStaffCookie(req) {
    const raw = req && req.headers ? req.headers.cookie : null;
    if (typeof raw !== 'string') return null;
    for (const part of raw.split(';')) {
        const eq = part.indexOf('=');
        if (eq === -1) continue;
        if (part.slice(0, eq).trim() !== STAFF_COOKIE_NAME) continue;
        try {
            return decodeURIComponent(part.slice(eq + 1).trim());
        } catch {
            return null; // malformed percent-encoding is just an invalid cookie
        }
    }
    return null;
}

export function buildStaffCookie(token, { secure = true } = {}) {
    const parts = [
        `${STAFF_COOKIE_NAME}=${encodeURIComponent(token)}`,
        'HttpOnly',                                        // never readable from JS
        'SameSite=Strict',                                 // never sent from another site
        'Path=/',
        `Max-Age=${Math.floor(STAFF_SESSION_TTL_MS / 1000)}`
    ];
    if (secure) parts.push('Secure');
    return parts.join('; ');
}

/**
 * Secure is required in production but makes the cookie unusable over plain
 * http, which is how `vercel dev` serves locally — the staff tool would be
 * impossible to test. Deployments are https, so this only ever relaxes on a
 * localhost host header.
 */
export function isLocalRequest(req) {
    const host = req && req.headers ? req.headers.host : '';
    return typeof host === 'string' && /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);
}

/**
 * The first line of EVERY staff route. Returns true when the caller holds a
 * valid session; otherwise it has already written a 401 and the route must
 * return immediately — before any Gemini call, any Stripe call, any work at
 * all. An unauthenticated request must cost nothing and reveal nothing.
 */
export function requireStaffAuth(req, res) {
    if (!verifyStaffToken(readStaffCookie(req))) {
        res.status(401).json({ error: 'Not signed in, or this staff session has expired.' });
        return false;
    }
    return true;
}
