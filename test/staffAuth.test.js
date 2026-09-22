// =============================================================
// FILE: test/staffAuth.test.js
// Run with: npm test  (or: node --test test/staffAuth.test.js)
//
// Covers the two pure pieces of the staff invoice tool: the session token, and
// the validator that stands between staff input and a real Stripe invoice.
// Both are in lib/ precisely so they can be tested — api/staff-create-invoice.js
// imports `stripe` and so cannot be loaded by this suite, and nothing here
// touches Stripe or Gemini over the network.
// =============================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
    signStaffToken,
    verifyStaffToken,
    passcodeMatches,
    buildStaffCookie,
    readStaffCookie,
    isLocalRequest,
    STAFF_SESSION_TTL_MS,
    STAFF_COOKIE_NAME
} from '../lib/staffAuth.js';

import {
    validateInvoiceInput,
    parseProposedInvoice,
    MAX_INVOICE_AMOUNT_RM
} from '../lib/invoiceInput.js';

const SECRET = 'test-staff-session-secret-do-not-use-in-production';
const HOUR = 60 * 60 * 1000;

// The module reads process.env at call time, so setting it here is enough.
// node --test runs each test FILE in its own process, so this cannot leak into
// the other suite.
process.env.STAFF_SESSION_SECRET = SECRET;

describe('staff session tokens', () => {

    test('a freshly signed token verifies', () => {
        assert.equal(verifyStaffToken(signStaffToken()), true);
    });

    test('the token carries its expiry in the clear, signed', () => {
        const now = Date.now();
        const token = signStaffToken(now);
        const [expiry, signature] = token.split('.');
        assert.equal(Number(expiry), now + STAFF_SESSION_TTL_MS);
        assert.match(signature, /^[0-9a-f]{64}$/, 'HMAC-SHA256 hex digest');
        assert.equal(STAFF_SESSION_TTL_MS, 8 * HOUR, 'sessions last 8 hours');
    });

    // The whole point of signing: a client may read the expiry but cannot move it.
    test('a tampered signature does not verify', () => {
        const token = signStaffToken();
        const dot = token.indexOf('.');
        const signature = token.slice(dot + 1);
        // Flip exactly one character of the signature.
        const flipped = (signature[0] === 'a' ? 'b' : 'a') + signature.slice(1);
        assert.equal(verifyStaffToken(token.slice(0, dot + 1) + flipped), false);
    });

    test('an extended expiry does not verify', () => {
        const token = signStaffToken();
        const [expiry, signature] = token.split('.');
        const extended = `${Number(expiry) + 100 * HOUR}.${signature}`;
        assert.equal(verifyStaffToken(extended), false, 'the signature covers the expiry');
    });

    test('an expired token does not verify', () => {
        // Signed 9 hours ago, so its 8-hour expiry passed an hour back.
        const stale = signStaffToken(Date.now() - 9 * HOUR);
        assert.equal(verifyStaffToken(stale), false);
    });

    test('a token that expires in a minute still verifies', () => {
        const almost = signStaffToken(Date.now() - STAFF_SESSION_TTL_MS + 60 * 1000);
        assert.equal(verifyStaffToken(almost), true);
    });

    test('malformed tokens are rejected rather than throwing', () => {
        const junk = ['', '.', 'abc', 'abc.def', '.abc', 'abc.', null, undefined, 42, {}, [],
            'not-a-number.0000000000000000000000000000000000000000000000000000000000000000'];
        for (const token of junk) {
            assert.equal(verifyStaffToken(token), false, 'must reject ' + JSON.stringify(token));
        }
    });

    test('a token signed with a different secret does not verify', () => {
        const token = signStaffToken();
        process.env.STAFF_SESSION_SECRET = 'a-completely-different-secret';
        try {
            assert.equal(verifyStaffToken(token), false);
        } finally {
            process.env.STAFF_SESSION_SECRET = SECRET;
        }
    });

    // Without a configured secret there is no such thing as a valid session:
    // it must fail closed, never open.
    test('with no secret configured, nothing verifies and signing throws', () => {
        const saved = process.env.STAFF_SESSION_SECRET;
        delete process.env.STAFF_SESSION_SECRET;
        try {
            assert.equal(verifyStaffToken('anything.at-all'), false);
            assert.throws(() => signStaffToken(), /STAFF_SESSION_SECRET/);
        } finally {
            process.env.STAFF_SESSION_SECRET = saved;
        }
    });
});

