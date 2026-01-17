# 📚 MediaFlow Downloader - Complete Code Documentation

> **A comprehensive guide to understanding every file in this project**
> 
> Read the files in the order listed below for the best learning experience.

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Reading Order](#2-reading-order)
3. [Root Configuration Files](#3-root-configuration-files)
4. [Server (Backend) Files](#4-server-backend-files)
5. [Client (Frontend) Files](#5-client-frontend-files)
6. [Data Flow Diagram](#6-data-flow-diagram)
7. [Key Concepts](#7-key-concepts)

---

## 1. Project Overview

```
mediaflow-downloader/
│
├── 📦 package.json              # Root project config
├── 📖 README.md                 # User documentation
├── 🚀 start.bat                 # Windows startup script
│
├── 🖥️ server/                   # Backend (Node.js + Express)
│   ├── package.json             # Server dependencies
│   ├── index.js                 # ⭐ MAIN SERVER FILE (2500+ lines)
│   ├── downloads/               # Temporary download storage
│   ├── cookies.txt              # Browser cookies for auth
│   ├── cookies.json             # Alternative cookie format
│   └── COOKIES_SETUP.md         # Cookie setup guide
│
└── 💻 client/                   # Frontend (React.js)
    ├── package.json             # Client dependencies
    ├── public/
    │   └── index.html           # HTML entry point
    └── src/
        ├── index.js             # React entry point
        ├── App.js               # Main App component (router)
        ├── App.css              # Global styles (1300+ lines)
        └── components/
            ├── PlatformSelector.js    # Landing page carousel
            ├── VideoDownloader.js     # YouTube downloader
            ├── FacebookDownloader.js  # Facebook downloader
            ├── InstagramDownloader.js # Instagram downloader
            ├── TikTokDownloader.js    # TikTok downloader
            ├── TwitterDownloader.js   # X/Twitter downloader
            └── DirectDownloader.js    # Direct URL downloader
```

---

## 2. Reading Order

### 🎯 Recommended Order for Understanding the Code

| Order | File | Purpose | Priority |
|-------|------|---------|----------|
| 1️⃣ | `package.json` (root) | Understand project structure | ⭐⭐⭐ |
| 2️⃣ | `server/package.json` | Learn backend dependencies | ⭐⭐⭐ |
| 3️⃣ | `client/package.json` | Learn frontend dependencies | ⭐⭐⭐ |
| 4️⃣ | `client/src/index.js` | React app entry point | ⭐⭐ |
| 5️⃣ | `client/src/App.js` | Main router & layout | ⭐⭐⭐ |
| 6️⃣ | `client/src/components/PlatformSelector.js` | Landing page UI | ⭐⭐⭐ |
| 7️⃣ | `client/src/components/VideoDownloader.js` | YouTube logic | ⭐⭐⭐ |
| 8️⃣ | `server/index.js` (Lines 1-200) | Server setup | ⭐⭐⭐ |
| 9️⃣ | `server/index.js` (Lines 200-500) | API endpoints | ⭐⭐⭐ |
| 🔟 | `server/index.js` (Lines 700-1000) | Download logic | ⭐⭐⭐ |
| 1️⃣1️⃣ | `client/src/App.css` | Styling system | ⭐⭐ |

---

## 3. Root Configuration Files

### 📦 `/package.json` - Root Project Config

**Purpose:** Defines the overall project and scripts to run both server and client simultaneously.

```javascript
// Key Scripts:
{
  "scripts": {
    "dev": "concurrently \"npm run server\" \"npm run client\"",  // Run both
    "server": "cd server && npm run dev",                          // Start backend
    "client": "cd client && npm start",                            // Start frontend
    "build": "cd client && npm run build",                         // Production build
    "install-all": "npm install && cd server && npm install && cd ../client && npm install"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"  // Allows running multiple npm scripts at once
  }
}
```

**Key Concept:** `concurrently` lets us run the React frontend (port 3000) and Express backend (port 5000) at the same time with one command.

---

### 📦 `/server/package.json` - Backend Dependencies

**Purpose:** Lists all Node.js packages needed for the server.

```javascript
{
  "dependencies": {
    // Core Server
    "express": "^4.18.2",        // Web server framework
    "cors": "^2.8.5",            // Enable cross-origin requests (frontend→backend)
    
    // Video Processing
    "yt-dlp-exec": "^1.0.2",     // ⭐ Main video downloader (wraps yt-dlp CLI)
    "fluent-ffmpeg": "^2.1.3",   // Video/audio merging & conversion
    "ffmpeg-static": "^5.2.0",   // Bundled FFmpeg binary
    
    // Utilities
    "uuid": "^9.0.0",            // Generate unique download IDs
    "axios": "^1.6.2",           // HTTP requests
    
    // Legacy (kept for compatibility)
    "ytdl-core": "^4.11.5",      // Old YouTube library (not used)
    "@distube/ytdl-core": "^4.16.12"
  }
}
```

**Key Concept:** `yt-dlp-exec` is a Node.js wrapper around [yt-dlp](https://github.com/yt-dlp/yt-dlp), a powerful command-line video downloader that supports 1000+ websites.

---

### 📦 `/client/package.json` - Frontend Dependencies

**Purpose:** Lists all React packages needed for the UI.

```javascript
{
  "dependencies": {
    // React Core
    "react": "^19.2.1",          // UI library
    "react-dom": "^19.2.1",      // React DOM rendering
    "react-scripts": "5.0.1",    // Create React App tooling
    
    // HTTP & Icons
    "axios": "^1.13.2",          // API requests to backend
    "lucide-react": "^0.555.0",  // Beautiful icon library
    
    // Testing (optional)
    "@testing-library/react": "^16.3.0"
  }
}
```

---

## 4. Server (Backend) Files

### 🖥️ `/server/index.js` - Main Server File (⭐ MOST IMPORTANT)

This is the heart of the application. It's ~2500 lines, so let's break it down by sections:

---

#### **Section 1: Imports & Setup (Lines 1-90)**

```javascript
const express = require('express');      // Web framework
const cors = require('cors');            // Allow frontend requests
const path = require('path');            // File path utilities
const fs = require('fs');                // File system operations
const ffmpeg = require('fluent-ffmpeg'); // Video processing
const ffmpegStatic = require('ffmpeg-static'); // Bundled FFmpeg
const { v4: uuidv4 } = require('uuid');  // Unique IDs
const { spawn, execSync } = require('child_process'); // Run CLI commands
const ytDlp = require('yt-dlp-exec');    // ⭐ Main downloader

// Configure FFmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

const app = express();
const PORT = 5000;

// Store active downloads for progress tracking
const activeDownloads = new Map();  // downloadId → SSE response
const downloadReadyCallbacks = new Map();
```

**Key Concepts:**
- `activeDownloads` is a Map that tracks ongoing downloads
- Each download gets a unique UUID (e.g., `a1b2c3d4-e5f6-...`)
- Server-Sent Events (SSE) are used to send real-time progress to the frontend

---

#### **Section 2: aria2c Detection (Lines 23-75)**

```javascript
// Check for aria2c (multi-threaded download accelerator)
let hasAria2c = false;
let aria2cPath = 'aria2c';

// Check common installation paths on Windows
const aria2cPaths = [
    'aria2c',
    path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Links', 'aria2c.exe'),
    // ... more paths
];

for (const p of aria2cPaths) {
    try {
        execSync(`"${p}" --version`, { stdio: 'ignore' });
        hasAria2c = true;
        aria2cPath = p;
        console.log(`✅ aria2c found at: ${p}`);
        break;
    } catch {
        // Try next path
    }
}
```

**Key Concept:** aria2c is an optional download accelerator that can use 16 simultaneous connections for faster downloads (but doesn't work with YouTube due to IP-bound URLs).

---

#### **Section 3: Cookie System (Lines 90-180)**

```javascript
// Check if cookies file exists
const cookiesPath = path.join(__dirname, 'cookies.txt');
let hasCookies = fs.existsSync(cookiesPath);

// Cookie Health Check Function
const checkCookieHealth = () => {
    // Read cookies.txt
    const cookieContent = fs.readFileSync(cookiesPath, 'utf8');
    
    // Check for important YouTube cookies
    const hasLoginCookie = cookieContent.includes('LOGIN_INFO');
    const hasSessionCookie = cookieContent.includes('SSID');
    
    // Check expiry dates
    // ... validation logic
    
    return { valid: true/false, message: '...', expiringSoon: true/false };
};
```

**Key Concept:** Cookies from your browser are used to access age-restricted or private videos. The server validates cookies at startup and warns if they're expired.

---

#### **Section 4: Disk Space Check (Lines 183-230)**

```javascript
const checkDiskSpace = async (requiredBytes = 0) => {
    // Windows: Use PowerShell
    const result = execSync(
        `powershell -command "(Get-PSDrive C).Free"`,
        { encoding: 'utf8' }
    ).trim();
    
    const freeBytes = parseInt(result, 10);
    const freeGB = (freeBytes / (1024 * 1024 * 1024)).toFixed(2);
    
    // Warn if less than 1GB free
    return {
        freeBytes,
        freeGB,
        sufficient: freeBytes >= 1024 * 1024 * 1024,
        message: `${freeGB}GB available`
    };
};
```

**Key Concept:** Before every download, the server checks if there's enough disk space to prevent failed downloads.

---

#### **Section 5: API Endpoints (Lines 280-700)**

```javascript
// 1. Health Check - GET /api/health
app.get('/api/health', async (req, res) => {
    res.json({ 
        status: 'Server is running!', 
        hasCookies: cookieStatus.valid,
        diskSpace: await checkDiskSpace(),
        aria2c: hasAria2c
    });
});

// 2. Fast Metadata Fetch - POST /api/video-metadata
app.post('/api/video-metadata', async (req, res) => {
    const { url } = req.body;
    
    // Use yt-dlp to get video info (fast, no formats)
    const info = await ytDlp(url, {
        dumpSingleJson: true,   // Output as JSON
        skipDownload: true,      // Don't download, just get info
        noPlaylist: true         // Single video only
    });
    
    res.json({
        title: info.title,
        thumbnail: info.thumbnail,
        duration: info.duration,
        author: info.uploader
    });
});

// 3. Get Formats - POST /api/video-formats
app.post('/api/video-formats', async (req, res) => {
    // Get all available quality options
    // Filter out HLS/m3u8 (fragmented streams that don't work with aria2c)
    // Return: [{ formatId, quality: '1080p', hasVideo, hasAudio, filesize }, ...]
});

// 4. Start Download - POST /api/download-start
app.post('/api/download-start', async (req, res) => {
    const { url, formatId, convertToMp3, mergeAudio } = req.body;
    const downloadId = uuidv4();  // Generate unique ID
    
    // Check disk space
    // Start download process (async)
    // Return downloadId to frontend
    
    res.json({ downloadId, status: 'started' });
});

// 5. Progress Stream (SSE) - GET /api/download-progress/:downloadId
app.get('/api/download-progress/:downloadId', (req, res) => {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Store response object for sending updates
    activeDownloads.set(downloadId, res);
    
    // Send updates like: { status: 'downloading', progress: 45, stage: 'Downloading...' }
});

// 6. Serve File - GET /api/download-file/:downloadId
app.get('/api/download-file/:downloadId', (req, res) => {
    // Find the downloaded file
    // Stream it to the browser
    res.download(filePath, filename);
});
```

---

#### **Section 6: Download Processing (Lines 700-1000)**

```javascript
// Main download orchestrator
async function processDownload(downloadId, url, format, convertToMp3, mp3Bitrate, mergeAudio) {
    sendProgress(downloadId, { status: 'downloading', progress: 0, stage: 'Preparing...' });
    
    // Get video info
    const info = await ytDlp(url, { dumpSingleJson: true });
    const title = info.title.replace(/[^\w\s-]/gi, '').substring(0, 100);
    
    // Decision tree:
    if (convertToMp3 && isAudioOnly) {
        // Audio → MP3 conversion
        await downloadWithYtDlp(..., 'mp3', bitrate);
    } else if (mergeAudio && isVideoOnly) {
        // Video-only → Download video + audio in parallel, then merge
        await downloadParallelMerge(downloadId, url, format, outputPath, info);
    } else {
        // Combined stream → Simple download
        await downloadWithYtDlp(downloadId, url, format, outputPath);
    }
    
    sendProgress(downloadId, { status: 'completed', filename: outputFilename });
}

// Parallel video + audio download with FFmpeg merge
async function downloadParallelMerge(downloadId, url, videoFormat, outputPath, info) {
    // 1. Find best audio format
    // 2. Download video stream (async)
    // 3. Download audio stream (async)  ← Both run at same time!
    await Promise.all([videoPromise, audioPromise]);
    
    // 4. Merge with FFmpeg (no re-encoding)
    ffmpeg()
        .input(videoPath)
        .input(audioPath)
        .outputOptions(['-c:v copy', '-c:a aac'])  // Fast copy, no re-encode
        .output(outputPath)
        .run();
}

// Single stream download with yt-dlp
function downloadWithYtDlp(downloadId, url, format, outputPath, audioFormat, audioBitrate) {
    const options = {
        format: format,
        output: outputPath,
        ffmpegLocation: ffmpegStatic
    };
    
    // Use cookies if available
    if (hasCookies) options.cookies = cookiesPath;
    
    // Use aria2c for non-YouTube (YouTube URLs are IP-bound)
    if (hasAria2c && !isYouTubeUrl) {
        options.externalDownloader = aria2cPath;
        options.externalDownloaderArgs = '-x 16 -s 16';  // 16 connections
    }
    
    return ytDlpExec.exec(url, options);
}
```

---

#### **Section 7: Platform-Specific Endpoints (Lines 1000-2500)**

The server has dedicated endpoints for each platform:

```javascript
// ═══ Facebook ═══
app.post('/api/facebook/video-info', ...);     // Get video metadata
app.post('/api/facebook/download-start', ...); // Start download
async function processFacebookDownload(...);    // Process download

// ═══ Instagram ═══
app.post('/api/instagram/video-info', ...);
app.post('/api/instagram/download-start', ...);
async function processInstagramDownload(...);

// ═══ TikTok ═══
app.post('/api/tiktok/video-info', ...);
app.post('/api/tiktok/download-start', ...);
async function processTikTokDownload(...);

// ═══ X (Twitter) ═══
app.post('/api/twitter/video-info', ...);
app.post('/api/twitter/download-start', ...);
async function processTwitterDownload(...);

// ═══ Direct URL ═══
app.post('/api/direct/download-start', ...);
```

Each platform has slightly different handling:
- **TikTok:** Has `removeWatermark` option
- **Twitter:** Extracts quality options from embedded video data
- **Facebook:** Uses quality-based selectors (`bestvideo[height>=1080]`)
- **Direct:** Accepts any URL, passes directly to yt-dlp

---

## 5. Client (Frontend) Files

### 💻 `/client/src/index.js` - React Entry Point

```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Key Concept:** This is the first file that runs. It mounts the `<App />` component into the HTML `<div id="root">`.

---

### 💻 `/client/src/App.js` - Main Application Router

```javascript
function App() {
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  // null | 'youtube' | 'facebook' | 'instagram' | 'tiktok' | 'twitter' | 'direct'

  const handleBackToSelector = () => setSelectedPlatform(null);

  // Landing Page (no platform selected)
  if (!selectedPlatform) {
    return <PlatformSelector onSelectPlatform={setSelectedPlatform} />;
  }

  // Platform-specific page
  if (selectedPlatform === 'youtube') {
    return (
      <div className="app-container">
        <button onClick={handleBackToSelector}>← All Platforms</button>
        <VideoDownloader />
      </div>
    );
  }

  if (selectedPlatform === 'facebook') {
    return <FacebookDownloader />;
  }
  
  // ... similar for instagram, tiktok, twitter, direct
}
```

**Key Concept:** Simple state-based routing. `selectedPlatform` determines which component to render.

---

### 💻 `/client/src/components/PlatformSelector.js` - Landing Page

```javascript
const PlatformSelector = ({ onSelectPlatform }) => {
  const [activeIndex, setActiveIndex] = useState(0);  // Currently focused card
  
  // Platform data
  const platforms = [
    {
      id: 'youtube',
      name: 'YouTube',
      icon: <svg>...</svg>,
      color: '#FF0000',
      gradient: 'linear-gradient(135deg, #FF0000 0%, #CC0000 100%)',
      description: 'Download videos, shorts & music',
      features: ['4K/8K Quality', 'Audio Only', 'Subtitles']
    },
    // ... facebook, instagram, tiktok, twitter, direct
  ];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'Enter') onSelectPlatform(platforms[activeIndex].id);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex]);

  // Touch/drag support for mobile
  const handleDragStart = (e) => { /* ... */ };
  const handleDragMove = (e) => { /* ... */ };
  const handleDragEnd = () => { /* ... */ };

  // Carousel card positioning (center-focused with blur on sides)
  const getCardStyle = (index) => {
    let diff = index - activeIndex;
    const isCenter = diff === 0;
    const isAdjacent = Math.abs(diff) === 1;
    
    return {
      transform: `translateX(${diff * 280}px) scale(${isCenter ? 1 : 0.85})`,
      opacity: isCenter ? 1 : 0.6,
      filter: isCenter ? 'none' : 'blur(2px)',
      zIndex: isCenter ? 10 : 5
    };
  };

  return (
    <div className="carousel-container">
      {platforms.map((platform, index) => (
        <div 
          key={platform.id}
          style={getCardStyle(index)}
          onClick={() => onSelectPlatform(platform.id)}
        >
          {platform.icon}
          <h3>{platform.name}</h3>
          <p>{platform.description}</p>
        </div>
      ))}
    </div>
  );
};
```

**Key Concepts:**
- Netflix-style carousel with center-focused cards
- Cards on the sides are scaled down, blurred, and semi-transparent
- Supports keyboard (← →), touch swipe, and click navigation

---

### 💻 `/client/src/components/VideoDownloader.js` - YouTube Downloader

This is the most complex frontend component (~1400 lines). Key sections:

```javascript
const VideoDownloader = () => {
  // ═══ State Management ═══
  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStage, setDownloadStage] = useState('');
  const [activeTab, setActiveTab] = useState('video');  // 'video' or 'audio'
  
  // Options
  const [convertToMp3, setConvertToMp3] = useState(false);
  const [mp3Bitrate, setMp3Bitrate] = useState(192);
  const [autoMerge, setAutoMerge] = useState(true);
  
  const eventSourceRef = useRef(null);  // SSE connection

  // ═══ Server Health Check (on mount) ═══
  useEffect(() => {
    const checkHealth = async () => {
      const response = await axios.get('http://localhost:5000/api/health');
      if (!response.data.cookieStatus.valid) {
        setCookieWarning('Cookies expired!');
      }
    };
    checkHealth();
  }, []);

  // ═══ Two-Step Fetching (Optimization) ═══
  const fetchMetadata = async (videoUrl) => {
    // STEP 1: Fast metadata (title, thumbnail) - 2-4 seconds
    const response = await axios.post('/api/video-metadata', { url: videoUrl });
    setVideoInfo(response.data);
  };

  const fetchFormats = async (videoUrl) => {
    // STEP 2: Get quality options (runs in background)
    const response = await axios.post('/api/video-formats', { url: videoUrl });
    setVideoInfo(prev => ({ ...prev, formats: response.data.formats }));
  };

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Fetch metadata first (instant UI update)
    await fetchMetadata(url);
    setSuccess('Video found! Loading formats...');
    
    // Fetch formats in background (don't await)
    fetchFormats(url);
    
    setLoading(false);
  };

  // ═══ Download with Real-Time Progress ═══
  const handleDownload = async () => {
    setDownloading(true);
    
    // Start download
    const response = await axios.post('/api/download-start', {
      url,
      formatId: selectedFormat.formatId,
      convertToMp3,
      mp3Bitrate,
      mergeAudio: autoMerge
    });
    
    const { downloadId } = response.data;
    
    // Connect to Server-Sent Events for real-time progress
    const eventSource = new EventSource(`/api/download-progress/${downloadId}`);
    eventSourceRef.current = eventSource;
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.status === 'downloading') {
        setDownloadProgress(data.progress);    // 0-100
        setDownloadStage(data.stage);          // "Downloading video..."
      } else if (data.status === 'completed') {
        eventSource.close();
        
        // Trigger browser download
        const link = document.createElement('a');
        link.href = `/api/download-file/${downloadId}`;
        link.click();
        
        setSuccess('Download complete!');
        setDownloading(false);
      } else if (data.status === 'error') {
        setError(data.message);
        setDownloading(false);
      }
    };
  };

  // ═══ Cleanup on unmount ═══
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // ═══ UI Render ═══
  return (
    <div>
      {/* URL Input Form */}
      {/* Video Preview Card (thumbnail, title, duration) */}
      {/* Format Selection Tabs (Video | Audio) */}
      {/* Format Cards (1080p, 720p, etc.) */}
      {/* Options (Auto-merge, Convert to MP3) */}
      {/* Download Button with Progress Bar */}
    </div>
  );
};
```

**Key Concepts:**
1. **Two-Step Fetching:** Metadata loads in 2-4 seconds (instant UI), formats load in background
2. **Server-Sent Events (SSE):** Real-time progress updates without polling
3. **Auto-Merge:** When downloading video-only streams, automatically downloads audio and merges

---

### 💻 Other Downloader Components

All platform-specific downloaders follow the same pattern:

```javascript
// Pattern for all downloaders:
const [Platform]Downloader = () => {
  // 1. State: url, videoInfo, loading, downloading, progress
  // 2. Health check on mount
  // 3. URL validation (platform-specific regex)
  // 4. handleUrlSubmit → POST /api/[platform]/video-info
  // 5. handleDownload → POST /api/[platform]/download-start
  // 6. SSE progress → GET /api/download-progress/:id
  // 7. File download → GET /api/download-file/:id
};
```

**Platform-specific differences:**

| Component | Special Features |
|-----------|------------------|
| `FacebookDownloader.js` | Quality selector (HD/SD), private video handling |
| `InstagramDownloader.js` | Reel/Post/IGTV detection, fallback thumbnail |
| `TikTokDownloader.js` | "Remove Watermark" toggle option |
| `TwitterDownloader.js` | Tweet metadata (likes, retweets), quality picker |
| `DirectDownloader.js` | Custom filename input, no video preview |

---

## 6. Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                                 │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. User pastes URL                                                  │
│     │                                                                │
│     ▼                                                                │
│  ┌─────────────────────┐                                             │
│  │   PlatformSelector  │  (if no platform selected)                  │
│  │   ← → Enter         │                                             │
│  └─────────────────────┘                                             │
│     │ click                                                          │
│     ▼                                                                │
│  ┌─────────────────────┐         ┌─────────────────────┐             │
│  │  VideoDownloader    │  POST   │     Express API     │             │
│  │  (or other)         │ ──────► │  /api/video-info    │             │
│  │                     │         │                     │             │
│  │  2. Loading...      │ ◄────── │  { title, formats } │             │
│  │                     │  JSON   │                     │             │
│  │  3. Select Quality  │         │                     │             │
│  │                     │         │                     │             │
│  │  4. Click Download  │ ──────► │  /api/download-start│             │
│  │                     │  POST   │  returns downloadId │             │
│  │                     │         │                     │             │
│  │  5. Progress: 45%   │ ◄────── │  SSE: { progress }  │             │
│  │     [████████░░░░░] │  SSE    │                     │             │
│  │                     │         │                     │             │
│  │  6. Download File   │ ◄────── │  /download-file/:id │             │
│  └─────────────────────┘  Binary │  (streams file)     │             │
│                                  └─────────────────────┘             │
└──────────────────────────────────────────────────────────────────────┘
                                          │
                                          │ yt-dlp command
                                          ▼
                              ┌───────────────────────┐
                              │    yt-dlp Process     │
                              │                       │
                              │  - Download video     │
                              │  - Download audio     │
                              │  - FFmpeg merge       │
                              │  - Save to /downloads │
                              └───────────────────────┘
                                          │
                                          ▼
                              ┌───────────────────────┐
                              │  YouTube / Facebook   │
                              │  Instagram / TikTok   │
                              │  Twitter / Direct     │
                              └───────────────────────┘
```

---

## 7. Key Concepts

### 🔑 Server-Sent Events (SSE)

Unlike WebSockets (bidirectional), SSE is one-way (server → client). Perfect for progress updates.

```javascript
// Server
res.setHeader('Content-Type', 'text/event-stream');
res.write(`data: ${JSON.stringify({ progress: 50 })}\n\n`);

// Client
const eventSource = new EventSource('/api/progress/123');
eventSource.onmessage = (e) => console.log(JSON.parse(e.data).progress);
```

### 🔑 yt-dlp Format Selection

```javascript
// Quality-based selector (recommended)
'bestvideo[height<=1080]+bestaudio/best'
//      ↑ video up to 1080p  ↑ best audio  ↑ fallback

// Specific format ID (fragile, can change)
'137'  // Not recommended - format IDs vary by video
```

### 🔑 FFmpeg Merge (No Re-encoding)

```javascript
ffmpeg()
  .input('video.mp4')
  .input('audio.m4a')
  .outputOptions([
    '-c:v copy',        // Copy video codec (fast)
    '-c:a aac',         // Convert audio to AAC
    '-movflags +faststart'  // Web optimization
  ])
  .output('merged.mp4')
  .run();
```

### 🔑 Cookies for Authentication

Cookies are exported from your browser (Netscape format) to access:
- Age-restricted videos
- Private videos
- Premium content

```
# cookies.txt format:
.youtube.com  TRUE  /  TRUE  1699999999  LOGIN_INFO  AFmmF2swR...
.youtube.com  TRUE  /  TRUE  1699999999  SID         FgjKz2gH...
```

---

## 📝 Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 19 | User interface |
| **Styling** | CSS (glassmorphism) | Visual design |
| **HTTP Client** | Axios | API requests |
| **Backend** | Express.js | REST API server |
| **Downloader** | yt-dlp | Extract video URLs |
| **Video Processing** | FFmpeg | Merge, convert |
| **Progress** | SSE | Real-time updates |
| **Auth** | cookies.txt | Private videos |

---

**Happy coding! 🚀**

*If you have questions, check the specific file sections referenced above.*
