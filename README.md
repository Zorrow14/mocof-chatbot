# MOCOF Chatbot

> A lightweight chatbot for MOCOF (Malaysian furniture & interior design) that runs as a Vercel serverless app and uses the Groq chat API.

## Overview

This repository implements a small, production-ready chat widget and a serverless backend that forwards customer messages to the Groq chat completion API. The backend composes a controlled system prompt from curated product and service knowledge files and returns concise, branded replies to the client widget.

## Quick Start

Prerequisites:
- Node.js 20.x
- Vercel CLI (for `npm run dev`) or deploy directly via the Vercel dashboard
- Set the following environment variables in Vercel or your shell:
  - `GROQ_API_KEY` (required)
  - `GROQ_API_KEY_2` (optional fallback)

Install and run locally:

```bash
npm install
npm run dev
```

Open `http://localhost:3000/` to view the chat widget while `vercel dev` is running.

Test the API directly (example):

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Tell me about your wall bed products", "history": [] }'
```

## Project structure

- `package.json`: project metadata and scripts (`dev` uses `vercel dev`).
- `vercel.json`: headers and rewrites used for local/production behavior.
- `api/chat.js`: the serverless handler that receives chat requests and calls the Groq API.
- `knowledge/`: collection of small modules that export product/service knowledge used to build the system prompt.
  - `wallbeds.js`, `sofabeds.js`, `tables.js`, `kitchen.js`, `wardrobes.js`, `showroom.js`, `warranty.js`, `renovation.js`
- `public/index.html`: a minimal floating chat widget that calls `/api/chat`.

See the files in the repo for implementation details.

## How the backend works

1. Client (browser widget) sends a POST to `/api/chat` with a JSON body:
   - `message` (string) — the user's latest message (required)
   - `history` (array) — optional conversation history (user/assistant pairs)

2. `api/chat.js` builds a system prompt that contains:
   - A short persona description (the `Moco` brand voice and response rules).
   - Business-specific rules (pricing presentation, WhatsApp usage rules, recommendation heuristics).
   - Curated product knowledge concatenated from one or more `knowledge/*.js` modules; which modules are included is determined by simple regex matching of the user message (see `getRelevantKnowledge`).

3. The server converts the history into Groq's expected message format, appends the user's message, and calls the Groq chat completions endpoint (`llama-3.1-8b-instant`) with controllable parameters (`temperature`, `max_tokens`, `top_p`).

4. `api/chat.js` supports a primary and a fallback API key via the environment variables `GROQ_API_KEY` and `GROQ_API_KEY_2`. It will attempt the primary key first and retry with the fallback for retry-able errors (401, 429, 5xx).

5. The response from Groq is relayed to the client as JSON: `{ success: true, message: "..." }` or an error payload on failure.

Other implementation notes:
- CORS and common headers are set in the handler and mirrored in `vercel.json`.
- The server enforces prompt-level rules such as formatting (only **bold** allowed for emphasis) and response length guidelines.

## Knowledge modules

- Each file in `knowledge/` exports a function like `getWallBedKnowledge()` that returns a single template string. These strings are concatenated into the system prompt.
- To add or update product information:
  1. Add a new `knowledge/<topic>.js` exporting `get<Topic>Knowledge()` that returns the text to include in the prompt.
  2. Import it in `api/chat.js` and extend `getRelevantKnowledge()` with a simple regex that matches common user phrases for that topic.

Design notes: keep the knowledge strings factual and avoid adding instructions that conflict with the system-level persona and formatting rules.

## Response & persona rules (enforced in the system prompt)

- Persona: Warm, professional, concise. Ask clarifying questions when needed.
- WhatsApp contact: only appended for renovation budget/design flows (explicit budget/design mention required).
- Pricing: always present both `Retail: RM X | Sale: RM X` when price data exists; never fabricate prices.
- Formatting: use **only** Markdown bold (double asterisks) for emphasis. No italics or other Markdown.
- Length: prefer concise replies (maximum about 120 words unless more detail is requested).

## Extending or customizing

- To change the model or request settings, update the constants at the top of `api/chat.js` (`GROQ_URL`, `GROQ_MODEL`, and request parameters).
- To add richer user intent detection, replace the simple regex checks in `getRelevantKnowledge()` with a more robust intent classifier or use an initial lightweight LLM call.

## Deployment

- Deploy to Vercel and set environment variables `GROQ_API_KEY` (and optional `GROQ_API_KEY_2`).
- The `vercel.json` file contains header rules and rewrites used by the project.

## Troubleshooting

- `500` / "API key missing": ensure `GROQ_API_KEY` is set in your environment.
- `502` / Groq API errors: check `GROQ_API_KEY_2` fallback, rate limits, and the `details` field in the error JSON returned by the endpoint.

## Notes & safety

- Do NOT commit API keys or other secrets to the repository. Use Vercel environment variables or another secrets store.
- System prompt and knowledge content control the assistant heavily. When updating prompt text, validate behavior with a few test queries.

---
