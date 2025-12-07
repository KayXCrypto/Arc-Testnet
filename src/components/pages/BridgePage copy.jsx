// src/components/pages/BridgePage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import {
    useAccount,
    useReadContract,
    useWriteContract,
    useWaitForTransactionReceipt,
    useSwitchChain,
    useChainId
} from 'wagmi';
import { parseUnits, formatUnits, maxUint256 } from 'viem';
import { RefreshCcw, Info, X, Gift, ArrowRight } from 'lucide-react';
import {
    CCTP_CONFIG,
    BRIDGE_ABI,
    addressToBytes32,
    getSupportedChains,
    getChainConfig,
    validateChainPair,
    validateBridgeAmount,
    formatBalance,
    getAttestationUrl,
    shortenAddress as utilShortenAddress,
    BRIDGE_CONSTANTS
} from '../../config/bridgeConstants';
import '../../styles/bridge.css';
import CCTPLogo from '../../assets/circle-logo.png';

// Lấy các Hằng số từ file config
const SUPPORTED_CHAINS = getSupportedChains();
const USDC_DECIMALS = BRIDGE_CONSTANTS.USDC_DECIMALS;
const DEFAULT_FEE = BRIDGE_CONSTANTS.DEFAULT_FEE;
const MESSAGE_BODY_VERSION = BRIDGE_CONSTANTS.MESSAGE_BODY_VERSION;

// Hàm rút gọn địa chỉ (từ file config)
const shortenAddress = utilShortenAddress;

