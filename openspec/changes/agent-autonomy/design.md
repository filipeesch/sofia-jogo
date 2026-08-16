## Context

O viewport de debug já faz relay de comandos via HTTP (`scripts/capture-server.mjs` na 4477) e o jogo faz polling de `/cmd`. O chase da câmera é desativado enquanto um comando de debug está ativo. `main.ts` sempre mostra o launcher no boot. Ver proposal.md - Why.

## Goals / Non-Goals

**Goals:**
- Posicionamento de câmera determinístico e instantâneo para capturas do agente.
- Boot dirigido por agente, com um único comando, direto num cenário em debug.

**Non-Goals:**
- Nenhuma integração nova de LLM/provider; o caminho de lançamento é um script Node puro.
- Nenhuma mudança nos contratos de node-name dos GLBs do Blender nem no conteúdo do jogo.

## Decisions

1. **Sweep = um teleporte + snap por frame.** Substituir o lerp de `sweepT` em `DebugCapture.update` por: pegar o próximo waypoint, `camera.position.set` + `lookAt`, chamar `snap('sweep_<i>.png')` e avançar. `postRender()` captura o frame recém-renderizado, então cada ponto é exato. (Alternativa: manter lerp — rejeitada, gera motion blur e frames não determinísticos.)

2. **Deep-link via query params.** Adicionar `level` e `vehicle` tratados em `main.ts` antes de `launcher.show()`, reutilizando o caminho existente `startLevel(id, vehicleType)`. (Alternativa: um HTML de entrada separado — rejeitada, mais peças móveis.)

3. **Script de lançamento sobe só o que falta.** `scripts/launch-game.mjs` sonda 4477 e 5173 primeiro e só spawna o capture server / `vite` quando estiverem fora, depois `open` o deep-link. (Alternativa: sempre spawnar — rejeitada, colidiria com um dev server já rodando.)

## Risks / Trade-offs

- [Porta 5173 já em uso por outro vite] → sondar antes de spawnar; pular o spawn se já responde.
- [`open` varia por OS] → script é macOS-first (a máquina de dev); documentar `open` vs `xdg-open`.
- [Deep-link com nível exclusivo de avião + `vehicle=car`] → fixar o veículo ao tipo permitido do nível.

## Migration Plan

Nenhuma — aditivo. `?debug=1` existente e o comportamento do launcher não mudam quando não há `level`.

## Open Questions

Nenhuma.
