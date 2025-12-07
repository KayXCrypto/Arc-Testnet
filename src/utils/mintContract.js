// mintContract.js
import { ethers } from 'ethers';

// ⚠️ CẦN CẬP NHẬT: Thông số cấu hình của Arc Testnet
const ARC_TESTNET_CONFIG = {
    // Thay thế bằng Chain ID thực tế của Arc Testnet
    chainId: '5042002',
    chainName: 'Arc Testnet',
    rpcUrl: '	https://rpc.testnet.arc.network',
    blockExplorer: 'https://testnet.arcscan.app'
};

// ⚠️ CẦN CẬP NHẬT: Địa chỉ hợp đồng NFT và USDC thực tế trên Arc Testnet
const NFT_CONTRACT_ADDRESS = '0x13A22838aC8cf889299590C5754CC400BcE7b6f7';
const USDC_ADDRESS = '0x3600000000000000000000000000000000000000'; // Giả định địa chỉ USDC

// ABI cho ArcPremiumCard (chỉ các hàm cần thiết)
const NFT_ABI = [
    'function mintPrice() external view returns (uint256)',
    'function totalMinted() external view returns (uint256)',
    'function hasMinted(address) external view returns (bool)',
    'function mint(bytes32 ipHash, string memory tokenURI) public returns (uint256)',
];

// ABI cơ bản cho ERC20 (USDC)
const ERC20_ABI = [
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function allowance(address owner, address spender) external view returns (uint256)',
    'function decimals() external view returns (uint8)',
];

const USDC_DECIMALS = 6;

// ⭐ HÀM MỚI: Tạo Base64 Encoded TokenURI chứa tên người dùng
function encodeMetadata(userName) {
    const metadata = {
        name: "Arc Premium Card",
        description: `Personalized Arc Premium Card for ${userName}.`,
        attributes: [
            { trait_type: "User_Name", value: userName },
            { trait_type: "Issuer", value: "Arc Testnet" }
        ],
        // Dùng URL giả lập: Giả định server backend sẽ đọc tên này và dùng generateCard.js để tạo ảnh.
        image: "https://api.arc.io/nft/card/user_name=" + encodeURIComponent(userName)
    };
    const jsonString = JSON.stringify(metadata);
    // Sử dụng btoa() để mã hóa Base64 phía trình duyệt
    return "data:application/json;base64," + btoa(jsonString);
}


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

    // Hàm giả định để tạo IP Hash (cần logic phía server/backend thực tế)
    generateIpHash(ipAddress) {
        // HASH GIẢ LẬP: Cần logic phía server để có IP thật và Hash an toàn
        return ethers.keccak256(ethers.toUtf8Bytes(ipAddress));
    }

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

    async approveUSDC(amount) {
        if (!this.signer) await this.initialize();

        const amountWei = ethers.parseUnits(amount.toString(), USDC_DECIMALS);

        // Approve NFT Contract để chi tiêu USDC
        const tx = await this.usdcContract.approve(NFT_CONTRACT_ADDRESS, amountWei);
        return tx.wait();
    }

    // ⭐ HÀM ĐÃ SỬA: Chấp nhận userName
    async mintNFT(ipAddress, userName, mintPriceAmount) {
        if (!this.signer) await this.initialize();

        const ipHash = this.generateIpHash(ipAddress);

        // ⭐ Tạo tokenURI với tên người dùng
        const tokenURI = encodeMetadata(userName);

        const mintPriceWei = ethers.parseUnits(mintPriceAmount.toString(), USDC_DECIMALS);

        const tx = await this.nftContract.mint(ipHash, tokenURI);
        return tx.wait();
    }
}