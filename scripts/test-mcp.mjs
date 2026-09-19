// Tests the game MCP server over stdio: initialize, tools/list, ping and the
// read-only tools. Pass `--live` to also exercise the tools that move the
// running game (set_view, snap, record, sweep, load_level).
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
// `>= 9`, não `=== 9`: uma tool nova não é uma regressão, e um teste que quebra
// a cada ferramenta passa a ser ignorado — que é o que acontece a testes que
// acusam tudo.
results.push(['tools/list (' + (tl.result?.tools?.length ?? 0) + ' tools)', (tl.result?.tools?.length ?? 0) >= 9 ? 'PASS' : 'FAIL']);

const ping = await call('ping', {});
results.push(['ping', ping.result !== undefined ? 'PASS' : 'FAIL']);

// Só o que não mexe na cena corre por omissão. `record`, `sweep` e `load_level`
// alteram o jogo em curso: corridos enquanto um agente está a meio de uma
// captura, estragavam-lhe os frames. Passam com `--live`.
const live = process.argv.includes('--live');
const chamadas = [
  ['list_captures', {}],
  ['list_levels', {}]
];
if (live) {
  chamadas.push(
    ['set_view', { px: 8, py: 6, pz: 8, tx: 0, ty: 0, tz: 0 }],
    ['set_view_and_snap', { px: 8, py: 6, pz: 8, tx: 0, ty: 0, tz: 0, filename: 't_vila.png' }],
    ['snap', { filename: 't_frame.png' }],
    ['record', { seconds: 2 }],
    ['sweep', { points: [[8, 6, 8, 0, 0, 0], [10, 10, 30, -70, 2, 40]] }],
    ['resume_chase', {}],
    ['load_level', { level: 'neve', vehicle: 'car' }]
  );
}

for (const [name, args] of chamadas) {
  const r = await call('tools/call', { name, arguments: args });
  const ok = !r.error && r.result?.content?.[0]?.type === 'text';
  const txt = r.error ? 'ERR: ' + r.error.message : r.result.content[0].text.slice(0, 55);
  results.push([name, ok ? 'PASS' : 'FAIL', txt]);
  // Um `list_levels` vazio ou com ids repetidos é exactamente a avaria que este
  // teste existe para apanhar, e um PASS de "texto presente" não a apanhava.
  if (name === 'list_levels' && ok) {
    let niveis = [];
    try { niveis = JSON.parse(r.result.content[0].text); } catch { /* counted below */ }
    const ids = niveis.map(n => n.id);
    const bom = niveis.length > 0 && new Set(ids).size === ids.length &&
      niveis.every(n => n.name && ['both', 'airplane', 'car'].includes(n.vehicle));
    results.push(['list_levels (conteúdo)', bom ? 'PASS' : 'FAIL', ids.join(',')]);
  }
}
if (!live) results.push(['chamadas que alteram a cena', 'SKIP', 'correr com --live para as testar']);

proc.kill();
console.log(JSON.stringify(results, null, 1));
