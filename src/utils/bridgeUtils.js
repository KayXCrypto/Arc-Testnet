import { ethers } from 'ethers';
// Cần cài đặt và chạy dotenv trên môi trường Node.js. 
// Trong ứng dụng React/Vite, các biến này nên được truyền qua ENV từ build tool.
// Giả sử các biến ENV đã được expose ra môi trường web như VITE_...

// Lấy ABI đã cung cấp (hoặc import trực tiếp nếu tệp ABI nằm trong src/assets)
import bridgeArcABI from '../abi/BridgeARC.json';
import bridgePharosABI from '../abi/BridgePharos.json';
import erc20ABI from '../abi/ERC20ABI.json'; 

// Cấu hình (Sử dụng các biến từ .env, cần được expose ra frontend)
const BRIDGE_CONFIG = {
    ARC: { 
        name: "ARC Chain", 
        tokenSymbol: "ARC-USDC", 
        bridgeAddress: import.meta.env.VITE_BRIDGE_ARC_ADDRESS || "0xBCB3796Bf8AC3bE9f135F6CcB5e0A4083ad50c30",
        tokenAddress: import.meta.env.VITE_MOCK_ARC_ADDRESS || "0xC94b6e9aA17581e6BF247283a1C4373F2dD091E7",
        rpcUrl: import.meta.env.VITE_ARC_RPC || "https://rpc.testnet.arc.network",
        abi: bridgeArcABI
    },
    PHAROS: { 
        name: "PHAROS Chain", 
        tokenSymbol: "PHAROS-USDC", 
        bridgeAddress: import.meta.env.VITE_BRIDGE_PHAROS_ADDRESS || "0x372f7DB87f138a1E8BEcBBCCDDA89bbbf1382121",
        tokenAddress: import.meta.env.VITE_MOCK_PHAROS_ADDRESS || "0xD171450128F63458D96901A770074341D44A36bE",
        rpcUrl: import.meta.env.VITE_PHAROS_RPC || "https://atlantic.dplabs-internal.com",
        abi: bridgePharosABI
    },
};

/**
 * Khởi tạo Provider và Signer từ ví MetaMask (window.ethereum).
 * @returns {ethers.BrowserProvider} Provider
 * @returns {ethers.JsonRpcSigner} Signer
 */
const getEthersData = async () => {
    if (!window.ethereum) {
        throw new Error("MetaMask không được tìm thấy. Vui lòng cài đặt!");
    }
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return { provider, signer };
};

/**
 * Lấy đối tượng Contract của Token (ERC20)
 * @param {string} tokenAddress - Địa chỉ của token trên chuỗi hiện tại
 * @param {ethers.JsonRpcSigner} signer - Signer từ chuỗi hiện tại
 * @returns {ethers.Contract} Token Contract
 */
const getTokenContract = (tokenAddress, signer) => {
    return new ethers.Contract(tokenAddress, erc20ABI, signer);
};

/**
 * Lấy đối tượng Contract của Bridge
 * @param {string} bridgeAddress - Địa chỉ của Bridge trên chuỗi hiện tại
 * @param {any} bridgeABI - ABI của Bridge (Arc hoặc Pharos)
 * @param {ethers.JsonRpcSigner} signer - Signer từ chuỗi hiện tại
 * @returns {ethers.Contract} Bridge Contract
 */
const getBridgeContract = (bridgeAddress, bridgeABI, signer) => {
    return new ethers.Contract(bridgeAddress, bridgeABI, signer);
};


// === CÁC HÀM GIAO DỊCH ===

/**
 * Kiểm tra số dư token
 */
export const fetchTokenBalance = async (chainKey, signerAddress) => {
    const chainConfig = BRIDGE_CONFIG[chainKey];
    const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl); // Dùng provider RPC để đọc dữ liệu
    const tokenContract = new ethers.Contract(chainConfig.tokenAddress, erc20ABI, provider);
    
    const balance = await tokenContract.balanceOf(signerAddress);
    return ethers.formatUnits(balance, 18); // Giả định decimals là 18
};


/**
 * 1. Thực hiện Approve Token
 */
export const executeApprove = async (sourceChainKey, amount) => {
    const { signer } = await getEthersData();
    const sourceConfig = BRIDGE_CONFIG[sourceChainKey];

    // Kiểm tra xem ví có đang ở chuỗi nguồn không (Optional)
    const chainId = (await signer.provider.getNetwork()).chainId;
    if (chainId.toString() !== sourceConfig.id.toString()) {
        // Cần thêm logic yêu cầu chuyển mạng (switch chain)
    }

    const tokenContract = getTokenContract(sourceConfig.tokenAddress, signer);
    const bridgeAddress = sourceConfig.bridgeAddress;
    const amountBigInt = ethers.parseUnits(amount, 18);

    const tx = await tokenContract.approve(bridgeAddress, amountBigInt);
    await tx.wait(); // Chờ giao dịch xác nhận
    return tx.hash;
};

/**
 * 2. Thực hiện Bridge (Lock hoặc Burn)
 */
export const executeBridge = async (isLocking, amount, targetAddress) => {
    const { signer } = await getEthersData();
    
    const sourceChainKey = isLocking ? 'ARC' : 'PHAROS';
    const sourceConfig = BRIDGE_CONFIG[sourceChainKey];
    
    // Khởi tạo hợp đồng Bridge
    const bridgeContract = getBridgeContract(
        sourceConfig.bridgeAddress, 
        sourceConfig.abi, 
        signer
    );
    
    const amountBigInt = ethers.parseUnits(amount, 18);
    let tx;

    if (isLocking) {
        // ARC -> PHAROS: Gọi lock(amount, targetAddress) trên Bridge ARC
        tx = await bridgeContract.lock(amountBigInt, targetAddress);
    } else {
        // PHAROS -> ARC: Gọi burn(amount, targetAddress) trên Bridge PHAROS
        // Lưu ý: BridgePharos.json KHÔNG có hàm burn. Cần đảm bảo ABI của BridgePharos có hàm burn nếu muốn Bridge ngược lại
        // Tuy nhiên, dựa trên logic bridge thông thường, nếu bridge ARC có lock, thì bridge PHAROS phải có burn.
        // Giả sử bạn đã cập nhật BridgePharos.json để có hàm 'burn'.
        tx = await bridgeContract.burn(amountBigInt, targetAddress); 
    }

    await tx.wait(); // Chờ giao dịch xác nhận
    return tx.hash;
};

// Cấu hình cho trang BridgePage
export const BRIDGE_PAGE_CONFIG = {
    CHAIN_ARC: { name: BRIDGE_CONFIG.ARC.name, tokenSymbol: BRIDGE_CONFIG.ARC.tokenSymbol },
    CHAIN_PHAROS: { name: BRIDGE_CONFIG.PHAROS.name, tokenSymbol: BRIDGE_CONFIG.PHAROS.tokenSymbol },
};