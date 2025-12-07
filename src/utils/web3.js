// src/utils/web3.js

import { ethers } from "ethers";
import {
  STAKING_ADDRESS,
  STAKED_TOKEN_ADDRESS,
  REWARD_ADDRESS,
  STAKING_ABI,
  ERC20_ABI,
} from "./config";

/** * CHỈ dùng provider của MetaMask/Browser:
 * - Giải quyết lỗi không lấy được balance
 * - Đảm bảo stake / approve đúng chain
 */
export const getProvider = () => {
  if (!window.ethereum) {
    alert("Not Found MetaMask.");
    throw new Error("No MetaMask");
  }
  // ethers.BrowserProvider là cách dùng mới (ethers v6)
  return new ethers.BrowserProvider(window.ethereum);
};

export const getContract = async (address, abi) => {
  const provider = getProvider();
  let signer = null;

  try {
    // Thử lấy signer. Nếu chưa kết nối ví, nó sẽ vẫn dùng provider
    signer = await provider.getSigner();
  } catch (e) {
    // Bỏ qua lỗi nếu không lấy được signer
  }

  // Quan trọng: Phải có signer khi thực hiện các giao dịch Stake/Approve/Withdraw
  return new ethers.Contract(address, abi, signer || provider);
};

export const getStakingContract = () => getContract(STAKING_ADDRESS, STAKING_ABI);
export const getStakedTokenContract = () => getContract(STAKED_TOKEN_ADDRESS, ERC20_ABI);
export const getRewardContract = () => getContract(REWARD_ADDRESS, ERC20_ABI);