describe('staff passcode comparison', () => {

    test('accepts the exact passcode and rejects everything else', () => {
        assert.equal(passcodeMatches('correct horse battery', 'correct horse battery'), true);
        assert.equal(passcodeMatches('correct horse batterz', 'correct horse battery'), false);
        assert.equal(passcodeMatches('Correct Horse Battery', 'correct horse battery'), false);
    });

    // Hashing both sides first is what lets a wrong-length guess take the same
    // path as a same-length one, instead of returning early.
    test('a guess of a different length is rejected, not thrown on', () => {
        assert.equal(passcodeMatches('x', 'a-much-longer-passcode'), false);
        assert.equal(passcodeMatches('a-much-longer-guess-than-the-real-one', 'short'), false);
    });

    test('empty and non-string values never match', () => {
        for (const bad of ['', null, undefined, 0, {}, []]) {
            assert.equal(passcodeMatches(bad, 'real-passcode'), false);
            assert.equal(passcodeMatches('real-passcode', bad), false);
        }
    });
});

describe('staff session cookie', () => {

    test('carries the flags that keep it out of JS and off other sites', () => {
        const cookie = buildStaffCookie('tok');
        assert.match(cookie, /^mocof_staff_session=tok/);
        assert.match(cookie, /HttpOnly/, 'must not be readable from JavaScript');
        assert.match(cookie, /SameSite=Strict/, 'must not be sent from another site');
        assert.match(cookie, /Secure/);
        assert.match(cookie, new RegExp('Max-Age=' + Math.floor(STAFF_SESSION_TTL_MS / 1000)));
    });

    test('Secure can be dropped for local http development only', () => {
        assert.doesNotMatch(buildStaffCookie('tok', { secure: false }), /Secure/);
        assert.equal(isLocalRequest({ headers: { host: 'localhost:3000' } }), true);
        assert.equal(isLocalRequest({ headers: { host: '127.0.0.1:3000' } }), true);
        assert.equal(isLocalRequest({ headers: { host: 'mocof-chatbot.vercel.app' } }), false,
            'a deployed host must always get Secure');
    });

    test('reads its own cookie from among others', () => {
        const req = { headers: { cookie: `other=1; ${STAFF_COOKIE_NAME}=abc.def; another=2` } };
        assert.equal(readStaffCookie(req), 'abc.def');
        assert.equal(readStaffCookie({ headers: {} }), null);
        assert.equal(readStaffCookie({ headers: { cookie: 'unrelated=1' } }), null);
        assert.equal(readStaffCookie({}), null);
    });

    test('a signed token survives a round trip through the cookie', () => {
        const token = signStaffToken();
        const cookie = buildStaffCookie(token);
        const value = cookie.slice(cookie.indexOf('=') + 1, cookie.indexOf(';'));
        assert.equal(verifyStaffToken(readStaffCookie({ headers: { cookie: `${STAFF_COOKIE_NAME}=${value}` } })), true);
    });
});

