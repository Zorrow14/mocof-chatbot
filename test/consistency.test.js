// =============================================================
// FILE: test/consistency.test.js
// Run with: npm run test:consistency  (or: node --test test/consistency.test.js)
//
// These are NOT general unit tests of "does the app work" — they exist to
// catch DRIFT: places where two things that must agree (a hardcoded prompt
// price vs. the knowledge table, a worked-example in a comment vs. what the
// formula actually computes, a pricing table vs. a width table) are edited
// independently and silently fall out of sync. Every case here was chosen
// because api/chat.js's own comments explicitly worry about it (see the
// "Glint Table incident", the price-guardrail rationale, and the
// single-source-of-truth notes in knowledge/wallbeds.js).
// =============================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
    getRelevantKnowledge,
    getCabinetryEstimateFromContext,
    computeCabinetryAllowedAmounts,
    hasCabinetryPriceIntent,
    findHallucinatedPrices,
    isKnownAmount,
    MASTER_PRICE_LIST,
    KNOWLEDGE_MODULES,
    BASIC_FURNITURE_COMPANION_KEYS
} from '../api/chat.js';

import { calculateCabinetPrice, getCabinetryKnowledge } from '../knowledge/cabinetry.js';
import { getWallBedKnowledge, WALLBED_MODEL_WIDTHS_FT, WALLBED_MODEL_PRICING } from '../knowledge/wallbeds.js';
import { getSofaBedKnowledge } from '../knowledge/sofabeds.js';
import { getTableKnowledge } from '../knowledge/tables.js';
import { getKitchenKnowledge } from '../knowledge/kitchen.js';
import { getWardrobeKnowledge } from '../knowledge/wardrobes.js';
import { getShowroomKnowledge } from '../knowledge/showroom.js';
import { getWarrantyKnowledge } from '../knowledge/warranty.js';
import { getRenovationKnowledge } from '../knowledge/renovation.js';
import { getBasicFurnitureKnowledge } from '../knowledge/basicfurniture.js';
import { PRODUCT_IMAGES, getRelevantImages } from '../knowledge/productImages.js';

function round2(n) {
    return Math.round(n * 100) / 100;
}

// ── KNOWLEDGE_MODULES registry ──────────────────────────────
describe('KNOWLEDGE_MODULES registry', () => {
    test('every key is unique', () => {
        const keys = KNOWLEDGE_MODULES.map(m => m.key);
        assert.equal(new Set(keys).size, keys.length, `duplicate keys found: ${keys}`);
    });

    test('every module fn() returns a non-empty string', () => {
        for (const m of KNOWLEDGE_MODULES) {
            const text = m.fn();
            assert.equal(typeof text, 'string', `${m.key}.fn() did not return a string`);
            assert.ok(text.trim().length > 0, `${m.key}.fn() returned an empty string`);
        }
    });

    test('every BASIC_FURNITURE_COMPANION_KEYS entry is a real KNOWLEDGE_MODULES key', () => {
        const validKeys = new Set(KNOWLEDGE_MODULES.map(m => m.key));
        for (const key of BASIC_FURNITURE_COMPANION_KEYS) {
            assert.ok(validKeys.has(key), `companion key "${key}" does not exist in KNOWLEDGE_MODULES`);
        }
    });

    test('"basicFurniture" itself is a registered module key', () => {
        assert.ok(KNOWLEDGE_MODULES.some(m => m.key === 'basicFurniture'));
    });
});

