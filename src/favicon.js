// The tab icon, generated from the same code that draws the portraits.
//
// One source of truth for the mark: change ceoSprites.js and the favicon
// follows. Nothing is shipped as a file.

import { ceoSvg } from './ceoArt.js';

const SIZE = 64;

/// Which CEO represents the site in the tab. Musk is the most recognisable
/// silhouette of the seven at 16px, which is the only size that matters here.
const BRAND_COMPANY = 6;
const BRAND_SEED = 'ceos-fun';

export function installFavicon() {
  if (typeof document === 'undefined') return;

  const svg = ceoSvg({
    companyId: BRAND_COMPANY,
    address: BRAND_SEED,
    size: SIZE,
    background: '#000000',
  });

  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = 'image/svg+xml';
  link.href = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
