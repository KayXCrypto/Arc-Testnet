// File: AssetTable.jsx - ĐÃ SỬA

import React from 'react';
import AssetTableHeader from './AssetTableHeader';
import AssetTableRow from './AssetTableRow';

// 🌟 Bổ sung onMarketClick vào props
const AssetTable = ({ assets, onMarketClick }) => { //
  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
      <table className="w-full">
        <AssetTableHeader />
        <tbody>
          {assets.map((asset, index) => (
            // 🌟 TRUYỀN onMarketClick XUỐNG AssetTableRow
            <AssetTableRow
              key={index}
              asset={asset}
              onMarketClick={onMarketClick} //
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AssetTable;