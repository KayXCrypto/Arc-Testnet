// src/utils/staking.js (ĐÃ SỬA VÀ HOÀN THIỆN)

import { ethers } from "ethers";
import StakingABI from "../abi/Staking.json";
import RewardABI from "../abi/RewardToken.json";
import StakedTokenABI from "../abi/ERC20.json";

// === CONFIG - CẬP NHẬT ĐỊA CHỈ CONTRACT VÀ RPC CỦA BẠN ===
export const ARC_RPC = "https://rpc.testnet.arc.network";
export const STAKING_ADDRESS = "0xD9201aC5079b737Dc020DE7B78461d8C690aeBe5"; // ⬅️ CẬP NHẬT ĐỊA CHỈ STAKING
export const REWARD_ADDRESS = "0xe7bA6F3786C59c3BF91EEfCE89cB109cAAE13969"; // ⬅️ CẬP NHẬT ĐỊA CHỈ REWARD TOKEN
export const STAKED_TOKEN_ADDRESS = "0x0A6e8A28d3F40b973DBC0D93F240CB9385a46bCB"; // ⬅️ CẬP NHẬT ĐỊA CHỈ STAKED TOKEN

// === Provider / Contract helpers ===
export const getProvider = () => {
    if (typeof window !== "undefined" && window.ethereum) {
        return new ethers.BrowserProvider(window.ethereum);
    }
    return new ethers.JsonRpcProvider(ARC_RPC);
};

const getContract = async (address, abi) => {
    const provider = getProvider();
    
    if (typeof window !== "undefined" && window.ethereum) {
        try {
            const signer = await provider.getSigner();
            return new ethers.Contract(address, abi, signer);
        } catch (err) {
            return new ethers.Contract(address, abi, provider);
        }
    }
    return new ethers.Contract(address, abi, provider);
};

export const getStakingContract = async () => getContract(STAKING_ADDRESS, StakingABI);
export const getStakedTokenContract = async () => getContract(STAKED_TOKEN_ADDRESS, StakedTokenABI);
export const getRewardContract = async () => getContract(REWARD_ADDRESS, RewardABI);

// === Read Functions ===

export const getTokenInfo = async (account) => {
    // Giá trị mặc định phòng trường hợp lỗi kết nối
    const info = { 
        stakedDecimals: 18, 
        rewardDecimals: 18, 
        stakedSymbol: "sUSDC",
        rewardSymbol: "RWT",    
        allowance: "0" 
    };

    try {
        const staked = await getStakedTokenContract();
        const reward = await getRewardContract();

        // Lấy Decimals và Symbols
        const [sDecimals, rDecimals, sSymbol, rSymbol] = await Promise.all([
            staked.decimals(),
            reward.decimals(),
            staked.symbol(),
            reward.symbol(),
        ]);
        
        info.stakedDecimals = Number(sDecimals);
        info.rewardDecimals = Number(rDecimals);
        info.stakedSymbol = sSymbol;
        info.rewardSymbol = rSymbol;

        // Lấy Allowance
        if (account) {
            const allowanceWei = await staked.allowance(account, STAKING_ADDRESS);
            info.allowance = ethers.formatUnits(allowanceWei, info.stakedDecimals);
        }
        
        return info;
    } catch (error) {
        console.warn("Không lấy được token info, dùng mặc định 18/sUSDC/RWT", error);
        return info;
    }
};

/**
 * Get user on-chain balances/state
 */
export const getUserOnchainInfo = async (account, stakedDecimals = 18, rewardDecimals = 18) => {
    // ⬅️ ĐÃ THÊM: rewardTokenBalance vào giá trị trả về mặc định
    if (!account) return { staked: "0", earned: "0", tokenBalance: "0", arcBalance: "0", rewardTokenBalance: "0" };

    const provider = getProvider();
    const staking = await getStakingContract();
    const stakedToken = await getStakedTokenContract();
    const rewardToken = await getRewardContract(); // ⬅️ ĐÃ THÊM: Lấy Contract của Reward Token
    
    try {
        const [stakedWei, earnedWei, tokenBalanceWei, arcBalanceWei, rewardTokenBalanceWei] = await Promise.all([ // ⬅️ ĐÃ THÊM: rewardTokenBalanceWei
            staking.stakes(account),
            staking.earned(account), // Lấy Reward WEI
            stakedToken.balanceOf(account),
            provider.getBalance(account),
            rewardToken.balanceOf(account), // ⬅️ ĐÃ THÊM: Lấy số dư Reward Token
        ]);

        console.log("Staked WEI (Thô):", stakedWei.toString()); 
        console.log("Earned WEI (Thô):", earnedWei.toString()); 
        console.log("Reward Token Balance WEI (Thô):", rewardTokenBalanceWei.toString()); // ⬅️ DEBUG

        return {
            staked: ethers.formatUnits(stakedWei, stakedDecimals),
            earned: ethers.formatUnits(earnedWei, rewardDecimals), // ⬅️ Đảm bảo dùng rewardDecimals
            tokenBalance: ethers.formatUnits(tokenBalanceWei, stakedDecimals),
            arcBalance: ethers.formatUnits(arcBalanceWei, 18),
            rewardTokenBalance: ethers.formatUnits(rewardTokenBalanceWei, rewardDecimals), // ⬅️ Dùng rewardDecimals
        };
    } catch (e) {
        console.error("Lỗi khi tải thông tin on-chain:", e);
        // ⬅️ ĐÃ CẬP NHẬT: Trả về rewardTokenBalance mặc định
        return { staked: "0", earned: "0", tokenBalance: "0", arcBalance: "0", rewardTokenBalance: "0" }; 
    }
};

// === Write Functions (GIỮ NGUYÊN) ===

export const approveStake = async (amountWei) => {
    const token = await getStakedTokenContract();
    const tx = await token.approve(STAKING_ADDRESS, amountWei);
    return tx.wait();
};

export const stake = async (amountWei) => {
    const staking = await getStakingContract();
    const tx = await staking.stake(amountWei);
    return tx.wait();
};

export const withdraw = async (amountWei) => {
    const staking = await getStakingContract();
    const tx = await staking.withdraw(amountWei);
    return tx.wait();
};

export const claimReward = async () => {
    const staking = await getStakingContract();
    const tx = await staking.claimReward();
    return tx.wait();
};