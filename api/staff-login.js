// =============================================================
// FILE: api/staff-login.js
// Exchanges the shared staff passcode for a signed 8-hour session cookie.
// Endpoint: POST /api/staff-login   Body: { passcode }
// Env vars: STAFF_TOOL_PASSCODE, STAFF_SESSION_SECRET
//
// STAFF ROUTE — same-origin only. Unlike api/chat.js there is deliberately no
// Access-Control-Allow-Origin header here and no OPTIONS handler: a same-origin
// JSON POST needs no preflight, so the absence of CORS headers is itself the
// control that stops another site scripting this endpoint. vercel.json excludes
// /api/staff-* from the wildcard CORS rule that covers the public API.
// =============================================================

import { signStaffToken, passcodeMatches, buildStaffCookie, isLocalRequest } from '../lib/staffAuth.js';

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const passcode = process.env.STAFF_TOOL_PASSCODE;
    const sessionSecret = process.env.STAFF_SESSION_SECRET;
    if (!passcode || !sessionSecret) {
        // Logged, but never described to the caller: "not configured" tells an
        // attacker the tool exists and is unguarded.
        console.error('Staff tool not configured — STAFF_TOOL_PASSCODE and/or STAFF_SESSION_SECRET is unset');
        return res.status(503).json({ error: 'The staff tool is not available.' });
    }

    const supplied = (req.body && typeof req.body.passcode === 'string') ? req.body.passcode : '';

    // Constant-time, in lib/staffAuth.js. A plain === would return faster the
    // sooner it finds a differing character, which is enough to recover a
    // passcode one character at a time.
    if (!passcodeMatches(supplied, passcode)) {
        console.warn('[staff] failed login attempt');
        // One generic message for every failure — wrong passcode, empty
        // passcode, malformed body. Nothing distinguishes "close" from "wrong".
        return res.status(401).json({ error: 'Incorrect passcode.' });
    }

    res.setHeader('Set-Cookie', buildStaffCookie(signStaffToken(), { secure: !isLocalRequest(req) }));
    return res.status(200).json({ success: true });
}
