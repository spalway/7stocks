import { Buffer } from 'buffer';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import App from './App.jsx';
import { signingConnection } from './useChain.js';
import { installFavicon } from './favicon.js';
import './styles.css';

// web3.js v1 reaches for this off the global object.
globalThis.Buffer = Buffer;

// Independent of React: the tab icon outlives any particular page.
installFavicon();

// An empty wallet list on purpose. Every wallet worth supporting implements the
// Wallet Standard, which the provider discovers from the page itself.
const WALLETS = [];

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConnectionProvider endpoint={signingConnection.rpcEndpoint}>
      <WalletProvider wallets={WALLETS} autoConnect>
        <App />
      </WalletProvider>
    </ConnectionProvider>
  </React.StrictMode>,
);
