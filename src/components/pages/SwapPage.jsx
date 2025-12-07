import React, { useState, useEffect } from 'react';
import { ArrowDownUp, Settings, Info, ChevronDown, AlertCircle } from 'lucide-react';
import { useAccount, useBalance } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { SwapService } from '../../utils/swapContract'; // 👈 IMPORT SERVICE
// Đảm bảo file style này tồn tại
import '../../styles/swap.css';

// Khởi tạo SwapService
const swapService = new SwapService();

const TOKENS = {
    // Địa chỉ token dùng cho Wagmi hooks
    USDC: {
        symbol: 'USDC',
        name: 'USD Coin',
        address: '0x3600000000000000000000000000000000000000',
        decimals: 6,
        icon: 'usdc',
        // ⭐️ LOGO MỚI CHO USDC
        logoUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=040'
    },
    EURC: {
        symbol: 'EURC',
        name: 'Euro Coin',
        address: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
        decimals: 6,
        icon: 'eurc',
        // ⭐️ TÔI DÙNG LOGO TETHER GOLD (XAUT) MÀ BẠN CUNG CẤP CHO EURC
        logoUrl: 'https://cryptologos.cc/logos/tether-gold-xaut-logo.svg?v=040'
    },
    USDT: {
        symbol: 'USDT',
        name: 'Tether USD',
        address: '0x175CdB1D338945f0D851A741ccF787D343E57952',
        decimals: 6,
        icon: 'usdt',
        // ⭐️ LOGO MỚI CHO USDT
        logoUrl: 'https://cryptologos.cc/logos/tether-usdt-logo.svg?v=040'
    }
};

