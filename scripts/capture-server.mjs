import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '_shots');
const PORT = Number(process.env.SHOTS_PORT || 4477);
fs.mkdirSync(dir, { recursive: true });

// ids monotônicos (nunca reiniciam para trás), para o cursor do cliente sobreviver a reinícios
let cmdSeq = Date.now();
const queue = [];

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'GET' && url.pathname === '/list') {
    const files = fs.readdirSync(dir).sort();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(files));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/cmd') {
    const since = Number(url.searchParams.get('since') || 0);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(queue.filter((c) => c.id > since)));
    return;
  }

  // Apaga a fila (útil ao recarregar a página: cada página nova reprocessa
  // toda a fila a partir do cursor 0).
  if (req.method === 'DELETE' && url.pathname === '/cmd') {
    const n = queue.length;
    queue.length = 0;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, cleared: n }));
    return;
  }

  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('capture server ok');
    return;
  }

  if (req.method === 'POST' && url.pathname === '/cmd') {
    try {
      const body = JSON.parse(await readBody(req));
      const cmd = { id: ++cmdSeq, cmd: body.cmd, args: body.args ?? [] };
      queue.push(cmd);
      if (queue.length > 500) queue.shift();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, id: cmd.id }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('bad request: ' + e.message);
    }
    return;
  }

  if (req.method === 'POST' && (url.pathname === '/shot' || url.pathname === '/clip')) {
    try {
      const { filename, data } = JSON.parse(await readBody(req));
      const safe = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
      fs.writeFileSync(path.join(dir, safe), Buffer.from(data, 'base64'));
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('saved ' + safe);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('bad request: ' + e.message);
    }
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => console.log('capture server on http://localhost:' + PORT + ' -> _shots/ (cmds via POST /cmd)'));
