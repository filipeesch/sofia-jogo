## Why

O viewport de debug hoje anima a câmera ao longo dos waypoints do sweep, mas um agente de IA que navega a cena precisa de frames exatos e determinísticos: a câmera deve teleportar instantaneamente para cada posição. Além disso, abrir o jogo em debug e entrar num cenário específico ainda exige passos manuais (subir servidores, adicionar `?debug=1`, clicar no launcher), então o agente não consegue dirigir o loop completo sozinho.

## What Changes

- `sweep` teleporta a câmera para cada waypoint instantaneamente e captura um frame por ponto — sem interpolação/animação entre pontos.
- O jogo aceita deep-link (`?debug=1&level=<id>&vehicle=<car|airplane>`) e inicia direto no cenário, pulando o launcher.
- Um script de lançamento (`npm run game`) sobe o capture server e o dev server quando necessário e abre o browser no deep-link em modo debug.
- O MCP do jogo passa a servir o cenário **em runtime**: `load_level` troca de cenário sem recarregar a página, `list_levels` devolve os cenários do jogo e `list_captures` lista o que já foi capturado.

## Capabilities

### New Capabilities
- `debug-capture`: controle de câmera em runtime (teleporte instantâneo) e captura de frames/vídeo via capture server.
- `game-launch`: boot por deep-link de cenário e lançamento do jogo em debug dirigido por agente.

### Modified Capabilities

## Impact

- `src/debug/DebugCapture.ts` (sweep → teleporte instantâneo).
- `src/main.ts` (boot via query params).
- `scripts/launch-game.mjs` (novo) + `package.json` (script `game`).
- `scripts/capture-server.mjs` inalterado (já faz o relay de comandos). Já `scripts/game-mcp.mjs` mudou: a descrição do `sweep` passou a dizer teleporte, e as tools de runtime `load_level` / `list_levels` / `list_captures` passaram a servir o jogo em execução. `scripts/test-mcp.mjs` é novo e testa o servidor por stdio.

> **Nota da verificação antes do arquivo.** `list_levels` tinha uma lista de cenários escrita à mão, que é precisamente o género de cópia que envelhece sozinha — passou a ler `src/levels.ts`, com a lista antiga como rede de segurança se o formato do ficheiro mudar. E o `test-mcp.mjs` passou a correr, por omissão, só as tools de leitura: `record`, `sweep` e `load_level` alteram o jogo em curso, e um teste que mexe na cena não se pode correr enquanto um agente está a meio de uma captura. Ficou `npm run test:mcp` (seguro) e `npm run test:mcp:live` (com as que alteram).
