// File: AssetTable.jsx (Không cần thay đổi)

import React from 'react';
import AssetTableHeader from './AssetTableHeader';
import AssetTableRow from './AssetTableRow';

const AssetTable = ({ assets }) => {
  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
      <table className="w-full">
        <AssetTableHeader />
        <tbody>
          {assets.map((asset, index) => (
            // Lặp qua các asset và truyền dữ liệu xuống AssetTableRow
            <AssetTableRow key={index} asset={asset} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AssetTable;