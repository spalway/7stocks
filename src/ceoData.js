// The seven companies, their CEOs, and everything cosmetic that hangs off them.
//
// One module so a colour, a name or a ticker is changed in exactly one place.
// Card borders, building glow, pie slices and logo chips all read from here.

export const COMPANIES = [
  {
    id: 0,
    ticker: 'AMZN',
    stock: 'AMZNx',
    mint: 'Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg',
    company: 'Amazon',
    ceo: 'Andy Jassy',
    role: 'Executive Chairman',
    logo: '/logos/AMZNx.svg',
    // `hue` is the single flat colour used where a gradient will not fit — a
    // pie slice, a 1px border, a glow. `grad` is the full brand ramp.
    hue: '#FF9900',
    hue2: '#232F3E',
    grad: 'linear-gradient(135deg, #FF9900 0%, #FFB84D 45%, #232F3E 100%)',
    blurb: 'The everything store. Ships first, asks later.',
  },
  {
    id: 1,
    ticker: 'GOOGL',
    stock: 'GOOGLx',
    mint: 'XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN',
    company: 'Alphabet',
    ceo: 'Sundar Pichai',
    role: 'Chief Executive Officer',
    logo: '/logos/GOOGLx.svg',
    hue: '#4285F4',
    hue2: '#34A853',
    // The four-colour mark, in order, is the only gradient here that is not a
    // two-stop ramp — it is the one brand people recognise from colour alone.
    grad: 'linear-gradient(135deg, #4285F4 0%, #EA4335 33%, #FBBC05 66%, #34A853 100%)',
    blurb: 'Indexes the world. Sunsets your favourite product.',
  },
  {
    id: 2,
    ticker: 'META',
    stock: 'METAx',
    mint: 'Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu',
    company: 'Meta',
    ceo: 'Mark Zuckerberg',
    role: 'Chief Executive Officer',
    logo: '/logos/METAx.svg',
    hue: '#0064E0',
    hue2: '#00C6FF',
    grad: 'linear-gradient(135deg, #0064E0 0%, #0081FB 50%, #00C6FF 100%)',
    blurb: 'Connects the world. Rebrands when cornered.',
  },
  {
    id: 3,
    ticker: 'NVDA',
    stock: 'NVDAx',
    mint: 'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh',
    company: 'NVIDIA',
    ceo: 'Jensen Huang',
    role: 'Chief Executive Officer',
    logo: '/logos/NVDAx.svg',
    hue: '#76B900',
    hue2: '#A6E22E',
    grad: 'linear-gradient(135deg, #76B900 0%, #A6E22E 60%, #1A1A1A 100%)',
    blurb: 'Sells the shovels. Wears the jacket.',
  },
  {
    id: 4,
    ticker: 'MSFT',
    stock: 'MSFTx',
    mint: 'XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX',
    company: 'Microsoft',
    ceo: 'Satya Nadella',
    role: 'Chief Executive Officer',
    logo: '/logos/MSFT.svg',
    hue: '#00A4EF',
    hue2: '#FFB900',
    grad: 'linear-gradient(135deg, #F25022 0%, #7FBA00 33%, #00A4EF 66%, #FFB900 100%)',
    blurb: 'Quietly won. Put a chat box in everything.',
  },
  {
    id: 5,
    ticker: 'AAPL',
    stock: 'AAPLx',
    mint: 'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp',
    company: 'Apple',
    ceo: 'John Ternus',
    role: 'SVP, Hardware Engineering',
    logo: '/logos/AAPLx.svg',
    hue: '#A2AAAD',
    hue2: '#F5F5F7',
    grad: 'linear-gradient(135deg, #F5F5F7 0%, #A2AAAD 50%, #4D4D4D 100%)',
    blurb: 'Removes a port. Charges you for the adapter.',
  },
  {
    id: 6,
    ticker: 'TSLA',
    stock: 'TSLAx',
    mint: 'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB',
    company: 'Tesla',
    ceo: 'Elon Musk',
    role: 'Chief Executive Officer',
    logo: '/logos/TSLAx.svg',
    hue: '#E82127',
    hue2: '#FF6B6E',
    grad: 'linear-gradient(135deg, #E82127 0%, #FF6B6E 55%, #1A1A1A 100%)',
    blurb: 'Ships the car. Posts through it.',
  },
];

/// Allocations per company. Flat and equal, on purpose.
///
/// No class is rarer or better than another — the pitch is that you are betting
/// on which desk you land on, not on a rarity ladder. Anything that implies a
/// hierarchy (a "legendary" tier, uneven supply) breaks that, so the number is
/// the same for all seven and stated plainly everywhere it appears.
export const ALLOCATIONS_PER_CEO = 100;
export const TOTAL_SUPPLY = COMPANIES.length * ALLOCATIONS_PER_CEO;

/// One flat price. There is no tier to choose, so there is no price to compare.
export const MINT_PRICE_SOL = 0.3;

/// How often the allocation drop runs.
export const DROP_INTERVAL_MINUTES = 5;

/// Where a token's contract is looked at. Solscan rather than an explorer we
/// host, so the link keeps working regardless of what this site is doing.
export const contractUrl = (mint) => `https://solscan.io/token/${mint}`;

export const byTicker = (t) => COMPANIES.find((c) => c.ticker === t) ?? COMPANIES[0];
export const byId = (id) => COMPANIES[id] ?? COMPANIES[0];
