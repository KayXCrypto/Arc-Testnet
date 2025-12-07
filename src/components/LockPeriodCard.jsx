import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
// Import CSS: .lock-card, .lock-timer, .timer-segment (cần có trong styles/dashboardcard.css)

// 🌟 THAY THẾ BẰNG CÁC ĐỊA CHỈ HỢP ĐỒNG THẬT CỦA BẠN
const STAKING_CONTRACT_ADDRESS = '0x75e50ccfc547649b831089ae50A7c53EF7D86283'; // Địa chỉ ComplexStaking

// Cấu trúc ABI để đọc dữ liệu từ mapping stakes và lấy stakeToken (giả định stakeToken có decimals)
const STAKING_ABI_READ = [
  // stakes(address) public view returns (amount, pendingReward, lastUpdate, lockUntil, autoCompound)
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "stakes",
    "outputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "uint256", "name": "pendingReward", "type": "uint256" },
      { "internalType": "uint256", "name": "lastUpdate", "type": "uint256" },
      { "internalType": "uint256", "name": "lockUntil", "type": "uint256" },
      { "internalType": "bool", "name": "autoCompound", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // stakeToken() public view returns (IERC20)
  { "type": "function", "name": "stakeToken", "inputs": [], "outputs": [{ "internalType": "contract IERC20", "name": "", "type": "address" }], "stateMutability": "view" },
];

const ERC20_ABI_READ = [
  // symbol() public view returns (string)
  { "type": "function", "name": "symbol", "inputs": [], "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view" },
  // 🌟 BỔ SUNG: decimals() public view returns (uint8)
  { "type": "function", "name": "decimals", "inputs": [], "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view" },
];

// Hàm chuyển đổi timestamp thành object Days/Hours/Mins/Secs
const getTimeRemaining = (endTime) => {
  // Chuyển BigInt/Number sang Number, rồi sang mili giây
  const total = Number(endTime) * 1000 - Date.now();
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  if (total <= 0) return { days: 0, hours: 0, mins: 0, secs: 0, date: 'Lock period ended' };

  return {
    days: days,
    hours: hours,
    mins: minutes,
    secs: seconds,
    date: `Locked until: ${new Date(Number(endTime) * 1000).toLocaleDateString('vi-VN')}`
  };
};

// Hàm định dạng số có dấu phẩy
const formatNumber = (num, decimals = 2) => {
  if (typeof num !== 'number') return '0.00';
  return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const LockPeriodCard = () => {
  const { address, isConnected } = useAccount();
  // Dùng state để cập nhật thời gian còn lại mỗi giây
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Cập nhật currentTime mỗi giây để UI hiển thị thời gian đếm ngược
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);


  // 1. Đọc địa chỉ Stake Token
  const { data: stakeTokenAddress } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: STAKING_ABI_READ,
    functionName: 'stakeToken',
    query: { enabled: true },
  });

  // 2. Đọc Symbol của Stake Token
  const { data: stakeSymbol = 'TOKEN' } = useReadContract({
    address: stakeTokenAddress,
    abi: ERC20_ABI_READ,
    functionName: 'symbol',
    query: { enabled: !!stakeTokenAddress },
  });

  // 🌟 MỚI: Đọc Decimals của Stake Token
  const { data: stakeDecimals = 18 } = useReadContract({ // Mặc định là 18 nếu không đọc được
    address: stakeTokenAddress,
    abi: ERC20_ABI_READ,
    functionName: 'decimals',
    query: { enabled: !!stakeTokenAddress },
  });

  // 3. Đọc thông tin stake của người dùng (amount và lockUntil)
  const { data: stakeInfo, isLoading, isError } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: STAKING_ABI_READ,
    functionName: 'stakes',
    args: [address],
    query: {
      enabled: isConnected && !!address,
      // Định dạng lại dữ liệu chỉ lấy amount và lockUntil
      select: (data) => ({
        amount: data[0],
        lockUntil: data[3],
      }),
      refetchInterval: 10000, // Refetch dữ liệu từ blockchain mỗi 10 giây
    }
  });

  const lockUntilTimestamp = stakeInfo?.lockUntil || 0n;
  const lockedAmount = stakeInfo?.amount || 0n;

  // Tính toán thời gian còn lại (phụ thuộc vào currentTime được cập nhật mỗi giây)
  const timeRemaining = getTimeRemaining(lockUntilTimestamp);

  const totalLockedFormatted = formatNumber(
    // 🌟 SỬ DỤNG formatUnits VỚI decimals ĐÃ ĐỌC
    parseFloat(formatUnits(lockedAmount, stakeDecimals)),
    2
  );
  // Kiểm tra xem thời gian khóa có lớn hơn thời điểm hiện tại không
  const isLocked = lockUntilTimestamp > BigInt(Math.floor(Date.now() / 1000));

  if (!isConnected) {
    return (
      <div className="lock-card">
        <h3>Lock Period</h3>
        <p className="lock-date">---</p>
        <div className="lock-timer">
          <p style={{ marginTop: '30px' }}>Please Connect Wallet</p>
        </div>
        <p className="locked-busd">0.00 {stakeSymbol}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="lock-card">
        <h3>Lock Period</h3>
        <p className="lock-date">---</p>
        <div className="lock-timer">
          <p style={{ marginTop: '30px' }}>Data Loading...</p>
        </div>
        <p className="locked-busd">--- {stakeSymbol}</p>
      </div>
    );
  }

  if (!isLocked && lockedAmount === 0n) {
    return (
      <div className="lock-card">
        <h3>Lock Period</h3>
        <p className="lock-date" style={{ color: 'orange' }}>You have no stakes yet</p>
        <div className="lock-timer">
          <p style={{ marginTop: '30px' }}>Start Staking!</p>
        </div>
        <p className="locked-busd">0.00 {stakeSymbol}</p>
      </div>
    );
  }

  return (
    <div className="lock-card">
      <h3>Lock Period</h3>
      <p className="lock-date">
        {isLocked ? timeRemaining.date : 'Lock period ended'}
      </p>

      <div className="lock-timer">
        {/* Day */}
        <div className="timer-segment">
          <span className="timer-value">{timeRemaining.days.toString().padStart(2, '0')}</span>
          <span className="timer-label">Day</span>
        </div>
        <span className="separator">:</span>

        {/* Hours */}
        <div className="timer-segment">
          <span className="timer-value">{timeRemaining.hours.toString().padStart(2, '0')}</span>
          <span className="timer-label">Hours</span>
        </div>
        <span className="separator">:</span>

        {/* Mins */}
        <div className="timer-segment">
          <span className="timer-value">{timeRemaining.mins.toString().padStart(2, '0')}</span>
          <span className="timer-label">Mins</span>
        </div>
        <span className="separator">:</span>

        {/* Secs */}
        <div className="timer-segment">
          <span className="timer-value">{timeRemaining.secs.toString().padStart(2, '0')}</span>
          <span className="timer-label">Sec</span>
        </div>
      </div>

      <p className="locked-busd">
        {totalLockedFormatted} {stakeSymbol}
      </p>
      {isLocked && <p className="lock-status">Lock Active</p>}
      {!isLocked && lockedAmount > 0n && <p className="lock-status" style={{ color: 'lightgreen' }}>Ready to unstake</p>}
    </div>
  );
};

export default LockPeriodCard;