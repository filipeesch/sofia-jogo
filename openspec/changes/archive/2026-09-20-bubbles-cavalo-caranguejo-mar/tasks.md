# Tarefas

## 1. Cavalo-marinho decalcado

- [x] 1.1 Rasterizar a referência, binarizar e extrair a silhueta do corpo com o
  descascador (figura cheia + Moore + RDP)
- [x] 1.2 Reescrever `CAVALO_MARINHO` no novo viewBox com crina, tromba, leque
  dorsal, costelas e cauda em caracol; aceite v4 na folha de comparação

## 2. Caranguejo decalcado

- [x] 2.1 Escolher a gravura de referência de domínio público e rasterizá-la a
  1375 px
- [x] 2.2 Decalcar carapaça e tenaz num sistema de coordenadas comum, com o
  contorno do vizinho já decalcado a cortar a costura
- [x] 2.3 Desenhar à mão braços com pulso e três patas por lado com joelho mais
  alto que o pé e pé redondo
- [x] 2.4 Manter os contratos `cang-pernas-e/-d` e `cang-bracos`; ajustar
  `--h` do caranguejo (58 px) e a caixa de toque (150 × 84 px)

## 3. Música no padrão do avião

- [x] 3.1 Reescrever `seaAmbience.ts` com o sequenciador de 16 passos, mixer e
  envelopes do `AudioManager` do avião (master 0,8)
- [x] 3.2 Timbres do mar: marulho filtrado, bordão, sinos na melodia, arpejo de
  bolha raro; melodia só em dó-ré-mi-sol-lá
- [x] 3.3 Medir na cena: 5 fontes vivas, RMS 0,016–0,025, pico do estouro 0,22;
  saída em silêncio (`fontes: 0`, `nivel: -1`)

## 4. Verificação

- [x] 4.1 `npm run check:fps-bolhas` — 59,9 fps medianos nas três situações,
  0 frames lentos
- [x] 4.2 `npm run check:exit` — TUDO OK
- [x] 4.3 Evidência por visão: folha de comparação do caranguejo contra a
  referência e cena a 1280×720 e 834×1112
- [x] 4.4 `docs/performance.md` atualizado (5 fontes, RMS, 446 nós, animações)
