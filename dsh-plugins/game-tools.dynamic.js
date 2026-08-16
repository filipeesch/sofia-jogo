// ============================================================================
// Plugin dinâmico DSH — tools nativas de controle do jogo (Avião Aventureiro).
//
// Uso: cole o bloco entre as marcas === PASTE AQUI === como code.host no
// cordis_define (kind: "new", idPrefix 3–6 letras), depois cordis_run.
// É o BODY de uma async function que retorna um Plugin Cordis.
// Plain JavaScript: SEM import/require/TypeScript/JSX.
//
// Fatos do sandbox dinâmico (dsh-cordis-host-runner):
//   - fetch É BLOQUEADO. Rede vai por inject ['web'] (ctx.web) — mas ctx.web é
//     GET-only. Por isso os POSTs ao capture-server usam inject ['bash'] (ctx.bash) + curl.
//   - harness.defineTool / harness.registerTool são fornecidos pelo sandbox.
//   - ctx é o argumento de apply(ctx) (façade restrito); harness é global do sandbox.
//
// ANTES DE RODAR: confirme com cordis_inspect_query (Service.listService) o
// método exato do serviço 'bash' (run/resolve). Se a assinatura for diferente,
// ajuste só a função curl() abaixo.
// ============================================================================

// === PASTE AQUI ===
return {
  inject: ['bash'],
  apply(ctx) {
    const SERVER = 'http://localhost:4477';

    const LEVELS = [
      { id: 'vale', name: 'Vale Vivo', vehicle: 'both' },
      { id: 'valenoite', name: 'Vale à Noite', vehicle: 'both' },
      { id: 'ilha', name: 'Ilha Feliz', vehicle: 'airplane' },
      { id: 'montanhas', name: 'Vale das Montanhas', vehicle: 'both' },
      { id: 'neve', name: 'Mundo da Neve', vehicle: 'both' },
      { id: 'deserto', name: 'Deserto', vehicle: 'both' },
      { id: 'noite', name: 'Noite Estrelada', vehicle: 'both' }
    ];

    async function curl(command) {
      const req = { command, timeoutMs: 10000 };
      const res = typeof ctx.bash.resolve === 'function'
        ? await ctx.bash.run(ctx.bash.resolve(req))
        : await ctx.bash.run(req);
      const out = res && res.stdout;
      if (out == null) return '';
      return typeof out === 'string' ? out : (out.text || '');
    }

    function post(path, body) {
      const json = JSON.stringify(body);
      return curl("curl -s -m 10 -X POST '" + SERVER + path + "' -H 'Content-Type: application/json' -d '" + json + "'");
    }

    function get(path) {
      return curl("curl -s -m 10 '" + SERVER + path + "'");
    }

    function def(name, description, parameters, execute) {
      harness.registerTool(ctx, harness.defineTool({
        name,
        description,
        parameters,
        output: {
          schema: { type: 'string' },
          render: (_args, value) => [{ type: 'text', text: value }]
        },
        execute
      }));
    }

    def('game_set_view',
      'Move a câmera do jogo para (px,py,pz) olhando para (tx,ty,tz), sem capturar.',
      { px: { type: 'number', required: true }, py: { type: 'number', required: true }, pz: { type: 'number', required: true },
        tx: { type: 'number', required: true }, ty: { type: 'number', required: true }, tz: { type: 'number', required: true } },
      async (args) => {
        await post('/cmd', { cmd: 'setView', args: [args.px, args.py, args.pz, args.tx, args.ty, args.tz] });
        return 'camera moved';
      });

    def('game_set_view_and_snap',
      'Posiciona a câmera e captura um PNG em _shots/<filename>.',
      { px: { type: 'number', required: true }, py: { type: 'number', required: true }, pz: { type: 'number', required: true },
        tx: { type: 'number', required: true }, ty: { type: 'number', required: true }, tz: { type: 'number', required: true },
        filename: { type: 'string' } },
      async (args) => {
        const fn = args.filename || ('v_' + Date.now() + '.png');
        await post('/cmd', { cmd: 'viewSnap', args: [args.px, args.py, args.pz, args.tx, args.ty, args.tz, fn] });
        return 'captured -> _shots/' + fn;
      });

    def('game_snap',
      'Captura o frame atual do jogo em _shots/<filename>.png.',
      { filename: { type: 'string' } },
      async (args) => {
        const fn = args.filename || ('s_' + Date.now() + '.png');
        await post('/cmd', { cmd: 'snap', args: [fn] });
        return 'snap -> _shots/' + fn;
      });

    def('game_record',
      'Grava um vídeo de N segundos do jogo (webm em _shots/).',
      { seconds: { type: 'number' } },
      async (args) => {
        const s = args.seconds || 10;
        await post('/cmd', { cmd: 'record', args: [s] });
        return 'recording ' + s + 's';
      });

    def('game_sweep',
      'Teleporta a câmera por vários pontos [px,py,pz,tx,ty,tz] capturando um PNG em cada um (sem animação).',
      { points: { type: 'json', required: true } },
      async (args) => {
        await post('/cmd', { cmd: 'sweep', args: [args.points] });
        return 'sweep started';
      });

    def('game_resume_chase',
      'Volta a câmera a seguir o veículo (encerra o modo livre).',
      {},
      async () => {
        await post('/cmd', { cmd: 'resumeChase', args: [] });
        return 'chase resumed';
      });

    def('game_list_captures',
      'Lista os arquivos capturados em _shots/.',
      {},
      async () => get('/list'));

    def('game_list_levels',
      'Lista os cenários disponíveis (id, nome, veículo permitido).',
      {},
      async () => JSON.stringify(LEVELS));

    def('game_load_level',
      'Troca o cenário em runtime (level id + vehicle car|airplane), sem recarregar a página.',
      { level: { type: 'string', required: true }, vehicle: { type: 'string' } },
      async (args) => {
        await post('/cmd', { cmd: 'loadLevel', args: [args.level, args.vehicle] });
        return 'loading level ' + args.level + (args.vehicle ? ' (' + args.vehicle + ')' : '');
      });
  }
};
// === FIM PASTE AQUI ===

