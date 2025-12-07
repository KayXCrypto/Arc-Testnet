import React from 'react';
import { ExternalLink, Zap } from 'lucide-react';
// Không cần import DollarSign/TestTube nữa
import '../styles/bottom.css'

const AssetTabBottom = () => {
    // ⚠️ CẦN CẬP NHẬT: Thay thế bằng link faucet THỰC TẾ của Arc Testnet
    const FAUCET_LINK = "https://faucet.arc-testnet.io/";

    // Đường dẫn hình ảnh USDC mới
    const USDC_LOGO_URL = "https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=040";

    return (
        <div className="swap-footer">
            {/* Thông báo chính về môi trường Testnet */}
            <div className="info-badge-web3">
                <Zap size={14} style={{ marginRight: '5px', color: '#8d8d8d' }} />
                <span>Arc Testnet Live</span>
            </div>

            {/* Thẻ Faucet - Nơi cung cấp token test */}
            <div className="faucet-action-card">
                <div className="card-icon">
                    {/* THAY THẾ ICON LAMA BẰNG THẺ <img> CỦA LOGO USDC */}
                    <img
                        src={USDC_LOGO_URL}
                        alt="USDC Logo"
                        style={{ width: '24px', height: '24px' }}
                    />
                </div>
                <div className="card-content">
                    <span className="card-title">Need Testnet Tokens (USDC, EURC)?</span>
                    <span className="card-description">
                        Receive free test tokens to start immediately on Arc Testnet.
                    </span>
                </div>
                <a
                    href={FAUCET_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="faucet-cta-button" // Nút CTA mới
                >
                    Faucet
                    <ExternalLink size={16} style={{ marginLeft: '8px' }} />
                </a>
            </div>
        </div>
    );
};

export default AssetTabBottom;