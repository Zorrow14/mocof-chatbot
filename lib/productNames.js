// =============================================================
// FILE: lib/productNames.js
// Canonical MOCOF product names, derived from the knowledge modules, plus a
// conservative normalizer that turns staff shorthand ("murano q") into the
// catalog name ("Murano Queen") for a Stripe invoice line item.
//
// USED BY THE STAFF INVOICE TOOL ONLY. It is the second thing the staff tool
// shares with the customer bot, after lib/gemini.js, and it is safe for the
// same reason: it carries product NAMES and no prices. The staff prompt can
// therefore be handed a catalog to match against while the "never invent an
// amount" rule stays exactly as strict as it was.
//
// THE GOVERNING RULE HERE IS "NEVER GUESS WRONG". A staff tool is used by
// trusted people typing real orders, and an unmatched description
// ("custom cabinetry job") is a perfectly normal thing to invoice for. So
// every rule below is biased toward returning the staff member's own words
// unchanged. Normalization is a nicer default on a form they still review and
// edit — never a validation step, and never a gate.
// =============================================================

import { getWallBedKnowledge, WALLBED_MODEL_PRICING } from '../knowledge/wallbeds.js';
import { getSofaBedKnowledge } from '../knowledge/sofabeds.js';
import { getTableKnowledge } from '../knowledge/tables.js';
import { getWardrobeKnowledge } from '../knowledge/wardrobes.js';
import { getBasicFurnitureKnowledge } from '../knowledge/basicfurniture.js';
import { getBedsheetKnowledge } from '../knowledge/bedsheets.js';

// Same idea as MASTER_PRICE_LIST in api/chat.js: derive from the knowledge
// text rather than keeping a second copy of the catalog that can drift. Adding
// a product to a knowledge module adds it here with no second edit.
const KNOWLEDGE_TEXT = [
    getWallBedKnowledge(),
    getSofaBedKnowledge(),
    getTableKnowledge(),
    getWardrobeKnowledge(),
    getBasicFurnitureKnowledge(),
    getBedsheetKnowledge()
].join('\n');

// Staff shorthand that maps onto a real catalog word. Deliberately tiny: each
// entry is a guess about what someone meant, so it only holds abbreviations
// that are unambiguous within this catalog. "s" is absent on purpose — it
// could be single, sofa, or shelves.
const TOKEN_ALIASES = {
    q: 'queen',
    qn: 'queen',
    k: 'king',
    sgl: 'single',
    bnk: 'bunk'
};

// Words that may be left over after a name matches without changing which
// product it is. "Murano Queen WB" is still a Murano Queen. Anything NOT in
// this list (a colour, a size, "frame", "custom") counts as real information,
// and its presence cancels the rewrite so nothing the staff typed is lost.
const IGNORABLE_LEFTOVERS = new Set([
    'wb', 'wallbed', 'wall', 'bed', 'beds', 'unit', 'units', 'pc', 'pcs'
]);

const MAX_IGNORABLE_LEFTOVERS = 3;

// Title-case keeps these lowercase unless they lead the name, so a heading
// like "TAVOLETTO TABLE WITH HIDDEN BED" reads as a product, not a shout.
const MINOR_WORDS = new Set(['with', 'and', 'the', 'of', 'in', 'for', 'by', 'a', 'an']);

// ...and keeps these fully uppercase, so "ULISSE XL TABLE" does not come out
// as "Ulisse Xl Table". Only needed for the ALL-CAPS heading shape; the
// title-case bullets keep their own capitalisation untouched.
const ACRONYMS = new Set(['xl', 'xxl', 'tv', 'led', 'pdj']);

function tokenize(value) {
    return String(value)
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
        .map(token => TOKEN_ALIASES[token] || token);
}

