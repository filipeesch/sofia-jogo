import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '_shots');
const PORT = Number(process.env.SHOTS_PORT || 4477);
fs.mkdirSync(dir, { recursive: true });

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('capture server ok');
    return;
  }
  if (req.method === 'POST') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const { filename, data } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        const safe = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
        fs.writeFileSync(path.join(dir, safe), Buffer.from(data, 'base64'));
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('saved ' + safe);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('bad request: ' + e.message);
      }
    });
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => console.log('capture server on http://localhost:' + PORT + ' -> _shots/'));
