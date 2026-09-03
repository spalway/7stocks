// Shell and router. One `useChain()` for the whole app, handed to the pages
// through ChainContext so each reads live state through `useLive()`.

import { useEffect, useState } from 'react';
import { Link, useRoute } from './router.jsx';
import Skyline from './Skyline.jsx';
import Landing from './Landing.jsx';
import Mint from './Mint.jsx';
import Docs from './Docs.jsx';
import Changelog from './Changelog.jsx';
import Collection from './Collection.jsx';
import { useChain } from './useChain.js';
import { ChainContext } from './live.js';

const TWITTER = 'https://x.com/ceosfun';
const HANDLE = '@ceosfun';

/// lucide dropped its brand icons, and its `X` is the close cross, not this.
function XLogo(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const short = (k) => `${k.toBase58().slice(0, 4)}…${k.toBase58().slice(-4)}`;

function ConnectButton({ chain }) {
  const { wallet, connected, connect, disconnect, select, wallets } = chain;
  const [hover, setHover] = useState(false);
  const [busy, setBusy] = useState(false);
  const ready = wallets?.filter((w) => w.readyState === 'Installed') ?? [];

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (connected) {
        await disconnect();
      } else if (wallet) {
        await connect();
      } else if (ready.length) {
        // `autoConnect` on the provider means selecting is enough; the adapter
        // raises the wallet's own approval prompt from here.
        select(ready[0].adapter.name);
      } else {
        window.open('https://solana.com/solana-wallets', '_blank', 'noreferrer');
      }
    } catch {
      // The adapter surfaces its own errors; a rejected prompt is not worth showing.
    } finally {
      setBusy(false);
    }
  };

  const label = connected && wallet ? (hover ? 'Disconnect' : short(wallet)) : 'Connect';
  return (
    <button
      className={`connect${connected ? ' on' : ''}`}
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {label}
    </button>
  );
}

export default function App() {
  const route = useRoute();
  const [section, param] = route.split('/');
  const chain = useChain();

  // One clock for the whole page, so every countdown agrees.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Re-read the chain shortly after each cycle boundary, when the pot and the
  // vault balances have just moved.
  useEffect(() => {
    const secs = secondsToNextDropSafe(now);
    if (secs !== 15) return;
    chain.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.floor(now / 1000)]);

  return (
    <ChainContext.Provider value={chain}>
      <Skyline />

      <div className="page">
        <header className="masthead">
          <div className="nav-shell">
            <Link to="/" className="wordmark" aria-label="CEOs.fun home">
              CEOs<b>.fun</b>
            </Link>

            <nav className="nav">
              <Link to="/mint" className={section === 'mint' ? 'active' : ''}>Mint</Link>
              <Link to="/docs" className={section === 'docs' ? 'active' : ''}>Docs</Link>
              <Link to="/collection" className={section === 'collection' ? 'active' : ''}>Collection</Link>
            </nav>

            <a className="nav-x" href={TWITTER} target="_blank" rel="noreferrer" aria-label="CEOs.fun on X">
              <XLogo width={12} height={12} />
              <span>{HANDLE}</span>
            </a>

            <ConnectButton chain={chain} />
          </div>
        </header>

        {chain.stale && (
          <div className="stale-note" role="status">
            RPC unreachable. Showing the last mirrored state. Minting and sweeping are paused until it returns.
          </div>
        )}

        {section === 'mint' ? (
          <Mint now={now} />
        ) : section === 'docs' ? (
          <Docs />
        ) : section === 'collection' ? (
          <Collection />
        ) : section === 'changelog' ? (
          <Changelog slug={param} />
        ) : (
          <Landing now={now} />
        )}

        <footer className="site-foot">
          <span>CEOs.fun</span>
          <span>Parody. Not affiliated with any company or person depicted.</span>
        </footer>
      </div>
    </ChainContext.Provider>
  );
}

// Fifteen seconds past a five-minute mark: the cycle has had time to land.
function secondsToNextDropSafe(now) {
  const period = 5 * 60 * 1000;
  return Math.floor((period - (now % period)) / 1000);
}