function titleCase(value) {
    const words = value.toLowerCase().split(/\s+/).filter(Boolean);
    return words
        .map((word, i) => {
            if (ACRONYMS.has(word)) return word.toUpperCase();
            if (i > 0 && MINOR_WORDS.has(word)) return word;
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
}

/**
 * Rejects the things the extraction patterns scrape up that are categories or
 * sentence fragments rather than product names — "1600TC duvet sets",
 * "Giorgina / Sanremo / Raffaello Duvet Cover Sets", and the one bullet in
 * basicfurniture.js that is a cross-reference sentence.
 */
function looksLikeProductName(name) {
    if (name.length < 3 || name.length > 60) return false;
    if (/[/:()]/.test(name)) return false;
    const words = name.split(/\s+/).filter(Boolean);
    if (words.length === 0 || words.length > 6) return false;
    // At least one proper-noun word. A name made only of lowercase category
    // words ("duvet sets") or thread counts ("1600TC duvet sets") is a range
    // heading in the source text, not something to rewrite a line item to.
    return words.some(word => /^[A-Z]/.test(word));
}

function buildCatalog() {
    const byKey = new Map();

    const add = (rawName) => {
        const name = rawName.trim().replace(/\s+/g, ' ');
        if (!looksLikeProductName(name)) return;
        const tokens = tokenize(name);
        if (tokens.length === 0) return;
        const key = tokens.join(' ');
        // The words that actually identify the product. "Gioco Bunk Bed" is
        // identified by "gioco bunk" — someone who types that has named it
        // unambiguously, and demanding the trailing "bed" would reject a
        // perfectly clear shorthand. Falls back to the full token list for a
        // name built entirely from these words, so nothing matches on nothing.
        let required = tokens.filter(token => !IGNORABLE_LEFTOVERS.has(token));
        if (required.length === 0) required = tokens;
        // First writer wins, so the structured wall-bed labels below take
        // precedence over anything scraped from prose for the same product.
        if (!byKey.has(key)) byKey.set(key, { name, tokens, required });
    };

    // The wall-bed labels are already structured and are the names staff
    // abbreviate most, so they go in first.
    for (const model of WALLBED_MODEL_PRICING) add(model.label);

    // "* Murano Queen Sofa (MOST POPULAR...) — ..." / "* Theta Sofa — RM ..."
    for (const m of KNOWLEDGE_TEXT.matchAll(/^\*\s+([^—\-\n(]+?)\s*(?:\([^)]*\))?\s*—/gm)) add(m[1]);
    // "* Murano Queen\n  - Price: RM ..."
    for (const m of KNOWLEDGE_TEXT.matchAll(/^\*\s+([^—\-\n(]+?)\s*(?:\([^)]*\))?\s*\n\s+- Price:/gm)) add(m[1]);
    // "ORZO SINGLE SOFA BED\n- Price: ..." — the only shape that needs
    // title-casing, since the others are already written in title case (and
    // title-casing them would turn "Birch TV Cabinet" into "Birch Tv Cabinet").
    for (const m of KNOWLEDGE_TEXT.matchAll(/^([A-Z0-9][A-Z0-9 /&.x+-]{2,60})\s*(?:\([^)]*\))?\s*(?:—[^\n]*)?\n- Price:/gm)) {
        add(titleCase(m[1]));
    }

    return [...byKey.values()];
}

export const PRODUCT_NAMES = buildCatalog();

/**
 * Best-effort cleanup of one line-item description.
 *
 * Returns the canonical catalog name when the text confidently names exactly
 * one product, and the ORIGINAL STRING unchanged in every other case —
 * no match, an ambiguous match, or leftover words that might carry meaning.
 * It never throws and never returns empty for non-empty input.
 */
export function normalizeProductName(description) {
    if (typeof description !== 'string') return description;

    const typed = tokenize(description);
    if (typed.length === 0) return description;
    const typedSet = new Set(typed);

    let best = null;
    let bestIsTied = false;

    for (const product of PRODUCT_NAMES) {
        if (!product.required.every(token => typedSet.has(token))) continue;

        const own = new Set(product.tokens);
        const leftovers = typed.filter(token => !own.has(token));

        if (product.required.length === 1 && product.tokens.length === 1) {
            // A one-word name ("Zen", "Vine", "Modo") is a common English word
            // often enough that finding it inside a longer description proves
            // nothing. Only an exact match counts.
            if (leftovers.length !== 0) continue;
        } else {
            if (leftovers.length > MAX_IGNORABLE_LEFTOVERS) continue;
            if (!leftovers.every(token => IGNORABLE_LEFTOVERS.has(token))) continue;
        }

        if (!best || product.tokens.length > best.tokens.length) {
            // More matched words means a more specific product: "gioco single
            // desk" resolves to Gioco Single Desk, not Gioco Single.
            best = product;
            bestIsTied = false;
        } else if (product.tokens.length === best.tokens.length && product.name !== best.name) {
            bestIsTied = true;
        }
    }

    // Two products fit equally well — we cannot tell which was meant, so we
    // say nothing rather than pick one.
    if (!best || bestIsTied) return description;
    return best.name;
}

/**
 * The catalog as prompt text, so the model can match against real names
 * instead of inventing a house style. Names only — no prices, ever.
 */
export function buildProductNameReference() {
    if (PRODUCT_NAMES.length === 0) return '';
    return PRODUCT_NAMES.map(product => `- ${product.name}`).join('\n');
}
