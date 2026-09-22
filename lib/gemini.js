// =============================================================
// FILE: lib/gemini.js
// The Gemini caller, shared by api/chat.js (customer bot) and
// api/staff-chat.js (staff invoice tool).
//
// Extracted from api/chat.js rather than duplicated: the retry rules below are
// subtle (which failures justify trying the second key, and which would fail
// identically), and two copies would drift. api/chat.js re-exports
// getGeminiApiKeys and callGeminiWithFallback from here so its existing
// test-only export block keeps working unchanged.
//
// Nothing in this file knows anything about MOCOF's prompts, knowledge, or
// pricing — it takes a request body and returns the model's text. That is what
// makes it safe for the staff tool to share: no customer-facing behaviour
// crosses over with it.
// =============================================================

export const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
export const GEMINI_MODEL = 'gemini-3.5-flash-lite';

export function getGeminiApiKeys() {
    return [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2]
        .filter(key => typeof key === 'string' && key.trim() !== '');
}

export async function callGemini(apiKey, requestBody) {
    const geminiRes = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
    });

    if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        const err = new Error(`Gemini API error: ${geminiRes.status}`);
        err.status = geminiRes.status;
        err.details = errText;
        throw err;
    }

    const data = await geminiRes.json();

    // Gemini 3.x models spend part of max_completion_tokens on internal
    // "thinking" before writing the visible reply -- if thinking consumes
    // most/all of the budget, finish_reason comes back as "length" with a
    // partial (or empty) message, and nothing about the HTTP response itself
    // looks like an error. Logging this is the only way to actually see it
    // happening, rather than just observing "replies are sometimes cut" with
    // no lead on why.
    const finishReason = data?.choices?.[0]?.finish_reason;
    if (finishReason === 'length') {
        console.warn(
            'Gemini reply hit the token limit before finishing (finish_reason: length) — ' +
            'likely the thinking/reasoning budget ate most or all of max_completion_tokens. ' +
            'usage:', JSON.stringify(data.usage || {})
        );
    }

    if (
        !data.choices ||
        !data.choices[0] ||
        !data.choices[0].message ||
        !data.choices[0].message.content
    ) {
        const err = new Error('Invalid response from Gemini');
        err.status = 502;
        throw err;
    }

    return data.choices[0].message.content;
}

// Tries each configured key in order (GEMINI_API_KEY, then
// GEMINI_API_KEY_2), but only advances to the next key when the failure
// looks like something a *different* key could plausibly fix — a network
// error, rate limiting (429), or the provider having a bad moment (5xx).
// A 4xx like 400/401/403 means the request or that specific key itself is
// bad, and the other key would fail the exact same way, so it fails fast
// instead of wasting a second round-trip.
export async function callGeminiWithFallback(apiKeys, requestBody) {
    let lastError = null;
    for (let i = 0; i < apiKeys.length; i++) {
        try {
            return await callGemini(apiKeys[i], requestBody);
        } catch (err) {
            lastError = err;
            const retryable = !err.status || err.status === 429 || err.status >= 500;
            const isLastKey = i === apiKeys.length - 1;
            console.error(
                `Gemini key ${i + 1}/${apiKeys.length} failed:`, err.status || 'network', err.details || err.message,
                (retryable && !isLastKey) ? '— trying next key' : ''
            );
            if (!retryable || isLastKey) {
                throw err;
            }
        }
    }
    throw lastError;
}