// ── getRelevantKnowledge routing ────────────────────────────
// Module inclusion is checked by exact full-text substring match (not a
// short header string) because several knowledge files legitimately
// cross-reference each other's headings in prose (e.g. wallbeds.js tells
// the model "see WARDROBE & STORAGE SOLUTIONS instead" inside its OWN
// text). A short marker would false-positive on that mention even when
// the wardrobe module itself was never selected — the full returned
// string is concatenated verbatim only when a module is actually chosen.
describe('getRelevantKnowledge routing', () => {
    test('no keyword match falls back to wall bed + showroom knowledge, unmodified', () => {
        const text = getRelevantKnowledge('hello there', []);
        assert.equal(text, getWallBedKnowledge() + getShowroomKnowledge());
    });

    test('a single obvious match includes that module plus its basicFurniture companion', () => {
        const text = getRelevantKnowledge('Tell me about your wall bed products.', []);
        assert.ok(text.includes(getWallBedKnowledge()), 'wallbed knowledge missing');
        assert.ok(text.includes(getBasicFurnitureKnowledge()), 'basicFurniture companion missing for wallbed');
    });

    test('a message with no companion-category match does NOT pull in basicFurniture', () => {
        const text = getRelevantKnowledge('Where are your showrooms and opening hours?', []);
        assert.ok(text.includes(getShowroomKnowledge()));
        assert.ok(!text.includes(getBasicFurnitureKnowledge()), 'basicFurniture should not appear for a showroom-only query');
    });

    test('MAX_KNOWLEDGE_MODULES cap keeps only the first 3 array-order matches, plus an uncapped basicFurniture companion', () => {
        // Matches (in KNOWLEDGE_MODULES array order): wallbed, table, kitchen,
        // wardrobe, renovation, basicFurniture (6 total) — more than the cap.
        const msg = "I'm doing a home renovation and need a wardrobe, wall bed, and dining table for my kitchen.";
        const text = getRelevantKnowledge(msg, []);

        // Survive the cap (first 3 in KNOWLEDGE_MODULES array order):
        assert.ok(text.includes(getWallBedKnowledge()), 'wallbed should survive the cap (1st match)');
        assert.ok(text.includes(getTableKnowledge()), 'table should survive the cap (2nd match)');
        assert.ok(text.includes(getKitchenKnowledge()), 'kitchen should survive the cap (3rd match)');
        // basicFurniture rides along uncapped because wallbed/table/kitchen are all companion keys:
        assert.ok(text.includes(getBasicFurnitureKnowledge()), 'basicFurniture companion should always ride along');

        // Cut by the cap (matched, but ranked 4th/5th and NOT a companion carve-out):
        assert.ok(!text.includes(getWardrobeKnowledge()), 'wardrobe should be cut by the cap');
        assert.ok(!text.includes(getRenovationKnowledge()), 'renovation should be cut by the cap');
    });

    test('a follow-up with no keywords of its own still pulls knowledge from recent history', () => {
        const history = [
            { role: 'user', content: 'Tell me about your sofa beds' },
            { role: 'assistant', content: 'We have the Orzo Single and Orzo Hori...' }
        ];
        const text = getRelevantKnowledge('what is the price of that?', history);
        assert.ok(text.includes(getSofaBedKnowledge()), 'history-only match should still surface sofabed knowledge');
    });
});

// ── Wall bed width / pricing table cross-consistency ────────
// wallbeds.js explicitly documents these two tables as needing to stay in
// sync (WALLBED_MODEL_PRICING is "intentionally MORE granular than
// WALLBED_MODEL_WIDTHS_FT"), and both feed the cabinetry calculator from
// two different lookup functions (extractSelectedWallBedModel vs.
// extractSelectedWallBedPricing) — if a new model is added to one table
// and not the other, the combined wall-bed-price + cabinetry estimate
// silently breaks for that model.
describe('wall bed width/pricing table consistency', () => {
    test('every WALLBED_MODEL_PRICING label matches at least one WALLBED_MODEL_WIDTHS_FT pattern', () => {
        for (const priced of WALLBED_MODEL_PRICING) {
            const text = priced.label.toLowerCase();
            const matched = WALLBED_MODEL_WIDTHS_FT.some(w => w.pattern.test(text));
            assert.ok(matched, `"${priced.label}" has no matching width entry in WALLBED_MODEL_WIDTHS_FT`);
        }
    });

    test('every WALLBED_MODEL_PRICING entry has sale <= retail', () => {
        for (const p of WALLBED_MODEL_PRICING) {
            assert.ok(p.sale <= p.retail, `${p.label}: sale (${p.sale}) should not exceed retail (${p.retail})`);
        }
    });

    test('no duplicate labels in WALLBED_MODEL_PRICING', () => {
        const labels = WALLBED_MODEL_PRICING.map(p => p.label);
        assert.equal(new Set(labels).size, labels.length, `duplicate labels: ${labels}`);
    });

    test('every WALLBED_MODEL_PRICING price appears in the system-prompt price guardrail\'s MASTER_PRICE_LIST', () => {
        for (const p of WALLBED_MODEL_PRICING) {
            assert.ok(isKnownAmount(p.sale, []), `${p.label} sale price ${p.sale} not recognized by the price guardrail`);
            assert.ok(isKnownAmount(p.retail, []), `${p.label} retail price ${p.retail} not recognized by the price guardrail`);
        }
    });
});

