## Why

O app "Sons dos Animais" do launcher é hoje uma grade de emojis que tocam som ao toque. Queremos transformá-lo num quebra-cabeça (estilo infantil): a criança arrasta cada animal da bandeja até o slot de silhueta correspondente no quadro; quando acerta a posição, o jogo reproduz o som daquele animal como recompensa. O som deixa de ser um "botão" e vira a prova do acerto — reforça a associação animal↔som sem pontuação, timer ou feedback de "errou" (filosófia *não existe jeito de jogar errado*).

## What Changes

- `AnimalsApp` deixa de ser a grade de toque e vira um puzzle de arrastar-e-soltar: quadro 2×3 com slots de silhueta (emoji fantasma) + bandeja com os mesmos 6 animais (🐶🐱🐔🐑🐮🦆) embaralhados.
- Arraste por pointer (mouse/dedo): o animal segue o ponteiro; ao soltar, **acerto** = snap no slot + som do animal + chime de feliz + mini-burst de estrelas; **erro** = som "tum" suave e desliza de volta para a bandeja.
- Toque simples no animal (sem arrastar) **não** reproduz mais som: som existe apenas como recompensa do encaixe certo.
- Quadro completo: celebração (confete + jingle de vitória) com botões **Jogar de novo** (embaralha de volta) e 🏠 (launcher).
- `sfx.ts`: novos sons `thump` (erro suave), `ding` (chime de acerto) e `win` (jingle curto) além dos 6 sons dos animais.
- Item do launcher renomeado: "Sons" → **"Quebra-Cabeça"** (mesmo ícone 🐶, mesmo `id`).
- `style.css`: classes e keyframes novos do puzzle (board, slot, bandeja, snap, retorno, burst, confete).

## Capabilities

### New Capabilities
- `animal-puzzle`: quebra-cabeça de encaixe dos animais — slots de silhueta, arrastar-e-soltar com hit-test generoso, som como recompensa do acerto, sem estado de falha, e celebração + reinício ao completar.

### Modified Capabilities

(nenhuma — ainda não existem specs principais em `openspec/specs/`)

## Impact

- `src/apps/AnimalsApp.ts` (loop do jogo: slots, bandeja, pointer events, snap/retorno, celebração).
- `src/ui/sfx.ts` (`thump`, `ding`, `win`).
- `src/style.css` (classes/keyframes do puzzle).
- `src/main.ts` (rótulo do item do launcher "Sons" → "Quebra-Cabeça").
- Sem impacto no jogo 3D (Three.js), nos demais apps do launcher, nem nos servidores de captura.
