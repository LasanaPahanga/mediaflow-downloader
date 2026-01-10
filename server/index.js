const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const { v4: uuidv4 } = require('uuid');
const { spawn, execSync } = require('child_process');

// Use yt-dlp for reliable downloads
const ytDlp = require('yt-dlp-exec');

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

const app = express();
const PORT = process.env.PORT || 5000;

// Store active downloads for progress tracking
const activeDownloads = new Map();
const downloadReadyCallbacks = new Map();

// Check for aria2c availability for multi-threaded downloads
let hasAria2c = false;
let aria2cPath = 'aria2c';

// Check common aria2c installation paths on Windows
const userLocalAppData = process.env.LOCALAPPDATA || '';
const aria2cPaths = [
    'aria2c',
    path.join(userLocalAppData, 'Microsoft', 'WinGet', 'Links', 'aria2c.exe'),
    path.join(process.env.PROGRAMFILES || '', 'aria2', 'aria2c.exe'),
    'C:\\ProgramData\\chocolatey\\bin\\aria2c.exe',
];

// Also search in WinGet Packages folder (where winget actually installs)
try {
    const wingetPackages = path.join(userLocalAppData, 'Microsoft', 'WinGet', 'Packages');
    if (fs.existsSync(wingetPackages)) {
        const findAria2c = (dir) => {
            try {
                const items = fs.readdirSync(dir);
                for (const item of items) {
                    const fullPath = path.join(dir, item);
                    const stat = fs.statSync(fullPath);
                    if (stat.isDirectory()) {
                        const result = findAria2c(fullPath);
                        if (result) return result;
                    } else if (item === 'aria2c.exe') {
                        return fullPath;
                    }
                }
            } catch (e) {}
            return null;
        };
        const found = findAria2c(wingetPackages);
        if (found) aria2cPaths.unshift(found);
    }
} catch (e) {}

for (const p of aria2cPaths) {
    try {
        execSync(`"${p}" --version`, { stdio: 'ignore' });
        hasAria2c = true;
        aria2cPath = p;
        console.log(`✅ aria2c found at: ${p.length > 50 ? '...' + p.slice(-47) : p}`);
        console.log('   Multi-threaded downloads enabled (16 connections)');
        break;
    } catch {
        // Try next path
    }
}

if (!hasAria2c) {
    console.log('📝 aria2c not found - using standard downloads (install aria2c for faster downloads)');
    console.log('   Run: winget install aria2.aria2');
    console.log('   Then restart your terminal and the server');
}

// Middleware
app.use(cors());
app.use(express.json());

// Create downloads directory if it doesn't exist
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir);
}

// Check if cookies file exists
const cookiesPath = path.join(__dirname, 'cookies.txt');
let hasCookies = fs.existsSync(cookiesPath);
let cookieStatus = { valid: false, message: '', expiringSoon: false };

// 🍪 Cookie Health Check Function
const checkCookieHealth = () => {
    if (!fs.existsSync(cookiesPath)) {
        cookieStatus = { valid: false, message: 'No cookies.txt found', expiringSoon: false };
        return cookieStatus;
    }
    
    try {
        const cookieContent = fs.readFileSync(cookiesPath, 'utf8');
        const lines = cookieContent.split('\n').filter(line => !line.startsWith('#') && line.trim());
        
        if (lines.length === 0) {
            cookieStatus = { valid: false, message: 'cookies.txt is empty', expiringSoon: false };
            return cookieStatus;
        }
        
        // Check for important YouTube cookies
        const hasLoginCookie = cookieContent.includes('LOGIN_INFO') || cookieContent.includes('SID');
        const hasSessionCookie = cookieContent.includes('SSID') || cookieContent.includes('HSID');
        
        // Important authentication cookies to check for expiry
        // Ignore trivial cookies like GPS, PREF, NID that don't affect authentication
        const importantCookieNames = [
            'LOGIN_INFO', 'SID', 'SSID', 'HSID', 'APISID', 'SAPISID',
            '__Secure-1PSID', '__Secure-3PSID', '__Secure-1PAPISID', '__Secure-3PAPISID',
            'sessionid', 'csrftoken', 'ds_user_id' // Instagram
        ];
        
        // Check cookie expiry dates (only for important cookies)
        const now = Math.floor(Date.now() / 1000);
        const oneDayFromNow = now + 86400;
        const oneWeekFromNow = now + 604800;
        let hasExpiredImportant = false;
        let expiringSoon = false;
        let earliestExpiry = Infinity;
        let expiredCookieName = '';
        
        for (const line of lines) {
            const parts = line.split('\t');
            if (parts.length >= 7) {
                const cookieName = parts[5]; // Cookie name is at index 5 in Netscape format
                const expiry = parseInt(parts[4], 10);
                const isImportant = importantCookieNames.some(name => cookieName.includes(name));
                
                if (!isNaN(expiry) && expiry > 0) {
                    if (expiry < now && isImportant) {
                        hasExpiredImportant = true;
                        expiredCookieName = cookieName;
                    } else if (expiry < oneWeekFromNow && isImportant) {
                        expiringSoon = true;
                        earliestExpiry = Math.min(earliestExpiry, expiry);
                    }
                }
            }
        }
        
        if (hasExpiredImportant) {
            cookieStatus = { 
                valid: false, 
                message: `Important cookie expired (${expiredCookieName}). Please re-export from browser.`, 
                expiringSoon: false 
            };
        } else if (!hasLoginCookie && !hasSessionCookie) {
            cookieStatus = { 
                valid: false, 
                message: 'Missing YouTube login cookies. Make sure you are logged in when exporting.', 
                expiringSoon: false 
            };
        } else if (expiringSoon) {
            const daysLeft = Math.ceil((earliestExpiry - now) / 86400);
            cookieStatus = { 
                valid: true, 
                message: `Cookies will expire in ${daysLeft} day(s). Consider refreshing soon.`, 
                expiringSoon: true 
            };
        } else {
            cookieStatus = { 
                valid: true, 
                message: 'Cookies are valid', 
                expiringSoon: false 
            };
        }
        
        return cookieStatus;
    } catch (error) {
        cookieStatus = { valid: false, message: `Error reading cookies: ${error.message}`, expiringSoon: false };
        return cookieStatus;
    }
};

// 💾 Disk Space Check Function
const checkDiskSpace = async (requiredBytes = 0) => {
    try {
        // Get disk space for the downloads directory
        const driveLetter = downloadsDir.charAt(0).toUpperCase();
        
        if (process.platform === 'win32') {
            // Windows: Use wmic or PowerShell
            const result = execSync(
                `powershell -command "(Get-PSDrive ${driveLetter}).Free"`,
                { encoding: 'utf8', timeout: 5000 }
            ).trim();
            
            const freeBytes = parseInt(result, 10);
            const freeGB = (freeBytes / (1024 * 1024 * 1024)).toFixed(2);
            const requiredGB = (requiredBytes / (1024 * 1024 * 1024)).toFixed(2);
            
            // Warn if less than 1GB free or less than required + 500MB buffer
            const minRequired = Math.max(1024 * 1024 * 1024, requiredBytes + 500 * 1024 * 1024);
            
            return {
                freeBytes,
                freeGB: parseFloat(freeGB),
                sufficient: freeBytes >= minRequired,
                message: freeBytes < minRequired 
                    ? `Low disk space: ${freeGB}GB free. Need at least ${(minRequired / (1024 * 1024 * 1024)).toFixed(2)}GB.`
                    : `${freeGB}GB available`
            };
        } else {
            // Unix-like: Use df
            const result = execSync(`df -B1 "${downloadsDir}" | tail -1 | awk '{print $4}'`, { encoding: 'utf8' }).trim();
            const freeBytes = parseInt(result, 10);
            const freeGB = (freeBytes / (1024 * 1024 * 1024)).toFixed(2);
            
            const minRequired = Math.max(1024 * 1024 * 1024, requiredBytes + 500 * 1024 * 1024);
            
            return {
                freeBytes,
                freeGB: parseFloat(freeGB),
                sufficient: freeBytes >= minRequired,
                message: freeBytes < minRequired 
                    ? `Low disk space: ${freeGB}GB free`
                    : `${freeGB}GB available`
            };
        }
    } catch (error) {
        console.error('Disk space check error:', error.message);
        return { freeBytes: 0, freeGB: 0, sufficient: true, message: 'Unable to check disk space' };
    }
};

