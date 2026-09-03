// The token's contract address as a dark button that copies itself.
//
// Sits under the opening copy on the Mint, Docs and Collection pages, as wide
// as the body text and no wider. Dark grey, white text; on hover the edge
// glows with the four-colour Google ramp, which is the one gradient the site
// animates. Before launch it reads "Contract: pending" and does nothing.

import { useEffect, useState } from 'react';
import { TOKEN_CA } from './live.js';

export default function ContractPill() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const id = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(id);
  }, [copied]);

  if (!TOKEN_CA) {
    return (
      <div className="ca-wrap">
        <div className="ca-btn is-idle" aria-live="polite">
          <span className="ca-label">Contract:</span>
          <span className="ca-text">pending</span>
        </div>
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(TOKEN_CA);
      setCopied(true);
      return;
    } catch {
      // Async clipboard is refused on plain http and in some embedded views.
    }
    const range = document.createRange();
    range.selectNodeContents(document.querySelector('.ca-text'));
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* unsupported */ }
    if (ok) setCopied(true);
  };

  return (
    <div className="ca-wrap">
      <button
        className={`ca-btn${copied ? ' is-copied' : ''}`}
        type="button"
        onClick={copy}
        title="Copy contract address"
      >
        <span className="ca-label">Contract:</span>
        <span className="ca-text">{TOKEN_CA}</span>
        <span className="ca-action">{copied ? 'Copied' : 'Copy'}</span>
      </button>
    </div>
  );
}
