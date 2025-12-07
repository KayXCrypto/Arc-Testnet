import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  zora,
  arc,
} from 'wagmi/chains';

// Khai báo các chuỗi khối mà dApp của bạn sẽ hỗ trợ
const chains = [
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  zora,
  arc,
  // Thêm các testnet như sepolia nếu cần thiết
];

// Lấy ID dự án WalletConnect từ biến môi trường (RẤT QUAN TRỌNG)
// Để sử dụng WalletConnect, bạn cần đăng ký để có Project ID.
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '67f7f3cfa391f81c7374a000dfacc04e';

// Hàm cấu hình mặc định (bao gồm các ví phổ biến như Metamask, Coinbase Wallet, WalletConnect)
export const config = getDefaultConfig({
  appName: 'DeFi  Dapp', // Tên dApp của bạn
  projectId,
  chains,
  ssr: true, // Quan trọng cho các ứng dụng Universal/SSR
});

export { chains };