// ── System-prompt hardcoded prices vs. the knowledge table ──
// buildSystemPrompt() (not exported — it's the actual LLM-facing prompt
// text) hardcodes "Study room → Gioco Single with Desk (RM 17,538.11 sale)"
// and "Living room → Murano Queen with Sofa (RM 23,698.11 sale)" under
// PRODUCT RECOMMENDATION RULES. Those literal figures were copied from
// WALLBED_MODEL_PRICING at the time the prompt was written; nothing
// enforces they stay equal if the catalog price changes later. This test
// is the tripwire for that specific drift.
describe('system-prompt product-recommendation prices vs. catalog', () => {
    const promptClaims = [
        { label: 'Gioco Single Desk', promptSale: 17538.11 },
        { label: 'Murano Queen Sofa', promptSale: 23698.11 }
    ];

    for (const claim of promptClaims) {
        test(`"${claim.label}" price quoted in PRODUCT RECOMMENDATION RULES matches WALLBED_MODEL_PRICING`, () => {
            const catalogEntry = WALLBED_MODEL_PRICING.find(p => p.label === claim.label);
            assert.ok(catalogEntry, `${claim.label} no longer exists in WALLBED_MODEL_PRICING`);
            assert.equal(
                catalogEntry.sale,
                claim.promptSale,
                `system prompt says RM ${claim.promptSale} for ${claim.label}, but the catalog now says RM ${catalogEntry.sale} — update buildSystemPrompt()'s PRODUCT RECOMMENDATION RULES text`
            );
        });
    }
});

// ── Cabinetry formula vs. its own documented worked examples ──
// getCabinetryKnowledge() (the LLM-facing prompt text) contains 4 worked
// examples with numbers written out in prose. calculateCabinetPrice() is
// the actual formula. Nothing keeps the prose in sync with the code if
// SIDE_RATE_PER_FT / TOP_RATE_PER_FT / the height caps ever change — a
// silent mismatch there would mean the model is being shown a stale
// worked example that contradicts what the server will actually compute
// and quote to the customer.
describe('cabinetry formula matches its own worked examples', () => {
    test('worked example 1 — 11ft wall, 5.5ft bed, 10ft total width, 2 sides', () => {
        const r = calculateCabinetPrice({ wallHeightFt: 11, wallBedWidthFt: 5.5, totalWallWidthFt: 10, sides: 2 });
        assert.equal(r.sideCabinetWidthFt, 2.25);
        assert.equal(r.sideCostPerSide, 3037.50);
        assert.equal(r.sideCostTotal, 6075);
        assert.equal(r.topCost, 8500);
        assert.equal(r.total, 14575);
        assert.equal(r.overheadCabinetHeightFt, 4);
    });

    test('worked example 2 — 9ft wall (same widths as example 1): same price, shorter overhead cabinet', () => {
        const r = calculateCabinetPrice({ wallHeightFt: 9, wallBedWidthFt: 5.5, totalWallWidthFt: 10, sides: 2 });
        assert.equal(r.total, 14575, 'wall height must not affect price');
        assert.equal(r.overheadCabinetHeightFt, 2, '9ft wall - 7ft fixed side height = 2ft overhead cabinet');
    });

    test('worked example 3 — same as example 1 but only 1 side (corner installation)', () => {
        const r = calculateCabinetPrice({ wallHeightFt: 11, wallBedWidthFt: 5.5, totalWallWidthFt: 10, sides: 1 });
        assert.equal(r.sideCostTotal, 3037.50);
        assert.equal(r.total, 11537.50);
    });

    test('worked example 4 — full wall bed + cabinetry grand total for Murano Queen Sofa', () => {
        const r = calculateCabinetPrice({ wallHeightFt: 11, wallBedWidthFt: 5.48, totalWallWidthFt: 10, sides: 2 });
        assert.equal(r.sideCostPerSide, 3051);
        assert.equal(r.sideCostTotal, 6102);
        assert.equal(r.topCost, 8500);
        assert.equal(r.total, 14602);

        const wallBed = WALLBED_MODEL_PRICING.find(p => p.label === 'Murano Queen Sofa');
        assert.ok(wallBed, 'Murano Queen Sofa missing from WALLBED_MODEL_PRICING');
        const grandTotal = round2(wallBed.sale + r.total);
        assert.equal(grandTotal, 38300.11);
    });

    test('a taller wall never costs more (price is width-driven only)', () => {
        const short = calculateCabinetPrice({ wallHeightFt: 8, wallBedWidthFt: 5.48, totalWallWidthFt: 10, sides: 2 });
        const tall = calculateCabinetPrice({ wallHeightFt: 14, wallBedWidthFt: 5.48, totalWallWidthFt: 10, sides: 2 });
        assert.equal(short.total, tall.total);
    });

    test('rejects a total wall width that leaves no room for side cabinets', () => {
        assert.throws(() => calculateCabinetPrice({ wallHeightFt: 11, wallBedWidthFt: 5.5, totalWallWidthFt: 5.5 }));
    });
});

