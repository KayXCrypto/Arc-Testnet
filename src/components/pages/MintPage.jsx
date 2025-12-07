import React, { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { CreditCard, Zap, Info, Shield, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
// Đảm bảo các component này đã được tạo
import { MintService } from '../../utils/mintContract';
import AssetTabBottom from '../AssetTabBottom';
import ContactFooter from '../ContactFooter';
import '../../styles/mint.css';
import ArcCardTemplate from '../../assets/premium.png'

// Khởi tạo dịch vụ Mint (Giả định file mintContract.js đã được đặt đúng)
const mintService = new MintService();
const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';

const MintPage = () => {
    const { address, isConnected } = useAccount();

    // --- State
    const [mintPrice, setMintPrice] = useState(0);
    const [totalMinted, setTotalMinted] = useState(0);
    const [maxSupply] = useState(1000);
    const [hasMinted, setHasMinted] = useState(false);
    const [userName, setUserName] = useState('');
    const [ipAddress] = useState('192.168.1.1');
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Connect your wallet to check the status.');
    const [step, setStep] = useState(0);

    // Fetch USDC balance
    const { data: usdcBalanceData } = useBalance({
        address: address,
        token: USDC_ADDRESS,
        enabled: isConnected
    });
    const usdcBalance = usdcBalanceData ? parseFloat(usdcBalanceData.formatted) : 0;


    // --- Logic Fetch Data (Giữ nguyên)
    useEffect(() => {
        if (!address) return;

        const fetchData = async () => {
            setIsLoading(true);
            setStatusMessage('Loading mint information...');
            try {
                const data = await mintService.fetchMintData(address);
                setMintPrice(data.mintPrice);
                setTotalMinted(data.totalMinted);
                setHasMinted(data.hasUserMinted);

                if (data.hasUserMinted) {
                    setStatusMessage('You already own the Arc Premium Card!');
                    setStep(3);
                } else {
                    setStatusMessage(`Ready to mint. Price: ${data.mintPrice.toFixed(2)} USDC.`);
                    setStep(1);
                }

            } catch (error) {
                console.error("Mint data loading error:", error);
                setStatusMessage('Data loading error. Please check the console.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [address]);


    // --- Handlers (Giữ nguyên)
    const handleApprove = async () => {
        if (usdcBalance < mintPrice) {
            setStatusMessage('Error: Insufficient USDC balance.');
            return;
        }

        setIsLoading(true);
        setStatusMessage('Waiting for USDC approval...');
        try {
            await mintService.approveUSDC(mintPrice);
            setStatusMessage('USDC approved successfully! Ready to mint.');
            setStep(2);
        } catch (error) {
            console.error("Approve Error:", error);
            setStatusMessage(`Approve Error: Transaction was rejected or the allowance has been exhausted.`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMint = async () => {
        if (!userName.trim()) {
            setStatusMessage('Error: Please enter your name.');
            return;
        }

        if (usdcBalance < mintPrice) {
            setStatusMessage('Error: Insufficient USDC balance.');
            return;
        }

        setIsLoading(true);
        setStatusMessage('Waiting for NFT minting...');
        try {
            await mintService.mintNFT(ipAddress, userName.trim(), mintPrice);

            setStatusMessage('Congratulations! You have successfully minted the Arc Premium Card!');
            setHasMinted(true);
            setTotalMinted(prev => prev + 1);
            setStep(3);
        } catch (error) {
            console.error("Error Mint:", error);
            setStatusMessage(`Error Mint: Wallet/IP has already minted or the transaction was rejected.`);
        } finally {
            setIsLoading(false);
        }
    };

    const renderActionButton = () => {
        if (!isConnected) {
            return <ConnectButton label="Connect Wallet & Mint" />;
        }

        if (hasMinted) {
            return (
                <button disabled className="mint-action-button success">
                    <CheckCircle size={20} /> Minted (Own)
                </button>
            );
        }

        if (usdcBalance < mintPrice) {
            return (
                <button disabled className="mint-action-button disabled">
                    <AlertCircle size={20} /> Missing {mintPrice.toFixed(2)} USDC
                </button>
            );
        }

        if (step === 1 || step === 0) {
            return (
                <button
                    onClick={handleApprove}
                    disabled={isLoading}
                    className={`mint-action-button ${isLoading ? 'loading' : 'approve'}`}
                >
                    {isLoading ? <Loader2 className="spinner" size={20} /> : <Shield size={20} />}
                    {isLoading ? 'Approving...' : `1. Approve ${mintPrice.toFixed(2)} USDC`}
                </button>
            );
        }

        if (step === 2) {
            const isNameMissing = !userName.trim();
            return (
                <button
                    onClick={handleMint}
                    disabled={isLoading || isNameMissing}
                    className={`mint-action-button ${isLoading ? 'loading' : isNameMissing ? 'disabled' : 'mint'}`}
                >
                    {isLoading ? <Loader2 className="spinner" size={20} />
                        : isNameMissing ? <AlertCircle size={20} />
                            : <CreditCard size={20} />}
                    {isLoading ? 'Minting...' : isNameMissing ? 'Please enter a name' : `2. Mint Arc Premium Card`}
                </button>
            );
        }

        return null;
    };

    return (
        // 🌟 SỬ DỤNG FRAGMENT để đặt nội dung chính và footer
        <>
            {/* Thay thế <main className="mint-container"> bằng div để tránh lồng thẻ <main> */}
            <div className="mint-content-container">
                <div className="mint-header">
                    <h1 className="mint-title">Arc Premium Card NFT</h1>
                    <p className="mint-subtitle">Mint exclusive cards to unlock Web3 benefits on Arc.</p>
                </div>

                <div className="mint-card-grid">
                    {/* --- Cột bên trái: Card NFT Preview --- */}
                    <div className="premium-card-mockup">
                        <div className="card-image-placeholder">
                            <img
                                src={ArcCardTemplate}
                                alt="Arc Premium Card NFT"
                                className="card-image-actual"
                            />
                        </div>
                        <div className="card-info-box">
                            <h3 className="card-info-title">Exclusive benefits</h3>
                            <ul className="card-benefits-list">
                                <li>Discounted transaction fees on Arc Swap</li>
                                <li>Early access to new features</li>
                                <li>Tăng cường phần thưởng Staking</li>
                                <li>Price: {mintPrice.toFixed(2)} USDC</li>
                            </ul>
                        </div>
                    </div>

                    {/* --- Cột bên phải: Mint Controls --- */}
                    <div className="mint-controls">

                        {/* INPUT TÊN NGƯỜI DÙNG */}
                        <div className="user-name-input-group">
                            <label htmlFor="userName" className="input-label">Register Card</label>
                            <input
                                id="userName"
                                type="text"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value.slice(0, 20))}
                                placeholder="Enter name (ex: Smod)"
                                className="name-input-field"
                                disabled={isConnected && (hasMinted || step === 3) || isLoading}
                            />
                        </div>

                        <div className="mint-stats">
                            <div className="stat-item">
                                <span className="stat-value">{totalMinted}</span>
                                <span className="stat-label">Minted</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-value">{maxSupply}</span>
                                <span className="stat-label">Total Supply</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-value">{mintPrice.toFixed(2)} USDC</span>
                                <span className="stat-label">Mint Price</span>
                            </div>
                        </div>

                        <div className="status-box">
                            <Info size={16} />
                            <span>{statusMessage}</span>
                        </div>

                        {isConnected && (
                            <div className="balance-info">
                                <span className="label">My USDC Balance:</span>
                                <span className="value">{usdcBalance.toFixed(2)} USDC</span>
                            </div>
                        )}

                        {renderActionButton()}

                        <div className="mint-info-footer">
                            <Zap size={16} color="#3b82f6" />
                            <span>Mint is limited to 1 card per wallet. Arc Testnet gas fee required.</span>
                        </div>

                    </div>
                </div>

                <AssetTabBottom />
            </div>

            {/* ContactFooter nằm ngoài content container, đảm bảo luôn ở cuối trang */}
            <ContactFooter />
        </>
    );
};

export default MintPage;