// Text coloured letter-by-letter across the seven companies.
//
// "One mint" is exactly seven letters, which is the only reason this works as
// cleanly as it does — each letter takes one company's colour in roster order.
// Punctuation inherits the colour of the letter before it, so the full stop
// after "mint" is Tesla red rather than a stray white pixel at the end of the
// line.
//
// Spaces are emitted as plain text: wrapping them in coloured spans adds
// nothing and breaks the line-break opportunity.

import { COMPANIES } from './ceoData.js';

export default function SevenText({ children, className = '' }) {
  const text = String(children ?? '');
  let letterIndex = 0;
  let lastHue = COMPANIES[0].hue;

  return (
    <span className={`seven-text${className ? ` ${className}` : ''}`}>
      {[...text].map((ch, i) => {
        if (ch === ' ') return ' ';

        // A letter advances the roster; punctuation holds the previous colour.
        if (/[a-z0-9]/i.test(ch)) {
          lastHue = COMPANIES[letterIndex % COMPANIES.length].hue;
          letterIndex += 1;
        }

        return (
          // Index-keyed on purpose: this is a fixed string rendered once, and
          // the characters have no identity of their own to key on.
          <span key={i} style={{ color: lastHue }}>{ch}</span>
        );
      })}
    </span>
  );
}
