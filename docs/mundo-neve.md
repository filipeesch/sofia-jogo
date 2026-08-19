# Design de Fase — Mundo da Neve (`neve`, worldType `snow`)

Redesenho do mundo de neve do jogo do avião para ser **coeso** e **~5x maior em
área útil** (conteúdo vai até r≈80): cada elemento vive onde faz sentido —
vila aconchegante no hub `(0,-6)`, lago congelado a oeste com estrada em volta,
bosque de pinheiros a leste, alameda de bonecos de neve que cruza o arco-íris
ao norte. Sem texto, sem punição, sem nada assustador — para crianças de 2–3
anos.

Rework de 2025-08 (regras novas da skill `level-gen`): a rede de estradas agora
é **fechada em laços** (união de 2 anéis, sem beira-morte), as curvas têm
deflexão ≤ 60°, e o mundo tem **32 animais**. O tour de trilhos do carro faz
**0 U-turns** (validado pelo `check-rail-tour`).

## 1. Tema
Um mundo branco e aberto com:
- **Vila** de 3 casinhas no hub `(0,-6)`, todas na faixa `[5,1..8,1]` da
  estrada A2, com 8 postes de luz (PointLight) que aquecem a noite.
- **Lago congelado** `(-26,-20)` raio 11 — disco de gelo liso; o **anel B**
  contorna a margem (sul → oeste → norte) sem tocar a água. Nenhum pato: o
  lago está congelado.
- **Arco-íris** global em `z=-24` (x 11..37): o **anel A** passa **por baixo**
  do arco em `(24,-24)` — o ponto exato do tour de voo.
- **Pinheiral**: anel de pinheiros ao redor de `(40,-4)`; o anel A passa na
  borda oeste do bosque.
- **Alameda de bonecos de neve**: 10 bonecos (5 na vila, 5 ao longo do anel A
  norte), todos fora das estradas.
- **Dunas de neve** suaves (6 hemisférios, r 18–22, h 2,0–2,6) no anel de
  conteúdo, mantendo vila, lago, estradas e a zona do arco-íris baixos.
- **Animais** (32): 13 ovelhas, 7 galinhas, 5 vacas, 4 gatos, 3 cachorros.

## 2. Mapa (zona por zona, coordenadas x/z; piso em y=0; hub da vila em (0,-6))
- **Vila** (hub `0,-6`): 3 casinhas na faixa `[5,1..8,1]` da A2 (a rua x=0),
  voltadas para a rua:
  - `(7,14)` — leste da A2, cor 0 (`0xc9644a`)
  - `(-7,14)` — oeste da A2, cor 1 (`0x9fd0f0`)
  - `(-6,0)` — oeste da A2, cor 2 (`0xe0b060`)
- **Anel leste (A)** — vila → arco-íris → pinheiral → spawn: o carro/avião
  nasce em `(0,20)`, **sobre o anel** (nó A1/A2).
- **Lago congelado** (`-26,-20`, raio 11): o anel B passa a ~3 m da margem
  (centerline ≥ 14 m do centro — a faixa da estrada nunca encosta no gelo).
- **Arco-íris** (`24,10,-24`): arco global fixo; a A1 cruza `z=-24` em
  `(24,-24)`, sob o centro do arco.
- **Pinheiral** (centro `40,-4`): a A1 passa em `(44,-4)`, 4 m do centro do
  bosque; o anel de pinheiros abre na beira da estrada.
- **Bonecos de neve** (10): vila `(14,26)`, `(-12,6)`, `(10,24)`, `(-10,24)`,
  `(0,26)`; alameda norte `(10,-30)`, `(22,-10)`, `(40,-22)`, `(38,-8)`,
  `(-2,-20)`.
- **Postes de luz** (8): `[2.8,10]`, `[-2.8,10]`, `[2.8,-2]`, `[-2.8,-2]`,
  `[5,-9]`, `[18,-19]`, `[29,-28]`, `[46,-8]` — todos na faixa `[2,5..5,0]`
  da spline amostrada.
- **Dunas de neve** (6 hemisférios achatados): `-44,10` r20 h2,2 · `12,36`
  r18 h2,0 · `30,-52` r22 h2,6 · `48,18` r20 h2,2 · `-18,44` r18 h2,0 ·
  `-56,-16` r20 h2,4. Bordas externas ≤ r80; vila, lago e estradas fora.

