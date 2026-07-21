// =============================================================
// FILE: api/chat.js
// Vercel Serverless Function — handles all Groq API calls
// Endpoint: POST /api/chat
// API Keys: GROQ_API_KEY (primary), GROQ_API_KEY_2 (fallback) in Vercel env vars
// =============================================================

import { getRenovationKnowledge } from '../knowledge/renovation.js';
import { getWallBedKnowledge }    from '../knowledge/wallbeds.js';
import { getSofaBedKnowledge }    from '../knowledge/sofabeds.js';
import { getTableKnowledge }      from '../knowledge/tables.js';
import { getKitchenKnowledge }    from '../knowledge/kitchen.js';
import { getWardrobeKnowledge }   from '../knowledge/wardrobes.js';
import { getShowroomKnowledge }   from '../knowledge/showroom.js';
import { getWarrantyKnowledge }   from '../knowledge/warranty.js';

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';

// ── Detect which knowledge bases are relevant ─────────────────
function getRelevantKnowledge(message) {
    const msg = message.toLowerCase();
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

    // Fallback — if nothing matched, send a light default
    if (!knowledge) {
        knowledge += getWallBedKnowledge();
        knowledge += getShowroomKnowledge();
    }

    return knowledge;
}

// ── Build system prompt ───────────────────────────────────────
function buildSystemPrompt(message) {
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
${getRelevantKnowledge(message)}

PRODUCT RECOMMENDATION RULES:
- Study room → Gioco Single with Desk (RM 17,538.11 sale)
- Living room → Murano Queen with Sofa (RM 23,698.11 sale)
- Low ceiling below 2.4m → Gioco Series
- Standard ceiling 2.4m and above → Murano Series
- Always ask ceiling height AND room purpose before recommending wall beds

- INTERNAL RULE, NOT A CUSTOMER-FACING DISCLAIMER: two named model variants of the SAME wall bed unit (e.g. Murano Queen + Murano Queen Shelves) can never be combined — this governs what YOU recommend, it is not something to read out loud.
- Only mention this exclusivity rule if the customer explicitly asks to combine, pair, or add one Murano/Gioco variant on top of another (e.g. "can I add Shelves to my Queen Sofa?"). Otherwise never bring it up — including when the topic is surround cabinetry, pricing, or anything else.
- Surround cabinetry is a SEPARATE structure, not a bed variant, and is not covered by the rule above: a customer CAN add custom surround cabinetry (side + overhead cabinets) around any wall bed configuration. When a customer asks about adding cabinets/storage around a wall bed, just answer using the WALL BED SURROUND CABINETRY info and ask for the total wall width — no caveat needed.
- If unsure whether two specific items can coexist, say so plainly and suggest confirming with a showroom consultant rather than guessing.

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
- NEVER use italics or single asterisks. Only use double asterisks for bold. Do not use any other Markdown formatting.`;
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
                { role: 'system',    content: buildSystemPrompt(message) },
                ...toGroqHistory(history || []),
                { role: 'user',      content: message.trim() }
            ],
            temperature: 0.7,
            max_tokens:  256,
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