describe('invoice input validation', () => {

    const VALID = {
        customerName: 'Aisyah Binti Rahman',
        customerEmail: 'aisyah@example.com',
        currency: 'myr',
        lineItems: [
            { description: 'Murano Queen wall bed', amount: 14371.55 },
            { description: 'Delivery and installation', amount: 300 }
        ]
    };

    test('accepts a well-formed invoice and converts amounts to sen', () => {
        const result = validateInvoiceInput(VALID);
        assert.equal(result.ok, true, result.error);
        assert.equal(result.value.customerEmail, 'aisyah@example.com');
        assert.deepEqual(result.value.lineItems.map(i => i.amountCents), [1437155, 30000]);
        assert.equal(result.value.totalRm, 14671.55);
        assert.equal(result.value.currency, 'myr');
    });

    test('rejects empty or missing line items', () => {
        for (const lineItems of [[], undefined, null, 'none', {}]) {
            const result = validateInvoiceInput({ ...VALID, lineItems });
            assert.equal(result.ok, false, 'must reject ' + JSON.stringify(lineItems));
            assert.match(result.error, /line item/i);
        }
    });

    // The money guard: nothing that isn't a real positive number gets through.
    test('rejects zero, negative, and non-numeric amounts', () => {
        for (const amount of [0, -1, -14371.55, NaN, Infinity, -Infinity, 'abc', '', null, undefined, {}, [], true]) {
            const result = validateInvoiceInput({ ...VALID, lineItems: [{ description: 'Thing', amount }] });
            assert.equal(result.ok, false, 'must reject amount ' + JSON.stringify(amount));
        }
    });

    test('accepts amounts a human typed, with commas or RM', () => {
        const result = validateInvoiceInput({
            ...VALID,
            lineItems: [{ description: 'Wall bed', amount: 'RM 14,371.55' }]
        });
        assert.equal(result.ok, true, result.error);
        assert.equal(result.value.lineItems[0].amountCents, 1437155);
    });

    test('rejects a malformed email', () => {
        for (const customerEmail of ['', 'not-an-email', 'a@b', 'a@b.c', '@example.com', 'a b@example.com', null, 42]) {
            const result = validateInvoiceInput({ ...VALID, customerEmail });
            assert.equal(result.ok, false, 'must reject email ' + JSON.stringify(customerEmail));
        }
    });

    test('requires a customer name', () => {
        assert.equal(validateInvoiceInput({ ...VALID, customerName: '   ' }).ok, false);
        assert.equal(validateInvoiceInput({ ...VALID, customerName: null }).ok, false);
    });

    // Fat-finger guard — per line and in total, so splitting a mistyped figure
    // across two lines doesn't slip past.
    test('rejects amounts over the safety ceiling, per line and in total', () => {
        const overOneLine = validateInvoiceInput({
            ...VALID,
            lineItems: [{ description: 'Typo', amount: MAX_INVOICE_AMOUNT_RM + 1 }]
        });
        assert.equal(overOneLine.ok, false);
        assert.match(overOneLine.error, /limit/i);

        const overInTotal = validateInvoiceInput({
            ...VALID,
            lineItems: [
                { description: 'Half', amount: MAX_INVOICE_AMOUNT_RM * 0.6 },
                { description: 'Other half', amount: MAX_INVOICE_AMOUNT_RM * 0.6 }
            ]
        });
        assert.equal(overInTotal.ok, false);
        assert.match(overInTotal.error, /total/i);

        assert.equal(validateInvoiceInput({
            ...VALID, lineItems: [{ description: 'At the limit', amount: MAX_INVOICE_AMOUNT_RM }]
        }).ok, true, 'the ceiling itself is allowed');
    });

    test('rejects a currency other than MYR', () => {
        for (const currency of ['usd', 'sgd', 'MYRX', 123]) {
            assert.equal(validateInvoiceInput({ ...VALID, currency }).ok, false, 'must reject ' + currency);
        }
        assert.equal(validateInvoiceInput({ ...VALID, currency: 'MYR' }).ok, true, 'case-insensitive');
        const { currency, ...noCurrency } = VALID;
        assert.equal(validateInvoiceInput(noCurrency).ok, true, 'defaults to MYR');
    });

    test('rejects a missing or non-object body outright', () => {
        for (const body of [null, undefined, 'text', 42, []]) {
            assert.equal(validateInvoiceInput(body).ok, false);
        }
    });

    test('requires a description on every line', () => {
        assert.equal(validateInvoiceInput({ ...VALID, lineItems: [{ description: '  ', amount: 100 }] }).ok, false);
        assert.equal(validateInvoiceInput({ ...VALID, lineItems: [{ amount: 100 }] }).ok, false);
    });
});

describe('parsing the model-proposed invoice', () => {

    const GOOD = JSON.stringify({
        customerName: 'Aisyah',
        customerEmail: 'aisyah@example.com',
        lineItems: [{ description: 'Murano Queen', amount: 14371.55 }],
        currency: 'myr',
        clarifyingQuestion: null
    });

    test('reads a strict JSON reply', () => {
        const parsed = parseProposedInvoice(GOOD);
        assert.equal(parsed.customerName, 'Aisyah');
        assert.equal(parsed.customerEmail, 'aisyah@example.com');
        assert.equal(parsed.lineItems[0].amount, 14371.55);
        assert.equal(parsed.clarifyingQuestion, null);
    });

    // The prompt forbids fences; the code tolerates them anyway, because this
    // project verifies in code rather than trusting the model to comply.
    test('tolerates markdown fences the prompt told it not to use', () => {
        assert.equal(parseProposedInvoice('```json\n' + GOOD + '\n```').customerName, 'Aisyah');
        assert.equal(parseProposedInvoice('```\n' + GOOD + '\n```').customerName, 'Aisyah');
    });

    test('returns null for anything unparseable, rather than throwing', () => {
        for (const raw of ['', '   ', 'Sure! Here is the invoice:', '{broken', '[]', 'null', '42', null, undefined, {}]) {
            assert.equal(parseProposedInvoice(raw), null, 'must reject ' + JSON.stringify(raw));
        }
    });

    test('keeps a missing amount as null rather than zero', () => {
        const parsed = parseProposedInvoice(JSON.stringify({
            customerName: 'Aisyah',
            lineItems: [{ description: 'Wall bed', amount: null }, { description: 'Delivery' }],
            clarifyingQuestion: 'What is the price of the wall bed?'
        }));
        assert.equal(parsed.lineItems[0].amount, null, 'zero would look like a real amount in the form');
        assert.equal(parsed.lineItems[1].amount, null);
        assert.equal(parsed.clarifyingQuestion, 'What is the price of the wall bed?');
        assert.equal(parsed.customerEmail, null);
    });

    test('never hands back a currency other than MYR', () => {
        const parsed = parseProposedInvoice(JSON.stringify({ ...JSON.parse(GOOD), currency: 'usd' }));
        assert.equal(parsed.currency, 'myr');
    });
});
