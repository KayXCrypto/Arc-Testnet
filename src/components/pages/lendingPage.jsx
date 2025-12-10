import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useAccount, useWalletClient } from "wagmi";
import '../../styles/lending.css' // Import CSS đã được sửa
import usdcIcon from '../../assets/usdc.png'; // Giả sử bạn có file usdc-icon.svg
import eurcIcon from '../../assets/euro.png'; // Giả sử bạn có file eurc-icon.svg
import defaultTokenIcon from '../../assets/euro.png';
/* ---------------------------------------------
   CONTRACT SETTINGS
---------------------------------------------- */
const CONTRACT_ADDRESSES = {
  LENDING_POOL: "0xB3D70ab685F643FFbfA0e0A8B2A2709404845D13",
};
const TOKEN_ICONS = {
  "USDC": usdcIcon,
  "EURC": eurcIcon,
  // Thêm các token khác ở đây
};
const LENDING_ABI = [
  "function deposit(address token, uint256 amount) external",
  "function withdraw(address token, uint256 amount) external",
  "function borrow(address token, uint256 amount) external",
  "function repay(address token, uint256 amount) external",
  "function getUserDepositBalance(address user, address token) view returns (uint256)",
  "function getUserBorrowBalance(address user, address token) view returns (uint256)",
  "function getSupplyRate(address token) view returns (uint256)",
  "function getBorrowRate(address token) view returns (uint256)",
  "function getUtilizationRate(address token) view returns (uint256)",
  "function getAccountLiquidity(address user) view returns (uint256 totalCollateralValue, uint256 totalBorrowValue)",
  "function getAllMarkets() view returns (address[])",
  "function allMarkets(uint256) view returns (address)",
  "function markets(address token) view returns (bool isListed, uint256 collateralFactor, uint256 liquidationThreshold, uint256 liquidationBonus, uint256 reserveFactor, uint256 totalDeposits, uint256 totalBorrows, uint256 totalReserves, uint256 borrowIndex, uint256 depositIndex, uint256 lastUpdateTimestamp, address priceFeed)"
];

const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)"
];

const formatNum = (v, d = 18, prec = 2) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: prec,
  }).format(parseFloat(ethers.formatUnits(v || 0, d)) || 0);

const formatAddress = (addr) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

// Mock USD function 
const mockUsdValue = (symbol, amount) => {
  if (symbol === "USDC") return "$162.39M";
  if (symbol === "EURC") return "$14.71K";
  if (symbol === "TUSD") return "$32.68K";
  if (amount && amount > 0) return `$${formatNum(amount, 18, 2)}K`;
  return "";
};


