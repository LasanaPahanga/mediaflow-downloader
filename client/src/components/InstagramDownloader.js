import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Search, 
  Download, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Link2, 
  User, 
  Clock, 
  Film,
  Instagram,
  Lock,
  Globe,
  Heart,
  MessageCircle
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

const InstagramDownloader = () => {
  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [thumbnailError, setThumbnailError] = useState(false);
  
  // Progress states
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStage, setDownloadStage] = useState('');
  
  // Server health states
  const [cookieWarning, setCookieWarning] = useState('');
  const [diskWarning, setDiskWarning] = useState('');
  
  const eventSourceRef = useRef(null);

  // Check server health on mount
  useEffect(() => {
    const checkServerHealth = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/health`);
        
        if (response.data.cookieStatus && !response.data.cookieStatus.valid) {
          setCookieWarning('Cookies not configured. Some videos may be restricted.');
        }
        
        if (response.data.diskSpace && !response.data.diskSpace.sufficient) {
          setDiskWarning(response.data.diskSpace.message);
        }
      } catch (err) {
        console.error('Failed to check server health:', err);
      }
    };
    
    checkServerHealth();
  }, []);

  // Validate Instagram URL
  const isValidInstagramUrl = (inputUrl) => {
    const igPatterns = [
      /instagram\.com\/p\//i,           // Posts
      /instagram\.com\/reel\//i,        // Reels
      /instagram\.com\/reels\//i,       // Reels alt
      /instagram\.com\/tv\//i,          // IGTV
      /instagram\.com\/.*\/reel\//i,    // User reels
      /instagr\.am\//i,                 // Short URL
    ];
    return igPatterns.some(pattern => pattern.test(inputUrl));
  };

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please enter an Instagram URL');
      return;
    }

    if (!isValidInstagramUrl(url)) {
      setError('Please enter a valid Instagram video URL (Reel, Post, or IGTV)');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setVideoInfo(null);
    setThumbnailError(false);

    try {
      const response = await axios.post(`${API_BASE_URL}/instagram/video-info`, { url });
      setVideoInfo(response.data);
      setSuccess('Video found! Click download to save.');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch video information';
      
      // Friendly error messages for Instagram
      if (errorMsg.includes('login') || errorMsg.includes('private')) {
        setError('🔒 This account is private or requires login.');
      } else if (errorMsg.includes('unavailable') || errorMsg.includes('removed') || errorMsg.includes('not found')) {
        setError('❌ This video is unavailable or has been removed.');
      } else if (errorMsg.includes('carousel') || errorMsg.includes('image')) {
        setError('📷 This post contains images only or is a carousel. Only single videos are supported.');
      } else if (errorMsg.includes('story') || errorMsg.includes('stories')) {
        setError('⏱️ Stories are not supported. Try Reels or Posts instead.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Cleanup event source on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleDownload = async () => {
    if (!videoInfo) {
      setError('No video information available');
      return;
    }

    setDownloading(true);
    setDownloadProgress(0);
    setDownloadStage('Starting download...');
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${API_BASE_URL}/instagram/download-start`, {
        url,
        estimatedSize: videoInfo.filesize || 0
      });

      const { downloadId } = response.data;

      // Connect to SSE for progress updates
      const eventSource = new EventSource(`${API_BASE_URL}/download-progress/${downloadId}`);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = async (event) => {
        const data = JSON.parse(event.data);

        if (data.status === 'downloading' || data.status === 'processing') {
          setDownloadProgress(data.progress || 0);
          setDownloadStage(data.stage || 'Processing...');
        } else if (data.status === 'completed') {
          setDownloadProgress(100);
          setDownloadStage('Download ready!');
          eventSource.close();

          // Trigger file download
          const link = document.createElement('a');
          link.href = `${API_BASE_URL}/download-file/${downloadId}?filename=${encodeURIComponent(data.filename)}`;
          link.download = data.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          setSuccess('Download completed successfully!');
          setDownloading(false);
          setDownloadProgress(0);
          setDownloadStage('');
        } else if (data.status === 'error') {
          eventSource.close();
          setError(data.message || 'Download failed');
          setDownloading(false);
          setDownloadProgress(0);
          setDownloadStage('');
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setError('Connection lost. Please try again.');
        setDownloading(false);
        setDownloadProgress(0);
        setDownloadStage('');
      };

    } catch (err) {
      if (err.response?.status === 507) {
        setError(`💾 ${err.response.data.message || 'Insufficient disk space'}`);
        setDiskWarning(err.response.data.message);
      } else {
        setError(err.response?.data?.error || err.response?.data?.message || 'Download failed');
      }
      setDownloading(false);
      setDownloadProgress(0);
      setDownloadStage('');
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCount = (count) => {
    if (!count) return '0';
    const num = parseInt(count);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  return (
    <div className="ig-downloader">
      {/* Cookie Warning */}
      {cookieWarning && (
        <div className="warning-banner cookie-warning">
          <Lock size={16} />
          <span>{cookieWarning}</span>
        </div>
      )}
      
      {/* Disk Space Warning */}
      {diskWarning && (
        <div className="warning-banner disk-warning">
          <AlertCircle size={16} />
          <span>{diskWarning}</span>
        </div>
      )}

      {/* URL Input Section */}
      <div className="input-section">
        <div className="input-header">
          <Link2 size={20} className="input-icon" />
          <span>Paste Instagram Video URL</span>
        </div>
        
        <form onSubmit={handleUrlSubmit} className="url-form">
          <div className="input-wrapper">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.instagram.com/reel/..."
              className="url-input"
              disabled={loading || downloading}
            />
            <button 
              type="submit" 
              className="fetch-btn"
              disabled={loading || downloading || !url.trim()}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spin" />
                  <span>Fetching...</span>
                </>
              ) : (
                <>
                  <Search size={18} />
                  <span>Get Video</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="url-hints">
          <span className="hint">Supported: Reels, Posts, IGTV videos</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="message error-message">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="message success-message">
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Video Info Display */}
      {videoInfo && (
        <div className="video-info-section">
          {/* Video Preview */}
          <div className="video-preview">
            <div className="thumbnail-container">
              {videoInfo.thumbnail && !thumbnailError ? (
                <img 
                  src={videoInfo.thumbnail} 
                  alt={videoInfo.title}
                  className="thumbnail"
                  onError={() => setThumbnailError(true)}
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="thumbnail-placeholder">
                  <Film size={48} />
                </div>
              )}
              {videoInfo.duration && (
                <div className="duration-badge">
                  <Clock size={12} />
                  {formatDuration(videoInfo.duration)}
                </div>
              )}
              <div className="platform-badge">
                <Instagram size={12} />
                Instagram
              </div>
            </div>
            
            <div className="video-details">
              <h3 className="video-title">
                {videoInfo.title || 'Instagram Video'}
              </h3>
              
              <div className="video-meta">
                {videoInfo.author && (
                  <div className="meta-item author-item">
                    <User size={14} />
                    <span>@{videoInfo.author}</span>
                  </div>
                )}
                {videoInfo.likeCount && (
                  <div className="meta-item">
                    <Heart size={14} />
                    <span>{formatCount(videoInfo.likeCount)}</span>
                  </div>
                )}
                {videoInfo.commentCount && (
                  <div className="meta-item">
                    <MessageCircle size={14} />
                    <span>{formatCount(videoInfo.commentCount)}</span>
                  </div>
                )}
                <div className="meta-item">
                  {videoInfo.isPrivate ? (
                    <>
                      <Lock size={14} />
                      <span>Private</span>
                    </>
                  ) : (
                    <>
                      <Globe size={14} />
                      <span>Public</span>
                    </>
                  )}
                </div>
              </div>

              {videoInfo.caption && (
                <p className="video-caption">{videoInfo.caption}</p>
              )}

              {/* Quality Badge */}
              <div className="quality-info">
                <span className="quality-badge">
                  {videoInfo.quality || 'Best Quality'} • MP4
                </span>
                <span className="quality-note">Video + Audio included</span>
              </div>
            </div>
          </div>

          {/* Download Progress */}
          {downloading && (
            <div className="progress-section">
              <div className="progress-header">
                <Loader2 size={18} className="spin" />
                <span>{downloadStage}</span>
                <span className="progress-percent">{Math.round(downloadProgress)}%</span>
              </div>
              <div className="progress-bar-container">
                <div 
                  className="progress-bar"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="download-btn"
          >
            {downloading ? (
              <>
                <Loader2 size={20} className="spin" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <Download size={20} />
                <span>Download Video</span>
              </>
            )}
          </button>
        </div>
      )}

      <style>{`
        .ig-downloader {
          width: 100%;
        }

        .warning-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          margin-bottom: 20px;
        }

        .cookie-warning {
          background: rgba(251, 191, 36, 0.1);
          border: 1px solid rgba(251, 191, 36, 0.3);
          color: #fbbf24;
        }

        .disk-warning {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        .input-section {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 28px;
          margin-bottom: 24px;
        }

        .input-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
          color: var(--gray-300);
          font-weight: 500;
        }

        .input-icon {
          color: #E1306C;
        }

        .url-form {
          width: 100%;
        }

        .input-wrapper {
          display: flex;
          gap: 12px;
        }

        .url-input {
          flex: 1;
          padding: 16px 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          color: white;
          font-size: 15px;
          outline: none;
          transition: all 0.3s;
        }

        .url-input:focus {
          border-color: #E1306C;
          box-shadow: 0 0 0 3px rgba(225, 48, 108, 0.2);
        }

        .url-input::placeholder {
          color: var(--gray-500);
        }

        .fetch-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 16px 24px;
          background: linear-gradient(135deg, #E1306C 0%, #C13584 50%, #833AB4 100%);
          border: none;
          border-radius: 14px;
          color: white;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s;
          white-space: nowrap;
        }

        .fetch-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(225, 48, 108, 0.4);
        }

        .fetch-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .url-hints {
          margin-top: 12px;
        }

        .hint {
          color: var(--gray-500);
          font-size: 12px;
        }

        .message {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 18px;
          border-radius: 12px;
          font-size: 14px;
          margin-bottom: 20px;
        }

        .error-message {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
        }

        .success-message {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #4ade80;
        }

        .video-info-section {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 28px;
        }

        .video-preview {
          display: flex;
          gap: 24px;
          margin-bottom: 28px;
        }

        .thumbnail-container {
          position: relative;
          flex-shrink: 0;
          width: 240px;
          border-radius: 16px;
          overflow: hidden;
        }

        .thumbnail {
          width: 100%;
          aspect-ratio: 9/16;
          object-fit: cover;
        }

        .thumbnail-placeholder {
          width: 100%;
          aspect-ratio: 9/16;
          background: rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--gray-500);
        }

        .duration-badge {
          position: absolute;
          bottom: 10px;
          right: 10px;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background: rgba(0, 0, 0, 0.85);
          border-radius: 6px;
          color: white;
          font-size: 12px;
          font-weight: 500;
        }

        .platform-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background: linear-gradient(135deg, #E1306C 0%, #833AB4 100%);
          border-radius: 6px;
          color: white;
          font-size: 11px;
          font-weight: 600;
        }

        .video-details {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .video-title {
          font-size: 1.15rem;
          font-weight: 600;
          color: white;
          margin-bottom: 12px;
          line-height: 1.4;
        }

        .video-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 16px;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--gray-400);
          font-size: 13px;
        }

        .meta-item svg {
          color: var(--gray-500);
        }

        .author-item {
          color: #E1306C;
          font-weight: 500;
        }

        .author-item svg {
          color: #E1306C;
        }

        .video-caption {
          color: var(--gray-400);
          font-size: 13px;
          line-height: 1.5;
          margin-bottom: 16px;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .quality-info {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: auto;
        }

        .quality-badge {
          padding: 6px 14px;
          background: linear-gradient(135deg, rgba(225, 48, 108, 0.2) 0%, rgba(131, 58, 180, 0.2) 100%);
          border: 1px solid rgba(225, 48, 108, 0.3);
          border-radius: 8px;
          color: #E1306C;
          font-size: 13px;
          font-weight: 600;
        }

        .quality-note {
          color: var(--gray-500);
          font-size: 12px;
        }

        .progress-section {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 14px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .progress-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
          color: var(--gray-300);
          font-size: 14px;
        }

        .progress-percent {
          margin-left: auto;
          font-weight: 600;
          color: #E1306C;
        }

        .progress-bar-container {
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          overflow: hidden;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #E1306C, #833AB4);
          border-radius: 10px;
          transition: width 0.3s ease;
        }

        .download-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 18px;
          background: linear-gradient(135deg, #E1306C 0%, #C13584 50%, #833AB4 100%);
          border: none;
          border-radius: 14px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 8px 30px rgba(225, 48, 108, 0.3);
        }

        .download-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(225, 48, 108, 0.45);
        }

        .download-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .input-section, .video-info-section {
            padding: 20px;
          }

          .input-wrapper {
            flex-direction: column;
          }

          .fetch-btn {
            width: 100%;
            justify-content: center;
          }

          .video-preview {
            flex-direction: column;
            align-items: center;
          }

          .thumbnail-container {
            width: 200px;
          }

          .video-details {
            text-align: center;
          }

          .video-meta {
            justify-content: center;
          }

          .quality-info {
            justify-content: center;
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
};

export default InstagramDownloader;
