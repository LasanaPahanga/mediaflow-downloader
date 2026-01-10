import React from 'react';
import VideoDownloader from './components/VideoDownloader';
import { Youtube, Download, Zap, Shield, Heart } from 'lucide-react';
import './App.css';

function App() {
  return (
    <div className="app-container">
      {/* Background Decorations */}
      <div className="bg-decoration bg-decoration-1"></div>
      <div className="bg-decoration bg-decoration-2"></div>
      <div className="bg-decoration bg-decoration-3"></div>

      <div className="app-wrapper">
        {/* Header Section */}
        <header className="app-header animate-fade-in">
          <div className="logo-container">
            <div className="logo-icon">
              <Youtube size={40} strokeWidth={1.5} />
            </div>
            <div className="logo-badge">
              <Download size={16} />
            </div>
          </div>
          
          <h1 className="app-title">
            YouTube <span className="gradient-text">Downloader</span>
          </h1>
          
          <p className="app-subtitle">
            Download your favorite YouTube videos in multiple formats and quality levels. 
            Fast, secure, and completely free!
          </p>

          {/* Feature Pills */}
          <div className="feature-pills">
            <div className="feature-pill">
              <Zap size={14} />
              <span>Lightning Fast</span>
            </div>
            <div className="feature-pill">
              <Shield size={14} />
              <span>100% Secure</span>
            </div>
            <div className="feature-pill">
              <Download size={14} />
              <span>Multiple Formats</span>
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="app-main animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <VideoDownloader />
        </main>
        
        {/* Footer */}
        <footer className="app-footer animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="footer-content">
            <p className="footer-text">
              Made with <Heart size={14} className="heart-icon" /> for video enthusiasts
            </p>
            <p className="footer-disclaimer">
              © 2024 YouTube Video Downloader • For educational purposes only
            </p>
            <p className="footer-note">
              Please respect YouTube's Terms of Service and copyright laws
            </p>
          </div>
        </footer>
      </div>

      <style>{`
        .app-container {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
        }

        .app-wrapper {
          max-width: 900px;
          margin: 0 auto;
          padding: 40px 20px;
          position: relative;
          z-index: 1;
        }

        .app-header {
          text-align: center;
          margin-bottom: 48px;
        }

        .logo-container {
          position: relative;
          display: inline-block;
          margin-bottom: 24px;
        }

        .logo-icon {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 10px 40px rgba(239, 68, 68, 0.4);
          animation: float 3s ease-in-out infinite;
        }

        .logo-badge {
          position: absolute;
          bottom: -8px;
          right: -8px;
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, var(--primary-500) 0%, var(--primary-700) 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
          border: 3px solid #0c0c0c;
        }

        .app-title {
          font-size: clamp(2rem, 5vw, 3.5rem);
          font-weight: 800;
          color: white;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }

        .gradient-text {
          background: linear-gradient(135deg, var(--primary-400) 0%, #a78bfa 50%, #f472b6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .app-subtitle {
          font-size: 1.1rem;
          color: var(--gray-400);
          max-width: 500px;
          margin: 0 auto 28px;
          line-height: 1.7;
        }

        .feature-pills {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .feature-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-full);
          color: var(--gray-300);
          font-size: 13px;
          font-weight: 500;
          transition: all var(--transition-normal);
        }

        .feature-pill:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }

        .feature-pill svg {
          color: var(--primary-400);
        }

        .app-main {
          position: relative;
        }

        .app-footer {
          text-align: center;
          margin-top: 64px;
          padding-top: 32px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .footer-content {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .footer-text {
          color: var(--gray-400);
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .heart-icon {
          color: #ef4444;
          fill: #ef4444;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .footer-disclaimer {
          color: var(--gray-500);
          font-size: 13px;
        }

        .footer-note {
          color: var(--gray-600);
          font-size: 12px;
        }

        @media (max-width: 640px) {
          .app-wrapper {
            padding: 24px 16px;
          }

          .logo-icon {
            width: 64px;
            height: 64px;
            border-radius: 18px;
          }

          .logo-icon svg {
            width: 32px;
            height: 32px;
          }

          .logo-badge {
            width: 28px;
            height: 28px;
            bottom: -6px;
            right: -6px;
          }

          .feature-pills {
            gap: 8px;
          }

          .feature-pill {
            padding: 8px 14px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