// Initial cookie check at startup
cookieStatus = checkCookieHealth();
hasCookies = cookieStatus.valid;

if (cookieStatus.valid) {
    if (cookieStatus.expiringSoon) {
        console.log(`⚠️  ${cookieStatus.message}`);
    } else {
        console.log('✅ Found cookies.txt - cookies are valid');
    }
} else {
    console.log(`❌ Cookie issue: ${cookieStatus.message}`);
}

// Check disk space at startup
checkDiskSpace().then(diskInfo => {
    if (!diskInfo.sufficient) {
        console.log(`⚠️  ${diskInfo.message}`);
    } else {
        console.log(`💾 Disk space: ${diskInfo.freeGB}GB available`);
    }
});

// Cleanup old files (files older than 1 hour)
const cleanupOldFiles = () => {
    try {
        const files = fs.readdirSync(downloadsDir);
        const now = Date.now();
        files.forEach(file => {
            const filePath = path.join(downloadsDir, file);
            const stats = fs.statSync(filePath);
            if (now - stats.mtimeMs > 3600000) {
                fs.unlinkSync(filePath);
            }
        });
    } catch (error) {
        console.error('Cleanup error:', error);
    }
};
setInterval(cleanupOldFiles, 1800000);

// Health check
app.get('/api/health', async (req, res) => {
    const diskInfo = await checkDiskSpace();
    const freshCookieStatus = checkCookieHealth();
    
    res.json({ 
        status: 'Server is running!', 
        ffmpeg: !!ffmpegStatic, 
        hasCookies: freshCookieStatus.valid,
        cookieStatus: freshCookieStatus,
        diskSpace: diskInfo,
        aria2c: hasAria2c
    });
});

// 🚀 STEP 1: Fast Metadata Fetch
app.post('/api/video-metadata', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: 'URL is required' });

        console.log('Fetching metadata for:', url);
        
        const options = {
            dumpSingleJson: true,
            noCheckCertificates: true,
            noWarnings: true,
            skipDownload: true,
            noPlaylist: true,  // 🔧 FIX: Only fetch single video, not playlist
            playlistItems: '1', // 🔧 FIX: Only first item if playlist
        };
        
        if (hasCookies) options.cookies = cookiesPath;

        const info = await ytDlp(url, options);
        
        console.log('✅ Got metadata for:', info.title);

        res.json({
            title: info.title,
            thumbnail: info.thumbnail,
            duration: info.duration,
            author: info.uploader || info.channel,
            viewCount: info.view_count,
            isLive: info.is_live
        });
    } catch (error) {
        console.error('Metadata error:', error.message);
        res.status(500).json({ error: 'Failed to fetch video metadata' });
    }
});

// 🚀 STEP 2: Get Formats
app.post('/api/video-formats', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: 'URL is required' });

        console.log('Fetching formats for:', url);

        const options = {
            dumpSingleJson: true,
            noCheckCertificates: true,
            noWarnings: true,
            skipDownload: true,
            noPlaylist: true,  // 🔧 FIX: Only fetch single video
            playlistItems: '1',
        };
        
        if (hasCookies) options.cookies = cookiesPath;

        const info = await ytDlp(url, options);

        // Filter and format the formats
        const formats = [];
        const seenQualities = new Set();

        // Process formats - video
        if (info.formats) {
            // Get video formats
            const videoFormats = info.formats
                .filter(f => f.vcodec !== 'none' && f.height)
                .sort((a, b) => (b.height || 0) - (a.height || 0));

            for (const f of videoFormats) {
                const quality = `${f.height}p`;
                if (!seenQualities.has(quality) && seenQualities.size < 5) {
                    seenQualities.add(quality);
                    formats.push({
                        formatId: f.format_id,
                        quality: quality,
                        container: f.ext,
                        hasVideo: true,
                        hasAudio: f.acodec !== 'none',
                        filesize: f.filesize || f.filesize_approx,
                        type: 'video',
                        fps: f.fps,
                        vcodec: f.vcodec,
                        acodec: f.acodec
                    });
                }
            }

            // Get audio formats - improved detection
            const audioFormats = info.formats
                .filter(f => {
                    // Audio-only: has audio codec but no video codec
                    const hasAudio = f.acodec && f.acodec !== 'none';
                    const hasNoVideo = !f.vcodec || f.vcodec === 'none' || !f.height;
                    return hasAudio && hasNoVideo;
                })
                .sort((a, b) => (b.abr || b.tbr || 0) - (a.abr || a.tbr || 0));

            console.log(`Found ${audioFormats.length} audio-only formats`);

            const seenAudio = new Set();
            for (const f of audioFormats) {
                const bitrate = f.abr || f.tbr || 0;
                const quality = bitrate ? `${Math.round(bitrate)}kbps` : 'audio';
                if (!seenAudio.has(quality) && seenAudio.size < 5) {
                    seenAudio.add(quality);
                    formats.push({
                        formatId: f.format_id,
                        quality: quality,
                        container: f.ext,
                        hasVideo: false,
                        hasAudio: true,
                        filesize: f.filesize || f.filesize_approx,
                        type: 'audio',
                        abr: f.abr || f.tbr,
                        acodec: f.acodec
                    });
                }
            }
        }

        console.log(`✅ Found ${formats.length} formats`);

        res.json({
            formats,
            bestAudioFormat: formats.find(f => !f.hasVideo && f.hasAudio)?.formatId
        });
    } catch (error) {
        console.error('Formats error:', error.message);
        res.status(500).json({ error: 'Failed to fetch formats' });
    }
});

