## Why

O viewport de debug hoje anima a câmera ao longo dos waypoints do sweep, mas um agente de IA que navega a cena precisa de frames exatos e determinísticos: a câmera deve teleportar instantaneamente para cada posição. Além disso, abrir o jogo em debug e entrar num cenário específico ainda exige passos manuais (subir servidores, adicionar `?debug=1`, clicar no launcher), então o agente não consegue dirigir o loop completo sozinho.

## What Changes

- `sweep` teleporta a câmera para cada waypoint instantaneamente e captura um frame por ponto — sem interpolação/animação entre pontos.
- O jogo aceita deep-link (`?debug=1&level=<id>&vehicle=<car|airplane>`) e inicia direto no cenário, pulando o launcher.
- Um script de lançamento (`npm run game`) sobe o capture server e o dev server quando necessário e abre o browser no deep-link em modo debug.

## Capabilities

### New Capabilities
- `debug-capture`: controle de câmera em runtime (teleporte instantâneo) e captura de frames/vídeo via capture server.
- `game-launch`: boot por deep-link de cenário e lançamento do jogo em debug dirigido por agente.

### Modified Capabilities

## Impact

- `src/debug/DebugCapture.ts` (sweep → teleporte instantâneo).
- `src/main.ts` (boot via query params).
- `scripts/launch-game.mjs` (novo) + `package.json` (script `game`).
- `scripts/capture-server.mjs` / `scripts/game-mcp.mjs` inalterados (já fazem o relay de comandos + tools).
