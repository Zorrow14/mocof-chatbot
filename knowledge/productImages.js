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

    // ── Recliner ──
    // "Cloth Cover" variant checked first so plain "Zeta" doesn't also match it.
    {
        pattern: /zeta.*clothe?\s*cover/i,
        label: 'Zeta Recliner (Cloth Cover)',
        url: 'https://static.wixstatic.com/media/be2f9f_63b4bd663c4d4da2b32352c575c387ff~mv2.jpg/v1/fill/w_704,h_704,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_63b4bd663c4d4da2b32352c575c387ff~mv2.jpg'
    },
    {
        pattern: /zeta(?!.*clothe?\s*cover)/i,
        label: 'Zeta Recliner Chair',
        url: 'https://static.wixstatic.com/media/be2f9f_77c9e118a88c4e6ea2c5a4c7760d389b~mv2.png/v1/fill/w_624,h_624,al_c,q_90,enc_avif,quality_auto/be2f9f_77c9e118a88c4e6ea2c5a4c7760d389b~mv2.png'
    },

    // ── TV Cabinets ──
    {
        pattern: /birch/i,
        label: 'Birch TV Cabinet',
        url: 'https://static.wixstatic.com/media/be2f9f_b1fe1fd3520a45ed806ff9df25a7313b~mv2.jpg/v1/fill/w_704,h_704,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_b1fe1fd3520a45ed806ff9df25a7313b~mv2.jpg'
    },
    {
        pattern: /riza/i,
        label: 'Riza TV Cabinet',
        url: 'https://static.wixstatic.com/media/be2f9f_a099f3736d084652b2d629c75d61de65~mv2.jpg/v1/fill/w_704,h_704,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_a099f3736d084652b2d629c75d61de65~mv2.jpg'
    },
    {
        pattern: /maven/i,
        label: 'Maven TV Cabinet',
        url: 'https://static.wixstatic.com/media/be2f9f_311a8d37abd448738b9daa6b72a6e210~mv2.jpg/v1/fill/w_704,h_704,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_311a8d37abd448738b9daa6b72a6e210~mv2.jpg'
    },
    {
        pattern: /zorra/i,
        label: 'Zorra TV Cabinet',
        url: 'https://static.wixstatic.com/media/be2f9f_c8bbf3f2e4d649b2b0b11fb04eada36d~mv2.jpg/v1/fill/w_704,h_704,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_c8bbf3f2e4d649b2b0b11fb04eada36d~mv2.jpg'
    },
    {
        pattern: /varo/i,
        label: 'Varo TV Cabinet',
        url: 'https://static.wixstatic.com/media/be2f9f_2d3a9ed46fed4ae0afd29f9dcaddeaaf~mv2.jpg/v1/fill/w_704,h_704,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_2d3a9ed46fed4ae0afd29f9dcaddeaaf~mv2.jpg'
    },

    // ── Entryway (shoe rack / hallstands) ──
    {
        pattern: /draco/i,
        label: 'Draco Shoe Rack',
        url: 'https://static.wixstatic.com/media/be2f9f_8db2b239834041dfa37aa8faebab8dd2~mv2.jpg/v1/fill/w_704,h_704,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_8db2b239834041dfa37aa8faebab8dd2~mv2.jpg'
    },
    {
        pattern: /olola/i,
        label: 'Olola Hood Rack',
        url: 'https://static.wixstatic.com/media/be2f9f_191c05e6063a4d8d8b467792a9ccf417~mv2.jpg/v1/fill/w_704,h_704,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_191c05e6063a4d8d8b467792a9ccf417~mv2.jpg'
    },
    {
        pattern: /sade/i,
        label: 'Sade Hallstand',
        url: 'https://static.wixstatic.com/media/be2f9f_8afb48f6b6ff48189448766b3df32ee2~mv2.jpg/v1/fill/w_704,h_704,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_8afb48f6b6ff48189448766b3df32ee2~mv2.jpg'
    },
    {
        pattern: /nix/i,
        label: 'Nix Hallstand',
        url: 'https://static.wixstatic.com/media/be2f9f_4e1bc778d86a40b183a7d92e696b6523~mv2.jpg/v1/fill/w_704,h_704,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_4e1bc778d86a40b183a7d92e696b6523~mv2.jpg'
    },

    // ── Basic Sofas ──
    // "Nebula" uses a negative lookahead so it doesn't also match
    // "Nebulatte" (a different product — a coffee table, listed below).
    {
        pattern: /perch/i,
        label: 'Perch Sofa',
        url: 'https://static.wixstatic.com/media/be2f9f_91d7e51045804a568ebe1202c0a8a616~mv2.jpg/v1/fill/w_459,h_459,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_91d7e51045804a568ebe1202c0a8a616~mv2.jpg'
    },
    {
        pattern: /cozelle/i,
        label: 'Cozelle Sofa',
        url: 'https://static.wixstatic.com/media/be2f9f_c5aba423013e4907ab45f282bc8ac2c8~mv2.jpg/v1/fill/w_459,h_459,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_c5aba423013e4907ab45f282bc8ac2c8~mv2.jpg'
    },
    {
        pattern: /casa/i,
        label: 'Casa Sofa',
        url: 'https://static.wixstatic.com/media/be2f9f_c03e1af15a2646b9b607801b5c74387e~mv2.jpg/v1/fill/w_459,h_459,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_c03e1af15a2646b9b607801b5c74387e~mv2.jpg'
    },
    {
        pattern: /celestia/i,
        label: 'Celestia Sofa',
        url: 'https://static.wixstatic.com/media/be2f9f_bc4bf405ff7848c98346fec11c10355a~mv2.jpg/v1/fill/w_734,h_734,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_bc4bf405ff7848c98346fec11c10355a~mv2.jpg'
    },
    {
        pattern: /orbit/i,
        label: 'Orbit Sofa',
        url: 'https://static.wixstatic.com/media/be2f9f_851f9f815c4949a6af5cd9e4e0e575c5~mv2.png/v1/fill/w_734,h_486,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_851f9f815c4949a6af5cd9e4e0e575c5~mv2.png'
    },
    {
        pattern: /zenon/i,
        label: 'Zenon Sofa',
        url: 'https://static.wixstatic.com/media/be2f9f_797b993d95474f31b88107f5d94dfd7d~mv2.jpg/v1/fill/w_459,h_459,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_797b993d95474f31b88107f5d94dfd7d~mv2.jpg'
    },
    {
        pattern: /moria/i,
        label: 'Moria Sofa',
        url: 'https://static.wixstatic.com/media/be2f9f_4321b1b678884973b7f026815e299357~mv2.jpg/v1/fill/w_734,h_734,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_4321b1b678884973b7f026815e299357~mv2.jpg'
    },
    {
        pattern: /lumina/i,
        label: 'Lumina Sofa',
        url: 'https://static.wixstatic.com/media/be2f9f_676e8585b8ac4cef8da2b62bc65a7a1d~mv2.jpg/v1/fill/w_734,h_734,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_676e8585b8ac4cef8da2b62bc65a7a1d~mv2.jpg'
    },
    {
        pattern: /zenith/i,
        label: 'Zenith Sofa',
        url: 'https://static.wixstatic.com/media/be2f9f_cf271f59dcb14d068a413ca268a9df70~mv2.jpg/v1/fill/w_459,h_459,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_cf271f59dcb14d068a413ca268a9df70~mv2.jpg'
    },
    {
        pattern: /crorix/i,
        label: 'Crorix Sofa',
        url: 'https://static.wixstatic.com/media/be2f9f_33482299680748678d0ea9c1adb244bd~mv2.jpg/v1/fill/w_734,h_734,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_33482299680748678d0ea9c1adb244bd~mv2.jpg'
    },
    {
        pattern: /solaris/i,
        label: 'Solaris Sofa',
        url: 'https://static.wixstatic.com/media/be2f9f_13ae0b88191d4b49ae8e4acd9f43bc07~mv2.jpg/v1/fill/w_459,h_459,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_13ae0b88191d4b49ae8e4acd9f43bc07~mv2.jpg'
    },
    {
        pattern: /nebula(?!tte)/i,
        label: 'Nebula Sofa',
        url: 'https://static.wixstatic.com/media/be2f9f_38613d4c6780466e87ed04afcb324082~mv2.jpg/v1/fill/w_459,h_459,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_38613d4c6780466e87ed04afcb324082~mv2.jpg'
    },
    {
        pattern: /neva/i,
        label: 'Neva Sofa',
        url: 'https://static.wixstatic.com/media/be2f9f_dea923e3446b469da5040c22feaf32a5~mv2.jpg/v1/fill/w_459,h_459,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_dea923e3446b469da5040c22feaf32a5~mv2.jpg'
    },
    {
        pattern: /pluto/i,
        label: 'Pluto Sofa',
        url: 'https://static.wixstatic.com/media/be2f9f_2e5b9555fee64de5bec0b991093a6941~mv2.jpg/v1/fill/w_734,h_734,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_2e5b9555fee64de5bec0b991093a6941~mv2.jpg'
    },
    {
        pattern: /drion/i,
        label: 'Drion Sofa',
        url: 'https://static.wixstatic.com/media/be2f9f_0384bb5d2a2b466a9187bf4e146e5e05~mv2.jpg/v1/fill/w_459,h_459,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_0384bb5d2a2b466a9187bf4e146e5e05~mv2.jpg'
    },
    {
        pattern: /flare/i,
        label: 'Flare Sofa',
        url: 'https://static.wixstatic.com/media/be2f9f_9cabac2b7f214425b56daa4a0ebbdb42~mv2.jpg/v1/fill/w_459,h_459,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_9cabac2b7f214425b56daa4a0ebbdb42~mv2.jpg'
    },
    {
        pattern: /marlie/i,
        label: 'Marlie Sofa',
        url: 'https://static.wixstatic.com/media/be2f9f_b0c1146da7f14b8096dac4d6a8ecd578~mv2.jpg/v1/fill/w_459,h_459,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_b0c1146da7f14b8096dac4d6a8ecd578~mv2.jpg'
    },
    {
        pattern: /colony/i,
        label: 'Colony Sofa',
        url: 'https://static.wixstatic.com/media/be2f9f_6c5d19906bf340608aa2cc6f8a7e0b1f~mv2.webp/v1/fill/w_459,h_459,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_6c5d19906bf340608aa2cc6f8a7e0b1f~mv2.webp'
    },
    {
        pattern: /theta/i,
        label: 'Theta Sofa',
        url: 'https://static.wixstatic.com/media/be2f9f_3264df3c8e78478691d6670a770e48dd~mv2.jpg/v1/fill/w_459,h_459,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_3264df3c8e78478691d6670a770e48dd~mv2.jpg'
    },
    {
        pattern: /dream/i,
        label: 'Dream Sofa',
        url: 'https://static.wixstatic.com/media/be2f9f_ffb8f8efe8484455a57ab924ecc43a5a~mv2.jpg/v1/fill/w_459,h_459,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_ffb8f8efe8484455a57ab924ecc43a5a~mv2.jpg'
    },
    {
        pattern: /canis/i,
        label: 'Canis L Shape Sofa',
        url: 'https://static.wixstatic.com/media/be2f9f_c2d98588f39b492eb352db62ac639915~mv2.jpg/v1/fill/w_749,h_498,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_c2d98588f39b492eb352db62ac639915~mv2.jpg'
    },

    // ── Basic Sofa Bed: Kivo + Velvet (6 colours), each Open/Closed ──
    {
        pattern: /kivo(?=.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Kivo Sofa Bed (Open)',
        url: 'https://static.wixstatic.com/media/be2f9f_ca767b0299c14835b0d93ca2b310da16~mv2.jpg/v1/fill/w_734,h_734,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_ca767b0299c14835b0d93ca2b310da16~mv2.jpg'
    },
    {
        pattern: /kivo(?!.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Kivo Sofa Bed (Closed)',
        url: 'https://static.wixstatic.com/media/be2f9f_0dc27d39e8f34a7c8da65c32e5495a38~mv2.jpg/v1/fill/w_734,h_734,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_0dc27d39e8f34a7c8da65c32e5495a38~mv2.jpg'
    },
    {
        pattern: /pastel\s*pink(?=.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Pastel Pink Velvet Sofa Bed (Open)',
        url: 'https://static.wixstatic.com/media/72b6a8_a4385df0cddd4240994de5e5c85d0192~mv2.jpg/v1/fill/w_734,h_489,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/72b6a8_a4385df0cddd4240994de5e5c85d0192~mv2.jpg'
    },
    {
        pattern: /pastel\s*pink(?!.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Pastel Pink Velvet Sofa Bed (Closed)',
        url: 'https://static.wixstatic.com/media/72b6a8_86fceab5a4184e9c9aceedd2f31bbbd4~mv2.jpg/v1/fill/w_734,h_489,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/72b6a8_86fceab5a4184e9c9aceedd2f31bbbd4~mv2.jpg'
    },
    {
        pattern: /royal\s*blue(?=.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Royal Blue Velvet Sofa Bed (Open)',
        url: 'https://static.wixstatic.com/media/72b6a8_6aae424d856240b98197e90faef07ce0~mv2.jpg/v1/fill/w_734,h_489,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/72b6a8_6aae424d856240b98197e90faef07ce0~mv2.jpg'
    },
    {
        pattern: /royal\s*blue(?!.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Royal Blue Velvet Sofa Bed (Closed)',
        url: 'https://static.wixstatic.com/media/72b6a8_f0bc677d2da14e1bb32f1e46c1947bd2~mv2.jpg/v1/fill/w_734,h_489,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/72b6a8_f0bc677d2da14e1bb32f1e46c1947bd2~mv2.jpg'
    },
    {
        pattern: /jade\s*green(?=.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Jade Green Velvet Sofa Bed (Open)',
        url: 'https://static.wixstatic.com/media/72b6a8_19a7131058964edbabb0bfec9a189741~mv2.jpg/v1/fill/w_734,h_489,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/72b6a8_19a7131058964edbabb0bfec9a189741~mv2.jpg'
    },
    {
        pattern: /jade\s*green(?!.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Jade Green Velvet Sofa Bed (Closed)',
        url: 'https://static.wixstatic.com/media/72b6a8_d2a4dabd52e444c691580c4a2e722a7d~mv2.jpg/v1/fill/w_734,h_489,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/72b6a8_d2a4dabd52e444c691580c4a2e722a7d~mv2.jpg'
    },
    {
        pattern: /aegean\s*blue(?=.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Aegean Blue Velvet Sofa Bed (Open)',
        url: 'https://static.wixstatic.com/media/72b6a8_b442b7f3a0e04e85894d8e31775e487f~mv2.jpg/v1/fill/w_714,h_476,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/72b6a8_b442b7f3a0e04e85894d8e31775e487f~mv2.jpg'
    },
    {
        pattern: /aegean\s*blue(?!.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Aegean Blue Velvet Sofa Bed (Closed)',
        url: 'https://static.wixstatic.com/media/72b6a8_42b9021674854889a2ad547433339139~mv2.jpg/v1/fill/w_734,h_470,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/72b6a8_42b9021674854889a2ad547433339139~mv2.jpg'
    },
    {
        pattern: /mustard\s*yellow(?=.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Mustard Yellow Velvet Sofa Bed (Open)',
        url: 'https://static.wixstatic.com/media/72b6a8_8150abb1d42f42aeb02101b480f44c45~mv2.jpg/v1/fill/w_749,h_498,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/72b6a8_8150abb1d42f42aeb02101b480f44c45~mv2.jpg'
    },
    {
        pattern: /mustard\s*yellow(?!.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'Mustard Yellow Velvet Sofa Bed (Closed)',
        url: 'https://static.wixstatic.com/media/72b6a8_18d7d4487a954ecf937995808248ade5~mv2.jpg/v1/fill/w_749,h_498,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/72b6a8_18d7d4487a954ecf937995808248ade5~mv2.jpg'
    },
    {
        pattern: /french\s*blue(?=.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'French Blue Velvet Sofa Bed (Open)',
        url: 'https://static.wixstatic.com/media/72b6a8_b757647ae7e3486fb9a85d0701ff21c8~mv2.jpg/v1/fill/w_734,h_489,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/72b6a8_b757647ae7e3486fb9a85d0701ff21c8~mv2.jpg'
    },
    {
        pattern: /french\s*blue(?!.*\b(open|opened|unfold|unfolded|extended)\b)/i,
        label: 'French Blue Velvet Sofa Bed (Closed)',
        url: 'https://static.wixstatic.com/media/72b6a8_24a8bde7666047b09c2a6380eb607a54~mv2.jpg/v1/fill/w_734,h_489,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/72b6a8_24a8bde7666047b09c2a6380eb607a54~mv2.jpg'
    },

    // ── Coffee Tables & Stool ──
    {
        pattern: /nebulatte/i,
        label: 'Nebulatte Coffee Table',
        url: 'https://static.wixstatic.com/media/be2f9f_178f6631470b43cdb72be1bb76515bb2~mv2.jpg/v1/fill/w_665,h_498,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_178f6631470b43cdb72be1bb76515bb2~mv2.jpg'
    },
    {
        pattern: /dock/i,
        label: 'Dock Coffee Table',
        url: 'https://static.wixstatic.com/media/be2f9f_0fd6dc7bb3ff4397a1295ef19111a258~mv2.jpg/v1/fill/w_490,h_734,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_0fd6dc7bb3ff4397a1295ef19111a258~mv2.jpg'
    },
    {
        pattern: /zovo/i,
        label: 'Zovo Coffee Table',
        url: 'https://static.wixstatic.com/media/be2f9f_75841a4e6a7842409fd8e4aac3002a4b~mv2.jpg/v1/fill/w_665,h_498,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_75841a4e6a7842409fd8e4aac3002a4b~mv2.jpg'
    },
    {
        pattern: /pebble/i,
        label: 'Pebble Coffee Table',
        url: 'https://static.wixstatic.com/media/be2f9f_62e1e1f2958947f4a32933908dd7921a~mv2.jpg/v1/fill/w_665,h_498,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_62e1e1f2958947f4a32933908dd7921a~mv2.jpg'
    },
    {
        pattern: /librae/i,
        label: 'Librae Coffee Table',
        url: 'https://static.wixstatic.com/media/be2f9f_4222b9771c364174acf74b6583b88d80~mv2.jpg/v1/fill/w_734,h_734,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_4222b9771c364174acf74b6583b88d80~mv2.jpg'
    },
    {
        pattern: /starry/i,
        label: 'Starry Coffee Table',
        url: 'https://static.wixstatic.com/media/be2f9f_59f0e731ed59458aae1959528214d4ca~mv2.jpg/v1/fill/w_665,h_498,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_59f0e731ed59458aae1959528214d4ca~mv2.jpg'
    },
    {
        pattern: /luna\s*stool/i,
        label: 'Luna Stool',
        url: 'https://static.wixstatic.com/media/be2f9f_db74b4993b1d449ab6a0b6b1a3a77e6c~mv2.jpg/v1/fill/w_665,h_498,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/be2f9f_db74b4993b1d449ab6a0b6b1a3a77e6c~mv2.jpg'
    },

    // Add kitchen / wardrobes the same way once their image links are
    // available.
];

const MAX_IMAGES_PER_REPLY = 2;

// Phrases that signal "I want to SEE something" rather than just
// mentioning a product in passing. Only these trigger the history
// fallback below.
const IMAGE_REQUEST_HINT = /\b(show|see|picture|photo|pic|image|look\s*like)\b/i;

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

    const directMatches = matchProducts(lowerMessage);
    if (directMatches.length > 0) return directMatches;

    if (!IMAGE_REQUEST_HINT.test(lowerMessage)) return [];

    const lastTurnText = Array.isArray(history)
        ? history.slice(-2).map(m => (m && m.content) ? m.content : '').join(' ').toLowerCase()
        : '';
    return matchProducts(lastTurnText);
}