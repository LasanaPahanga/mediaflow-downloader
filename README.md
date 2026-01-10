# 🎥 MediaFlow Downloader

A modern, powerful video downloader supporting **YouTube**, **Facebook**, and **Instagram** with real-time progress tracking, automatic video+audio merging, and MP3 conversion - built with React, Node.js, yt-dlp, and FFmpeg.

## ✨ Features

### 🌐 Multi-Platform Support
- **YouTube** - Full support with 4K downloads, MP3 conversion, and format selection
- **Facebook** - HD/SD video downloads with audio included
- **Instagram** - Reels, Posts, IGTV, and Stories downloads
- **Platform Selector** - Clean landing page to choose your platform

### 🚀 Core Features
- ⚡ **Lightning-Fast Loading** - Two-step fetching: Instant metadata, lazy format loading in background
- 🎯 **Smart Format Filtering** - Aggressive filtering keeps only top 5 video + top 3 audio formats
- 🍪 **Cookie Authentication** - Bypass restrictions and download private videos
- 🔄 **Parallel Downloads** - Video + Audio download simultaneously (30-50% faster!)
- ⚡ **Multi-Threaded Downloads** - Optional aria2c support with 16 connections
- 📺 **Smart Format Selection** - Separate tabs for Video and Audio downloads (YouTube)
- 🎵 **Audio Extraction** - Download high-quality audio in multiple formats
- 🎬 **Multiple Video Qualities** - Choose from 360p to 4K resolutions
- 📊 **Real-Time Progress Bar** - Watch your download progress live with Server-Sent Events (SSE)
- 🔀 **Optimized Merging** - FFmpeg stream copy (no re-encoding) for instant merging
- 🎧 **MP3 Conversion** - Convert audio to MP3 with selectable bitrate (128/192/256/320 kbps)

### 🎨 UI Features
- **Platform Selection** - Choose between YouTube, Facebook, or Instagram downloader
- **Glass-Morphism Design** - Frosted glass effect with backdrop blur
- **Smooth Animations** - Polished user experience with slide-in effects
- **Responsive Layout** - Works seamlessly on desktop, tablet, and mobile
- **Smart Icons** - Platform-specific branding (YouTube red, Facebook blue, Instagram gradient)
- **Progress Animations** - Animated progress bar with shimmer effect
- **Back Navigation** - Easy return to platform selector

## 🎯 Supported Platforms

### YouTube
- Standard videos (all qualities)
- Age-restricted videos (with cookies)
- Live streams (after completed)
- Multiple format options
- MP3 audio extraction

### Facebook
- Public videos
- Private/Group videos (with cookies)
- Reels
- Stories
- Watch videos
- Share links (`facebook.com/share/r/`, `fb.watch`)
- HD & SD quality options

