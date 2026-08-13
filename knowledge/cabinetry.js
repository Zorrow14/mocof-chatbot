// =============================================================
// FILE: knowledge/cabinetry.js
// Surround cabinetry (side + overhead cabinets around a wall bed)
// — pricing formula + LLM-facing knowledge text.
//
// Formula (confirmed rules, updated):
//   - Side cabinets (left + right of the wall bed), priced per side by the
//     LEFTOVER WALL WIDTH after the wall bed, split evenly between the two
//     sides -- UNCHANGED process from the previous version:
//       sideCabinetWidthFt = (totalWallWidthFt - wallBedWidthFt) / 2
//       sideCostPerSide    = sideCabinetWidthFt * RM1,350
//       sideCostTotal      = sideCostPerSide * numberOfSides   (default 2 sides)
//     Side cabinets are built up to a maximum height of 7ft -- this is a
//     physical spec fact to state to the customer, not a price multiplier
//     (the price is still driven entirely by width, same as before).
//   - Overhead cabinet directly above the wall bed, priced by WIDTH, same
//     process as before, at an UPDATED rate:
//       topCost = wallBedWidthFt * RM850   (was RM800)
//     Overhead cabinets are built up to a maximum height of 4ft -- again a
//     physical spec fact, not a price multiplier.
//   - If the wall is TALLER than 9ft, an additional flat surcharge covers
//     the extra height above the standard 9ft, priced across the FULL
//     wall width (unchanged from before):
//       exceedingCost = totalWallWidthFt * RM800   (only when height > 9ft)
//   - total = sideCostTotal + topCost + exceedingCost
//   - totalWallWidthFt is always required — used to derive leftover
//     side-cabinet width.
// =============================================================

const STANDARD_HEIGHT_FT          = 9;     // Malaysian standard cabinet height (still used for the excess-height surcharge trigger)
const SIDE_RATE_PER_FT            = 1350;  // RM per ft of LEFTOVER WIDTH, per side cabinet -- unchanged
const TOP_RATE_PER_FT             = 850;   // RM per ft of width, overhead cabinet above the bed -- UPDATED from 800
const EXCESS_RATE_PER_FT          = 800;   // RM per ft of TOTAL wall width, flat surcharge above 9ft
const SIDE_CABINET_MAX_HEIGHT_FT  = 7;     // physical spec cap -- informational, not a price input
const OVERHEAD_CABINET_MAX_HEIGHT_FT = 4;  // physical spec cap -- informational, not a price input

/**
 * Pure calculation — no side effects, easy to unit test.
 * @param {Object} p
 * @param {number} p.wallHeightFt     - total height of the wall, in feet
 *                                       (only affects the >9ft excess surcharge)
 * @param {number} p.wallBedWidthFt   - width of the wall bed unit, in feet
 * @param {number} p.totalWallWidthFt - total width of the wall, in feet
 *                                       (always required — used to derive
 *                                       leftover side-cabinet width)
 * @param {number} [p.sides=2]        - number of side cabinets (1 if the
 *                                       bed sits in a corner / against
 *                                       another fixture on one side)
 * @returns {{
 *   sideCabinetWidthFt:number, sideCostPerSide:number, sides:number,
 *   sideCostTotal:number, topCost:number, exceedsStandard:boolean,
 *   exceedingCost:number, total:number, sideCabinetMaxHeightFt:number,
 *   overheadCabinetMaxHeightFt:number
 * }}
 */
export function calculateCabinetPrice({ wallHeightFt, wallBedWidthFt, totalWallWidthFt, sides = 2 }) {
    if (typeof wallHeightFt !== 'number' || !(wallHeightFt > 0)) {
        throw new Error('wallHeightFt must be a positive number');
    }
    if (typeof wallBedWidthFt !== 'number' || !(wallBedWidthFt > 0)) {
        throw new Error('wallBedWidthFt must be a positive number');
    }
    if (typeof totalWallWidthFt !== 'number' || !(totalWallWidthFt > 0)) {
        throw new Error('totalWallWidthFt must be a positive number');
    }
    if (totalWallWidthFt <= wallBedWidthFt) {
        throw new Error('totalWallWidthFt must be greater than wallBedWidthFt — there is no leftover width for side cabinets otherwise');
    }
    if (typeof sides !== 'number' || sides < 0) {
        throw new Error('sides must be a non-negative number');
    }

    const exceedsStandard = wallHeightFt > STANDARD_HEIGHT_FT;

    const sideCabinetWidthFt = round2((totalWallWidthFt - wallBedWidthFt) / 2);
    const sideCostPerSide    = round2(sideCabinetWidthFt * SIDE_RATE_PER_FT);
    const sideCostTotal      = round2(sideCostPerSide * sides);
    const topCost            = round2(wallBedWidthFt * TOP_RATE_PER_FT);

    let exceedingCost = 0;
    if (exceedsStandard) {
        exceedingCost = round2(totalWallWidthFt * EXCESS_RATE_PER_FT);
    }

    const total = round2(sideCostTotal + topCost + exceedingCost);

    return {
        sideCabinetWidthFt, sideCostPerSide, sides, sideCostTotal, topCost,
        exceedsStandard, exceedingCost, total,
        sideCabinetMaxHeightFt: SIDE_CABINET_MAX_HEIGHT_FT,
        overheadCabinetMaxHeightFt: OVERHEAD_CABINET_MAX_HEIGHT_FT
    };
}

