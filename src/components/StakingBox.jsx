import React from 'react';
import { Wallet, Star, Link, Clock, Zap } from 'lucide-react';
import { useAccount } from 'wagmi'; // Import hook kiểm tra trạng thái
import WalletConnectButton from './WalletConnectButton'; // Import nút kết nối

// Danh sách các tính năng
const features = [
  { icon: '🌱', text: '20% APY' },
  { icon: <Link className="w-4 h-4 text-white" />, text: 'Multi-chain' },
  { icon: <Zap className="w-4 h-4 text-white" />, text: 'Instant Rewards' },
  { icon: <Clock className="w-4 h-4 text-white" />, text: 'No Lock Period' },
];

const StakingBox = () => {
  // Lấy trạng thái kết nối
  const { isConnected } = useAccount();

  // Nội dung khi ví đã kết nối (Placeholder cho bảng Staking thực tế)
  const ConnectedContent = () => (
    <div className="text-center">
      <h3 className="mb-4 text-2xl font-semibold text-green-400">
        Wallet Connected! ✅
      </h3>
      <p className="mb-8 text-gray-300">
        You are ready to stake. Please enter the amount below.
      </p>
      {/* Vị trí cho form staking thực tế */}
      <div className="p-4 bg-gray-900 rounded-lg border border-green-500/30">
        <p className="text-gray-400">Your Staking Interface goes here...</p>
      </div>
      <button
        className="mt-6 px-8 py-3 font-bold text-white transition duration-300 rounded-full text-lg bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 shadow-lg shadow-green-500/30"
      >
        Stake Now
      </button>
    </div>
  );

  // Nội dung khi ví chưa kết nối (Yêu cầu kết nối)
  const DisconnectedContent = () => (
    <div className="text-center">
      <div className="p-8 mx-auto w-fit bg-gray-900 rounded-xl mb-8 border border-gray-700/50">
        <Wallet className="w-10 h-10 mx-auto text-purple-400" />
      </div>
      
      <h3 className="mb-4 text-2xl font-semibold text-white">
        Connect Your Wallet to Start Staking
      </h3>
      
      <p className="mb-8 text-gray-400">
        Join thousands of users earning passive income through DeFi staking
      </p>

      {/* Nút Connect Wallet lớn - sử dụng WalletConnectButton */}
      <WalletConnectButton />
    </div>
  );

  return (
    <div className="flex flex-col items-center max-w-4xl pt-10 mx-auto">
      {/* Tiêu đề dApp và Thẻ tính năng (Giữ nguyên) */}
      <h2 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-indigo-500 mb-6">
        DeFi Simple dApp
      </h2>
      <div className="flex items-center mb-10 text-lg font-medium text-gray-300">
        <Star className="w-5 h-5 mr-2 text-yellow-400" fill="#facc15" />
        Joke to Earn
        <span className="ml-2 text-blue-400 cursor-pointer text-sm">ⓘ</span>
      </div>
      <div className="flex justify-center space-x-6 mb-12">
        {features.map((feature) => (
          <div
            key={feature.text}
            className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-gray-800 rounded-full border border-purple-500/20"
          >
            {typeof feature.icon === 'string' ? feature.icon : feature.icon}
            <span className="ml-2">{feature.text}</span>
          </div>
        ))}
      </div>

      {/* Khối chính - Hiển thị động */}
      <div className="w-full p-10 bg-gray-800 rounded-2xl shadow-xl border border-gray-700">
        {isConnected ? <ConnectedContent /> : <DisconnectedContent />}
      </div>
    </div>
  );
};

export default StakingBox;