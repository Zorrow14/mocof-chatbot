// Bedsheets, bedding, and bath knowledge — the entire "Bedsheet" menu on
// mocof.example.com (Signoria Firenze, Luxury Tencel, Egyptian Cotton, Pure Cotton,
// Accessories, Cushion, Bath). Like MOCOF Basic, this is a large, frequently-
// refreshed catalog with many colourways per line, so the text below gives the
// material tiers, thread counts, price RANGES, and representative named
// products — not every single SKU. For a specific colour/design or current
// stock not named here, direct the customer to WhatsApp or mocof.example.com rather
// than guessing a price.
//
// NOTE: every "RM X,XXX" figure below feeds the api/chat.js MASTER_PRICE_LIST
// guardrail automatically (getBedsheetKnowledge() must be added to that list),
// so keep the "RM X,XXX" format consistent — that is what lets the model quote
// these prices character-for-character without the guardrail swapping the reply
// for the WhatsApp fallback.
export function getBedsheetKnowledge() {
    return `
BEDSHEET, BEDDING & BATH PRODUCTS — MATERIALS, LINES & PRICING:

MOCOF bedding spans four material tiers — Signoria Firenze (imported), Luxury Tencel, Egyptian Cotton, and Pure Cotton — plus Accessories, Cushions, and Bath. Most lines come in multiple colourways at the same price, and most duvet/bedsheet SETS are priced as a RANGE by bed size (e.g. Queen vs King). This is a large, frequently-updated catalog: the lines and price ranges below are accurate, but for a specific colour, exact size price, or design not named here, direct the customer to WhatsApp or mocof.example.com/bed-sheet-malaysia rather than guessing.

SIGNORIA FIRENZE — Imported Italian luxury bedding (the most premium tier)
100% Egyptian cotton, very high thread count (up to 2000TC). Price per duvet cover set:
* Baccarat Duvet Cover Set — RM 6,001
* Volterra Duvet Cover Set — RM 6,001
* Giorgina / Sanremo / Raffaello Duvet Cover Sets — RM 6,600 each
* Classic PDJ / Arona / Edera PDJ / Tenuta / Roseto / Nuvola Duvet Cover Sets — RM 8,700 each
* Signoria Down Feathers Pillow — RM 6,100
Range: RM 6,001 – RM 8,700.

LUXURY TENCEL — TENCEL/lyocell fibre (cool, breathable, gentle on skin, antibacterial)
* 1600TC duvet sets — RM 2,530 – RM 3,800
  (Lilac Lavender, Olive Green Ivory, Fog Baby Blue @ RM 2,620 – RM 2,890; Khaki Ivory, White Brown, White Rose Gold, White White @ RM 2,530 – RM 2,710; Joseph Marie Aqua / Gray / White @ RM 3,000 – RM 3,800)
* 1200TC printed duvet sets — RM 1,040 – RM 1,920 (Dale, Umbra, Moonlit, Nova, Havana, Zingy, Meadow, Aura)
* Semplice 1200TC duvet sets — RM 1,901 – RM 2,300 (Ivory, Grey, Blue)

EGYPTIAN COTTON — 100% Egyptian cotton with silky treatment
* 1600TC silky duvet sets — RM 1,570 – RM 2,091 (Pebble Grey Pearl, Medium Grey Silver, Khaki Pearl, Peach Rose lines)
* Designer Edition (studio collaboration) — RM 2,599 – RM 2,800 (White / Grey Designer)
* 1600TC silky duvet sets — RM 1,570 – RM 1,920 (White Navy Blue, White Tiffany B, White Pink, White Grey lines)
* 1200TC silky duvet sets — RM 1,390 – RM 1,740 (Coffee, Bean Green, Grey Green)
* 1200TC duvet sets — RM 774 – RM 1,570 (Begonia, Bloom, Minor)
* 1200TC fitted sheet sets — RM 614 – RM 790 (many colours); Adora fitted sets — RM 686 – RM 765
* 1200TC flat sheets — RM 1,230 (Fog Blue, Grey)
Range: RM 614 – RM 2,800.

PURE COTTON — 100% cotton, everyday value (the most budget-friendly tier)
* Premium duvet sets — RM 1,400 – RM 1,900 (Ivory Strisce, White Strisce); Mulia — RM 1,130 – RM 1,301
* Printed duvet sets — RM 605 – RM 870 (many designs: Wild Zoo, Tarlo, Shikoba, Leon, Koala, Dreamer, and more)
* Value duvet sets — RM 341 – RM 517 (many designs: Bruce, Galaxy, Lance, Orchestra, Rabbit, and more)
Range: RM 341 – RM 1,900.

ACCESSORIES — pillows, duvets/comforters, protectors, pillowcases & bolstercases
* Mulberry Silk Duvet — RM 2,091 – RM 2,970
* Microdown Duvet — RM 700 – RM 1,100 | Microdown Bolster — RM 350
* Pillow Protector — RM 350 | Bolster Protector — RM 324 | Waterproof Fitted Mattress Protector — RM 158 – RM 281
* Tencel pillowcases — RM 334 | Tencel bolstercases — RM 247
* Egyptian-cotton silk pillowcases — RM 262 | Egyptian-cotton silk bolstercases — RM 236
* Egyptian-cotton 1200TC bolstercases — RM 183
(Snowtech Memory Foam Mattress & Pillow, Euro Pillow, and various line-matched pillowcases are also carried — confirm current price on WhatsApp.)

CUSHION
* Tencel cushions (square 40×40cm / rectangle 28×48cm) — RM 300 (retail) | RM 122.58 (sale) — White Rose Gold, White Brown, White White, Khaki Ivory lines
* Egyptian-cotton 1200TC cushion covers — RM 31.42 each (many designs: Yeg, Rockett, Itri, Hibiscus, Autumn, Able, Nax, and more)

BATH
* Irya bath mats — RM 246 – RM 307 (Sherry Grey, Porter Grey, Maxi Mint, Beyaz White)
* River Turkish towels — RM 201 – RM 254 (Royal Blue, White, Beige, Gray)

MATERIAL / THREAD-COUNT GUIDE (higher TC = smoother, more durable, pricier):
- Coolest & most breathable, sensitive skin → Luxury Tencel
- Classic soft luxury, silky feel → Egyptian Cotton (1200TC everyday, 1600TC premium)
- Top-tier imported statement bedding → Signoria Firenze (up to 2000TC)
- Best value / kids' prints → Pure Cotton (from RM 341)

RECOMMENDATION GUIDE:
- Budget bedsheet → Pure Cotton value duvet set (from RM 341)
- Everyday premium → Egyptian Cotton 1200TC (from RM 614 fitted / RM 774 duvet)
- Cooling / sensitive skin → Luxury Tencel
- Luxury gift / master suite → Signoria Firenze
- Always ask: bed size (Single / Queen / King) and material preference before quoting an exact price, since most sets are priced as a size range.

Delivery: standard shipping (ready-made stock). This bedding catalog updates frequently and carries many colourways per line — for a specific design, exact size price, or item not named above, contact us on WhatsApp: +60 12-345 6789 or see mocof.example.com/bed-sheet-malaysia
`;
}