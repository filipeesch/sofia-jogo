#!/usr/bin/env node
// Agent-driven launcher: garante capture server (4477) + dev server (5173) no ar,
// depois abre o browser num deep-link de debug para um cenário.
// Uso: node scripts/launch-game.mjs [level] [vehicle] [--no-debug]
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS_PORT = Number(process.env.SHOTS_PORT || 4477);
const DEV_PORT = Number(process.env.DEV_PORT || 5173);

function parseArgs(argv) {
  let level = 'vale';
  let vehicle = 'car';
  let debug = true;
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--level' || a === '-l') level = argv[++i] ?? level;
    else if (a === '--vehicle' || a === '-v') vehicle = argv[++i] ?? vehicle;
    else if (a === '--no-debug') debug = false;
    else if (!a.startsWith('-')) positional.push(a);
  }
  if (positional[0]) level = positional[0];
  if (positional[1]) vehicle = positional[1];
  return { level, vehicle, debug };
}

async function isUp(port) {
  try {
    await fetch(`http://localhost:${port}/`);
    return true;
  } catch {
    return false;
  }
}

async function ensure(name, port, command, args) {
  if (await isUp(port)) {
    console.log(`[launch] ${name} já no ar (porta ${port})`);
    return;
  }
  console.log(`[launch] subindo ${name} (porta ${port})…`);
  spawn(command, args, { cwd: ROOT, stdio: 'inherit', detached: true }).unref();
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await isUp(port)) {
      console.log(`[launch] ${name} pronto.`);
      return;
    }
  }
  console.warn(`[launch] ${name} não respondeu na porta ${port} após 30s`);
}

const { level, vehicle, debug } = parseArgs(process.argv.slice(2));

await ensure('capture server', SHOTS_PORT, process.execPath, [path.join(ROOT, 'scripts', 'capture-server.mjs')]);
await ensure('dev server', DEV_PORT, process.execPath, [path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(DEV_PORT), '--strictPort']);

const query = new URLSearchParams();
if (debug) query.set('debug', '1');
query.set('level', level);
query.set('vehicle', vehicle);
const url = `http://localhost:${DEV_PORT}/?${query.toString()}`;

if (process.platform === 'darwin') spawn('open', [url], { stdio: 'ignore' });
else if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore' });
else spawn('xdg-open', [url], { stdio: 'ignore' });

console.log(`[launch] abrindo ${url}`);