const BridgePage = () => {
    const { address, isConnected } = useAccount();
    const currentChainId = useChainId();
    const { switchChain } = useSwitchChain();

    // State mặc định: Sepolia -> Arc
    const [sourceChainId, setSourceChainId] = useState(11155111);
    const [destinationChainId, setDestinationChainId] = useState(5042002);
    const [amount, setAmount] = useState('');

    // State UI & Trạng thái giao dịch
    const [burnSuccessMessage, setBurnSuccessMessage] = useState(null);
    const [validationError, setValidationError] = useState(null);

    // Tính toán config
    const sourceChainConfig = getChainConfig(sourceChainId);
    const destinationChainConfig = getChainConfig(destinationChainId);
    const isWalletOnSourceChain = currentChainId === sourceChainId;

    // Sử dụng try/catch để đảm bảo an toàn khi parse
    const amountInWei = (() => {
        try {
            if (!amount || parseFloat(amount) <= 0) return 0n;
            return parseUnits(amount, USDC_DECIMALS);
        } catch {
            return 0n;
        }
    })();

    // --- Wagmi Hooks: Đọc dữ liệu ---
    // 1. Số dư trên Chuỗi Nguồn (Source Chain)
    const { data: usdcSourceBalance = 0n, isLoading: isSourceBalanceLoading, refetch: refetchUsdcSourceBalance } = useReadContract({
        address: sourceChainConfig?.usdcAddress,
        abi: BRIDGE_ABI.USDC,
        functionName: 'balanceOf',
        args: [address],
        chainId: sourceChainId,
        query: { enabled: isConnected && !!address && !!sourceChainConfig, refetchInterval: 10000 },
    });

    // 2. Số dư trên Chuỗi Đích (Destination Chain) - MỚI
    const { data: usdcDestinationBalance = 0n, isLoading: isDestinationBalanceLoading, refetch: refetchUsdcDestinationBalance } = useReadContract({
        address: destinationChainConfig?.usdcAddress,
        abi: BRIDGE_ABI.USDC,
        functionName: 'balanceOf',
        args: [address],
        chainId: destinationChainId,
        query: { enabled: isConnected && !!address && !!destinationChainConfig, refetchInterval: 10000 },
    });


    const { data: allowance = 0n, refetch: refetchAllowance } = useReadContract({
        address: sourceChainConfig?.usdcAddress,
        abi: BRIDGE_ABI.USDC,
        functionName: 'allowance',
        args: [address, sourceChainConfig?.tokenMessengerAddress],
        chainId: sourceChainId,
        query: { enabled: isConnected && !!address && !!sourceChainConfig, refetchInterval: 10000 },
    });

    const requiresApproval = isConnected && isWalletOnSourceChain && amountInWei > 0n && allowance < amountInWei;

    // --- Wagmi Hooks: Ghi dữ liệu ---
    const { data: approveHash, writeContract: writeApprove, isPending: isApprovePending, error: approveError } = useWriteContract();
    const { data: burnHash, writeContract: writeBurn, isPending: isBurnPending, error: burnError } = useWriteContract();


    // Theo dõi giao dịch
    const latestHash = approveHash || burnHash;
    const {
        isLoading: isTxConfirming,
        isSuccess: isTxConfirmed,
        isError: isConfirmationError
    } = useWaitForTransactionReceipt({
        hash: latestHash,
        query: { enabled: !!latestHash, refetchInterval: 5000 },
    });

    const isProcessing = isApprovePending || isBurnPending || isTxConfirming;
    const currentError = (approveError || burnError || isConfirmationError) ? (approveError || burnError)?.shortMessage || 'Transaction failed. Please check gas and balance.' : null;


    // --- Xử lý sự kiện DepositForBurn ---
    const executeDepositForBurn = useCallback(() => {
        if (!sourceChainConfig || !destinationChainConfig || !address || amountInWei === 0n) {
            setValidationError("Cấu hình chuỗi hoặc số lượng không hợp lệ.");
            return;
        }

        // Validate số lượng token
        const { isValid, error } = validateBridgeAmount(amount, usdcSourceBalance, USDC_DECIMALS);
        if (!isValid) {
            setValidationError(error);
            return;
        }

        // --- Chuẩn bị tham số ---
        const mintRecipient = addressToBytes32(address);          // recipient
        const destinationCaller = addressToBytes32(address);
        console.log(destinationCaller)
        console.log(address)     // caller
        let maxFee = DEFAULT_FEE;

        // Nếu maxFee >= amount, hãy giảm nó đi
        if (amountInWei <= maxFee) {
            // Nếu số lượng bridge quá nhỏ, maxFee phải nhỏ hơn số lượng, ví dụ: 1/10 số lượng
            // Hoặc đơn giản là đảm bảo maxFee = 0n nếu số lượng nhỏ hơn ngưỡng 1000n.
            if (amountInWei > 1n) {
                maxFee = amountInWei / 10n; // Đặt phí bằng 10% số lượng (Vẫn an toàn)
            } else {
                maxFee = 0n; // Nếu số lượng bridge là 0, phí phải là 0
            }
        }                          // giống Web3.py, fee = amount - 1
        const gasLimit = 300_000;                                  // Gas limit thủ công (tăng 20% như Python)

        writeBurn({
            address: sourceChainConfig.tokenMessengerAddress,
            abi: BRIDGE_ABI.TOKEN_MESSENGER,
            functionName: 'depositForBurn',
            args: [
                amountInWei,
                BigInt(destinationChainConfig.domainId),
                mintRecipient,
                sourceChainConfig.usdcAddress,
                destinationCaller,
                maxFee, // Tham số thứ 6
                0n
            ],
            chainId: sourceChainId,

        });

        setValidationError(null);
    }, [amountInWei, address, writeBurn, sourceChainConfig, destinationChainConfig, sourceChainId, amount, usdcSourceBalance]);


    // --- Xử lý hành động chính (Duyệt/Gửi) ---
    const handleAction = async () => {
        setBurnSuccessMessage(null); // Reset thông báo thành công cũ

        if (!isConnected) {
            // Logic kết nối ví nên được xử lý ở ngoài (ví dụ: ConnectKit/Web3Modal)
            // Tạm thời hiển thị cảnh báo
            alert("Please Connect Wallet.");
            return;
        }

        const { isCompatible, error: chainError } = validateChainPair(sourceChainId, destinationChainId);
        if (!isCompatible) {
            setValidationError(chainError);
            return;
        }

        // Sửa lỗi: Thay usdcBalance bằng usdcSourceBalance
        const { isValid, error: amountError } = validateBridgeAmount(amount, usdcSourceBalance, USDC_DECIMALS);
        if (!isValid) {
            setValidationError(amountError);
            return;
        }

        if (!isWalletOnSourceChain) {
            try {
                await switchChain({ chainId: sourceChainId });
            } catch (e) {
                console.error("Switch chain failed:", e);
                setValidationError(`Could not switch to ${sourceChainConfig?.shortName}`);
            }
            return;
        }

        setValidationError(null); // Xóa lỗi trước khi gửi Tx
        if (requiresApproval) {
            writeApprove({
                address: sourceChainConfig.usdcAddress,
                abi: BRIDGE_ABI.USDC,
                functionName: 'approve',
                args: [sourceChainConfig.tokenMessengerAddress, maxUint256],
                chainId: sourceChainId,
            });
        } else {
            // Bước DepositForBurn
            executeDepositForBurn();
        }
    };

    const swapChains = () => {
        // Đảm bảo không bridge giữa cùng một chain
        if (sourceChainId === destinationChainId) return;
        setSourceChainId(destinationChainId);
        setDestinationChainId(sourceChainId);
        setAmount('');
        setBurnSuccessMessage(null);
        setValidationError(null);
    };

    const handleSetMaxAmount = () => {
        // Sửa lỗi: Thay usdcBalance bằng usdcSourceBalance
        if (usdcSourceBalance > 0n) {
            // Format balance cho UI
            const maxAmount = formatUnits(usdcSourceBalance, USDC_DECIMALS);
            setAmount(maxAmount);
        }
    };

    // --- CẬP NHẬT TRẠNG THÁI SAU GIAO DỊCH (Tự động chuyển bước) ---
    useEffect(() => {
        if (isTxConfirmed) {
            // LOGIC TỰ ĐỘNG CHUYỂN BƯỚC: Approve Confirmed -> DepositForBurn
            if (latestHash === approveHash && amountInWei > 0n) {
                // Tải lại allowance (làm mới UI)
                refetchAllowance();

                // Kích hoạt giao dịch DepositForBurn tự động
                console.log("Approval confirmed. Starting depositForBurn automatically...");
                executeDepositForBurn();

            } else if (latestHash === burnHash) {
                // Logic DepositForBurn Confirmed
                setBurnSuccessMessage({
                    sourceChain: sourceChainConfig?.name,
                    destinationChain: destinationChainConfig?.name,
                    amount: formatUnits(amountInWei, USDC_DECIMALS),
                    hash: latestHash
                });
                setAmount('');
                refetchUsdcSourceBalance(); // Cập nhật lại balance nguồn
                refetchUsdcDestinationBalance(); // Cập nhật lại balance đích (MỚI)
            }
        } else if (isConfirmationError) {
            console.error("Transaction confirmation error:", isConfirmationError);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        isTxConfirmed, latestHash, approveHash, burnHash, amountInWei, sourceChainConfig,
        destinationChainConfig, refetchUsdcSourceBalance, refetchUsdcDestinationBalance, refetchAllowance, executeDepositForBurn
    ]);

    // --- Nội dung nút bấm ---
    const getButtonText = () => {
        if (!isConnected) return 'Connect Wallet';
        if (validationError) return 'Fix Error Above';

        if (!isWalletOnSourceChain) return `Switch to ${sourceChainConfig?.shortName || 'Source Chain'}`;

        if (isProcessing) {
            if (isTxConfirming) return 'Confirming Transaction...';
            // Cần kiểm tra kỹ `isTxConfirmed` nếu Tx đầu là approve
            if (isTxConfirmed && latestHash === approveHash) return 'Approval Confirmed! (Starting Bridge...)';
            return 'Waiting for Wallet...';
        }

        if (requiresApproval) {
            return `Approve ${amount} USDC`;
        }

        return 'Bridge USDC';
    };

    const isActionButtonDisabled = !isConnected || isProcessing || !!validationError || (amountInWei === 0n && !requiresApproval) || !sourceChainConfig || !destinationChainConfig;


    return (
        <div className="bridge-container">
            <h1 className="text-3xl font-bold mb-6 text-center">Circle CCTP USDC Bridge (Testnet)</h1>
            <img
                className='text-3xl font-bold mb-6 text-center'
                src={CCTPLogo}
                alt="Bridge"
            />

            {/* Form Bridge (Card chính) */}
            <div className="bridge-form-card">

                {/* 1. INPUT Chain Gửi */}
                <div className="chain-selector-group-top">
                    <div className='flex justify-between items-center mb-2'>
                        <label>From chain</label>
                        {/* HIỂN THỊ BALANCE CHUỖI NGUỒN */}
                        {isConnected && sourceChainConfig && (
                            <span className="text-sm text-gray-400 font-medium">
                                USDC : {isSourceBalanceLoading ? '...' : `${formatBalance(usdcSourceBalance, USDC_DECIMALS, 2)}`}
                            </span>
                        )}
                    </div>
                    <select
                        value={sourceChainId}
                        onChange={(e) => setSourceChainId(parseInt(e.target.value))}
                        disabled={isProcessing}
                        className='bg-gray-800 border-gray-700'
                    >
                        {SUPPORTED_CHAINS.map(chain => (
                            <option key={chain.id} value={chain.id}>
                                {chain.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Nút SWAP */}
                <div className="swap-button-container">
                    <button className="swap-chains-btn" onClick={swapChains} disabled={isProcessing}>
                        <RefreshCcw size={20} />
                    </button>
                </div>

                {/* 2. INPUT Chain Nhận */}
                <div className="chain-selector-group-bottom">
                    <div className='flex justify-between items-center mb-2'>
                        <label>To the chain</label>
                        {/* HIỂN THỊ BALANCE CHUỖI ĐÍCH */}
                        {isConnected && destinationChainConfig && (
                            <span className="text-sm text-gray-400 font-medium">
                                USDC : {isDestinationBalanceLoading ? '...' : `${formatBalance(usdcDestinationBalance, USDC_DECIMALS, 2)}`}
                            </span>
                        )}
                    </div>
                    <select
                        value={destinationChainId}
                        onChange={(e) => setDestinationChainId(parseInt(e.target.value))}
                        disabled={isProcessing}
                        className='bg-gray-800 border-gray-700'
                    >
                        {SUPPORTED_CHAINS.map(chain => (
                            <option key={chain.id} value={chain.id}>
                                {chain.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* 3. INPUT SỐ LƯỢNG NỔI BẬT */}
                <div className="input-amount-card">
                    <div className="amount-header">
                        <label>Balance USDC</label>
                        {isConnected && isWalletOnSourceChain && (
                            <p className="chain-balance text-sm text-gray-400">
                                Available: {isSourceBalanceLoading ? 'Loading...' : `${formatBalance(usdcSourceBalance, USDC_DECIMALS, 2)} USDC`}
                            </p>
                        )}
                    </div>
                    <div className="amount-input-control">
                        <input
                            type="text" // Chuyển sang text để kiểm soát format tốt hơn
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, '').slice(0, 20))}
                            disabled={isProcessing || !isWalletOnSourceChain}
                        />
                        {isConnected && isWalletOnSourceChain && usdcSourceBalance > 0n && (
                            <button className="max-button" onClick={handleSetMaxAmount} disabled={isProcessing}>MAX</button>
                        )}
                    </div>
                    <span className="token-symbol">USDC</span>
                </div>

                {/* 4. Nút hành động chính */}
                <button
                    className="main-action-button"
                    onClick={handleAction}
                    disabled={isActionButtonDisabled}
                >
                    {getButtonText()}
                </button>

                {/* Thông báo trạng thái giao dịch */}
                {(isProcessing || currentError || validationError || burnSuccessMessage) && (
                    <div className="transaction-status-wrapper">
                        {validationError && (
                            <p className="transaction-status error">
                                <X size={16} /> Error: {validationError}
                            </p>
                        )}
                        {currentError && (
                            <p className="transaction-status error">
                                <X size={16} /> Transaction Error: {currentError}
                            </p>
                        )}
                        {isProcessing && (
                            <p className="transaction-status info">
                                <Info size={16} /> {isTxConfirming ? 'Transaction confirming...' : 'Waiting for wallet confirmation...'}
                            </p>
                        )}
                        {burnSuccessMessage && (
                            <div className="transaction-status success">
                                <p>✅ Deposited {burnSuccessMessage.amount} USDC from {burnSuccessMessage.sourceChain} to {burnSuccessMessage.destinationChain}.</p>
                                <p>Now, waiting for Attestation to receive USDC on destination.</p>
                                <p>
                                    <a
                                        href={getAttestationUrl(sourceChainConfig.domainId, burnSuccessMessage.hash)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className='flex items-center text-blue-300 hover:text-blue-200'
                                    >
                                        Track Attestation Status <ArrowRight size={14} className='ml-1' />
                                    </a>
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {!isConnected && (
                    <p className="connect-wallet-message">Connect wallet to bridge USDC</p>
                )}
            </div>
        </div>
    );
};

export default BridgePage;