import React, { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

// API Endpoint
const GAS_API_URL = 'https://testnet.arcscan.app/api/v2/stats';

const Header = () => {
  // State để lưu trữ giá gas và trạng thái tải
  const [gasPrice, setGasPrice] = useState('...');
  const [isLoading, setIsLoading] = useState(true);

  // Hook để fetch data khi component mount
  useEffect(() => {
    const fetchGasPrice = async () => {
      try {
        const response = await fetch(GAS_API_URL);

        if (!response.ok) {
          throw new Error(`Lỗi HTTP! Status: ${response.status}`);
        }

        const data = await response.json();

        // Trích xuất giá gas trung bình (average) từ cấu trúc JSON
        const avgGasPriceGwei = data?.gas_prices?.average;

        if (avgGasPriceGwei !== undefined) {
          // Làm tròn giá trị và định dạng thành chuỗi 'X Gwei'
          const formattedGasPrice = `${Math.round(avgGasPriceGwei)} Gwei`;
          setGasPrice(formattedGasPrice);
        } else {
          setGasPrice('N/A');
        }
      } catch (error) {
        console.error("Lỗi khi tải giá gas:", error);
        setGasPrice('Loading...'); // Xử lý lỗi khi fetch
      } finally {
        setIsLoading(false);
      }
    };

    fetchGasPrice();

    // Tùy chọn: Thiết lập interval để cập nhật giá gas mỗi 30 giây
    const intervalId = setInterval(fetchGasPrice, 30000);

    // Cleanup function: Dọn dẹp interval khi component unmount
    return () => clearInterval(intervalId);

  }, []); // [] đảm bảo hook chỉ chạy một lần khi component mount

  return (
    <header className="border-b border-gray-800 px-6 py-4 bg-gray-900">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <img
              src="https://cdn.prod.website-files.com/685311a976e7c248b5dfde95/688f6e47d217527a8db50637_logo.webp"
              alt="Logo"
              className="w-40 h-15"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Box hiển thị Giá Gas */}
          <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg">
            <span className="text-yellow-500">🔥</span> {/* Đổi icon thành lửa cho Gas */}
            {/* Hiển thị giá gas được fetch */}
            <span className="font-semibold">{isLoading ? 'Loading...' : gasPrice}</span>
          </div>
          <ConnectButton
            chainStatus="full"
            showBalance={{
              smallScreen: false,
              largeScreen: true,
            }}
          />
        </div>
      </div>
    </header>
  );
};

export default Header;