## 3. Estradas (2 anéis fechados, sem beira-morte)
Malha de **4 polilinhas** formando **dois anéis que compartilham o nó da vila**
`(0,-6)` — todo ponto final de estrada é compartilhado com outra estrada, então
o passeio completo não precisa de meia-volta (0 U-turn no tour de trilhos):

| Trecho | Pontos de controle | No anel |
|---|---|---|
| A1 | `0,-6 → 10,-6 → 18,-14 → 22,-20 → 26,-24 → 32,-24 → 38,-18 → 42,-10 → 44,-4 → 40,6 → 30,14 → 18,18 → 8,20 → 0,20` | A (leste): vila → arco-íris → pinheiral → spawn |
| A2 | `0,20 → 0,12 → 0,-6` | A: spawn → vila (borda oeste) |
| B1 | `0,-6 → -8,-9 → -16,-9 → -24,-6 → -32,-6 → -38,-9 → -41,-18 → -40,-27 → -34,-33 → -26,-35 → -18,-32 → -12,-24` | B (oeste): vila → margem sul → oeste → norte do lago |
| B2 | `-12,-24 → -7,-16 → -3,-10 → 0,-6` | B: lago (NE) → vila |

Nós compartilhados: vila `0,-6` (grau 4, onde os dois anéis se encontram),
spawn `0,20` (grau 2) e `-12,-24` (grau 2, no norte do lago). Deflexão máxima
entre segmentos de controle: **≤ 60°** (validado pelo auto-check; a spline
Catmull-Rom suaviza ainda mais). O anel B fica a ≥ 14 m do centro do lago — a
faixa (meia-largura 1,7) nunca encosta no gelo. Nenhuma estrada cruza o lago;
nenhum sólido fica a < 2 m de uma amostra da estrada.

## 4. História de descoberta
A criança nasce com o carro/avião em `(0,20)` — **em cima do anel leste** — e
segue a A1: cruza **por baixo do arco-íris** (recompensa visual no topo), passa
pela beira do **pinheiral**, contorna o campo leste e volta à **vila** pelas
casinhas iluminadas. O anel oeste (B) leva à volta do **lago congelado** — um
espelho branco com ovelhas e vacas pastando na margem. Um passeio de 3–4 min
toca as paradas; como a rede é fechada, nunca há beco sem saída: qualquer
caminho sempre volta à vila. À noite, os 8 postes acendem com luz real —
recompensa de voltar.

## 5. Animais (32, cada um no seu habitat)
- **Vila** (7): 2 galinhas `(10,-14)`, `(16,-2)`; 2 ovelhas `(16,6)`,
  `(18,-2)`; 1 gato `(-14,16)`; 1 cachorro `(-18,20)`; 1 gato `(20,26)`.
- **Campo sul** (6): 3 ovelhas `(6,30)`, `(10,32)`, `(20,34)`; 2 galinhas
  `(6,28)`, `(-4,30)`; 1 vaca `(-4,34)`.
- **Campo leste** (7): 2 vacas `(52,20)`, `(34,26)`; 4 ovelhas `(60,4)`,
  `(46,28)`, `(56,32)`, `(62,24)`; 1 galinha `(40,16)`.
- **Alameda norte** (6): 1 vaca `(24,-34)`; 2 ovelhas `(34,-34)`, `(40,-30)`;
  1 galinha `(28,-38)`; 1 cachorro `(18,-28)`; 1 gato `(8,-24)`.
- **Oeste / volta do lago** (6): 1 vaca `(-34,4)`; 1 cachorro `(-26,-44)`;
  2 ovelhas `(-14,-38)`, `(-48,-18)`; 1 galinha `(-42,-4)`; 1 gato `(-26,6)`.
Regra: nenhum animal nasce na estrada, no lago ou nos sólidos; os círculos de
wander ficam livres de estradas (≥ wanderR + 1,7 + 0,2), do lago e de sólidos
(validado pelo auto-check). **Sem patos**: o lago está congelado.

## 6. Dia/noite
A fase funciona nos dois estados:
- **Dia**: luz natural; postes apagados; janelas das casas apagadas; gelo
  azul-pálido.
- **Noite**: céu estrelado, janelas das 3 casinhas acesas (emissive), cabeças
  dos 8 postes em emissivo `0xffd97a` + 8 `PointLight(0xffd97a, 0→2,6, 14, 2)`
  reais a `y+3,3` de cada poste (luz quente de alcance 14 u).

