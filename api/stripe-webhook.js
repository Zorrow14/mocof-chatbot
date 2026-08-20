// =============================================================
// FILE: api/stripe-webhook.js
// Vercel Serverless Function — receives Stripe's checkout.session.completed
// event and confirms a deposit against its quote reference.
// Endpoint: POST /api/stripe-webhook — set this as the endpoint URL in the
// Stripe Dashboard (Developers → Webhooks). Never called by the widget.
// Env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
// Optional: EMAIL_API_KEY, COMPANY_NOTIFY_EMAIL — see notifyCompany() below
// =============================================================

import Stripe from 'stripe';

// Vercel parses the request body as JSON by default. Stripe's signature
// check needs the EXACT raw bytes the client sent — re-serializing a parsed
// JSON object can produce a byte-for-byte different string and silently
// break verification. Disabling the default parser here is what makes
// readRawBody() below receive the untouched body.
export const config = {
    api: {
        bodyParser: false
    }
};

function readRawBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

// Deliberately NOT wired to an email provider by default. MOCOF chose Resend
// for a general chat-alerting feature earlier in this project, then asked to
// remove that feature entirely — wiring email back in here, for a different
// purpose (payment notifications), is a real decision (which channel, which
// inbox) worth confirming rather than a default this file should quietly
// make on its own. Every confirmed deposit is logged either way (see below,
// plus Vercel's own function logs), so nothing is silently lost while that's
// pending — only the "someone gets pinged immediately" part is a no-op until
// EMAIL_API_KEY + COMPANY_NOTIFY_EMAIL are both set AND the send call below
// is actually implemented.
async function notifyCompany(details) {
    if (!process.env.EMAIL_API_KEY || !process.env.COMPANY_NOTIFY_EMAIL) {
        console.log('Deposit confirmed (no notification channel configured):', JSON.stringify(details));
        return;
    }
    // TODO: wire in Resend/SendGrid here once the channel decision is
    // confirmed — see the comment above for why this isn't done by default.
    console.log('Deposit confirmed — notification channel configured but send not yet implemented:', JSON.stringify(details));
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!webhookSecret || !stripeKey) {
        console.error('STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY not configured');
        return res.status(500).json({ error: 'Server configuration error' });
    }
    const stripe = new Stripe(stripeKey);

    const sig = req.headers['stripe-signature'];
    let event;

    try {
        const rawBody = await readRawBody(req);
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
        // Never act on an unverified body — a bad signature means either a
        // misconfigured secret or a forged request, and either way this
        // event must be rejected, not processed.
        console.error('Stripe webhook signature verification failed:', err.message);
        return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
    }

    // checkout.session.completed specifically, not the success-page
    // redirect — a customer can close the tab before the redirect fires, so
    // the webhook is the only reliable fulfillment signal (see the
    // proposal's Section 6).
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const meta = session.metadata || {};

        const details = {
            quoteRef: meta.quote_ref || null,
            wallBedModel: meta.wall_bed_model || null,
            grandTotal: meta.grand_total || null,
            depositPercent: meta.deposit_percent || null,
            depositAmountPaid: typeof session.amount_total === 'number'
                ? (session.amount_total / 100).toFixed(2)
                : null,
            customerEmail: session.customer_details?.email || null,
            stripeSessionId: session.id
        };

        await notifyCompany(details);

        // Phase 4 of the main roadmap (lead logging) can hook in here once
        // it's rebuilt — the Google Sheets integration was removed from
        // main on Aug 20, so there's nothing to log to yet.
    }

    // Acknowledge receipt for any event type Stripe sends, even ones this
    // handler doesn't act on — Stripe retries on anything other than a 2xx,
    // and there's no reason to make it retry an event we're intentionally
    // ignoring.
    return res.status(200).json({ received: true });
}
