import React from 'react';
import { Youtube, Facebook, Instagram, Download, Sparkles, Shield, Zap, Film } from 'lucide-react';

const PlatformSelector = ({ onSelectPlatform }) => {
  return (
    <div className="platform-selector">
      <div className="selector-header">
        <div className="selector-icon">
          <Download size={48} strokeWidth={1.5} />
        </div>
        <h1 className="selector-title">
          MediaFlow <span className="gradient-text">Downloader</span>
        </h1>
        <p className="selector-subtitle">
          Download your favorite videos from YouTube, Facebook, and Instagram.
          Fast, secure, and completely free!
        </p>
      </div>

      <div className="platform-cards">
        {/* YouTube Card */}
        <div 
          className="platform-card youtube-card"
          onClick={() => onSelectPlatform('youtube')}
        >
          <div className="platform-icon youtube-icon">
            <Youtube size={48} strokeWidth={1.5} />
          </div>
          <h2 className="platform-name">YouTube</h2>
          <p className="platform-description">
            Download videos in multiple qualities up to 4K with audio extraction support
          </p>
          <div className="platform-features">
            <span className="feature-tag">
              <Sparkles size={12} />
              4K Support
            </span>
            <span className="feature-tag">
              <Zap size={12} />
              MP3 Convert
            </span>
          </div>
          <button className="platform-btn youtube-btn">
            <Youtube size={18} />
            Open YouTube Downloader
          </button>
        </div>

        {/* Facebook Card */}
        <div 
          className="platform-card facebook-card"
          onClick={() => onSelectPlatform('facebook')}
        >
          <div className="platform-icon facebook-icon">
            <Facebook size={48} strokeWidth={1.5} />
          </div>
          <h2 className="platform-name">Facebook</h2>
          <p className="platform-description">
            Download Facebook videos in SD and HD quality with fast single-stream downloads
          </p>
          <div className="platform-features">
            <span className="feature-tag">
              <Shield size={12} />
              Private Videos
            </span>
            <span className="feature-tag">
              <Zap size={12} />
              Fast Download
            </span>
          </div>
          <button className="platform-btn facebook-btn">
            <Facebook size={18} />
            Open Facebook Downloader
          </button>
        </div>

        {/* Instagram Card */}
        <div 
          className="platform-card instagram-card"
          onClick={() => onSelectPlatform('instagram')}
        >
          <div className="platform-icon instagram-icon">
            <Instagram size={48} strokeWidth={1.5} />
          </div>
          <h2 className="platform-name">Instagram</h2>
          <p className="platform-description">
            Download Reels, Posts, and IGTV videos instantly with one click
          </p>
          <div className="platform-features">
            <span className="feature-tag">
              <Film size={12} />
              Reels & IGTV
            </span>
            <span className="feature-tag">
              <Zap size={12} />
              One-Click
            </span>
          </div>
          <button className="platform-btn instagram-btn">
            <Instagram size={18} />
            Open Instagram Downloader
          </button>
        </div>
      </div>

      <div className="selector-footer">
        <p className="disclaimer">
          ⚠️ Downloads are for personal use only. Respect content ownership and platform terms of service.
        </p>
      </div>

      <style>{`
        .platform-selector {
          max-width: 900px;
          margin: 0 auto;
          padding: 60px 20px;
        }

        .selector-header {
          text-align: center;
          margin-bottom: 60px;
        }

        .selector-icon {
          width: 100px;
          height: 100px;
          background: linear-gradient(135deg, var(--primary-500) 0%, #8b5cf6 100%);
          border-radius: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin: 0 auto 28px;
          box-shadow: 0 20px 60px rgba(99, 102, 241, 0.4);
          animation: float 3s ease-in-out infinite;
        }

        .selector-title {
          font-size: clamp(2.2rem, 5vw, 3.5rem);
          font-weight: 800;
          color: white;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }

        .selector-subtitle {
          font-size: 1.15rem;
          color: var(--gray-400);
          max-width: 500px;
          margin: 0 auto;
          line-height: 1.7;
        }

        .platform-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 28px;
          margin-bottom: 48px;
        }

        .platform-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 40px 32px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .platform-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .youtube-card::before {
          background: linear-gradient(90deg, #ef4444, #dc2626);
        }

        .facebook-card::before {
          background: linear-gradient(90deg, #3b82f6, #1d4ed8);
        }

        .platform-card:hover {
          transform: translateY(-8px);
          border-color: rgba(255, 255, 255, 0.15);
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4);
        }

        .platform-card:hover::before {
          opacity: 1;
        }

        .youtube-card:hover {
          background: rgba(239, 68, 68, 0.08);
          border-color: rgba(239, 68, 68, 0.3);
        }

        .facebook-card:hover {
          background: rgba(59, 130, 246, 0.08);
          border-color: rgba(59, 130, 246, 0.3);
        }

        .instagram-card::before {
          background: linear-gradient(90deg, #E1306C, #833AB4);
        }

        .instagram-card:hover {
          background: rgba(225, 48, 108, 0.08);
          border-color: rgba(225, 48, 108, 0.3);
        }

        .platform-icon {
          width: 90px;
          height: 90px;
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          transition: transform 0.3s;
        }

        .platform-card:hover .platform-icon {
          transform: scale(1.1);
        }

        .youtube-icon {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          box-shadow: 0 12px 40px rgba(239, 68, 68, 0.35);
        }

        .facebook-icon {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          box-shadow: 0 12px 40px rgba(59, 130, 246, 0.35);
        }

        .instagram-icon {
          background: linear-gradient(135deg, #E1306C 0%, #C13584 50%, #833AB4 100%);
          color: white;
          box-shadow: 0 12px 40px rgba(225, 48, 108, 0.35);
        }

        .platform-name {
          font-size: 1.75rem;
          font-weight: 700;
          color: white;
          margin-bottom: 12px;
        }

        .platform-description {
          color: var(--gray-400);
          font-size: 0.95rem;
          line-height: 1.6;
          margin-bottom: 20px;
          min-height: 48px;
        }

        .platform-features {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-bottom: 28px;
          flex-wrap: wrap;
        }

        .feature-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 20px;
          font-size: 12px;
          color: var(--gray-300);
          font-weight: 500;
        }

        .feature-tag svg {
          color: var(--primary-400);
        }

        .platform-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 16px 24px;
          border-radius: 14px;
          font-size: 15px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.3s;
        }

        .youtube-btn {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          box-shadow: 0 8px 30px rgba(239, 68, 68, 0.3);
        }

        .youtube-btn:hover {
          box-shadow: 0 12px 40px rgba(239, 68, 68, 0.45);
          transform: translateY(-2px);
        }

        .facebook-btn {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          box-shadow: 0 8px 30px rgba(59, 130, 246, 0.3);
        }

        .facebook-btn:hover {
          box-shadow: 0 12px 40px rgba(59, 130, 246, 0.45);
          transform: translateY(-2px);
        }

        .instagram-btn {
          background: linear-gradient(135deg, #E1306C 0%, #C13584 50%, #833AB4 100%);
          color: white;
          box-shadow: 0 8px 30px rgba(225, 48, 108, 0.3);
        }

        .instagram-btn:hover {
          box-shadow: 0 12px 40px rgba(225, 48, 108, 0.45);
          transform: translateY(-2px);
        }

        .selector-footer {
          text-align: center;
        }

        .disclaimer {
          color: var(--gray-500);
          font-size: 13px;
          padding: 16px 24px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        @media (max-width: 700px) {
          .platform-selector {
            padding: 40px 16px;
          }

          .selector-header {
            margin-bottom: 40px;
          }

          .selector-icon {
            width: 80px;
            height: 80px;
            border-radius: 20px;
          }

          .selector-icon svg {
            width: 36px;
            height: 36px;
          }

          .platform-cards {
            grid-template-columns: 1fr;
          }

          .platform-card {
            padding: 32px 24px;
          }

          .platform-icon {
            width: 72px;
            height: 72px;
          }

          .platform-icon svg {
            width: 36px;
            height: 36px;
          }
        }
      `}</style>
    </div>
  );
};

export default PlatformSelector;