// ── End-to-end cabinetry extraction -> pricing -> guardrail chain ──
// Exercises the full pipeline the way a real conversation would hit it:
// customer names a model, answers height/width one at a time (including a
// BARE number reply with no context words, which relies on turn-aware
// inference from the assistant's preceding question), and the resulting
// live estimate must (a) match the formula exactly and (b) be recognized
// by the price guardrail so a correct reply is never falsely blocked.
describe('cabinetry context extraction -> pricing -> price guardrail chain', () => {
    const history = [
        { role: 'user', content: 'I want a Murano Queen Sofa with side cabinets around it, how much in total?' },
        { role: 'assistant', content: 'Sure! What is the total height of the wall, in feet?' },
        { role: 'user', content: '11ft' },
        { role: 'assistant', content: 'Got it. What is the total width of the wall, in feet?' }
    ];
    const message = '10ft';

    test('extracts model + dimensions and computes the same grand total as worked example 4', () => {
        const est = getCabinetryEstimateFromContext(message, history);
        assert.ok(est, 'expected a resolved cabinetry estimate');
        assert.equal(est.heightFt, 11);
        assert.equal(est.totalWidthFt, 10);
        assert.equal(est.wallBedModelLabel, 'Murano Queen Sofa');
        assert.equal(est.total, 14602);
        assert.equal(est.grandTotal, 38300.11);
    });

    test('price intent is detected even though it was asked several turns before the final measurement', () => {
        assert.equal(hasCabinetryPriceIntent(message, history), true);
    });

    test('a correctly-computed grand total reply is never flagged as hallucinated', () => {
        const allowed = computeCabinetryAllowedAmounts(message, history);
        const reply =
            'Wall bed (Murano Queen Sofa): RM 23,698.11. ' +
            'Side cabinets: RM 3,051.00 per side x 2 = RM 6,102.00. ' +
            'Overhead cabinet: RM 8,500.00. ' +
            'Cabinetry subtotal: RM 14,602.00. ' +
            'GRAND TOTAL: RM 38,300.11';
        assert.deepEqual(findHallucinatedPrices(reply, message, allowed), []);
    });

    test('an arithmetically wrong grand total for this SAME context is still caught', () => {
        const allowed = computeCabinetryAllowedAmounts(message, history);
        const wrongReply = 'GRAND TOTAL (wall bed + cabinetry): RM 38,273.11';
        const bad = findHallucinatedPrices(wrongReply, message, allowed);
        assert.deepEqual(bad, ['38273.11']);
    });
});

