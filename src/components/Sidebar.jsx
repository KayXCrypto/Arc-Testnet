// src/components/Sidebar.jsx

import React from 'react';
import HomeIcon from "../assets/home.png";
import SwapIcon from "../assets/swap.png";
import StakingIcon from "../assets/stake.png";
import BridgeIcon from "../assets/bridge.png";
import MintIcon from "../assets/nft.png";
import History from "../assets/history.png";



// Nhận activePage và setActivePage từ props
const Sidebar = ({ activePage, setActivePage }) => {

  const menuItems = [
    { id: 'home', icon: HomeIcon, label: 'Home' },
    { id: 'swap', icon: SwapIcon, label: 'Swap' },
    { id: 'staking', icon: StakingIcon, label: 'Staking' },
    { id: 'bridge', icon: BridgeIcon, label: 'Bridge' },
    { id: 'mint', icon: MintIcon, label: 'Mint' },
    { id: 'explorer', icon: History, label: 'Explorer' },


  ];

  return (
    <aside className="w-64 border-r border-gray-800 min-h-screen bg-gray-900">
      <div className="p-4 space-y-2">
        {menuItems.map((item) => (
          <div
            key={item.id}
            onClick={() => setActivePage(item.id)}
            className={`px-4 py-3 rounded-lg flex items-center gap-3 cursor-pointer transition-colors ${activePage === item.id
              ? 'bg-blue-600 text-white'
              : 'hover:bg-gray-800 text-gray-300'
              }`}
          >
            {/* ICON PNG */}
            <img
              src={item.icon}
              alt={item.label}
              className="w-6 h-6 object-contain"
            />

            {/* LABEL */}
            <span className="font-semibold">{item.label}</span>
          </div>
        ))}
      </div>
    </aside>
  );

};

export default Sidebar;