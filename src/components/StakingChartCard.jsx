import React, { useState } from 'react';
import { useReadContract, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
// 🌟 IMPORT RECHARTS COMPONENTS
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
// 🌟 IMPORT HOOK DỮ LIỆU MOCK
import useFetchData from '../hooks/useFetchData'; // Đảm bảo đường dẫn chính xác
import { arcTestnet } from '../config/chains';

// THAY THẾ BẰNG CÁC ĐỊA CHỈ HỢP ĐỒNG THẬT CỦA BẠN (Đã OK)
const STAKING_CONTRACT_ADDRESS = '0x75e50ccfc547649b831089ae50A7c53EF7D86283';
const STAKE_TOKEN_ADDRESS = '0x3600000000000000000000000000000000000000';
const TOKEN_DECIMALS = 6;

// ABI tối thiểu để lấy Symbol
const ERC20_ABI = [
    { "type": "function", "name": "symbol", "inputs": [], "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view" },
];

const formatNumber = (num, decimals = 2) => {
    if (typeof num !== 'number') return '0';
    return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

// 🌟 Component Biểu đồ Động MỚI
const DynamicChart = ({ data, isLoading }) => {
    if (isLoading) {
        return (
            <div className="chart-loading-state" style={{ height: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#A0AEC0' }}>
                <p>Loading data history...</p>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="chart-loading-state" style={{ height: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'orange' }}>
                <p>Không tìm thấy dữ liệu lịch sử Staking.</p>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" vertical={false} />
                <XAxis dataKey="date" stroke="#A0AEC0" tickLine={false} axisLine={false} />
                <YAxis
                    dataKey="tvl"
                    stroke="#A0AEC0"
                    // Định dạng trục Y thành triệu (M) để dễ đọc
                    tickFormatter={(value) => `${formatNumber(value / 1000000, 1)}M`}
                    tickLine={false}
                    axisLine={false}
                />
                <Tooltip
                    formatter={(value) => [`${formatNumber(value)} USDC`, 'TVL']}
                    contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #7E57FF', borderRadius: '4px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
                <Line
                    type="monotone"
                    dataKey="tvl"
                    stroke="#7E57FF"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: '#FF7B00' }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
};
// 🌟 KẾT THÚC Component Biểu đồ Động MỚI


const StakingChartCard = () => {
    // 🌟 STATE MỚI: Quản lý lựa chọn khung thời gian
    const [timeframe, setTimeframe] = useState('Staked');

    // 🌟 HOOK MỚI: Lấy dữ liệu lịch sử
    const { data: historyData, isLoading: isLoadingHistory } = useFetchData(timeframe);

    // 1. Lấy Symbol của Stake Token
    const { data: stakeSymbol = arcTestnet.nativeCurrency.symbol } = useReadContract({
        address: STAKE_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'symbol',
        query: { enabled: !!STAKE_TOKEN_ADDRESS },
    });

    // 2. Đọc số dư (TVL) hiện tại
    const { data: tvlBalance, isLoading: isLoadingTvl } = useBalance({
        address: STAKING_CONTRACT_ADDRESS,
        token: STAKE_TOKEN_ADDRESS,
        query: {
            enabled: !!STAKING_CONTRACT_ADDRESS && !!STAKE_TOKEN_ADDRESS,
            refetchInterval: 30000,
        },
    });

    const tvlValue = tvlBalance?.value || 0n;
    const tvlFormatted = formatNumber(parseFloat(formatUnits(tvlValue, TOKEN_DECIMALS)), 2);


    return (
        <div className="chart-card">
            <div className="chart-header">
                <h3 className="card-title">Staking</h3>
                {isLoadingTvl ? (
                    <span className="staking-value">Loading TVL...</span>
                ) : (
                    <span className="staking-value">
                        {tvlFormatted} {stakeSymbol} <small>(Total Staked)</small>
                    </span>
                )}

                <div className="chart-controls">
                    {/* Nút Staked */}
                    <button
                        className={`control-btn ${timeframe === 'Staked' ? 'active' : ''}`}
                        onClick={() => setTimeframe('Staked')}
                    >
                        Staked
                    </button>
                    {/* Nút Last week */}
                    <button
                        className={`control-btn ${timeframe === 'Last week' ? 'active' : ''}`}
                        onClick={() => setTimeframe('Last week')}
                    >
                        Last week
                    </button>
                </div>
            </div>

            {/* 🌟 SỬ DỤNG COMPONENT BIỂU ĐỒ ĐỘNG */}
            <div className="chart-area-placeholder">
                <DynamicChart data={historyData} isLoading={isLoadingHistory} />
            </div>
        </div>
    );
};

export default StakingChartCard;