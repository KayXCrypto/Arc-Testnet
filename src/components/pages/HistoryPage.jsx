import React, { useState, useEffect } from 'react';
import { Search, ExternalLink, CheckCircle, XCircle, Loader, ArrowUpRight, ArrowDownLeft, Repeat, DollarSign, Package } from 'lucide-react';
import { useAccount } from 'wagmi'; // Import hook để lấy địa chỉ ví đã kết nối
import { getAllArcData } from '../../config/arcTestnetService';
import '../../styles/TransactionExplorer.css';

const TransactionExplorer = () => {
  // Thay thế state walletAddress bằng hook useAccount
  const { address: walletAddress, isConnected } = useAccount();

  const [transactions, setTransactions] = useState([]);
  const [filteredTxs, setFilteredTxs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedTx, setSelectedTx] = useState(null);
  const [balance, setBalance] = useState('0');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch transactions từ Arc Testnet
  useEffect(() => {
    // Chỉ fetch nếu ví đã được kết nối (có walletAddress)
    if (isConnected && walletAddress) {
      fetchTransactions(walletAddress);
    } else {
      // Nếu chưa kết nối, reset trạng thái
      setTransactions([]);
      setFilteredTxs([]);
      setBalance('0');
      setLoading(false);
      setError(null);
    }
  }, [walletAddress, isConnected]); // Dependency là walletAddress và isConnected

  const fetchTransactions = async (address) => {
    setLoading(true);
    setError(null);

    try {
      // Sử dụng địa chỉ ví thực tế đã connect
      const data = await getAllArcData(address);
      setTransactions(data.transactions);
      setFilteredTxs(data.transactions);
      setBalance(data.balance);
    } catch (err) {
      setError('Không thể tải dữ liệu. Vui lòng thử lại. Đảm bảo ví của bạn đang ở mạng Arc Testnet.');
      console.error('Error fetching Arc data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = transactions;

    if (filterType !== 'all') {
      filtered = filtered.filter(tx => tx.type === filterType);
    }

    if (searchTerm) {
      filtered = filtered.filter(tx =>
        tx.hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredTxs(filtered);
  }, [searchTerm, filterType, transactions]);

  // Các hàm tiện ích (getTypeIcon, getStatusIcon, formatTime, shortenHash, openInExplorer) giữ nguyên...
  const getTypeIcon = (type) => {
    switch (type) {
      case 'swap': return <Repeat />;
      case 'stake': return <ArrowUpRight />;
      case 'unstake': return <ArrowDownLeft />;
      case 'bridge': return <Package />;
      case 'mint': return <DollarSign />;
      case 'send': return <ArrowUpRight />;
      case 'receive': return <ArrowDownLeft />;
      default: return <Repeat />;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle className="status-icon-success" />;
      case 'failed': return <XCircle className="status-icon-failed" />;
      case 'pending': return <Loader className="status-icon-pending" />;
      default: return <CheckCircle className="status-icon-success" />;
    }
  };

  const formatTime = (timestamp) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days} ngày trước`;
    if (hours > 0) return `${hours} giờ trước`;
    return `${minutes} phút trước`;
  };

  const shortenHash = (hash) => {
    if (!hash) return '';
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  const openInExplorer = (hash) => {
    window.open(`https://testnet.arcscan.app/tx/${hash}`, '_blank');
  };
  // ... kết thúc các hàm tiện ích

  // Hiển thị trạng thái chưa kết nối
  if (!isConnected) {
    return (
      <div className="explorer-container">
        <div className="explorer-wrapper">
          <div className="empty-state">
            <p>Please connect your wallet to view your transaction history..</p>
          </div>
        </div>
      </div>
    );
  }


  if (loading) {
    return (
      <div className="explorer-container">
        <div className="explorer-wrapper">
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <Loader className="status-icon-pending" style={{ width: '3rem', height: '3rem', margin: '0 auto' }} />
            <p style={{ marginTop: '1rem', color: '#94a3b8' }}>Loading data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="explorer-container">
        <div className="explorer-wrapper">
          <div className="empty-state">
            <p>{error}</p>
            <button
              onClick={() => fetchTransactions(walletAddress)} // Thử lại với walletAddress hiện tại
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1.5rem',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer'
              }}
            >
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="explorer-container">
      <div className="explorer-wrapper">
        {/* Header */}
        <div className="explorer-header">
          <h1 className="explorer-title">Transaction Explorer</h1>
          <p className="explorer-subtitle">Transaction history Arc Testnet</p>
          {/* <div className="wallet-info">
            <p>
              Địa chỉ ví: <span className="wallet-address">{shortenHash(walletAddress)}</span>
              {' | '}
              Balance: <span className="wallet-address">{balance} USDC</span>
            </p>
          </div> */}
        </div>

        {/* Search and Filter */}
        <div className="search-filter-section">
          <div className="search-container">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Tìm kiếm theo hash hoặc loại giao dịch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-buttons">
            <button
              onClick={() => setFilterType('all')}
              className={`filter-btn ${filterType === 'all' ? 'filter-btn-active' : ''}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('swap')}
              className={`filter-btn ${filterType === 'swap' ? 'filter-btn-active' : ''}`}
            >
              Swap
            </button>
            <button
              onClick={() => setFilterType('send')}
              className={`filter-btn ${filterType === 'send' ? 'filter-btn-active' : ''}`}
            >
              Send
            </button>
            <button
              onClick={() => setFilterType('receive')}
              className={`filter-btn ${filterType === 'receive' ? 'filter-btn-active' : ''}`}
            >
              Receive
            </button>
          </div>
        </div>

        {/* Transactions List */}
        <div className="transactions-container">
          <div className="table-wrapper">
            <table className="transactions-table">
              <thead className="table-header">
                <tr>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Hash</th>
                  <th>Amount</th>
                  <th>Gas</th>
                  <th>Time</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredTxs.map((tx) => (
                  <tr
                    key={tx.id}
                    className="table-row"
                    onClick={() => setSelectedTx(tx)}
                  >
                    <td className="table-cell">
                      {getStatusIcon(tx.status)}
                    </td>
                    <td className="table-cell">
                      <div className="type-icon-container">
                        <div className="type-icon-box">
                          {getTypeIcon(tx.type)}
                        </div>
                        <span className="type-text">{tx.type}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="tx-hash">{shortenHash(tx.hash)}</span>
                    </td>
                    <td className="table-cell">
                      <div className="amount-container">
                        <span className="amount-primary">{tx.amount}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="gas-text">{tx.gasUsed}</span>
                    </td>
                    <td className="table-cell">
                      <span className="time-text">{formatTime(tx.timestamp)}</span>
                    </td>
                    <td className="table-cell">
                      <button
                        className="external-link-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          openInExplorer(tx.hash);
                        }}
                      >
                        <ExternalLink />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredTxs.length === 0 && (
            <div className="empty-state">
              <p>No transactions found.</p>
            </div>
          )}
        </div>

        {/* Transaction Detail Modal */}
        {selectedTx && (
          <div
            className="modal-overlay"
            onClick={() => setSelectedTx(null)}
          >
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2 className="modal-title">Transaction Detail</h2>
                <button
                  onClick={() => setSelectedTx(null)}
                  className="modal-close-btn"
                >
                  <XCircle style={{ width: '1.5rem', height: '1.5rem' }} />
                </button>
              </div>

              <div>
                <div className="detail-row-flex">
                  <span className="detail-label">Status:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {getStatusIcon(selectedTx.status)}
                    <span className="detail-value" style={{ textTransform: 'capitalize' }}>
                      {selectedTx.status}
                    </span>
                  </div>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Transaction Hash:</span>
                  <span className="detail-hash">{selectedTx.hash}</span>
                </div>

                <div className="detail-row-flex">
                  <span className="detail-label">Transaction type:</span>
                  <span className="detail-value" style={{ textTransform: 'capitalize' }}>
                    {selectedTx.type}
                  </span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">From:</span>
                  <span className="detail-value" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    {selectedTx.from}
                  </span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">To:</span>
                  <span className="detail-value" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    {selectedTx.to}
                  </span>
                </div>

                <div className="detail-row-flex">
                  <span className="detail-label">Amount:</span>
                  <span className="detail-value">{selectedTx.amount}</span>
                </div>

                <div className="detail-row-flex">
                  <span className="detail-label">Gas used:</span>
                  <span className="detail-value">{selectedTx.gasUsed}</span>
                </div>

                <div className="detail-row-flex">
                  <span className="detail-label">Block Number:</span>
                  <span className="detail-value">#{selectedTx.blockNumber}</span>
                </div>

                <div className="detail-row-flex">
                  <span className="detail-label">Confirmations:</span>
                  <span className="detail-value">{selectedTx.confirmations}</span>
                </div>

                <div className="detail-row-flex">
                  <span className="detail-label">Time:</span>
                  <span className="detail-value">{formatTime(selectedTx.timestamp)}</span>
                </div>
              </div>

              <button
                onClick={() => openInExplorer(selectedTx.hash)}
                className="modal-action-btn"
                style={{ marginTop: '1rem', marginBottom: '0.5rem' }}
              >
                View on Arcscan
              </button>

              <button
                onClick={() => setSelectedTx(null)}
                className="modal-action-btn"
                style={{ background: '#334155' }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionExplorer;