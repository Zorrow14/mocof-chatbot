# Developer Guide — Learning This Codebase

This is the **starting point**, not a replacement for the other docs. The repo
already has good reference documentation; this file's job is to orient you
among them, walk you through the system in plain prose so the reference docs
make sense, and hand you the debugging technique that found every real bug
this project has had — which isn't written down anywhere else.

If you only read one section, read **"How to debug a reported conversation"**
below. It's the highest-leverage page in this repo.

---

## 1. Map of the docs — read in this order, for this purpose

| Doc | Read it when... |
|---|---|
| **This file** | You're new. Read once, top to bottom. |
| [`README.md`](README.md) | You need to set up, deploy, or configure something — env vars, Stripe, Resend, Sheets. It's the operational reference. |
| [`CLAUDE.md`](CLAUDE.md) | You're about to change something and need the precise "why" — every subsystem's design rationale, gating rules, and the exact invariants that must hold. Denser than this file, and authoritative. |
| [`.claude/skills/mocof-chatbot/SKILL.md`](.claude/skills/mocof-chatbot/SKILL.md) | You're making a change and want a checklist, or you want the list of past incidents so you don't reintroduce one. |
| [`GOOGLE_SHEETS_CREDENTIALS.md`](GOOGLE_SHEETS_CREDENTIALS.md) | You're setting up or debugging Sheets logging specifically. |
| [`FUTURE_FB_WHATSAPP_INTEGRATION.md`](FUTURE_FB_WHATSAPP_INTEGRATION.md) | Someone's asking about Messenger/WhatsApp. It explains why that's a real project, not a toggle. |

**Rule of thumb:** this file teaches, `CLAUDE.md` specifies, `SKILL.md` checklists, `README.md` operates.

---

## 2. What this project actually is, in one paragraph

A serverless chatbot ("Moco" / "MOCOF CS") that answers product questions for
a Malaysian furniture company, using Gemini as the language model. It lives
entirely as Vercel serverless functions plus a static HTML/JS widget embedded
on the company's Wix site. There is **no database and no server that stays
running** — every request is stateless: the browser holds the entire
conversation and resends it every turn. The one place real state exists is
inside Stripe (a payment) and a Google Sheet (a log of that payment) — both
external systems, not anything this app persists itself.

The one sentence that explains almost every design decision in this repo:

> **The model never touches money or trusted facts directly.** Prices,
> measurements, and deposit amounts are computed in plain JavaScript and
> checked against the model's reply — not the other way around.

Keep that sentence in your head. Nearly every "why is it built this way"
question in `CLAUDE.md` traces back to it.

---

## 3. Follow one message through the system

This is the part no other doc does: a step-by-step narrative of what
literally happens when a customer types something. Read this once and the
file/function names in `CLAUDE.md` will already make sense.

**Customer types:** *"I want a Murano Queen with surround cabinets, my wall
is 9ft high and 12ft wide"*

1. **The widget** (`public/index.html`) doesn't send just that sentence — it
   sends the **entire conversation so far** as `{ message, history }` to
   `POST /api/chat`. There's no session on the server; the browser is the
   only thing that remembers anything.

2. **`api/chat.js`'s `handler()`** receives it. First it validates the
   request (is there a message? are the API keys configured?), then builds
   a **system prompt** for Gemini via `buildSystemPrompt()`.

3. **Knowledge routing** (`getRelevantKnowledge()`) decides which of the
   `knowledge/*.js` modules to inject into that system prompt — it scans
   recent turns (not just the latest message) against a small regex table
   (`KNOWLEDGE_MODULES`) and pulls in at most 3 matching modules, e.g. the
   wall-bed module and the cabinetry module here. This keeps the prompt
   focused instead of dumping the entire 200+ item catalog into every
   request.

4. **In parallel, deterministic code — not the model — tries to compute a
   real cabinetry estimate.** `extractCabinetryDimensions()` regex-parses
   "9ft high and 12ft wide" out of the message. If a wall bed model and both
   measurements are resolvable, `getCabinetryEstimateFromContext()` calls
   the pricing formula in `knowledge/cabinetry.js` and gets a **real,
   computed** grand total. `buildCabinetryEstimateBlock()` then injects that
   exact number into the system prompt as a "you MUST use this number"
   instruction — so the model is asked to *relay* a fact, not invent one.

