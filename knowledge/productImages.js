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

    // ── Orzo Hori Sofa Bed — has Open/Closed photos ──
    // Closed pattern uses a negative lookahead so it doesn't ALSO fire
    // when "open" is mentioned (same double-match problem as Murano).
    {
        pattern: /orzo\s*hori(?=.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Orzo Hori Sofa Bed (Open)',
        url: 'https://static.wixstatic.com/media/118d88_94f5df5b90b240a7b952f6ceaa02823d~mv2.jpg/v1/fill/w_732,h_549,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/118d88_94f5df5b90b240a7b952f6ceaa02823d~mv2.jpg'
    },
    {
        pattern: /orzo\s*hori(?!.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Orzo Hori Sofa Bed (Closed)',
        url: 'https://static.wixstatic.com/media/118d88_f2e71edbaa58498093a4722bbe6a3922~mv2.jpg/v1/fill/w_732,h_549,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/118d88_f2e71edbaa58498093a4722bbe6a3922~mv2.jpg'
    },

    // ── Orzo (Single) Sofa Bed — checked after Orzo Hori so plain
    // "orzo" doesn't also match when "hori" is the actual subject ──
    {
        pattern: /orzo(?!\s*hori)\b(?=.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Orzo Sofa Bed (Open)',
        url: 'https://static.wixstatic.com/media/118d88_78849485629e4dadb8e25880cba38ae6~mv2_d_2790_1927_s_2.jpg/v1/fill/w_749,h_533,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/118d88_78849485629e4dadb8e25880cba38ae6~mv2_d_2790_1927_s_2.jpg'
    },
    {
        pattern: /orzo(?!\s*hori)(?!.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Orzo Sofa Bed (Closed)',
        url: 'https://static.wixstatic.com/media/118d88_a2f2bf56e5644658b403c708fcec71d2~mv2_d_3540_2523_s_4_2.jpg/v1/fill/w_749,h_533,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/118d88_a2f2bf56e5644658b403c708fcec71d2~mv2_d_3540_2523_s_4_2.jpg'
    },

    // ── Duo Sofa Bunk Bed — has Open/Closed photos ──
    {
        pattern: /duo.*bunk(?=.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Duo Sofa Bunk Bed (Open)',
        url: 'https://static.wixstatic.com/media/118d88_2bd4395595914c52948b9e22ddec6d95~mv2.jpg/v1/fill/w_734,h_734,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/118d88_2bd4395595914c52948b9e22ddec6d95~mv2.jpg'
    },
    {
        pattern: /duo.*bunk(?!.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Duo Sofa Bunk Bed (Closed)',
        url: 'https://static.wixstatic.com/media/118d88_66f518577c15474096e927eb5b9df3e1~mv2.jpg/v1/fill/w_644,h_644,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/118d88_66f518577c15474096e927eb5b9df3e1~mv2.jpg'
    },

    // ── Ottoman Bed — single photo, no open/closed variant supplied ──
    {
        pattern: /ottoman/i,
        label: 'Ottoman Bed',
        url: 'https://static.wixstatic.com/media/a4c6ea_78c96cd18d494dc3a51f352e022379f3~mv2.jpg/v1/fill/w_459,h_459,al_c,q_80,enc_avif,quality_auto/a4c6ea_78c96cd18d494dc3a51f352e022379f3~mv2.jpg'
    },

    // ── Tables ──
    {
        pattern: /levante/i,
        label: 'Levante Table',
        url: 'https://static.wixstatic.com/media/72b6a8_360fe8274d0143e6afe75d43d1734ad8~mv2.jpeg/v1/fill/w_749,h_563,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/72b6a8_360fe8274d0143e6afe75d43d1734ad8~mv2.jpeg'
    },
    // Ulisse XL checked before plain Ulisse, with a negative lookahead
    // on the plain pattern so a question about the XL doesn't also
    // return the standard 10-pax photo.
    {
        pattern: /ulisse\s*xl/i,
        label: 'Ulisse XL Table (14 Pax)',
        url: 'https://static.wixstatic.com/media/118d88_0ffa7de154f345e1b242aada8c7281e2~mv2.jpg/v1/fill/w_644,h_644,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/118d88_0ffa7de154f345e1b242aada8c7281e2~mv2.jpg'
    },
    {
        pattern: /ulisse(?!\s*xl)/i,
        label: 'Ulisse Table (10 Pax)',
        url: 'https://static.wixstatic.com/media/118d88_b5a7ebc7b3934e4da2b850fb8dfca0ac~mv2_d_2048_1530_s_2.jpg/v1/fill/w_749,h_561,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/118d88_b5a7ebc7b3934e4da2b850fb8dfca0ac~mv2_d_2048_1530_s_2.jpg'
    },
    {
        pattern: /tower\s*maxi/i,
        label: 'Tower Maxi Table (18 Pax)',
        url: 'https://static.wixstatic.com/media/118d88_63bf6110467e49f39c350229651fd80f~mv2.jpg/v1/fill/w_576,h_576,al_c,q_80,enc_avif,quality_auto/118d88_63bf6110467e49f39c350229651fd80f~mv2.jpg'
    },
    {
        pattern: /ares\s*fold/i,
        label: 'Ares Fold Table (10 Pax)',
        url: 'https://static.wixstatic.com/media/118d88_7753dea440d6421bab71463bcc7985b3~mv2.jpg/v1/fill/w_580,h_580,al_c,q_80,enc_avif,quality_auto/118d88_7753dea440d6421bab71463bcc7985b3~mv2.jpg'
    },
    {
        pattern: /tavoletto/i,
        label: 'Tavoletto Table with Hidden Bed',
        url: 'https://static.wixstatic.com/media/118d88_1a7689808cb54e7598bdb81596778dd8~mv2_d_1732_1299_s_2.jpg/v1/fill/w_644,h_644,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/118d88_1a7689808cb54e7598bdb81596778dd8~mv2_d_1732_1299_s_2.jpg'
    },
    {
        pattern: /4\s*x\s*4/i,
        label: '4x4 Dining Table (14 Pax)',
        url: 'https://static.wixstatic.com/media/118d88_d520c562d762483ca87b6d4e2745fe12~mv2_d_7216_5232_s_4_2.jpg/v1/fill/w_644,h_644,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/118d88_d520c562d762483ca87b6d4e2745fe12~mv2_d_7216_5232_s_4_2.jpg'
    },
    {
        pattern: /geniale/i,
        label: 'Geniale Table (4 Pax)',
        url: 'https://static.wixstatic.com/media/118d88_f5405f9fbfd54c77901de3b071ef1f66~mv2.jpg/v1/fill/w_580,h_580,al_c,q_80,enc_avif,quality_auto/118d88_f5405f9fbfd54c77901de3b071ef1f66~mv2.jpg'
    },
    {
        pattern: /bessy/i,
        label: 'Bessy Table (8 Pax)',
        url: 'https://static.wixstatic.com/media/118d88_b4aae694dd774a2a938dcefaeae6d6ce~mv2.jpg/v1/fill/w_580,h_580,al_c,q_80,enc_avif,quality_auto/118d88_b4aae694dd774a2a938dcefaeae6d6ce~mv2.jpg'
    },

    // Add kitchen / wardrobes the same way once their image links are
    // available.
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