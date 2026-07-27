// =============================================================
// FILE: knowledge/cabinetry.js
// Surround cabinetry (side + overhead cabinets around a wall bed)
// — pricing formula + LLM-facing knowledge text.
//
// Formula (confirmed rules):
//   - Side cabinets (left + right of the wall bed), priced per side by HEIGHT:
//       sideCostPerSide = min(wallHeightFt, 9) * RM1,350
//       sideCostTotal   = sideCostPerSide * numberOfSides   (default 2 sides)
//     Height is capped at 9ft (the Malaysian standard cabinet height) —
//     going taller does NOT increase the per-side rate.
//   - Overhead cabinet directly above the wall bed, priced by WIDTH:
//       topCost = wallBedWidthFt * RM800
//   - If the wall is TALLER than 9ft, an additional flat surcharge covers
//     the extra height above the standard 9ft, priced across the FULL
//     wall width (not just the bed width):
//       exceedingCost = totalWallWidthFt * RM800   (only when height > 9ft)
//   - total = sideCostTotal + topCost + exceedingCost
// =============================================================

const STANDARD_HEIGHT_FT = 9;      // Malaysian standard cabinet height
const SIDE_RATE_PER_FT   = 1350;   // RM per ft of height, per side cabinet
const TOP_RATE_PER_FT    = 800;    // RM per ft of width, overhead cabinet above the bed
const EXCESS_RATE_PER_FT = 800;    // RM per ft of TOTAL wall width, flat surcharge above 9ft

/**
 * Pure calculation — no side effects, easy to unit test.
 * @param {Object} p
 * @param {number} p.wallHeightFt      - total height of the wall, in feet
 * @param {number} p.wallBedWidthFt    - width of the wall bed unit, in feet
 * @param {number} [p.totalWallWidthFt] - total width of the wall, in feet
 *                                        (REQUIRED only if wallHeightFt > 9)
 * @param {number} [p.sides=2]         - number of side cabinets (1 if the
 *                                        bed sits in a corner / against
 *                                        another fixture on one side)
 * @returns {{
 *   sideHeightUsedFt:number, sideCostPerSide:number, sides:number,
 *   sideCostTotal:number, topCost:number, exceedsStandard:boolean,
 *   exceedingCost:number, total:number
 * }}
 */
export function calculateCabinetPrice({ wallHeightFt, wallBedWidthFt, totalWallWidthFt, sides = 2 }) {
    if (typeof wallHeightFt !== 'number' || !(wallHeightFt > 0)) {
        throw new Error('wallHeightFt must be a positive number');
    }
    if (typeof wallBedWidthFt !== 'number' || !(wallBedWidthFt > 0)) {
        throw new Error('wallBedWidthFt must be a positive number');
    }
    if (typeof sides !== 'number' || sides < 0) {
        throw new Error('sides must be a non-negative number');
    }

    const exceedsStandard = wallHeightFt > STANDARD_HEIGHT_FT;
    // Confirmed rule: side-cabinet height is CAPPED at 9ft. Anything taller
    // is handled entirely by the exceedingCost surcharge below — it is not
    // folded into the per-side height rate, to avoid double-charging.
    const sideHeightUsedFt = exceedsStandard ? STANDARD_HEIGHT_FT : wallHeightFt;

    const sideCostPerSide = round2(sideHeightUsedFt * SIDE_RATE_PER_FT);
    const sideCostTotal   = round2(sideCostPerSide * sides);
    const topCost         = round2(wallBedWidthFt * TOP_RATE_PER_FT);

    let exceedingCost = 0;
    if (exceedsStandard) {
        if (typeof totalWallWidthFt !== 'number' || !(totalWallWidthFt > 0)) {
            throw new Error('totalWallWidthFt is required when wallHeightFt exceeds 9ft');
        }
        exceedingCost = round2(totalWallWidthFt * EXCESS_RATE_PER_FT);
    }

    const total = round2(sideCostTotal + topCost + exceedingCost);

    return { sideHeightUsedFt, sideCostPerSide, sides, sideCostTotal, topCost, exceedsStandard, exceedingCost, total };
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
3. Total width of the wall, in feet — ONLY needed if the wall height is above 9ft

FORMULA:
- Side cabinets (one on each side of the wall bed, 2 sides by default — ask if only
  one side is open, e.g. bed is against a corner):
    sideCostPerSide = min(wall height, 9ft) × RM1,350
    sideCostTotal   = sideCostPerSide × number of sides
  → Height is capped at 9ft for this rate. Going taller does not raise this rate —
    it's handled by the surcharge below instead.
- Overhead cabinet above the bed:
    topCost = width of the wall bed × RM800
- If the wall is taller than 9ft, add a flat surcharge for the excess height,
  spread across the FULL wall width:
    exceedingCost = total wall width × RM800
  (This only applies once — it is not scaled again by how many feet over 9ft the wall is.)
- total = sideCostTotal + topCost + exceedingCost

WORKED EXAMPLE 1 — wall exactly 9ft tall, wall bed 5.5ft wide, 2 sides:
  Side: 9 × RM1,350 = RM12,150 per side × 2 = RM24,300
  Top: 5.5 × RM800 = RM4,400
  Total estimate: RM28,700

WORKED EXAMPLE 2 — wall LOWER than 9ft (7ft tall), wall bed 5.5ft wide, 2 sides:
  Side: 7 × RM1,350 = RM9,450 per side × 2 = RM18,900
  Top: 5.5 × RM800 = RM4,400
  Total estimate: RM23,300
  (No excess surcharge — the surcharge only applies when the wall is TALLER than 9ft.
  A shorter wall simply uses its own actual height in the side-cabinet rate — it is
  never "topped up" to 9ft.)

WORKED EXAMPLE 3 — wall 11ft tall (exceeds 9ft), wall bed 5.5ft wide, total wall width 10ft, 2 sides:
  Side (capped at 9ft): 9 × RM1,350 = RM12,150 per side × 2 = RM24,300
  Top: 5.5 × RM800 = RM4,400
  Excess-height surcharge: 10 × RM800 = RM8,000
  Total estimate: RM36,700

PRESENTATION RULES:
- Always show the line-item breakdown (side cabinets, overhead cabinet, and the
  excess-height surcharge if applicable), then the total — don't just state a lump sum.
- Always label it as an ESTIMATE and close with: "This is an estimate — please confirm
  the exact quote with our team on WhatsApp at +60 12-568 4568, as final pricing depends
  on a site survey."
- Never guess a customer's wall height, wall bed width, or total wall width — always ask.
- If a customer only has one side available (corner installation, adjacent fixture, etc.),
  use sides = 1 in the calculation and say so explicitly in the breakdown.
`;
}