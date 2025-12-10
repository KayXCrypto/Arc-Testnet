import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import '../../styles/MarketDetailPage.css';
import usdcIcon from '../../assets/usdc.png'; // Giả sử bạn có file usdc-icon.svg
import eurcIcon from '../../assets/euro.png';
/* ---------------------------------------------
   CONTRACT SETTINGS & UTILITY FUNCTIONS
---------------------------------------------- */
const CONTRACT_ADDRESSES = {
  LENDING_POOL: "0xB3D70ab685F643FFbfA0e0A8B2A2709404845D13",
};
const TOKEN_ICONS = {
  "USDC": usdcIcon,
  "EURC": eurcIcon,
  // Thêm các symbol khác nếu có
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

const MarketDetailPage = ({ marketAddress, onBack }) => {
  const { address: userAddress, isConnected } = useAccount();

  const [market, setMarket] = useState(null);
  const [userPosition, setUserPosition] = useState({});
  const [userWalletBalance, setUserWalletBalance] = useState(0n);
  const [loading, setLoading] = useState(false);
  const [txLoading, setTxLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("supply"); // supply or borrow
  const [action, setAction] = useState("deposit");
  const [amount, setAmount] = useState("");

  /* ---------------------------------------------
     FETCH MARKET DATA & USER DATA
  ---------------------------------------------- */
  const fetchData = useCallback(async () => {
    if (!marketAddress || !window.ethereum) return;
    setLoading(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const lending = new ethers.Contract(CONTRACT_ADDRESSES.LENDING_POOL, LENDING_ABI, provider);
      const token = new ethers.Contract(marketAddress, ERC20_ABI, provider);

      const [symbol, decimals, marketData, supplyRate, borrowRate] = await Promise.all([
        token.symbol(),
        token.decimals(),
        lending.markets(marketAddress),
        lending.getSupplyRate(marketAddress),
        lending.getBorrowRate(marketAddress)
      ]);

      const supplyAPY = (parseFloat(ethers.formatUnits(supplyRate, 18)) * 100).toFixed(2);
      const borrowAPY = (parseFloat(ethers.formatUnits(borrowRate, 18)) * 100).toFixed(2);

      const iconPath = TOKEN_ICONS[symbol] || defaultTokenIcon;

      const fetchedMarket = {
        symbol,
        decimals,
        address: marketAddress,
        totalSupply: marketData.totalDeposits,
        totalBorrow: marketData.totalBorrows,
        supplyAPY,
        borrowAPY,
        collateralFactor: marketData.collateralFactor,
        icon: iconPath
      };
      setMarket(fetchedMarket);

      if (userAddress) {
        const [bal, dep, bor] = await Promise.all([
          token.balanceOf(userAddress),
          lending.getUserDepositBalance(userAddress, marketAddress),
          lending.getUserBorrowBalance(userAddress, marketAddress)
        ]);
        setUserWalletBalance(bal);
        setUserPosition({ deposit: dep, borrow: bor });
      } else {
        setUserWalletBalance(0n);
        setUserPosition({ deposit: 0n, borrow: 0n });
      }

    } catch (err) {
      console.error("Error fetching market detail:", err);
      onBack();
    }
    setLoading(false);
  }, [marketAddress, userAddress, onBack]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Sync action with tab
  useEffect(() => {
    if (activeTab === "supply") {
      setAction(userPosition.deposit > 0 ? "withdraw" : "deposit");
    } else {
      setAction(userPosition.borrow > 0 ? "repay" : "borrow");
    }
    setAmount("");
  }, [activeTab, userPosition]);

  /* ---------------------------------------------
     ACTION HANDLER
  ---------------------------------------------- */
  const handleAction = async () => {
    if (!market || !action || !amount || !isConnected) return;

    setTxLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const lending = new ethers.Contract(CONTRACT_ADDRESSES.LENDING_POOL, LENDING_ABI, signer);
      const token = new ethers.Contract(market.address, ERC20_ABI, signer);

      const amountWei = ethers.parseUnits(amount, market.decimals);

      if (action === "deposit" || action === "repay") {
        const txApprove = await token.approve(CONTRACT_ADDRESSES.LENDING_POOL, amountWei);
        await txApprove.wait();
      }

      let tx;
      if (action === "deposit") tx = await lending.deposit(market.address, amountWei);
      else if (action === "withdraw") tx = await lending.withdraw(market.address, amountWei);
      else if (action === "borrow") tx = await lending.borrow(market.address, amountWei);
      else if (action === "repay") tx = await lending.repay(market.address, amountWei);
      else throw new Error("Invalid action");

      await tx.wait();

      await fetchData();
      setAmount("");
    } catch (err) {
      console.error("Action failed:", err);
      alert(`Transaction failed: ${err.reason || err.message}`);
    }
    setTxLoading(false);
  };

  /* ---------------------------------------------
     CALCULATED VALUES
  ---------------------------------------------- */
  const maxAmount = useMemo(() => {
    if (!market) return 0n;
    return action === "deposit" ? userWalletBalance :
      action === "withdraw" ? userPosition.deposit :
        action === "repay" ? userPosition.borrow :
          ethers.MaxUint256;
  }, [action, userWalletBalance, userPosition, market]);

  const maxAmountFormatted = market ? formatNum(maxAmount, market.decimals, 6) : "0";
  const isDepositOrWithdraw = action === "deposit" || action === "withdraw";
  const apyRate = market ? (isDepositOrWithdraw ? market.supplyAPY : market.borrowAPY) : '0';
  const apyClass = isDepositOrWithdraw ? "text-green-500" : "text-red-500";

  const amountFloat = parseFloat(amount);
  const maxFloat = parseFloat(ethers.formatUnits(maxAmount, market?.decimals || 18));

  const canExecute = !txLoading && amountFloat > 0 && isConnected &&
    (action === "deposit" || action === "withdraw" || action === "repay"
      ? (amountFloat <= maxFloat) : true);

  let buttonText = action.charAt(0).toUpperCase() + action.slice(1);
  if (txLoading) buttonText = "Processing...";

  /* ---------------------------------------------
     LOADING / ERROR STATES
  ---------------------------------------------- */
  if (loading && !market) {
    return (
      <div className="market-detail-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p>Loading market details...</p>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="market-detail-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p>Market not found or error loading data.</p>
      </div>
    );
  }

  /* ---------------------------------------------
     RENDER
  ---------------------------------------------- */
  const utilizationRate = market.totalSupply > 0
    ? ((Number(market.totalBorrow) / Number(market.totalSupply)) * 100).toFixed(2)
    : "0.00";

  const liquidity = market.totalSupply - market.totalBorrow;

  return (
    <div className="market-detail-page">
      <div className="max-w-container">
        {/* Back Button */}
        <button onClick={onBack} className="back-button">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Markets
        </button>

        {/* Market Header */}
        <div className="market-header">
          <img
            src={market.icon}
            alt={`${market.symbol} icon`}
            className="asset-icon"
            style={{ width: '48px', height: '48px' }} // Đặt kích thước để đảm bảo hiển thị
          />
          <h1>{market.symbol} Market</h1>
        </div>

        {/* Main Grid */}
        <div className="market-grid">

          {/* Left Side - Market Overview */}
          <div className="market-stats-card">
            <h2>Market Overview</h2>
            <div className="stats-grid">

              {/* Supply Info */}
              <div className="info-box">
                <p className="text-sm">Total Supply</p>
                <p className="text-lg">{formatNum(market.totalSupply, market.decimals, 2)} {market.symbol}</p>
                <p className="text-xl text-green-500">{market.supplyAPY}% APY</p>
              </div>

              {/* Borrow Info */}
              <div className="info-box">
                <p className="text-sm">Total Borrow</p>
                <p className="text-lg">{formatNum(market.totalBorrow, market.decimals, 2)} {market.symbol}</p>
                <p className="text-xl text-red-500">{market.borrowAPY}% APY</p>
              </div>

              {/* Liquidity */}
              <div className="info-box">
                <p className="text-sm">Available Liquidity</p>
                <p className="text-lg">{formatNum(liquidity, market.decimals, 2)} {market.symbol}</p>
                <p className="text-xl text-gray-400">{utilizationRate}% Utilized</p>
              </div>

              {/* Collateral Factor */}
              <div className="info-box">
                <p className="text-sm">Collateral Factor</p>
                <p className="text-lg">{market.collateralFactor ? (Number(market.collateralFactor) / 100).toFixed(0) : '0'}%</p>
                <p className="text-xl text-gray-400">Max LTV</p>
              </div>

              {/* User Supply Position */}
              <div className="info-box">
                <p className="text-sm">Your Supply</p>
                <p className="text-lg">{formatNum(userPosition.deposit, market.decimals, 4)} {market.symbol}</p>
                <p className="text-xl text-green-500">
                  {userPosition.deposit > 0 ? `+${market.supplyAPY}% APY` : '—'}
                </p>
              </div>

              {/* User Borrow Position */}
              <div className="info-box">
                <p className="text-sm">Your Borrow</p>
                <p className="text-lg">{formatNum(userPosition.borrow, market.decimals, 4)} {market.symbol}</p>
                <p className="text-xl text-red-500">
                  {userPosition.borrow > 0 ? `-${market.borrowAPY}% APY` : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Right Side - Action Panel */}
          <div className="action-panel-card">

            {/* Tabs: Supply / Borrow */}
            <div className="tab-actions">
              <button
                className={activeTab === "supply" ? 'active' : ''}
                onClick={() => setActiveTab("supply")}
                disabled={!isConnected}
              >
                Supply
              </button>
              <button
                className={activeTab === "borrow" ? 'active' : ''}
                onClick={() => setActiveTab("borrow")}
                disabled={!isConnected}
              >
                Borrow
              </button>
            </div>

            {/* Sub-actions based on tab */}
            <div className="tab-actions">
              {activeTab === "supply" ? (
                <>
                  <button
                    className={action === "deposit" ? 'active' : ''}
                    onClick={() => { setAction("deposit"); setAmount(""); }}
                    disabled={!isConnected}
                  >
                    Deposit
                  </button>
                  <button
                    className={action === "withdraw" ? 'active' : ''}
                    onClick={() => { setAction("withdraw"); setAmount(""); }}
                    disabled={!isConnected || userPosition.deposit === 0n}
                  >
                    Withdraw
                  </button>
                </>
              ) : (
                <>
                  <button
                    className={action === "borrow" ? 'active' : ''}
                    onClick={() => { setAction("borrow"); setAmount(""); }}
                    disabled={!isConnected}
                  >
                    Borrow
                  </button>
                  <button
                    className={action === "repay" ? 'active' : ''}
                    onClick={() => { setAction("repay"); setAmount(""); }}
                    disabled={!isConnected || userPosition.borrow === 0n}
                  >
                    Repay
                  </button>
                </>
              )}
            </div>

            {/* User Position Summary */}
            <div className="user-position-info">
              <p style={{ fontWeight: 600, marginBottom: '12px', color: '#fff' }}>Your Position</p>
              <div className="flex justify-between mb-1">
                <span className="text-gray-400">Supplied:</span>
                <span className="text-white">{formatNum(userPosition.deposit, market.decimals, 4)} {market.symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Borrowed:</span>
                <span className="text-white">{formatNum(userPosition.borrow, market.decimals, 4)} {market.symbol}</span>
              </div>
            </div>

            {/* Amount Input */}
            <div className="input-group">
              <label>{action.toUpperCase()} Amount</label>
              <div className="input-container">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="amount-input"
                  placeholder={`0.00 ${market.symbol}`}
                  disabled={!isConnected}
                />
                {isConnected && (
                  <button
                    className="max-button"
                    onClick={() => setAmount(maxAmountFormatted)}
                  >
                    MAX
                  </button>
                )}
              </div>

              <p className="text-xs">
                {action === "deposit" && `Wallet Balance: ${maxAmountFormatted} ${market.symbol}`}
                {action === "withdraw" && `Available: ${maxAmountFormatted} ${market.symbol}`}
                {action === "repay" && `You Owe: ${maxAmountFormatted} ${market.symbol}`}
                {action === "borrow" && `Available to Borrow: ${formatNum(liquidity, market.decimals, 2)} ${market.symbol}`}
              </p>
            </div>

            {/* APY Display */}
            <div className="flex justify-between mb-4">
              <span className="text-gray-400">
                {isDepositOrWithdraw ? 'Supply' : 'Borrow'} APY:
              </span>
              <span className={`font-bold ${apyClass}`}>{apyRate}%</span>
            </div>

            {/* Action Button */}
            <button
              onClick={handleAction}
              className="action-button"
              disabled={!canExecute}
            >
              {buttonText}
            </button>

            {!isConnected && (
              <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: '#8b9e98' }}>
                Please connect your wallet to interact
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketDetailPage;