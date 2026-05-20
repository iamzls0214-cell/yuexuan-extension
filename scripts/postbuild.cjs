// Post-build: copy manifest and generate PNG icons
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const args = process.argv.slice(2);
const mode = args[0] || 'chrome';
const distDir = path.join(__dirname, '..', 'dist', mode);
const assetsDir = path.join(distDir, 'assets');

// Copy manifest
const manifestSrc = path.join(__dirname, '..', 'src', `manifest.${mode}.json`);
if (fs.existsSync(manifestSrc)) {
  fs.copyFileSync(manifestSrc, path.join(distDir, 'manifest.json'));
  console.log(`Copied manifest.${mode}.json → dist/${mode}/manifest.json`);
}

// Generate PNG icons
function createPNG(width, height, drawFn) {
  const rawData = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    rawData[y * (width * 4 + 1)] = 0;
    for (let x = 0; x < width; x++) {
      const off = y * (width * 4 + 1) + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[off] = r; rawData[off + 1] = g; rawData[off + 2] = b; rawData[off + 3] = a;
    }
  }
  const deflated = zlib.deflateSync(rawData);

  function crc32(buf) {
    let c, table = [];
    for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); table[n] = c; }
    c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const typeB = Buffer.from(type, 'ascii');
    const crcData = Buffer.concat([typeB, data]);
    const crcVal = Buffer.alloc(4); crcVal.writeUInt32BE(crc32(crcData), 0);
    return Buffer.concat([len, typeB, data, crcVal]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', deflated), chunk('IEND', Buffer.alloc(0))]);
}

function draw(x, y, w, h) {
  const cx = w / 2, cy = h / 2;
  const r = Math.min(w, h) * 0.22;
  const pad = Math.min(w, h) * 0.12;
  if (x < pad || x >= w - pad || y < pad || y >= h - pad) {
    const dx = Math.abs(x - cx) - (w / 2 - pad - r);
    const dy = Math.abs(y - cy) - (h / 2 - pad - r);
    if (dx > 0 && dy > 0 && dx * dx + dy * dy > r * r) return [15, 23, 42, 255];
    if (dx > 0 || dy > 0) {
      if (dx > 0 && dy > 0 && dx * dx + dy * dy <= r * r) return [0, 212, 170, 255];
      if (dx <= 0 && dy <= 0) return [0, 212, 170, 255];
      return [15, 23, 42, 255];
    }
    return [0, 212, 170, 255];
  }
  return [0, 212, 170, 255];
}

for (const [name, size] of [['icon-16', 16], ['icon-48', 48], ['icon-128', 128]]) {
  const png = createPNG(size, size, draw);
  fs.writeFileSync(path.join(assetsDir, `${name}.png`), png);
  console.log(`Generated ${name}.png (${size}x${size})`);
}

console.log('Post-build complete!');