/* ---------------------------------------------
   MAIN COMPONENT (LendingPage)
---------------------------------------------- */
const LendingPage = ({ onMarketSelect }) => {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [markets, setMarkets] = useState([]);
  const [userWallet, setUserWallet] = useState({});
  const [userPositions, setUserPositions] = useState({});
  const [loading, setLoading] = useState(false);

  const handleMarketClick = (market) => {
    // 🌟 GỌI HÀM PROP ĐỂ CHUYỂN TRANG
    onMarketSelect(market.address);
  };
  /* ---------------------------------------------
     FETCH MARKETS DYNAMIC WITH FALLBACK
  ---------------------------------------------- */
  const fetchMarketsDynamic = useCallback(async () => {
    if (!window.ethereum) return;

    setLoading(true);
    const provider = new ethers.BrowserProvider(window.ethereum);
    const lending = new ethers.Contract(CONTRACT_ADDRESSES.LENDING_POOL, LENDING_ABI, provider);

    let marketAddresses = [];

    try {
      marketAddresses = await lending.getAllMarkets();
    } catch (err) {
      let i = 0;
      while (true) {
        try {
          const addr = await lending.allMarkets(i);
          if (!addr || addr === ethers.ZeroAddress) break;
          marketAddresses.push(addr);
          i++;
        } catch {
          break;
        }
      }
    }

    const marketsFetched = [];
    for (const tokenAddr of marketAddresses) {
      try {
        const token = new ethers.Contract(tokenAddr, ERC20_ABI, provider);
        const [symbol, decimals] = await Promise.all([token.symbol(), token.decimals()]);

        const iconPath = TOKEN_ICONS[symbol] || defaultTokenIcon;

        const marketData = await lending.markets(tokenAddr);
        if (!marketData.isListed) continue;

        const [supplyRate, borrowRate] = await Promise.all([
          lending.getSupplyRate(tokenAddr),
          lending.getBorrowRate(tokenAddr)
        ]);

        const supplyAPY = (parseFloat(ethers.formatUnits(supplyRate, 18)) * 100).toFixed(2);
        const borrowAPY = (parseFloat(ethers.formatUnits(borrowRate, 18)) * 100).toFixed(2);

        const totalSup = marketData.totalDeposits;
        const totalBor = marketData.totalBorrows;

        marketsFetched.push({
          symbol,
          decimals,
          address: tokenAddr,
          totalSupply: totalSup,
          totalBorrow: totalBor,
          liquidity: totalSup - totalBor,
          supplyAPY,
          borrowAPY,
          icon: iconPath,
          color: "bg-blue-500"
        });
      } catch (err) {
        console.error("Error fetching market:", tokenAddr, err);
      }
    }

    setMarkets(marketsFetched);
    setLoading(false);
  }, []);

  /* ---------------------------------------------
     FETCH USER DATA
  ---------------------------------------------- */
  const fetchUserData = useCallback(async () => {
    if (!address || markets.length === 0) return;

    const provider = new ethers.BrowserProvider(window.ethereum);
    const lending = new ethers.Contract(CONTRACT_ADDRESSES.LENDING_POOL, LENDING_ABI, provider);

    const walletBalances = {};
    const positions = {};

    for (const m of markets) {
      const token = new ethers.Contract(m.address, ERC20_ABI, provider);

      const [bal, dep, bor] = await Promise.all([
        token.balanceOf(address),
        lending.getUserDepositBalance(address, m.address),
        lending.getUserBorrowBalance(address, m.address)
      ]);

      walletBalances[m.symbol] = bal;
      positions[m.symbol] = { deposit: dep, borrow: bor };
    }

    setUserWallet(walletBalances);
    setUserPositions(positions);
  }, [address, markets]);

  /* ---------------------------------------------
     ACTION HANDLER
  ---------------------------------------------- */
  const handleAction = async () => {
    if (!selected || !action || !amount) return;

    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const lending = new ethers.Contract(CONTRACT_ADDRESSES.LENDING_POOL, LENDING_ABI, signer);
      const token = new ethers.Contract(selected.address, ERC20_ABI, signer);

      const amountWei = ethers.parseUnits(amount, selected.decimals);

      if (action === "deposit" || action === "repay") {
        // APPROVE
        const txApprove = await token.approve(CONTRACT_ADDRESSES.LENDING_POOL, amountWei);
        await txApprove.wait();
      }

      let tx;
      if (action === "deposit") tx = await lending.deposit(selected.address, amountWei);
      else if (action === "withdraw") tx = await lending.withdraw(selected.address, amountWei);
      else if (action === "borrow") tx = await lending.borrow(selected.address, amountWei);
      else if (action === "repay") tx = await lending.repay(selected.address, amountWei);
      else throw new Error("Invalid action");


      await tx.wait();

      // REFETCH DATA
      await fetchMarketsDynamic();
      await fetchUserData();
    } catch (err) {
      console.error("Action failed:", err);
      alert(`Transaction failed: ${err.reason || err.message}`);
    }
    setLoading(false);
    closeModal();
  };

  useEffect(() => { fetchMarketsDynamic(); }, [fetchMarketsDynamic]);
  useEffect(() => { fetchUserData(); }, [markets, address, fetchUserData]);

  return (
    <div className="p-6 text-white w-full">
      {/* Đã xóa Header để tránh trùng với App.jsx Header */}

      <div className="table-container">
        <h2 className="mb-4 text-xl font-semibold">Markets</h2>

        <table>
          <thead>
            <tr>
              <th>Asset</th>
              <th>Total Supply</th>
              <th>Supply APY</th>
              <th>Total Borrow</th>
              <th>Borrow APY</th>
              <th>Liquidity</th>
            </tr>
          </thead>

          <tbody>
            {markets.map((m, i) => (
              <tr
                key={i}
                className="hover:bg-gray-800 transition duration-150 cursor-pointer"
                // 🌟 SỬ DỤNG handleMarketClick ĐỂ CHUYỂN TRANG
                onClick={() => handleMarketClick(m)}
              >
                <td>
                  <div className="asset-cell">
                    <img
                      src={m.icon}
                      alt={`${m.symbol} icon`}
                      className="asset-icon"
                      style={{ width: '32px', height: '32px', borderRadius: '50%' }} // Có thể thêm style trực tiếp để kiểm tra 
                    />
                    <span className="cursor-pointer hover:text-blue-400">
                      {m.symbol}
                    </span>
                  </div>
                </td>

                <td>
                  {formatNum(m.totalSupply, m.decimals)} {m.symbol}
                  <span className="amount-subtext">
                    {mockUsdValue(m.symbol, m.totalSupply)}
                  </span>
                </td>

                <td className="supply-apy">{m.supplyAPY}%</td>

                <td>
                  {formatNum(m.totalBorrow, m.decimals)} {m.symbol}
                  <span className="amount-subtext">
                    {mockUsdValue(m.symbol, m.totalBorrow)}
                  </span>
                </td>

                <td className="borrow-apy">{m.borrowAPY}%</td>

                <td>
                  {formatNum(m.liquidity, m.decimals)} {m.symbol}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* LOẠI BỎ ActionModal */}
    </div>
  );
};

export default LendingPage;