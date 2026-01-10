// Convert cookies.json to cookies.txt (Netscape format)
const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'cookies.json');
const txtPath = path.join(__dirname, 'cookies.txt');

if (!fs.existsSync(jsonPath)) {
    console.log('❌ cookies.json not found!');
    process.exit(1);
}

const cookies = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Netscape cookie format header
let output = '# Netscape HTTP Cookie File\n';
output += '# https://curl.haxx.se/docs/http-cookies.html\n';
output += '# This file was generated automatically\n\n';

for (const cookie of cookies) {
    const domain = cookie.domain.startsWith('.') ? cookie.domain : '.' + cookie.domain;
    const includeSubdomains = domain.startsWith('.') ? 'TRUE' : 'FALSE';
    const path_ = cookie.path || '/';
    const secure = cookie.secure ? 'TRUE' : 'FALSE';
    const expires = Math.floor(cookie.expirationDate || 0);
    const name = cookie.name;
    const value = cookie.value;

    output += `${domain}\t${includeSubdomains}\t${path_}\t${secure}\t${expires}\t${name}\t${value}\n`;
}

fs.writeFileSync(txtPath, output);
console.log('✅ Converted cookies.json to cookies.txt');
console.log(`📁 Saved to: ${txtPath}`);
