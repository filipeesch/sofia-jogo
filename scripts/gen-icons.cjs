const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function encodePNG(w, h, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function generate(size) {
  const S = size;
  const buf = Buffer.alloc(S * S * 4);
  function set(x, y, r, g, b, a) {
    if (x < 0 || y < 0 || x >= S || y >= S) return;
    const i = (y * S + x) * 4;
    buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
  }
  for (let i = 0; i < S * S; i++) { buf[i * 4] = 0x54; buf[i * 4 + 1] = 0xb3; buf[i * 4 + 2] = 0xf0; buf[i * 4 + 3] = 255; }

  const s = S / 512;
  const P = (x, y) => [x * s, y * s];

  // sun
  const sun = P(108, 108);
  const sunR = 58 * s;
  for (let y = Math.floor(sun[1] - sunR); y <= sun[1] + sunR; y++) {
    for (let x = Math.floor(sun[0] - sunR); x <= sun[0] + sunR; x++) {
      const dx = x - sun[0], dy = y - sun[1];
      if (dx * dx + dy * dy <= sunR * sunR) set(x, y, 0xff, 0xd5, 0x4a, 255);
    }
  }

  function fillTri(p1, p2, p3, col) {
    const minX = Math.max(0, Math.floor(Math.min(p1[0], p2[0], p3[0])));
    const maxX = Math.min(S - 1, Math.ceil(Math.max(p1[0], p2[0], p3[0])));
    const minY = Math.max(0, Math.floor(Math.min(p1[1], p2[1], p3[1])));
    const maxY = Math.min(S - 1, Math.ceil(Math.max(p1[1], p2[1], p3[1])));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const d1 = (p2[0] - p1[0]) * (y - p1[1]) - (p2[1] - p1[1]) * (x - p1[0]);
        const d2 = (p3[0] - p2[0]) * (y - p2[1]) - (p3[1] - p2[1]) * (x - p2[0]);
        const d3 = (p1[0] - p3[0]) * (y - p3[1]) - (p1[1] - p3[1]) * (x - p3[0]);
        const neg = (d1 < 0) || (d2 < 0) || (d3 < 0);
        const pos = (d1 > 0) || (d2 > 0) || (d3 > 0);
        if (!(neg && pos)) set(x, y, col[0], col[1], col[2], 255);
      }
    }
  }

  const white = [255, 255, 255];
  const nose = P(452, 256);
  const top = P(156, 58);
  const notch = P(138, 256);
  const bot = P(156, 454);
  fillTri(nose, top, notch, white);
  fillTri(nose, notch, bot, white);

  return encodePNG(S, S, buf);
}

const outDir = path.join(__dirname, '..', 'public');
fs.writeFileSync(path.join(outDir, 'icon-192.png'), generate(192));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), generate(512));
console.log('icons generated at', outDir);
