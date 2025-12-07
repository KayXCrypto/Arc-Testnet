import React from 'react';
import { TrendingUp } from 'lucide-react';

const TabNavigation = ({ activeTab, setActiveTab }) => {
  return (
    <div className="flex gap-4 mb-6">
      <button
        onClick={() => setActiveTab('assets')}
        className={`px-6 py-3 rounded-lg font-semibold transition-colors ${activeTab === 'assets'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
      >
        Assets
      </button>
      <button
        onClick={() => setActiveTab('emode')}
        className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${activeTab === 'emode'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
      >
        <TrendingUp size={18} />
        E-mode
        <span className="bg-green-500 text-xs px-2 py-0.5 rounded text-black font-bold">NEW</span>
      </button>
    </div>
  );
};

export default TabNavigation;