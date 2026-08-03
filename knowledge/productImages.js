// =============================================================
// FILE: knowledge/productImages.js
// Structured product image lookup — mirrors the pattern used by
// WALLBED_MODEL_WIDTHS_FT in wallbeds.js: real image URLs, matched
// in code, never left to the model to invent.
//
// Order + negative lookaheads matter here: "Murano Basic Series" is
// the shared product photo for the plain Queen/King/Single configs
// (they're sold on one combined product page on the site), so its
// pattern must NOT fire when a Sofa/Desk/Shelves variant is what's
// actually being asked about — otherwise a question about the
// Queen Sofa would return both the Sofa photo AND the generic one.
// =============================================================
export const PRODUCT_IMAGES = [
    // ── Murano — variant-specific photos (checked first) ──
    {
        pattern: /murano\s*queen\s*sofa/i,
        label: 'Murano Queen Sofa',
        url: 'https://static.wixstatic.com/media/118d88_a7af654d5dce4b2ca7cffd83cdca4437~mv2_d_5148_3135_s_4_2.jpg/v1/fill/w_674,h_410,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/118d88_a7af654d5dce4b2ca7cffd83cdca4437~mv2_d_5148_3135_s_4_2.jpg'
    },
    {
        pattern: /murano\s*queen\s*desk/i,
        label: 'Murano Queen Desk',
        url: 'https://static.wixstatic.com/media/118d88_be526b528574446ca85c2f28b3ca93c7~mv2.png/v1/fill/w_674,h_674,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/118d88_be526b528574446ca85c2f28b3ca93c7~mv2.png'
    },
    {
        pattern: /murano\s*queen\s*shelves/i,
        label: 'Murano Queen Shelves',
        url: 'https://static.wixstatic.com/media/118d88_ec1d6bd1cb324e82bea4624b1d39a884~mv2.jpg/v1/fill/w_674,h_674,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/118d88_ec1d6bd1cb324e82bea4624b1d39a884~mv2.jpg'
    },

    // ── Murano — plain configs share one photo (Basic Series) ──
    // Negative lookahead skips this when a Sofa/Desk/Shelves variant
    // is actually what's being asked about (matched above instead).
    {
        pattern: /murano\s*(queen|king|single)(?!\s*(sofa|desk|shelves))/i,
        label: 'Murano Basic Series',
        url: 'https://static.wixstatic.com/media/118d88_081f1896093f49678d2fb5e325e4a734~mv2.jpg/v1/fill/w_602,h_674,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/118d88_081f1896093f49678d2fb5e325e4a734~mv2.jpg'
    },

    // ── Gioco — variant-specific photos (checked first) ──
    {
        pattern: /gioco\s*single\s*desk/i,
        label: 'Gioco Single Desk',
        url: 'https://static.wixstatic.com/media/118d88_03d3a09abda14cc5864bf3849e08c481~mv2.jpg/v1/fill/w_483,h_483,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/118d88_03d3a09abda14cc5864bf3849e08c481~mv2.jpg'
    },
    {
        pattern: /gioco\s*bunk/i,
        label: 'Gioco Bunk Bed',
        url: 'https://static.wixstatic.com/media/118d88_a9d7b36ace33482386dcb35b754ccedf~mv2.jpg/v1/fill/w_483,h_483,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/118d88_a9d7b36ace33482386dcb35b754ccedf~mv2.jpg'
    },

    // ── Gioco — plain configs share one photo (Basic Series) ──
    {
        pattern: /gioco\s*(queen|single)(?!\s*desk)/i,
        label: 'Gioco Basic Series',
        url: 'https://static.wixstatic.com/media/118d88_c1a2026b658a4da5b5052fe1b251f790~mv2_d_4160_3120_s_4_2.jpg/v1/fill/w_644,h_483,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/118d88_c1a2026b658a4da5b5052fe1b251f790~mv2_d_4160_3120_s_4_2.jpg'
    },

    // Add sofa beds / tables / kitchen / wardrobes the same way once
    // their image links are available.
];

const MAX_IMAGES_PER_REPLY = 2;

// Same message+recent-history strategy as getRelevantKnowledge() in
// api/chat.js, so a follow-up like "show me a photo of that" still
// resolves to whichever model was named a turn earlier.
export function getRelevantImages(message, history) {
    const recentHistoryText = Array.isArray(history)
        ? history.slice(-4).map(m => (m && m.content) ? m.content : '').join(' ')
        : '';
    const combined = `${recentHistoryText} ${message}`.toLowerCase();

    const seen = new Set();
    const matches = [];
    for (const entry of PRODUCT_IMAGES) {
        if (combined.match(entry.pattern) && !seen.has(entry.url)) {
            seen.add(entry.url);
            matches.push({ label: entry.label, url: entry.url });
            if (matches.length >= MAX_IMAGES_PER_REPLY) break;
        }
    }
    return matches;
}