5. **The system prompt (plus the last 12 history turns) go to Gemini.** The
   model writes a natural-language reply, ideally repeating the pre-computed
   numbers from step 4.

6. **The reply doesn't go straight to the customer.** `findHallucinatedPrices()`
   scans every `RM` figure in the reply against `MASTER_PRICE_LIST` (every
   real price in the catalog, extracted automatically from the knowledge
   text) plus whatever this turn's cabinetry estimate allow-lists. Any
   number that doesn't match either list means the model said a price
   nobody vouches for. If that happens, the server asks Gemini to regenerate
   **once**; if the retry still contains an unrecognized number, the entire
   reply is thrown away and replaced with a canned WhatsApp-handoff message
   (`SAFE_FALLBACK_REPLY`). The customer never sees an invented price.

7. **Separately, `computeDepositOffer()`** — genuinely independent code, not
   something the model influences — decides whether a "Pay Deposit" button
   should render this turn, and for how much. It re-derives everything from
   `message` and `history` from scratch (the same function `create-deposit.js`
   uses at charge time), so the number on the button and the number Stripe
   would actually charge can never drift apart.

8. **The response** — `{ message, images, deposit }` — goes back to the
   widget. If `deposit` isn't null, a real button renders with a real
   amount. If the customer clicks it, *that's* when `/api/create-deposit`
   is called, which re-derives the charge **again**, creates a Stripe
   Checkout Session, and redirects the customer to Stripe's own hosted
   payment page.

9. **Stripe, not this app, is the actual payment processor.** Once the
   customer pays, Stripe calls `POST /api/stripe-webhook` — a completely
   separate serverless function that nothing above ever calls directly.
   That webhook verifies Stripe's signature, then fires off a Sheet log
   (`lib/sheetsLogger.js`) and a notification email (`lib/depositNotification.js`)
   in parallel, both of which swallow their own errors so a Resend or
   Sheets outage can never make Stripe think the webhook failed and retry
   a payment that already succeeded.

That's the whole system. Every subsystem in `CLAUDE.md` is a deeper dive into
one step above.

---

## 4. The recurring failure pattern — read this before you touch deposits or pricing

If you work on this repo for any length of time, you'll hit a bug shaped
like one of these two. Both have happened multiple times and both are worth
recognizing on sight.

**Pattern A — the model invents a number the guardrail then has to catch.**
Usually because some gate (`hasPriceIntent`, model resolution, etc.) failed
to recognize the customer's intent, so the pre-calculated estimate block
(step 4 above) never got injected — leaving the model to compute its own
number from the raw rates in the knowledge text, which then gets flagged
and swapped for the WhatsApp fallback. **Symptom:** customer gets the
"let me connect you with our team" message instead of a price.

**Pattern B — the deposit button silently doesn't appear.** `computeDepositOffer()`
passes through several independent gates in sequence (ceiling conflict,
cabinetry anti-downgrade guard, model resolution, purchase intent). Any one
returning early produces `null` with **no error** — a withheld offer isn't a
failure, so by default nothing logs it. **Symptom:** the estimate/price
looks fine, but there's no button, and nothing in the logs explains why.

Pattern B used to be silent. It no longer is — see the next section.

---

## 5. How to debug a reported conversation

This is the actual technique used to find and fix every real bug this
project has had. It does not require redeploying, waiting for a customer to
reproduce something, or guessing.

### Step 1 — Get the exact transcript

Ask for (or copy) the literal back-and-forth, in order, exactly as the
customer typed it. Approximate paraphrasing loses the thing that usually
matters — the *exact* wording, since these bugs are almost always phrasing
or gating issues.

### Step 2 — Check the logs first (often this alone answers it)

Vercel → the project → **Logs**, filtered around the timestamp. Two tags to
look for:

- `Reply contained unrecognized price(s): ...` — Pattern A. The log line
  includes the flagged number and the model's full original reply, which
  usually makes the cause obvious immediately.
- `[deposit] suppressed: ...` / `[deposit] WITHHELD despite buy intent: ...`
  — Pattern B. `getDepositBasisFromContext()` logs *which specific gate*
  stopped the offer every time it returns null. The `WITHHELD despite buy
  intent` variant (logged as an error, not a warning) means a model was
  resolved **and** the customer showed purchase intent, and it still got no
  button — that's the "this is probably a real bug" signal specifically.

