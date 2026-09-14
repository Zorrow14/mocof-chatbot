# Future Integration Note — FB Messenger & WhatsApp via Zernio

**Status:** Idea, not built. This note exists so whoever picks it up does so
deliberately, with the real scope and gotchas known up front.

## The idea

Right now the MOCOF chatbot ("Moco") runs only as a web widget on the site. It
could also answer messages sent to the company's **Facebook page** and a
**WhatsApp** number, so customers get the same product Q&A, cabinetry estimates,
and deposit flow in the channels they already use.

**Zernio** (zernio.com) is a reasonable tool for this. It's a unified messaging
API: you connect the FB page / WhatsApp number once in its dashboard and get a
single API key + webhook, and it handles the Meta developer program, App Review,
WhatsApp Business verification, and token rotation for you. Inbound messages
arrive at a webhook you host; you reply through Zernio's API.

## How it would work (high level)

```
Customer DMs FB page / WhatsApp
      -> Zernio delivers the message to a NEW webhook on our Vercel app
         (e.g. /api/zernio-webhook)
      -> that webhook calls the EXISTING chatbot logic in api/chat.js
      -> reply sent back to the customer via Zernio's API
```

**The good news:** the chatbot's "brain" is reusable as-is. Knowledge routing,
the cabinetry estimate, the price guardrail, and the deposit logic don't care
which channel a message came from. The work is mostly a new adapter file that
translates Zernio's message format to/from what `api/chat.js` already expects.

## Why this is a real project, not a quick task — three things that DON'T carry over

**1. It needs a server-side conversation store (a database).**
The web widget is stateless *because the browser holds the conversation history*
and sends it back every message. FB/WhatsApp have no browser — Zernio delivers
one message at a time with no history. But almost everything Moco does depends on
history: collecting wall measurements across turns, remembering the chosen model,
the deposit flow, history-aware knowledge routing. So this integration
**requires** storing per-conversation history keyed by the customer's thread ID
(Supabase is already connected and would work). Note: the project deliberately
avoided a database for the web widget because it wasn't needed there. For
messaging it is not optional.

**2. The deposit button has to become a payment link.**
The "Pay Deposit" button is a rich web-widget element with a cross-tab
confirmation (postMessage back to the browser tab). That is browser-specific and
cannot render in Messenger/WhatsApp. The deposit flow would need to send a
**Stripe payment link** instead, and the "deposit received" confirmation would
need to be rebuilt for the messaging channel. The Stripe/Sheets/notification
back end can stay; the front-end delivery of the deposit changes.

**3. WhatsApp has two constraints that touch the live business — read before touching the main number.**
- **24-hour window:** Meta only accepts free-form messages within 24 hours of the
  customer's last message. A *reactive* support bot (customer messages first,
  bot replies) is fine. Proactive follow-ups outside 24h need approved message
  templates, which aren't well supported in this tooling yet.
- **Number exclusivity (important):** a phone number can be on **only one** of
  {the WhatsApp app, the WhatsApp Business app, the WhatsApp Business API} at a
  time. Moving a number onto the API (what Zernio needs) means it can **no longer
  be used in the app**. Do **not** put the sales team's live "main" WhatsApp
  number onto the API — you'd take their WhatsApp offline. Use a **dedicated
  business number** for the bot instead.

## Suggested approach, if MOCOF decides to do it

- **Start with Facebook Messenger.** It's the lower-friction channel — connect the
  page via Zernio's OAuth and webhook the inbound messages. Prove the adapter +
  conversation store there first.
- **Then WhatsApp**, on a **dedicated number**, once the state store and payment
  link flow are working.
- **Ownership:** the Zernio account and the connected FB/WhatsApp accounts must be
  **business-owned** (same principle as the Google Sheets service account) so the
  integration survives staff changes. Store the Zernio API key and webhook secret
  in Vercel env vars, never in the repo.

## Rough effort

Not a config toggle. Realistically a small project: the adapter webhook, a
conversation-state store (schema + read/write), reworking the deposit into a
payment-link flow, Zernio account + account connections, and WhatsApp number
provisioning/verification. Budget it as such and assign an owner before starting —
each piece above is something that needs maintaining afterward.

## Bottom line

The chatbot brain is ready; the delivery + state layer is the work. It's
worthwhile if MOCOF wants presence in these channels, but it should be picked up
as a deliberate project with an assigned owner — not bolted on quickly.
