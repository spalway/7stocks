// ============================================================================
// Palettes.
// ============================================================================
//
// Every entry is a RAMP — base and shadow together — never a bare colour. That
// is what makes a roll safe: you cannot pick a skin and then separately pick a
// shading that clashes with it, because picking the skin already picked the
// shading.
//
// Ramps are keyed by name so a token's traits can be printed without a reverse
// lookup from hex back to a label.

/// The four tones CryptoPunks actually ships. Flat, saturated and few — that
/// restraint is most of what "looks like a Punk" means, and a collection built
/// from a dozen hand-mixed browns reads as something else however accurate any
/// one of those browns is on its own.
export const SKIN_NATURAL = {
  Porcelain: { base: '#EAD9D9', shade: '#C4AEAE' },
  Light: { base: '#DBB180', shade: '#B58C5F' },
  Mid: { base: '#AE8B61', shade: '#8A6B46' },
  Deep: { base: '#713F1D', shade: '#522B11' },
};

/// The loud ones. Rare by design — see SURREAL_SKIN_CHANCE.
export const SKIN_SURREAL = {
  Cyan: { base: '#7FE3E3', shade: '#4AAFAF' },
  Chlorophyll: { base: '#8FD97A', shade: '#5FA34C' },
  Violet: { base: '#C4A3E8', shade: '#9273B8' },
  Bullion: { base: '#E8C96A', shade: '#B89B3E' },
  Ash: { base: '#B8B2AE', shade: '#8A8480' },
  Rose: { base: '#F2A0C4', shade: '#C26E94' },
};

export const HAIR_NATURAL = {
  Black: { base: '#2B2B2F', shade: '#161619' },
  Dark: { base: '#4A3A2C', shade: '#2E2118' },
  Brown: { base: '#6B4A2F', shade: '#48301D' },
  Auburn: { base: '#8A4A2A', shade: '#5E3019' },
  Sand: { base: '#C9A86A', shade: '#A08248' },
  Silver: { base: '#C9C9C9', shade: '#949494' },
  Salt: { base: '#8E9296', shade: '#63676B' },
};

export const HAIR_SURREAL = {
  Signal: { base: '#FF4D4D', shade: '#C22E2E' },
  Toxic: { base: '#7CFF5A', shade: '#4FC233' },
  Magenta: { base: '#FF5CC8', shade: '#C22E94' },
  Ion: { base: '#5CE1FF', shade: '#2BA6C2' },
  Bleach: { base: '#EEF1F4', shade: '#BCC2C8' },
};

/// Frames, lenses, clothing and backdrop roll freely on every mint. None of
/// them carries the likeness, and they are the things a real person actually
/// changes between one photograph and the next.
export const FRAME = {
  Black: { base: '#141417', shade: '#000000' },
  Tortoise: { base: '#5A3A22', shade: '#33200F' },
  Steel: { base: '#9AA0A6', shade: '#6B7075' },
  Gold: { base: '#C9A227', shade: '#8F7218' },
  Crimson: { base: '#8E2230', shade: '#5C121C' },
};

export const LENS = {
  Clear: { base: '#D8E6EF', shade: '#B4C6D1' },
  Glass: { base: '#E8EEF2', shade: '#C4CDD3' },
  Smoke: { base: '#6B6F75', shade: '#4A4D52' },
  Amber: { base: '#C99B4A', shade: '#9A7431' },
  Blush: { base: '#C98A9B', shade: '#9A6273' },
};

export const CLOTH = {
  Charcoal: { base: '#3A4048', shade: '#262B31' },
  Navy: { base: '#2B3A55', shade: '#1B2637' },
  Black: { base: '#1E1E22', shade: '#111114' },
  Slate: { base: '#4E5661', shade: '#353B44' },
  Graphite: { base: '#2F3336', shade: '#1D2022' },
  Bone: { base: '#D9D5CC', shade: '#AFABA2' },
  Oxblood: { base: '#5A2230', shade: '#3A151F' },
  Forest: { base: '#274236', shade: '#182B22' },
  Electric: { base: '#1F4FD8', shade: '#143296' },
  Hazard: { base: '#D9820F', shade: '#A15E08' },
};

