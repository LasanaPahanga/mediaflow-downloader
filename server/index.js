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
        
        // Check cookie expiry dates
        const now = Math.floor(Date.now() / 1000);
        const oneDayFromNow = now + 86400;
        const oneWeekFromNow = now + 604800;
        let hasExpired = false;
        let expiringSoon = false;
        let earliestExpiry = Infinity;
        
        for (const line of lines) {
            const parts = line.split('\t');
            if (parts.length >= 5) {
                const expiry = parseInt(parts[4], 10);
                if (!isNaN(expiry) && expiry > 0) {
                    if (expiry < now) {
                        hasExpired = true;
                    } else if (expiry < oneWeekFromNow) {
                        expiringSoon = true;
                        earliestExpiry = Math.min(earliestExpiry, expiry);
                    }
                }
            }
        }
        
        if (hasExpired) {
            cookieStatus = { 
                valid: false, 
                message: 'Some cookies have expired. Please re-export from browser.', 
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
