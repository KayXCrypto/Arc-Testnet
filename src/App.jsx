// src/App.jsx

import React, { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import BridgePage from './components/pages/BridgePage';
import StakingPage from './components/pages/StakingPage';
import SwapPage from './components/pages/SwapPage';
import MintPage from './components/pages/MintPage';
import MarketDetailPage from './components/pages/MarketDetailPage'; // 🌟 IMPORT THÊM
import HistoryPage from './components/pages/HistoryPage';

const App = () => {
  const [activePage, setActivePage] = useState('home');
  const [selectedMarket, setSelectedMarket] = useState(null); // 🌟 STATE MỚI

  // 🌟 HÀM XỬ LÝ KHI CLICK VÀO MARKET
  const handleMarketSelect = (marketAddress) => {
    setSelectedMarket(marketAddress);
  };

  // 🌟 HÀM XỬ LÝ QUAY LẠI TRANG LENDING
  const handleBackToMarkets = () => {
    setSelectedMarket(null);
  };

  // Hàm xử lý hiển thị nội dung trang dựa trên activePage
  const renderPage = () => {
    switch (activePage) {
      case 'bridge':
        return <BridgePage />;
      case 'staking':
        return <StakingPage />;
      case 'swap':
        return <SwapPage />;
      case 'mint':
        return <MintPage />;
      case 'explorer':
        return <HistoryPage />;
      case 'home':
        // 🌟 ĐIỀU KIỆN HIỂN THỊ MARKET DETAIL HOẶC MAIN CONTENT
        if (selectedMarket) {
          return (
            <MarketDetailPage
              marketAddress={selectedMarket}
              onBack={handleBackToMarkets}
            />
          );
        }
        return <MainContent onMarketSelect={handleMarketSelect} />;
      case 'vai':
      default:
        // 🌟 CŨNG XỬ LÝ CHO DEFAULT CASE
        if (selectedMarket) {
          return (
            <MarketDetailPage
              marketAddress={selectedMarket}
              onBack={handleBackToMarkets}
            />
          );
        }
        return <MainContent onMarketSelect={handleMarketSelect} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header activePage={activePage} setActivePage={setActivePage} />
      <div className="flex">
        <Sidebar activePage={activePage} setActivePage={setActivePage} />

        <main className="flex-1 p-8 bg-gray-950">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default App;