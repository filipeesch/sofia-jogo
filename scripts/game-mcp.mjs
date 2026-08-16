#!/usr/bin/env node
// MCP server (stdio, newline-delimited JSON-RPC) that exposes the game debug
// viewport as tools. Each tool forwards to the HTTP capture server
// (scripts/capture-server.mjs, port 4477) which relays to the running game.
import { createInterface } from 'node:readline';

const SERVER = 'http://localhost:' + (process.env.SHOTS_PORT || '4477');

const TOOLS = [
  {
    name: 'set_view_and_snap',
    description: 'Posiciona a câmera do jogo olhando para um alvo (px,py,pz,tx,ty,tz) e captura um PNG em _shots/<filename>.',
    inputSchema: { type: 'object', properties: { px: { type: 'number' }, py: { type: 'number' }, pz: { type: 'number' }, tx: { type: 'number' }, ty: { type: 'number' }, tz: { type: 'number' }, filename: { type: 'string' } }, required: ['px', 'py', 'pz', 'tx', 'ty', 'tz'] }
  },
  {
    name: 'set_view',
    description: 'Move a câmera livre do jogo para (px,py,pz) olhando para (tx,ty,tz), sem capturar.',
    inputSchema: { type: 'object', properties: { px: { type: 'number' }, py: { type: 'number' }, pz: { type: 'number' }, tx: { type: 'number' }, ty: { type: 'number' }, tz: { type: 'number' } }, required: ['px', 'py', 'pz', 'tx', 'ty', 'tz'] }
  },
  {
    name: 'snap',
    description: 'Captura o frame atual do jogo em _shots/<filename>.png.',
    inputSchema: { type: 'object', properties: { filename: { type: 'string' } } }
  },
  {
    name: 'record',
    description: 'Grava um vídeo de N segundos do jogo (webm em _shots/).',
    inputSchema: { type: 'object', properties: { seconds: { type: 'number' } } }
  },
  {
    name: 'sweep',
    description: 'Voa a câmera por vários pontos [px,py,pz,tx,ty,tz] capturando um PNG em cada um.',
    inputSchema: { type: 'object', properties: { points: { type: 'array', items: { type: 'array', items: { type: 'number' } } } }, required: ['points'] }
  },
  {
    name: 'resume_chase',
    description: 'Volta a câmera a seguir o veículo (encerra o modo livre).',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'list_captures',
    description: 'Lista os arquivos capturados em _shots/.',
    inputSchema: { type: 'object', properties: {} }
  }
];

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

async function httpPost(path, body) {
  const res = await fetch(SERVER + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return await res.text();
}

async function handleCall(id, name, args) {
  try {
    let text;
    switch (name) {
      case 'set_view_and_snap': {
        const fn = args.filename || 'v_' + Date.now() + '.png';
        await httpPost('/cmd', { cmd: 'viewSnap', args: [args.px, args.py, args.pz, args.tx, args.ty, args.tz, fn] });
        text = 'captured -> _shots/' + fn + ' (aguarde ~1s e leia com read_image)';
        break;
      }
      case 'set_view':
        await httpPost('/cmd', { cmd: 'setView', args: [args.px, args.py, args.pz, args.tx, args.ty, args.tz] });
        text = 'camera moved';
        break;
      case 'snap': {
        const fn = args.filename || 's_' + Date.now() + '.png';
        await httpPost('/cmd', { cmd: 'snap', args: [fn] });
        text = 'snap -> _shots/' + fn;
        break;
      }
      case 'record': {
        const s = args.seconds || 10;
        await httpPost('/cmd', { cmd: 'record', args: [s] });
        text = 'recording ' + s + 's';
        break;
      }
      case 'sweep':
        await httpPost('/cmd', { cmd: 'sweep', args: [args.points] });
        text = 'sweep started';
        break;
      case 'resume_chase':
        await httpPost('/cmd', { cmd: 'resumeChase', args: [] });
        text = 'chase resumed';
        break;
      case 'list_captures': {
        const res = await fetch(SERVER + '/list');
        text = await res.text();
        break;
      }
      default:
        send({ jsonrpc: '2.0', id, error: { code: -32601, message: 'unknown tool: ' + name } });
        return;
    }
    send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } });
  } catch (e) {
    send({ jsonrpc: '2.0', id, error: { code: -32000, message: 'capture server offline? rode: npm run shots. ' + e.message } });
  }
}

const rl = createInterface({ input: process.stdin, terminal: false });
rl.on('line', (line) => {
  line = line.trim();
  if (!line) return;
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  const { id, method, params } = msg;
  if (method === 'initialize') {
    send({ jsonrpc: '2.0', id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'game-capture', version: '1.0.0' } } });
  } else if (method === 'ping') {
    send({ jsonrpc: '2.0', id, result: {} });
  } else if (method === 'tools/list') {
    send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
  } else if (method === 'tools/call') {
    void handleCall(id, params?.name, params?.arguments ?? {});
  } else if (!method?.startsWith('notifications/')) {
    send({ jsonrpc: '2.0', id, result: {} });
  }
});
