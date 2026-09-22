// =============================================================
// FILE: api/staff-create-invoice.js
// Creates a REAL Stripe invoice from fields a staff member reviewed and
// confirmed. Endpoint: POST /api/staff-create-invoice
// Body: { customerName, customerEmail, lineItems: [{description, amount}], currency }
// Env vars: STRIPE_SECRET_KEY, STAFF_*
//
// This is the only file in the staff tool that creates anything. It takes
// structured fields, never free text and never the model's raw output — by the
// time a request arrives here a human has read every amount on screen.
// Validation still runs server-side regardless (lib/invoiceInput.js): the
// browser form is a convenience, not a control.
//
// STAFF ROUTE — same-origin only, auth first.
// =============================================================

import Stripe from 'stripe';
import { requireStaffAuth } from '../lib/staffAuth.js';
import { validateInvoiceInput } from '../lib/invoiceInput.js';

const DAYS_UNTIL_DUE = 3;

function getStripeClient() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return null;
    return new Stripe(key);
}

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Before Stripe is even constructed.
    if (!requireStaffAuth(req, res)) return;

    const stripe = getStripeClient();
    if (!stripe) {
        console.error('STRIPE_SECRET_KEY not set — the staff tool cannot create invoices');
        return res.status(500).json({ error: 'Server configuration error — invoicing is not configured.' });
    }

    const validation = validateInvoiceInput(req.body);
    if (!validation.ok) {
        // Nothing has been created at this point, and nothing will be.
        return res.status(400).json({ error: validation.error });
    }
    const { customerName, customerEmail, currency, lineItems } = validation.value;

    try {
        // 1. Reuse the customer if MOCOF has invoiced this address before, so
        //    Stripe's dashboard shows one customer with a payment history
        //    rather than a new record per invoice.
        const existing = await stripe.customers.list({ email: customerEmail, limit: 1 });
        const customer = existing.data.length > 0
            ? existing.data[0]
            : await stripe.customers.create({ email: customerEmail, name: customerName });

        // 2. Create the DRAFT invoice before its line items, then attach each
        //    item to it explicitly by id.
        //
        //    The usual order (items first, then an invoice that sweeps up
        //    whatever is pending for that customer) is a trap here: an earlier
        //    attempt that failed after creating items leaves them pending, and
        //    the next invoice for that customer would silently include them.
        //    Attaching by id means this invoice contains exactly what was on
        //    screen and nothing else.
        const invoice = await stripe.invoices.create({
            customer: customer.id,
            collection_method: 'send_invoice',
            days_until_due: DAYS_UNTIL_DUE,
            // Staff share the hosted link themselves, so Stripe must not also
            // sweep in unrelated pending items from any other flow.
            pending_invoice_items_behavior: 'exclude',
            description: `MOCOF order for ${customerName}`,
            metadata: { source: 'mocof_staff_invoice_tool' }
        });

        for (const item of lineItems) {
            await stripe.invoiceItems.create({
                customer: customer.id,
                invoice: invoice.id,
                amount: item.amountCents,
                currency,
                description: item.description
            });
        }

        // 3. Finalizing is what produces hosted_invoice_url — a draft has none.
        const finalized = await stripe.invoices.finalizeInvoice(invoice.id);

        console.log(`[staff] invoice ${finalized.id} finalized for ${customerEmail} (${lineItems.length} line item(s))`);

        return res.status(200).json({
            invoiceId: finalized.id,
            hostedInvoiceUrl: finalized.hosted_invoice_url,
            invoicePdf: finalized.invoice_pdf,
            total: typeof finalized.total === 'number' ? finalized.total / 100 : null,
            currency
        });
    } catch (err) {
        // Stripe's own message is surfaced deliberately: this is a staff-only
        // tool behind auth, and "No such customer" or "amount too small" is
        // exactly what the person needs to know to fix it themselves.
        console.error('[staff] Stripe invoice creation failed:', err.message || err);
        return res.status(502).json({
            error: `Stripe could not create the invoice: ${err.message || 'unknown error'}`
        });
    }
}
