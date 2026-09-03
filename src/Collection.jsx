// The full collection, on its own page.
//
// A list, not a wall: every minted CEO as one row with its portrait, its name
// in the company's colour, its number in that CEO's run of a hundred, the
// wallet holding it, and a link to the asset on-chain. Twenty-five to a page.
//
// "Holder" rather than "minter": Core assets carry their current owner and no
// history, so the chain can only say who holds it now.

import { useEffect, useState } from 'react';
import { Logo } from './CeoArt.jsx';
import MintList from './MintList.jsx';
import { COMPANIES, ALLOCATIONS_PER_CEO, TOTAL_SUPPLY } from './ceoData.js';
import { useLive } from './live.js';
import ContractPill from './ContractPill.jsx';

const PAGE = 25;

export default function Collection() {
  const { GALLERY, mintedByCompany, totalMinted } = useLive();
  const [filter, setFilter] = useState(null);
  const [page, setPage] = useState(0);

  // Newest first: the highest serials are the latest mints.
  const shown = (filter === null ? GALLERY : GALLERY.filter((g) => g.companyId === filter))
    .slice()
    .sort((a, b) => b.serial - a.serial || b.companyId - a.companyId);
  const pages = Math.max(1, Math.ceil(shown.length / PAGE));

  // A filter change or a shrinking list must not strand the page past the end.
  useEffect(() => { if (page > pages - 1) setPage(pages - 1); }, [page, pages]);

  const rows = shown.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <>
      <section className="hero">
        <div className="shell hero-shell">
          <h1>The collection</h1>
          <p className="lede">
            {totalMinted} of {TOTAL_SUPPLY} minted across seven CEOs.
          </p>
          <p>
            Every portrait is a pure function of its mint address: the same
            address always produces the same image, and anyone holding one can
            recompute it. Nothing is uploaded or pinned.
          </p>

          <ContractPill />
        </div>
      </section>

      <section>
        <div className="shell">
          <div className="label">
            <span>Filter</span>
            <span>{shown.length} shown</span>
          </div>

          <div className="filter-row">
            <button
              type="button"
              className={`filter-chip${filter === null ? ' on' : ''}`}
              onClick={() => { setFilter(null); setPage(0); }}
            >
              All
            </button>
            {mintedByCompany.map((c) => (
              <button
                key={c.ticker}
                type="button"
                className={`filter-chip${filter === c.id ? ' on' : ''}`}
                style={{ '--brand': c.hue }}
                onClick={() => { setFilter(filter === c.id ? null : c.id); setPage(0); }}
              >
                <Logo companyId={c.id} size={18} />
                {c.ticker}
                <i>{c.minted}</i>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="shell">
          <div className="label">
            <span>{filter === null ? 'Everything minted' : COMPANIES[filter].ceo}</span>
            <span>
              {shown.length === 0 ? 'None yet' : `Page ${page + 1} of ${pages}`}
            </span>
          </div>

          {rows.length === 0 ? (
            <p className="muted">None minted yet.</p>
          ) : (
            <MintList rows={rows} />
          )}

          {pages > 1 && (
            <nav className="pager" aria-label="Pages">
              <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                ← Prev
              </button>
              <span>{page * PAGE + 1}–{Math.min(shown.length, (page + 1) * PAGE)} of {shown.length}</span>
              <button type="button" onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}>
                Next →
              </button>
            </nav>
          )}
        </div>
      </section>
    </>
  );
}
