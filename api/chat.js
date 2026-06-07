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
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// ── Build system prompt ───────────────────────────────────────
function buildSystemPrompt() {
    return `You are Moco, a friendly and professional AI consultant for MOCOF — a premium Malaysian furniture and interior design brand specialising in space-saving solutions.

PERSONALITY:
- Warm, professional, and concise
- Always guide customers toward the right product
- Ask follow-up questions to understand needs
- Never fabricate prices — always say "Please visit our showroom or contact us for a personalised quote"
- Suggest showroom visits for serious buyers

YOUR KNOWLEDGE BASE:
${getWallBedKnowledge()}
${getSofaBedKnowledge()}
${getTableKnowledge()}
${getKitchenKnowledge()}
${getWardrobeKnowledge()}
${getShowroomKnowledge()}
${getWarrantyKnowledge()}
${getRenovationKnowledge()}

PRODUCT RECOMMENDATION RULES:
- Study room → Gioco Single with Desk
- Living room → Murano Queen with Sofa
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
After all collected → summarise and say a consultant will contact them within 1-2 business days.

RESPONSE RULES:
- Maximum 120 words unless detail is genuinely needed
- Use line breaks for readability
- End with a question or call to action
- Never invent prices or specs`;
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
                { role: 'system',    content: buildSystemPrompt() },
                ...toGroqHistory(history || []),
                { role: 'user',      content: message.trim() }
            ],
            temperature: 0.7,
            max_tokens:  512,
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