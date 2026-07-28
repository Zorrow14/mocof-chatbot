// =============================================================
// FILE: api/chat.js
// Vercel Serverless Function — handles all Groq API calls
// Endpoint: POST /api/chat
// API Keys: GROQ_API_KEY (primary), GROQ_API_KEY_2 (fallback) in Vercel env vars
// =============================================================

import { getRenovationKnowledge }    from '../knowledge/renovation.js';
import { getWallBedKnowledge }       from '../knowledge/wallbeds.js';
import { getSofaBedKnowledge }       from '../knowledge/sofabeds.js';
import { getTableKnowledge }         from '../knowledge/tables.js';
import { getKitchenKnowledge }       from '../knowledge/kitchen.js';
import { getWardrobeKnowledge }      from '../knowledge/wardrobes.js';
import { getShowroomKnowledge }      from '../knowledge/showroom.js';
import { getWarrantyKnowledge }      from '../knowledge/warranty.js';
import { getBasicFurnitureKnowledge } from '../knowledge/basicfurniture.js';
import { getCabinetryKnowledge, calculateCabinetPrice } from '../knowledge/cabinetry.js';

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';
// NOTE: llama-3.1-8b-instant is deprecated by Groq — shutdown date 08/16/26.
// Migrated to Groq's recommended replacement, openai/gpt-oss-20b, which is
// also a stronger reasoning model (helps with grounding/hallucination too).
const GROQ_MODEL = 'openai/gpt-oss-20b';

// ── Detect which knowledge bases are relevant ─────────────────
// IMPORTANT: this looks at the last few turns of history too, not just the
// current message. Otherwise a natural follow-up like "what is X?" (where X
// was named by the bot one turn ago) loses all context, because the message
// itself may contain none of the trigger keywords for that knowledge file —
// causing the bot to wrongly claim a real product doesn't exist.
function getRelevantKnowledge(message, history) {
    const recentHistoryText = Array.isArray(history)
        ? history.slice(-4).map(m => (m && m.content) ? m.content : '').join(' ')
        : '';
    const msg = `${recentHistoryText} ${message}`.toLowerCase();
    let knowledge = '';

    if (msg.match(/wall bed|wallbed|murphy bed|fold|gioco|murano|single bed|queen bed|ceiling/))
        knowledge += getWallBedKnowledge();

    if (msg.match(/sofa bed|sofabed|sofa|living room|couch/))
        knowledge += getSofaBedKnowledge();

    if (msg.match(/table|dining|desk|study/))
        knowledge += getTableKnowledge();

    if (msg.match(/kitchen|cabinet|cabinetry|cooking|pantry/))
        knowledge += getKitchenKnowledge();

    if (msg.match(/wardrobe|closet|clothes|storage|walk-in|cabinet/))
        knowledge += getWardrobeKnowledge();

    if (msg.match(/showroom|visit|location|address|trx|maison|appointment|open|hour/))
        knowledge += getShowroomKnowledge();

    if (msg.match(/warranty|guarantee|claim|repair|after.?sales|defect/))
        knowledge += getWarrantyKnowledge();

    if (msg.match(/renovation|interior|design|house|condo|budget|layout|floor plan/))
        knowledge += getRenovationKnowledge();

    if (msg.match(/sofa|couch|coffee table|dining|recliner|bed frame|basic furniture|cheaper|budget|alternative|arto|erga|euclio|forge|anta|arvo|hara|lyco|theta|zenith|crorix|flare|dream|colony|celestia|zenon|marlie|nebula|neva|perch|solaris|orbit|casa|pluto|moria|cozelle/))
        knowledge += getBasicFurnitureKnowledge();

    // Surround cabinetry — side/overhead cabinets built AROUND a wall bed.
    // Distinct from the general "cabinet" keyword in the wardrobe/kitchen
    // triggers above, which cover free-standing kitchen/wardrobe cabinetry.
    if (msg.match(/side cabinet|overhead cabinet|surround cabinet|cabinet(ry)? around|cabinet(s|ry)? (on|beside|next to|for) (the |my )?(wall ?bed|bed)|wall ?bed.*cabinet|extra cabinet|estimate.*cabinet|cabinet.*(price|cost|quote|estimate)/))
        knowledge += getCabinetryKnowledge();

    // Fallback — if nothing matched, send a light default
    if (!knowledge) {
        knowledge += getWallBedKnowledge();
        knowledge += getShowroomKnowledge();
    }

    return knowledge;
}

