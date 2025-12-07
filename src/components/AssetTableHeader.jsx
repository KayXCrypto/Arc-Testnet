import React from 'react';
import { Info } from 'lucide-react';

const AssetTableHeader = () => {
  return (
    <thead className="bg-gray-800 border-b border-gray-700">
      <tr>
        <th className="text-left px-6 py-4 font-semibold text-gray-400">Asset</th>
        <th className="text-right px-6 py-4 font-semibold text-gray-400">Total supply ↕</th>
        <th className="text-right px-6 py-4 font-semibold text-gray-400">
          <div className="flex items-center justify-end gap-1">
            Supply APY <Info size={14} /> ↕
          </div>
        </th>
        <th className="text-right px-6 py-4 font-semibold text-gray-400">Total borrow ↕</th>
        <th className="text-right px-6 py-4 font-semibold text-gray-400">
          <div className="flex items-center justify-end gap-1">
            Borrow APY <Info size={14} /> ↕
          </div>
        </th>
        <th className="text-right px-6 py-4 font-semibold text-gray-400">Liquidity ↕</th>
      </tr>
    </thead>
  );
};

export default AssetTableHeader;