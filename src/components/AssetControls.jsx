import React from 'react';
import { Search } from 'lucide-react';

const AssetControls = ({ pausedAssets, setPausedAssets, searchTerm, setSearchTerm }) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <span className="text-gray-400">Paused assets</span>
        <button
          onClick={() => setPausedAssets(!pausedAssets)}
          className={`w-12 h-6 rounded-full transition-colors relative ${
            pausedAssets ? 'bg-blue-600' : 'bg-gray-700'
          }`}
        >
          <div
            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
              pausedAssets ? 'translate-x-6' : ''
            }`}
          ></div>
        </button>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search asset"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
        />
      </div>
    </div>
  );
};

export default AssetControls;