# Proposta: cavalos-marinho, caranguejo e música do mar

## Why

A versão do cavalo-marinho redesenhada à mão (commit `d389b06`) ficou pior do que
a anterior segundo a própria criança que joga com ela: a barbatana dorsal saía
como um sol de pontas, a cabeça era um círculo com tubo de pato e a barriga
flutuava separada do corpo. O caranguejo, por seu lado, «nem parece um
caranguejo»: tinha olhos colados no topo da carapaça e pernas de aranha. E a
música do mar, com melodia aleatória e sete fontes contínuas, soava «meia
estranha» ao lado da canção conhecida do jogo do avião.

## What Changes

- **Cavalo-marinho**: silhueta decalcada de uma referência real (pipeline de
  rasterização → binarização → preenchimento do interior → contorno de Moore +
  RDP), com crina curta, tromba curva, barbatana dorsal de raio e cauda em
  caracol. Aceite como v4 na folha de comparação.
- **Caranguejo**: redesenhado no mesmo pipeline — carapaça e tenazes decalcadas
  de uma gravura de domínio público, pose de frente, três patas curtas por lado
  com joelho articulado mais alto que o pé. Os contratos de animação
  (`cang-pernas-e/-d`, `cang-bracos`) mantêm-se.
- **Música do mar**: reescrita no MESMO padrão da música do jogo do avião
  (sequenciador de 16 passos com grave/acordes/melodia pentatónica, mesmo
  barramento e envelopes), adaptada ao fundo do mar: marulho filtrado, bordão
  grave e sinos em vez de caixinha de música. Fontes vivas: 5 (eram 7).

## Impact

- Affected specs: `bubbles-toy` (forma do caranguejo; cavalo-marinho),
  `sea-ambience` (forma da música e nível do barramento)
- Affected code: `src/apps/bubblesSprites.ts`, `src/ui/seaAmbience.ts`,
  `src/apps/BubblesApp.ts` (altura do caranguejo), `src/style.css` (caixa de
  toque do caranguejo), `docs/performance.md` (números medidos novos)