// ── Build system prompt ───────────────────────────────────────
function buildSystemPrompt(message, history) {
    return `You are Moco, a friendly and professional AI consultant for MOCOF — a premium Malaysian furniture and interior design brand specialising in space-saving solutions.

PERSONALITY:
- Warm, professional, and concise
- Always guide customers toward the right product
- Ask follow-up questions to understand needs
- Suggest showroom visits for serious buyers

WHATSAPP CONTACT:
- For product inquiries: +60 12-568 4568
- For renovation inquiries: +60 12-475 4568
- When customer mentions renovation budget or design preferences, use the renovation WhatsApp number (+60 12-475 4568).
- ONLY append WhatsApp contact when the customer explicitly mentions their BUDGET or DESIGN PREFERENCES specifically in the context of renovation (e.g. "my budget is RM 50k", "I want a Scandinavian style", "how much would a full renovation cost", "what design do you suggest for my condo renovation").
- Do NOT include the WhatsApp number or that message in any other responses — not for general product questions, showroom visits, warranty, delivery, pricing enquiries, or any other topic unless renovation budget or renovation design is the clear subject.

PRICING RULES:
- You CAN share the listed retail and sale prices from the knowledge base
- Always present both: "Retail: RM X | Sale: RM X"
- For custom items (walk-in wardrobes, kitchen cabinetry, full renovation): say "Pricing is personalised — contact us on WhatsApp at +60 12-568 4568 for a quote"
- NEVER fabricate prices not in the knowledge base

YOUR KNOWLEDGE BASE:
${getRelevantKnowledge(message, history)}

PRODUCT RECOMMENDATION RULES:
- Study room → Gioco Single with Desk (RM 17,538.11 sale)
- Living room → Murano Queen with Sofa (RM 23,698.11 sale)
- Low ceiling below 2.4m → Gioco Series
- Standard ceiling 2.4m and above → Murano Series
- Always ask ceiling height AND room purpose before recommending wall beds
- If the integrated Sofa variant is out of budget, recommend the BUDGET WALL BED + SEPARATE SOFA COMBO from the knowledge base (a plain wall bed plus a standalone Basic Sofa) instead of inventing a discount — this is a real, cheaper, two-product combo

- NEVER combine or "pair" two named model variants of the SAME wall bed unit together (e.g. Murano Queen + Murano Queen Shelves — pick one bed configuration). This does NOT apply to surround cabinetry: a customer CAN add custom surround cabinetry (side + overhead cabinets) around any wall bed configuration — that is a separate structure, not a bed variant. When a customer asks about adding cabinets/storage around a wall bed, treat it as surround cabinetry by default — confirm it's possible and ask for the total wall length, without explaining the bed-variant mutual-exclusivity rule. Only mention that variants can't be combined if the customer specifically names two bed variants together (e.g. "can I get Queen Sofa and Queen Shelves") or is otherwise actually trying to combine bed configurations — never as a general disclaimer.

RENOVATION LEAD COLLECTION:
If customer mentions renovation, interior design, house design, condo renovation, or kitchen renovation — collect these ONE AT A TIME conversationally:
1. Property type
2. Location / area
3. Budget range
4. Design style preference
5. Number of rooms
6. Floor plan available?
7. Room dimensions
8. Existing obstacles
9. Target completion date
After all collected → summarise and say: "Thank you! Please reach out to our design consultant on WhatsApp at +60 12-568 4568 to schedule your free consultation and share these details."
- If the customer only wants to buy a single product (e.g. "I just wanna buy a wall bed") rather than a full renovation, do NOT run this lead collection flow — just help them with the product directly.

SURROUND CABINETRY ESTIMATES:
- When a customer asks about adding cabinets/storage around a wall bed, treat it as
  surround cabinetry by default — confirm it's possible, then walk through the formula
  in the KNOWLEDGE BASE section above, asking for wall height, wall bed width, and
  (only if the wall is over 9ft tall) total wall width — one question at a time.
- If a "PRE-CALCULATED CABINETRY ESTIMATE" block appears below, the server has already
  computed it from this customer's own measurements — present those EXACT figures as
  the breakdown. Do NOT recalculate, re-round, or adjust them yourself.
- If no such block appears, you don't have complete measurements yet — keep asking for
  whichever of wall height / wall bed width / total wall width is still missing. Do not
  guess or estimate a total from memory before all required measurements are collected.
- Always label it as an estimate confirmed via WhatsApp/site survey.
- This is the ONE place where you may state a price that isn't literally written in the
  knowledge base — because it's a live calculation from the customer's own measurements,
  not an invented number. Do not use this as license to estimate prices anywhere else.
${buildCabinetryEstimateBlock(message, history)}

SHOWROOM APPOINTMENT / SHOW UNIT VIEWING:
- For TRX Core Residence or Maison MOCOF TRX viewings → always say: "This is by appointment only — please contact us on WhatsApp at +60 12-568 4568 to book your visit."
- For general showroom visits → share the relevant showroom details and suggest WhatsApp for appointments

RESPONSE RULES:
- Maximum 120 words unless detail is genuinely needed
- Use line breaks for readability
- End with a question or call to action
- Never invent prices or specs not in the knowledge base

FORMATTING RULES:
- Use ONLY Markdown bold (wrap text in double asterisks, e.g. **Wall Beds**) to highlight key product and service keywords.
- Always bold important keywords such as: **Wall Beds**, **Sofa Beds**, **Renovation**, **Tables**, **Kitchen**, **Wardrobes**, **Showroom**, **Warranty**, product series names like **Murano Series** and **Gioco Series**, and specific model names like **Murano Queen** or **Gioco Single Desk**.
- Do NOT bold entire sentences — only the key keywords, product names, and series/model names.
- NEVER use italics or single asterisks. Only use double asterisks for bold. Do not use any other Markdown formatting.

CRITICAL — GROUNDING (this section overrides anything above if there's ever a conflict):
- Every product name, price, and spec you state must appear character-for-character in the KNOWLEDGE BASE section above — EXCEPT a surround cabinetry estimate you calculate live from the formula and the customer's own stated measurements (see SURROUND CABINETRY ESTIMATES above). That is the only case where a number not literally in the knowledge base is allowed. Never invent a product by combining two real names — for example there is no "Gioco Queen Sofa"; the real Gioco lineup is ONLY: Gioco Single, Gioco Queen, Gioco Single Desk, Gioco Bunk Bed. The real Murano lineup is ONLY: Murano Single, Murano Queen, Murano King, Murano Queen Sofa, Murano Queen Desk, Murano Queen Shelves.
- If a customer asks for something cheaper or an alternative, only offer a REAL lower-priced option that is already in the knowledge base above (e.g. Murano Single or Gioco Single are the lowest-priced wall beds; a Basic Sofa is the lowest-cost way to add separate seating). Never invent a new "budget" variant or a new price.
- Always state prices exactly as written in the knowledge base, including the cents (e.g. "RM 12,062.55", not "RM 12,062" or "around RM 12,000") — rounding or approximating a real price is not allowed.
- If a customer asks about a specific named product (e.g. "what is X?"), first check the ENTIRE knowledge base above carefully before answering — do not say a product doesn't exist unless you have checked thoroughly. If it genuinely isn't there, say you don't have that specific detail on hand rather than firmly declaring it doesn't exist, and offer to confirm via WhatsApp (+60 12-568 4568) — a product you can't find in your own context may still be real.`;
}

