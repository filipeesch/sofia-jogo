#!/usr/bin/env node
// MCP server (stdio, newline-delimited JSON-RPC) that exposes the game debug
// viewport as tools. Each tool forwards to the HTTP capture server
// (scripts/capture-server.mjs, port 4477) which relays to the running game.
import { createInterface } from 'node:readline';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER = 'http://localhost:' + (process.env.SHOTS_PORT || '4477');

// `list_levels` serve a lista que um agente usa para descobrir cenários, por
// isso tem de ser a mesma lista que o jogo joga. `src/levels.ts` é a fonte de
// verdade; a cópia à mão lá embaixo fica só como rede de segurança se o formato
// do ficheiro mudar, porque um MCP partido a meio de uma verificação é pior do
// que uma lista ligeiramente envelhecida.
const LEVELS_FALLBACK = [
  { id: 'vale', name: 'Vale Vivo', emoji: '🌄', vehicle: 'both' },
  { id: 'valenoite', name: 'Vale à Noite', emoji: '🌙', vehicle: 'both' },
  { id: 'ilha', name: 'Ilha Feliz', emoji: '🌴', vehicle: 'airplane' },
  { id: 'montanhas', name: 'Vale das Montanhas', emoji: '⛰️', vehicle: 'both' },
  { id: 'neve', name: 'Mundo da Neve', emoji: '❄️', vehicle: 'both' },
  { id: 'deserto', name: 'Deserto', emoji: '🏜️', vehicle: 'both' },
  { id: 'noite', name: 'Noite Estrelada', emoji: '⭐', vehicle: 'both' }
];

let levelsCache = null;

function levels() {
  if (levelsCache) return levelsCache;
  try {
    const caminho = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'levels.ts');
    const fonte = readFileSync(caminho, 'utf8');
    const inicio = fonte.indexOf('export const LEVELS');
    if (inicio < 0) throw new Error('sem `export const LEVELS`');
    const fim = fonte.indexOf('\n];', inicio);
    // Cada cenário é um objecto a duas espaços de indentação; ler campo a campo
    // por bloco evita que um campo em falta faça a regex saltar para o cenário
    // seguinte e invente uma combinação que não existe.
    const blocos = fonte.slice(inicio, fim).split(/\n {2}\{/).slice(1);
    const saida = [];
    for (const b of blocos) {
      const id = /id:\s*'([^']+)'/.exec(b);
      const name = /name:\s*'([^']+)'/.exec(b);
      if (!id || !name) continue;
      const emoji = /emoji:\s*'([^']*)'/.exec(b);
      const vehicle = /vehicle:\s*'([^']+)'/.exec(b);
      saida.push({ id: id[1], name: name[1], emoji: emoji ? emoji[1] : '', vehicle: vehicle ? vehicle[1] : 'both' });
    }
    if (saida.length === 0) throw new Error('nenhum cenário lido');
    levelsCache = saida;
  } catch (e) {
    console.error('[game-mcp] fallback para a lista embutida:', e.message);
    levelsCache = LEVELS_FALLBACK;
  }
  return levelsCache;
}

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
    description: 'Teleporta a câmera por vários pontos [px,py,pz,tx,ty,tz] capturando um PNG em cada um (sem animação entre pontos).',
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
  },
  {
    name: 'list_levels',
    description: 'Lista os cenários disponíveis (id, nome, veículo permitido).',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'load_level',
    description: 'Troca o cenário em runtime (level id + vehicle car|airplane), sem recarregar a página.',
    inputSchema: { type: 'object', properties: { level: { type: 'string' }, vehicle: { type: 'string' } }, required: ['level'] }
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
      case 'list_levels':
        text = JSON.stringify(levels());
        break;
      case 'load_level':
        await httpPost('/cmd', { cmd: 'loadLevel', args: [args.level, args.vehicle] });
        text = 'loading level ' + args.level + (args.vehicle ? ' (' + args.vehicle + ')' : '');
        break;
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
