// src/components/StatsCards.jsx

import React, { useState, useEffect } from 'react';
import { RefreshCw, Layout, GitCommit, Users, Calendar } from 'lucide-react';

// 🌟 THAY THẾ BẰNG URL API CỦA ARCSCAN
const ARCSCAN_API_URL = 'https://testnet.arcscan.app/api/v2/stats';

// Hàm định dạng số có dấu phẩy (ví dụ: 1234567 -> 1,234,567)
const formatNumber = (num) => {
  if (typeof num === 'number' || (typeof num === 'string' && !isNaN(parseInt(num)))) {
    // Chuyển sang Number trước khi định dạng
    return Number(num).toLocaleString('en-US');
  }
  return String(num); // Trả về nguyên gốc nếu không phải số
};

// Hàm Fetch dữ liệu từ API
const fetchArcScanStats = async () => {
  const response = await fetch(ARCSCAN_API_URL, {
    method: 'GET',
    headers: {
      // ArcScan API không yêu cầu key, chỉ cần header mặc định
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
};


const StatsCards = () => {
  const [stats, setStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchArcScanStats();

      // 🌟 Ánh xạ dữ liệu API thực tế sang cấu trúc cho UI
      const newStats = [
        {
          label: 'Total Blocks',
          value: formatNumber(data.total_blocks || 0),
          icon: <Layout className="w-5 h-5 text-indigo-400" />
        },
        {
          label: 'Total Transactions',
          value: formatNumber(data.total_transactions || data.total_tx || 0),
          icon: <GitCommit className="w-5 h-5 text-green-400" />
        },
        {
          label: 'Total Addresses',
          value: formatNumber(data.total_addresses || 0),
          icon: <Users className="w-5 h-5 text-blue-400" />
        },
        {
          label: 'Transactions Today',
          value: formatNumber(data.transactions_today || 0),
          icon: <Calendar className="w-5 h-5 text-yellow-400" />
        },
      ];

      setStats(newStats);

    } catch (err) {
      console.error("Error fetching ArcScan stats:", err);
      setError("Failed to load chain stats.");
      setStats([
        { label: 'Total Blocks', value: 'N/A', icon: <Layout className="w-5 h-5 text-gray-500" /> },
        { label: 'Total Transactions', value: 'N/A', icon: <GitCommit className="w-5 h-5 text-gray-500" /> },
        { label: 'Total Addresses', value: 'N/A', icon: <Users className="w-5 h-5 text-gray-500" /> },
        { label: 'Transactions Today', value: 'N/A', icon: <Calendar className="w-5 h-5 text-gray-500" /> },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Tải dữ liệu lần đầu và thiết lập Interval
  useEffect(() => {
    loadStats();
    // Tự động làm mới sau mỗi 30 giây
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, []);

  // Hiển thị nội dung card
  const renderContent = () => {
    if (error) {
      return <p className="text-red-400 p-4 text-center col-span-4">{error}</p>;
    }

    return stats.map((stat, index) => (
      <div key={index} className="bg-gray-800 p-5 rounded-xl border border-gray-700/50 transition-all hover:bg-gray-700/50 flex flex-col justify-between">
        <div className='flex justify-between items-center mb-2'>
          <div className="text-gray-400 text-sm font-medium">{stat.label}</div>
          {stat.icon}
        </div>

        <div className="text-3xl font-extrabold text-white truncate">
          {isLoading ? (
            // Hiển thị trạng thái loading khi đang fetch
            <span className="flex items-center text-gray-500 animate-pulse text-xl">
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Loading
            </span>
          ) : (
            // Hiển thị giá trị thực tế
            stat.value
          )}
        </div>
      </div>
    ));
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {renderContent()}
    </div>
  );
};

export default StatsCards;