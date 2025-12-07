// File: AssetTableRow.jsx (Nội dung mẫu cần có để fix lỗi)

import React from 'react';

const AssetTableRow = ({ asset }) => {
  // Hàm helper để định dạng APY (giả định)
  const formatAPY = (apy) => {
    return apy.endsWith('%') ? apy : `${apy}%`;
  };

  return (
    <tr className="border-b border-gray-800 hover:bg-gray-800 transition-colors">

      {/* Cột 1: Asset Name và Icon */}
      <td className="px-4 py-3 flex items-center">
        {/* 🌟 FIX: SỬ DỤNG THẺ <img> VÀ TRUYỀN URL VÀO THUỘC TÍNH src */}
        <img
          src={asset.icon} // asset.icon bây giờ là chuỗi URL
          alt={`${asset.name} Icon`}
          className="w-6 h-6 rounded-full mr-3"
        />
        <span className="font-medium text-gray-200">{asset.name}</span>
      </td>

      {/* Cột 2: Total Supply */}
      <td className="px-4 py-3 text-right text-gray-300">
        <span className="block text-sm">{asset.totalSupply}</span>
        <span className="block text-xs text-gray-500">{asset.totalSupplyUSD}</span>
      </td>

      {/* Cột 3: Supply APY */}
      <td className="px-4 py-3 text-right text-green-400 font-semibold">
        {formatAPY(asset.supplyAPY)}
      </td>

      {/* Cột 4, 5, 6... (Nếu có) */}
      <td className="px-4 py-3 text-right text-gray-300">{asset.totalBorrow}</td>
      <td className="px-4 py-3 text-right text-red-400 font-semibold">{formatAPY(asset.borrowAPY)}</td>
      <td className="px-4 py-3 text-center">{asset.liquidity}</td>

    </tr>
  );
};

export default AssetTableRow;