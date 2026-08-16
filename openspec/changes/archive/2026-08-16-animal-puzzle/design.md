## Context

O `AnimalsApp` atual monta uma grade DOM de 6 botões-emoji que tocam os sons procedurais de `sfx.ts` (Web Audio) em `pointerdown`. O padrão de app do launcher já existe: classe com `constructor(onBack)`, `mount()`/'destroy()', raiz em `#ui`, botão 🏠; `PaintApp` é referência de interação por ponteiro com pointer capture. Os apps do launcher são 2D DOM (sem Three.js). Ver proposal.md - Why.

## Goals / Non-Goals

**Goals:**
- Drag-and-drop simples e estável em desktop e mobile (toque), com hit-test generoso para dedos.
- Som exclusivamente como recompensa do acerto (sons existentes + `thump`/'ding`/'win`).
- Celebração ao completar com opção de jogar de novo; nenhum estado de "errou".

**Non-Goals:**
- 3D (Three.js/GLB), modo "ouvir o som e achar o animal", pontuação/timer/fases, persistência (localStorage), novos animais além dos 6 atuais.

## Decisions

1. **Substituir o conteúdo do `AnimalsApp`, manter o padrão de app.** Mesma classe (mesma API `mount/destroy`, raiz em `#ui`) e mesmo item do launcher (`id: 'sons'`) — só muda o rótulo "Sons" → "Quebra-Cabeça" em `main.ts`. (Alternativa: novo app paralelo no launcher — rejeitada: duplicaria entrada e a grade "Sons" ficaria redundante.)

2. **Slots = emoji fantasma; bandeja = emoji completo.** Cada slot mostra o emoji do animal com `filter: grayscale + opacity ~0.25`, mesmo tamanho da peça; o encaixe se faz por forma + cor. Sem SVG silhueta novo (o emoji já é a "arte"; mantém o app leve e consistente com Pintura/Bolhas). Slots ~72–88px, peças da bandeja ~64–80px; `touch-action: none` no board para impedir scroll durante o arraste.

3. **Drag = clone DOM fixo + pointer capture.** `pointerdown` na peça da bandeja → `setPointerCapture`, a peça original fica "segurada" (opacity 0 no lugar) e um clone `position: fixed` acompanha o `pointermove` (escala ~1.1, `z-index` topo). No `pointerup`: hit-test do centro do ponteiro contra os `getBoundingClientRect()` dos slots livres. Acerto → a peça original assume o slot (posição absolute dentro do board, CSS transition curta de ~150ms) + som do animal + `ding()` + starburst. Erro → a peça anima de volta à coordenada original da bandeja (mesma transition) + `thump()`. (Alternativa: HTML5 drag-and-drop — rejeitada, suporte ruim em touch; canvas — rejeitado, DOM torna slots/aria/animações mais baratos.)

4. **Hit-test = centro do ponteiro vs retângulos dos slots.** Raio de acerto generoso (margem ~30% do lado do slot, constante ajustável, alvo ≥ 40px de folga) — dedo de criança erra pouco por milímetros. Não há atração magnética em slot errado (evita ambiguidade de "quase acertou").

5. **Sons: um acerto = som do animal + `ding()`.** `thump()` = tom curto grave e suave (~140Hz→90Hz, vol ~0.10). `ding()` = 2 notas ascendentes curtas (ex. 660→990Hz, triangle, vol ~0.15). `win()` = arpejo curto de 3 notas (C-maior, ~0.5s). Starburst no acerto = 5–8 spans CSS removidos após ~600ms; celebração final = ~30 spans sobre o board. Nada de tocar os 6 sons em sequência na vitória (sobrecarga para a faixa etária).

6. **Embaralhamento Fisher–Yates, sem "fases".** Posição da bandeja sorteada na abertura e re-sorteada no "Jogar de novo". Um único modo, sempre com os 6 animais.

## Risks / Trade-offs

- [Arraste rápido para fora da viewport] → `pointercancel` devolve a peça à bandeja; pointer capture evita perder o gesto.
- [Tap vs início de arraste] → a decisão "sem som ao tocar" elimina o conflito: tap não toca som; apenas release dentro do raio do slot correto gera o acerto.
- [Render de emoji varia por SO] → o matching usa forma + cor com hit radius generoso; silhueta fantasma é o mesmo emoji, então o "modelo" é idêntico ao da peça.
- [Spans de confete acumulando] → todos os bursts têm timeout de remoção; limite de ~36 spans vivos por celebração.

## Migration Plan

Nenhuma — o app é substituído no lugar; launcher, demais apps e o jogo 3D não mudam. Rollback = revert do commit do change.

## Open Questions

Nenhuma — defaults definidos no explore: nome "Quebra-Cabeça" no launcher, sem tocar os 6 sons na vitória, modo "achar o som" fica para change futuro.
