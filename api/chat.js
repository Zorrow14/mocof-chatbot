// =============================================================
// FILE: api/chat.js
// Vercel Serverless Function — handles all Groq API calls
// Endpoint: POST /api/chat
// API Key: stored in Vercel Environment Variables as GROQ_API_KEY
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

    if (msg.match(/wardrobe|closet|clothes|storage|walk-in/))
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
- Never invent prices or specs not in the knowledge base`;
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

    // ── Read API key ──────────────────────────────────────────
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        console.error('GROQ_API_KEY is not set in Vercel environment variables');
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
            console.error('Groq API error:', groqRes.status, errText);
            return res.status(502).json({
                error:   'Groq API error',
                details: errText
            });
        }

        const data = await groqRes.json();

        if (
            !data.choices            ||
            !data.choices[0]         ||
            !data.choices[0].message ||
            !data.choices[0].message.content
        ) {
            console.error('Unexpected Groq response structure:', JSON.stringify(data));
            return res.status(502).json({ error: 'Invalid response from Groq' });
        }

        const reply = data.choices[0].message.content;

        return res.status(200).json({
            success: true,
            message: reply
        });

    } catch (err) {
        console.error('Handler error:', err.message || err);
        return res.status(500).json({
            error:   'Internal server error',
            details: err.message
        });
    }
}