// ── Price hallucination guardrail ───────────────────────────
describe('price guardrail (findHallucinatedPrices / isKnownAmount)', () => {
    test('MASTER_PRICE_LIST is non-empty', () => {
        assert.ok(MASTER_PRICE_LIST.length > 0);
    });

    test('every real catalog price, individually, is recognized as known', () => {
        for (const val of MASTER_PRICE_LIST) {
            assert.ok(isKnownAmount(val, []), `catalog price RM ${val} is not self-recognized by isKnownAmount`);
        }
    });

    test('a reply that only quotes real catalog prices has zero flagged amounts', () => {
        const samplePrices = MASTER_PRICE_LIST.slice(0, 5);
        const reply = samplePrices.map(v => `RM ${v.toFixed(2)}`).join(', ');
        assert.deepEqual(findHallucinatedPrices(reply, '', []), []);
    });

    test('an invented price far from any real value is flagged', () => {
        const bad = findHallucinatedPrices('That would be RM 88,888.88 in total.', '', []);
        assert.deepEqual(bad, ['88888.88']);
    });

    test('a customer echoing their own stated budget is never flagged, even if not a catalog price', () => {
        const userMessage = 'My budget is RM 45,000';
        const reply = 'Great, RM 45,000 should comfortably cover a Murano Queen Sofa setup.';
        assert.deepEqual(findHallucinatedPrices(reply, userMessage, []), []);
    });

    test('rounding within the RM2 tolerance is not treated as hallucination', () => {
        const realPrice = WALLBED_MODEL_PRICING[0].sale;
        const roundedReply = `The price is RM ${Math.round(realPrice)}.`;
        assert.deepEqual(findHallucinatedPrices(roundedReply, '', []), []);
    });
});

// ── Product image coverage ──────────────────────────────────
// productImages.js explicitly models itself on the pattern used by
// WALLBED_MODEL_WIDTHS_FT ("real image URLs, matched in code, never left
// to the model to invent") — this checks that promise actually holds for
// every priced wall bed model, i.e. no model can be quoted a price by the
// system prompt while having zero matching product photo.
describe('product image coverage', () => {
    test('every PRODUCT_IMAGES entry has a non-empty label and url', () => {
        for (const entry of PRODUCT_IMAGES) {
            assert.ok(entry.label && entry.label.trim().length > 0, 'entry missing a label');
            assert.ok(entry.url && entry.url.trim().length > 0, `"${entry.label}" is missing a url`);
        }
    });

    test('every priced wall bed model matches at least one PRODUCT_IMAGES entry', () => {
        for (const priced of WALLBED_MODEL_PRICING) {
            const text = priced.label.toLowerCase();
            const matched = PRODUCT_IMAGES.some(img => img.pattern.test(text));
            assert.ok(matched, `"${priced.label}" has no matching entry in PRODUCT_IMAGES`);
        }
    });

    test('getRelevantImages returns at most 2 images for a message matching many products', () => {
        const images = getRelevantImages('show me the murano queen sofa and the gioco bunk bed and the erga wardrobe', []);
        assert.ok(images.length <= 2, `expected at most 2 images, got ${images.length}`);
    });

    test('a bare measurement reply (answering a dimension question) does not attach a product photo', () => {
        // Guards the specific bug this logic calls out: "Murano Queen, and the
        // wall is 8ft high" should not attach a photo just because a model name
        // and a number happen to appear in the same message.
        const images = getRelevantImages('Murano Queen, and the wall is 8ft high', []);
        assert.deepEqual(images, []);
    });
});

// ── Knowledge text sanity (catches accidental truncation / paste errors) ──
describe('knowledge module content sanity', () => {
    const modules = [
        ['wallbeds', getWallBedKnowledge()],
        ['sofabeds', getSofaBedKnowledge()],
        ['tables', getTableKnowledge()],
        ['kitchen', getKitchenKnowledge()],
        ['wardrobes', getWardrobeKnowledge()],
        ['showroom', getShowroomKnowledge()],
        ['warranty', getWarrantyKnowledge()],
        ['renovation', getRenovationKnowledge()],
        ['basicfurniture', getBasicFurnitureKnowledge()],
        ['cabinetry', getCabinetryKnowledge()]
    ];

    for (const [name, text] of modules) {
        test(`${name}.js knowledge text is non-trivial and has no unresolved template markers`, () => {
            assert.ok(text.length > 50, `${name} knowledge text looks too short (${text.length} chars)`);
            assert.ok(!/undefined|\[object Object\]|NaN/.test(text), `${name} knowledge text contains a stray runtime artifact`);
        });
    }
});