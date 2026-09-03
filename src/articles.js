// Changelog articles.
//
// Plain data, newest first. Bodies are blocks rather than JSX so an article can
// be written without touching a component:
//
//   { h: 'A heading' }  { p: 'A paragraph.' }  { list: ['a', 'b'] }
//   { note: 'A callout.' }  { code: 'preformatted' }

export const ARTICLES = [
  {
    slug: 'introducing-ceos-fun',
    number: 1,
    title: 'Introducing CEOs.fun',
    version: '1.00.001',
    accent: '#ffffff',
    thumb: null,
    summary:
      'Seven classes, one price, and an hourly drop split evenly across every desk in the collection.',
    body: [
      { p: 'CEOs.fun is one mint with seven possible outcomes. Pay 0.3 SOL, receive a pixel portrait of one of the seven people running the seven largest companies in tech. You do not choose which.' },
      { h: 'No rarity ladder' },
      { p: 'Every CEO has exactly 100 allocations, for 700 in total. That number is identical across all seven, so any spread in how many have been minted is demand rather than scarcity. No class earns more from a drop than another, and none is worth more by construction.' },
      { p: 'This is the one design decision worth being loud about. Tiered collections train people to read an uneven mint chart as a rarity signal; here it is just a popularity contest with no prize attached.' },
      { h: 'The artwork' },
      { p: 'Portraits are drawn on a 48 x 48 grid, exactly twice the resolution of the collection that inspired them. The silhouette is matched cell for cell — straight-sided head, ear on the left, the stepped neck — and the extra resolution is spent on the details that make seven specific people identifiable rather than seven men in glasses.' },
      { p: 'Skin and hair are fixed per CEO. Jacket, shirt, lens tint and accessory vary, and a small share of mints land a variant that abandons the likeness entirely.' },
      { h: 'The drop' },
      { p: 'Every hour, a drop is divided across the collection by desk. Two desks is twice one desk, whichever CEOs they happen to be.' },
      { note: 'The distribution mechanism is not live yet. Everything on the site is populated with example data until it is.' },
    ],
  },
];

/// Look up one article by its slug. Returns undefined when the slug is unknown,
/// which the changelog view renders as a not-found rather than throwing.
export const articleBySlug = (slug) => ARTICLES.find((a) => a.slug === slug);
