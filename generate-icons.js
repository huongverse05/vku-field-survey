const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 implementation for PNG chunks
function createCRC32Table() {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
}

const crcTable = createCRC32Table();

function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(12 + len);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function generatePNG(width, height, drawFn) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image data with 1 byte filter per line
  const raw = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0; // filter None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
      raw[offset++] = a;
    }
  }

  const idatData = zlib.deflateSync(raw, { level: 9 });
  const idatChunk = makeChunk('IDAT', idatData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Icon design: VKU Red gradient background (#c51e1e to #991b1b) with stylized clipboard & checkmark
function iconPixelShader(x, y, w, h, isMaskable = false) {
  const nx = x / w;
  const ny = y / h;
  const cx = 0.5;
  const cy = 0.5;
  const dist = Math.hypot(nx - cx, ny - cy);

  // Background rounded rect / circle
  const radius = isMaskable ? 0.7 : 0.46; // maskable has full bleed
  if (dist > radius && !isMaskable) {
    return [0, 0, 0, 0]; // transparent outside
  }

  // Base background gradient: Deep VKU Crimson to Red
  let r = Math.round(197 - ny * 35);
  let g = Math.round(30 - ny * 15);
  let b = Math.round(30 - ny * 10);
  let a = 255;

  // Scale coordinates to center box [0.22, 0.78]
  const scale = isMaskable ? 0.65 : 0.8;
  const bx = (nx - 0.5) / scale + 0.5;
  const by = (ny - 0.5) / scale + 0.5;

  // Clipboard body: x: 0.28 to 0.72, y: 0.24 to 0.78
  const inClip = bx >= 0.28 && bx <= 0.72 && by >= 0.26 && by <= 0.76;
  const inClipHeader = bx >= 0.38 && bx <= 0.62 && by >= 0.20 && by <= 0.28;
  const inClipPin = bx >= 0.44 && bx <= 0.56 && by >= 0.18 && by <= 0.23;

  if (inClipPin) {
    return [255, 215, 0, 255]; // Gold pin
  }
  if (inClipHeader) {
    return [30, 41, 59, 255]; // Dark slate header
  }
  if (inClip) {
    // Clipboard white paper
    // Inner margins: checkmarks and lines
    const px = bx;
    const py = by;
    // Checkmark 1: around y: 0.36
    const inLine1 = px >= 0.44 && px <= 0.64 && py >= 0.35 && py <= 0.38;
    const inLine2 = px >= 0.44 && px <= 0.64 && py >= 0.47 && py <= 0.50;
    const inLine3 = px >= 0.44 && px <= 0.64 && py >= 0.59 && py <= 0.62;

    // Check box badges
    const inBox1 = px >= 0.33 && px <= 0.39 && py >= 0.34 && py <= 0.39;
    const inBox2 = px >= 0.33 && px <= 0.39 && py >= 0.46 && py <= 0.51;
    const inBox3 = px >= 0.33 && px <= 0.39 && py >= 0.58 && py <= 0.63;

    if (inBox1 || inBox2 || inBox3) {
      return [16, 185, 129, 255]; // Emerald check mark boxes
    }
    if (inLine1 || inLine2 || inLine3) {
      return [100, 116, 139, 255]; // Gray lines
    }

    // VKU text badge in footer of paper
    if (py >= 0.68 && py <= 0.72 && px >= 0.35 && px <= 0.65) {
      return [197, 30, 30, 255]; // VKU red badge
    }

    return [255, 255, 255, 255]; // Paper
  }

  return [r, g, b, a];
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('Generating PNG icons...');
const png192 = generatePNG(192, 192, (x, y, w, h) => iconPixelShader(x, y, w, h, false));
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), png192);

const png512 = generatePNG(512, 512, (x, y, w, h) => iconPixelShader(x, y, w, h, false));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), png512);

const pngMaskable = generatePNG(512, 512, (x, y, w, h) => iconPixelShader(x, y, w, h, true));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable.png'), pngMaskable);

// Also generate SVG for crystal-clear vector rendering
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="vkuGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#DC2626"/>
      <stop offset="100%" stop-color="#991B1B"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCD34D"/>
      <stop offset="100%" stop-color="#F59E0B"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <!-- Background -->
  <rect width="512" height="512" rx="110" fill="url(#vkuGrad)"/>
  
  <!-- Clipboard Group with Shadow -->
  <g filter="url(#shadow)">
    <!-- Main board -->
    <rect x="110" y="90" width="292" height="360" rx="24" fill="#0F172A" opacity="0.25"/>
    <rect x="116" y="96" width="280" height="348" rx="20" fill="#FFFFFF"/>
    
    <!-- Top Clip -->
    <rect x="196" y="70" width="120" height="42" rx="10" fill="#1E293B"/>
    <circle cx="256" cy="84" r="10" fill="url(#goldGrad)"/>
    
    <!-- Header banner -->
    <rect x="146" y="140" width="220" height="32" rx="8" fill="#FEE2E2"/>
    <text x="256" y="162" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="900" fill="#C51E1E" text-anchor="middle">VKU FIELD SURVEY</text>
    
    <!-- Checklist items -->
    <!-- Item 1 -->
    <circle cx="166" cy="210" r="14" fill="#10B981"/>
    <path d="M160 210 L164 214 L172 206" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <rect x="196" y="202" width="160" height="16" rx="4" fill="#E2E8F0"/>
    
    <!-- Item 2 -->
    <circle cx="166" cy="260" r="14" fill="#10B981"/>
    <path d="M160 260 L164 264 L172 256" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <rect x="196" y="252" width="140" height="16" rx="4" fill="#E2E8F0"/>
    
    <!-- Item 3 -->
    <circle cx="166" cy="310" r="14" fill="#3B82F6"/>
    <path d="M160 310 L164 314 L172 306" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <rect x="196" y="302" width="170" height="16" rx="4" fill="#E2E8F0"/>
    
    <!-- Offline badge -->
    <g transform="translate(146, 356)">
      <rect width="220" height="50" rx="12" fill="#FEF3C7" stroke="#F59E0B" stroke-width="1.5"/>
      <!-- Wifi slash / offline icon -->
      <path d="M25 25 Q35 15 45 25 M30 30 Q35 25 40 30 M35 34 L35 34.5" stroke="#D97706" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <line x1="22" y1="36" x2="48" y2="14" stroke="#DC2626" stroke-width="2.5" stroke-linecap="round"/>
      <text x="60" y="31" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" fill="#92400E">OFFLINE-FIRST PWA</text>
    </g>
  </g>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent);
fs.writeFileSync(path.join(iconsDir, 'icon-192.svg'), svgContent);
fs.writeFileSync(path.join(iconsDir, 'icon-512.svg'), svgContent);

console.log('Successfully generated PNG & SVG icons!');
