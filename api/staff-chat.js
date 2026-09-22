// =============================================================
// FILE: api/staff-chat.js
// Turns a staff member's plain-English order description into a PROPOSED
// invoice for them to review. Endpoint: POST /api/staff-chat
// Body: { message, history }   Env vars: GEMINI_API_KEY (+ _2), STAFF_*
//
// THIS ENDPOINT NEVER TOUCHES STRIPE. It proposes; api/staff-create-invoice.js
// is the only thing that creates anything, and it takes the human-confirmed
// fields rather than anything this file returned. That split is the whole
// safety model: the model's output is a draft on a screen, never an instruction
// that money follows.
//
// STAFF ROUTE — same-origin only, auth first. Shares nothing with the public
// /api/chat path except lib/gemini.js, which knows only how to call an API.
// =============================================================

import { requireStaffAuth } from '../lib/staffAuth.js';
import { getGeminiApiKeys, callGeminiWithFallback, GEMINI_MODEL } from '../lib/gemini.js';
import { parseProposedInvoice } from '../lib/invoiceInput.js';

const MAX_HISTORY_TURNS = 12;

// Note what this prompt does NOT contain: any MOCOF pricing, catalog or
// persona. The staff member supplies the amounts; the model's only job is to
// shape what they typed into fields. It is explicitly told not to invent
// prices, because a plausible-looking invented amount is the one failure here
// that a human reviewer might not catch.
const STAFF_SYSTEM_PROMPT = `You help MOCOF staff draft an invoice from a plain-English description of an order.

Respond with STRICT JSON ONLY. No prose, no explanation, no markdown code fences. Your entire reply must be a single JSON object of exactly this shape:

{
  "customerName": string,
  "customerEmail": string or null,
  "lineItems": [ { "description": string, "amount": number } ],
  "currency": "myr",
  "clarifyingQuestion": string or null
}

Rules:
- "amount" is a plain number in Malaysian Ringgit (RM). No currency symbols, no commas, no thousands separators. 1500 — not "RM 1,500".
- NEVER invent or estimate a price. Only use amounts the staff member actually stated. If an amount is missing, leave that line item's "amount" as null and ask for it in "clarifyingQuestion".
- If something essential is missing (no customer email, no amount, no idea what is being sold), set "clarifyingQuestion" to one short, specific question and still fill in whatever you did understand. Leave the rest partial — do not guess.
- When you have everything you need, set "clarifyingQuestion" to null.
- Split the order into one line item per distinct product or service.
- Keep descriptions short and factual, as they will appear on a customer's invoice.`;

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Before anything else — no Gemini call happens for an unauthenticated
    // caller, so this endpoint cannot be used as a free model proxy.
    if (!requireStaffAuth(req, res)) return;

    const { message, history } = req.body || {};
    if (typeof message !== 'string' || message.trim() === '') {
        return res.status(400).json({ error: 'message is required' });
    }

    const apiKeys = getGeminiApiKeys();
    if (apiKeys.length === 0) {
        console.error('GEMINI_API_KEY not set — the staff tool cannot parse orders');
        return res.status(500).json({ error: 'Server configuration error — the assistant is unavailable.' });
    }

    const priorTurns = Array.isArray(history) ? history.slice(-MAX_HISTORY_TURNS) : [];
    const messages = [
        { role: 'system', content: STAFF_SYSTEM_PROMPT },
        ...priorTurns
            .filter(t => t && (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string')
            .map(t => ({ role: t.role, content: t.content })),
        { role: 'user', content: message }
    ];

    let raw;
    try {
        raw = await callGeminiWithFallback(apiKeys, {
            model: GEMINI_MODEL,
            messages,
            max_completion_tokens: 2000,
            reasoning_effort: 'low'
        });
    } catch (err) {
        console.error('[staff] Gemini call failed:', err.status || 'network', err.details || err.message);
        return res.status(502).json({ error: 'Could not reach the assistant — please try again.' });
    }

    // Verified in code, not trusted from the prompt: the model is told to emit
    // bare JSON, and parseProposedInvoice still tolerates fences and returns
    // null rather than throwing on anything it cannot read.
    const proposal = parseProposedInvoice(raw);
    if (!proposal) {
        console.warn('[staff] could not parse the model reply as an invoice proposal');
        return res.status(200).json({
            proposal: null,
            clarifyingQuestion: "Sorry — I couldn't read that as an order. Could you rephrase it, including the customer's name, email, and the amount for each item?"
        });
    }

    return res.status(200).json({
        proposal,
        clarifyingQuestion: proposal.clarifyingQuestion
    });
}