## 7. Implementação técnica
- `src/world/snowLayout.ts` — módulo **puro, determinístico e livre de THREE**:
  seed `SNOW_SEED = 20240125` (`mulberry32`), zonas, estradas, objetos
  colocados, solids. `snowTerrainHeight(x,z)` é a **única fonte de verdade**
  do terreno (soma de hemisférios `h·√(1−n²)`), compartilhada por
  renderização, colocação e auto-check. Jitter visual (rotação dos pinheiros)
  usa `mulberry32(SNOW_SEED + 1)` — **nunca** `Math.random` para colocação.
- `src/world/Snow.ts` — constrói a cena a partir do layout (L0→L4): terreno,
  disco de gelo (`layout.lake`), 6 dunas, 3 casinhas (`House` viradas para a
  rua), 10 bonecos de neve, 8 postes (com `setNightLamps` + PointLight real),
  32 animais (classe `Animal`, expostos em `this.animals`), pinheiros
  instanciados com sway suave.
- `src/rails/roadDefs.ts` → `ROAD_DEFS.snow = SNOW_ROADS` — mesma fonte de
  verdade para o ribbon (`Roads.ts`) e o tour em trilhos (`roadTour.ts`).
- `src/rails/flightTour.ts` — tour do avião apontando para os POIs da nova
  rede (o coordenador espelha os waypoints sugeridos).
- `src/levels.ts` — `neve` (`cycleSeconds` 150, `startNight` false).

## 8. Garantias (Definition of Done)
1. `npx tsc --noEmit` verde.
2. Auto-check estrutural: `node scripts/check-snow-level.mjs` — verifica:
   determinismo; conteúdo ≤ r≈80; casas na faixa `[5,1..8,1]`; **rede em
   anéis fechados (todo endpoint compartilhado ≤ 0,8 m)**; **deflexão ≤ 60°**;
   nenhuma estrada cruza o lago; amostras da spline (CatmullRom centripetal,
   70 amostras) a ≥ 2,0 m de todo sólido; spawn `(0,20)` ≤ 3 m da estrada;
   POIs (vila, lago, pinheiral, arco-íris) a ≤ 8 m; **postes na faixa
   [2,5..5,0]** da spline; **≥ 30 animais** (32) com wander livre de
   estradas/lago/sólidos; tour de voo (240 pts) `3,2 ≤ y ≤ 26`, clareza
   ≥ 1,5 m, arco-íris `[24,10,-24]` presente; sem `Math.random`/`rand()`.
3. Tour de trilhos: `node scripts/check-rail-tour.mjs` — car snow com
   **0 U-turns**, cobertura total da rede (x1,01), off-road 0,00.
4. Evidência visual em `_shots/` (`qa5-neve-*.png`: topdown, vila, lago,
   arco, pinheiral, estrada, spawn, carro, noite).
5. Este documento.

## 9. Invariantes do jogo (2–3 anos)
Sem texto, sem game over, sem vida, sem dano; uma interação por vez;
causa-efeito imediato; descoberta recompensa; nada assustador. As dunas são
"de brinquedo": suaves, arredondadas. O lago é gelo — seguro para andar, não
para nadar (nenhum pato). Os bonecos de neve são fofos e grandes (r 1,6,
h 3,8).

## 10. Desvios / decisões
- **Spawn sobre o anel**: o antigo R1 (spawn → vila, beira-morte) virou parte
  do anel A; o carro nasce no nó `(0,20)` — a estrada "dá sempre em algum
  lugar".
- **Bonecos de neve ajustados**: `(12,20)→(14,26)`, `(4,18)→(0,26)`,
  `(24,-18)→(22,-10)`, `(36,-16)→(40,-22)`, `(-4,-16)→(-2,-20)` — os 5 da
  vila foram preservados como marcos (apenas deslocados para fora do novo
  anel A); os 5 da alameda acompanharam a nova rota do arco-íris.
- **Anel B a ~3 m da margem**: o lago ficou com estrada em volta (antes era um
  ramo cênico com U-turn); a faixa nunca encosta no gelo.
- O `layoutSolids` mantém o formato `LayoutSolid` (x, z, r, clearance?, kind);
  postes não viram solids (à beira da estrada — o lane shift do tour bateria
  neles).