// Legacy endpoint for compatibility
app.post('/api/video-info', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: 'URL is required' });

        const options = {
            dumpSingleJson: true,
            noCheckCertificates: true,
            noWarnings: true,
            skipDownload: true,
            noPlaylist: true,  // 🔧 FIX: Only single video
            playlistItems: '1',
        };
        
        if (hasCookies) options.cookies = cookiesPath;

        const info = await ytDlp(url, options);

        // Filter formats
        const formats = [];
        const seenQualities = new Set();

        if (info.formats) {
            const videoFormats = info.formats
                .filter(f => f.vcodec !== 'none' && f.height)
                .sort((a, b) => (b.height || 0) - (a.height || 0));

            for (const f of videoFormats) {
                const quality = `${f.height}p`;
                if (!seenQualities.has(quality) && seenQualities.size < 5) {
                    seenQualities.add(quality);
                    formats.push({
                        formatId: f.format_id,
                        itag: f.format_id, // compatibility
                        quality: quality,
                        container: f.ext,
                        hasVideo: true,
                        hasAudio: f.acodec !== 'none',
                        filesize: f.filesize || f.filesize_approx,
                        type: 'video',
                    });
                }
            }

            const audioFormats = info.formats
                .filter(f => {
                    const hasAudio = f.acodec && f.acodec !== 'none';
                    const hasNoVideo = !f.vcodec || f.vcodec === 'none' || !f.height;
                    return hasAudio && hasNoVideo;
                })
                .sort((a, b) => (b.abr || b.tbr || 0) - (a.abr || a.tbr || 0));

            const seenAudio = new Set();
            for (const f of audioFormats) {
                const bitrate = f.abr || f.tbr || 0;
                const quality = bitrate ? `${Math.round(bitrate)}kbps` : 'audio';
                if (!seenAudio.has(quality) && seenAudio.size < 5) {
                    seenAudio.add(quality);
                    formats.push({
                        formatId: f.format_id,
                        itag: f.format_id,
                        quality: quality,
                        audioQuality: quality,
                        container: f.ext,
                        hasVideo: false,
                        hasAudio: true,
                        filesize: f.filesize || f.filesize_approx,
                        type: 'audio',
                        audioBitrate: f.abr || f.tbr
                    });
                }
            }
        }

        res.json({
            title: info.title,
            thumbnail: info.thumbnail,
            duration: info.duration,
            author: info.uploader || info.channel,
            viewCount: info.view_count,
            formats,
            bestAudioItag: formats.find(f => !f.hasVideo)?.formatId
        });
    } catch (error) {
        console.error('Video info error:', error.message);
        res.status(500).json({ error: 'Failed to fetch video info' });
    }
});

// SSE endpoint for download progress
app.get('/api/download-progress/:downloadId', (req, res) => {
    const { downloadId } = req.params;
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    res.write(`data: ${JSON.stringify({ status: 'connected', downloadId })}\n\n`);
    activeDownloads.set(downloadId, res);
    
    const callback = downloadReadyCallbacks.get(downloadId);
    if (callback) {
        callback();
        downloadReadyCallbacks.delete(downloadId);
    }

    req.on('close', () => {
        activeDownloads.delete(downloadId);
        downloadReadyCallbacks.delete(downloadId);
    });
});

const sendProgress = (downloadId, data) => {
    const res = activeDownloads.get(downloadId);
    if (res) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
};

// Start download with yt-dlp
app.post('/api/download-start', async (req, res) => {
    try {
        const { url, itag, formatId, convertToMp3, mp3Bitrate, mergeAudio, estimatedSize } = req.body;
        const downloadId = uuidv4();
        const format = formatId || itag;

        if (!url || !format) {
            return res.status(400).json({ error: 'URL and format are required' });
        }

        // 💾 Check disk space before starting download
        const diskInfo = await checkDiskSpace(estimatedSize || 500 * 1024 * 1024); // Default 500MB estimate
        if (!diskInfo.sufficient) {
            return res.status(507).json({ 
                error: 'Insufficient disk space', 
                message: diskInfo.message,
                freeGB: diskInfo.freeGB
            });
        }

        // 🍪 Check cookie health before download
        const freshCookieStatus = checkCookieHealth();
        if (!freshCookieStatus.valid) {
            console.warn('⚠️ Cookie warning:', freshCookieStatus.message);
        }

        res.json({ downloadId, status: 'started', diskSpace: diskInfo });

        // Wait for SSE connection
        await new Promise((resolve) => {
            if (activeDownloads.has(downloadId)) {
                resolve();
                return;
            }
            const timeout = setTimeout(() => {
                downloadReadyCallbacks.delete(downloadId);
                resolve();
            }, 5000);
            
            downloadReadyCallbacks.set(downloadId, () => {
                clearTimeout(timeout);
                resolve();
            });
        });

        await new Promise(r => setTimeout(r, 100));

        // Process download
        processDownload(downloadId, url, format, convertToMp3, mp3Bitrate, mergeAudio);

    } catch (error) {
        console.error('Download start error:', error);
        res.status(500).json({ error: 'Failed to start download' });
    }
});

async function processDownload(downloadId, url, format, convertToMp3, mp3Bitrate = 192, mergeAudio = false) {
    try {
        sendProgress(downloadId, { status: 'downloading', progress: 0, stage: 'Preparing download...' });

        // Get video info first - with noPlaylist for speed
        const infoOptions = { 
            dumpSingleJson: true, 
            noWarnings: true,
            noPlaylist: true,
            playlistItems: '1'
        };
        if (hasCookies) infoOptions.cookies = cookiesPath;
        
        const info = await ytDlp(url, infoOptions);
        const title = info.title.replace(/[^\w\s-]/gi, '').replace(/\s+/g, '_').substring(0, 100);
        
        // Determine output file
        let outputFilename;
        let outputPath;
        
        // Check if format is video or audio
        const selectedFormat = info.formats.find(f => f.format_id === format);
        const isAudioOnly = selectedFormat && selectedFormat.vcodec === 'none';
        const isVideoOnly = selectedFormat && selectedFormat.acodec === 'none';

        if (convertToMp3 && isAudioOnly) {
            // Audio-only download with MP3 conversion
            outputFilename = `${title}.mp3`;
            outputPath = path.join(downloadsDir, `${downloadId}_${outputFilename}`);
            await downloadWithYtDlp(downloadId, url, format, outputPath, 'mp3', mp3Bitrate);
        } else if (mergeAudio && isVideoOnly) {
            // 🚀 OPTIMIZED: Parallel video+audio download with streaming merge
            outputFilename = `${title}.mp4`;
            outputPath = path.join(downloadsDir, `${downloadId}_${outputFilename}`);
            await downloadParallelMerge(downloadId, url, format, outputPath, info);
        } else {
            // Single stream download (has both video+audio or audio only)
            const ext = selectedFormat?.ext || 'mp4';
            outputFilename = `${title}.${ext}`;
            outputPath = path.join(downloadsDir, `${downloadId}_${outputFilename}`);
            await downloadWithYtDlp(downloadId, url, format, outputPath);
        }

        sendProgress(downloadId, { 
            status: 'completed', 
            filename: outputFilename,
            downloadId: downloadId
        });

    } catch (error) {
        console.error('Download processing error:', error);
        sendProgress(downloadId, { status: 'error', message: error.message || 'Download failed' });
    }
}