/// Ties and shirts roll on their own, so a navy suit can carry a red tie. Both
/// are single colours: at this size a tie is a five-cell bar.
export const TIE = {
  Black: '#111114',
  Navy: '#1F2F5A',
  Burgundy: '#6A1E2C',
  Red: '#C8202A',
  Gold: '#C9A227',
  Forest: '#245C3A',
  Silver: '#A9AFB6',
  Purple: '#5B2E8C',
  Pink: '#E27BA6',
  Teal: '#1C7C84',
  Orange: '#E0701A',
};

export const SHIRT = {
  White: '#F4F4F4',
  Sky: '#CFE3F5',
  Cream: '#F1E8D2',
  Pink: '#F4D3DC',
  Lavender: '#E0D6F0',
  Black: '#1B1B1E',
};

/// Backdrop. Punk backgrounds are one flat colour and nothing else, so this is
/// the one table that is not a ramp.
export const BACKDROP = {
  Slate: '#638596',
  Ink: '#1F2933',
  Sand: '#C7B199',
  Moss: '#5C7A5C',
  Plum: '#6B5570',
  Rust: '#9A5B44',
  Steel: '#7E8A94',
  Midnight: '#12161C',
};

export const EYE = {
  Coal: '#2A2A2E',
  Hazel: '#3B2A1B',
  Green: '#2F5D43',
  Blue: '#2B4A78',
  Grey: '#5A6068',
};

/// Which ramps each CEO wears when nothing surreal is rolled.
///
/// This is the likeness. The 48x48 grid was spent making seven specific people
/// identifiable, and rolling Jensen's hair brown or Zuckerberg's skin deep
/// throws that away — so the canonical pair is the default, and a roll replaces
/// it outright rather than blending with it.
export const CANON = [
  { skin: 'Light', hair: 'Salt', eye: 'Hazel' },      // Jassy
  { skin: 'Mid', hair: 'Black', eye: 'Coal' },        // Pichai — black beard
  { skin: 'Porcelain', hair: 'Brown', eye: 'Blue' },  // Zuckerberg
  { skin: 'Light', hair: 'Silver', eye: 'Coal' },     // Huang
  { skin: 'Deep', hair: 'Black', eye: 'Coal' },       // Nadella
  { skin: 'Light', hair: 'Dark', eye: 'Green' },      // Ternus
  { skin: 'Porcelain', hair: 'Brown', eye: 'Hazel' }, // Musk
];

/// How often a surreal skin lands, in percent.
///
/// Rare on purpose. A cyan Jensen is a hit when it is one in seven; when it is
/// every other mint the collection stops reading as CEOs and starts reading as
/// a palette test. Naturals carry the rest.
export const SURREAL_SKIN_CHANCE = 15;

/// And how often surreal HAIR lands.
///
/// Deliberately the same low number rather than a free roll across the full
/// range. Hair colour does as much identifying work here as skin does —
/// Jensen's silver and Zuckerberg's brown are two of the strongest signals in
/// the set — so a free roll costs the likeness for exactly the reason a free
/// roll on skin would. Set this to 100 for the free-roll behaviour instead.
export const SURREAL_HAIR_CHANCE = 15;

/// Full-body variants that abandon the likeness entirely. Cosmetic only: they
/// carry no extra allocation and no different claim on a drop.
export const VARIANTS = {
  0: {
    name: 'Gold Standard',
    skin: { base: '#E3C169', shade: '#B08F35' },
    hair: { base: '#8A7226', shade: '#5E4C17' },
    eye: '#2A2A2E',
  },
  1: {
    name: 'Sundar 2.0',
    skin: { base: '#9FB8E8', shade: '#7590C2' },
    hair: { base: '#DBE4F5', shade: '#A8B6CF' },
    eye: '#2B62C9',
  },
  2: {
    name: 'Zombie',
    skin: { base: '#8FBF7A', shade: '#659055' },
    hair: { base: '#4A4230', shade: '#2F2A1E' },
    eye: '#1A1A1A',
  },
  3: {
    name: 'Evil',
    skin: { base: '#8C6A55', shade: '#66493A' },
    hair: { base: '#2A2A2E', shade: '#151517' },
    eye: '#FF1F1F',
  },
  4: {
    name: 'Cloud Native',
    skin: { base: '#A8D8E8', shade: '#7BACBD' },
    hair: { base: '#2B3A44', shade: '#18232A' },
    eye: '#00A4EF',
  },
  5: {
    name: 'Monochrome',
    skin: { base: '#D6D6D6', shade: '#A8A8A8' },
    hair: { base: '#3D3D3D', shade: '#222222' },
    eye: '#111111',
    mono: true,
  },
  6: {
    name: 'Cyborg',
    skin: { base: '#B9C2CC', shade: '#8B949E' },
    hair: { base: '#5C6773', shade: '#3D4650' },
    eye: '#FF2B2B',
  },
};

