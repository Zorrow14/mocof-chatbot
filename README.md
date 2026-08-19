# MOCOF Chatbot

> A lightweight chatbot for MOCOF (Malaysian furniture & interior design) that runs as a Vercel serverless app and uses Google's Gemini API via OpenAI-compatible endpoints.

## Overview

This repository implements a small, production-ready chat widget ("Moco") and a serverless backend that forwards customer messages to the Gemini chat completion API. The backend composes a controlled system prompt from curated product and service knowledge files, computes live custom-cabinetry price estimates where applicable, verifies every price in the model's reply against real business data before it's sent to a customer, and returns concise, branded replies to the client widget. Separate product-image matching logic attaches real catalog photos when a product is mentioned.

## Quick Start

Prerequisites:
- Node.js 20.x
- Vercel CLI (for `npm run dev`) or deploy directly via the Vercel dashboard
- Set the following environment variables in Vercel or your shell:
   - `GEMINI_API_KEY` (required)
   - `GEMINI_API_KEY_2` (optional — automatic fallback if the primary key hits a rate limit or a 5xx; see "Reliability" below)
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_SHEETS_SPREADSHEET_ID` (optional — enables Phase 4 lead/event logging to Google Sheets; see "Lead & event logging" below. The bot works completely normally with these unset — logging just no-ops)

Install and run locally:

\`\`\`bash
npm install
npm run dev
\`\`\`

Open `http://localhost:3000/` to view the chat widget while `vercel dev` is running.

Run tests before committing:

\`\`\`bash
npm test                    # Run full test suite
npm run test:consistency    # Run consistency checks
\`\`\`

Test the API directly (example):

\`\`\`bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Tell me about your wall bed products", "history": [] }'
\`\`\`

## Project structure

- `package.json`: project metadata and scripts (`dev` uses `vercel dev`, `test` and `test:consistency` for testing).
- `vercel.json`: headers and rewrites used for local/production behavior.
- `api/chat.js`: the serverless handler — knowledge routing, system prompt assembly, the Gemini call, live cabinetry price calculation, the price-hallucination guardrail, and Phase 4 lead/event logging all live here.
- `lib/googleSheets.js`: a small, dependency-free Google Sheets API client (service-account JWT auth + native `fetch`) used by the Phase 4 logging in `api/chat.js`. Never throws — every function degrades to a safe no-op if Sheets isn't configured or is unreachable.
- `.github/workflows/ci.yml`: automated CI pipeline that syntax-checks all JS files and runs test suite on every push and pull request.
- `knowledge/`: modules that export product/service knowledge used to build the system prompt (see below for the full list — two of them also export plain functions/data, not just prompt text).
- `knowledge/productImages.js`: a separate image matcher that maps product names to real catalog photos and attaches them when relevant.
- `public/index.html`: a minimal floating chat widget that calls `/api/chat`.

See the files in the repo for implementation details.

## How the backend works

1. Client (browser widget) sends a POST to `/api/chat` with a JSON body:
   - `message` (string) — the user's latest message (required)
   - `history` (array) — optional conversation history (user/assistant pairs)

2. `api/chat.js` builds a system prompt that contains:
   - A short persona description (the `Moco` brand voice and response rules).
   - Business-specific rules (pricing presentation, WhatsApp usage rules, recommendation heuristics, renovation lead collection, surround-cabinetry estimation).
   - Curated product knowledge concatenated from up to `MAX_KNOWLEDGE_MODULES` (currently 3) `knowledge/*.js` modules. Which modules are included is decided by `getRelevantKnowledge()`: each module in the `KNOWLEDGE_MODULES` array has a regex `test` — matches against the **current message** are prioritized over matches that only appear in recent history (last 4 messages), and the total is capped so a single multi-topic message can't balloon the prompt past Gemini's request budget. Additionally, cheaper alternatives from `basicfurniture.js` are automatically included whenever any of the companion categories (wall bed, sofa bed, table, kitchen, wardrobe) are relevant, so customers always get budget-alternative suggestions without the model needing to remember to offer them.
   - If the conversation contains enough information for a live surround-cabinetry price estimate **and the customer explicitly requests a quote or estimate**, a **pre-calculated** breakdown block (computed in JS, not by the model) is appended — see "Pricing accuracy & guardrails" below. Total wall width is always required for this now (not just on tall walls), and a wall height under 7ft is blocked with an explicit "can't fit" message rather than silently priced.

3. The server converts the history into Gemini's OpenAI-compatible message format (capped to the last `MAX_HISTORY_TURNS_SENT_TO_MODEL`, currently 12, turns), appends the user's message, and calls the Gemini chat completions endpoint with the model in `GEMINI_MODEL` (currently `gemini-3.5-flash-lite`) using the request settings defined in `api/chat.js`.

4. `api/chat.js` tries `GEMINI_API_KEY` first and automatically falls back to `GEMINI_API_KEY_2` (if set) on a rate limit or a 5xx from Gemini — see `callGeminiWithFallback()`.

5. Before the reply is sent to the client, every `RM` figure in it is checked against the price guardrail (below). If anything unrecognized is found, the whole reply is swapped for a safe "let's confirm on WhatsApp" fallback rather than risking a wrong quote reaching a customer.

6. The response is relayed to the client as JSON: `{ success: true, message: "...", images: [...], leadLogged: false }` (or an error payload on failure). `leadLogged` is only ever `true` on the turn a completed renovation lead was just logged to Google Sheets — see "Lead & event logging" below.

**Model note:** Gemini model names and request constraints can change over time. Check Google's Gemini/OpenAI-compatible API docs occasionally and update the `GEMINI_MODEL` constant if needed. If you switch model families, double-check the request parameters in `api/chat.js` too.

Other implementation notes:
- CORS and common headers are set in the handler and mirrored in `vercel.json`.
- The server enforces prompt-level rules such as formatting (only **bold** allowed for emphasis) and response length guidelines.

## Knowledge modules

| File | Exports | Notes |
|---|---|---|
| `wallbeds.js` | `getWallBedKnowledge()`, `WALLBED_MODEL_WIDTHS_FT`, `WALLBED_MODEL_PRICING` | The width lookup and the granular pricing table are structured data (not just prompt text) — they're imported directly by `chat.js` to derive a wall bed's width and sale/retail prices from whichever model has been discussed, so the bot never has to ask a customer for that spec or price. |
| `sofabeds.js` | `getSofaBedKnowledge()` | |
| `tables.js` | `getTableKnowledge()` | |
| `kitchen.js` | `getKitchenKnowledge()` | |
| `wardrobes.js` | `getWardrobeKnowledge()` | Standalone/free-standing wardrobes — distinct from surround cabinetry, see `cabinetry.js`. |
| `showroom.js` | `getShowroomKnowledge()` | |
| `warranty.js` | `getWarrantyKnowledge()` | |
| `renovation.js` | `getRenovationKnowledge()` | |
| `basicfurniture.js` | `getBasicFurnitureKnowledge()` | MOCOF Basic standalone furniture (living room, dining room, hallway/storage, bedroom, study tables) — automatically included whenever any companion category (wall bed, sofa bed, table, kitchen, wardrobe) is routed, ensuring budget-alternative suggestions are always available without explicit model instruction. |
| `productImages.js` | `getRelevantImages()` | Product-name to photo matching for the reply image attachment flow. |
| `cabinetry.js` | `getCabinetryKnowledge()`, `calculateCabinetPrice()` | Surround cabinetry (side + overhead cabinets built around a wall bed). `calculateCabinetPrice()` is a pure function implementing the real pricing formula — `chat.js` calls it directly to compute a live estimate rather than trusting the model to do the arithmetic. |

Most modules export a single function returning a template string that gets concatenated into the system prompt. `wallbeds.js` and `cabinetry.js` are the exceptions — they also export plain data/functions that `chat.js` uses directly in code, not just as prompt text.

To add or update product information:
1. Add a new `knowledge/<topic>.js` exporting `get<Topic>Knowledge()` that returns the text to include in the prompt.
2. Import it in `api/chat.js` and add an entry to the `KNOWLEDGE_MODULES` array: `{ key: 'yourTopic', test: /keyword|regex/, fn: getYourTopicKnowledge }`. Order matters if you expect overlap with other modules on a single message, since the array order is the tie-break priority when `MAX_KNOWLEDGE_MODULES` is reached.
3. If your knowledge contains prices, they're automatically picked up by the price guardrail's `MASTER_PRICE_LIST` — no extra step needed, as long as the module is added to the `extractAmounts([...])` list in `chat.js`.
4. If the product should attach a photo, add or update the mapping in `knowledge/productImages.js` so the backend can match the name to a real image URL.

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

## Lead & event logging (Phase 4)

Two independent logging streams write to Google Sheets, both entirely optional — the bot works completely normally with none of this configured, and every write is wrapped so a Sheets outage or a bad credential can only ever show up in server logs, never in what a customer receives.

**What gets logged:**
- **Leads tab** — one row per *completed* renovation-lead conversation (all 9 steps from `RENOVATION LEAD COLLECTION` collected). Detected by matching the bot's own sign-off (the design-consultant WhatsApp number + a completion word), then a small second Gemini call extracts the 9 fields as structured JSON from the full transcript. If that extraction call fails or returns something unparsable, the lead is **never silently dropped** — the raw transcript is logged in a notes column instead of 9 empty structured ones.
- **Events tab** — one row per chat turn: timestamp, a session ID (see below), a turn number, which knowledge module(s) fired, whether the reply contained a price, and whether the price guardrail had to block/replace the reply.

**Session ID and turn number.** The roadmap's own stated goal for this phase ("drop-off point" analysis) isn't achievable from isolated, unordered rows, so `public/index.html` generates one random `sessionId` per page load (via `crypto.randomUUID()`, with a fallback for older browsers) and a simple 1-based `turnNumber`, and sends both with every request. Neither is tied to any account or persisted beyond the browser tab — it's purely a way to group/order rows from the same visit in the sheet afterward. The widget also remembers (in memory only, not persisted) whether it already got `leadLogged: true` back for this visit, and stops asking the server to re-check — so a customer who keeps chatting after the renovation hand-off doesn't get logged as multiple separate leads.

### Setup

1. **Google Cloud service account.** In [Google Cloud Console](https://console.cloud.google.com/): create or reuse a project → enable the **Google Sheets API** → **IAM & Admin → Service Accounts** → create one → **Keys** tab → **Add Key → Create new key → JSON**. This downloads a JSON file containing a `client_email` and a `private_key`.
2. **Create the spreadsheet.** Make a new Google Sheet with two tabs, named exactly:
   - `Leads`, with header row: `Timestamp | Session ID | Property Type | Location | Budget Range | Design Style | Number of Rooms | Floor Plan Available | Room Dimensions | Existing Obstacles | Target Completion Date | Notes (raw transcript fallback)`
   - `Events`, with header row: `Timestamp | Session ID | Turn Number | Knowledge Module(s) | Price Quoted | Guardrail Blocked | Message Preview`
   (`lib/googleSheets.js` only ever appends data rows below whatever's already there — it never creates a tab or a header row for you.)
3. **Share the sheet** with the service account's `client_email` (from the JSON key) as **Editor**. This is the step people most often forget — without it, every append silently fails with an auth error in the server logs, since a service account has zero access to any sheet it hasn't been explicitly shared with, same as any other Google account.
4. **Get the spreadsheet ID** — it's the long ID in the sheet's URL: `docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`.
5. **Set three Vercel environment variables:**
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` — the JSON key's `client_email`
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` — the JSON key's `private_key`, pasted as-is (Vercel's env var UI stores it with literal `\n` sequences instead of real newlines — `lib/googleSheets.js` un-escapes that automatically, so paste it exactly as it appears in the JSON file)
   - `GOOGLE_SHEETS_SPREADSHEET_ID` — from step 4

That's it — no code changes needed. `isSheetsConfigured()` checks all three at request time, so logging turns on the moment all three are set, without a redeploy.

### Cost & latency notes

- **Event logging runs on every chat turn** but uses a short (1.5s) timeout, so a slow Sheets response can add at most that much latency to a reply — it never hangs a request.
- **Lead extraction runs once per completed lead** (not every turn), but it makes a *second* Gemini call to turn the freeform conversation into structured JSON, so that specific turn is slower than a normal reply (typically a few extra seconds). This is a deliberate, rare, proportionate cost for a real sales lead, not a per-message one.
- Neither of these can run in true "fire and forget" fashion on Vercel's standard serverless runtime — the function's execution environment isn't guaranteed to keep running after the response is sent unless you're using a background-execution primitive like `waitUntil()` (from the `@vercel/functions` package, not currently a dependency of this project — see the zero-dependency note in `lib/googleSheets.js`). If you add that package later, both logging calls in `api/chat.js` (`logChatEvent` / `extractAndLogRenovationLead`) can be switched from `await`ed to `waitUntil()`-scheduled to remove even the small latency cost above.

### 4.3 — building a basic dashboard from the Events tab

This part is Google Sheets configuration, not code — there's nothing to deploy. A reasonable starting point:

1. Select the `Events` tab → **Insert → Pivot table** → new sheet.
2. **Most-asked topics:** Rows = `Knowledge Module(s)`, Values = `COUNTA` of `Timestamp`. (Rows will show comma-joined combinations like "wallbed, basicFurniture" for multi-topic turns — for single-category counts, add a helper column that splits on `, ` first if you want that level of precision.)
3. **Guardrail block rate over time:** Rows = `Timestamp` grouped by week/month (right-click the field → "Create pivot date group"), Values = `COUNTA` of `Guardrail Blocked` filtered to `Y`, shown alongside a `COUNTA` of all rows for that period to get a rate rather than a raw count.
4. **Drop-off point:** Rows = `Session ID`, Values = `MAX` of `Turn Number` — this gives the last turn number reached per session; a pivot/chart of the *distribution* of that max value across sessions shows where conversations tend to stop (e.g. "most sessions that don't convert stop around turn 3").
5. Turn any of the above pivot tables into a chart via **Insert → Chart** with the pivot table as its data source — it stays live as new rows come in.

## Response & persona rules (enforced in the system prompt)

- Persona: Warm, professional, concise. Ask clarifying questions when needed, one at a time.
- WhatsApp contact: only appended for renovation budget/design flows (explicit budget/design mention required), or when directing a customer to confirm a custom quote.
- Pricing: always present both `Retail: RM X | Sale: RM X` when price data exists; never fabricate prices — except the live cabinetry estimate described above, which is explicitly carved out as the one allowed exception.
- Formatting: use **only** Markdown bold (double asterisks) for emphasis. No italics or other Markdown.
- Length: prefer concise replies (maximum about 120 words unless more detail is requested).

## Extending or customizing

- To change the model or request settings, update the constants at the top of `api/chat.js` (`GEMINI_URL`, `GEMINI_MODEL`, and the `requestBody` parameters in the handler).
- To add richer user intent detection, add entries to the `KNOWLEDGE_MODULES` array rather than writing ad-hoc `if` chains — this keeps routing, priority, and the `MAX_KNOWLEDGE_MODULES` cap consistent.
- `MAX_KNOWLEDGE_MODULES` and `MAX_HISTORY_TURNS_SENT_TO_MODEL` are the two token-budget levers if you need to trade off context richness against Gemini's request limits.
- `PRICE_TOLERANCE` (in `chat.js`) controls how much rounding the guardrail forgives before treating a price as suspicious.

## Testing & CI

- The project includes automated CI via GitHub Actions (`.github/workflows/ci.yml`).
- On every push and pull request, the CI pipeline:
  - Syntax-checks all JavaScript files in the repo (catches typos before deployment).
  - Runs the full test suite (`npm test`).
- Use `npm test` locally before pushing to catch issues early.

## Deployment

- Deploy to Vercel and set `GEMINI_API_KEY` (required), plus `GEMINI_API_KEY_2` and the three `GOOGLE_*` variables if you want fallback keys / lead & event logging (see "Lead & event logging" above — all optional).
- The `vercel.json` file contains header rules and rewrites used by the project.
- The CI pipeline validates all code before merge, so pull requests with syntax errors or test failures are automatically flagged.

## Troubleshooting

- `500` / "API key missing": ensure `GEMINI_API_KEY` is set in your environment.
- `502` / Gemini API errors: check your API key is valid, rate limits, and the `details` field in the error JSON returned by the endpoint.
- Bot gives a generic "confirm on WhatsApp" reply instead of an expected price: check server logs for `Blocked reply containing unrecognized price(s)` — see "Pricing accuracy & guardrails" above.
- Cabinetry estimate not appearing: it requires a wall height AND total wall width AND an established wall bed model somewhere in the recent conversation — if any of those is missing, the bot will keep asking rather than guessing. A wall height under 7ft is a separate, deliberate case (surround cabinetry can't physically fit) — the bot should say so explicitly rather than asking for more measurements.
- Nothing showing up in the `Leads` / `Events` sheet: check server logs for `googleSheets.appendRow(...) skipped` (one or more of the three `GOOGLE_*` env vars isn't set) or `googleSheets.appendRow(...) failed` (usually means the sheet wasn't shared with the service account's email — see "Lead & event logging" step 3 above).

## Known limitations

- `/api/chat` has no rate limiting or authentication; the endpoint URL is visible in the client-side widget source, so it can be called directly by anyone.
- No server-side cap on incoming message length (only the widget's client-side `maxlength`).
- Lead/event logging (Phase 4) has no retry queue — if a Sheets write fails (timeout, bad credentials, sheet not shared), that one row is simply lost; it's only ever logged via `console.error`, not queued for a later retry.
- The renovation lead-completion detector (`isRenovationLeadCompletionReply`) matches on the bot's sign-off phrasing, not a hard state machine — if the system prompt's wording for that sign-off changes significantly, update the matching pattern in `api/chat.js` alongside it.

## Notes & safety

- Do NOT commit API keys or other secrets to the repository. Use Vercel environment variables or another secrets store.
- System prompt and knowledge content control the assistant heavily. When updating prompt text, validate behavior with a few test queries — especially anything touching pricing, given the guardrail's exact-match nature.
- If Phase 4 logging is enabled, the `Leads` sheet stores full conversation transcripts (in the raw-fallback case) or customer-provided renovation details (in the structured case), and the `Events` sheet stores a 200-character preview of every message sent. Treat both sheets as customer data — restrict sharing on the spreadsheet to people who need it, the same as any other customer contact list.

---