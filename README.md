# 🎥 YouTube Video Downloader

A modern, powerful YouTube video downloader with real-time progress tracking, automatic video+audio merging, and MP3 conversion - built with React, Node.js, yt-dlp, and FFmpeg.

## ✨ Features

### 🚀 Core Features
- ⚡ **Lightning-Fast Loading** - Two-step fetching: Instant metadata, lazy format loading in background
- 🎯 **Smart Format Filtering** - Aggressive filtering keeps only top 5 video + top 3 audio formats
- 🍪 **Cookie Authentication** - Bypass YouTube restrictions with cookie support
- � **Parallel Downloads** - Video + Audio download simultaneously (30-50% faster!)
- ⚡ **Multi-Threaded Downloads** - Optional aria2c support with 16 connections
- 📺 **Smart Format Selection** - Separate tabs for Video and Audio downloads
- 🎵 **Audio Extraction** - Download high-quality audio in multiple formats
- 🎬 **Multiple Video Qualities** - Choose from 360p to 4K resolutions
- 📊 **Real-Time Progress Bar** - Watch your download progress live with Server-Sent Events (SSE)
- 🔀 **Optimized Merging** - FFmpeg stream copy (no re-encoding) for instant merging
- 🎧 **MP3 Conversion** - Convert audio to MP3 with selectable bitrate (128/192/256/320 kbps)

### 🎨 UI Features
- **Glass-Morphism Design** - Frosted glass effect with backdrop blur
- **Smooth Animations** - Polished user experience with slide-in effects
- **Responsive Layout** - Works seamlessly on desktop, tablet, and mobile
- **Smart Icons** - Color-coded icons for video (red) and audio (purple)
- **Progress Animations** - Animated progress bar with shimmer effect

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

3. **(Important)** Set up cookies for YouTube authentication - see [Cookie Setup](#-cookie-setup-important)

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

YouTube requires authentication to download most videos. Follow these steps:

### Step 1: Install Browser Extension
Install **[EditThisCookie](https://chrome.google.com/webstore/detail/editthiscookie/fngmhnnpilhplaeedifhccceomclgfbg)** in Chrome/Edge

### Step 2: Export Cookies
1. Go to **https://www.youtube.com**
2. **Log in** to your Google account
3. Click the EditThisCookie icon
4. Click **Export** (copies to clipboard)

### Step 3: Save Cookies
1. Create file: `server/cookies.json`
2. Paste the exported cookies
3. Run the converter:
```bash
cd server
node convert-cookies.js
```

### Step 4: Verify
Restart the server - you should see:
```
✅ Found cookies.txt - will use for authentication
```

> **Note:** If downloads fail with 403 errors, your cookies may have expired. Re-export them from your browser.

## 📁 Project Structure

```
YouTube Video Downloader/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── VideoDownloader.js
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.css
│   └── package.json
├── server/                 # Node.js backend
│   ├── index.js           # Express server with yt-dlp
│   ├── cookies.json       # Your YouTube cookies (create this)
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
- **yt-dlp-exec** - Reliable YouTube downloader (replaced ytdl-core)
- FFmpeg (fluent-ffmpeg + ffmpeg-static) - Video/audio processing
- CORS - Cross-origin resource sharing
- UUID - Unique download identifiers

## 📖 Usage

### 1. Enter URL
- Open the app in your browser (http://localhost:3000)
- Paste a YouTube video URL in the input field
- Click "Get Video" to fetch video information

### 2. Select Format
- Switch between **Video** and **Audio** tabs
- **Video Tab**: Shows video formats (360p, 720p, 1080p, 4K, etc.)
- **Audio Tab**: Shows audio-only formats with quality levels
- Click on your preferred format card to select it

### 3. Configure Options

**For Video:**
- **Auto-merge audio**: Enabled by default for video-only formats
- Automatically downloads the best audio and merges it with your video

**For Audio:**
- **Convert to MP3**: Enable to convert audio to MP3 format
- **Bitrate Selection**: Choose from 128, 192, 256, or 320 kbps

### 4. Download
- Click the "Download" button
- Watch the real-time progress bar
- File will automatically download when ready

## 🔧 API Endpoints

### Fast Metadata (Step 1)
**POST** `/api/video-metadata`
- Body: `{ url: string }`
- Returns: Title, thumbnail, duration, author, views
- Fast: Uses `--no-playlist` for single video only

### Lazy Formats (Step 2)
**POST** `/api/video-formats`
- Body: `{ url: string }`
- Returns: Filtered formats (top 5 video + top 3 audio)
- Uses aggressive filtering for speed

### Video Information (Legacy)
**POST** `/api/video-info`
- Body: `{ url: string }`
- Returns: Complete video details and filtered formats

### Start Download
**POST** `/api/download-start`
- Body: `{ url, formatId, convertToMp3?, mp3Bitrate?, mergeAudio? }`
- Returns: `{ downloadId, status: 'started' }`

### Download Progress (SSE)
**GET** `/api/download-progress/:downloadId`
- Returns: Server-Sent Events with progress updates

### Get Downloaded File
**GET** `/api/download-file/:downloadId`
- Returns: The processed file

## 💡 How It Works

### ⚡ Two-Step Fetching
1. **Fast Metadata**: Instantly shows video title, thumbnail, duration
2. **Lazy Formats**: Loads available formats in background
3. User sees video info immediately - no waiting!

### 🎯 Format Filtering
- YouTube returns 50+ formats
- We filter to top 5 video + top 3 audio
- Result: Faster UI, less clutter

### � Parallel Video + Audio Downloads
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

### "403 Forbidden" Error
- Make sure you've set up cookies (see Cookie Setup section)
- Re-export cookies if they've expired
- Make sure you're logged into YouTube

### Download Stuck
- Check your internet connection
- Try a different video
- Restart the server

### Formats Not Loading
- URL must be a valid YouTube video
- Playlist URLs work but only download the first video

## 📝 Changelog

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

This tool is for educational purposes only. Please respect YouTube's Terms of Service and copyright laws. Always ensure you have the right to download the content.

## 📄 License

MIT License - feel free to use and modify!