// 🚀 PARALLEL VIDEO + AUDIO DOWNLOAD WITH STREAMING MERGE
async function downloadParallelMerge(downloadId, url, videoFormat, outputPath, info) {
    return new Promise(async (resolve, reject) => {
        const ytDlpExec = require('yt-dlp-exec');
        
        // Find best audio format
        const audioFormats = info.formats
            .filter(f => f.vcodec === 'none' && f.acodec !== 'none')
            .sort((a, b) => (b.abr || 0) - (a.abr || 0));
        
        const bestAudio = audioFormats[0];
        if (!bestAudio) {
            // Fallback to yt-dlp's automatic selection
            return downloadWithYtDlp(downloadId, url, `${videoFormat}+bestaudio`, outputPath, 'mp4')
                .then(resolve).catch(reject);
        }

        const videoPath = path.join(downloadsDir, `${downloadId}_video_temp.mp4`);
        const audioPath = path.join(downloadsDir, `${downloadId}_audio_temp.m4a`);

        console.log(`🚀 Starting PARALLEL download: Video(${videoFormat}) + Audio(${bestAudio.format_id})`);
        sendProgress(downloadId, { status: 'downloading', progress: 5, stage: '⚡ Parallel download starting...' });

        // Build base options with optional aria2c for multi-threaded downloads
        const baseOptions = {
            noWarnings: true,
            noCheckCertificates: true,
            noPlaylist: true,
        };
        
        if (hasCookies) baseOptions.cookies = cookiesPath;
        
        // 🚀 Use aria2c for multi-threaded downloads if available
        if (hasAria2c) {
            baseOptions.externalDownloader = aria2cPath;
            // Fixed: proper argument format for yt-dlp external downloader
            baseOptions.externalDownloaderArgs = '-x 16 -s 16 -k 1M --file-allocation=none';
            console.log('⚡ Using aria2c with 16 connections for faster download');
        }

        // Track progress for both downloads
        let videoProgress = 0;
        let audioProgress = 0;
        let videoComplete = false;
        let audioComplete = false;

        const updateCombinedProgress = () => {
            // Video is ~80% of total, audio ~20%
            const combined = Math.round((videoProgress * 0.7) + (audioProgress * 0.2));
            sendProgress(downloadId, { 
                status: 'downloading', 
                progress: Math.min(combined, 90), 
                stage: `⚡ Parallel: Video ${Math.round(videoProgress)}% | Audio ${Math.round(audioProgress)}%` 
            });
        };

        // Progress simulation intervals
        const videoProgressInterval = setInterval(() => {
            if (!videoComplete) {
                videoProgress = Math.min(videoProgress + Math.random() * 10, 95);
                updateCombinedProgress();
            }
        }, 600);

        const audioProgressInterval = setInterval(() => {
            if (!audioComplete) {
                audioProgress = Math.min(audioProgress + Math.random() * 15, 95);
                updateCombinedProgress();
            }
        }, 500);

        try {
            // 🚀 PARALLEL DOWNLOADS - Start both simultaneously!
            const videoPromise = ytDlpExec.exec(url, {
                ...baseOptions,
                format: videoFormat,
                output: videoPath,
            }).then(() => {
                videoComplete = true;
                videoProgress = 100;
                console.log('✅ Video download complete');
            });

            const audioPromise = ytDlpExec.exec(url, {
                ...baseOptions,
                format: bestAudio.format_id,
                output: audioPath,
            }).then(() => {
                audioComplete = true;
                audioProgress = 100;
                console.log('✅ Audio download complete');
            });

            // Wait for BOTH to complete in parallel
            await Promise.all([videoPromise, audioPromise]);
            
            clearInterval(videoProgressInterval);
            clearInterval(audioProgressInterval);

            sendProgress(downloadId, { status: 'processing', progress: 92, stage: '🔀 Merging video + audio...' });

            // 🚀 OPTIMIZED FFmpeg merge with -c copy (no re-encoding!)
            await new Promise((mergeResolve, mergeReject) => {
                ffmpeg()
                    .input(videoPath)
                    .input(audioPath)
                    .outputOptions([
                        '-c:v copy',     // No video re-encoding
                        '-c:a aac',      // Convert audio to AAC for MP4 compatibility
                        '-b:a 192k',     // Audio bitrate
                        '-movflags +faststart', // Web optimization
                        '-y'             // Overwrite output
                    ])
                    .output(outputPath)
                    .on('progress', (progress) => {
                        const mergeProgress = 92 + (progress.percent || 0) * 0.08;
                        sendProgress(downloadId, { 
                            status: 'processing', 
                            progress: Math.round(mergeProgress), 
                            stage: '🔀 Merging...' 
                        });
                    })
                    .on('end', () => {
                        console.log('✅ FFmpeg merge complete');
                        // Cleanup temp files
                        try {
                            if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
                            if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
                        } catch (e) { console.error('Cleanup error:', e); }
                        mergeResolve();
                    })
                    .on('error', (err) => {
                        console.error('FFmpeg merge error:', err);
                        // Cleanup temp files
                        try {
                            if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
                            if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
                        } catch (e) {}
                        mergeReject(err);
                    })
                    .run();
            });

            resolve();

        } catch (error) {
            clearInterval(videoProgressInterval);
            clearInterval(audioProgressInterval);
            
            // Cleanup temp files on error
            try {
                if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
                if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
            } catch (e) {}
            
            reject(error);
        }
    });
}

