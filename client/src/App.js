import React, { useState } from 'react';
import VideoDownloader from './components/VideoDownloader';
import FacebookDownloader from './components/FacebookDownloader';
import PlatformSelector from './components/PlatformSelector';
import { Youtube, Facebook, Download, Zap, Shield, Heart, ArrowLeft } from 'lucide-react';
import './App.css';

function App() {
  const [selectedPlatform, setSelectedPlatform] = useState(null); // null, 'youtube', or 'facebook'

  const handleBackToSelector = () => {
    setSelectedPlatform(null);
  };

  // Platform Selector (Landing Page)
  if (!selectedPlatform) {
    return (
      <div className="app-container">
        {/* Background Decorations */}
        <div className="bg-decoration bg-decoration-1"></div>
        <div className="bg-decoration bg-decoration-2"></div>
        <div className="bg-decoration bg-decoration-3"></div>

        <PlatformSelector onSelectPlatform={setSelectedPlatform} />
      </div>
    );
  }

  // YouTube Downloader View
  if (selectedPlatform === 'youtube') {
    return (
      <div className="app-container">
        {/* Background Decorations */}
        <div className="bg-decoration bg-decoration-1"></div>
        <div className="bg-decoration bg-decoration-2"></div>
        <div className="bg-decoration bg-decoration-3"></div>

        <div className="app-wrapper">
          {/* Back Button */}
          <button className="back-button animate-fade-in" onClick={handleBackToSelector}>
            <ArrowLeft size={18} />
            <span>All Platforms</span>
          </button>

          {/* Header Section */}
          <header className="app-header animate-fade-in">
            <div className="logo-container">
              <div className="logo-icon youtube-logo">
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
                © 2024 MediaFlow Downloader • For educational purposes only
              </p>
              <p className="footer-note">
                Please respect YouTube's Terms of Service and copyright laws
              </p>
            </div>
          </footer>
        </div>
      </div>
    );
  }

  // Facebook Downloader View
  if (selectedPlatform === 'facebook') {
    return (
      <div className="app-container">
        {/* Background Decorations */}
        <div className="bg-decoration bg-decoration-1"></div>
        <div className="bg-decoration bg-decoration-2"></div>
        <div className="bg-decoration bg-decoration-3"></div>

        <div className="app-wrapper">
          {/* Back Button */}
          <button className="back-button animate-fade-in" onClick={handleBackToSelector}>
            <ArrowLeft size={18} />
            <span>All Platforms</span>
          </button>

          {/* Header Section */}
          <header className="app-header animate-fade-in">
            <div className="logo-container">
              <div className="logo-icon facebook-logo">
                <Facebook size={40} strokeWidth={1.5} />
              </div>
              <div className="logo-badge facebook-badge">
                <Download size={16} />
              </div>
            </div>
            
            <h1 className="app-title">
              Facebook <span className="gradient-text-fb">Downloader</span>
            </h1>
            
            <p className="app-subtitle">
              Download Facebook videos in HD and SD quality. 
              Fast single-stream downloads with audio included!
            </p>

            {/* Feature Pills */}
            <div className="feature-pills">
              <div className="feature-pill">
                <Zap size={14} />
                <span>Fast Downloads</span>
              </div>
              <div className="feature-pill">
                <Shield size={14} />
                <span>Private Videos</span>
              </div>
              <div className="feature-pill">
                <Download size={14} />
                <span>HD Quality</span>
              </div>
            </div>
          </header>
          
          {/* Main Content */}
          <main className="app-main animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <FacebookDownloader />
          </main>
          
          {/* Footer */}
          <footer className="app-footer animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="footer-content">
              <p className="footer-text">
                Made with <Heart size={14} className="heart-icon" /> for video enthusiasts
              </p>
              <p className="footer-disclaimer">
                © 2024 MediaFlow Downloader • For educational purposes only
              </p>
              <p className="footer-note">
                Please respect Facebook's Terms of Service and copyright laws
              </p>
            </div>
          </footer>
        </div>

      </div>
    );
  }

  return null;
}

export default App;
