// File: AssetTableRow.jsx - ĐÃ SỬA

import React from 'react';

// 🌟 Bổ sung onMarketClick vào props
const AssetTableRow = ({ asset, onMarketClick }) => { //
  // Hàm helper để định dạng APY (giả định)
  const formatAPY = (apy) => {
    return apy.endsWith('%') ? apy : `${apy}%`;
  };

  // 🌟 HÀM XỬ LÝ KHI CLICK VÀO HÀNG
  const handleRowClick = () => {
    if (onMarketClick) {
      onMarketClick(asset); // Gọi hàm chuyển trang với địa chỉ market
    }
  };

  return (
    <tr
      className="border-b border-gray-800 hover:bg-gray-800 transition-colors cursor-pointer"
      // 🌟 GẮN SỰ KIỆN CLICK VÀO HÀNG
      onClick={handleRowClick}
    >

      {/* Cột 1: Asset Name và Icon */}
      <td className="px-4 py-3 flex items-center">
        <img
          src={asset.icon}
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

      {/* Cột 4: Total Borrow */}
      <td className="px-4 py-3 text-right text-gray-300">{asset.totalBorrow}</td>

      {/* Cột 5: Borrow APY */}
      <td className="px-4 py-3 text-right text-red-400 font-semibold">{formatAPY(asset.borrowAPY)}</td>

      {/* Cột 6: Liquidity */}
      <td className="px-4 py-3 text-center">{asset.liquidity}</td>

    </tr>
  );
};

export default AssetTableRow;