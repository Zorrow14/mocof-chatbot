# MOCOF Chatbot

A Vercel-hosted AI sales assistant for MOCOF that answers product questions, recommends furniture, and handles renovation/product quote flows using Google's Gemini API via the OpenAI-compatible endpoint.

## Overview

This repo contains a lightweight storefront chatbot with:

- a floating customer chat widget in `public/index.html`
- a serverless API handler in `api/chat.js`
- product/service knowledge modules in `knowledge/`
- a pricing guardrail that blocks invented RM figures before they reach the customer
- automatic product image matching from the knowledge layer
- cabinet estimation logic that calculates live room-based pricing from user measurements

The app is designed for MOCOF's wall beds, sofa beds, tables, kitchen, wardrobes, showroom, warranty, and renovation flows.

## Stack

- Node.js 20
- Vercel serverless functions
- Gemini via OpenAI-compatible chat completions API
- Plain JavaScript, no build step required

## Quick start

Prerequisites:

- Node.js 20.x
- Vercel CLI for local development, or deploy directly to Vercel
- An environment variable for Gemini access

Set the required environment variables:

```bash
GEMINI_API_KEY=your_key_here
# optional fallback key
GEMINI_API_KEY_2=another_key_here
```

Install and run locally:

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:3000/
```

Test the API directly:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Tell me about your wall bed products","history":[]}'
```

Run the project checks:

```bash
npm test
npm run test:consistency
```

## Project structure

```text
api/
  chat.js                 # Serverless chat handler and pricing logic
knowledge/
  basicfurniture.js       # Budget-ready alternatives
  cabinetry.js            # Surround-cabinetry pricing logic
  kitchen.js              # Kitchen product knowledge
  productImages.js        # Product-to-image matching
  renovation.js           # Renovation flow knowledge
  showroom.js            # Showroom info and visit guidance
  sofabeds.js            # Sofa bed knowledge
  tables.js              # Tables and dining/desk inventory
  wallbeds.js            # Wall bed model data and pricing tables
  wardrobes.js           # Wardrobe knowledge
  warranty.js            # Warranty info
public/
  index.html             # Floating chat widget UI
package.json             # Scripts and Node version
vercel.json              # Vercel headers and rewrites
.github/workflows/ci.yml # CI checks for syntax and tests
```

## Runtime behavior

The request flow is:

1. The client sends a POST to `/api/chat` with a `message` and recent `history`.
2. `api/chat.js` gathers relevant knowledge from `knowledge/*.js` based on the current message and recent turns.
3. The system prompt is built with branding rules, pricing rules, and response formatting instructions.
4. The message is sent to Gemini using the OpenAI-compatible API.
5. The reply is checked for invalid RM amounts before returning it to the client.
6. Product image matches are attached when relevant.

## Knowledge routing and guardrails

The app intentionally does more than just send raw prompts to Gemini.

### Knowledge selection

The `KNOWLEDGE_MODULES` list in `api/chat.js` matches categories like wall beds, sofa beds, kitchen, wardrobes, renovation, warranty, and more. Matching considers:

- the current message
- recent conversation history
- priority ordering when multiple categories match
- a cap to keep prompts compact and predictable

`basicfurniture.js` is automatically included alongside related categories such as wall beds, sofa beds, kitchen, tables, and wardrobes so cheaper alternatives can be recommended without relying on the model to remember them.

### Price safety checks

The app maintains a master list of valid MOCOF prices and rejects replies containing RM figures that are not recognized as real catalog values or customer-provided amounts.

This includes a special exception for live cabinetry calculations:

- wall height + model + wall width are extracted from the conversation
- the actual pricing formula is computed server-side
- the resulting estimate is allowed only for surround cabinetry, not as a general pricing shortcut

If the model invents a price, the server retries once and then falls back to a safe confirmation response instead of sending a wrong quote to the customer.

## Cabinetry estimate flow

The live estimate flow is handled in `api/chat.js` and `knowledge/cabinetry.js`.

What it does:

- detects the selected wall bed model from recent conversation context
- extracts room dimensions from customer replies
- calculates the side cabinet, overhead cabinet, and total estimate using the real pricing formula
- injects the calculated breakdown into the prompt so the model stays aligned with the actual estimate
- validates the final numbers against the same pricing guardrail

This prevents the model from inventing or miscalculating custom cabinetry totals.

## API contract

POST `/api/chat`

Request body:

```json
{
  "message": "I want a wall bed for my condo",
  "history": [
    { "role": "user", "content": "Hi" },
    { "role": "assistant", "content": "Hi! How can I help?" }
  ]
}
```

Response:

```json
{
  "success": true,
  "message": "Here are the options...",
  "images": []
}
```

If an API error occurs, the endpoint returns an error payload with a status code and details.

## Deployment

This project is designed for Vercel.

1. Push the repo to GitHub.
2. Import it into Vercel.
3. Add the required environment variables in the Vercel project settings:
   - `GEMINI_API_KEY`
   - optional `GEMINI_API_KEY_2`
4. Deploy.

`vercel.json` currently includes CORS headers and the root rewrite to the public chat UI.

## CI and validation

The repo includes a GitHub Actions workflow in `.github/workflows/ci.yml` that:

- installs dependencies
- validates all JavaScript files with `node --check`
- runs the project test suite with `npm test`

## Notes and limits

- The chatbot is intentionally prompt-driven and knowledge-driven; product and pricing accuracy depend on the curated modules in `knowledge/`.
- `/api/chat` is not protected with authentication or rate limiting by default.
- The current chat UI is served from `/` via `public/index.html`.
- The `/widget` rewrite exists in `vercel.json` but is not part of the active front-end flow in this repo.
- Do not commit real API keys to source control; use environment variables in Vercel or another secret store.

## Security and reliability

- Keep API keys in environment variables, not in committed files.
- Validate prompt changes against real product and pricing queries.
- Treat pricing-related prompt edits carefully because the guardrail depends on exact catalog values and measured estimates.

---

This project is built for MOCOF customer support and product sales, with strict safeguards around pricing and product claims to reduce hallucinated responses in production.
