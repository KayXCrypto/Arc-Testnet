// src/components/TokenRateCard.jsx

import React, { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { Loader, X, Users, DollarSign, Zap, Code, Euro, HardHat } from 'lucide-react';

// 🌟 URL API CỦA ARCSCAN
const ARCSCAN_API_URL = 'https://testnet.arcscan.app/api/v2/tokens';

// Danh sách các token cần hiển thị
const TARGET_TOKENS = ['USDC', 'INAME', 'ZKCODEX', 'EURC'];

// =================================================================
// HÀM HỖ TRỢ FORMAT DỮ LIỆU
// =================================================================

// Hàm định dạng số có dấu phẩy (ví dụ: 1234567 -> 1,234,567)
const formatNumber = (num) => {
    if (typeof num === 'number' || (typeof num === 'string' && !isNaN(parseInt(num)))) {
        return Number(num).toLocaleString('en-US', { maximumFractionDigits: 0 });
    }
    return String(num);
};

// Hàm định dạng Total Supply dựa trên Decimals
const formatSupply = (supplyRaw, decimalsRaw, type) => {
    if (!supplyRaw || supplyRaw === 'null') return 'N/A';

    // Đối với ERC-721 hoặc token không có decimals (thường là NFT), chỉ format số nguyên
    if (type !== 'ERC-20' || !decimalsRaw) {
        return formatNumber(supplyRaw);
    }

    const decimals = Number(decimalsRaw);
    if (decimals === 0) {
        return formatNumber(supplyRaw);
    }

    const supplyString = String(supplyRaw);
    // Pad supply with leading zeros if necessary
    const paddedSupply = supplyString.padStart(decimals + 1, '0');

    // Tìm vị trí dấu thập phân
    const decimalIndex = paddedSupply.length - decimals;

    const integerPart = paddedSupply.slice(0, decimalIndex) || '0';
    const fractionalPart = paddedSupply.slice(decimalIndex);

    // Hiển thị tối đa 4 chữ số thập phân, loại bỏ số 0 thừa
    let formattedFractional = fractionalPart.substring(0, 4).replace(/0+$/, '');

    // Nếu không có phần thập phân, chỉ hiển thị phần nguyên
    if (formattedFractional === '') {
        return formatNumber(integerPart);
    }

    return `${formatNumber(integerPart)}.${formattedFractional}`;
};

// Hàm lấy icon
const getTokenIcon = (symbol) => {
    switch (symbol.toUpperCase()) {
        case 'USDC':
            return <DollarSign className="w-5 h-5 text-green-400" />;
        case 'INAME':
            return <Zap className="w-5 h-5 text-indigo-400" />;
        case 'ZKCODEX':
            return <HardHat className="w-5 h-5 text-purple-400" />;
        case 'EURC':
            return <Euro className="w-5 h-5 text-blue-400" />;
        default:
            return '💰';
    }
};

// =================================================================
// COMPONENT CHÍNH
// =================================================================

const TokenRateCard = () => {
    const [tokenRates, setTokenRates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadTokenPrices = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(ARCSCAN_API_URL);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const apiData = await response.json();

            // Xử lý và lọc dữ liệu từ API
            const filteredRates = TARGET_TOKENS.map(targetSymbol => {
                // Tìm token trong mảng dữ liệu API
                const token = apiData.items.find(t => t.symbol === targetSymbol);

                if (token) {
                    const totalSupplyFormatted = formatSupply(token.total_supply, token.decimals, token.type);

                    return {
                        symbol: token.symbol,
                        name: token.name,
                        totalSupply: totalSupplyFormatted,
                        holders: formatNumber(token.holders_count || 0),
                        icon: getTokenIcon(token.symbol),
                        // Ghi chú: Giá không có sẵn (exchange_rate = null)
                        price: 'N/A',
                    };
                } else {
                    return {
                        symbol: targetSymbol,
                        name: `${targetSymbol} Token`,
                        totalSupply: 'N/A',
                        holders: 'N/A',
                        icon: getTokenIcon(targetSymbol),
                        price: 'N/A',
                    };
                }
            });

            setTokenRates(filteredRates);

        } catch (err) {
            console.error("Lỗi khi tải dữ liệu token:", err);
            setError("Failed to load token data.");
            setTokenRates(TARGET_TOKENS.map(symbol => ({
                symbol,
                name: `${symbol} Token`,
                totalSupply: 'Lỗi',
                holders: 'Lỗi',
                icon: <X className="w-5 h-5 text-red-500" />
            })));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadTokenPrices();
        // Tự động làm mới sau mỗi 30 giây
        const interval = setInterval(loadTokenPrices, 30000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="token-rate-card">
            <h3>Top Token Stats</h3>
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Loader className="w-6 h-6 animate-spin mx-auto text-indigo-400 mb-2" />
                    <p className="text-gray-400 text-sm">Loading on-chain data...</p>
                </div>
            ) : error ? (
                <p className="text-red-400 text-center p-4">{error}</p>
            ) : (
                tokenRates.map(token => (
                    <div key={token.symbol} className="token-item">
                        {/* Cột 1: Icon và Symbol */}
                        <div className="flex items-center flex-grow">
                            <div className="token-icon mr-3">{token.icon}</div>
                            <div className="token-details">
                                <span className="symbol text-lg font-semibold">{token.symbol}</span>
                                <span className="name text-xs text-gray-500">{token.name}</span>
                            </div>
                        </div>

                        {/* Cột 2: Total Supply */}
                        <div className="text-right mr-4">
                            <span className="rate text-base font-bold block">{token.totalSupply}</span>
                            <span className="name text-xs block text-gray-500">Supply</span>
                        </div>

                        {/* Cột 3: Holders Count */}
                        <div className="text-right flex items-center">
                            <Users className="w-4 h-4 text-gray-500 mr-1" />
                            <div className='flex flex-col'>
                                <span className="rate text-base font-bold block">{token.holders}</span>
                                <span className="name text-xs block text-gray-500">Holders</span>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default TokenRateCard;