/// How often a full variant lands, in percent.
export const VARIANT_CHANCE = 4;

// ------------------------------------------------------------------ roll slots
//
// Every ROLLED table draws from a fixed-length slot list, never from
// Object.keys(table). The reason is that `r() % keys.length` folds the table's
// LENGTH into the mapping: add one colour and every existing token draws a
// different entry. Fixing the length at 16 decouples the two, so the palette can
// grow after mint.
//
// Slots are filled with deliberate repeats rather than padding, which makes
// rarity explicit instead of an accident of how many colours a table happens to
// hold. Black frames are common because six slots say so, not because FRAME has
// five entries.
//
// TO ADD A COLOUR AFTER MINT: overwrite ONE slot that currently holds a repeat.
// Only tokens that drew that exact index change; everything else is untouched.
// Never lengthen these arrays — 16 is the contract.
//
// SKIN_NATURAL and HAIR_NATURAL are absent on purpose. They are looked up by
// name from CANON and never rolled, so they carry no length dependency and can
// be extended freely.

export const CAPACITY = 16;

export const SKIN_SURREAL_SLOTS = [
  'Cyan', 'Chlorophyll', 'Violet', 'Bullion', 'Ash', 'Rose',
  'Cyan', 'Chlorophyll', 'Violet', 'Bullion', 'Ash', 'Rose',
  'Cyan', 'Chlorophyll', 'Violet', 'Bullion',
];

export const HAIR_SURREAL_SLOTS = [
  'Signal', 'Toxic', 'Magenta', 'Ion', 'Bleach',
  'Signal', 'Toxic', 'Magenta', 'Ion', 'Bleach',
  'Signal', 'Toxic', 'Magenta', 'Ion', 'Bleach',
  'Signal',
];

/// Black dominates because most people wearing glasses wear black ones.
export const FRAME_SLOTS = [
  'Black', 'Black', 'Black', 'Black', 'Black', 'Black',
  'Tortoise', 'Tortoise', 'Tortoise',
  'Steel', 'Steel', 'Steel',
  'Gold', 'Gold',
  'Crimson', 'Crimson',
];

/// Clear glass most of the time; a tint reads as a deliberate choice rather
/// than a colour bug.
export const LENS_SLOTS = [
  'Clear', 'Clear', 'Clear', 'Clear', 'Clear',
  'Glass', 'Glass', 'Glass', 'Glass', 'Glass',
  'Smoke', 'Smoke',
  'Amber', 'Amber',
  'Blush', 'Blush',
];

/// Corporate on purpose — the joke only lands if most of them look like they
/// came from a press release.
export const CLOTH_SLOTS = [
  'Black', 'Black', 'Black', 'Black',
  'Charcoal', 'Charcoal',
  'Navy', 'Navy',
  'Graphite', 'Graphite',
  'Slate', 'Bone', 'Oxblood', 'Forest', 'Electric', 'Hazard',
];

/// Slate is the reference blue and should dominate the way the Punk blue does.
export const BACKDROP_SLOTS = [
  'Slate', 'Slate', 'Slate', 'Slate',
  'Ink', 'Ink',
  'Sand', 'Sand',
  'Moss', 'Moss',
  'Plum', 'Plum',
  'Steel', 'Steel',
  'Rust', 'Midnight',
];

/// Black ties dominate for the same reason black suits do.
export const TIE_SLOTS = [
  'Black', 'Black', 'Black', 'Black', 'Black',
  'Navy', 'Navy', 'Burgundy', 'Burgundy', 'Red',
  'Gold', 'Forest', 'Silver', 'Purple', 'Pink', 'Teal',
];

export const SHIRT_SLOTS = [
  'White', 'White', 'White', 'White', 'White', 'White', 'White', 'White',
  'White', 'White', 'Sky', 'Sky', 'Cream', 'Pink', 'Lavender', 'Black',
];

/// Pick a named entry from a ramp table using the supplied random stream.
///
/// Draws against the slot list, not the table, so the table can grow without
/// re-mapping the collection. See the note above.
export function pick(slots, table, r) {
  const name = slots[r() % slots.length];
  const v = table[name];
  return typeof v === 'string' ? { name, base: v, shade: v } : { name, ...v };
}