// Single stream download with optional aria2c acceleration
function downloadWithYtDlp(downloadId, url, format, outputPath, audioFormat = null, audioBitrate = null) {
    return new Promise((resolve, reject) => {
        const ytDlpExec = require('yt-dlp-exec');
        
        // Build options object
        const options = {
            format: format,
            output: outputPath,
            noWarnings: true,
            noCheckCertificates: true,
            noPlaylist: true,
            ffmpegLocation: ffmpegStatic,
        };
        
        if (hasCookies) {
            options.cookies = cookiesPath;
        }
        
        // 🚀 Use aria2c for multi-threaded downloads if available
        if (hasAria2c && !audioFormat) {
            options.externalDownloader = aria2cPath;
            // Fixed: proper argument format for yt-dlp external downloader
            options.externalDownloaderArgs = '-x 16 -s 16 -k 1M --file-allocation=none';
            console.log('⚡ Using aria2c with 16 connections');
        }
        
        if (audioFormat === 'mp3') {
            options.extractAudio = true;
            options.audioFormat = 'mp3';
            if (audioBitrate) {
                options.audioQuality = `${audioBitrate}K`;
            }
        }
        
        if (format.includes('+')) {
            options.mergeOutputFormat = 'mp4';
        }

        console.log('Running yt-dlp download with options:', JSON.stringify(options, null, 2));
        
        // Simulate progress since yt-dlp-exec doesn't provide real-time progress
        let fakeProgress = 5;
        const stage = hasAria2c ? '⚡ Multi-threaded download...' : 'Downloading...';
        sendProgress(downloadId, { status: 'downloading', progress: 5, stage });
        
        const progressInterval = setInterval(() => {
            fakeProgress += Math.random() * 5;
            if (fakeProgress >= 90) {
                fakeProgress = 90;
            }
            sendProgress(downloadId, { 
                status: 'downloading', 
                progress: Math.round(fakeProgress), 
                stage: `${stage} ${Math.round(fakeProgress)}%` 
            });
        }, 1000);

        // Add timeout for downloads (5 minutes max)
        const downloadTimeout = setTimeout(() => {
            clearInterval(progressInterval);
            console.error('Download timeout after 5 minutes');
            reject(new Error('Download timeout - please try again'));
        }, 5 * 60 * 1000);

        // Execute yt-dlp
        ytDlpExec.exec(url, options)
            .then(() => {
                clearTimeout(downloadTimeout);
                clearInterval(progressInterval);
                console.log('✅ Download completed successfully');
                sendProgress(downloadId, { status: 'processing', progress: 100, stage: 'Finalizing...' });
                resolve();
            })
            .catch((err) => {
                clearTimeout(downloadTimeout);
                clearInterval(progressInterval);
                console.error('yt-dlp error:', err.message || err);
                reject(err);
            });
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📘 FACEBOOK VIDEO DOWNLOAD API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

// Helper: Detect platform from URL
const detectPlatform = (url) => {
    if (!url) return 'unknown';
    
    const youtubePatterns = [
        /youtube\.com/i,
        /youtu\.be/i,
        /youtube-nocookie\.com/i
    ];
    
    const facebookPatterns = [
        /facebook\.com/i,
        /fb\.watch/i,
        /fb\.com/i
    ];
    
    const instagramPatterns = [
        /instagram\.com/i,
        /instagr\.am/i
    ];
    
    if (youtubePatterns.some(p => p.test(url))) return 'youtube';
    if (facebookPatterns.some(p => p.test(url))) return 'facebook';
    if (instagramPatterns.some(p => p.test(url))) return 'instagram';
    
    return 'unknown';
};

// API: Detect platform from URL
app.post('/api/detect-platform', (req, res) => {
    const { url } = req.body;
    const platform = detectPlatform(url);
    res.json({ platform, url });
});

// API: Get Facebook video info
app.post('/api/facebook/video-info', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: 'URL is required' });

        const platform = detectPlatform(url);
        if (platform !== 'facebook') {
            return res.status(400).json({ error: 'Not a valid Facebook URL' });
        }

        console.log('📘 Fetching Facebook video info:', url);

        const options = {
            dumpSingleJson: true,
            noCheckCertificates: true,
            noWarnings: true,
            skipDownload: true,
            noPlaylist: true,
        };
        
        // Use cookies if available for private videos
        if (hasCookies) options.cookies = cookiesPath;

        const info = await ytDlp(url, options);

        // Process formats - Facebook usually provides combined video+audio formats
        const formats = [];
        const seenQualities = new Set();

        if (info.formats) {
            // Sort by height (quality) descending
            const sortedFormats = info.formats
                .filter(f => f.height && f.vcodec !== 'none')
                .sort((a, b) => (b.height || 0) - (a.height || 0));

            for (const f of sortedFormats) {
                // Create quality label (HD for 720p+, SD for below)
                let qualityLabel;
                if (f.height >= 1080) {
                    qualityLabel = `${f.height}p (Full HD)`;
                } else if (f.height >= 720) {
                    qualityLabel = `${f.height}p (HD)`;
                } else if (f.height >= 480) {
                    qualityLabel = `${f.height}p (SD)`;
                } else {
                    qualityLabel = `${f.height}p`;
                }

                // Avoid duplicates based on height
                if (!seenQualities.has(f.height) && seenQualities.size < 5) {
                    seenQualities.add(f.height);
                    
                    formats.push({
                        formatId: f.format_id,
                        quality: qualityLabel,
                        height: f.height,
                        width: f.width,
                        container: f.ext || 'mp4',
                        hasVideo: true,
                        hasAudio: f.acodec !== 'none', // Facebook usually includes audio
                        filesize: f.filesize || f.filesize_approx,
                        fps: f.fps,
                        vcodec: f.vcodec,
                        acodec: f.acodec
                    });
                }
            }
        }

        // If no formats found with height, try to get any video format
        if (formats.length === 0 && info.formats) {
            const videoFormat = info.formats.find(f => f.vcodec !== 'none');
            if (videoFormat) {
                formats.push({
                    formatId: videoFormat.format_id,
                    quality: 'Best Available',
                    container: videoFormat.ext || 'mp4',
                    hasVideo: true,
                    hasAudio: videoFormat.acodec !== 'none',
                    filesize: videoFormat.filesize || videoFormat.filesize_approx,
                });
            }
        }

        console.log(`✅ Facebook video found: "${info.title}" with ${formats.length} formats`);

        res.json({
            title: info.title || 'Facebook Video',
            thumbnail: info.thumbnail,
            duration: info.duration,
            author: info.uploader || info.channel || info.creator,
            viewCount: info.view_count,
            formats,
            platform: 'facebook',
            isPrivate: info.is_unlisted || false,
            description: info.description?.substring(0, 200)
        });

    } catch (error) {
        console.error('❌ Facebook video info error:', error.message);
        
        // Handle specific Facebook errors with friendly messages
        let errorMessage = 'Failed to fetch Facebook video information';
        
        if (error.message?.includes('login') || error.message?.includes('private')) {
            errorMessage = 'This video is private or requires login';
        } else if (error.message?.includes('unavailable') || error.message?.includes('not found')) {
            errorMessage = 'Video unavailable or removed';
        } else if (error.message?.includes('region') || error.message?.includes('geo')) {
            errorMessage = 'This video is not available in your region';
        } else if (error.message?.includes('age')) {
            errorMessage = 'This video has age restrictions';
        }
        
        res.status(500).json({ error: errorMessage });
    }
});

// API: Start Facebook video download
app.post('/api/facebook/download-start', async (req, res) => {
    try {
        const { url, formatId, quality, estimatedSize } = req.body;
        const downloadId = uuidv4();

        if (!url || !formatId) {
            return res.status(400).json({ error: 'URL and format are required' });
        }

        // Check disk space
        const diskInfo = await checkDiskSpace(estimatedSize || 300 * 1024 * 1024); // Default 300MB
        if (!diskInfo.sufficient) {
            return res.status(507).json({ 
                error: 'Insufficient disk space', 
                message: diskInfo.message,
                freeGB: diskInfo.freeGB
            });
        }

        console.log(`📘 Starting Facebook download: ${quality || formatId}`);

        res.json({ downloadId, status: 'started', platform: 'facebook', diskSpace: diskInfo });

        // Wait for SSE connection
        await new Promise((resolve) => {
            if (activeDownloads.has(downloadId)) {
                resolve();
                return;
            }
            const timeout = setTimeout(() => {
                downloadReadyCallbacks.delete(downloadId);
                resolve();
            }, 5000);
            
            downloadReadyCallbacks.set(downloadId, () => {
                clearTimeout(timeout);
                resolve();
            });
        });

        await new Promise(r => setTimeout(r, 100));

        // Process Facebook download
        processFacebookDownload(downloadId, url, formatId);

    } catch (error) {
        console.error('Facebook download start error:', error);
        res.status(500).json({ error: 'Failed to start download' });
    }
});

// Process Facebook video download
async function processFacebookDownload(downloadId, url, formatId) {
    try {
        sendProgress(downloadId, { 
            status: 'downloading', 
            progress: 0, 
            stage: '📘 Starting Facebook download...' 
        });

        // Get video info first
        const infoOptions = { 
            dumpSingleJson: true, 
            noWarnings: true,
            noPlaylist: true
        };
        if (hasCookies) infoOptions.cookies = cookiesPath;
        
        const info = await ytDlp(url, infoOptions);
        const title = info.title
            ? info.title.replace(/[^\w\s-]/gi, '').replace(/\s+/g, '_').substring(0, 100)
            : 'facebook_video';
        
        const outputFilename = `${title}.mp4`;
        const outputPath = path.join(downloadsDir, `${downloadId}_${outputFilename}`);

        // Facebook downloads are usually simpler - single stream with audio+video
        await downloadFacebookVideo(downloadId, url, formatId, outputPath);

        sendProgress(downloadId, { 
            status: 'completed', 
            filename: outputFilename,
            downloadId: downloadId,
            platform: 'facebook'
        });

    } catch (error) {
        console.error('❌ Facebook download error:', error);
        sendProgress(downloadId, { 
            status: 'error', 
            message: error.message || 'Download failed' 
        });
    }
}

