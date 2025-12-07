import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  mainnet,
  sepolia,
  goerli,
  polygon,
  polygonMumbai,
  bsc,
  bscTestnet,
  avalanche,
  avalancheFuji,
  optimism,
  optimismGoerli,
  arbitrum,
  arbitrumGoerli,
} from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'ARC Circle',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // Lấy từ cloud.walletconnect.com
  chains: [
    mainnet,
    sepolia,
    goerli,
    polygon,
    polygonMumbai,
    bsc,
    bscTestnet,
    avalanche,
    avalancheFuji,
    optimism,
    optimismGoerli,
    arbitrum,
    arbitrumGoerli,
  ],
});