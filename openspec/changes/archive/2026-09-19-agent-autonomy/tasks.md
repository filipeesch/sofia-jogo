## 1. Instant camera teleport

- [x] 1.1 Reescrever DebugCapture.sweep/update para teleportar + snap em cada waypoint (remover lerp)
- [x] 1.2 Manter chase desativado após um sweep e deixar a câmera no último waypoint

## 2. Scenario deep-link

- [x] 2.1 Parsear `level`/`vehicle`/`debug` em main.ts e iniciar direto no cenário
- [x] 2.2 Fixar vehicle para níveis exclusivos de avião

## 3. Agent launch script

- [x] 3.1 Adicionar scripts/launch-game.mjs (sondar + spawnar capture server & vite, abrir deep-link)
- [x] 3.2 Adicionar script npm `game`

## 4. Verify & ship

- [x] 4.1 Typecheck/build
- [x] 4.2 Smoke test MCP (boot por deep-link + sweep instantâneo)
- [x] 4.3 git commit + push