const SwapPage = () => {
    const { address, isConnected } = useAccount();
    const [fromAmount, setFromAmount] = useState('');
    const [toAmount, setToAmount] = useState('');
    const [fromToken, setFromToken] = useState('USDC');
    const [toToken, setToToken] = useState('EURC');
    const [slippage, setSlippage] = useState('0.5');
    const [showSettings, setShowSettings] = useState(false);
    const [showFromTokenSelect, setShowFromTokenSelect] = useState(false);
    const [showToTokenSelect, setShowToTokenSelect] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [exchangeRate, setExchangeRate] = useState(0);
    const [priceImpact, setPriceImpact] = useState(0.01);

    // Fetch token balances
    const { data: fromBalance } = useBalance({
        address: address,
        token: TOKENS[fromToken].address,
        enabled: isConnected && fromToken !== 'ETH'
    });

    const { data: toBalance } = useBalance({
        address: address,
        token: TOKENS[toToken].address,
        enabled: isConnected && toToken !== 'ETH'
    });

    // Calculate toAmount when fromAmount changes
    useEffect(() => {
        if (fromAmount && !isNaN(fromAmount) && exchangeRate > 0) {
            // Giả định logic tính toán phí (nếu có) đã được trừ ở exchangeRate
            const calculated = (parseFloat(fromAmount) * exchangeRate).toFixed(6);
            setToAmount(calculated);

            // Calculate price impact (simplified)
            const impact = (parseFloat(fromAmount) * 0.0001).toFixed(2);
            setPriceImpact(Math.min(impact, 1));
        } else {
            setToAmount('');
            setPriceImpact(0.01);
        }
    }, [fromAmount, exchangeRate]);

    // ⭐️ FETCH TỶ GIÁ THỰC TẾ TỪ CONTRACT
    useEffect(() => {
        const fetchRate = async () => {
            if (!isConnected || fromToken === toToken) {
                setExchangeRate(1);
                return;
            }

            try {
                // Đảm bảo chuyển mạng sang Arc Testnet trước khi gọi hàm
                await swapService.initialize();
                await swapService.switchToArcTestnet();

                const rate = await swapService.getContractExchangeRate(fromToken, toToken);
                setExchangeRate(rate);
            } catch (error) {
                console.error("Failed to fetch exchange rate:", error);
                alert(`Error fetching rate: ${error.message}. Please check your configuration.`);
                setExchangeRate(0); // Set về 0 nếu lỗi để chặn swap
            }
        };

        fetchRate();
    }, [fromToken, toToken, isConnected]);

    const handleSwapTokens = () => {
        const tempToken = fromToken;
        setFromToken(toToken);
        setToToken(tempToken);

        const tempAmount = fromAmount;
        setFromAmount(toAmount);
        setToAmount(tempAmount);

        // Đảo ngược tỷ giá
        if (exchangeRate > 0) {
            setExchangeRate(1 / exchangeRate);
        }
    };

    // ⭐️ LOGIC SWAP THỰC TẾ: BƯỚC 1: APPROVE -> BƯỚC 2: SWAP ⭐️
    const handleSwap = async () => {
        if (!isConnected) {
            alert('Please connect your wallet first!');
            return;
        }

        if (!fromAmount || parseFloat(fromAmount) <= 0 || exchangeRate <= 0) {
            alert('Please enter a valid amount and wait for the rate to finish loading..');
            return;
        }

        if (fromBalance && parseFloat(fromAmount) > parseFloat(fromBalance.formatted)) {
            alert('Insufficient balance!');
            return;
        }

        setIsLoading(true);

        try {
            await swapService.initialize();
            await swapService.switchToArcTestnet();

            const slippageValue = parseFloat(slippage);
            const amountToSwap = parseFloat(fromAmount);

            // 1. Phê duyệt (Approve) token
            alert(`${fromToken} approval required for the Swap contract to use ${amountToSwap} ${fromToken}. Please confirm in your wallet.`);

            // 
            await swapService.approveToken(fromToken, amountToSwap);

            alert(`${fromToken} approved successfully! Starting swap…`);

            // 2. Thực hiện Swap
            const receipt = await swapService.executeSwap(
                fromToken,
                toToken,
                amountToSwap,
                slippageValue,
                exchangeRate // Truyền tỷ giá hiện tại
            );

            console.log('Swap Receipt:', receipt);

            alert(`Swap Success!\n${fromAmount} ${fromToken} → ${toAmount} ${toToken}\nTransaction Hash: ${receipt.transactionHash}`);
            setFromAmount('');
            setToAmount('');
        } catch (error) {
            console.error('Swap error:', error);
            alert(`Swap failed. Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMaxAmount = () => {
        if (fromBalance) {
            setFromAmount(fromBalance.formatted);
        }
    };

    // ... (logic selectToken không thay đổi)
    const selectToken = (token, type) => {
        if (type === 'from') {
            if (token === toToken) {
                setToToken(fromToken);
            }
            setFromToken(token);
            setShowFromTokenSelect(false);
        } else {
            if (token === fromToken) {
                setFromToken(toToken);
            }
            setToToken(token);
            setShowToTokenSelect(false);
        }
    };

    const TokenSelector = ({ selectedToken, onSelect, show, onClose, excludeToken }) => {
        if (!show) return null;

        return (
            <div className="token-selector-dropdown">
                <h3 className="token-dropdown-title">Select a token</h3>
                <div className="token-grid">
                    {Object.entries(TOKENS).map(([symbol, token]) => {
                        const balance = symbol === fromToken && fromBalance ? fromBalance.formatted :
                            symbol === toToken && toBalance ? toBalance.formatted : '0.00';

                        return (
                            <button
                                key={symbol}
                                className={`token-card ${selectedToken === symbol ? 'selected' : ''} ${symbol === excludeToken ? 'disabled' : ''}`}
                                onClick={() => onSelect(symbol)}
                                disabled={symbol === excludeToken}
                            >
                                {/* ⭐️ LOGO LỚN TRONG DROPDOWN (THAY THẾ LAMA CŨ) ⭐️ */}
                                <img
                                    src={token.logoUrl}
                                    alt={`${symbol} logo`}
                                    className="token-logo-img-large"
                                />
                                {/* --------------------------------------------- */}
                                <div className="token-info-card">
                                    <span className="token-symbol-large">{token.symbol}</span>
                                    <span className="token-name-small">{token.name}</span>
                                    {isConnected && (
                                        <span className="token-balance-large">
                                            {parseFloat(balance).toFixed(2)}
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };


    return (
        <div className="swap-page">
            <div className="swap-container">
                {/* Header và Settings Panel (không thay đổi) */}
                <div className="swap-header">
                    <h1>Swap</h1>
                    <div className="header-actions">
                        <button
                            className={`settings-button ${showSettings ? 'active' : ''}`}
                            onClick={() => setShowSettings(!showSettings)}
                        >
                            <Settings size={20} />
                        </button>
                    </div>
                </div>

                {showSettings && (
                    <div className="settings-panel">
                        <div className="settings-item">
                            <label>Slippage Tolerance</label>
                            <div className="slippage-options">
                                {['0.1', '0.5', '1.0'].map(value => (
                                    <button
                                        key={value}
                                        className={`slippage-btn ${slippage === value ? 'active' : ''}`}
                                        onClick={() => setSlippage(value)}
                                    >
                                        {value}%
                                    </button>
                                ))}
                                <input
                                    type="number"
                                    className="slippage-input"
                                    placeholder="Custom"
                                    value={slippage}
                                    onChange={(e) => setSlippage(e.target.value)}
                                    step="0.1"
                                    min="0.1"
                                    max="50"
                                />
                            </div>
                        </div>
                        {parseFloat(slippage) > 5 && (
                            <div className="slippage-warning">
                                <AlertCircle size={16} />
                                <span>High slippage may result in unfavorable rates</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Swap Interface */}
                <div className="swap-interface">
                    {/* From Token */}
                    <div className="token-input-container">
                        <div className="token-input-header">
                            <span className="label">From</span>
                            <span className="balance">
                                Balance: {isConnected && fromBalance ? parseFloat(fromBalance.formatted).toFixed(4) : '0.00'}
                                {isConnected && fromBalance && parseFloat(fromBalance.formatted) > 0 && (
                                    <button className="max-button" onClick={handleMaxAmount}>MAX</button>
                                )}
                            </span>
                        </div>
                        <div className="token-input">
                            <input
                                type="number"
                                placeholder="0.0"
                                value={fromAmount}
                                onChange={(e) => setFromAmount(e.target.value)}
                                disabled={isLoading}
                            />
                            <button
                                className="token-select-button"
                                onClick={() => setShowFromTokenSelect(!showFromTokenSelect)}
                            >
                                <div className="token-info">
                                    {/* ⭐️ LOGO NHỎ TRONG INPUT (THAY THẾ LAMA CŨ) ⭐️ */}
                                    <img
                                        src={TOKENS[fromToken].logoUrl}
                                        alt={`${fromToken} logo`}
                                        className="token-logo-img-small"
                                    />
                                    {/* --------------------------------------------- */}
                                    <span className="token-symbol">{fromToken}</span>
                                </div>
                                <ChevronDown size={20} />
                            </button>
                        </div>

                        {/* Token Selector Dropdown - From */}
                        {showFromTokenSelect && (
                            <TokenSelector
                                selectedToken={fromToken}
                                onSelect={(token) => selectToken(token, 'from')}
                                show={showFromTokenSelect}
                                onClose={() => setShowFromTokenSelect(false)}
                                excludeToken={toToken}
                            />
                        )}
                    </div>

                    {/* Swap Direction Button */}
                    <button
                        className="swap-direction-button"
                        onClick={handleSwapTokens}
                        disabled={isLoading}
                    >
                        <ArrowDownUp size={20} />
                    </button>

                    {/* To Token */}
                    <div className="token-input-container">
                        <div className="token-input-header">
                            <span className="label">To</span>
                            <span className="balance">
                                Balance: {isConnected && toBalance ? parseFloat(toBalance.formatted).toFixed(4) : '0.00'}
                            </span>
                        </div>
                        <div className="token-input">
                            <input
                                type="number"
                                placeholder="0.0"
                                value={toAmount}
                                readOnly
                                disabled={isLoading}
                            />
                            <button
                                className="token-select-button"
                                onClick={() => setShowToTokenSelect(!showToTokenSelect)}
                            >
                                <div className="token-info">
                                    {/* ⭐️ LOGO NHỎ TRONG INPUT (THAY THẾ LAMA CŨ) ⭐️ */}
                                    <img
                                        src={TOKENS[toToken].logoUrl}
                                        alt={`${toToken} logo`}
                                        className="token-logo-img-small"
                                    />
                                    {/* --------------------------------------------- */}
                                    <span className="token-symbol">{toToken}</span>
                                </div>
                                <ChevronDown size={20} />
                            </button>
                        </div>

                        {/* Token Selector Dropdown - To */}
                        {showToTokenSelect && (
                            <TokenSelector
                                selectedToken={toToken}
                                onSelect={(token) => selectToken(token, 'to')}
                                show={showToTokenSelect}
                                onClose={() => setShowToTokenSelect(false)}
                                excludeToken={fromToken}
                            />
                        )}
                    </div>

                    {/* Exchange Rate Info */}
                    {fromAmount && exchangeRate > 0 && (
                        <div className="exchange-info">
                            <Info size={16} />
                            <span>1 {fromToken} = {exchangeRate.toFixed(6)} {toToken}</span>
                        </div>
                    )}

                    {/* Action Button */}
                    {!isConnected ? (
                        <div className="connect-wallet-wrapper">
                            <ConnectButton />
                        </div>
                    ) : (
                        <button
                            className="swap-action-button"
                            onClick={handleSwap}
                            disabled={isLoading || !fromAmount || parseFloat(fromAmount) <= 0 || exchangeRate === 0}
                        >
                            {isLoading ? (
                                <>
                                    <span className="spinner"></span>
                                    Swapping...
                                </>
                            ) : !fromAmount ? (
                                'Enter an amount'
                            ) : parseFloat(fromAmount) <= 0 ? (
                                'Invalid amount'
                            ) : fromBalance && parseFloat(fromAmount) > parseFloat(fromBalance.formatted) ? (
                                'Insufficient balance'
                            ) : exchangeRate === 0 ? (
                                'Fetching Rate...'
                            ) : (
                                'Swap'
                            )}
                        </button>
                    )}
                </div>

                {/* Transaction Details (Không thay đổi) */}
                {fromAmount && parseFloat(fromAmount) > 0 && parseFloat(toAmount) > 0 && (
                    <div className="transaction-details">
                        <h3>Transaction Details</h3>
                        <div className="detail-row">
                            <span>Expected Output</span>
                            <span className="highlight">{toAmount} {toToken}</span>
                        </div>
                        <div className="detail-row">
                            <span>Price Impact</span>
                            <span className={priceImpact < 1 ? 'green' : priceImpact < 3 ? 'yellow' : 'red'}>
                                {priceImpact < 0.01 ? '< 0.01' : priceImpact.toFixed(2)}%
                            </span>
                        </div>
                        <div className="detail-row">
                            <span>Minimum Received</span>
                            <span>
                                {(parseFloat(toAmount) * (1 - parseFloat(slippage) / 100)).toFixed(6)} {toToken}
                            </span>
                        </div>
                        <div className="detail-row">
                            <span>Slippage Tolerance</span>
                            <span>{slippage}%</span>
                        </div>
                        <div className="detail-row">
                            <span>Network Fee</span>
                            <span>~$0.50</span>
                        </div>
                    </div>
                )}

                {/* Footer Info */}
                <div className="swap-footer">
                    <div className="info-badge">
                        <Info size={14} />
                        <span>Arc Testnet</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SwapPage;