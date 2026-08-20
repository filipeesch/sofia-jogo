import { defineConfig } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Dev-only endpoint used by the map editor's "Salvar" button:
//   POST /save-level  body: { id, data }
// writes public/levels/<id>.json, which the game picks up at load time
// (src/main.ts -> resolveLevelData). In production builds the editor falls
// back to localStorage + JSON download.
function editorLevelsSave() {
  return {
    name: 'editor-levels-save',
    apply: 'serve' as const,
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'POST' || req.url !== '/save-level') return next();
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => {
          void (async () => {
            try {
              const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { id?: unknown; data?: unknown };
              const id = typeof body.id === 'string' ? body.id : '';
              if (!/^[a-z0-9-]{1,40}$/.test(id) || !body.data) {
                res.statusCode = 400;
                res.end(JSON.stringify({ ok: false, error: 'id inválido ou data ausente' }));
                return;
              }
              const dir = join(process.cwd(), 'public', 'levels');
              await mkdir(dir, { recursive: true });
              await writeFile(join(dir, `${id}.json`), JSON.stringify(body.data, null, 2));
              res.statusCode = 200;
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify({ ok: true, file: `public/levels/${id}.json` }));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify({ ok: false, error: String(err) }));
            }
          })();
        });
      });
    }
  };
}

export default defineConfig({
  base: './',
  build: {
    target: 'es2020'
  },
  plugins: [editorLevelsSave()]
});
