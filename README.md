# MOCOF Chatbot

> A lightweight chatbot for MOCOF (Malaysian furniture & interior design) that runs as a Vercel serverless app and uses the Groq chat API.

## Overview

This repository implements a small, production-ready chat widget ("Moco") and a serverless backend that forwards customer messages to the Groq chat completion API. The backend composes a controlled system prompt from curated product and service knowledge files, computes live custom-cabinetry price estimates where applicable, verifies every price in the model's reply against real business data before it's sent to a customer, and returns concise, branded replies to the client widget.

## Quick Start

Prerequisites:
- Node.js 20.x
- Vercel CLI (for `npm run dev`) or deploy directly via the Vercel dashboard
- Set the following environment variables in Vercel or your shell:
  - `GROQ_API_KEY` (required)
  - `GROQ_API_KEY_2` (optional fallback)

Install and run locally:

\`\`\`bash
npm install
npm run dev
\`\`\`

Open `http://localhost:3000/` to view the chat widget while `vercel dev` is running.

Test the API directly (example):

\`\`\`bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Tell me about your wall bed products", "history": [] }'
\`\`\`

## Project structure

- `package.json`: project metadata and scripts (`dev` uses `vercel dev`).
- `vercel.json`: headers and rewrites used for local/production behavior.
- `api/chat.js`: the serverless handler — knowledge routing, system prompt assembly, the Groq call with key fallback, live cabinetry price calculation, and the price-hallucination guardrail all live here.
- `knowledge/`: modules that export product/service knowledge used to build the system prompt (see below for the full list — two of them also export plain functions/data, not just prompt text).
- `public/index.html`: a minimal floating chat widget that calls `/api/chat`.

See the files in the repo for implementation details.

## How the backend works

1. Client (browser widget) sends a POST to `/api/chat` with a JSON body:
   - `message` (string) — the user's latest message (required)
   - `history` (array) — optional conversation history (user/assistant pairs)

2. `api/chat.js` builds a system prompt that contains:
   - A short persona description (the `Moco` brand voice and response rules).
   - Business-specific rules (pricing presentation, WhatsApp usage rules, recommendation heuristics, renovation lead collection, surround-cabinetry estimation).
   - Curated product knowledge concatenated from up to `MAX_KNOWLEDGE_MODULES` (currently 3) `knowledge/*.js` modules. Which modules are included is decided by `getRelevantKnowledge()`: each module in the `KNOWLEDGE_MODULES` array has a regex `test` — matches against the **current message** are prioritized over matches that only appear in recent history (last 4 messages), and the total is capped so a single multi-topic message can't balloon the prompt past Groq's per-minute token budget.
   - If the conversation contains enough information for a live surround-cabinetry price estimate, a **pre-calculated** breakdown block (computed in JS, not by the model) is appended — see "Pricing accuracy & guardrails" below.

3. The server converts the history into Groq's expected message format (capped to the last `MAX_HISTORY_TURNS_SENT_TO_MODEL`, currently 12, turns), appends the user's message, and calls the Groq chat completions endpoint with the model in `GROQ_MODEL` (currently `openai/gpt-oss-20b` — see note below) using `max_completion_tokens`, `reasoning_effort: 'low'`, `temperature`, and `top_p`.

4. `api/chat.js` supports a primary and a fallback API key via the environment variables `GROQ_API_KEY` and `GROQ_API_KEY_2`. It will attempt the primary key first and retry with the fallback for retry-able errors (401, 429, 5xx).

5. Before the reply is sent to the client, every `RM` figure in it is checked against the price guardrail (below). If anything unrecognized is found, the whole reply is swapped for a safe "let's confirm on WhatsApp" fallback rather than risking a wrong quote reaching a customer.

6. The response is relayed to the client as JSON: `{ success: true, message: "..." }` or an error payload on failure.

**Model note:** Groq deprecates models periodically (`llama-3.1-8b-instant`, this project's original model, was retired 08/16/26). Check [Groq's deprecations page](https://console.groq.com/docs/deprecations) occasionally and update the `GROQ_MODEL` constant if needed — `gpt-oss` models use `max_completion_tokens` and `reasoning_effort` rather than the older `max_tokens`, so if you switch model families, double-check those request parameters too.

Other implementation notes:
- CORS and common headers are set in the handler and mirrored in `vercel.json`.
- The server enforces prompt-level rules such as formatting (only **bold** allowed for emphasis) and response length guidelines.

## Knowledge modules

| File | Exports | Notes |
|---|---|---|
| `wallbeds.js` | `getWallBedKnowledge()`, `WALLBED_MODEL_WIDTHS_FT` | The width lookup is structured data (not just prompt text) — it's imported directly by `chat.js` to derive a wall bed's width from whichever model has been discussed, so the bot never has to ask a customer for that spec. |
| `sofabeds.js` | `getSofaBedKnowledge()` | |
| `tables.js` | `getTableKnowledge()` | |
| `kitchen.js` | `getKitchenKnowledge()` | |
| `wardrobes.js` | `getWardrobeKnowledge()` | Standalone/free-standing wardrobes — distinct from surround cabinetry, see `cabinetry.js`. |
| `showroom.js` | `getShowroomKnowledge()` | |
| `warranty.js` | `getWarrantyKnowledge()` | |
| `renovation.js` | `getRenovationKnowledge()` | |
| `basicfurniture.js` | `getBasicFurnitureKnowledge()` | MOCOF Basic standalone furniture (sofas, dining, bedroom) — used for budget-alternative recommendations alongside wall beds. |
| `cabinetry.js` | `getCabinetryKnowledge()`, `calculateCabinetPrice()` | Surround cabinetry (side + overhead cabinets built around a wall bed). `calculateCabinetPrice()` is a pure function implementing the real pricing formula — `chat.js` calls it directly to compute a live estimate rather than trusting the model to do the arithmetic. |

Most modules export a single function returning a template string that gets concatenated into the system prompt. `wallbeds.js` and `cabinetry.js` are the exceptions — they also export plain data/functions that `chat.js` uses directly in code, not just as prompt text.

To add or update product information:
1. Add a new `knowledge/<topic>.js` exporting `get<Topic>Knowledge()` that returns the text to include in the prompt.
2. Import it in `api/chat.js` and add an entry to the `KNOWLEDGE_MODULES` array: `{ key: 'yourTopic', test: /keyword|regex/, fn: getYourTopicKnowledge }`. Order matters if you expect overlap with other modules on a single message, since the array order is the tie-break priority when `MAX_KNOWLEDGE_MODULES` is reached.
3. If your knowledge contains prices, they're automatically picked up by the price guardrail's `MASTER_PRICE_LIST` — no extra step needed, as long as the module is added to the `extractAmounts([...])` list in `chat.js`.

Design notes: keep the knowledge strings factual and avoid adding instructions that conflict with the system-level persona and formatting rules.

## Pricing accuracy & guardrails

This bot has been through real hallucination incidents in testing (inventing non-existent products, misquoting prices, denying real products exist), so two layers of protection are built in:

**1. History-aware knowledge routing.** `getRelevantKnowledge()` checks recent conversation history, not just the current message — otherwise a natural follow-up like "what is X?" (where X was named by the bot a turn earlier) loses all context and the bot may wrongly deny a real product exists.

**2. The price guardrail (`findHallucinatedPrices` / `isKnownAmount` in `chat.js`).** Before any reply reaches the client, every `RM` figure in it is checked against:
   - `MASTER_PRICE_LIST` — every real price across the entire knowledge base (not just what got routed into this turn's prompt), with a small (`PRICE_TOLERANCE`, RM2) tolerance to forgive the model rounding off cents in casual phrasing.
   - Any amount the *customer themselves* stated (so echoing back a stated budget is never flagged).
   - Any amount matching a **live cabinetry estimate** computed for this conversation (see below).

   If a reply contains a price matching none of the above, the entire reply is replaced with a generic "let's confirm on WhatsApp" fallback rather than risking a wrong number reaching a customer. Check server logs for `Blocked reply containing unrecognized price(s)` if this fires more than expected — it either caught a genuine hallucination (good) or a legitimate price is being phrased in a format the guardrail doesn't recognize (needs tuning).

**3. Live surround-cabinetry pricing.** This is the one case where the model is allowed to state a price that isn't literally written in a knowledge file — it's a formula-based estimate computed from the customer's own wall measurements. `chat.js` extracts wall height / total wall width from the conversation via regex (`extractCabinetryDimensions`), derives the wall bed's width automatically from whichever model has been discussed (`extractSelectedWallBedModel` + `WALLBED_MODEL_WIDTHS_FT` — the customer is never asked for this directly, since they likely wouldn't know it), runs the real formula (`calculateCabinetPrice()` in `knowledge/cabinetry.js`), and injects the already-computed breakdown into the system prompt so the model relays exact figures instead of doing its own arithmetic. The same computation feeds the guardrail's allow-list, so the two can never disagree with each other. See the comments in `knowledge/cabinetry.js` for the formula itself and worked examples.

## Response & persona rules (enforced in the system prompt)

- Persona: Warm, professional, concise. Ask clarifying questions when needed, one at a time.
- WhatsApp contact: only appended for renovation budget/design flows (explicit budget/design mention required), or when directing a customer to confirm a custom quote.
- Pricing: always present both `Retail: RM X | Sale: RM X` when price data exists; never fabricate prices — except the live cabinetry estimate described above, which is explicitly carved out as the one allowed exception.
- Formatting: use **only** Markdown bold (double asterisks) for emphasis. No italics or other Markdown.
- Length: prefer concise replies (maximum about 120 words unless more detail is requested).

## Extending or customizing

- To change the model or request settings, update the constants at the top of `api/chat.js` (`GROQ_URL`, `GROQ_MODEL`, and the `requestBody` parameters in the handler).
- To add richer user intent detection, add entries to the `KNOWLEDGE_MODULES` array rather than writing ad-hoc `if` chains — this keeps routing, priority, and the `MAX_KNOWLEDGE_MODULES` cap consistent.
- `MAX_KNOWLEDGE_MODULES` and `MAX_HISTORY_TURNS_SENT_TO_MODEL` are the two token-budget levers if you need to trade off context richness against Groq's rate limits.
- `PRICE_TOLERANCE` (in `chat.js`) controls how much rounding the guardrail forgives before treating a price as suspicious.

## Deployment

- Deploy to Vercel and set environment variables `GROQ_API_KEY` (and optional `GROQ_API_KEY_2`).
- The `vercel.json` file contains header rules and rewrites used by the project.

## Troubleshooting

- `500` / "API key missing": ensure `GROQ_API_KEY` is set in your environment.
- `502` / Groq API errors: check `GROQ_API_KEY_2` fallback, rate limits, and the `details` field in the error JSON returned by the endpoint.
- Bot gives a generic "confirm on WhatsApp" reply instead of an expected price: check server logs for `Blocked reply containing unrecognized price(s)` — see "Pricing accuracy & guardrails" above.
- Cabinetry estimate not appearing: it requires both a wall height AND an established wall bed model somewhere in the recent conversation (and total wall width too, if height is over 9ft) — if any of those is missing, the bot will keep asking rather than guessing.

## Known limitations

- `vercel.json` rewrites `/widget` → `/public/widget.html`, which doesn't exist in this repo — that route is currently dead.
- `/api/chat` has no rate limiting or authentication; the endpoint URL is visible in the client-side widget source, so it can be called directly by anyone.
- No server-side cap on incoming message length (only the widget's client-side `maxlength`).
- `node-fetch` is listed as a dependency but unused — Node 20's built-in `fetch` is what's actually used in `api/chat.js`.

## Notes & safety

- Do NOT commit API keys or other secrets to the repository. Use Vercel environment variables or another secrets store.
- System prompt and knowledge content control the assistant heavily. When updating prompt text, validate behavior with a few test queries — especially anything touching pricing, given the guardrail's exact-match nature.

---