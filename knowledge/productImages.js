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
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Murano+Queen+Sofa'
    },
    {
        pattern: /murano\s*queen\s*desk/i,
        label: 'Murano Queen Desk',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Murano+Queen+Desk'
    },
    {
        pattern: /murano\s*queen\s*shelves/i,
        label: 'Murano Queen Shelves',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Murano+Queen+Shelves'
    },

    // ── Murano — plain configs share one photo (Basic Series) ──
    // Negative lookahead skips this when a Sofa/Desk/Shelves variant
    // is actually what's being asked about (matched above instead).
    {
        pattern: /murano\s*(queen|king|single)(?!\s*(sofa|desk|shelves))/i,
        label: 'Murano Basic Series',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Murano+Basic+Series'
    },

    // ── Gioco — variant-specific photos (checked first) ──
    {
        pattern: /gioco\s*single\s*desk/i,
        label: 'Gioco Single Desk',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Gioco+Single+Desk'
    },
    {
        pattern: /gioco\s*bunk/i,
        label: 'Gioco Bunk Bed',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Gioco+Bunk+Bed'
    },

    // ── Gioco — plain configs share one photo (Basic Series) ──
    {
        pattern: /gioco\s*(queen|single)(?!\s*desk)/i,
        label: 'Gioco Basic Series',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Gioco+Basic+Series'
    },

    // ── Orzo Hori Sofa Bed — has Open/Closed photos ──
    // Closed pattern uses a negative lookahead so it doesn't ALSO fire
    // when "open" is mentioned (same double-match problem as Murano).
    {
        pattern: /orzo\s*hori(?=.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Orzo Hori Sofa Bed (Open)',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Orzo+Hori+Sofa+Bed+(Open)'
    },
    {
        pattern: /orzo\s*hori(?!.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Orzo Hori Sofa Bed (Closed)',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Orzo+Hori+Sofa+Bed+(Closed)'
    },

    // ── Orzo (Single) Sofa Bed — checked after Orzo Hori so plain
    // "orzo" doesn't also match when "hori" is the actual subject ──
    {
        pattern: /orzo(?!\s*hori)\b(?=.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Orzo Sofa Bed (Open)',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Orzo+Sofa+Bed+(Open)'
    },
    {
        pattern: /orzo(?!\s*hori)(?!.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Orzo Sofa Bed (Closed)',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Orzo+Sofa+Bed+(Closed)'
    },

    // ── Duo Sofa Bunk Bed — has Open/Closed photos ──
    {
        pattern: /duo.*bunk(?=.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Duo Sofa Bunk Bed (Open)',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Duo+Sofa+Bunk+Bed+(Open)'
    },
    {
        pattern: /duo.*bunk(?!.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Duo Sofa Bunk Bed (Closed)',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Duo+Sofa+Bunk+Bed+(Closed)'
    },

    // ── Ottoman Bed — single photo, no open/closed variant supplied ──
    {
        pattern: /ottoman/i,
        label: 'Ottoman Bed',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Ottoman+Bed'
    },

    // ── Tables ──
    {
        pattern: /levante/i,
        label: 'Levante Table',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Levante+Table'
    },
    // Ulisse XL checked before plain Ulisse, with a negative lookahead
    // on the plain pattern so a question about the XL doesn't also
    // return the standard 10-pax photo.
    {
        pattern: /ulisse\s*xl/i,
        label: 'Ulisse XL Table (14 Pax)',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Ulisse+XL+Table+(14+Pax)'
    },
    {
        pattern: /ulisse(?!\s*xl)/i,
        label: 'Ulisse Table (10 Pax)',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Ulisse+Table+(10+Pax)'
    },
    {
        pattern: /tower\s*maxi/i,
        label: 'Tower Maxi Table (18 Pax)',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Tower+Maxi+Table+(18+Pax)'
    },
    {
        pattern: /ares\s*fold/i,
        label: 'Ares Fold Table (10 Pax)',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Ares+Fold+Table+(10+Pax)'
    },
    {
        pattern: /tavoletto/i,
        label: 'Tavoletto Table with Hidden Bed',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Tavoletto+Table+with+Hidden+Bed'
    },
    {
        pattern: /4\s*x\s*4/i,
        label: '4x4 Dining Table (14 Pax)',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=4x4+Dining+Table+(14+Pax)'
    },
    {
        pattern: /geniale/i,
        label: 'Geniale Table (4 Pax)',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Geniale+Table+(4+Pax)'
    },
    {
        pattern: /bessy/i,
        label: 'Bessy Table (8 Pax)',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Bessy+Table+(8+Pax)'
    },

    // ── Recliner ──
    // "Cloth Cover" variant checked first so plain "Zeta" doesn't also match it.
    {
        pattern: /zeta.*clothe?\s*cover/i,
        label: 'Zeta Recliner (Cloth Cover)',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Zeta+Recliner+(Cloth+Cover)'
    },
    {
        pattern: /zeta(?!.*clothe?\s*cover)/i,
        label: 'Zeta Recliner Chair',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Zeta+Recliner+Chair'
    },

    // ── TV Cabinets ──
    {
        pattern: /birch/i,
        label: 'Birch TV Cabinet',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Birch+TV+Cabinet'
    },
    {
        pattern: /riza/i,
        label: 'Riza TV Cabinet',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Riza+TV+Cabinet'
    },
    {
        pattern: /maven/i,
        label: 'Maven TV Cabinet',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Maven+TV+Cabinet'
    },
    {
        pattern: /zorra/i,
        label: 'Zorra TV Cabinet',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Zorra+TV+Cabinet'
    },
    {
        pattern: /varo/i,
        label: 'Varo TV Cabinet',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Varo+TV+Cabinet'
    },

    // ── Entryway (shoe rack / hallstands) ──
    {
        pattern: /draco/i,
        label: 'Draco Shoe Rack',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Draco+Shoe+Rack'
    },
    {
        pattern: /olola/i,
        label: 'Olola Hood Rack',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Olola+Hood+Rack'
    },
    {
        pattern: /sade/i,
        label: 'Sade Hallstand',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Sade+Hallstand'
    },
    {
        pattern: /nix/i,
        label: 'Nix Hallstand',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Nix+Hallstand'
    },

    // ── Basic Sofas ──
    // "Nebula" uses a negative lookahead so it doesn't also match
    // "Nebulatte" (a different product — a coffee table, listed below).
    {
        pattern: /perch/i,
        label: 'Perch Sofa',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Perch+Sofa'
    },
    {
        pattern: /cozelle/i,
        label: 'Cozelle Sofa',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Cozelle+Sofa'
    },
    {
        pattern: /casa/i,
        label: 'Casa Sofa',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Casa+Sofa'
    },
    {
        pattern: /celestia/i,
        label: 'Celestia Sofa',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Celestia+Sofa'
    },
    {
        pattern: /orbit/i,
        label: 'Orbit Sofa',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Orbit+Sofa'
    },
    {
        pattern: /zenon/i,
        label: 'Zenon Sofa',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Zenon+Sofa'
    },
    {
        pattern: /moria/i,
        label: 'Moria Sofa',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Moria+Sofa'
    },
    {
        pattern: /lumina/i,
        label: 'Lumina Sofa',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Lumina+Sofa'
    },
    {
        pattern: /zenith/i,
        label: 'Zenith Sofa',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Zenith+Sofa'
    },
    {
        pattern: /crorix/i,
        label: 'Crorix Sofa',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Crorix+Sofa'
    },
    {
        pattern: /solaris/i,
        label: 'Solaris Sofa',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Solaris+Sofa'
    },
    {
        pattern: /nebula(?!tte)/i,
        label: 'Nebula Sofa',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Nebula+Sofa'
    },
    {
        pattern: /neva/i,
        label: 'Neva Sofa',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Neva+Sofa'
    },
    {
        pattern: /pluto/i,
        label: 'Pluto Sofa',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Pluto+Sofa'
    },
    {
        pattern: /drion/i,
        label: 'Drion Sofa',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Drion+Sofa'
    },
    {
        pattern: /flare/i,
        label: 'Flare Sofa',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Flare+Sofa'
    },
    {
        pattern: /marlie/i,
        label: 'Marlie Sofa',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Marlie+Sofa'
    },
    {
        pattern: /colony/i,
        label: 'Colony Sofa',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Colony+Sofa'
    },
    {
        pattern: /theta/i,
        label: 'Theta Sofa',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Theta+Sofa'
    },
    {
        pattern: /dream/i,
        label: 'Dream Sofa',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Dream+Sofa'
    },
    {
        pattern: /canis/i,
        label: 'Canis L Shape Sofa',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Canis+L+Shape+Sofa'
    },

    // ── Basic Sofa Bed: Kivo + Velvet (6 colours), each Open/Closed ──
    {
        pattern: /kivo(?=.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Kivo Sofa Bed (Open)',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Kivo+Sofa+Bed+(Open)'
    },
    {
        pattern: /kivo(?!.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Kivo Sofa Bed (Closed)',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Kivo+Sofa+Bed+(Closed)'
    },
    {
        pattern: /pastel\s*pink(?=.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Pastel Pink Velvet Sofa Bed (Open)',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Pastel+Pink+Velvet+Sofa+Bed+(Open)'
    },
    {
        pattern: /pastel\s*pink(?!.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Pastel Pink Velvet Sofa Bed (Closed)',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Pastel+Pink+Velvet+Sofa+Bed+(Closed)'
    },
    {
        pattern: /royal\s*blue(?=.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Royal Blue Velvet Sofa Bed (Open)',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Royal+Blue+Velvet+Sofa+Bed+(Open)'
    },
    {
        pattern: /royal\s*blue(?!.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Royal Blue Velvet Sofa Bed (Closed)',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Royal+Blue+Velvet+Sofa+Bed+(Closed)'
    },
    {
        pattern: /jade\s*green(?=.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Jade Green Velvet Sofa Bed (Open)',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Jade+Green+Velvet+Sofa+Bed+(Open)'
    },
    {
        pattern: /jade\s*green(?!.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Jade Green Velvet Sofa Bed (Closed)',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Jade+Green+Velvet+Sofa+Bed+(Closed)'
    },
    {
        pattern: /aegean\s*blue(?=.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Aegean Blue Velvet Sofa Bed (Open)',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Aegean+Blue+Velvet+Sofa+Bed+(Open)'
    },
    {
        pattern: /aegean\s*blue(?!.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Aegean Blue Velvet Sofa Bed (Closed)',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Aegean+Blue+Velvet+Sofa+Bed+(Closed)'
    },
    {
        pattern: /mustard\s*yellow(?=.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Mustard Yellow Velvet Sofa Bed (Open)',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Mustard+Yellow+Velvet+Sofa+Bed+(Open)'
    },
    {
        pattern: /mustard\s*yellow(?!.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Mustard Yellow Velvet Sofa Bed (Closed)',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Mustard+Yellow+Velvet+Sofa+Bed+(Closed)'
    },
    {
        pattern: /french\s*blue(?=.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'French Blue Velvet Sofa Bed (Open)',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=French+Blue+Velvet+Sofa+Bed+(Open)'
    },
    {
        pattern: /french\s*blue(?!.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'French Blue Velvet Sofa Bed (Closed)',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=French+Blue+Velvet+Sofa+Bed+(Closed)'
    },

    // ── Coffee Tables & Stool ──
    {
        pattern: /nebulatte/i,
        label: 'Nebulatte Coffee Table',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Nebulatte+Coffee+Table'
    },
    {
        pattern: /dock/i,
        label: 'Dock Coffee Table',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Dock+Coffee+Table'
    },
    {
        pattern: /zovo/i,
        label: 'Zovo Coffee Table',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Zovo+Coffee+Table'
    },
    {
        pattern: /pebble/i,
        label: 'Pebble Coffee Table',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Pebble+Coffee+Table'
    },
    {
        pattern: /librae/i,
        label: 'Librae Coffee Table',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Librae+Coffee+Table'
    },
    {
        pattern: /starry/i,
        label: 'Starry Coffee Table',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Starry+Coffee+Table'
    },
    {
        pattern: /luna\s*stool/i,
        label: 'Luna Stool',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Luna+Stool'
    },

    // ── Basic Stools ──
    {
        pattern: /\bhush\b/i,
        label: 'Hush Stool',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Hush+Stool'
    },
    {
        pattern: /\bholo\b/i,
        label: 'Holo Stool',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Holo+Stool'
    },

    // ── Basic Chairs ──
    {
        pattern: /\bvine\b/i,
        label: 'Vine Chair',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Vine+Chair'
    },
    {
        pattern: /\bvellum\b/i,
        label: 'Vellum Chair',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Vellum+Chair'
    },
    {
        pattern: /\bmodo\b/i,
        label: 'Modo Chair',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Modo+Chair'
    },
    {
        pattern: /\betho\b/i,
        label: 'Etho Chair',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Etho+Chair'
    },
    {
        pattern: /\bnexo\b/i,
        label: 'Nexo Chair',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Nexo+Chair'
    },
    {
        pattern: /\btetra\b/i,
        label: 'Tetra Chair',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Tetra+Chair'
    },
    {
        pattern: /\bjolly\b/i,
        label: 'Jolly Chair',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Jolly+Chair'
    },
    {
        pattern: /bar\s*chair/i,
        label: 'Bar Chair',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Bar+Chair'
    },
    {
        pattern: /\bsolis\b/i,
        label: 'Solis Chair',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Solis+Chair'
    },
    {
        pattern: /\bzen\b/i,
        label: 'Zen Chair',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Zen+Chair'
    },
    {
        pattern: /buzz\s*chair/i,
        label: 'Buzz Chair',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Buzz+Chair'
    },
    {
        pattern: /lars\s*chair/i,
        label: 'Lars Chair',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Lars+Chair'
    },

    // ── Basic Trolley ──
    {
        pattern: /\bvion\b/i,
        label: 'Vion Trolley',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Vion+Trolley'
    },
    {
        pattern: /\blurn\b/i,
        label: 'Lurn Trolley',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Lurn+Trolley'
    },

    // ── Basic Dining Table ──
    // Knowledge base spells this "Rootsy"; matching both spellings since
    // the image link supplied was labelled "Roosty" -- worth confirming
    // which is the actual spelling used on the live site.
    {
        pattern: /\bprova\b/i,
        label: 'Prova Dining Table',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Prova+Dining+Table'
    },
    {
        pattern: /\bbrilla\b/i,
        label: 'Brilla Dining Table',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Brilla+Dining+Table'
    },
    {
        pattern: /\belzia\b/i,
        label: 'Elzia Dining Table',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Elzia+Dining+Table'
    },
    {
        pattern: /\bgrano\b/i,
        label: 'Grano Dining Table',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Grano+Dining+Table'
    },
    {
        pattern: /\bvalor\b/i,
        label: 'Valor Dining Table',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Valor+Dining+Table'
    },
    {
        pattern: /rootsy|roosty/i,
        label: 'Rootsy Dining Table',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Rootsy+Dining+Table'
    },
    {
        pattern: /\bpallio\b/i,
        label: 'Pallio Dining Table',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Pallio+Dining+Table'
    },
    {
        pattern: /\bproxima\b/i,
        label: 'Proxima Dining Table',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Proxima+Dining+Table'
    },
    {
        pattern: /\bvenus\b/i,
        label: 'Venus Dining Table',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Venus+Dining+Table'
    },
    {
        pattern: /\bsone\b/i,
        label: 'Sone Dining Table',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Sone+Dining+Table'
    },
    {
        pattern: /\bbella\b/i,
        label: 'Bella Dining Table',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Bella+Dining+Table'
    },
    {
        pattern: /\bmelba\b/i,
        label: 'Melba Dining Table',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Melba+Dining+Table'
    },
    {
        pattern: /\bsolara\b/i,
        label: 'Solara Dining Table',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Solara+Dining+Table'
    },
    {
        pattern: /\bprimo\b/i,
        label: 'Primo Dining Table',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Primo+Dining+Table'
    },

    // ── Basic Cabinet & Shelf ──
    {
        pattern: /\bthora\b/i,
        label: 'Thora Dining Table',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Thora+Dining+Table'
    },
    {
        pattern: /\bresili\b/i,
        label: 'Resili Cabinet',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Resili+Cabinet'
    },
    {
        pattern: /\beclipse\b/i,
        label: 'Eclipse Cabinet',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Eclipse+Cabinet'
    },
    {
        pattern: /\bclover\b/i,
        label: 'Clover Cabinet',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Clover+Cabinet'
    },
    {
        pattern: /\beden\b/i,
        label: 'Eden Cabinet',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Eden+Cabinet'
    },
    {
        pattern: /\bliro\b/i,
        label: 'Liro Cabinet',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Liro+Cabinet'
    },
    {
        pattern: /\bvelvia\b/i,
        label: 'Velvia Cabinet',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Velvia+Cabinet'
    },
    {
        pattern: /petrus.*storage/i,
        label: 'Petrus Storage Shelf',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Petrus+Storage+Shelf'
    },
    {
        pattern: /petrus(?!.*storage)/i,
        label: 'Petrus Shelf',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Petrus+Shelf'
    },
    {
        pattern: /\bheem\b/i,
        label: 'Heem Book Shelf',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Heem+Book+Shelf'
    },
    {
        pattern: /axil/i,
        label: 'Axil Corner Book Shelf',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Axil+Corner+Book+Shelf'
    },

    // ── Wardrobes (matches basicfurniture.js pointer to the WARDROBE knowledge base) ──
    {
        pattern: /andro.*open/i,
        label: 'Andro Open Cabinet',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Andro+Open+Cabinet'
    },
    {
        pattern: /andro(?!.*open)/i,
        label: 'Andro Cabinet',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Andro+Cabinet'
    },
    {
        pattern: /\bloom\b/i,
        label: 'Loom Open Cabinet',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Loom+Open+Cabinet'
    },
    {
        pattern: /\bforge\b/i,
        label: 'Forge Wardrobe',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Forge+Wardrobe'
    },
    {
        pattern: /\bhara\b/i,
        label: 'Hara Wardrobe',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Hara+Wardrobe'
    },
    {
        pattern: /\beuclio\b/i,
        label: 'Euclio Wardrobe',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Euclio+Wardrobe'
    },
    {
        pattern: /\berga\b/i,
        label: 'Erga Wardrobe',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Erga+Wardrobe'
    },
    {
        pattern: /\banta\b/i,
        label: 'Anta Wardrobe',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Anta+Wardrobe'
    },

    // ── Basic Bed Frame ──
    {
        pattern: /\barvo\b/i,
        label: 'Arvo Wardrobe',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Arvo+Wardrobe'
    },
    {
        pattern: /\barto\b/i,
        label: 'Arto Wardrobe',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Arto+Wardrobe'
    },
    {
        pattern: /\blyco\b/i,
        label: 'Lyco Wardrobe',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Lyco+Wardrobe'
    },
    {
        pattern: /\bfeilo\b/i,
        label: 'Feilo Bedframe',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Feilo+Bedframe'
    },
    {
        pattern: /\bvale\b/i,
        label: 'Vale Bedframe',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Vale+Bedframe'
    },
    {
        pattern: /\bclaria\b/i,
        label: 'Claria Bedframe',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Claria+Bedframe'
    },
    {
        pattern: /\bmesa\b/i,
        label: 'Mesa Bedframe',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Mesa+Bedframe'
    },
    {
        pattern: /\brove\b/i,
        label: 'Rove Bedframe',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Rove+Bedframe'
    },
    {
        pattern: /\blevo\b/i,
        label: 'Levo Bedframe',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Levo+Bedframe'
    },
    {
        pattern: /\bmira\b/i,
        label: 'Mira Bedframe',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Mira+Bedframe'
    },
    {
        pattern: /\bletho\b/i,
        label: 'Letho Bedframe',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Letho+Bedframe'
    },
    {
        pattern: /\bmoza\b/i,
        label: 'Moza Bedframe',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Moza+Bedframe'
    },
    {
        pattern: /\bnook\b/i,
        label: 'Nook Bedframe',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Nook+Bedframe'
    },
    {
        pattern: /\bavo\b/i,
        label: 'Avo Bedframe',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Avo+Bedframe'
    },
    {
        pattern: /\borion\b/i,
        label: 'Orion Bedframe',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Orion+Bedframe'
    },
    {
        pattern: /\bstellar\b/i,
        label: 'Stellar Bedframe',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Stellar+Bedframe'
    },
    {
        pattern: /\bcrolla\b/i,
        label: 'Crolla Bedframe',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Crolla+Bedframe'
    },
    {
        pattern: /\blambda\b/i,
        label: 'Lambda Bedframe',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Lambda+Bedframe'
    },
    {
        pattern: /\bapus\b/i,
        label: 'Apus Bedframe',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Apus+Bedframe'
    },

    // ── Reference / lifestyle photos (not tied to one specific product) ──
    // Triggers on wall bed + cabinet TOPIC discussed together with an
    // explicit visual-intent word (reference/example/show/etc.) -- e.g.
    // "reference for wall bed and cabinets", "example of wallbed with
    // storage", "how does a wall bed with cabinetry look". Deliberately
    // requires that third visual-intent word so this doesn't also attach
    // itself to plain pricing or dimension questions about the same topic.
    {
        pattern: /(?=.*\b(wall\s*beds?|wallbeds?|murphy\s*beds?)\b)(?=.*\b(cabinets?|cabinetry|storage|shelv\w*)\b)(?=.*\b(references?|examples?|samples?|ideas?|inspirations?|layouts?|configurations?|configure\w*|customi[sz]e\w*|look\s*like|shows?|pictures?|photos?|pics?|images?)\b)/i,
        label: 'Wall Bed + Cabinetry Reference Photo',
        url: '/images/wallbed-cabinetry-reference.jpeg'
    },

    // ── Basic Study Table ──
    {
        pattern: /\belevatia\b/i,
        label: 'Elevatia Study Table',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Elevatia+Study+Table'
    },
    {
        pattern: /\bglint\b/i,
        label: 'Glint Table',
        url: 'https://placehold.co/674x410/eeeeee/333333?text=Glint+Table'
    },

    // Add kitchen the same way once its image links are available.
];

const MAX_IMAGES_PER_REPLY = 2;

// Phrases that signal "I want to SEE something" rather than just
// mentioning a product in passing. Only these trigger the history
// fallback below.
const IMAGE_REQUEST_HINT = /\b(show|see|picture|photo|pic|image|look\s*like)\b/i;

// A number + unit (8ft, 2.5 metres, 30cm...) strongly signals the customer
// is ANSWERING a measurement question (e.g. the bot's own "what's the wall
// height?" during a cabinetry quote) rather than browsing/asking to view a
// product -- even if a model name happens to be in the same message. This
// suppresses the reflexive "mention a name, get a photo" behaviour for that
// specific case, without touching normal "show me the Murano Queen" requests
// (IMAGE_REQUEST_HINT above still overrides this suppression when present).
const MEASUREMENT_ANSWER_PATTERN = /\b\d+(\.\d+)?\s*(ft|feet|foot|'|inches?|inch|"|cm|centimet(er|re)s?|met(er|re)s?|m)\b/i;

function matchProducts(text) {
    const seen = new Set();
    const matches = [];
    for (const entry of PRODUCT_IMAGES) {
        if (text.match(entry.pattern) && !seen.has(entry.url)) {
            seen.add(entry.url);
            matches.push({ label: entry.label, url: entry.url });
            if (matches.length >= MAX_IMAGES_PER_REPLY) break;
        }
    }
    return matches;
}

// Matches the CURRENT message only, by default — this is what stops an
// old product (e.g. "Ottoman" from two turns ago) from re-attaching its
// photo to an unrelated later reply (e.g. "Show me Levante table").
// History is only consulted as a narrow fallback: when the customer
// clearly asks to see something ("show me a photo of that") without
// naming a product, in which case we look at just the ONE most recent
// exchange, not several turns back.
export function getRelevantImages(message, history) {
    const lowerMessage = (message || '').toLowerCase();
    const hasVisualIntent = IMAGE_REQUEST_HINT.test(lowerMessage);

    // e.g. "Murano Queen, and the wall is 8ft high" answering a form
    // question -- skip image matching entirely unless they also explicitly
    // asked to see something in the same message.
    if (MEASUREMENT_ANSWER_PATTERN.test(lowerMessage) && !hasVisualIntent) return [];

    const directMatches = matchProducts(lowerMessage);
    if (directMatches.length > 0) return directMatches;

    if (!hasVisualIntent) return [];

    const lastTurnText = Array.isArray(history)
        ? history.slice(-2).map(m => (m && m.content) ? m.content : '').join(' ').toLowerCase()
        : '';
    return matchProducts(lastTurnText);
}