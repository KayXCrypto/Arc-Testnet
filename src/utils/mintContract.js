// mintContract.js
import { ethers } from 'ethers';

// ⚠️ CẦN CẬP NHẬT: Thông số cấu hình của Arc Testnet
const ARC_TESTNET_CONFIG = {
    chainId: '5042002',
    chainName: 'Arc Testnet',
    rpcUrl: 'https://rpc.testnet.arc.network',
    blockExplorer: 'https://testnet.arcscan.app'
};

// ⚠️ CẦN CẬP NHẬT: Địa chỉ hợp đồng NFT và USDC thực tế trên Arc Testnet
const NFT_CONTRACT_ADDRESS = '0x13A22838aC8cf889299590C5754CC400BcE7b6f7';
const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';

// ABI cho ArcPremiumCard (chỉ các hàm cần thiết)
const NFT_ABI = [
    'function mintPrice() external view returns (uint256)',
    'function totalMinted() external view returns (uint256)',
    'function hasMinted(address) external view returns (bool)',
    // ⭐ HÀM MINT CHỈ CÓ 2 TRƯỜNG: ipHash và tokenURI
    'function mint(bytes32 ipHash, string memory tokenURI) public returns (uint256)',
];

// ABI cơ bản cho ERC20 (USDC)
const ERC20_ABI = [
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function allowance(address owner, address spender) external view returns (uint256)',
    'function decimals() external view returns (uint8)',
];

const USDC_DECIMALS = 6;

export class MintService {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.nftContract = null;
        this.usdcContract = null;
    }

    async initialize() {
        if (typeof window.ethereum === 'undefined') {
            throw new Error('Vui lòng cài đặt MetaMask!');
        }

        this.provider = new ethers.BrowserProvider(window.ethereum);
        this.signer = await this.provider.getSigner();

        this.nftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, this.signer);
        this.usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, this.signer);
    }

    /**
     * Tạo IP Hash từ IP Address
     * @param {string} ipAddress - Địa chỉ IP thật (VD: "192.168.1.1")
     * @returns {string} - Hash của IP address
     */
    generateIpHash(ipAddress) {
        return ethers.keccak256(ethers.toUtf8Bytes(ipAddress));
    }

    /**
     * Lấy thông tin mint data
     * @param {string} userAddress - Địa chỉ ví của người dùng
     * @returns {Object} - { mintPrice, totalMinted, hasUserMinted }
     */
    async fetchMintData(userAddress) {
        if (!this.provider) await this.initialize();

        const nftReadOnly = new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, this.provider);

        const [mintPriceWei, totalMintedBigInt, hasUserMinted] = await Promise.all([
            nftReadOnly.mintPrice(),
            nftReadOnly.totalMinted(),
            nftReadOnly.hasMinted(userAddress)
        ]);

        const mintPrice = parseFloat(ethers.formatUnits(mintPriceWei, USDC_DECIMALS));
        const totalMinted = Number(totalMintedBigInt);

        return {
            mintPrice,
            totalMinted,
            hasUserMinted
        };
    }

    /**
     * Approve USDC cho NFT Contract
     * @param {number} amount - Số lượng USDC cần approve
     * @returns {Promise} - Transaction receipt
     */
    async approveUSDC(amount) {
        if (!this.signer) await this.initialize();

        const amountWei = ethers.parseUnits(amount.toString(), USDC_DECIMALS);

        // Approve NFT Contract để chi tiêu USDC
        const tx = await this.usdcContract.approve(NFT_CONTRACT_ADDRESS, amountWei);
        return tx.wait();
    }

    /**
     * ⭐ MINT NFT - Chỉ 2 trường: ipHash và tokenURI
     * @param {string} ipAddress - Địa chỉ IP thật của người dùng
     * @param {string} userName - Tên người dùng (không dùng trong contract, chỉ để log)
     * @param {number} mintPriceAmount - Giá mint (không dùng trong contract, chỉ để validate)
     * @param {string} metadataUrl - URL metadata từ IPFS (ipfs://...)
     * @returns {Promise} - Transaction receipt
     */
    async mintNFT(ipAddress, userName, mintPriceAmount, metadataUrl) {
        if (!this.signer) await this.initialize();

        // Validate inputs
        if (!ipAddress || ipAddress === 'unknown') {
            throw new Error('Invalid IP address');
        }

        if (!metadataUrl || !metadataUrl.startsWith('ipfs://')) {
            throw new Error('Invalid metadata URL. Must be IPFS URL (ipfs://...)');
        }

        console.log('Minting NFT with:', {
            ipAddress,
            userName,
            metadataUrl
        });

        // Tạo IP Hash
        const ipHash = this.generateIpHash(ipAddress);
        console.log('IP Hash:', ipHash);

        // ⭐ GỌI HÀM MINT VỚI 2 THAM SỐ: ipHash và tokenURI
        try {
            const tx = await this.nftContract.mint(ipHash, metadataUrl);
            console.log('MetadataUrl: ', metadataUrl);
            console.log('Transaction sent:', tx.hash);

            const receipt = await tx.wait();
            console.log('Transaction confirmed:', receipt);

            return receipt;
        } catch (error) {
            console.error('Mint transaction failed:', error);

            // Xử lý các loại lỗi cụ thể
            if (error.message.includes('IP has already minted')) {
                throw new Error('IP has already minted');
            } else if (error.message.includes('Wallet has already minted')) {
                throw new Error('Wallet has already minted');
            } else if (error.message.includes('user rejected')) {
                throw new Error('Transaction rejected by user');
            } else if (error.message.includes('insufficient funds')) {
                throw new Error('Insufficient funds for gas fee');
            }

            throw error;
        }
    }

    /**
     * Kiểm tra allowance USDC
     * @param {string} userAddress - Địa chỉ ví của người dùng
     * @returns {number} - Số USDC đã approve
     */
    async checkAllowance(userAddress) {
        if (!this.provider) await this.initialize();

        const allowanceWei = await this.usdcContract.allowance(userAddress, NFT_CONTRACT_ADDRESS);
        return parseFloat(ethers.formatUnits(allowanceWei, USDC_DECIMALS));
    }

    /**
     * Lấy thông tin chain hiện tại
     * @returns {Object} - { chainId, chainName }
     */
    async getCurrentChain() {
        if (!this.provider) await this.initialize();

        const network = await this.provider.getNetwork();
        return {
            chainId: network.chainId.toString(),
            chainName: network.name
        };
    }

    /**
     * Chuyển đổi sang Arc Testnet
     * @returns {Promise} - Success or error
     */
    async switchToArcTestnet() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${parseInt(ARC_TESTNET_CONFIG.chainId).toString(16)}` }],
            });
        } catch (switchError) {
            // Chain chưa được thêm vào MetaMask
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: `0x${parseInt(ARC_TESTNET_CONFIG.chainId).toString(16)}`,
                            chainName: ARC_TESTNET_CONFIG.chainName,
                            rpcUrls: [ARC_TESTNET_CONFIG.rpcUrl],
                            blockExplorerUrls: [ARC_TESTNET_CONFIG.blockExplorer],
                            nativeCurrency: {
                                name: 'ARC',
                                symbol: 'ARC',
                                decimals: 18
                            }
                        }],
                    });
                } catch (addError) {
                    throw new Error('Failed to add Arc Testnet to MetaMask');
                }
            } else {
                throw switchError;
            }
        }
    }
}