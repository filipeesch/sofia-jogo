# Tasks

## 1. A arte

- [x] 1.1 Criar `src/apps/bubblesSprites.ts`: uma paleta partilhada (sombra, brilho, contorno) e o padrão de camadas documentado no topo do ficheiro
- [x] 1.2 Desenhar o peixe-tropical (barbatana dorsal em leque com raios, cauda em leque, escamas, olho com brilho)
- [x] 1.3 Desenhar o peixe-prata (corpo fuselado com linha lateral, cauda fendida, barbatanas translúcidas)
- [x] 1.4 Desenhar o baiacu (corpo redondo com espinhos, barbatanas pequenas, olho grande)
- [x] 1.5 Redesenhar o cavalo-marinho com o mesmo nível de detalhe: crista, raios da barbatana dorsal, costelas da barriga, cauda em caracol com anéis, olho com brilho
- [x] 1.6 Desenhar a alga (talo com folhas emparelhadas, nervuras, borda ondulada) e duas variantes de concha (radiada com costelas, espiral/ búzio) — nota: a ondulação é dada pelo leque de folhas alternadas; cada folha é uma lente lisa, não uma borda recortada
- [x] 1.7 Desenhar o comando de soprar (bolhas com aro e brilho), legível a 30 px sobre o gradiente azul do botão — verificado a 36 px, que é o mínimo real do `clamp(36px, 8vw, 54px)`

## 2. Ligadura ao app

- [x] 2.1 Substituir os `textContent` de emoji por `innerHTML` com o sprite, passando `--h` (altura em píxeis) por instância
- [x] 2.2 CSS: dimensionar por `width: var(--h); height: auto` nos SVG, removendo os `font-size` que mediam glifos; manter `line-height` e as sombras de contentor — desvio: a regra partilhada dimensiona por `height: var(--h); width: auto`, porque é a ALTURA que os dados do cenário declaram (`h:`) e os desenhos têm larguras diferentes; o `design.md` §4 foi corrigido para dizer o mesmo
- [x] 2.3 Manter as caixas de toque `::before` (~90 px) inalteradas: o alvo mede-se pelo dedo, não pelo desenho
- [x] 2.4 Botão de soprar a usar o sprite, sem mudar geometria nem `z-index`

## 3. Fora o confetti

- [x] 3.1 Remover de `celebrate()` a criação dos `span.bubbles-confetti`, mantendo `win()` e o arranque da vaga seguinte
- [x] 3.2 Remover `.bubbles-confetti` e o `@keyframes confettiFall` do CSS, e a importação de `win` só se ainda for usada — desvio: só a regra `.bubbles-confetti` saiu; `@keyframes confettiFall` fica porque `.puzzle-confetti` (PuzzleApp) usa-o. `win()` continua importado e usado

## 4. Verificação

- [x] 4.1 Zero glifos de emoji no DOM da cena (varrimento por `Extended_Pictographic`), incluindo botões — exceto o 🏠 de voltar, que ficou fora do pedido (pertence à capability `game-hud` e é partilhado com os outros apps)
- [x] 4.2 Capturas a 1280×720 e 834×1112: nenhuma figura cortada pelo rebordo nem escondida pelo botão de soprar — medido: 14 figuras, 0 cortadas, 0 tapadas (>25%)
- [x] 4.3 Reacção e som por elemento (alga, concha, cavalo-marinho) com 0 utterances no espião de fala — `onda`/`fecha`/`pula` + 9 osciladores e 2 buffers, `falas: 0`
- [x] 4.4 Sobreposição bolha-adorno: o toque vai sempre para a bolha, e o adorno não reage — 5 sobreposições reais com `elementFromPoint` a cair na bolha, e clique do rato com uma bolha de 252 px sobre um cavalo-marinho (9568 px²): bolha `bubble-skin shake`, adorno sem reacção
- [x] 4.5 Contar nós SVG por figura e verificar que a cena abre sem quebra; `check:exit` sem novos FAILs — 351 nós na cena (~30 por figura), 0 erros de consola; `check:exit` com os 3 FAIL conhecidos e pré-existentes do passo [1] (`canvases=0`, `musicRunning=0`, `active=0`), nenhum novo
- [x] 4.6 `npm run typecheck`, `npm run build` e `openspec validate --strict` limpos
