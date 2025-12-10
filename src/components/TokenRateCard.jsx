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

// Hàm rút gọn số lớn (ví dụ: 1500 -> 1.5K, 1234567 -> 1.23M)
// Decimals ở đây là số lượng chữ số thập phân tối đa khi rút gọn
const formatBigNumber = (num, decimals = 2) => {
    // Chuyển đổi sang Number nếu là chuỗi số hợp lệ
    if (typeof num === 'string' && !isNaN(parseFloat(num))) {
        num = Number(num);
    }
    if (typeof num !== 'number') return String(num);

    const SI_SYMBOL = ["", "K", "M", "B", "T", "P", "E"];

    // Chỉ áp dụng rút gọn nếu số lớn hơn 1000
    if (Math.abs(num) < 1000) {
        // Sử dụng toLocaleString để thêm dấu phẩy ngăn cách hàng nghìn nếu cần
        return num.toLocaleString('en-US', { maximumFractionDigits: decimals });
    }

    // Chọn tiền tố (K, M, B,...)
    const tier = Math.floor(Math.log10(Math.abs(num)) / 3);

    // Tính giá trị sau khi chia
    const scaled = num / Math.pow(1000, tier);

    // Định dạng, loại bỏ số 0 thừa ở phần thập phân và thêm ký hiệu
    return scaled.toFixed(decimals).replace(/\.0+$/, '') + SI_SYMBOL[tier];
};

// Hàm định dạng Total Supply: CHIA DECIMALS và RÚT GỌN K/M/B
const formatSupply = (supplyRaw, decimalsRaw, type) => {
    if (!supplyRaw || supplyRaw === 'null') return 'N/A';

    // Đối với ERC-721 hoặc token không có decimals (thường là NFT), chỉ rút gọn số nguyên thô.
    if (type !== 'ERC-20' || !decimalsRaw || Number(decimalsRaw) === 0) {
        return formatBigNumber(supplyRaw, 0); // Rút gọn, không có thập phân
    }

    const decimals = Number(decimalsRaw);

    // 1. Chuyển supplyRaw thành chuỗi BigInt để tránh mất chính xác khi số quá lớn
    const supplyBigInt = BigInt(supplyRaw);
    const divisor = BigInt(10) ** BigInt(decimals);

    // 2. Để thực hiện phép chia float: Chúng ta chia giá trị thô cho 10^decimals
    // Lưu ý: JavaScript Number chỉ an toàn đến 2^53. Đối với Total Supply rất lớn, có thể mất chính xác.
    // Tuy nhiên, đây là cách phổ biến nhất để chuyển đổi BigInt sang giá trị thực tế.
    const actualSupply = Number(supplyBigInt) / Number(divisor);

    // 3. Rút gọn giá trị đã chia
    // Sử dụng 2 chữ số thập phân khi rút gọn (K/M/B)
    return formatBigNumber(actualSupply, 2);
};

// Hàm lấy icon (giữ nguyên)
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
// COMPONENT CHÍNH (Giữ nguyên logic)
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
                const token = apiData.items.find(t => t.symbol === targetSymbol);

                if (token) {
                    // Total Supply: Đã CHIA DECIMALS và RÚT GỌN K/M/B
                    const totalSupplyFormatted = formatSupply(token.total_supply, token.decimals, token.type);

                    // Holders Count: RÚT GỌN K/M/B
                    const holdersFormatted = formatBigNumber(token.holders_count || 0, 0); // Holders là số nguyên, không cần thập phân

                    return {
                        symbol: token.symbol,
                        name: token.name,
                        totalSupply: totalSupplyFormatted,
                        holders: holdersFormatted,
                        icon: getTokenIcon(token.symbol),
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

                        {/* Cột 2: Total Supply (Đã CHIA DECIMALS và RÚT GỌN K/M/B) */}
                        <div className="text-right mr-4">
                            <span className="rate text-base font-bold block">{token.totalSupply}</span>
                            <span className="name text-xs block text-gray-500">Supply</span>
                        </div>

                        {/* Cột 3: Holders Count (RÚT GỌN K/M/B) */}
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