// ── API keys (primary → fallback) ────────────────────────────
function getGroqApiKeys() {
    return [process.env.GROQ_API_KEY, process.env.GROQ_API_KEY_2]
        .filter(key => typeof key === 'string' && key.trim() !== '');
}

const RETRYABLE_STATUSES = new Set([401, 429, 500, 502, 503]);

async function callGroq(apiKey, requestBody) {
    const groqRes = await fetch(GROQ_URL, {
        method:  'POST',
        headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
    });

    if (!groqRes.ok) {
        const errText = await groqRes.text();
        const err = new Error(`Groq API error: ${groqRes.status}`);
        err.status = groqRes.status;
        err.details = errText;
        throw err;
    }

    const data = await groqRes.json();

    if (
        !data.choices            ||
        !data.choices[0]         ||
        !data.choices[0].message ||
        !data.choices[0].message.content
    ) {
        const err = new Error('Invalid response from Groq');
        err.status = 502;
        throw err;
    }

    return data.choices[0].message.content;
}

// ── Convert history to OpenAI/Groq format ────────────────────
function toGroqHistory(history) {
    if (!Array.isArray(history)) return [];
    return history
        .filter(m => m && m.role && m.content && m.content.trim() !== '')
        .map(m => ({
            role:    m.role === 'user' ? 'user' : 'assistant',
            content: m.content.trim()
        }));
}

