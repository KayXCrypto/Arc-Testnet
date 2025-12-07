import React from 'react';
import { Youtube, Twitter, Disc } from 'lucide-react';
// Sử dụng Disc (Disc/Discord), Twitter, và Youtube từ lucide-react
import '../styles/footer.css'
import DiscordIcon from "../assets/dc.png";
import TwitterIcon from "../assets/x.png";
import YoutubeIcon from "../assets/tele.png";

const ContactFooter = () => {
    return (
        <div className="contact-footer-web3">
            <div className="footer-links">
                <a href="https://docs.arc.network/arc/concepts/welcome-to-arc" target="_blank" rel="noopener noreferrer">Developer Terms</a>
                <a href="#" target="_blank" rel="noopener noreferrer">Service Terms</a>
                <a href="#" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                {/* Giả định biểu tượng xanh là Your Privacy Choices */}
                <a href="#" target="_blank" rel="noopener noreferrer" className="privacy-choices-link">
                    Your Privacy Choices <span className="blue-icon">🛈</span>
                </a>
            </div>
            <div className="social-icons">
                {/* Discord/Purple */}
                <a
                    href="https://discord.com/invite/buildonarc"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-icon discord-bg"
                >
                    <img src={DiscordIcon} alt="Discord" className="w-5 h-5" />
                </a>
                {/* Twitter/Black/White */}
                <a
                    href="https://x.com/arc"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-icon twitter-bg"
                >
                    <img src={TwitterIcon} alt="Twitter" className="w-5 h-5" />
                </a>
                {/* YouTube/Red */}
                <a
                    href="https://youtube.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-icon youtube-bg"
                >
                    <img src={YoutubeIcon} alt="YouTube" className="w-5 h-5" />
                </a>
            </div>
        </div>
    );
};

export default ContactFooter;