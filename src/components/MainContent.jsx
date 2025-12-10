// src/MainContent.jsx - Updated with Market Selection Handler

import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import TabNavigation from './TabNavigation';
import StatsCards from './StatsCards';
import EModePromoBanner from './EModePromoBanner';
import AssetControls from './AssetControls';
import AssetTable from './AssetTable';
import AssetTabBottom from './AssetTabBottom';
import ContactFooter from './ContactFooter';
import defaultTokenIcon from '../assets/euro.png';
/* ============================================
   CONTRACT CONFIGURATION
============================================ */
const CONTRACT_ADDRESSES = {
  LENDING_POOL: "0xB3D70ab685F643FFbfA0e0A8B2A2709404845D13",
};

const LENDING_ABI = [
  "function getUserDepositBalance(address user, address token) view returns (uint256)",
  "function getUserBorrowBalance(address user, address token) view returns (uint256)",
  "function getSupplyRate(address token) view returns (uint256)",
  "function getBorrowRate(address token) view returns (uint256)",
  "function getAllMarkets() view returns (address[])",
  "function allMarkets(uint256) view returns (address)",
  "function markets(address token) view returns (bool isListed, uint256 collateralFactor, uint256 liquidationThreshold, uint256 liquidationBonus, uint256 reserveFactor, uint256 totalDeposits, uint256 totalBorrows, uint256 totalReserves, uint256 borrowIndex, uint256 depositIndex, uint256 lastUpdateTimestamp, address priceFeed)"
];

const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)"
];

/* ============================================
   HELPER FUNCTIONS
============================================ */
const formatNum = (v, d = 18, prec = 2) => {
  const num = parseFloat(ethers.formatUnits(v || 0, d)) || 0;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: prec,
  }).format(num);
};

const mockUsdValue = (symbol, amount, decimals = 18) => {
  const num = parseFloat(ethers.formatUnits(amount || 0, decimals));
  if (symbol === "USDC") return `$${(num * 1).toFixed(2)}`;
  if (symbol === "EURC") return `$${(num * 1.08).toFixed(2)}`;
  if (symbol === "TUSD") return `$${(num * 1).toFixed(2)}`;
  return `$${num.toFixed(2)}`;
};

const getTokenIcon = (symbol) => {
  const icons = {
    'USDC': 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=040',
    'EURC': defaultTokenIcon,
    'TUSD': 'https://cryptologos.cc/logos/trueusd-tusd-logo.png'
  };
  return icons[symbol] || 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=040';
};