// ── Price guardrail: catch hallucinated RM figures before they reach the customer ──
// Builds a master list of EVERY real price across the whole business (not just
// whatever got routed into this turn's prompt), so genuinely valid prices from
// earlier in the conversation never get false-flagged just because this message
// didn't retrigger that knowledge category.
//
// Uses a small tolerance (not exact-cent matching) because the model may
// naturally round a real price in casual phrasing (e.g. "RM 12,062" instead
// of "RM 12,062.55") — that's not hallucination, it's rounding, and treating
// it as hallucination throws away a perfectly correct answer.
function extractAmounts(text) {
    const amounts = [];
    const matches = text.matchAll(/RM\s?([\d,]+(?:\.\d{1,2})?)/gi);
    for (const m of matches) {
        const val = parseFloat(m[1].replace(/,/g, ''));
        if (!isNaN(val)) amounts.push(val);
    }
    return amounts;
}

const MASTER_PRICE_LIST = extractAmounts([
    getWallBedKnowledge(),
    getSofaBedKnowledge(),
    getTableKnowledge(),
    getKitchenKnowledge(),
    getWardrobeKnowledge(),
    getShowroomKnowledge(),
    getWarrantyKnowledge(),
    getRenovationKnowledge(),
    getBasicFurnitureKnowledge(),
    getCabinetryKnowledge() // includes the RM1,350 / RM800 unit rates + worked examples
].join('\n'));

const PRICE_TOLERANCE = 2.00; // RM — forgives cent-level rounding, not real mistakes

function isKnownAmount(val, extraAllowed) {
    for (const known of MASTER_PRICE_LIST) {
        if (Math.abs(known - val) <= PRICE_TOLERANCE) return true;
    }
    for (const known of extraAllowed) {
        if (Math.abs(known - val) <= PRICE_TOLERANCE) return true;
    }
    return false;
}

// ── Cabinetry estimates are the one case where the model states a price that
// isn't a literal catalog number — it's calculated live from measurements the
// customer gave earlier in the conversation. Best-effort regex extraction of
// those measurements from the recent conversation, then re-running the exact
// same formula server-side, so the guardrail can recognize the resulting
// total (and its line items) as legitimate instead of flagging them.
//
// IMPORTANT: the system prompt asks for height / bed width / total width ONE
// AT A TIME, so customers typically reply with a bare number ("9ft", "5.5 ft")
// with no context words at all. This function is turn-aware: for a bare
// number with no self-contained context, it looks at what the ASSISTANT'S
// PRECEDING message asked about and attributes the number accordingly.
//
// This is intentionally best-effort text parsing, not a robust NLU layer —
// if extraction still fails, we fall back to the normal strict guard for
// that message (safe default: no extra amounts get allowed).
function extractFtValue(text, patterns) {
    for (const p of patterns) {
        const m = text.match(p);
        if (m) {
            const val = parseFloat(m[1]);
            if (!isNaN(val)) return val;
        }
    }
    return null;
}