// Download Facebook video using yt-dlp
async function downloadFacebookVideo(downloadId, url, formatId, outputPath) {
    return new Promise((resolve, reject) => {
        const ytDlpExec = require('yt-dlp-exec');

        const options = {
            format: formatId,
            output: outputPath,
            noWarnings: true,
            noCheckCertificates: true,
            noPlaylist: true,
            // Facebook videos usually don't need merging
            mergeOutputFormat: 'mp4',
        };

        if (hasCookies) options.cookies = cookiesPath;

        // Use aria2c if available for faster downloads
        if (hasAria2c) {
            options.externalDownloader = aria2cPath;
            options.externalDownloaderArgs = '-x 16 -s 16 -k 1M --file-allocation=none';
            console.log('⚡ Using aria2c for faster Facebook download');
        }

        console.log(`📘 Downloading Facebook video: format=${formatId}`);

        let fakeProgress = 5;
        const stage = '📘 Downloading Facebook video...';

        sendProgress(downloadId, { 
            status: 'downloading', 
            progress: 5, 
            stage 
        });

        const progressInterval = setInterval(() => {
            fakeProgress += Math.random() * 8; // Facebook downloads are usually faster
            if (fakeProgress >= 95) {
                fakeProgress = 95;
            }
            sendProgress(downloadId, { 
                status: 'downloading', 
                progress: Math.round(fakeProgress), 
                stage: `${stage} ${Math.round(fakeProgress)}%` 
            });
        }, 800);

        const downloadTimeout = setTimeout(() => {
            clearInterval(progressInterval);
            console.error('Facebook download timeout');
            reject(new Error('Download timeout - please try again'));
        }, 5 * 60 * 1000);

        ytDlpExec.exec(url, options)
            .then(() => {
                clearTimeout(downloadTimeout);
                clearInterval(progressInterval);
                console.log('✅ Facebook download completed');
                sendProgress(downloadId, { 
                    status: 'processing', 
                    progress: 100, 
                    stage: '✅ Finalizing...' 
                });
                resolve();
            })
            .catch((err) => {
                clearTimeout(downloadTimeout);
                clearInterval(progressInterval);
                console.error('Facebook yt-dlp error:', err.message || err);
                reject(err);
            });
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ████████╗    ██╗███╗   ██╗███████╗████████╗ █████╗  ██████╗ ██████╗  █████╗ ███╗   ███╗
// ╚══██╔══╝    ██║████╗  ██║██╔════╝╚══██╔══╝██╔══██╗██╔════╝ ██╔══██╗██╔══██╗████╗ ████║
//    ██║       ██║██╔██╗ ██║███████╗   ██║   ███████║██║  ███╗██████╔╝███████║██╔████╔██║
//    ██║       ██║██║╚██╗██║╚════██║   ██║   ██╔══██║██║   ██║██╔══██╗██╔══██║██║╚██╔╝██║
//    ██║       ██║██║ ╚████║███████║   ██║   ██║  ██║╚██████╔╝██║  ██║██║  ██║██║ ╚═╝ ██║
//    ╚═╝       ╚═╝╚═╝  ╚═══╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝
// ═══════════════════════════════════════════════════════════════════════════════

// Instagram video info endpoint
app.post('/api/instagram/video-info', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Validate Instagram URL
        const instagramPatterns = [
            /instagram\.com\/p\//i,
            /instagram\.com\/reel\//i,
            /instagram\.com\/reels\//i,
            /instagram\.com\/tv\//i,
            /instagram\.com\/stories\//i,
            /instagr\.am\/p\//i,
            /instagr\.am\/reel\//i,
        ];

        const isValidInstagram = instagramPatterns.some(pattern => pattern.test(url));
        
        if (!isValidInstagram) {
            return res.status(400).json({ error: 'Invalid Instagram URL' });
        }

        console.log('📸 Fetching Instagram video info for:', url);

        const options = { 
            dumpSingleJson: true, 
            noWarnings: true,
            noPlaylist: true
        };
        
        // Add cookies if available (important for Instagram)
        if (hasCookies) {
            options.cookies = cookiesPath;
            console.log('🍪 Using cookies for Instagram');
        }

        const info = await ytDlp(url, options);

        if (!info) {
            return res.status(404).json({ error: 'Could not fetch video info' });
        }

        // Extract content type from URL
        let contentType = 'post';
        if (url.includes('/reel') || url.includes('/reels')) {
            contentType = 'reel';
        } else if (url.includes('/tv/')) {
            contentType = 'igtv';
        } else if (url.includes('/stories/')) {
            contentType = 'story';
        }

        // Get the best format for Instagram
        // Instagram usually provides a single best quality format
        let bestFormat = null;
        let filesize = null;

        if (info.formats && info.formats.length > 0) {
            // Find the best format with video
            const videoFormats = info.formats.filter(f => 
                f.vcodec && f.vcodec !== 'none' && f.ext === 'mp4'
            );
            
            if (videoFormats.length > 0) {
                // Sort by quality (height) and get the best one
                bestFormat = videoFormats.sort((a, b) => (b.height || 0) - (a.height || 0))[0];
                filesize = bestFormat.filesize || bestFormat.filesize_approx || null;
            } else {
                // Fallback to any available format
                bestFormat = info.formats[info.formats.length - 1];
                filesize = bestFormat?.filesize || bestFormat?.filesize_approx || null;
            }
        }

        // Construct response
        const videoInfo = {
            title: info.title || info.description?.substring(0, 50) || 'Instagram Video',
            description: info.description || '',
            thumbnail: info.thumbnail || info.thumbnails?.[0]?.url || null,
            duration: info.duration || 0,
            uploader: info.uploader || info.channel || 'Unknown',
            uploadDate: info.upload_date || null,
            viewCount: info.view_count || 0,
            likeCount: info.like_count || 0,
            commentCount: info.comment_count || 0,
            contentType: contentType,
            width: bestFormat?.width || info.width || null,
            height: bestFormat?.height || info.height || null,
            filesize: filesize,
            formatId: bestFormat?.format_id || 'best',
            platform: 'instagram'
        };

        console.log(`📸 Instagram ${contentType} info fetched: ${videoInfo.title?.substring(0, 30)}...`);
        res.json(videoInfo);

    } catch (error) {
        console.error('Instagram video info error:', error);
        
        // Provide more specific error messages
        if (error.message?.includes('Private')) {
            return res.status(403).json({ 
                error: 'This is a private Instagram post. Login cookies required.' 
            });
        }
        if (error.message?.includes('login')) {
            return res.status(401).json({ 
                error: 'Instagram requires login. Please add cookies.json for authentication.' 
            });
        }
        
        res.status(500).json({ error: 'Failed to fetch Instagram video info' });
    }
});

// Instagram download start endpoint
app.post('/api/instagram/download-start', async (req, res) => {
    try {
        const { url, estimatedSize } = req.body;
        const downloadId = uuidv4();

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Check disk space
        const diskInfo = await checkDiskSpace(estimatedSize || 100 * 1024 * 1024); // Default 100MB
        if (!diskInfo.sufficient) {
            return res.status(507).json({ 
                error: 'Insufficient disk space', 
                message: diskInfo.message,
                freeGB: diskInfo.freeGB
            });
        }

        console.log(`📸 Starting Instagram download`);

        res.json({ downloadId, status: 'started', platform: 'instagram', diskSpace: diskInfo });

        // Wait for SSE connection
        await new Promise((resolve) => {
            if (activeDownloads.has(downloadId)) {
                resolve();
                return;
            }
            const timeout = setTimeout(() => {
                downloadReadyCallbacks.delete(downloadId);
                resolve();
            }, 5000);
            
            downloadReadyCallbacks.set(downloadId, () => {
                clearTimeout(timeout);
                resolve();
            });
        });

        await new Promise(r => setTimeout(r, 100));

        // Process Instagram download
        processInstagramDownload(downloadId, url);

    } catch (error) {
        console.error('Instagram download start error:', error);
        res.status(500).json({ error: 'Failed to start download' });
    }
});

// Process Instagram video download
async function processInstagramDownload(downloadId, url) {
    try {
        sendProgress(downloadId, { 
            status: 'downloading', 
            progress: 0, 
            stage: '📸 Starting Instagram download...' 
        });

        // Get video info first
        const infoOptions = { 
            dumpSingleJson: true, 
            noWarnings: true,
            noPlaylist: true
        };
        if (hasCookies) infoOptions.cookies = cookiesPath;
        
        const info = await ytDlp(url, infoOptions);
        
        // Create safe filename from title or description
        let title = info.title || info.description || 'instagram_video';
        title = title
            .replace(/[^\w\s-]/gi, '')
            .replace(/\s+/g, '_')
            .substring(0, 80);
        
        if (!title) title = 'instagram_video';
        
        const outputFilename = `${title}.mp4`;
        const outputPath = path.join(downloadsDir, `${downloadId}_${outputFilename}`);

        // Download Instagram video
        await downloadInstagramVideo(downloadId, url, outputPath);

        sendProgress(downloadId, { 
            status: 'completed', 
            filename: outputFilename,
            downloadId: downloadId,
            platform: 'instagram'
        });

    } catch (error) {
        console.error('❌ Instagram download error:', error);
        sendProgress(downloadId, { 
            status: 'error', 
            message: error.message || 'Download failed' 
        });
    }
}

// Download Instagram video using yt-dlp
async function downloadInstagramVideo(downloadId, url, outputPath) {
    return new Promise((resolve, reject) => {
        const ytDlpExec = require('yt-dlp-exec');

        const options = {
            format: 'best[ext=mp4]/best',
            output: outputPath,
            noWarnings: true,
            noCheckCertificates: true,
            noPlaylist: true,
            mergeOutputFormat: 'mp4',
        };

        if (hasCookies) options.cookies = cookiesPath;

        // Use aria2c if available for faster downloads
        if (hasAria2c) {
            options.externalDownloader = aria2cPath;
            options.externalDownloaderArgs = '-x 16 -s 16 -k 1M --file-allocation=none';
            console.log('⚡ Using aria2c for faster Instagram download');
        }

        console.log(`📸 Downloading Instagram video`);

        let fakeProgress = 5;
        const stage = '📸 Downloading Instagram video...';

        sendProgress(downloadId, { 
            status: 'downloading', 
            progress: 5, 
            stage 
        });

        // Instagram downloads are usually fast
        const progressInterval = setInterval(() => {
            fakeProgress += Math.random() * 10;
            if (fakeProgress >= 95) {
                fakeProgress = 95;
            }
            sendProgress(downloadId, { 
                status: 'downloading', 
                progress: Math.round(fakeProgress), 
                stage: `${stage} ${Math.round(fakeProgress)}%` 
            });
        }, 600);

        const downloadTimeout = setTimeout(() => {
            clearInterval(progressInterval);
            console.error('Instagram download timeout');
            reject(new Error('Download timeout - please try again'));
        }, 3 * 60 * 1000); // 3 minute timeout (Instagram videos are usually shorter)

        ytDlpExec.exec(url, options)
            .then(() => {
                clearTimeout(downloadTimeout);
                clearInterval(progressInterval);
                console.log('✅ Instagram download completed');
                sendProgress(downloadId, { 
                    status: 'processing', 
                    progress: 100, 
                    stage: '✅ Finalizing...' 
                });
                resolve();
            })
            .catch((err) => {
                clearTimeout(downloadTimeout);
                clearInterval(progressInterval);
                console.error('Instagram yt-dlp error:', err.message || err);
                reject(err);
            });
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ████████╗██╗██╗  ██╗████████╗ ██████╗ ██╗  ██╗    ██████╗ ██╗     ██████╗ 
//    ██║   ██║██║ ██╔╝   ██║   ██╔═══██╗██║ ██╔╝    ██╔══██╗██║     ██╔══██╗
//    ██║   ██║█████╔╝    ██║   ██║   ██║█████╔╝     ██║  ██║██║     ██████╔╝
//    ██║   ██║██╔═██╗    ██║   ██║   ██║██╔═██╗     ██║  ██║██║     ██╔═══╝ 
//    ██║   ██║██║  ██╗   ██║   ╚██████╔╝██║  ██╗    ██████╔╝███████╗██║     
// ═══════════════════════════════════════════════════════════════════════════════

// TikTok video info endpoint
app.post('/api/tiktok/video-info', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Validate TikTok URL
        const tiktokPatterns = [
            /tiktok\.com\/@[\w.-]+\/video\/\d+/i,  // Standard video URL
            /tiktok\.com\/t\/\w+/i,                 // Short share URL
            /vm\.tiktok\.com\/\w+/i,                // VM short URL
            /vt\.tiktok\.com\/\w+/i,                // VT short URL
            /tiktok\.com\/.*\/video\/\d+/i,         // Alternative format
        ];

        const isValidTikTok = tiktokPatterns.some(pattern => pattern.test(url));
        
        if (!isValidTikTok) {
            return res.status(400).json({ error: 'Invalid TikTok URL' });
        }

        console.log('🎵 Fetching TikTok video info for:', url);

        const options = { 
            dumpSingleJson: true, 
            noWarnings: true,
            noPlaylist: true
        };
        
        // Add cookies if available (helps with rate limits)
        if (hasCookies) {
            options.cookies = cookiesPath;
            console.log('🍪 Using cookies for TikTok');
        }

        const info = await ytDlp(url, options);

        if (!info) {
            return res.status(404).json({ error: 'Could not fetch video info' });
        }

        // Get the best format for TikTok
        let bestFormat = null;
        let filesize = null;
        let quality = 'Best Quality';

        if (info.formats && info.formats.length > 0) {
            // Find the best MP4 format with video (preferably without watermark)
            const videoFormats = info.formats.filter(f => 
                f.vcodec && f.vcodec !== 'none' && f.ext === 'mp4'
            );
            
            if (videoFormats.length > 0) {
                // TikTok formats: prefer no-watermark versions if available
                // Look for format_note or format_id indicating no watermark
                let noWatermarkFormats = videoFormats.filter(f => 
                    f.format_note?.toLowerCase().includes('no watermark') ||
                    f.format_id?.toLowerCase().includes('download') ||
                    f.format_note?.toLowerCase().includes('download')
                );
                
                if (noWatermarkFormats.length > 0) {
                    bestFormat = noWatermarkFormats.sort((a, b) => (b.height || 0) - (a.height || 0))[0];
                } else {
                    bestFormat = videoFormats.sort((a, b) => (b.height || 0) - (a.height || 0))[0];
                }
                
                filesize = bestFormat.filesize || bestFormat.filesize_approx || null;
                
                if (bestFormat.height) {
                    if (bestFormat.height >= 1080) quality = '1080p HD';
                    else if (bestFormat.height >= 720) quality = '720p HD';
                    else if (bestFormat.height >= 480) quality = '480p';
                    else quality = `${bestFormat.height}p`;
                }
            } else {
                // Fallback to any available format
                bestFormat = info.formats[info.formats.length - 1];
                filesize = bestFormat?.filesize || bestFormat?.filesize_approx || null;
            }
        }

        // Construct response
        const videoInfo = {
            title: info.title || info.description?.substring(0, 100) || 'TikTok Video',
            description: info.description || '',
            thumbnail: info.thumbnail || info.thumbnails?.[0]?.url || null,
            duration: info.duration || 0,
            author: info.uploader || info.creator || info.channel || 'Unknown',
            uploadDate: info.upload_date || null,
            viewCount: info.view_count || 0,
            likeCount: info.like_count || 0,
            commentCount: info.comment_count || 0,
            shareCount: info.repost_count || 0,
            width: bestFormat?.width || info.width || null,
            height: bestFormat?.height || info.height || null,
            filesize: filesize,
            quality: quality,
            formatId: bestFormat?.format_id || 'best',
            platform: 'tiktok'
        };

        console.log(`🎵 TikTok video info fetched: @${videoInfo.author}`);
        res.json(videoInfo);

    } catch (error) {
        console.error('TikTok video info error:', error);
        
        // Provide more specific error messages
        if (error.message?.includes('Private') || error.message?.includes('private')) {
            return res.status(403).json({ 
                error: 'This TikTok video is private or restricted.' 
            });
        }
        if (error.message?.includes('unavailable') || error.message?.includes('removed')) {
            return res.status(404).json({ 
                error: 'This TikTok video is unavailable or has been removed.' 
            });
        }
        if (error.message?.includes('region')) {
            return res.status(403).json({ 
                error: 'This video is not available in your region.' 
            });
        }
        if (error.message?.includes('429') || error.message?.includes('rate')) {
            return res.status(429).json({ 
                error: 'Too many requests. Please wait a moment and try again.' 
            });
        }
        
        res.status(500).json({ error: 'Failed to fetch TikTok video info' });
    }
});

// TikTok download start endpoint
app.post('/api/tiktok/download-start', async (req, res) => {
    try {
        const { url, removeWatermark, estimatedSize } = req.body;
        const downloadId = uuidv4();

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Check disk space
        const diskInfo = await checkDiskSpace(estimatedSize || 50 * 1024 * 1024); // Default 50MB for TikTok
        if (!diskInfo.sufficient) {
            return res.status(507).json({ 
                error: 'Insufficient disk space', 
                message: diskInfo.message,
                freeGB: diskInfo.freeGB
            });
        }

        console.log(`🎵 Starting TikTok download (no watermark: ${removeWatermark})`);

        res.json({ downloadId, status: 'started', platform: 'tiktok', diskSpace: diskInfo });

        // Wait for SSE connection
        await new Promise((resolve) => {
            if (activeDownloads.has(downloadId)) {
                resolve();
                return;
            }
            const timeout = setTimeout(() => {
                downloadReadyCallbacks.delete(downloadId);
                resolve();
            }, 5000);
            
            downloadReadyCallbacks.set(downloadId, () => {
                clearTimeout(timeout);
                resolve();
            });
        });

        await new Promise(r => setTimeout(r, 100));

        // Process TikTok download
        processTikTokDownload(downloadId, url, removeWatermark);

    } catch (error) {
        console.error('TikTok download start error:', error);
        res.status(500).json({ error: 'Failed to start download' });
    }
});

// Process TikTok video download
async function processTikTokDownload(downloadId, url, removeWatermark = true) {
    try {
        sendProgress(downloadId, { 
            status: 'downloading', 
            progress: 0, 
            stage: '🎵 Starting TikTok download...' 
        });

        // Get video info first
        const infoOptions = { 
            dumpSingleJson: true, 
            noWarnings: true,
            noPlaylist: true
        };
        if (hasCookies) infoOptions.cookies = cookiesPath;
        
        const info = await ytDlp(url, infoOptions);
        
        // Create safe filename from author and description
        let author = info.uploader || info.creator || 'tiktok';
        let desc = info.description || info.title || 'video';
        
        // Clean up the filename
        author = author.replace(/[^\w\s-]/gi, '').trim().substring(0, 30);
        desc = desc.replace(/[^\w\s-]/gi, '').replace(/\s+/g, '_').substring(0, 50);
        
        if (!author) author = 'tiktok';
        if (!desc) desc = 'video';
        
        const outputFilename = `${author}_${desc}.mp4`;
        const outputPath = path.join(downloadsDir, `${downloadId}_${outputFilename}`);

        // Download TikTok video
        await downloadTikTokVideo(downloadId, url, outputPath, removeWatermark);

        sendProgress(downloadId, { 
            status: 'completed', 
            filename: outputFilename,
            downloadId: downloadId,
            platform: 'tiktok'
        });

    } catch (error) {
        console.error('❌ TikTok download error:', error);
        sendProgress(downloadId, { 
            status: 'error', 
            message: error.message || 'Download failed' 
        });
    }
}

// Download TikTok video using yt-dlp
async function downloadTikTokVideo(downloadId, url, outputPath, removeWatermark = true) {
    return new Promise(async (resolve, reject) => {
        const ytDlpExec = require('yt-dlp-exec');

        const options = {
            output: outputPath,
            noWarnings: true,
            noCheckCertificates: true,
            noPlaylist: true,
            mergeOutputFormat: 'mp4',
        };

        if (removeWatermark) {
            // Method 1: Use format selector to prefer no-watermark formats
            // TikTok's API provides different format IDs:
            // - "download" variants = typically no watermark
            // - "play" variants = typically with watermark
            // - "bytevc1_*" / "h264_*" = codec specific, may have watermark
            options.format = 'download_addr-0/download_addr-1/download_addr-2/download_addr-3/download-0/download-1/download-2/download/best[ext=mp4]/bestvideo[ext=mp4]+bestaudio/best';
            
            // Method 2: Try TikTok API hostname for better access
            options.extractorArgs = 'tiktok:api_hostname=api16-normal-c-useast1a.tiktokv.com;tiktok:app_version=34.1.2';
            
            console.log('🎵 Attempting no-watermark download...');
        } else {
            options.format = 'best[ext=mp4]/best';
        }

        if (hasCookies) options.cookies = cookiesPath;

        // Use aria2c if available for faster downloads
        if (hasAria2c) {
            options.externalDownloader = aria2cPath;
            options.externalDownloaderArgs = '-x 16 -s 16 -k 1M --file-allocation=none';
            console.log('⚡ Using aria2c for faster TikTok download');
        }

        console.log(`🎵 Downloading TikTok video (no watermark: ${removeWatermark})`);

        let fakeProgress = 5;
        const stage = removeWatermark ? '🎵 Downloading (no watermark)...' : '🎵 Downloading TikTok...';

        sendProgress(downloadId, { 
            status: 'downloading', 
            progress: 5, 
            stage 
        });

        // TikTok downloads are usually fast
        const progressInterval = setInterval(() => {
            fakeProgress += Math.random() * 12;
            if (fakeProgress >= 95) {
                fakeProgress = 95;
            }
            sendProgress(downloadId, { 
                status: 'downloading', 
                progress: Math.round(fakeProgress), 
                stage: `${stage} ${Math.round(fakeProgress)}%` 
            });
        }, 500);

        const downloadTimeout = setTimeout(() => {
            clearInterval(progressInterval);
            console.error('TikTok download timeout');
            reject(new Error('Download timeout - please try again'));
        }, 2 * 60 * 1000); // 2 minute timeout (TikTok videos are short)

        ytDlpExec.exec(url, options)
            .then(() => {
                clearTimeout(downloadTimeout);
                clearInterval(progressInterval);
                console.log('✅ TikTok download completed');
                sendProgress(downloadId, { 
                    status: 'processing', 
                    progress: 100, 
                    stage: '✅ Finalizing...' 
                });
                resolve();
            })
            .catch((err) => {
                clearTimeout(downloadTimeout);
                clearInterval(progressInterval);
                console.error('TikTok yt-dlp error:', err.message || err);
                reject(err);
            });
    });
}

// Get completed download file
app.get('/api/download-file/:downloadId', (req, res) => {
    const { downloadId } = req.params;
    const { filename } = req.query;

    const files = fs.readdirSync(downloadsDir);
    const downloadFile = files.find(f => f.startsWith(downloadId));

    if (!downloadFile) {
        return res.status(404).json({ error: 'File not found' });
    }

    const filePath = path.join(downloadsDir, downloadFile);
    const outputFilename = filename || downloadFile.replace(`${downloadId}_`, '');

    res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('end', () => {
        setTimeout(() => {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }, 5000);
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
    console.log(`🎬 FFmpeg path: ${ffmpegStatic}`);
});
