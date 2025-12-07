// src/utils/config.js

// Địa chỉ các Contract
export const STAKING_ADDRESS = "0x5294077626b1e0903DDA2508ac4A1FF4239c36De";
export const STAKED_TOKEN_ADDRESS = "0x0A6e8A28d3F40b973DBC0D93F240CB9385a46bCB";
export const REWARD_ADDRESS = "0x372f7DB87f138a1E8BEcBBCCDDA89bbbf1382121";

// ABI cho Staking Contract
export const STAKING_ABI = [
  "function stakes(address) view returns (uint256)",
  "function earned(address) view returns (uint256)",
  "function stake(uint256 amount) external",
  "function withdraw(uint256 amount) external",
  "function claimReward() external",
];

// ABI cơ bản cho Token ERC20
export const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function decimals() view returns (uint8)",
  "function allowance(address owner, address spender) view returns (uint256)",
];