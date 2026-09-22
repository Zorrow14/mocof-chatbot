// =============================================================
// FILE: lib/invoiceInput.js
// Validation and parsing for the staff invoice tool. Pure functions, no
// network, no dependencies — which is the point: api/staff-create-invoice.js
// imports `stripe` and therefore cannot be loaded by the test suite at all, so
// anything left inside it is untestable. Same rationale as
// lib/depositNotification.js.
//
// validateInvoiceInput() is the gate between staff input and real money. It
// runs on the SERVER against the fields the staff member confirmed, never
// against Gemini's raw output: the model proposes, a human edits, and this
// function decides whether the result is chargeable.
// =============================================================

// Fat-finger guard. An order legitimately above this exists, but "typed an
// extra zero" is far more likely, and a wrong invoice sent to a customer is
// expensive to unwind. Raising it is a deliberate code change, not a runtime
// override — there is no way for a request to opt out.
export const MAX_INVOICE_AMOUNT_RM = 100000;
export const MAX_LINE_ITEMS = 50;
export const SUPPORTED_CURRENCY = 'myr';

// Deliberately loose: "plausible", not RFC 5322. The real proof an address
// works is Stripe delivering to it; this only catches obvious typos and empty
// values before they reach Stripe.
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function fail(error) {
    return { ok: false, error };
}

/**
 * Accepts a number, or a string a human typed ("1,500", " RM 1500 ").
 * Returns null for anything that isn't a clean finite number — including
 * NaN, Infinity, booleans, and strings with leftover junk.
 */
function toAmount(raw) {
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
    if (typeof raw !== 'string') return null;

    const cleaned = raw.replace(/rm/gi, '').replace(/,/g, '').trim();
    if (cleaned === '' || !/^\d*\.?\d+$/.test(cleaned)) return null;

    const value = Number(cleaned);
    return Number.isFinite(value) ? value : null;
}

/**
 * @returns {{ ok: true, value: object } | { ok: false, error: string }}
 * On success, `value` carries amounts already converted to sen, so the caller
 * does no arithmetic of its own.
 */
export function validateInvoiceInput(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return fail('Invoice details are missing.');
    }

    const customerName = typeof input.customerName === 'string' ? input.customerName.trim() : '';
    if (customerName === '') return fail('A customer name is required.');
    if (customerName.length > 200) return fail('That customer name is too long.');

    const customerEmail = typeof input.customerEmail === 'string' ? input.customerEmail.trim() : '';
    if (customerEmail === '') return fail('A customer email is required.');
    if (customerEmail.length > 254 || !EMAIL_PATTERN.test(customerEmail)) {
        return fail(`"${customerEmail}" does not look like a valid email address.`);
    }

    // Only MYR is supported. Accepting an unchecked currency would let a
    // request denominate the invoice in something else entirely while the
    // amounts stay the same numbers.
    //
    // Absent means "the default"; present-but-wrong means rejected. A non-string
    // currency must not quietly become MYR — that would silently reinterpret a
    // request whose intent we could not read.
    let currency = SUPPORTED_CURRENCY;
    if (input.currency !== undefined && input.currency !== null) {
        if (typeof input.currency !== 'string') {
            return fail(`Only ${SUPPORTED_CURRENCY.toUpperCase()} invoices are supported.`);
        }
        currency = input.currency.trim().toLowerCase();
    }
    if (currency !== SUPPORTED_CURRENCY) {
        return fail(`Only ${SUPPORTED_CURRENCY.toUpperCase()} invoices are supported.`);
    }

    if (!Array.isArray(input.lineItems) || input.lineItems.length === 0) {
        return fail('Add at least one line item.');
    }
    if (input.lineItems.length > MAX_LINE_ITEMS) {
        return fail(`An invoice cannot have more than ${MAX_LINE_ITEMS} line items.`);
    }

    const lineItems = [];
    let totalRm = 0;

    for (let i = 0; i < input.lineItems.length; i++) {
        const row = input.lineItems[i];
        const position = `Line ${i + 1}`;

        if (!row || typeof row !== 'object' || Array.isArray(row)) {
            return fail(`${position} is not a valid line item.`);
        }

        const description = typeof row.description === 'string' ? row.description.trim() : '';
        if (description === '') return fail(`${position} needs a description.`);
        if (description.length > 500) return fail(`${position}'s description is too long.`);

        const amount = toAmount(row.amount);
        if (amount === null) return fail(`${position} has an amount that is not a number.`);
        if (amount <= 0) return fail(`${position} must be more than RM 0.`);
        if (amount > MAX_INVOICE_AMOUNT_RM) {
            return fail(`${position} exceeds the RM ${MAX_INVOICE_AMOUNT_RM.toLocaleString('en-US')} safety limit.`);
        }

        totalRm += amount;
        lineItems.push({
            description,
            amount,
            // Stripe works in the smallest currency unit (sen). Rounded here,
            // once, so no caller re-derives it differently.
            amountCents: Math.round(amount * 100)
        });
    }

    // Also capped in total: splitting a mistyped figure across lines should not
    // slip past a per-line ceiling.
    if (totalRm > MAX_INVOICE_AMOUNT_RM) {
        return fail(`The invoice total exceeds the RM ${MAX_INVOICE_AMOUNT_RM.toLocaleString('en-US')} safety limit.`);
    }

    return {
        ok: true,
        value: {
            customerName,
            customerEmail,
            currency,
            lineItems,
            totalRm: Math.round(totalRm * 100) / 100
        }
    };
}

/**
 * Reads the model's proposed invoice. The prompt demands strict JSON, but this
 * project's rule is to verify in code rather than trust the model, so fenced
 * output is tolerated and anything unparseable returns null instead of
 * throwing. Nothing here is authoritative — whatever comes out is shown to a
 * human to edit, and validateInvoiceInput() is what actually gates the charge.
 */
export function parseProposedInvoice(raw) {
    if (typeof raw !== 'string') return null;

    let text = raw.trim();
    const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fenced) text = fenced[1].trim();
    if (text === '') return null;

    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch {
        return null;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

    const lineItems = Array.isArray(parsed.lineItems)
        ? parsed.lineItems
            .filter(row => row && typeof row === 'object' && !Array.isArray(row))
            .map(row => ({
                description: typeof row.description === 'string' ? row.description : '',
                // Kept as null rather than 0 when the model couldn't work out a
                // figure: 0 would render as a real amount in the edit form.
                amount: toAmount(row.amount)
            }))
        : [];

    return {
        customerName: typeof parsed.customerName === 'string' ? parsed.customerName : '',
        customerEmail: typeof parsed.customerEmail === 'string' && parsed.customerEmail.trim() !== ''
            ? parsed.customerEmail.trim()
            : null,
        lineItems,
        currency: SUPPORTED_CURRENCY,
        clarifyingQuestion: typeof parsed.clarifyingQuestion === 'string' && parsed.clarifyingQuestion.trim() !== ''
            ? parsed.clarifyingQuestion.trim()
            : null
    };
}
