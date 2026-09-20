# Proposal

## Why

Em smartphone (ex.: 390×664) o launcher tem hoje 12 jogos: o conteúdo mede ~808 px contra 664 px de ecrã e a última fila (Jogo do Galo) nasce cortada ~144 px — inatingível. Não há scroll possível por duas razões em camadas:

1. `.launcher` é `position: fixed` com `justify-content: center` e `overflow: visible` — o contentor nunca vira scroll-container; o flex-centring ainda por cima corta o topo quando o conteúdo é mais alto (scroll unreachable clássico).
2. `html, body { touch-action: none }` — o cadeado global que protege os jogos (nada de panning/zoom durante o voo, bolhas, pintura) — corta qualquer pan que comece dentro do launcher, porque o comportamento de toque efetivo é a interseção ao longo da cadeia de ancestrais.

E há uma terceira razão funcional: os cartões abrem no `pointerdown`. Assim que o dedo toca num cartão o jogo abre — mesmo que o gesto fosse um scroll que começou sobre um cartão.

## What Changes

- O launcher passa a ser um scroll-container real: `overflow-y: auto`, `touch-action: pan-y` (bloqueia pinch/double-tap mas permite arrasto vertical), `overscroll-behavior: contain`, scrollbars escondidas, padding com safe-area do iOS.
- O centro-vertical deixa de ser `justify-content: center` (que corta topo quando transborda) e passa a `margin-top: auto` no título + `margin-bottom: auto` na grelha — centrado quando cabe, topo/fim naturais quando há scroll.
- `<html>` ganha a classe `launcher-touch` enquanto o launcher está visível (`launcher.show()` a pôr, `clearAll()` a tirar), que sobe o `touch-action` de `html/body` para `pan-y` só nesse período. Todos os jogos voltam a `none` ao abrir: nenhum gesto de jogo muda de comportamento.
- Cartões e botão ⛶ passam de `pointerdown` para `click`: um toque abre como antes, mas um arrasto de scroll NÃO abre jogo nenhum (o browser cancela o click quando o gesto virou scroll).

## Capabilities

### New Capabilities
- `game-launcher-ui`: acessibilidade do ecrã "Meus Joguinhos" em ecrãs pequenos — scroll por toque, abertura por toque sem falsos aberturas durante o scroll, e centering que não corta conteúdo.

### Modified Capabilities

_(nenhuma)_

## Impact

- `src/style.css` — regras do `.launcher` + `html.launcher-touch`; nenhuma outra superfície tocada (jogos trancam os seus gestos cada um na sua regra e mantêm `touch-action: none`).
- `src/ui/Launcher.ts` — listeners `pointerdown` → `click`; classe no `show()`.
- `src/main.ts` — `clearAll()` remove a classe.
- O eixo do `🏠` e dos jogos existentes não muda: `clearAll(); launcher.show()` continua a ser o ciclo de entrada/saída.
