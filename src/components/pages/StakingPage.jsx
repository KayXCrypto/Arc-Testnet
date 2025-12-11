// src/components/pages/StakingPage.jsx

import React from 'react';
import { Star, Link, Clock, Zap, Wallet } from 'lucide-react';
import { useAccount } from 'wagmi';
import StakingChartCard from '../StakingChartCard';
import StakeActionCard from '../StakeActionCard';
import TokenRateCard from '../TokenRateCard';
import LockPeriodCard from '../LockPeriodCard';
import '../../styles/staking.css';

// ... (WalletConnectButton và features giữ nguyên)

const StakingPage = () => {
    const { isConnected } = useAccount();

    // Nội dung khi ví đã kết nối (Giao diện Staking thực tế)
    const MainContent = () => (
        // Sử dụng grid 3 cột, với cột trái chiếm 2/3 và cột phải chiếm 1/3 (dựa trên hình ảnh)
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Cột 1 (Chính): Lock Period + Staking & Rewards Form */}
            <div className="lg:col-span-2 space-y-8">

                {/* 1. Thẻ Lock Period/Đếm ngược (Phần trên bên trái) */}
                <LockPeriodCard />

                {/* 2. Form Stake/Unstake/Claim (Phần dưới bên trái) */}
                {/* 🌟 Lưu ý: StakeActionCard cần chứa cả input "Amount to Stake" 
                   và "Lock Period" để khớp với hình ảnh
                */}
                <StakeActionCard />
            </div>

            {/* Cột 2 (Phụ): Biểu đồ + Token Stats */}
            <div className="lg:col-span-1 space-y-8">

                {/* 3. Biểu đồ TVL / Staking (Phần trên bên phải) */}
                <StakingChartCard />

                {/* 4. Tỷ giá Token / Top Token Stats (Phần dưới bên phải) */}
                <TokenRateCard />
            </div>
        </div>
    );

    // ... (DisconnectedContent giữ nguyên)

    return (
        <main className="flex-1 p-8 bg-gray-950 min-h-screen">
            <div className="flex flex-col items-center max-w-7xl pt-4 mx-auto px-4">
                {/* ... (Tiêu đề và Tính năng giữ nguyên) */}

                {/* Khối chính - Hiển thị động */}
                <div className="w-full p-6 lg:p-10 bg-gray-800 rounded-2xl shadow-xl border border-gray-700">
                    <MainContent />
                </div>
            </div>
        </main>
    );
};

export default StakingPage;