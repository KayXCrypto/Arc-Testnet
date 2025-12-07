// src/config/bridgeConstants.js

// ==================== CCTP CONFIGURATION ====================
export const CCTP_CONFIG = {
    11155111: { // Ethereum Sepolia
        id: 11155111,
        name: 'Ethereum Sepolia',
        shortName: 'Sepolia',
        domainId: 0,
        usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
        tokenMessengerAddress: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
        messageTransmitterAddress: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
        rpcUrl: 'https://sepolia.infura.io/v3/',
        explorerUrl: 'https://sepolia.etherscan.io',
        color: '#627eea',
        icon: '⟠'
    },
    97: { // BSC Testnet
        id: 97,
        name: 'BNB Smart Chain Testnet',
        shortName: 'BSC Testnet',
        domainId: 4,
        usdcAddress: '0x9999f7Fea5938fD3b1E26A12c3f2fb024e194f97',
        tokenMessengerAddress: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
        messageTransmitterAddress: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
        rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
        explorerUrl: 'https://testnet.bscscan.com',
        color: '#f3ba2f',
        icon: '🔶'
    },
    80002: { // Polygon Amoy
        id: 80002,
        name: 'Polygon Amoy',
        shortName: 'Amoy',
        domainId: 7,
        usdcAddress: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582',
        tokenMessengerAddress: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
        messageTransmitterAddress: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
        rpcUrl: 'https://rpc-amoy.polygon.technology/',
        explorerUrl: 'https://amoy.polygonscan.com',
        color: '#8247e5',
        icon: '💜'
    },
    421614: { // Arbitrum Sepolia
        id: 421614,
        name: 'Arbitrum Sepolia',
        shortName: 'Arb Sepolia',
        domainId: 3,
        usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
        tokenMessengerAddress: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
        messageTransmitterAddress: '0xaCF1ceeF35caAc005e15888dDb8A3515C41B4872',
        rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
        explorerUrl: 'https://sepolia.arbiscan.io',
        color: '#28a0f0',
        icon: '🔵'
    },
    5042002: { // ARC Testnet
        id: 5042002,
        name: 'ARC Testnet',
        shortName: 'ARC',
        domainId: 26,
        usdcAddress: '0x3600000000000000000000000000000000000000',
        tokenMessengerAddress: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
        messageTransmitterAddress: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
        rpcUrl: 'https://rpc.testnet.arc.network',
        explorerUrl: 'https://testnet.arcscan.app',
        color: '#00d4ff',
        icon: '🌐'
    }
};

// ==================== ABIS ====================

// USDC Token ABI (ERC20)
export const USDC_ABI = [
    {
        "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "owner", "type": "address" },
            { "internalType": "address", "name": "spender", "type": "address" }
        ],
        "name": "allowance",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "spender", "type": "address" },
            { "internalType": "uint256", "name": "amount", "type": "uint256" }
        ],
        "name": "approve",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "decimals",
        "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
        "stateMutability": "view",
        "type": "function"
    }
];

// src/config/bridgeConstants.js: Sửa TOKEN_MESSENGER_ABI

