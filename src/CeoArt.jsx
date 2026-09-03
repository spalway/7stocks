// React wrappers for the portraits.
//
// The generator is in ceoArt.js as plain JavaScript, because server/index.mjs
// imports it to answer /img/:ticker/:asset.svg and Node cannot parse JSX.
// Anything that computes belongs there; anything that renders is here.

import { ceoSvg, traitsFor, traitList, seedFrom, hasArt, showcaseTraits, renderSvg, renderQuadSvg, variantTraits } from './ceoArt.js';
import { COMPANIES } from './ceoData.js';

export { ceoSvg, traitsFor, traitList, seedFrom, hasArt, showcaseTraits, renderSvg, renderQuadSvg, variantTraits };

/// Stand-in for a class whose reference image has not landed yet.
export function CeoPending({ companyId = 0 }) {
  return (
    <span className="ceo-pending" aria-label="Portrait pending">
      <Logo companyId={companyId} size={40} />
      <i>Portrait pending</i>
    </span>
  );
}

/// One portrait.
///
/// The SVG is injected as markup rather than built as JSX elements: a 48x48
/// grid merges down to a few hundred rects, and letting React reconcile each of
/// them on every render is a lot of work for an image that never changes for a
/// given address.
///
/// With no `size` the plate fills its container and holds a square aspect
/// ratio, which lets the card grid drive the portrait size instead of every
/// call site hardcoding a pixel value that stops matching the layout.
///
/// `background`: omit for the rolled backdrop, pass a colour to override it, or
/// pass null for transparent.
export function CeoArt({
  companyId = 0, address, size, background, canonical = false, className = '',
}) {
  // Without an address the art still has to be deterministic, or a card would
  // reroll every time React remounted it.
  const seed = address ?? `preview-${companyId}`;
  const html = ceoSvg({ companyId, address: seed, size: size ?? 256, background, canonical });
  const sized = size ? { width: size, height: size } : {};

  return (
    <span
      className={`ceo-art${size ? '' : ' is-fill'}${className ? ` ${className}` : ''}`}
      style={sized}
      // Built entirely from our own palette values — no caller input reaches
      // the markup, only the numeric seed.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/// A company's logo chip. The source SVGs carry the brand's own background, so
/// they are shown as an image and masked in CSS rather than recoloured.
///
/// Circular by default; `square` for the places where the logo sits inside a
/// rectangular tag, so two different corner radii are never left touching.
export function Logo({ companyId = 0, size = 28, square = false, className = '' }) {
  const c = COMPANIES[companyId] ?? COMPANIES[0];
  return (
    <img
      className={`logo-chip${square ? ' is-square' : ''}${className ? ` ${className}` : ''}`}
      src={c.logo}
      alt={c.company}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      loading="lazy"
    />
  );
}
