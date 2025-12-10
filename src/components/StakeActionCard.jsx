import React, { useState, useEffect } from 'react';
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract
} from 'wagmi';
import { parseUnits, maxUint256, formatEther } from 'viem';
import { Lock } from 'lucide-react';
// Import CSS: .stake-action-card, .input-group, .action-buttons

// 🌟 THAY THẾ BẰNG CÁC ĐỊA CHỈ HỢP ĐỒNG THẬT CỦA BẠN
const STAKING_CONTRACT_ADDRESS = '0x75e50ccfc547649b831089ae50A7c53EF7D86283'; // Địa chỉ ComplexStaking
const STAKE_TOKEN_ADDRESS = '0x3600000000000000000000000000000000000000'; // Địa chỉ Token Stake (Ví dụ: BUSD)
const REWARD_TOKEN_ADDRESS = '0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C'; // Địa chỉ Token Reward (Ví dụ: SQUID)
const STAKE_TOKEN_DECIMALS = 6;
// --- ABI HỢP ĐỒNG STAKING ---
const STAKING_ABI = [
  { "type": "function", "name": "stake", "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }, { "internalType": "uint256", "name": "lockDays", "type": "uint256" }, { "internalType": "bool", "name": "autoCompound", "type": "bool" }], "stateMutability": "nonpayable" },
  { "type": "function", "name": "claimReward", "inputs": [], "outputs": [], "stateMutability": "nonpayable" },
  { "type": "function", "name": "unstake", "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }], "outputs": [], "stateMutability": "nonpayable" },
];

// --- ABI TOKEN ERC20 ---
// --- ABI TOKEN ERC20 (Đã sửa lỗi allowance) ---
const ERC20_ABI = [
  { "type": "function", "name": "approve", "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable" },
  // 🌟 ĐÃ SỬA: Thay thế uint256 bằng address cho đối số 'spender'
  { "type": "function", "name": "allowance", "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "spender", "type": "address" }], "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view" },
  { "type": "function", "name": "symbol", "inputs": [], "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view" },
];

// Các tùy chọn khóa (tính bằng Ngày)
const LOCK_OPTIONS = [
  { label: 'No lock (0 Days)', value: 0 },
  { label: '30 Days (+3% Bonus)', value: 30 },
  { label: '90 Days (+9% Bonus)', value: 90 },
  { label: '365 Days (Max Bonus)', value: 365 },
];

const shortenHash = (hash) => {
  if (!hash) return '';
  return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
};

const StakeActionCard = () => {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('');
  const [lockDays, setLockDays] = useState(LOCK_OPTIONS[0].value);
  const [autoCompound, setAutoCompound] = useState(false);

  const amountInWei = amount ? parseUnits(amount, STAKE_TOKEN_DECIMALS) : 0n;

  // --- READ HOOKS: Allowance và Symbol ---
  const { data: allowance = 0n, refetch: refetchAllowance } = useReadContract({
    address: STAKE_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address, STAKING_CONTRACT_ADDRESS],
    query: { enabled: isConnected && !!address, refetchInterval: 10000 },
  });

  const { data: stakeSymbol = 'TOKEN' } = useReadContract({
    address: STAKE_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'symbol',
  });

  const { data: rewardSymbol = 'REWARD' } = useReadContract({
    address: REWARD_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'symbol',
  });

  // LOGIC CHÍNH: Kiểm tra xem có cần phê duyệt không (Allowance < Amount)
  const requiresApproval = isConnected && amountInWei > 0n && allowance < amountInWei;

  // --- WRITE HOOKS: Approve, Stake, Claim ---
  const { data: approveHash, writeContract: writeApprove, isPending: isApprovePending } = useWriteContract();
  const { data: stakeHash, writeContract: writeStake, isPending: isStakePending, error: stakeError } = useWriteContract();
  const { data: claimHash, writeContract: writeClaim, isPending: isClaimPending, error: claimError } = useWriteContract();
  const { data: unstakeHash, writeContract: writeUnStake, isPending: isUnStakePending, error: unstakeError } = useWriteContract();

  // Theo dõi giao dịch gần nhất
  const latestHash = approveHash || stakeHash || claimHash || unstakeHash;
  const {
    isLoading: isTxConfirming,
    isSuccess: isTxConfirmed,
    isError: isConfirmationError
  } = useWaitForTransactionReceipt({
    hash: latestHash,
    query: { enabled: !!latestHash },
  });

  // Xử lý side effect sau khi Approve thành công: Refetch Allowance
  useEffect(() => {
    if (isTxConfirmed && latestHash === approveHash) {
      refetchAllowance();
    }
  }, [isTxConfirmed, latestHash, approveHash, refetchAllowance]);

  // Hàm xử lý Approve
  const handleApprove = () => {
    if (!isConnected || isApprovePending || isTxConfirming || amountInWei === 0n) return;

    // Luôn Approve maxUint256 để tránh phải phê duyệt lại nhiều lần
    writeApprove({
      address: STAKE_TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [STAKING_CONTRACT_ADDRESS, maxUint256],
    });
  };

  // Hàm xử lý Stake
  const handleStake = () => {
    // Kiểm tra an toàn: Đã kết nối, Amount > 0, ĐÃ phê duyệt, KHÔNG đang chờ TX
    if (!isConnected || amountInWei === 0n || requiresApproval || isStakePending || isTxConfirming) return;

    writeStake({
      address: STAKING_CONTRACT_ADDRESS,
      abi: STAKING_ABI,
      functionName: 'stake',
      args: [amountInWei, BigInt(lockDays), autoCompound],
    });
  };

  // Hàm xử lý Claim
  const handleClaim = () => {
    if (!isConnected || isClaimPending || isTxConfirming) return;

    writeClaim({
      address: STAKING_CONTRACT_ADDRESS,
      abi: STAKING_ABI,
      functionName: 'claimReward',
      args: [],
    });
  };

  // Hàm xử lý Unstake
  const handleUnStake = () => {
    // FIX: Thay thế 0n bằng BigInt(0)
    if (!isConnected || amountInWei === BigInt(0) || isUnStakePending || isTxConfirming) return;

    writeUnStake({
      address: STAKING_CONTRACT_ADDRESS,
      abi: STAKING_ABI,
      functionName: 'unstake',
      args: [amountInWei],
    });
  };
  // ----------------------------------------------------
  // UI LOGIC CHO CÁC NÚT RIÊNG BIỆT
  // ----------------------------------------------------
  const isProcessing = isApprovePending || isStakePending || isTxConfirming || isClaimPending || isUnStakePending;

  // 1. Logic cho Nút APPROVE
  // Disabled nếu: Chưa kết nối, Đang xử lý, Amount = 0, HOẶC đã Approve đủ (requiresApproval là false).
  const isApproveDisabled = !isConnected || isProcessing || amountInWei === 0n || !requiresApproval;

  let approveButtonText = `Approve ${stakeSymbol}`;
  if (!isConnected) {
    approveButtonText = 'Connect Wallet';
  } else if (isProcessing && latestHash === approveHash) {
    approveButtonText = isTxConfirming ? 'Confirming Block...' : 'Waiting for wallet confirmation...';
  } else if (!requiresApproval && amountInWei > 0n) {
    approveButtonText = 'Approved';
  } else if (amountInWei === 0n) {
    approveButtonText = 'Enter the amount to approve';
  }

  // 2. Logic cho Nút STAKE
  // Disabled nếu: Chưa kết nối, Đang xử lý, Amount = 0, HOẶC CẦN APPROVE (requiresApproval là true).
  const isStakeDisabled = !isConnected || isProcessing || amountInWei === 0n || requiresApproval;

  let stakeButtonText = `Stake ${stakeSymbol}`;
  if (!isConnected) {
    stakeButtonText = 'Connect Wallet';
  } else if (isProcessing && latestHash === stakeHash) {
    stakeButtonText = isTxConfirming ? 'Confirming Block...' : 'Waiting for wallet confirmation...';
  } else if (requiresApproval && amountInWei > 0n) {
    stakeButtonText = 'Approval Required First';
  } else if (isTxConfirmed && latestHash === stakeHash) {
    stakeButtonText = 'Stake Success! 🎉';
  }

  // 3. Logic cho Nút UNSTAKE
  // FIX: Thay thế 0n bằng BigInt(0)
  const isUnStakeDisabled = !isConnected || isProcessing || amountInWei === BigInt(0);

  let unstakeButtonText = `Unstake ${stakeSymbol}`;
  if (!isConnected) {
    unstakeButtonText = 'Connect Wallet';
  } else if (isProcessing && latestHash === unstakeHash) {
    unstakeButtonText = isTxConfirming ? 'Confirming Block...' : 'Waiting for wallet confirmation...';
    // FIX: Thay thế 0n bằng BigInt(0)
  } else if (amountInWei === BigInt(0)) {
    unstakeButtonText = 'Enter the amount to Unstake';
  } else if (isTxConfirmed && latestHash === unstakeHash) {
    unstakeButtonText = 'Unstake Success! 🎉';
  }


  // 3. Logic cho Nút CLAIM
  let claimButtonText = `Claim Reward (${rewardSymbol})`;
  if (isProcessing && latestHash === claimHash) {
    claimButtonText = isTxConfirming ? 'Confirming Block...' : 'Waiting for wallet confirmation...';
  } else if (isTxConfirmed && latestHash === claimHash) {
    claimButtonText = 'Claim Success! 🎉';
  }

  //  // Nút hành động chính (Stake/Unstake)
  // const primaryButtonText = actionType === 'stake' ? stakeButtonText : unstakeButtonText;
  // const primaryButtonDisabled = actionType === 'stake' ? isStakeDisabled : isUnStakeDisabled;
  // const handlePrimaryAction = actionType === 'stake' ? handleStake : handleUnStake;


  return (
    <div className="stake-action-card">
      <h3 className="card-title">Staking & Rewards</h3>

      {/* PHẦN INPUTS (Không còn nằm trong form) */}
      <div className="input-controls">
        <div className="input-group">
          <label>Amount to Stake ({stakeSymbol})</label>
          <input
            type="number"
            placeholder="Enter Balance"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
            disabled={isProcessing || !isConnected}
          />
        </div>

        <div className="input-group">
          <label>
            Lock Period <Lock size={14} style={{ marginLeft: '5px', verticalAlign: 'middle' }} />
          </label>
          <select
            value={lockDays}
            onChange={(e) => setLockDays(parseInt(e.target.value))}
            disabled={isProcessing || !isConnected}
          >
            {LOCK_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="input-group checkbox-group">
          <input
            type="checkbox"
            id="autoCompound"
            checked={autoCompound}
            onChange={(e) => setAutoCompound(e.target.checked)}
            disabled={isProcessing || !isConnected}
          />
          <label htmlFor="autoCompound">Auto-Compound</label>
        </div>
      </div>

      {/* PHẦN 1: APPROVE */}
      <div
        className="approve-row"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          marginTop: '20px'
        }}
      >
        <button
          className="approve-btn"
          onClick={handleApprove}
          disabled={isApproveDisabled}
          style={{
            backgroundColor: (!requiresApproval && isConnected && amountInWei > 0n) ? 'darkgreen' : undefined,
            color: (!requiresApproval && isConnected && amountInWei > 0n) ? 'white' : undefined
          }}
        >
          {approveButtonText}
        </button>
      </div>

      {/* PHẦN 2: STAKE và UNSTAKE */}
      <div
        className="stake-unstake-row"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          marginTop: '12px'
        }}
      >
        {/* Stake */}
        <button
          className="stake-btn"
          onClick={handleStake}
          disabled={isStakeDisabled}
        >
          {stakeButtonText}
        </button>

        {/* Unstake */}
        <button
          className="unstake-btn"
          onClick={handleUnStake}
          disabled={isUnStakeDisabled}
        >
          {unstakeButtonText}
        </button>
      </div>




      {/* PHẦN 3: CLAIM REWARD */}
      <div className="action-buttons" style={{ marginTop: '10px' }}>
        <button
          className="claim-btn"
          onClick={handleClaim}
          disabled={!isConnected || isProcessing}
        >
          {claimButtonText}
        </button>
      </div>

      {/* Hiển thị thông báo trạng thái */}
      {
        (stakeError || claimError || isConfirmationError) && (
          <p className="error-message">Error: {shortenHash(latestHash)} - {stakeError?.shortMessage || claimError?.shortMessage || 'Lỗi giao dịch.'}</p>
        )
      }

    </div >
  );
};

export default StakeActionCard;