### Instagram
- **Reels** - Short-form vertical videos
- **Posts** - Photo/video carousel posts
- **IGTV** - Long-form videos
- **Stories** - 24-hour content (with cookies)
- **Private accounts** (with cookies)
- Best quality auto-selected
- Simple one-click downloads

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- **(Optional)** [aria2c](https://aria2.github.io/) for multi-threaded downloads (30-50% faster!)

### Installation

1. Clone or download this project

2. Install dependencies for both client and server:
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

3. **(Important)** Set up cookies for authentication - see [Cookie Setup](#-cookie-setup-important)
   - Required for YouTube age-restricted videos
   - Optional for Facebook (enables private video downloads)
   - Recommended for Instagram (required for private accounts, stories)

4. Start the servers:

**Option 1: Using the batch file (Windows)**
```bash
start.bat
```

**Option 2: Manual start**
```bash
# Terminal 1 - Start server
cd server
npm start

# Terminal 2 - Start client
cd client
npm start
```

This will start:
- Backend server on `http://localhost:5000`
- Frontend React app on `http://localhost:3000`

## 🍪 Cookie Setup (Important!)

### For YouTube
YouTube requires authentication to download age-restricted videos and bypass certain restrictions.

### For Facebook
Cookies are **optional** but enable:
- Downloading private videos
- Accessing group videos
- Better reliability for restricted content

### For Instagram
Cookies are **recommended** and enable:
- Downloading from private accounts you follow
- Accessing stories
- Better reliability for all content
- Bypassing rate limits

### Setup Steps

#### Step 1: Install Browser Extension
Install **[EditThisCookie](https://chrome.google.com/webstore/detail/editthiscookie/fngmhnnpilhplaeedifhccceomclgfbg)** in Chrome/Edge

#### Step 2: Export Cookies (Choose Platform)

**For YouTube:**
1. Go to **https://www.youtube.com**
2. **Log in** to your Google account
3. Click the EditThisCookie icon
4. Click **Export** (copies to clipboard)

**For Facebook:**
1. Go to **https://www.facebook.com**
2. **Log in** to your Facebook account
3. Click the EditThisCookie icon
4. Click **Export** (copies to clipboard)

**For Instagram:**
1. Go to **https://www.instagram.com**
2. **Log in** to your Instagram account
3. Click the EditThisCookie icon
4. Click **Export** (copies to clipboard)

> **Note:** You can use the same cookies.txt for multiple platforms. Just export from each site and merge them, or use separate browser profiles.

#### Step 3: Save Cookies
1. Create file: `server/cookies.json`
2. Paste the exported cookies
3. Run the converter:
```bash
cd server
node convert-cookies.js
```

#### Step 4: Verify
Restart the server - you should see:
```
✅ Found cookies.txt - cookies are valid
```

> **Note:** If downloads fail with 403 errors or "login required" messages, your cookies may have expired. Re-export them from your browser.

## 📁 Project Structure

```
MediaFlow Downloader/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── PlatformSelector.js    # Platform selection landing
│   │   │   ├── VideoDownloader.js     # YouTube downloader
│   │   │   ├── FacebookDownloader.js  # Facebook downloader
│   │   │   └── InstagramDownloader.js # Instagram downloader
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.css
│   └── package.json
├── server/                 # Node.js backend
│   ├── index.js           # Express server with yt-dlp
│   ├── cookies.json       # Your cookies (create this)
│   ├── cookies.txt        # Auto-generated from cookies.json
│   ├── convert-cookies.js # Cookie format converter
│   ├── downloads/         # Temporary download folder
│   └── package.json
├── start.bat              # Quick start script (Windows)
└── README.md
```

## 🛠️ Tech Stack

**Frontend:**
- React.js - UI library
- Axios - HTTP client
- Lucide React - Modern icons
- Server-Sent Events (SSE) - Real-time progress updates
- Custom CSS - Glass-morphism design with animations

**Backend:**
- Node.js - Runtime environment
- Express.js - Web framework
- **yt-dlp-exec** - Universal video downloader (YouTube, Facebook, Instagram, and more)
- FFmpeg (fluent-ffmpeg + ffmpeg-static) - Video/audio processing
- CORS - Cross-origin resource sharing
- UUID - Unique download identifiers

## 📖 Usage

### 1. Select Platform
- Open the app in your browser (http://localhost:3000)
- Choose between **YouTube**, **Facebook**, or **Instagram** downloader
- Click on your preferred platform card

### 2. Enter URL
- Paste a video URL in the input field
- Click "Get Video" to fetch video information

**Supported URLs:**
- **YouTube:** `youtube.com/watch?v=...`, `youtu.be/...`
- **Facebook:** `facebook.com/watch`, `fb.watch`, `facebook.com/reel`, `facebook.com/share`

### 3. Select Format

**YouTube:**
- Switch between **Video** and **Audio** tabs
- **Video Tab**: Shows video formats (360p, 720p, 1080p, 4K, etc.)
- **Audio Tab**: Shows audio-only formats with quality levels
- Click on your preferred format card to select it

**Facebook:**
- View available qualities (SD/HD)
- Most Facebook videos include audio already
- Select your preferred quality

### 3. Configure Options

**For YouTube Video:**
- **Auto-merge audio**: Enabled by default for video-only formats
- Automatically downloads the best audio and merges it with your video

**For YouTube Audio:**
- **Convert to MP3**: Enable to convert audio to MP3 format
- **Bitrate Selection**: Choose from 128, 192, 256, or 320 kbps

**For Facebook:**
- Most videos are ready-to-download (audio included)
- Just select quality and download

### 4. Download
- Click the "Download" button
- Watch the real-time progress bar
- File will automatically download when ready

## 🔧 API Endpoints

### Platform Detection
**POST** `/api/detect-platform`
- Body: `{ url: string }`
- Returns: `{ platform: 'youtube' | 'facebook' | 'unknown', url: string }`

### YouTube Endpoints

#### Fast Metadata (Step 1)
**POST** `/api/video-metadata`
- Body: `{ url: string }`
- Returns: Title, thumbnail, duration, author, views
- Fast: Uses `--no-playlist` for single video only

#### Lazy Formats (Step 2)
**POST** `/api/video-formats`
- Body: `{ url: string }`
- Returns: Filtered formats (top 5 video + top 3 audio)
- Uses aggressive filtering for speed

#### Video Information (Legacy)
**POST** `/api/video-info`
- Body: `{ url: string }`
- Returns: Complete video details and filtered formats

### Facebook Endpoints

#### Get Facebook Video Info
**POST** `/api/facebook/video-info`
- Body: `{ url: string }`
- Returns: Title, thumbnail, duration, formats (HD/SD)
- Includes friendly error messages for private/restricted videos

#### Start Facebook Download
**POST** `/api/facebook/download-start`
- Body: `{ url, formatId, quality, estimatedSize }`
- Returns: `{ downloadId, status: 'started', platform: 'facebook' }`

### Universal Endpoints

#### Start Download
**POST** `/api/download-start`
- Body: `{ url, formatId, convertToMp3?, mp3Bitrate?, mergeAudio? }`
- Returns: `{ downloadId, status: 'started' }`

#### Download Progress (SSE)
**GET** `/api/download-progress/:downloadId`
- Returns: Server-Sent Events with progress updates
- Works for both YouTube and Facebook

#### Get Downloaded File
**GET** `/api/download-file/:downloadId`
- Returns: The processed file

#### Health Check
**GET** `/api/health`
- Returns: Server status, cookie validity, disk space, aria2c availability

## 💡 How It Works

### Platform Detection
- App automatically detects if URL is from YouTube or Facebook
- Routes to appropriate downloader component
- Unified backend API with platform-specific handlers

### ⚡ Two-Step Fetching (YouTube)
1. **Fast Metadata**: Instantly shows video title, thumbnail, duration
2. **Lazy Formats**: Loads available formats in background
3. User sees video info immediately - no waiting!

### 🎯 Format Filtering (YouTube)
- YouTube returns 50+ formats
- We filter to top 5 video + top 3 audio
- Result: Faster UI, less clutter

### 📘 Facebook Simplified Downloads
1. Facebook videos usually have audio+video combined
2. No complex merging needed
3. Simple quality selection (SD/HD)
4. Faster download process

### 🔄 Parallel Video + Audio Downloads (YouTube)
For 1080p+ videos (video-only streams):
1. **Simultaneous Downloads** - Video and audio download at the same time
2. **30-50% Faster** - Instead of sequential downloads
3. **Smart Progress** - Shows both progress indicators

### ⚡ Multi-Threaded Downloads (aria2c)
If aria2c is installed:
1. Uses **16 parallel connections** per file
2. Dramatically speeds up large file downloads
3. Works for both video and audio streams

### 🔀 Optimized FFmpeg Merging
1. Uses `-c copy` (stream copy) - **no re-encoding!**
2. Near-instant merging of video + audio
3. Only converts audio codec when needed for MP4 compatibility

### 🎧 MP3 Conversion
1. Downloads audio stream
2. FFmpeg converts to MP3
3. Applies selected bitrate
4. Outputs clean MP3 file

## ⚡ Speed Optimizations

| Optimization | Impact | Default |
|-------------|--------|---------|
| Two-Step Fetching | Instant UI feedback | ✅ Enabled |
| Parallel V+A Download | 30-50% faster | ✅ Enabled |
| aria2c Multi-Thread | 2-4x faster downloads | Optional |
| FFmpeg Stream Copy | Instant merge | ✅ Enabled |
| Format Filtering | Faster API response | ✅ Enabled |

### Installing aria2c (Recommended)
```bash
# Windows (with chocolatey)
choco install aria2

# Windows (with winget)
winget install aria2

# macOS
brew install aria2

# Linux (Ubuntu/Debian)
sudo apt install aria2
```

After installing, restart the server. You'll see:
```
✅ aria2c found - multi-threaded downloads enabled
```

## 🔧 Troubleshooting

### YouTube Issues

#### "403 Forbidden" Error
- Make sure you've set up YouTube cookies (see Cookie Setup section)
- Re-export cookies if they've expired
- Make sure you're logged into YouTube

#### Formats Not Loading
- URL must be a valid YouTube video
- Playlist URLs work but only download the first video

### Facebook Issues

#### "This video is private or requires login"
- Set up Facebook cookies to access private videos
- Make sure the video isn't restricted to specific users only

#### "Video unavailable or removed"
- The video may have been deleted
- Check if you can view it on Facebook directly

#### "Not available in your region"
- Some Facebook videos have geographical restrictions
- Try using cookies from an account in the allowed region

### General Issues

#### Download Stuck
- Check your internet connection
- Try a different video
- Restart the server

#### Low Disk Space Warning
- Free up space on your hard drive
- Downloads require extra buffer space for processing

## 📝 Changelog

### v6.0 - Instagram Support 📸
- 📸 **Instagram Downloader** - Full Instagram support added
- 🎬 **Reels & IGTV** - Download short and long-form videos
- 📱 **Posts & Stories** - Save photo/video content (cookies required for stories)
- 🎨 **Instagram Branding** - Signature gradient pink-purple theme
- 🚀 **Simplified UI** - One-click downloads, best quality auto-selected
- 🌐 **3 Platforms** - Platform selector updated for YouTube, Facebook, Instagram

### v5.0 - Multi-Platform Support 🌐
- 🎯 **Facebook Support** - Full Facebook video downloader added
- 🏠 **Platform Selector** - Landing page to choose YouTube or Facebook
- ⬅️ **Navigation** - Back button to switch between platforms
- 🔍 **URL Detection** - Auto-detect platform from URL
- 📘 **Friendly Errors** - Better error messages for private/restricted videos
- 🎨 **Platform Branding** - Color-coded UI (YouTube red, Facebook blue)

### v4.0 - Performance Boost 🚀
- ⚡ **Parallel Downloads** - Video + Audio download simultaneously
- 🚀 **aria2c Support** - Multi-threaded downloads (16 connections)
- 🔀 **FFmpeg Stream Copy** - No re-encoding, instant merge
- 📊 **Combined Progress** - Shows Video% + Audio% during parallel downloads

### v3.0 - yt-dlp Migration
- 🔄 Switched from ytdl-core to yt-dlp (more reliable)
- 🍪 Added cookie authentication support
- ⚡ Added `--no-playlist` for faster single-video fetching
- 🔧 Fixed 403 errors with proper authentication

### v2.0 - Performance Optimizations
- ⚡ Two-step fetching (instant metadata)
- 🎯 Aggressive format filtering
- 📊 Real-time progress tracking

## ⚠️ Disclaimer

This tool is for educational purposes only. Please respect YouTube's, Facebook's, and Instagram's Terms of Service and copyright laws. Always ensure you have the right to download the content. Download content for personal use only and respect content creators' rights.

## 📄 License

MIT License - feel free to use and modify!
