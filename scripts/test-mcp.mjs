// Tests the game MCP server over stdio: initialize, tools/list, ping and every tool.
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

const proc = spawn('node', ['scripts/game-mcp.mjs'], { cwd: process.cwd() });
const rl = createInterface({ input: proc.stdout });
const pending = new Map();

rl.on('line', (line) => {
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  if (msg.id != null && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});

let nextId = 1;
function call(method, params) {
  return new Promise((resolve) => {
    const id = nextId++;
    pending.set(id, resolve);
    proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

const results = [];

const init = await call('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 't', version: '1' } });
results.push(['initialize', init.result?.protocolVersion === '2024-11-05' ? 'PASS' : 'FAIL']);

const tl = await call('tools/list', {});
results.push(['tools/list (' + (tl.result?.tools?.length ?? 0) + ' tools)', tl.result?.tools?.length === 9 ? 'PASS' : 'FAIL']);

const ping = await call('ping', {});
results.push(['ping', ping.result !== undefined ? 'PASS' : 'FAIL']);

for (const [name, args] of [
  ['set_view', { px: 8, py: 6, pz: 8, tx: 0, ty: 0, tz: 0 }],
  ['set_view_and_snap', { px: 8, py: 6, pz: 8, tx: 0, ty: 0, tz: 0, filename: 't_vila.png' }],
  ['snap', { filename: 't_frame.png' }],
  ['record', { seconds: 2 }],
  ['sweep', { points: [[8, 6, 8, 0, 0, 0], [10, 10, 30, -70, 2, 40]] }],
  ['resume_chase', {}],
  ['list_captures', {}],
  ['list_levels', {}],
  ['load_level', { level: 'neve', vehicle: 'car' }]
]) {
  const r = await call('tools/call', { name, arguments: args });
  const ok = !r.error && r.result?.content?.[0]?.type === 'text';
  const txt = r.error ? 'ERR: ' + r.error.message : r.result.content[0].text.slice(0, 55);
  results.push([name, ok ? 'PASS' : 'FAIL', txt]);
}

proc.kill();
console.log(JSON.stringify(results, null, 1));