const BARE_FT_PATTERN = /(\d+(?:\.\d+)?)\s*(?:ft|feet|')/;
const SINGLE_SIDE_PATTERN = /\bone side\b|\bonly\s*1\s*side\b|\bsingle side\b|\bcorner\b/;

function extractCabinetryDimensions(history, message) {
    const priorTurns = Array.isArray(history) ? history.slice(-10) : [];
    const turns = [...priorTurns, { role: 'user', content: message }];

    let heightFt = null, bedWidthFt = null, totalWidthFt = null, sidesOverride = null;

    for (let i = 0; i < turns.length; i++) {
        const turn = turns[i];
        if (!turn || turn.role !== 'user' || !turn.content) continue;

        const userText = (turn.content || '').toLowerCase();
        const prevAssistant = (i > 0 && turns[i - 1] && turns[i - 1].role === 'assistant')
            ? (turns[i - 1].content || '').toLowerCase()
            : '';

        if (SINGLE_SIDE_PATTERN.test(userText)) sidesOverride = 1;

        // 1) Self-contained matches (the number's own message names what it is).
        // Check ALL three (not just the first hit) — a customer can answer more
        // than one measurement in a single message, e.g. "wall height is 9ft and
        // the wall bed is 5.5ft wide" should capture both, not just the first.
        const heightSelf = extractFtValue(userText, [
            /wall\s*height[^.\d]{0,15}(\d+(?:\.\d+)?)\s*(?:ft|feet|')/,
            /(\d+(?:\.\d+)?)\s*(?:ft|feet|')\s*(?:tall|high)\b/,
            /height\s*(?:is|of)?\s*(\d+(?:\.\d+)?)\s*(?:ft|feet|')/,
            /(\d+(?:\.\d+)?)\s*(?:ft|feet|')\s*(?:in\s+)?height\b/
        ]);
        const bedSelf = extractFtValue(userText, [
            /(?:wall ?bed|bed)[^.\d]{0,15}(\d+(?:\.\d+)?)\s*(?:ft|feet|')/,
            /(\d+(?:\.\d+)?)\s*(?:ft|feet|')\s*wide\s*(?:wall ?)?bed/
        ]);
        const totalSelf = extractFtValue(userText, [
            /total\s*wall\s*width[^.\d]{0,10}(\d+(?:\.\d+)?)\s*(?:ft|feet|')/,
            /(?:entire|whole|full|overall)\s*wall[^.\d]{0,10}(\d+(?:\.\d+)?)\s*(?:ft|feet|')/,
            /wall\s*(?:is|of)\s*(\d+(?:\.\d+)?)\s*(?:ft|feet|')\s*wide/,
            /(\d+(?:\.\d+)?)\s*(?:ft|feet|')\s*(?:wide|width)\s*wall/
        ]);

        let matchedSelfContained = false;
        if (heightSelf)   { heightFt = heightSelf; matchedSelfContained = true; }
        if (bedSelf)      { bedWidthFt = bedSelf; matchedSelfContained = true; }
        if (totalSelf)    { totalWidthFt = totalSelf; matchedSelfContained = true; }
        if (matchedSelfContained) continue;

        // 2) Bare number with no context of its own — infer from what the bot just
        // asked. Keyword coverage is intentionally broader here than a literal
        // "height"/"total width" match, because the model paraphrases its own
        // questions (e.g. "How tall is the wall?" instead of "What is the wall
        // height?") and this has to survive that variation, not just the exact
        // wording used in the knowledge base / system prompt.
        const bareMatch = userText.match(BARE_FT_PATTERN);
        if (!bareMatch) continue;
        const bareVal = parseFloat(bareMatch[1]);
        if (isNaN(bareVal)) continue;

        if (/total\s*(?:wall\s*)?width|(?:entire|whole|full|overall)\s*wall/.test(prevAssistant)) totalWidthFt = bareVal;
        else if (/\bbed\b.*\b(?:width|wide)\b|\b(?:width|wide)\b.*\bbed\b/.test(prevAssistant)) bedWidthFt = bareVal;
        else if (/height|\btall\b|\bhigh\b/.test(prevAssistant)) heightFt = bareVal;
    }

    return { heightFt, bedWidthFt, totalWidthFt, sides: sidesOverride ?? 2 };
}

// Runs extraction + the real formula once; both the guard-allowlist and the
// system-prompt pre-calculated block (below) read from this single source
// so they can never disagree with each other.
function getCabinetryEstimateFromContext(message, history) {
    try {
        const { heightFt, bedWidthFt, totalWidthFt, sides } = extractCabinetryDimensions(history, message);
        if (!heightFt || !bedWidthFt) return null;

        const result = calculateCabinetPrice({
            wallHeightFt: heightFt,
            wallBedWidthFt: bedWidthFt,
            totalWallWidthFt: totalWidthFt ?? undefined,
            sides
        });

        return { heightFt, bedWidthFt, totalWidthFt, ...result };
    } catch {
        return null; // e.g. height > 9ft but total wall width not collected yet
    }
}

// Scans the last few turns + current message for cabinetry measurements and,
// if enough are present, computes the same total the model should be stating
// — those numbers become allowed even though they're not in the static catalog.
function computeCabinetryAllowedAmounts(message, history) {
    const est = getCabinetryEstimateFromContext(message, history);
    if (!est) return [];
    return [est.sideCostPerSide, est.sideCostTotal, est.topCost, est.exceedingCost, est.total]
        .filter(v => v > 0);
}

function formatRM(n) {
    return `RM ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Builds a ready-made, already-correct breakdown to inject into the system
// prompt when we have enough measurements. The model is told to relay these
// exact figures rather than compute them itself — this removes reliance on
// the model's arithmetic entirely, not just the after-the-fact guard check.
function buildCabinetryEstimateBlock(message, history) {
    const est = getCabinetryEstimateFromContext(message, history);
    if (!est) return '';

    const lines = [
        '',
        'PRE-CALCULATED CABINETRY ESTIMATE FOR THIS CUSTOMER (already computed from their measurements — use these EXACT figures, do not recalculate or round differently):',
        `- Side cabinets: ${formatRM(est.sideCostPerSide)} per side × ${est.sides} side(s) = ${formatRM(est.sideCostTotal)} (height used: ${est.sideHeightUsedFt}ft${est.exceedsStandard ? ', capped at the 9ft standard' : ''})`,
        `- Overhead cabinet (${est.bedWidthFt}ft wide): ${formatRM(est.topCost)}`
    ];
    if (est.exceedsStandard) {
        lines.push(`- Excess-height surcharge (wall is ${est.heightFt}ft, over the 9ft standard; full wall width ${est.totalWidthFt}ft): ${formatRM(est.exceedingCost)}`);
    }
    lines.push(`- TOTAL ESTIMATE: ${formatRM(est.total)}`);
    return lines.join('\n');
}

// Returns an array of suspicious RM figures found in the reply that don't exist
// anywhere in the real catalog AND weren't stated by the customer themselves
// (so echoing back a customer's own stated budget is never treated as hallucination),
// AND aren't a live cabinetry-estimate figure computed from their own measurements.
function findHallucinatedPrices(reply, userMessage, extraKnownAmounts = []) {
    const replyAmounts = extractAmounts(reply);
    const userAmounts  = extractAmounts(userMessage || '');
    const allowedFromContext = [...userAmounts, ...extraKnownAmounts];
    const suspicious = [];
    for (const val of replyAmounts) {
        if (!isKnownAmount(val, allowedFromContext)) suspicious.push(val.toFixed(2));
    }
    return suspicious;
}

const SAFE_FALLBACK_REPLY = "I want to make sure I give you accurate pricing rather than guess — let me connect you with our team directly. Please reach out on **WhatsApp** at +60 12-568 4568 and they'll confirm the exact options and prices for you. Is there anything else I can help with in the meantime?";

// ── Main handler ──────────────────────────────────────────────
export default async function handler(req, res) {

    // ── CORS headers ──────────────────────────────────────────
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // ── Read API keys ─────────────────────────────────────────
    const apiKeys = getGroqApiKeys();

    if (apiKeys.length === 0) {
        console.error('No Groq API keys set — configure GROQ_API_KEY in Vercel');
        return res.status(500).json({
            error: 'Server configuration error — API key missing'
        });
    }

    // ── Validate request body ─────────────────────────────────
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ error: 'message is required' });
    }

    // ── Build & send Groq request ─────────────────────────────
    try {
        const requestBody = {
            model: GROQ_MODEL,
            messages: [
                { role: 'system',    content: buildSystemPrompt(message, history) },
                ...toGroqHistory(history || []),
                { role: 'user',      content: message.trim() }
            ],
            temperature: 0.7,
            max_completion_tokens: 800, // gpt-oss reasoning tokens count against this budget too
            reasoning_effort: 'low',    // keep it fast/cheap for a real-time chat widget
            top_p:       0.95,
            stream:      false
        };

        let reply = null;
        let lastError = null;

        for (let i = 0; i < apiKeys.length; i++) {
            const keyLabel = i === 0 ? 'primary' : 'fallback';
            try {
                reply = await callGroq(apiKeys[i], requestBody);
                break;
            } catch (err) {
                lastError = err;
                const canRetry = i < apiKeys.length - 1 &&
                    (RETRYABLE_STATUSES.has(err.status) || !err.status);

                console.error(`Groq ${keyLabel} key failed:`, err.status || 'network', err.details || err.message);

                if (!canRetry) break;
                console.log(`Retrying with ${i + 1 === apiKeys.length - 1 ? 'fallback' : 'next'} Groq API key...`);
            }
        }

        if (reply) {
            const cabinetryAllowedAmounts = computeCabinetryAllowedAmounts(message, history);
            const badPrices = findHallucinatedPrices(reply, message, cabinetryAllowedAmounts);
            if (badPrices.length > 0) {
                console.error('Blocked reply containing unrecognized price(s):', badPrices.join(', '), '| original reply:', reply);
                reply = SAFE_FALLBACK_REPLY;
            }
            return res.status(200).json({ success: true, message: reply });
        }

        const status = lastError?.status && lastError.status >= 400 ? lastError.status : 502;
        return res.status(status === 429 ? 502 : status).json({
            error:   'Groq API error',
            details: lastError?.details || lastError?.message || 'All API keys failed'
        });

    } catch (err) {
        console.error('Handler error:', err.message || err);
        return res.status(500).json({
            error:   'Internal server error',
            details: err.message
        });
    }
}