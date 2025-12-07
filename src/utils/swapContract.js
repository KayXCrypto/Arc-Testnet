import { ethers } from 'ethers';

// ⚠️ CẦN CẬP NHẬT: Thay thế bằng địa chỉ hợp đồng Swap THỰC TẾ của bạn trên Arc Testnet
const SWAP_CONTRACT_ADDRESS = '0xA56027E1a2A45B1eAd4D3208a93f3279BcE8E9F3';

// ⚠️ CẦN CẬP NHẬT: Thông số cấu hình của Arc Testnet
const ARC_TESTNET_CONFIG = {
    // Thay thế bằng Chain ID thực tế của Arc Testnet
    chainId: '5042002',
    chainName: 'Arc Testnet',
    rpcUrl: 'https://rpc.testnet.arc.network',
    blockExplorer: 'https://testnet.arcscan.app'
};

// ⚠️ CẦN CẬP NHẬT: Địa chỉ token thực tế trên Arc Testnet
const TOKEN_ADDRESSES = {
    USDC: '0x3600000000000000000000000000000000000000', // USDC contract address
    EURC: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a', // EURC contract address
    USDT: '0x175CdB1D338945f0D851A741ccF787D343E57952', // USDT contract address
};

// Simple Swap Contract ABI (Phải khớp với FeeSwap/SimpleSwap.sol)
const SWAP_ABI = [
    'function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut) external returns (uint256)',
    'function getExchangeRate(address tokenIn, address tokenOut) external view returns (uint256)',
];

const ERC20_ABI = [
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function balanceOf(address owner) external view returns (uint256)',
    'function decimals() external view returns (uint8)',
];

export class SwapService {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.swapContract = null;
    }

    async initialize() {
        if (typeof window.ethereum === 'undefined') {
            throw new Error('Please install MetaMask!');
        }

        this.provider = new ethers.BrowserProvider(window.ethereum);
        this.signer = await this.provider.getSigner();

        this.swapContract = new ethers.Contract(
            SWAP_CONTRACT_ADDRESS,
            SWAP_ABI,
            this.signer
        );
    }

    async switchToArcTestnet() {
        // ... (Logic switch chain không đổi)
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: ARC_TESTNET_CONFIG.chainId }],
            });
        } catch (error) {
            if (error.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [ARC_TESTNET_CONFIG],
                });
            }
        }
    }


    async getContractExchangeRate(fromToken, toToken) {
        if (!this.signer) await this.initialize();

        const fromAddress = TOKEN_ADDRESSES[fromToken];
        const toAddress = TOKEN_ADDRESSES[toToken];

        if (!fromAddress || !toAddress) {
            throw new Error("Lỗi cấu hình: Địa chỉ token bị thiếu trong TOKEN_ADDRESSES.");
        }

        try {
            // Sử dụng staticCall để gọi hàm view
            const rateWei = await this.swapContract.getExchangeRate.staticCall(fromAddress, toAddress);

            const rate = ethers.formatUnits(rateWei, 18);
            const numericRate = parseFloat(rate);

            if (numericRate === 0) {
                // Nếu hợp đồng trả về 0 (chưa thiết lập tỷ giá), ném lỗi rõ ràng
                throw new Error(`Tỷ giá hối đoái cho ${fromToken}-${toToken} là 0. Owner CẦN thiết lập tỷ giá trên hợp đồng Swap.`);
            }

            return numericRate;

        } catch (error) {
            // Xử lý lỗi phổ biến nhất khi hàm view revert (BAD_DATA)
            if (error.code === 'BAD_DATA' || error.message.includes('revert')) {
                console.error("Lỗi Revert Contract:", error);
                // Thông báo này sẽ giúp người dùng biết cần kiểm tra lại cấu hình
                throw new Error(`LỖI CẤU HÌNH HỢP ĐỒNG: Vui lòng kiểm tra 1) SWAP_CONTRACT_ADDRESS có đúng không, và 2) Owner đã gọi setExchangeRate trên hợp đồng chưa.`);
            }
            throw error;
        }
    }


    async approveToken(tokenSymbol, amount) {
        if (!this.signer) await this.initialize();
        const tokenAddress = TOKEN_ADDRESSES[tokenSymbol];
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);

        const decimals = await tokenContract.decimals();
        const amountInWei = ethers.parseUnits(amount.toString(), decimals);

        // Phê duyệt cho hợp đồng Swap (target là địa chỉ hợp đồng Swap)
        const tx = await tokenContract.approve(this.swapContract.target, amountInWei);
        await tx.wait();
    }


    async executeSwap(fromToken, toToken, amount, slippage, currentRate) {
        if (!this.signer) await this.initialize();

        // 1. Tính toán lượng tối thiểu (sử dụng Number)
        const expectedOutput = amount * currentRate;
        const minAmount = expectedOutput * (1 - slippage / 100);

        const fromAddress = TOKEN_ADDRESSES[fromToken];
        const toAddress = TOKEN_ADDRESSES[toToken];

        const tokenContractIn = new ethers.Contract(fromAddress, ERC20_ABI, this.provider);
        const tokenContractOut = new ethers.Contract(toAddress, ERC20_ABI, this.provider);

        // 2. Fetch Decimals và chuyển thành Number
        const decimalsInBigInt = await tokenContractIn.decimals();
        const decimalsOutBigInt = await tokenContractOut.decimals();

        const decimalsIn = Number(decimalsInBigInt); // ⭐️ FIX: Chuyển BigInt về Number
        const decimalsOut = Number(decimalsOutBigInt); // ⭐️ FIX: Chuyển BigInt về Number

        // 3. Chuyển đổi amountIn và minAmountIn sang Wei (BigInt)
        const amountInWei = ethers.parseUnits(amount.toString(), decimalsIn);

        // Dùng decimalsOut (Number) trong toFixed()
        const minAmountInWei = ethers.parseUnits(minAmount.toFixed(decimalsOut).toString(), decimalsOut);

        // 4. Thực hiện swap
        const tx = await this.swapContract.swap(
            fromAddress,
            toAddress,
            amountInWei,
            minAmountInWei
        );

        const receipt = await tx.wait();
        return receipt;
    }
}