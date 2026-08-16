import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

const WS = process.cwd();
const proc = spawn('npx', ['--yes','-p','@playwright/mcp','playwright-mcp','--headless','--browser','chromium','--output-dir', WS + '/_shots'], {
  stdio: ['pipe','pipe','pipe'],
  cwd: WS,
  env: {
    ...process.env,
    NPM_CONFIG_REGISTRY: 'https://registry.npmjs.org',
    npm_config_registry: 'https://registry.npmjs.org',
    npm_config_cache: WS + '/.npm-cache-pw'
  }
});
const rl = createInterface({ input: proc.stdout });
const pending = new Map();
let nextId = 1;
let stderrText = '';
rl.on('line', (line) => {
  let m; try { m = JSON.parse(line); } catch { return; }
  if (m.id != null && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
proc.stderr.on('data', (d) => { stderrText += d.toString(); });
const call = (method, params) => new Promise((res) => {
  const id = nextId++;
  pending.set(id, res);
  proc.stdin.write(JSON.stringify({ jsonrpc:'2.0', id, method, params }) + '\n');
});
try {
  await call('initialize', { protocolVersion:'2024-11-05', capabilities:{}, clientInfo:{ name:'t', version:'1' } });
  const nav = await call('tools/call', { name:'browser_navigate', arguments:{ url:'http://localhost:5173/?debug=1&level=vale&vehicle=car' } });
  console.log('NAV:', JSON.stringify(nav.result?.content?.[0]?.text || nav.error?.message || nav.error || '?').slice(0, 240));
  const shot = await call('tools/call', { name:'browser_take_screenshot', arguments:{ filename:'pw_mcp_e2e.png' } });
  console.log('SHOT:', JSON.stringify(shot.result?.content?.[0]?.text || shot.error?.message || shot.error || '?').slice(0, 320));
  const close = await call('tools/call', { name:'browser_close', arguments:{} });
  console.log('CLOSE:', JSON.stringify(close.result?.content?.[0]?.text || close.error?.message || close.error || '?').slice(0, 120));
} catch (e) {
  console.log('ERR:', e && e.message);
}
console.log('STDERR_TAIL:', stderrText.slice(-400));
proc.kill();
process.exit(0);