/* ============================================
   MAIN COMPONENT
============================================ */
export default function MainContent({ onMarketSelect }) { // 🌟 NHẬN PROP
  const [activeTab, setActiveTab] = useState('assets');
  const [searchTerm, setSearchTerm] = useState('');
  const [pausedAssets, setPausedAssets] = useState(false);
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ============================================
     FETCH MARKETS FROM BLOCKCHAIN
  ============================================ */
  const fetchMarketsFromBlockchain = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error('MetaMask không được phát hiện. Vui lòng cài đặt MetaMask.');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const lending = new ethers.Contract(
        CONTRACT_ADDRESSES.LENDING_POOL,
        LENDING_ABI,
        provider
      );

      // Get market addresses
      let marketAddresses = [];
      try {
        marketAddresses = await lending.getAllMarkets();
      } catch (err) {
        console.log('Fallback to allMarkets array iteration');
        // Fallback: iterate through allMarkets array
        let i = 0;
        while (true) {
          try {
            const addr = await lending.allMarkets(i);
            if (!addr || addr === ethers.ZeroAddress) break;
            marketAddresses.push(addr);
            i++;
          } catch {
            break;
          }
        }
      }

      console.log('Found market addresses:', marketAddresses);

      // Fetch market data for each token
      const marketsFetched = [];
      for (const tokenAddr of marketAddresses) {
        try {
          const token = new ethers.Contract(tokenAddr, ERC20_ABI, provider);
          const [symbol, decimals] = await Promise.all([
            token.symbol(),
            token.decimals()
          ]);

          const marketData = await lending.markets(tokenAddr);
          if (!marketData.isListed) {
            console.log(`Market ${symbol} is not listed, skipping...`);
            continue;
          }

          const [supplyRate, borrowRate] = await Promise.all([
            lending.getSupplyRate(tokenAddr),
            lending.getBorrowRate(tokenAddr)
          ]);

          const supplyAPY = (parseFloat(ethers.formatUnits(supplyRate, 18)) * 100).toFixed(2);
          const borrowAPY = (parseFloat(ethers.formatUnits(borrowRate, 18)) * 100).toFixed(2);

          const totalSup = marketData.totalDeposits;
          const totalBor = marketData.totalBorrows;
          const liquidity = totalSup - totalBor;

          marketsFetched.push({
            name: symbol,
            symbol,
            decimals: Number(decimals),
            address: tokenAddr,
            icon: getTokenIcon(symbol),
            totalSupply: formatNum(totalSup, decimals),
            totalSupplyRaw: totalSup,
            totalSupplyUSD: mockUsdValue(symbol, totalSup, decimals),
            supplyAPY: `${supplyAPY}%`,
            totalBorrow: formatNum(totalBor, decimals),
            totalBorrowRaw: totalBor,
            totalBorrowUSD: mockUsdValue(symbol, totalBor, decimals),
            borrowAPY: `${borrowAPY}%`,
            liquidity: formatNum(liquidity, decimals)
          });

          console.log(`✅ Loaded market: ${symbol}`, {
            totalSupply: formatNum(totalSup, decimals),
            totalBorrow: formatNum(totalBor, decimals),
            supplyAPY,
            borrowAPY
          });
        } catch (err) {
          console.error("Error fetching market:", tokenAddr, err);
        }
      }

      if (marketsFetched.length === 0) {
        throw new Error('Không tìm thấy markets nào. Vui lòng kiểm tra kết nối mạng.');
      }

      setMarkets(marketsFetched);
      console.log('✅ Successfully loaded', marketsFetched.length, 'markets');
    } catch (error) {
      console.error('Error fetching markets:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarketsFromBlockchain();
  }, [fetchMarketsFromBlockchain]);

  // Filter markets based on search term
  const filteredAssets = markets.filter(asset =>
    asset.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 🌟 HÀM XỬ LÝ KHI CLICK VÀO MARKET
  const handleMarketClick = (asset) => {
    if (onMarketSelect) {
      onMarketSelect(asset.address);
    }
  };

  return (
    <>
      <main className="flex-1 p-8 bg-gray-950">
        <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
        <StatsCards />
        <EModePromoBanner />
        <AssetControls
          pausedAssets={pausedAssets}
          setPausedAssets={setPausedAssets}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />

        {/* Loading State */}
        {loading && (
          <div className="bg-gray-900 rounded-xl p-8 text-center border border-gray-800">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-400">Loading data from blockchain...</p>
            <p className="text-gray-500 text-sm mt-2">Connect Arc Testnet Lending Pool</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-6 mb-6">
            <h3 className="text-red-400 font-semibold mb-2">❌ Load data error</h3>
            <p className="text-gray-300 text-sm mb-4">{error}</p>
            <button
              onClick={fetchMarketsFromBlockchain}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              🔄 Try again
            </button>
          </div>
        )}

        {/* Assets Table */}
        {!loading && !error && (
          <>
            {/* 🌟 TRUYỀN handleMarketClick VÀO AssetTable */}
            <AssetTable
              assets={filteredAssets}
              onMarketClick={handleMarketClick}
            />

            {/* No Results Message */}
            {filteredAssets.length === 0 && searchTerm && (
              <div className="bg-gray-900 rounded-xl p-8 text-center border border-gray-800 mt-4">
                <p className="text-gray-400">
                  No assets were found matching that keyword. "{searchTerm}"
                </p>
              </div>
            )}
          </>
        )}

        <AssetTabBottom />
      </main>
      <ContactFooter />
    </>
  );
}