export const TOKEN_MESSENGER_ABI = [
    {
        "inputs": [
            { "internalType": "uint256", "name": "amount", "type": "uint256" },
            { "internalType": "uint32", "name": "destinationDomain", "type": "uint32" },
            { "internalType": "bytes32", "name": "mintRecipient", "type": "bytes32" },
            { "internalType": "address", "name": "burnToken", "type": "address" },
            { "internalType": "bytes32", "name": "destinationCaller", "type": "bytes32" },
            { "internalType": "uint256", "name": "maxFee", "type": "uint256" },
            { "internalType": "uint32", "name": "minFinalityThreshold", "type": "uint32" }
        ],
        "name": "depositForBurn",
        "outputs": [{ "internalType": "uint64", "name": "nonce", "type": "uint64" }],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];
// MessageTransmitter ABI (for receiving messages)
export const MESSAGE_TRANSMITTER_ABI = [
    {
        "inputs": [
            { "internalType": "bytes", "name": "message", "type": "bytes" },
            { "internalType": "bytes", "name": "attestation", "type": "bytes" }
        ],
        "name": "receiveMessage",
        "outputs": [{ "internalType": "bool", "name": "success", "type": "bool" }],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

// Combined ABIs export
export const BRIDGE_ABI = {
    USDC: USDC_ABI,
    TOKEN_MESSENGER: TOKEN_MESSENGER_ABI,
    MESSAGE_TRANSMITTER: MESSAGE_TRANSMITTER_ABI
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Convert Ethereum address to bytes32 format (for CCTP)
 * @param {string} address - Ethereum address (0x...)
 * @returns {string} - bytes32 format
 */
export const addressToBytes32 = (address) => {
    if (!address) return '0x0000000000000000000000000000000000000000000000000000000000000000';
    return '0x' + '000000000000000000000000' + address.slice(2).toLowerCase();
};

/**
 * Convert bytes32 to Ethereum address
 * @param {string} bytes32 - bytes32 format
 * @returns {string} - Ethereum address
 */
export const bytes32ToAddress = (bytes32) => {
    if (!bytes32) return '0x0000000000000000000000000000000000000000';
    return '0x' + bytes32.slice(-40);
};

/**
 * Shorten address for display
 * @param {string} address - Full address
 * @param {number} chars - Number of chars to show on each side
 * @returns {string} - Shortened address
 */
export const shortenAddress = (address, chars = 4) => {
    if (!address) return '';
    return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
};

/**
 * Format balance with proper decimals
 * @param {bigint|string|number} balance - Balance value
 * @param {number} decimals - Token decimals
 * @param {number} displayDecimals - Decimals to display
 * @returns {string} - Formatted balance
 */
export const formatBalance = (balance, decimals = 6, displayDecimals = 2) => {
    if (!balance) return '0.00';
    const value = typeof balance === 'bigint'
        ? Number(balance) / Math.pow(10, decimals)
        : Number(balance);
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: displayDecimals,
        maximumFractionDigits: displayDecimals
    }).format(value);
};

/**
 * Get block explorer URL for transaction
 * @param {number} chainId - Chain ID
 * @param {string} txHash - Transaction hash
 * @returns {string} - Explorer URL
 */
export const getExplorerUrl = (chainId, txHash) => {
    const config = CCTP_CONFIG[chainId];
    if (!config) return '#';
    return `${config.explorerUrl}/tx/${txHash}`;
};

/**
 * Get Circle IRIS API URL for attestation tracking
 * @param {number} sourceDomainId - Source domain ID
 * @param {string} txHash - Transaction hash
 * @returns {string} - IRIS API URL
 */
export const getAttestationUrl = (sourceDomainId, txHash) => {
    const IRIS_API_BASE = 'https://iris-api-sandbox.circle.com/v2/messages';
    return `${IRIS_API_BASE}/${sourceDomainId}?transactionHash=${txHash}`;
};

/**
 * Validate bridge amount
 * @param {string} amount - Amount to validate
 * @param {bigint} balance - Available balance
 * @param {number} decimals - Token decimals
 * @returns {object} - {isValid, error}
 */
export const validateBridgeAmount = (amount, balance, decimals = 6) => {
    if (!amount || amount === '0') {
        return { isValid: false, error: 'Please enter an amount' };
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
        return { isValid: false, error: 'Invalid amount' };
    }

    const amountInWei = BigInt(Math.floor(amountNum * Math.pow(10, decimals)));
    if (amountInWei > balance) {
        return { isValid: false, error: 'Insufficient balance' };
    }

    // Minimum amount check (0.01 USDC)
    if (amountNum < 0.01) {
        return { isValid: false, error: 'Minimum amount is 0.01 USDC' };
    }

    return { isValid: true, error: null };
};

/**
 * Get supported chains list
 * @returns {Array} - Array of chain configs
 */
export const getSupportedChains = () => {
    return Object.values(CCTP_CONFIG);
};

/**
 * Get chain config by ID
 * @param {number} chainId - Chain ID
 * @returns {object|null} - Chain config
 */
export const getChainConfig = (chainId) => {
    return CCTP_CONFIG[chainId] || null;
};

/**
 * Check if chains are compatible for bridging
 * @param {number} sourceChainId - Source chain ID
 * @param {number} destChainId - Destination chain ID
 * @returns {object} - {isCompatible, error}
 */
export const validateChainPair = (sourceChainId, destChainId) => {
    if (sourceChainId === destChainId) {
        return { isCompatible: false, error: 'Cannot bridge to the same chain' };
    }

    const sourceConfig = CCTP_CONFIG[sourceChainId];
    const destConfig = CCTP_CONFIG[destChainId];

    if (!sourceConfig || !destConfig) {
        return { isCompatible: false, error: 'Unsupported chain selected' };
    }

    return { isCompatible: true, error: null };
};

// ==================== CONSTANTS ====================

export const BRIDGE_CONSTANTS = {
    MIN_AMOUNT: 0.01, // Minimum bridge amount in USDC
    MAX_AMOUNT: 1000000, // Maximum bridge amount in USDC
    ATTESTATION_TIMEOUT: 600000, // 10 minutes in milliseconds
    POLLING_INTERVAL: 5000, // Poll every 5 seconds
    USDC_DECIMALS: 6,
    MESSAGE_BODY_VERSION: 0, // Default message body version
    DEFAULT_FEE: 0n // Default bridge fee
};

export default {
    CCTP_CONFIG,
    BRIDGE_ABI,
    addressToBytes32,
    bytes32ToAddress,
    shortenAddress,
    formatBalance,
    getExplorerUrl,
    getAttestationUrl,
    validateBridgeAmount,
    getSupportedChains,
    getChainConfig,
    validateChainPair,
    BRIDGE_CONSTANTS
};