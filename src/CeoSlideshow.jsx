// A slideshow of the seven classes beside the opening copy.
//
// Each slide is one face cut into four quadrants, and each quadrant is the
// same face in a different skin and jacket: the reference top-left, then
// cyan, pink and green. Outline, hair and backdrop are identical across the
// four, and all four are painted into ONE svg, so they meet without a seam. The name tag under it is the
// one from the cards below.
//
// One clock, one CSS animation: the slide fades and drifts in, holds, and
// fades out over PERIOD; the index advances on the same period. Keying the
// slide on the index restarts the animation for every face.

import { useEffect, useState } from 'react';
import { renderQuadSvg, showcaseTraits, hasArt, CeoPending, Logo } from './CeoArt.jsx';
import { COMPANIES } from './ceoData.js';

const PERIOD = 4200;

function Quadrants({ companyId }) {
  return (
    <span
      className="slide-quads"
      aria-hidden
      dangerouslySetInnerHTML={{ __html: renderQuadSvg({ companyId, ways: showcaseTraits(companyId), size: 256 }) }}
    />
  );
}

export default function CeoSlideshow() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % COMPANIES.length), PERIOD);
    return () => clearInterval(id);
  }, []);

  const c = COMPANIES[index];

  return (
    <aside
      className="slideshow"
      style={{ '--brand': c.hue, '--brand-grad': c.grad, '--period': `${PERIOD}ms` }}
      aria-label="CEO preview"
    >
      <div className="slide" key={c.id}>
        <div className="slide-art">
          {hasArt(c.id) ? <Quadrants companyId={c.id} /> : <CeoPending companyId={c.id} />}
        </div>

        <div className="ceo-card-plate">
          <Logo companyId={c.id} size={24} square />
          <span className="ceo-card-names">
            <b>{c.ticker}</b>
            <em>{c.ceo}</em>
          </span>
        </div>
      </div>

      <div className="slide-dots" aria-hidden>
        {COMPANIES.map((d) => (
          <i key={d.id} className={d.id === index ? 'on' : ''} style={{ '--dot': d.hue }} />
        ))}
      </div>
    </aside>
  );
}
