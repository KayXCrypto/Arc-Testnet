// src/App.jsx

import React, { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import BridgePage from './components/pages/BridgePage';
import StakingPage from './components/pages/StakingPage'; // Đảm bảo import này đã đúng
import SwapPage from './components/pages/SwapPage';
import MintPage from './components/pages/MintPage';

const App = () => {
  const [activePage, setActivePage] = useState('home'); // 'home', 'bridge', 'staking', etc.

  // Hàm xử lý hiển thị nội dung trang dựa trên activePage
  const renderPage = () => {
    switch (activePage) {
      case 'bridge':
        return <BridgePage />;
      case 'staking':
        // 🌟 HIỂN THỊ STAKINGPAGE KHI activePage LÀ 'staking'
        return <StakingPage />;
      case 'swap':
        return <SwapPage />;
      case 'mint':
        return <MintPage />;
      case 'home':
        return <MainContent />;
      case 'vai':
      default:
        return <MainContent />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header activePage={activePage} setActivePage={setActivePage} />
      <div className="flex">
        {/* Sidebar sẽ gọi setActivePage('staking') khi click */}
        <Sidebar activePage={activePage} setActivePage={setActivePage} />

        {/* Conditional Rendering based on active page */}
        <main className="flex-1 p-8 bg-gray-950">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default App;