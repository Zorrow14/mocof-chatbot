// =============================================================
// FILE: api/create-deposit.js
// Vercel Serverless Function — creates a Stripe Checkout Session for a
// reservation deposit against a wall bed (+ cabinetry) estimate.
// Endpoint: POST /api/create-deposit
// Body: { message, history, depositOption? }
// Env vars: STRIPE_SECRET_KEY, SITE_URL (optional — falls back to the
//           production widget origin)
// =============================================================

import Stripe from 'stripe';
import { buildDepositCharge } from './chat.js';
import { generateQuoteRef } from '../lib/reference.js';

function getStripeClient() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return null;
    return new Stripe(key);
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const stripe = getStripeClient();
    if (!stripe) {
        console.error('STRIPE_SECRET_KEY not set — configure it in Vercel to enable deposits');
        return res.status(500).json({ error: 'Server configuration error — payments are not yet configured' });
    }

    // depositOption is the ONLY deposit-related field read from the body, and
    // it is an option id, not an amount. Any grandTotal / depositAmount / amount
    // a client includes is ignored — it is never even destructured here.
    const { message, history, depositOption } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ error: 'message is required' });
    }

    // NEVER trust a grandTotal/depositAmount sent by the client. buildDepositCharge()
    // re-derives the basis from message/history using the SAME function
    // computeDepositOffer() used to show the card — not a parallel
    // reimplementation, so the quoted and charged amounts cannot diverge — and
    // then re-validates the chosen deposit option against a list rebuilt from
    // that fresh total. The amount charged below is exactly what it returns;
    // this file does no arithmetic of its own.
    const charge = buildDepositCharge(message, history, depositOption);
    if (!charge.ok) {
        if (charge.rejectedOption) {
            // Our own widget only ever sends ids the server generated, so a
            // rejected choice means drift or tampering — worth seeing. Truncated
            // because this is raw client input.
            console.warn('[deposit] rejected deposit option:', charge.reason, '|', String(JSON.stringify(depositOption)).slice(0, 100));
        }
        return res.status(charge.status).json({ error: charge.error });
    }

    const quoteRef = generateQuoteRef();
    const siteUrl = process.env.SITE_URL || 'https://mocof-chatbot.vercel.app';

    try {
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card', 'fpx'],
            line_items: [{
                price_data: {
                    currency: 'myr',
                    product_data: {
                        name: charge.productName,
                        description: `Reservation deposit, applied toward the final invoice confirmed by site survey. Quote ref ${quoteRef}.`
                    },
                    // Server-resolved in buildDepositCharge(), already in sen.
                    unit_amount: charge.unitAmountCents
                },
                quantity: 1
            }],
            // Collected by Stripe's hosted flow, not the chat widget, for the
            // same reason customer_email isn't passed below.
            //
            // phone_number_collection is Stripe's purpose-built toggle and
            // populates customer_details.phone. There is no equivalent
            // standalone "collect name" switch: customer_details.name is filled
            // from the billing-details form, so billing_address_collection has
            // to be required to get a name reliably. Relying on the card form's
            // cardholder-name field instead would leave the name blank for FPX
            // payments — a Malaysian bank-transfer method with no such field,
            // and one this session explicitly accepts — which is silent data
            // loss on a meaningful share of real customers. The address it also
            // collects is not waste here: these deposits lead to a site survey
            // and a delivery.
            phone_number_collection: { enabled: true },
            billing_address_collection: 'required',
            // No customer_email is passed here on purpose — the widget doesn't
            // collect one today (see the proposal's Open Questions), and Stripe
            // Checkout already prompts for an email as part of its own hosted
            // flow, so nothing is lost by letting Stripe collect it rather than
            // adding a new question to the chat widget just to duplicate it.
            //
            // Everything except quote_ref is built by buildDepositCharge() — see
            // that function for what each field is and why.
            metadata: {
                quote_ref: quoteRef,
                ...charge.metadata
            },
            success_url: `${siteUrl}/deposit-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: siteUrl
        });

        return res.status(200).json({
            success: true,
            url: session.url,
            quoteRef,
            depositAmount: charge.depositAmount,
            grandTotal: charge.grandTotal,
            depositOption: charge.option.id,
            depositOptionLabel: charge.option.label
        });
    } catch (err) {
        console.error('Stripe checkout session creation failed:', err.message || err);
        return res.status(502).json({ error: 'Could not start the payment session — please try again or contact us on WhatsApp.' });
    }
}