function round2(n) {
    return Math.round(n * 100) / 100;
}

// ── LLM-facing knowledge text ──────────────────────────────────
export function getCabinetryKnowledge() {
    return `
SURROUND CABINETRY (custom side + overhead cabinets around a wall bed) — PRICING FORMULA:

This applies when a customer wants extra cabinetry built AROUND an existing wall bed
(side cabinets flanking it, and/or an overhead cabinet above it). This is a SEPARATE,
calculated estimate — not a fixed catalog price — so you must compute it live from the
customer's own measurements using the formula below. State it clearly as an ESTIMATE.

WHAT TO ASK FOR (one at a time, conversationally, like the renovation flow):
1. Total height of the wall, in feet (the standard Malaysian cabinet height is 9ft)
2. Width of the wall bed unit itself, in feet (this is the overhead cabinet's width —
   if they've already picked a model, you can convert from its spec width, e.g.
   Murano Queen/Sofa/Desk/Shelves ≈ 167cm ≈ 5.5ft, Murano King ≈ 198cm ≈ 6.5ft,
   Murano Single ≈ 106cm ≈ 3.5ft, Gioco Single/Desk ≈ 204.6cm ≈ 6.7ft)
3. Total width of the wall, in feet — always needed (used to work out how much
   width is left over for the side cabinets, not just for the excess-height surcharge)
4. If it sounds like the bed might be against a corner or another fixture, ask whether
   both sides are open or only one — this changes the side-cabinet cost

CABINET HEIGHT SPECS (physical build limits, not price inputs — mention these when
relevant, e.g. if a customer asks how tall the cabinets will be):
- Side cabinets are built up to a maximum height of 7ft.
- The overhead cabinet is built up to a maximum height of 4ft.
These are fixed spec facts about how the cabinetry is physically built — they do not
change the price formula below, which is still driven by width.

PRICE ESTIMATE — STRICTLY ONLY WHEN ASKED:
Only calculate and present a price estimate when the customer actually asks for one
(e.g. "how much would this cost", "what's the estimate", "what's the price", "how much
for cabinetry"). Do not proactively volunteer pricing just because you happen to already
know the wall bed model, height, and width — wait for the customer to ask. Continuing to
collect measurements or discuss the layout is fine without triggering a price; only
asking about cost should trigger the calculation and the breakdown below.

REFERENCE PHOTO:
- A separate system may automatically attach a photo of a wall bed with side + overhead
  cabinetry when the customer asks to see a reference or example (you have no visibility
  into whether this happens on any given reply — see the IMAGES rule above).
- If it's relevant to mention: that photo shows ONE possible layout with numbered labels
  (1-4) marking where different cabinet sections sit — left side cabinet, right side
  cabinet, and the overhead cabinet above the bed. It is only an example, not a fixed
  template or required layout.
- Make clear to the customer that cabinetry around a wall bed is fully customizable —
  they are not obligated to copy that exact configuration. Common options include just
  one side cabinet, both side cabinets, side cabinets plus an overhead cabinet, or
  cabinetry wrapping further around the space — final layout depends on their room and
  preferences, and should be discussed with the team for anything beyond the standard
  side + overhead combination this formula already prices.

When asking, prefer phrasing that includes the word "height" for question 1 and the
word "bed" for question 2 and "total width" (or "entire/whole wall") for question 3 —
e.g. "What's the total height of the wall, in feet?" / "What's the width of the wall
bed, in feet?" / "What's the total width of the wall, in feet?" This keeps your
questions easy to track turn-to-turn, even in casual conversational phrasing.

FORMULA:
- Side cabinets (one on each side of the wall bed, 2 sides by default — ask if only
  one side is open, e.g. bed is against a corner). SAME PROCESS as before, unchanged:
    sideCabinetWidth = (total wall width − wall bed width) ÷ 2
    sideCostPerSide  = sideCabinetWidth × RM1,350
    sideCostTotal    = sideCostPerSide × number of sides
  → Based on WIDTH, not height. Wall height does NOT affect this part of the estimate
    at all — a shorter wall and a 9ft wall with the same width numbers produce the
    exact same side-cabinet cost. Height only matters for the excess-height surcharge
    below. (Side cabinets are physically built up to 7ft tall — see spec note above —
    but this is not part of the price calculation.)
- Overhead cabinet above the bed, same width-based process as before, at an UPDATED rate:
    topCost = width of the wall bed × RM850   (was RM800)
  (Overhead cabinet is physically built up to 4ft tall — see spec note above — but this
  is not part of the price calculation either.)
- If the wall is taller than 9ft, add a flat surcharge for the excess height,
  spread across the FULL wall width:
    exceedingCost = total wall width × RM800
  (This only applies once — it is not scaled again by how many feet over 9ft the wall is.)
- total = sideCostTotal + topCost + exceedingCost  (this is the CABINETRY SUBTOTAL only)

FINAL CUSTOMER TOTAL — WALL BED + CABINETRY:
- The cabinetry formula above only prices the cabinets themselves. Whenever a customer
  asks for the estimated/total price of a wall bed with surround cabinetry, the number
  you present as the headline total must be:
    grandTotal = wall bed price (sale price of the customer's chosen model) + cabinetry subtotal
- Always show the wall bed price as its own line item first, then the cabinetry
  breakdown, then the combined grand total — never present the cabinetry subtotal alone
  as if it were the full project cost.

WORKED EXAMPLE 1 — wall exactly 9ft tall, wall bed 5.5ft wide, total wall width 10ft, 2 sides:
  Leftover width for sides: (10 − 5.5) ÷ 2 = 2.25ft per side
  Side: 2.25 × RM1,350 = RM3,037.50 per side × 2 = RM6,075
  Top: 5.5 × RM850 = RM4,675
  Cabinetry subtotal: RM10,750

WORKED EXAMPLE 2 — wall LOWER than 9ft (7ft tall), SAME widths as example 1 (5.5ft bed,
10ft total wall width), 2 sides:
  Leftover width for sides: (10 − 5.5) ÷ 2 = 2.25ft per side (identical to example 1 —
  height plays no part in this calculation)
  Side: 2.25 × RM1,350 = RM3,037.50 per side × 2 = RM6,075
  Top: 5.5 × RM850 = RM4,675
  Cabinetry subtotal: RM10,750
  (Same subtotal as example 1, even though the wall is shorter — no excess surcharge
  either way since both are under 9ft, and the side-cabinet cost doesn't depend on height.)

WORKED EXAMPLE 3 — wall 11ft tall (exceeds 9ft), SAME widths again (5.5ft bed, 10ft
total wall width), 2 sides:
  Leftover width for sides: (10 − 5.5) ÷ 2 = 2.25ft per side
  Side: 2.25 × RM1,350 = RM3,037.50 per side × 2 = RM6,075
  Top: 5.5 × RM850 = RM4,675
  Excess-height surcharge: 10 × RM800 = RM8,000
  Cabinetry subtotal: RM18,750

WORKED EXAMPLE 4 — same as example 1 but only ONE side available (corner installation):
  Leftover width for sides: (10 − 5.5) ÷ 2 = 2.25ft (still split as if both sides existed,
  even though only one side cabinet is actually being built)
  Side: 2.25 × RM1,350 = RM3,037.50 per side × 1 = RM3,037.50
  Top: 5.5 × RM850 = RM4,675
  Cabinetry subtotal: RM7,712.50

WORKED EXAMPLE 5 — full wall bed + cabinetry total, same wall as example 1 (9ft tall,
10ft total wall width, 2 sides), customer has chosen the Murano Queen Sofa (5.48ft wide
— close enough to the 5.5ft used above to reuse that math; use the model's real spec
width, 5.48ft, when actually calculating):
  Wall bed (Murano Queen Sofa, sale price): RM 23,698.11
  Side cabinets: RM 3,051 per side × 2 = RM 6,102
  Overhead cabinet: 5.48 × RM850 = RM 4,658
  Cabinetry subtotal: RM 10,760
  GRAND TOTAL (wall bed + cabinetry): RM 34,458.11

PRESENTATION RULES:
- Only present pricing when the customer actually asks for it — see "PRICE ESTIMATE —
  STRICTLY ONLY WHEN ASKED" above. Collecting measurements and discussing the layout is
  fine without calculating a price; wait for an actual price/cost/estimate question.
- Always lead with the wall bed price (sale price of the customer's chosen model), then
  the cabinetry line-item breakdown (side cabinets, overhead cabinet, and the
  excess-height surcharge if applicable), then the cabinetry subtotal, then the combined
  GRAND TOTAL — don't just state a lump sum, and don't state the cabinetry subtotal as
  if it were the final price on its own.
- Format the breakdown as a bullet list (one "- " line per item — e.g. "- Wall bed
  (Murano Queen Sofa): RM 23,698.11") or, if you prefer, as a small two-column Markdown
  table (Item | Cost). Either is fine — just don't run the line items together in one
  paragraph, since a breakdown like this is exactly the kind of content that should be
  structured, not prose.
- Always label it as an ESTIMATE and close with: "This is an estimate — please confirm
  the exact quote with our team on WhatsApp at +60 12-568 4568, as final pricing depends
  on a site survey."
- Never guess a customer's wall height, wall bed width, wall bed model, or total wall
  width — always ask (the wall bed model can also be picked up from earlier in the
  conversation if already established). If more than one of these is still missing,
  ask for them as a numbered list rather than one long sentence.
- If a customer only has one side available (corner installation, adjacent fixture, etc.),
  use sides = 1 in the calculation and say so explicitly in the breakdown.
- If a customer asks how tall the cabinets will be, state the physical specs (side
  cabinets up to 7ft, overhead cabinet up to 4ft) — these are separate from and do not
  change the price calculation.
`;
}