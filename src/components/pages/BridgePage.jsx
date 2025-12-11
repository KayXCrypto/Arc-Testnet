// src/components/pages/BridgePage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
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

const SUPPORTED_CHAINS = getSupportedChains();
const USDC_DECIMALS = BRIDGE_CONSTANTS.USDC_DECIMALS;
const DEFAULT_FEE = BRIDGE_CONSTANTS.DEFAULT_FEE;
const POLLING_INTERVAL = BRIDGE_CONSTANTS.POLLING_INTERVAL || 5000;
const shortenAddress = utilShortenAddress;

const BridgePage = () => {
    // wallet/account
    const { address, isConnected } = useAccount();
    const currentChainId = useChainId();
    const { switchChain } = useSwitchChain();

    // chains defaults (adjust if cần)
    const [sourceChainId, setSourceChainId] = useState(11155111); // Sepolia default
    const [destinationChainId, setDestinationChainId] = useState(5042002); // Arc Testnet default
    const [amount, setAmount] = useState('');

    // UI / trạng thái
    const [validationError, setValidationError] = useState(null);
    const [burnSuccessMessage, setBurnSuccessMessage] = useState(null);
    const [attestationStatus, setAttestationStatus] = useState(null);
    const [attestationData, setAttestationData] = useState({ message: null, attestation: null });

    // tx hashes
    const [approveHash, setApproveHash] = useState(null);
    const [burnHash, setBurnHash] = useState(null);
    const [mintHash, setMintHash] = useState(null);

    const [hasApproved, setHasApproved] = useState(false);

    // ref to prevent duplicate mint
    const mintTriggeredRef = useRef(false);

    // chain configs
    const sourceChainConfig = getChainConfig(sourceChainId);
    const destinationChainConfig = getChainConfig(destinationChainId);
    const isWalletOnSourceChain = currentChainId === sourceChainId;

    // parse amount
    const amountInWei = (() => {
        try {
            if (!amount || parseFloat(amount) <= 0) return 0n;
            return parseUnits(amount, USDC_DECIMALS);
        } catch {
            return 0n;
        }
    })();

    // read balances & allowance
    // Chỉ kích hoạt query khi isConnected là true
    const {
        data: usdcSourceBalance = 0n,
        isLoading: isSourceBalanceLoading,
        refetch: refetchUsdcSourceBalance
    } = useReadContract({
        address: sourceChainConfig?.usdcAddress,
        abi: BRIDGE_ABI.USDC,
        functionName: 'balanceOf',
        args: [address],
        chainId: sourceChainId,
        query: { enabled: isConnected && !!address && !!sourceChainConfig, refetchInterval: 10000 }
    });

    const {
        data: usdcDestinationBalance = 0n,
        isLoading: isDestinationBalanceLoading,
        refetch: refetchUsdcDestinationBalance
    } = useReadContract({
        address: destinationChainConfig?.usdcAddress,
        abi: BRIDGE_ABI.USDC,
        functionName: 'balanceOf',
        args: [address],
        chainId: destinationChainId,
        query: { enabled: isConnected && !!address && !!destinationChainConfig, refetchInterval: 10000 }
    });

    const { data: allowance = 0n, refetch: refetchAllowance } = useReadContract({
        address: sourceChainConfig?.usdcAddress,
        abi: BRIDGE_ABI.USDC,
        functionName: 'allowance',
        args: [address, sourceChainConfig?.tokenMessengerAddress],
        chainId: sourceChainId,
        query: { enabled: isConnected && !!address && !!sourceChainConfig, refetchInterval: 10000 }
    });

    // when need approve
    const requiresApproval = isConnected && isWalletOnSourceChain && amountInWei > 0n && allowance < amountInWei && !hasApproved;

    // write hooks
    const { writeContract: writeApprove, isPending: isApprovePending, error: approveError } = useWriteContract({
        mutation: {
            onSuccess: (hash) => {
                setApproveHash(hash);
            }
        }
    });

    const { writeContract: writeBurn, isPending: isBurnPending, error: burnError } = useWriteContract({
        mutation: {
            onSuccess: (hash) => {
                setBurnHash(hash);
            }
        }
    });

    const { writeContract: writeMint, isPending: isMintPending, error: mintError } = useWriteContract({
        mutation: {
            onSuccess: (hash) => {
                setMintHash(hash);
            }
        }
    });

    // wait for receipts
    const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed, isError: isApproveError } = useWaitForTransactionReceipt({
        hash: approveHash,
        query: { enabled: !!approveHash, refetchInterval: POLLING_INTERVAL }
    });

    const { isLoading: isBurnConfirming, isSuccess: isBurnConfirmed, isError: isBurnError } = useWaitForTransactionReceipt({
        hash: burnHash,
        query: { enabled: !!burnHash, refetchInterval: POLLING_INTERVAL }
    });

    const { isLoading: isMintConfirming, isSuccess: isMintConfirmed, isError: isMintError } = useWaitForTransactionReceipt({
        hash: mintHash,
        query: { enabled: !!mintHash, refetchInterval: POLLING_INTERVAL }
    });

    const isProcessing = isApprovePending || isBurnPending || isMintPending || isApproveConfirming || isBurnConfirming || isMintConfirming;
    const isTxConfirming = isApproveConfirming || isBurnConfirming || isMintConfirming;
    const currentError = (approveError || burnError || mintError || isApproveError || isBurnError || isMintError)
        ? (approveError || burnError || mintError)?.shortMessage || 'Transaction failed. Please check gas and balance.'
        : null;

    // ---------- executeReceiveMessage (mint) ----------
    const executeReceiveMessage = useCallback(async () => {
        if (!attestationData.message || !attestationData.attestation) {
            console.log('Missing attestation/message');
            return;
        }

        if (mintTriggeredRef.current || mintHash) {
            console.log('Mint already triggered or hash exists — skipping');
            return;
        }

        // set ref immediately
        mintTriggeredRef.current = true;

        console.log('Starting receiveMessage (mint)...');

        // Ensure wallet on destination chain
        if (currentChainId !== destinationChainId) {
            console.log(`Switching to destination chain ${destinationChainId}...`);
            try {
                await switchChain({ chainId: destinationChainId });
                // small delay for wallet to catch up
                await new Promise((res) => setTimeout(res, 800));
            } catch (err) {
                console.error('Failed to switch to destination chain', err);
                mintTriggeredRef.current = false;
                setValidationError(`Please switch to ${destinationChainConfig?.name} to complete minting.`);
                return;
            }
        }

        writeMint({
            address: destinationChainConfig.messageTransmitterAddress,
            abi: BRIDGE_ABI.MESSAGE_TRANSMITTER,
            functionName: 'receiveMessage',
            args: [attestationData.message, attestationData.attestation],
            chainId: destinationChainId,
            gas: 500000n,
            gasPrice: 5000000000n
        });
    }, [attestationData, mintHash, currentChainId, destinationChainId, destinationChainConfig, switchChain, writeMint]);

    // ---------- executeDepositForBurn (burn) with auto-switch ----------
    const executeDepositForBurn = useCallback(async () => {
        if (!sourceChainConfig || !destinationChainConfig || !address || amountInWei === 0n) {
            setValidationError('Cấu hình chuỗi hoặc số lượng không hợp lệ.');
            return;
        }

        // Auto-switch to source chain before burning
        if (currentChainId !== sourceChainId) {
            try {
                await switchChain({ chainId: sourceChainId });
                await new Promise((res) => setTimeout(res, 800));
            } catch (err) {
                console.error('Failed to switch to source chain:', err);
                setValidationError(`Please switch to ${sourceChainConfig?.name} to continue.`);
                return;
            }
        }

        const { isValid, error } = validateBridgeAmount(amount, usdcSourceBalance, USDC_DECIMALS);
        if (!isValid) {
            setValidationError(error);
            return;
        }

        const mintRecipient = addressToBytes32(address);
        const destinationCaller = '0x0000000000000000000000000000000000000000000000000000000000000000';

        let maxFee = DEFAULT_FEE;
        if (amountInWei <= maxFee) {
            if (amountInWei > 1n) {
                maxFee = amountInWei / 10n;
            } else {
                maxFee = 0n;
            }
        }

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
                maxFee,
                0n
            ],
            chainId: sourceChainId,
            gas: 400000n
        });

        setValidationError(null);
    }, [
        amountInWei,
        address,
        sourceChainConfig,
        destinationChainConfig,
        sourceChainId,
        amount,
        usdcSourceBalance,
        switchChain,
        writeBurn,
        currentChainId
    ]);

    // ---------- handleAction (button) ----------
    const handleAction = async () => {
        setBurnSuccessMessage(null);

        if (!isConnected) {
            // Khi chưa kết nối ví, nút sẽ hiển thị "Connect Wallet" và không làm gì khác ngoài alert.
            return;
        }

        const { isCompatible, error: chainError } = validateChainPair(sourceChainId, destinationChainId);
        if (!isCompatible) {
            setValidationError(chainError);
            return;
        }

        const { isValid, error: amountError } = validateBridgeAmount(amount, usdcSourceBalance, USDC_DECIMALS);
        if (!isValid) {
            setValidationError(amountError);
            return;
        }

        if (!isWalletOnSourceChain) {
            try {
                await switchChain({ chainId: sourceChainId });
            } catch (e) {
                console.error('Switch chain failed:', e);
                setValidationError(`Could not switch to ${sourceChainConfig?.shortName}`);
            }
            return;
        }

        setValidationError(null);

        if (requiresApproval) {
            console.log('Approving USDC...');
            writeApprove({
                address: sourceChainConfig.usdcAddress,
                abi: BRIDGE_ABI.USDC,
                functionName: 'approve',
                args: [sourceChainConfig.tokenMessengerAddress, maxUint256],
                chainId: sourceChainId
            });
        } else {
            executeDepositForBurn();
        }
    };

    // ---------- swap chains UI ----------
    const swapChains = () => {
        if (sourceChainId === destinationChainId) return;
        const prevSource = sourceChainId;
        setSourceChainId(destinationChainId);
        setDestinationChainId(prevSource);
        setAmount('');
        setBurnSuccessMessage(null);
        setValidationError(null);
        setHasApproved(false);
        setApproveHash(null);
        setBurnHash(null);
        setMintHash(null);
        mintTriggeredRef.current = false;
    };

    const handleSetMaxAmount = () => {
        if (usdcSourceBalance > 0n) {
            const maxAmount = formatUnits(usdcSourceBalance, USDC_DECIMALS);
            setAmount(maxAmount);
        }
    };

    // ---------- effects to progress flow ----------

    // 1) When approve confirmed -> set hasApproved and trigger burn
    // 2) When burn confirmed -> show burnSuccessMessage and start attestation polling
    // 3) When mint confirmed -> finalize and reset
    useEffect(() => {
        if (isApproveConfirmed && !burnHash && amountInWei > 0n) {
            refetchAllowance();
            console.log('Approval confirmed');
            setHasApproved(true);
            executeDepositForBurn();
        } else if (isBurnConfirmed && !burnSuccessMessage) {
            console.log('Burn confirmed', burnHash);
            setBurnSuccessMessage({
                sourceChain: sourceChainConfig?.name,
                destinationChain: destinationChainConfig?.name,
                amount: formatUnits(amountInWei, USDC_DECIMALS),
                hash: burnHash
            });
            refetchUsdcSourceBalance();
            setAttestationStatus('pending');
        } else if (isMintConfirmed) {
            console.log('Mint confirmed', mintHash);
            refetchUsdcDestinationBalance();
            // reset everything
            setBurnSuccessMessage(null);
            setAttestationStatus(null);
            setAttestationData({ message: null, attestation: null });
            setApproveHash(null);
            setBurnHash(null);
            setMintHash(null);
            setAmount('');
            setHasApproved(false);
            mintTriggeredRef.current = false;
        }
    }, [
        isApproveConfirmed,
        isBurnConfirmed,
        isMintConfirmed,
        burnHash,
        amountInWei,
        sourceChainConfig,
        destinationChainConfig,
        refetchUsdcSourceBalance,
        refetchUsdcDestinationBalance,
        refetchAllowance,
        executeDepositForBurn,
        burnSuccessMessage,
        mintHash
    ]);

    // Poll attestation after burn
    useEffect(() => {
        if (!burnSuccessMessage?.hash || attestationStatus === 'complete' || mintHash || attestationStatus === 'error') {
            return;
        }

        const burnTxHash = burnSuccessMessage.hash;
        const sourceDomainId = sourceChainConfig.domainId;
        const attestationUrl = getAttestationUrl(sourceDomainId, burnTxHash);

        if (!attestationUrl) {
            console.error('Missing attestation URL');
            setValidationError('Missing Attestation URL function in config.');
            setAttestationStatus('error');
            return;
        }

        setAttestationStatus('pending');
        console.log('Polling attestation at', attestationUrl);

        let pollCount = 0;
        const startTime = Date.now();

        const poll = () => {
            pollCount++;
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            console.log(`Polling attempt #${pollCount} (${elapsed}s)`);

            fetch(attestationUrl)
                .then((res) => {
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return res.json();
                })
                .then((data) => {
                    const messageData = data?.messages?.[0];
                    const status = messageData?.status;
                    const message = messageData?.message;
                    const attestation = messageData?.attestation;

                    const isAttestationReady = attestation && typeof attestation === 'string' && attestation.startsWith('0x');

                    if (status === 'complete' && message && isAttestationReady) {
                        console.log('Attestation complete');
                        setAttestationStatus('complete');
                        setAttestationData({ message, attestation });
                    } else if (
                        status === 'pending' ||
                        status === 'pending_confirmations' ||
                        status === 'in_progress' ||
                        attestation === 'PENDING' ||
                        !status
                    ) {
                        setTimeout(poll, POLLING_INTERVAL);
                    } else {
                        console.error('Attestation failed status:', status);
                        setAttestationStatus('error');
                        setValidationError(`Attestation failed with status: ${status}`);
                    }
                })
                .catch((error) => {
                    console.error('Error fetching attestation:', error);
                    setTimeout(poll, 10000);
                });
        };

        const timeoutId = setTimeout(poll, POLLING_INTERVAL);
        return () => clearTimeout(timeoutId);
    }, [burnSuccessMessage, attestationStatus, mintHash, sourceChainConfig]);

    // Trigger mint once attestation ready, guarded by mintTriggeredRef
    useEffect(() => {
        if (
            attestationStatus === 'complete' &&
            attestationData.message &&
            attestationData.attestation &&
            !mintHash &&
            !isMintPending &&
            !mintTriggeredRef.current
        ) {
            executeReceiveMessage();
        }
    }, [attestationStatus, attestationData, mintHash, isMintPending, executeReceiveMessage]);

    // If mint error occurs while ref is set, reset it so user can retry
    useEffect(() => {
        if (mintError && mintTriggeredRef.current) {
            // console.error('Mint error detected, resetting mint trigger');
            mintTriggeredRef.current = false;
        }
    }, [mintError]);

    // button text & disable logic
    const getButtonText = () => {
        if (!isConnected) return 'Connect Wallet';
        if (mintHash) {
            if (isMintConfirming) return 'Confirming Mint TX...';
            if (isMintPending) return 'Minting USDC...';
            if (isMintConfirmed) return 'Bridge Complete';
        }
        if (burnHash && !isMintConfirmed) {
            if (attestationStatus === 'pending') return 'Waiting for Circle Attestation...';
            if (attestationStatus === 'error') return 'Attestation Error! Check Console';
            if (attestationStatus === 'complete') {
                if (currentChainId !== destinationChainId) return `Auto-switching to ${destinationChainConfig?.shortName}...`;
                if (isMintPending || mintTriggeredRef.current) return 'Waiting for Wallet (Mint)...';
                return 'Auto-minting USDC...';
            }
        }
        if (validationError) return 'Fix Error Above';
        if (!isWalletOnSourceChain) return `Switch to ${sourceChainConfig?.shortName || 'Source Chain'}`;
        if (isProcessing) {
            if (isTxConfirming) return 'Confirming Transaction...';
            if (isApproveConfirmed && !burnHash) return 'Approval Confirmed! (Starting Bridge...)';
            return 'Waiting for Wallet...';
        }
        if (requiresApproval) return `Approve ${amount} USDC`;
        return 'Bridge USDC';
    };

    // Nút action chỉ bị disabled nếu chưa kết nối VÀ KHÔNG phải đang ở trạng thái xử lý
    const isActionButtonDisabled = isProcessing || !!validationError || (amountInWei === 0n && !requiresApproval) || !sourceChainConfig || !destinationChainConfig || (isConnected && amountInWei === 0n);

    // Hàm hiển thị số dư, trả về "---" nếu chưa kết nối
    const renderBalance = (balance, isLoading) => {
        if (!isConnected) return '---';
        if (isLoading) return '...';
        return formatBalance(balance, USDC_DECIMALS, 2);
    };

    return (
        <div className="bridge-container">
            <h1 className="text-3xl font-bold mb-6 text-center">Circle CCTP USDC Bridge (Testnet)</h1>
            <img className="text-3xl font-bold mb-6 text-center" src={CCTPLogo} alt="Bridge" />

            <div className="bridge-form-card">
                <div className="chain-selector-group-top">
                    <div className="flex justify-between items-center mb-2">
                        <label>From chain</label>
                        <span className="text-sm text-gray-400 font-medium">
                            USDC : {renderBalance(usdcSourceBalance, isSourceBalanceLoading)}
                        </span>
                    </div>
                    <select
                        value={sourceChainId}
                        onChange={(e) => setSourceChainId(parseInt(e.target.value))}
                        disabled={isProcessing}
                        className="bg-gray-800 border-gray-700"
                    >
                        {SUPPORTED_CHAINS.map((chain) => (
                            <option key={chain.id} value={chain.id}>
                                {chain.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="swap-button-container">
                    <button className="swap-chains-btn" onClick={swapChains} disabled={isProcessing}>
                        <RefreshCcw size={20} />
                    </button>
                </div>

                <div className="chain-selector-group-bottom">
                    <div className="flex justify-between items-center mb-2">
                        <label>To the chain</label>
                        <span className="text-sm text-gray-400 font-medium">
                            USDC : {renderBalance(usdcDestinationBalance, isDestinationBalanceLoading)}
                        </span>
                    </div>
                    <select
                        value={destinationChainId}
                        onChange={(e) => setDestinationChainId(parseInt(e.target.value))}
                        disabled={isProcessing}
                        className="bg-gray-800 border-gray-700"
                    >
                        {SUPPORTED_CHAINS.map((chain) => (
                            <option key={chain.id} value={chain.id}>
                                {chain.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="input-amount-card">
                    <div className="amount-header">
                        <label>Balance USDC</label>
                        <p className="chain-balance text-sm text-gray-400">
                            Available: {isConnected && isWalletOnSourceChain ? (isSourceBalanceLoading ? 'Loading...' : `${formatBalance(usdcSourceBalance, USDC_DECIMALS, 2)} USDC`) : 'Connect wallet to see balance'}
                        </p>
                    </div>
                    <div className="amount-input-control">
                        <input
                            type="text"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, '').slice(0, 20))}
                            disabled={isProcessing || !isConnected} // 🛑 Vô hiệu hóa input khi chưa kết nối
                        />
                        {isConnected && usdcSourceBalance > 0n && (
                            <button className="max-button" onClick={handleSetMaxAmount} disabled={isProcessing}>
                                MAX
                            </button>
                        )}
                    </div>
                    <span className="token-symbol">USDC</span>
                </div>

                <button className="main-action-button" onClick={handleAction} disabled={isActionButtonDisabled && isConnected}>
                    {getButtonText()}
                </button>

                {!isConnected && <p className="connect-wallet-message">Connect wallet to begin the bridge process</p>}

                {(isProcessing || currentError || validationError || burnSuccessMessage) && isConnected && ( // Chỉ hiển thị trạng thái TX khi đã kết nối
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
                                <p>
                                    ✅ <strong>Phase 2:</strong> Deposited {burnSuccessMessage.amount} USDC from {burnSuccessMessage.sourceChain} to{' '}
                                    {burnSuccessMessage.destinationChain}.
                                </p>

                                {!isMintConfirmed ? (
                                    <>
                                        {attestationStatus === 'pending' && (
                                            <p className="status-polling">
                                                <RefreshCcw size={14} className="animate-spin mr-1" /> <strong>Phase 3:</strong> Waiting for Attestation from Circle...
                                            </p>
                                        )}
                                        {attestationStatus === 'error' && (
                                            <p className="transaction-status error">
                                                <X size={16} /> Attestation Error. Please check console or trace manually.
                                            </p>
                                        )}
                                        {attestationStatus === 'complete' && !mintHash && (
                                            <p className="status-complete">
                                                <Gift size={14} className="mr-1" /> Attestation Ready! Automatically send Mint transactions...
                                            </p>
                                        )}
                                        {(isMintPending || (mintHash && !isMintConfirmed)) && (
                                            <p className="status-polling">
                                                <RefreshCcw size={14} className="animate-spin mr-1" /> <strong>Phase 4:</strong> Minting USDC on {destinationChainConfig?.shortName || 'Destination Chain'}...
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <p className="status-complete">
                                        🎉 <strong>Bridge COMPLETE!</strong> {burnSuccessMessage.amount} USDC has been successfully minted on {burnSuccessMessage.destinationChain}. Hash:{' '}
                                        <a href={`${destinationChainConfig?.explorerUrl}/tx/${mintHash}`} target="_blank" rel="noopener noreferrer">
                                            {shortenAddress(mintHash)}
                                        </a>
                                    </p>
                                )}

                                <p>
                                    <a href={getAttestationUrl(sourceChainConfig.domainId, burnSuccessMessage.hash)} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-300 hover:text-blue-200">
                                        Track Attestation Status <ArrowRight size={14} className="ml-1" />
                                    </a>
                                </p>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
};

export default BridgePage;