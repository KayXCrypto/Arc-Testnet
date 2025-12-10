import axios from 'axios';

const ARC_API_BASE = 'https://testnet.arcscan.app/api';

// Lấy danh sách transactions của một địa chỉ
export const getArcTransactions = async (walletAddress) => {
  try {
    const response = await axios.get(ARC_API_BASE, {
      params: {
        module: 'account',
        action: 'txlist',
        address: walletAddress,
        startblock: 0,
        endblock: 99999999,
        page: 1,
        offset: 100,
        sort: 'desc'
      }
    });

    if (response.data.status === '1') {
      return response.data.result || [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching Arc transactions:', error);
    return [];
  }
};

// Lấy token transfers (ERC20)
export const getArcTokenTransfers = async (walletAddress) => {
  try {
    const response = await axios.get(ARC_API_BASE, {
      params: {
        module: 'account',
        action: 'tokentx',
        address: walletAddress,
        page: 1,
        offset: 100,
        sort: 'desc'
      }
    });

    if (response.data.status === '1') {
      return response.data.result || [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching token transfers:', error);
    return [];
  }
};

// Lấy internal transactions
export const getArcInternalTransactions = async (walletAddress) => {
  try {
    const response = await axios.get(ARC_API_BASE, {
      params: {
        module: 'account',
        action: 'txlistinternal',
        address: walletAddress,
        page: 1,
        offset: 100,
        sort: 'desc'
      }
    });

    if (response.data.status === '1') {
      return response.data.result || [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching internal transactions:', error);
    return [];
  }
};

// Lấy balance
export const getArcBalance = async (walletAddress) => {
  try {
    const response = await axios.get(ARC_API_BASE, {
      params: {
        module: 'account',
        action: 'balance',
        address: walletAddress,
        tag: 'latest'
      }
    });

    if (response.data.status === '1') {
      // Convert Wei to ETH/ARC
      const balanceInWei = response.data.result;
      const balanceInArc = parseFloat(balanceInWei) / 1e18;
      return balanceInArc.toFixed(6);
    }
    return '0';
  } catch (error) {
    console.error('Error fetching balance:', error);
    return '0';
  }
};

// Lấy chi tiết transaction
export const getArcTransactionDetails = async (txHash) => {
  try {
    const response = await axios.get(ARC_API_BASE, {
      params: {
        module: 'transaction',
        action: 'gettxinfo',
        txhash: txHash
      }
    });

    return response.data.result || null;
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    return null;
  }
};

// Phân loại transaction type dựa trên method signature
export const parseArcTransactionType = (tx, walletAddress) => {
  const methodId = tx.input?.slice(0, 10);
  const isIncoming = tx.to?.toLowerCase() === walletAddress.toLowerCase();

  // Method signatures phổ biến
  const methodMapping = {
    '0xa9059cbb': 'transfer',
    '0x23b872dd': 'transfer',
    '0x095ea7b3': 'approve',
    '0x38ed1739': 'swap',
    '0x7ff36ab5': 'swap',
    '0x18cbafe5': 'swap',
    '0xb6f9de95': 'stake',
    '0x2e1a7d4d': 'unstake',
    '0x3ccfd60b': 'bridge',
    '0x40c10f19': 'mint',
    '0x42842e0e': 'nft-transfer',
    '0xa22cb465': 'approve-all'
  };

  if (methodMapping[methodId]) {
    return methodMapping[methodId];
  }

  // Nếu input rỗng hoặc chỉ là "0x", đây là transfer ETH đơn giản
  if (!tx.input || tx.input === '0x' || tx.input === '0x0') {
    return isIncoming ? 'receive' : 'send';
  }

  // Default
  return 'contract-call';
};

// Format transactions cho component
export const formatArcTransactions = (transactions, tokenTransfers, walletAddress) => {
  // Merge all transactions
  const allTxs = [
    ...transactions.map(tx => ({ ...tx, txType: 'normal' })),
    ...tokenTransfers.map(tx => ({ ...tx, txType: 'token' }))
  ];

  // Remove duplicates by hash
  const uniqueTxs = allTxs.reduce((acc, tx) => {
    if (!acc.find(t => t.hash === tx.hash)) {
      acc.push(tx);
    }
    return acc;
  }, []);

  // Format and sort
  return uniqueTxs.map(tx => {
    const type = parseArcTransactionType(tx, walletAddress);
    const isError = tx.isError === '1' || tx.txreceipt_status === '0';
    const isPending = !tx.confirmations || parseInt(tx.confirmations) < 12;

    // Format amount
    let amount = '0';
    let tokenSymbol = 'USDC';

    if (tx.txType === 'token') {
      const decimals = parseInt(tx.tokenDecimal || 18);
      amount = (parseFloat(tx.value || 0) / Math.pow(10, decimals)).toFixed(6);
      tokenSymbol = tx.tokenSymbol || 'TOKEN';
    } else {
      amount = (parseFloat(tx.value || 0) / 1e18).toFixed(6);
    }

    // Format gas
    const gasUsed = tx.gasUsed || 0;
    const gasPrice = tx.gasPrice || 0;
    const gasCost = (parseFloat(gasUsed) * parseFloat(gasPrice)) / 1e18;

    return {
      id: tx.hash,
      hash: tx.hash,
      type: type,
      from: tx.from,
      to: tx.to || tx.contractAddress,
      amount: `${amount} ${tokenSymbol}`,
      status: isError ? 'failed' : (isPending ? 'pending' : 'success'),
      timestamp: parseInt(tx.timeStamp) * 1000,
      gasUsed: `${gasCost.toFixed(6)} ARC`,
      blockNumber: parseInt(tx.blockNumber),
      methodId: tx.input?.slice(0, 10),
      confirmations: parseInt(tx.confirmations || 0)
    };
  }).sort((a, b) => b.timestamp - a.timestamp);
};

// Lấy tất cả dữ liệu
export const getAllArcData = async (walletAddress) => {
  try {
    const [transactions, tokenTransfers, balance] = await Promise.all([
      getArcTransactions(walletAddress),
      getArcTokenTransfers(walletAddress),
      getArcBalance(walletAddress)
    ]);

    const formatted = formatArcTransactions(transactions, tokenTransfers, walletAddress);

    return {
      transactions: formatted,
      balance: balance,
      totalTxs: formatted.length
    };
  } catch (error) {
    console.error('Error getting all Arc data:', error);
    return {
      transactions: [],
      balance: '0',
      totalTxs: 0
    };
  }
};