If the logs already name the gate, you often don't need step 3 at all.

### Step 3 — Reproduce it locally, without deploying anything

Clone the repo and reconstruct the conversation as a plain JS array, then
call the actual exported functions directly. This runs the real logic with
zero mocking:

```bash
git clone https://github.com/mocof-it/mocof-chatbot.git
cd mocof-chatbot
node --input-type=module -e "
import * as chat from './api/chat.js';
const { computeDepositOffer, hasPriceIntent, hasPurchaseIntent,
        buildCabinetryEstimateBlock, extractCabinetryDimensions } = chat;

const history = [
  { role: 'user', content: '...' },
  { role: 'assistant', content: '...' },
  // ...reconstruct the transcript here, alternating roles
];
const msg = 'the customer final message';

console.log('price intent:', hasPriceIntent(msg, history));
console.log('purchase intent:', hasPurchaseIntent(msg, history));
console.log('estimate block:', buildCabinetryEstimateBlock(msg, history));
console.log('deposit offer:', JSON.stringify(computeDepositOffer(msg, history)));
"
```

Everything the real request would compute — knowledge routing, dimension
extraction, price intent, the deposit gates — is a plain exported function
in `api/chat.js`. Call the one you suspect directly and you'll see exactly
what it returns for that exact conversation, in seconds, with no network
call and no live customer needed.

### Step 4 — Narrow with smaller probes

If the full transcript reproduces the bug, bisect it: strip turns out one at
a time, or test one function (like `extractCabinetryDimensions`) against
just the one sentence you suspect, until you isolate the exact phrase or gate
responsible. This is usually fast — most bugs in this codebase have come
down to one regex not matching one natural phrasing, or one gate not knowing
about one kind of customer reply (an affirmative "yes", a declined offer,
etc.).

### Step 5 — Before writing the fix, run the existing tests

`npm test`. The suite (`test/consistency.test.js`) encodes real invariants —
not just "does this function return X" but things like "the deposit button
must never precede the price text." A fix that makes your symptom go away
but breaks an existing test is very likely reintroducing a *different*,
already-fixed bug. Read a failing test's assertion before working around it;
it's usually protecting something specific.

### Step 6 — Write a regression test for the exact phrasing that broke

Once fixed, add the transcript (or the specific sentence) as a test case
in `test/consistency.test.js`, in the same shape as the existing tests
around it. This is what makes the fix permanent instead of "fixed until
someone phrases it slightly differently again."

---

## 6. Quick mental model for making a change

The full version of this is `SKILL.md`'s checklists; this is the one-
paragraph version to keep in your head while working:

If you're touching **prices or amounts**: they must be computed in code and
checked against the model's output, never trusted from the model or the
client. If you're touching **knowledge text**: every `RM` figure in it
automatically becomes something the model is *allowed* to say — that's how
the guardrail's allow-list is built, so a typo'd price there is a typo'd
price the bot can confidently state. If you're touching **the Sheet
logger**: new columns get **appended at the end**, never inserted — the
Sheet is a stored data format, and rows already written don't move. If
you're touching **a regex/pattern that recognizes customer intent**: test it
against how a real, non-technical customer phrases things (typos, "yes"
instead of the expected keyword, Manglish) — nearly every real bug in this
project's history was a pattern that only matched the "clean" phrasing.

---

## 7. Where things actually run

- **Chat**: `POST /api/chat` → `api/chat.js`
- **Start a deposit**: `POST /api/create-deposit` → `api/create-deposit.js`
- **Stripe calls this on payment completion**: `POST /api/stripe-webhook` →
  `api/stripe-webhook.js` (never called by the widget — only by Stripe)
- **The widget**: `public/index.html`, embedded on the live site via a Wix
  Custom Code snippet (not part of this repo)
- **Tests**: `npm test` runs `test/consistency.test.js` via Node's built-in
  test runner — no test framework dependency
- **CI**: `.github/workflows/ci.yml` runs the test suite and syntax-checks
  every file on every push

This repo has exactly one runtime dependency (`stripe`) — Sheets and Resend
are both called with plain `fetch`, on purpose, to keep the dependency
surface small. Don't add an SDK for a new integration without a real reason.
