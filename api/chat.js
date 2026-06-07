// =============================================================
// FILE: api/chat.js
// Vercel Serverless Function — handles all Gemini API calls
// Endpoint: POST /api/chat
// API Key: stored in Vercel Environment Variables as GEMINI_API_KEY
// =============================================================

import { getRenovationKnowledge } from '../knowledge/renovation.js';
import { getWallBedKnowledge }    from '../knowledge/wallbeds.js';
import { getSofaBedKnowledge }    from '../knowledge/sofabeds.js';
import { getTableKnowledge }      from '../knowledge/tables.js';
import { getKitchenKnowledge }    from '../knowledge/kitchen.js';
import { getWardrobeKnowledge }   from '../knowledge/wardrobes.js';
import { getShowroomKnowledge }   from '../knowledge/showroom.js';
import { getWarrantyKnowledge }   from '../knowledge/warranty.js';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

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

// ── Convert history to Gemini format ─────────────────────────
function toGeminiHistory(history) {
    if (!Array.isArray(history)) return [];
    return history
        .filter(m => m && m.role && m.content && m.content.trim() !== '')
        .map(m => ({
            role:  m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));
}

// ── Main handler ──────────────────────────────────────────────
export default async function handler(req, res) {

    // ── CORS headers ──────────────────────────────────────────
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // ── Read API key from Vercel environment variables ────────
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error('GEMINI_API_KEY is not set in Vercel environment variables');
        return res.status(500).json({
            error: 'Server configuration error — API key missing'
        });
    }

    // ── Validate request body ─────────────────────────────────
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ error: 'message is required' });
    }

    // ── Build Gemini request ──────────────────────────────────
    try {
        const requestBody = {
            system_instruction: {
                parts: [{ text: buildSystemPrompt() }]
            },
            contents: [
                ...toGeminiHistory(history || []),
                { role: 'user', parts: [{ text: message.trim() }] }
            ],
            generationConfig: {
                temperature:     0.7,
                topK:            40,
                topP:            0.95,
                maxOutputTokens: 512
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
            ]
        };

        // ── Call Gemini API ───────────────────────────────────
        const geminiRes = await fetch(
            `${GEMINI_URL}?key=${apiKey}`,
            {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(requestBody)
            }
        );

        // ── Handle Gemini errors ──────────────────────────────
        if (!geminiRes.ok) {
            const errText = await geminiRes.text();
            console.error('Gemini API error:', geminiRes.status, errText);
            return res.status(502).json({
                error:   'Gemini API error',
                details: errText
            });
        }

        // ── Parse response ────────────────────────────────────
        const data = await geminiRes.json();

        if (
            !data.candidates            ||
            !data.candidates[0]         ||
            !data.candidates[0].content ||
            !data.candidates[0].content.parts ||
            !data.candidates[0].content.parts[0]
        ) {
            console.error('Unexpected Gemini response structure:', JSON.stringify(data));
            return res.status(502).json({ error: 'Invalid response from Gemini' });
        }

        const reply = data.candidates[0].content.parts[0].text;

        // ── Return success ────────────────────────────────────
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