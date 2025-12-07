import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {

  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  bsc,
  sepolia,
  bscTestnet,
  polygonMumbai,
  optimismGoerli,
  arbitrumGoerli,
  arcTestnet,
} from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

const config = getDefaultConfig({
  appName: 'ARC Protocol',
  projectId: 'YOUR_PROJECT_ID', // Get from https://cloud.walletconnect.com
  chains: [
    // Mainnet chains

    mainnet,
    polygon,
    optimism,
    arbitrum,
    base,
    bsc,
    // Testnet chains
    sepolia,
    bscTestnet,
    polygonMumbai,
    optimismGoerli,
    arbitrumGoerli,
    arcTestnet,
  ],
  ssr: false,
});

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);