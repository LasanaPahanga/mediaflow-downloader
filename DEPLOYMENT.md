# 🚀 MediaFlow Downloader - Deployment Guide

> **Complete guide to deploying MediaFlow Downloader locally and in production**

---

## 📋 Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Development Setup](#2-local-development-setup)
3. [Production Build](#3-production-build)
4. [Deployment Options](#4-deployment-options)
   - [Vercel + AWS (Recommended)](#-option-e-vercel--aws-recommended)
5. [Environment Configuration](#5-environment-configuration)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Prerequisites

### Required Software

| Software | Version | Purpose | Installation |
|----------|---------|---------|--------------|
| **Node.js** | 18.x or higher | Runtime | [nodejs.org](https://nodejs.org/) |
| **npm** | 9.x or higher | Package manager | Comes with Node.js |
| **yt-dlp** | Latest | Video extraction | `winget install yt-dlp` |
| **FFmpeg** | 6.x+ | Video processing | Bundled (ffmpeg-static) |

### Optional (Recommended)

| Software | Purpose | Installation |
|----------|---------|--------------|
| **aria2c** | Faster downloads (16x connections) | `winget install aria2.aria2` |
| **Git** | Version control | `winget install Git.Git` |

### Verify Installation

```powershell
# Check Node.js
node --version
# Expected: v18.x.x or higher

# Check npm
npm --version
# Expected: 9.x.x or higher

# Check yt-dlp
yt-dlp --version
# Expected: 2024.xx.xx or higher

# Check aria2c (optional)
aria2c --version
# Expected: aria2 version 1.x.x
```

---

## 2. Local Development Setup

### Step 1: Clone/Download the Project

```powershell
# If using Git
git clone https://github.com/your-username/mediaflow-downloader.git
cd mediaflow-downloader

# Or extract the ZIP file and navigate to the folder
cd C:\Users\YourName\Desktop\mediaflow-downloader
```

### Step 2: Install Dependencies

```powershell
# Install all dependencies (root, server, client)
npm run install-all

# Or install manually:
npm install                  # Root dependencies
cd server && npm install     # Server dependencies
cd ../client && npm install  # Client dependencies
cd ..
```

### Step 3: Configure Cookies (Optional but Recommended)

For age-restricted or private videos, you need browser cookies:

1. Install a browser extension:
   - Chrome: [Get cookies.txt LOCALLY](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)
   - Firefox: [cookies.txt](https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/)

2. Log into YouTube/Facebook/Instagram in your browser

3. Export cookies and save as `server/cookies.txt`

```powershell
# Verify cookies file exists
Test-Path .\server\cookies.txt
# Should return: True
```

### Step 4: Start Development Servers

**Option A: Run both servers together (recommended)**
```powershell
npm run dev
```

**Option B: Run servers separately**
```powershell
# Terminal 1 - Backend (Port 5000)
cd server
npm run dev

# Terminal 2 - Frontend (Port 3000)
cd client
npm start
```

**Option C: Use the batch file (Windows)**
```powershell
.\start.bat
```

### Step 5: Access the Application

Open your browser and navigate to:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000/api/health

---

## 3. Production Build

### Build the React Frontend

```powershell
cd client
npm run build
```

This creates an optimized `client/build/` folder with:
- Minified JavaScript bundles
- Optimized CSS
- Static assets

### Serve Production Build

**Option A: Serve from Express (recommended)**

Add this to `server/index.js` (before `app.listen`):

```javascript
// Serve React production build
const buildPath = path.join(__dirname, '..', 'client', 'build');
if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(buildPath, 'index.html'));
        }
    });
}
```

**Option B: Use a static file server**

```powershell
npm install -g serve
serve -s client/build -l 3000
```

---

## 4. Deployment Options

### 🖥️ Option A: Local Network (LAN)

Share with other devices on your network:

1. Find your local IP address:
```powershell
ipconfig | Select-String "IPv4"
# Example output: IPv4 Address. . . . . . . . . . . : 192.168.1.100
```

2. Update `client/src/components/*.js` API URLs:
```javascript
// Change from:
const API_BASE_URL = 'http://localhost:5000/api';

// To your local IP:
const API_BASE_URL = 'http://192.168.1.100:5000/api';
```

3. Start the server with network binding:
```powershell
# Server will be accessible at http://192.168.1.100:5000
cd server
$env:HOST="0.0.0.0"; node index.js
```

4. Access from other devices: `http://192.168.1.100:3000`

---

### 🐳 Option B: Docker Deployment

**Dockerfile (create in root folder)**

```dockerfile
# Dockerfile
FROM node:18-alpine

# Install yt-dlp and ffmpeg
RUN apk add --no-cache python3 py3-pip ffmpeg
RUN pip3 install --break-system-packages yt-dlp

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN npm install
RUN cd server && npm install
RUN cd client && npm install

# Copy source code
COPY . .

# Build React app
RUN cd client && npm run build

# Expose port
EXPOSE 5000

# Start server
CMD ["node", "server/index.js"]
```

**docker-compose.yml**

```yaml
version: '3.8'

services:
  mediaflow:
    build: .
    ports:
      - "5000:5000"
    volumes:
      - ./server/downloads:/app/server/downloads
      - ./server/cookies.txt:/app/server/cookies.txt:ro
    environment:
      - NODE_ENV=production
      - PORT=5000
    restart: unless-stopped
```

**Build and Run**

```powershell
# Build image
docker build -t mediaflow-downloader .

# Run container
docker run -d -p 5000:5000 -v ${PWD}/server/downloads:/app/server/downloads mediaflow-downloader

# Or use docker-compose
docker-compose up -d
```

---

### ☁️ Option C: VPS Deployment (Ubuntu/Debian)

**1. Server Setup**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install dependencies
sudo apt install -y git ffmpeg python3 python3-pip aria2

# Install yt-dlp
sudo pip3 install yt-dlp

# Verify installations
node --version && npm --version && yt-dlp --version
```

**2. Clone and Setup Application**

```bash
# Clone repository
git clone https://github.com/your-username/mediaflow-downloader.git
cd mediaflow-downloader

# Install dependencies
npm run install-all

# Build frontend
cd client && npm run build && cd ..

# Create downloads directory
mkdir -p server/downloads
```

**3. Setup PM2 (Process Manager)**

```bash
# Install PM2 globally
sudo npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'mediaflow',
    script: 'server/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
EOF

# Start application
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 startup script
pm2 startup
```

**4. Setup Nginx Reverse Proxy**

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/mediaflow
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Or your VPS IP

    # Serve React build
    location / {
        root /home/ubuntu/mediaflow-downloader/client/build;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
        
        # SSE support
        proxy_set_header Cache-Control 'no-cache';
        proxy_buffering off;
        chunked_transfer_encoding off;
    }

    # Download files
    location /api/download-file {
        proxy_pass http://127.0.0.1:5000;
        proxy_buffering off;
        proxy_read_timeout 300s;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/mediaflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**5. Setup SSL with Certbot (Optional but Recommended)**

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is enabled by default
```

---

### 🌐 Option D: Cloud Platform Deployment

#### Railway.app (Easiest)

1. Push code to GitHub
2. Go to [railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub"
4. Select your repository
5. Railway auto-detects Node.js and deploys

**Environment Variables:**
```
PORT=5000
NODE_ENV=production
```

#### Render.com

1. Create a new "Web Service"
2. Connect GitHub repository
3. Settings:
   - **Build Command:** `npm run install-all && cd client && npm run build`
   - **Start Command:** `node server/index.js`
   - **Environment:** Node

#### Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create mediaflow-downloader

# Add buildpacks
heroku buildpacks:add --index 1 heroku/nodejs
heroku buildpacks:add --index 2 https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest.git

# Deploy
git push heroku main

# Open app
heroku open
```

**Note:** Heroku has limited disk space. Downloads are temporary.

---

### 🚀 Option E: Vercel + AWS (Recommended)

> **Best for production deployment with AWS Free Tier (12 months free)**

This setup uses:
- **Vercel** → Frontend (React app) - Free tier
- **AWS EC2** → Backend (Node.js server) - Free tier eligible

#### Architecture Overview

```
┌─────────────────┐         ┌─────────────────┐
│     Vercel      │         │    AWS EC2      │
│  (React Client) │ ──API─▶ │  (Node Server)  │
│   Free Tier     │         │   Free Tier     │
└─────────────────┘         └─────────────────┘
        │                          │
        ▼                          ▼
   your-app.vercel.app    ec2-xx-xx.compute.amazonaws.com
```

---

### Part 1: AWS EC2 Backend Setup (Free Tier)

#### AWS Free Tier Limits (12 Months)
| Service | Free Tier Limit |
|---------|-----------------|
| EC2 | 750 hours/month t2.micro or t3.micro |
| EBS Storage | 30 GB SSD |
| Data Transfer | 100 GB outbound/month |
| Elastic IP | 1 free (if attached to running instance) |

#### Step 1: Create AWS Account

1. Go to [aws.amazon.com](https://aws.amazon.com)
2. Click **"Create an AWS Account"**
3. Enter email, password, and account name
4. Add payment method (required but won't be charged for free tier)
5. Complete phone verification
6. Select **"Basic Support - Free"** plan

#### Step 2: Launch EC2 Instance

1. Go to **AWS Console** → **EC2** → **Launch Instance**

2. **Configure Instance:**
   ```
   Name: mediaflow-server
   AMI: Ubuntu Server 24.04 LTS (Free tier eligible)
   Instance type: t2.micro or t3.micro (Both free tier eligible)
   Key pair: Create new → Download .pem file (SAVE THIS!)
   ```
   
   **Note:** t3.micro is newer and faster - use it if t2.micro isn't available

3. **Network Settings:**
   ```
   ✅ Allow SSH traffic from: My IP
   ✅ Allow HTTPS traffic from the internet
   ✅ Allow HTTP traffic from the internet
   ```

4. **Configure Storage:**
   ```
   Size: 20 GB (within 30 GB free tier)
   Volume type: gp3
   ```

5. Click **"Launch Instance"**

#### Step 3: Configure Security Group

1. Go to **EC2** → **Security Groups** → Select your instance's security group
2. **Edit inbound rules** → Add these rules:

| Type | Port Range | Source | Description |
|------|------------|--------|-------------|
| SSH | 22 | My IP | SSH access |
| HTTP | 80 | 0.0.0.0/0 | HTTP traffic |
| HTTPS | 443 | 0.0.0.0/0 | HTTPS traffic |
| Custom TCP | 5000 | 0.0.0.0/0 | API server |

#### Step 4: Allocate Elastic IP (Free when attached)

1. Go to **EC2** → **Elastic IPs** → **Allocate Elastic IP address**
2. Click **Allocate**
3. Select the new IP → **Actions** → **Associate Elastic IP address**
4. Select your EC2 instance → **Associate**
5. **Note your Elastic IP:** `XX.XX.XX.XX`

#### Step 5: Connect to EC2 via SSH

**Windows (PowerShell):**
```powershell
# Navigate to your .pem file location
cd C:\Users\YourName\Downloads

# Set permissions (Windows)
icacls "your-key.pem" /inheritance:r /grant:r "$($env:USERNAME):R"

# Connect to EC2
ssh -i "your-key.pem" ubuntu@YOUR_ELASTIC_IP
```

**Alternative: Use PuTTY (Windows)**
1. Download [PuTTY](https://www.putty.org/)
2. Convert .pem to .ppk using PuTTYgen
3. Connect using your Elastic IP

#### Step 6: Setup Server Environment

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install required tools
sudo apt install -y git ffmpeg python3 python3-pip aria2 nginx

# Install yt-dlp
sudo pip3 install yt-dlp --break-system-packages

# Verify installations
node --version    # v20.x.x
npm --version     # 10.x.x
yt-dlp --version  # 2024.x.x
ffmpeg -version   # ffmpeg version 6.x
```

#### Step 7: Deploy Backend Application

```bash
# Clone your repository
cd ~
git clone https://github.com/YOUR_USERNAME/mediaflow-downloader.git
cd mediaflow-downloader

# Install server dependencies only
cd server
npm install

# Create downloads directory
mkdir -p downloads

# Setup cookies (if needed)
nano cookies.txt
# Paste your cookies content, save with Ctrl+X, Y, Enter
```

#### Step 8: Configure Environment Variables

```bash
# Create environment file
nano .env
```

Add the following:
```env
PORT=5000
NODE_ENV=production
HOST=0.0.0.0
```

#### Step 9: Setup PM2 Process Manager

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the server
pm2 start index.js --name mediaflow-api

# Save PM2 config
pm2 save

# Setup auto-start on reboot
pm2 startup
# Copy and run the command it outputs

# Check status
pm2 status
pm2 logs mediaflow-api
```

#### Step 10: Configure Nginx Reverse Proxy

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/mediaflow
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name YOUR_ELASTIC_IP;  # Replace with your Elastic IP

    # API endpoints
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        
        # SSE support for progress updates
        proxy_set_header Cache-Control 'no-cache';
        proxy_buffering off;
        chunked_transfer_encoding off;
        proxy_read_timeout 300s;
    }

    # Download endpoint (longer timeout)
    location /api/download-file {
        proxy_pass http://127.0.0.1:5000;
        proxy_buffering off;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/mediaflow /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remove default site
sudo nginx -t  # Test config
sudo systemctl restart nginx
sudo systemctl enable nginx
```

#### Step 11: Test Backend API

```bash
# Test locally on server
curl http://localhost:5000/api/health

# Test from your computer browser
# Visit: http://YOUR_ELASTIC_IP/api/health
# Should return: {"status":"ok",...}
```

---

### Part 2: Vercel Frontend Deployment (Free)

#### Step 1: Prepare Client for Production

Update the API URL in your React app:

**Option A: Using Environment Variables (Recommended)**

Create `client/.env.production`:
```env
REACT_APP_API_URL=http://YOUR_ELASTIC_IP/api
```

Update your components to use:
```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
```

**Option B: Direct Update**

Update all API URLs in `client/src/components/`:
```javascript
// Change from:
const API_BASE_URL = 'http://localhost:5000/api';

// To:
const API_BASE_URL = 'http://YOUR_ELASTIC_IP/api';
```

#### Step 2: Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"** → Sign up with GitHub
3. Authorize Vercel to access your repositories

#### Step 3: Import Project to Vercel

1. Click **"Add New..."** → **"Project"**
2. Select your GitHub repository: `mediaflow-downloader`
3. Configure project:

```
Framework Preset: Create React App
Root Directory: client    ← IMPORTANT!
Build Command: npm run build
Output Directory: build
Install Command: npm install
```

#### Step 4: Configure Environment Variables

In Vercel project settings → **Environment Variables**:

| Name | Value |
|------|-------|
| `REACT_APP_API_URL` | `http://YOUR_ELASTIC_IP/api` |

#### Step 5: Deploy

1. Click **"Deploy"**
2. Wait for build to complete (2-3 minutes)
3. Your app is live at: `https://your-project.vercel.app`

#### Step 6: Configure Custom Domain (Optional)

1. Go to project **Settings** → **Domains**
2. Add your custom domain: `mediaflow.yourdomain.com`
3. Follow DNS configuration instructions

---

### Part 3: Connect Frontend to Backend

#### Update CORS on Backend

Edit `server/index.js` to allow your Vercel domain:

```javascript
const cors = require('cors');

// Configure CORS for production
const corsOptions = {
    origin: [
        'http://localhost:3000',                    // Local development
        'https://your-project.vercel.app',          // Vercel deployment
        'https://your-custom-domain.com'            // Custom domain (if any)
    ],
    methods: ['GET', 'POST', 'DELETE'],
    credentials: true
};

app.use(cors(corsOptions));
```

Restart PM2 after changes:
```bash
pm2 restart mediaflow-api
```

---

### Part 4: SSL/HTTPS for AWS (Optional but Recommended)

#### Option A: Free SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (requires a domain pointing to your Elastic IP)
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal is configured automatically
sudo certbot renew --dry-run  # Test renewal
```

Update Vercel environment variable to use HTTPS:
```
REACT_APP_API_URL=https://api.yourdomain.com/api
```

#### Option B: Use AWS CloudFront (More Complex)

For production with custom domain and CDN caching.

---

### AWS Free Tier Monitoring

#### Set Up Billing Alerts

1. Go to **AWS Console** → **Billing** → **Budgets**
2. Click **"Create budget"**
3. Select **"Zero spend budget"**
4. Enter your email for alerts
5. This alerts you if any charges occur

#### Monitor Free Tier Usage

1. Go to **AWS Console** → **Billing** → **Free Tier**
2. Check usage percentages:
   - EC2 hours used: X/750
   - Data transfer: X/100 GB
   - EBS storage: X/30 GB

#### Cost Optimization Tips

```bash
# Stop instance when not needed (saves hours)
# AWS Console → EC2 → Select instance → Instance state → Stop

# Or via AWS CLI
aws ec2 stop-instances --instance-ids i-xxxxx

# Start when needed
aws ec2 start-instances --instance-ids i-xxxxx
```

---

### Quick Reference Commands

```bash
# SSH into AWS EC2
ssh -i "your-key.pem" ubuntu@YOUR_ELASTIC_IP

# Check server status
pm2 status
pm2 logs mediaflow-api

# Restart server
pm2 restart mediaflow-api

# Update code
cd ~/mediaflow-downloader
git pull
cd server && npm install
pm2 restart mediaflow-api

# Update yt-dlp
sudo yt-dlp -U

# Check Nginx status
sudo systemctl status nginx
sudo nginx -t

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Check disk space
df -h

# Clean downloads folder
rm -rf ~/mediaflow-downloader/server/downloads/*
```

---

### Deployment Checklist - Vercel + AWS

**AWS Backend:**
- [ ] AWS account created with free tier
- [ ] EC2 t2.micro instance launched (Ubuntu)
- [ ] Elastic IP allocated and associated
- [ ] Security group configured (ports 22, 80, 443, 5000)
- [ ] SSH connection working
- [ ] Node.js, yt-dlp, FFmpeg installed
- [ ] Application cloned and dependencies installed
- [ ] PM2 running and auto-start configured
- [ ] Nginx configured and running
- [ ] API health check works: `http://ELASTIC_IP/api/health`
- [ ] Billing alerts configured

**Vercel Frontend:**
- [ ] Vercel account created
- [ ] Project imported with correct root directory (`client`)
- [ ] Environment variable `REACT_APP_API_URL` set
- [ ] Deployment successful
- [ ] CORS configured on backend for Vercel domain
- [ ] Full download flow tested

**URLs:**
- Frontend: `https://your-project.vercel.app`
- Backend API: `http://YOUR_ELASTIC_IP/api`
- Health Check: `http://YOUR_ELASTIC_IP/api/health`

---

## 5. Environment Configuration

### Environment Variables

Create `.env` file in `/server`:

```env
# Server Configuration
PORT=5000
NODE_ENV=production
HOST=0.0.0.0

# Paths (optional, uses defaults if not set)
DOWNLOADS_DIR=./downloads
COOKIES_PATH=./cookies.txt

# Feature Flags
ENABLE_ARIA2C=true
CLEANUP_INTERVAL=1800000  # 30 minutes in ms
FILE_RETENTION=3600000    # 1 hour in ms
```

### Update server/index.js to use env vars:

```javascript
require('dotenv').config();

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';
const downloadsDir = process.env.DOWNLOADS_DIR || path.join(__dirname, 'downloads');
```

### Frontend Environment

Create `client/.env`:

```env
# API URL for production
REACT_APP_API_URL=https://your-domain.com/api

# Or for local development
REACT_APP_API_URL=http://localhost:5000/api
```

Update components to use:
```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
```

---

## 6. Troubleshooting

### Common Issues

#### ❌ "yt-dlp not found"

```powershell
# Windows
winget install yt-dlp

# Or download manually from:
# https://github.com/yt-dlp/yt-dlp/releases

# Verify
yt-dlp --version
```

#### ❌ "CORS error" in browser

Ensure the server has CORS enabled:
```javascript
const cors = require('cors');
app.use(cors());  // Must be before routes
```

#### ❌ "Port 3000/5000 already in use"

```powershell
# Find process using port
netstat -ano | findstr :3000

# Kill process by PID
taskkill /PID <PID> /F

# Or use different ports
$env:PORT=3001; npm start
```

#### ❌ "Cookies expired" warning

1. Log into YouTube/Facebook in your browser
2. Re-export cookies using the browser extension
3. Replace `server/cookies.txt`
4. Restart the server

#### ❌ "Insufficient disk space"

```powershell
# Check disk space
Get-PSDrive C | Select-Object Used, Free

# Clean old downloads
Remove-Item .\server\downloads\* -Force
```

#### ❌ SSE progress not updating

Check if proxy is buffering responses:
```nginx
# In Nginx config
proxy_buffering off;
chunked_transfer_encoding off;
```

#### ❌ Downloads fail with 403 error

YouTube URLs are IP-bound and time-limited:
- Don't use aria2c for YouTube (auto-disabled in code)
- Ensure cookies are fresh
- Try again with a new URL

### Logs and Debugging

```powershell
# View server logs
cd server
$env:DEBUG="*"; node index.js

# Check PM2 logs (production)
pm2 logs mediaflow

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

---

## 📊 Performance Tips

### 1. Enable aria2c for non-YouTube downloads
```powershell
winget install aria2.aria2
# Restart server - auto-detected
```

### 2. Increase Node.js memory (for large files)
```powershell
$env:NODE_OPTIONS="--max-old-space-size=4096"
node server/index.js
```

### 3. Use SSD for downloads directory
```javascript
const downloadsDir = 'D:\\fast-ssd\\downloads';  // SSD path
```

### 4. Configure cleanup intervals
```javascript
// server/index.js
const cleanupInterval = 15 * 60 * 1000;  // 15 minutes
const fileRetention = 30 * 60 * 1000;    // 30 minutes
```

---

## 🔒 Security Recommendations

1. **Never expose cookies.txt publicly**
2. **Use HTTPS in production** (SSL certificate)
3. **Set rate limiting** to prevent abuse:
   ```javascript
   const rateLimit = require('express-rate-limit');
   app.use('/api', rateLimit({ windowMs: 60000, max: 30 }));
   ```
4. **Restrict CORS origins** in production:
   ```javascript
   app.use(cors({ origin: 'https://your-domain.com' }));
   ```
5. **Keep yt-dlp updated** (videos break with outdated versions):
   ```powershell
   yt-dlp -U
   ```

---

## ✅ Deployment Checklist

- [ ] Node.js 18+ installed
- [ ] yt-dlp installed and updated
- [ ] npm dependencies installed
- [ ] cookies.txt configured (optional)
- [ ] Production build created (`npm run build`)
- [ ] Environment variables set
- [ ] Server starts without errors
- [ ] API health check works (`/api/health`)
- [ ] Frontend loads correctly
- [ ] Download works end-to-end
- [ ] SSL configured (production)
- [ ] PM2/systemd for auto-restart (production)

---

**Happy Deploying! 🎉**

*For issues, check the [Troubleshooting](#6-troubleshooting) section or open a GitHub issue.*
