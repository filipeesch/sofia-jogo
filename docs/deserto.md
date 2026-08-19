# Design de Fase — Deserto (`deserto`, worldType `desert`)

Redesenho do mundo do deserto do jogo do avião para ser **coeso** e **~5x
maior em área útil** (conteúdo vai até r≈75): cada elemento vive onde faz
sentido — vila adobe na estrada principal, oásis com anel duplo de cactos,
cluster de pirâmides ao NW, alameda de cactos ao longo das estradas e o
arco-íris cruzado por uma estrada. Sem texto, sem punição, sem nada
assustador — para crianças de 2–3 anos.

Rework de 2025-08 (regras novas da skill `level-gen`): a rede de estradas é
**fechada em laços** (união de 2 anéis, sem beira-morte) e o mundo tem
**32 animais**. O tour de trilhos do carro faz **0 U-turns** (validado pelo
`check-rail-tour`).

**Rework de curvas suaves de 2025-08-19** (skill regra 7, padrão novo): os
ângulos das estradas foram reduzidos de 60° para **deflexão máx ≤ 40°** e foi
adicionado um **raio de curvatura mínimo ≥ 4.0 m** (medido na spline amostrada),
para eliminar "curvas de cotovelo" — cada giro agora se desenvolve ao longo de
≥ ~5.6 m de corda. O anel B foi redesenhado inteiro: a volta N ao redor da
pirâmide média usa raio largo (~9–10 m), a cauda e a alameda do arco-íris
ficaram mais longas e suaves. O hub da vila é um **cruzamento tangente**: o
anel A atravessa em N–S e o anel B chega/segue com deflexão ≤ 24°.

## 1. Tema
Um deserto grande e aberto com:
- **Vila adobe** de 3 casas na estrada (anel A), todas voltadas para a rua,
  com 9 postes de luz reais (PointLight) que aquecem a noite.
- **Oásis** (30,26) raio 9, com anel duplo de cactos (a "alameda de cactos");
  o **anel A** contorna a água (centerline ≥ ~14 m do centro — a faixa nunca
  toca o disco).
- **Cluster de pirâmides** NW: grande `(-44,-36)` (r 5,5 h 7,5), média
  `(-54,-24)` (r 4,5 h 6), pequena `(-38,-48)` (r 3,5 h 5); o **anel B** passa
  em volta do cluster (E → N → W → S) sem tocar as bases.
- **Arco-íris** global fixo em x 11..37, z=-24: o **anel B** passa **por baixo**
  do arco em `(24,-24)`.
- **Dunas** suaves (7 domos, r 18–28, h 1,6–2,8) no anel de conteúdo, mantendo
  a vila, a zona do arco-íris, as estradas e o oásis baixos (as estradas sobem
  rampas gentis nas dunas do NE).
- **Animais** (32): 17 ovelhas, 7 galinhas, 4 cães e 4 gatos espalhados por
  vila, oásis, pirâmides e arco-íris (NENHUM pato — deserto não tem patos).

## 2. Mapa (zona por zona, coordenadas x/z; piso em y=0; hub da vila em (-2,2))
- **Vila** (hub `-2,2`): 3 casas adobe, todas na faixa `[5,1..8,1]` do anel A,
  viradas para a rua:
  - `(-8,8)` — oeste da cauda do anel B (face `-8,1`), cor 0
  - `(7,14)` — leste do handle (face `2,14`), cor 1
  - `(-1,34)` — norte do handle, no anel A2 (face `5,31`), cor 2
- **Handle / spawn**: o handle compartilhado do anel A vai do hub `-2,2` até
  `(3,20)` passando por `(0,12)`; passa a ~2,7 m do spawn do carro `(0,20)` —
  o veículo "glide" até o anel.
- **Oásis** (`30,26`, raio 9): disco de água `y=0,06`; o anel A passa a ~5 m
  da margem (centerline ≥ 14,6 m do centro); 14 cactos no anel interno + 10
  no externo (a "alameda de cactos", com abertura na beira da estrada).
- **Pirâmides** (cluster NW): 3 pirâmides GLB, rotação y por jitter visual
  (seed+1); o anel B envolve o cluster a ≥ 8 m de cada centro (a faixa nunca
  encosta nas bases).
- **Alameda de cactos** (sul): ~23 cactos instanciados no total (anel duplo
  no oásis + espalhados no anel de conteúdo r 34..70); a A1 termina em
  `(44,34)`, perto da alameda sul.
- **Arco-íris** (`24,10,-24`): arco global fixo; a B1 cruza `z=-24` em
  `(24,-24)`, sob o centro do arco (trecho quase reto da alameda E).
- **Postes de luz** (9): `[-6,5]`, `[-3,16]`, `[9,21]`, `[30,51]`, `[38,50]`,
  `[20,30]`, `[-28,-6]`, `[10,-20]`, `[20,-26,5]` — todos na faixa
  `[2,5..5,0]` da spline amostrada.

## 3. Estradas (2 anéis fechados, padrão de curva suave)
Malha de **4 polilinhas** formando **dois anéis que se encontram no hub da vila**
`(-2,2)` — todo ponto final de estrada é compartilhado com outra estrada,
então o passeio completo não precisa de meia-volta (0 U-turn no tour). As
curvas seguem o **padrão de curva suave** (skill regra 7): deflexão entre
pontos de controle **≤ 40°** E raio de curvatura da spline amostrada **≥ 4.0 m**
(validado pelo auto-check, regras 5a/5b):

| Trecho | Pontos de controle | No anel |
|---|---|---|
| A1 | `-2,2 → 0,12 → 3,20 → 9,27 → 17,33 → 26,38 → 36,40 → 40,39 → 43,36 → 44,34` | A (oásis): hub → handle/spawn → margem N do oásis → nó leste (deflex máx 31°, raio mín 4,8 m) |
| A2 | `44,34 → 43,36 → 41,41 → 38,45 → 32,48 → 24,48 → 16,44 → 9,37 → 5,30 → 3,20 → 0,12 → -2,2` | A: margem N/O do oásis → handle → hub (deflex máx 26,6°, raio mín 9,0 m) |
| B1 | `-2,2 → -8,1 → -16,0 → -24,-1 → -30,-4 → -35,-9 → -38,-15 → -43,-18 → -46,-18 → -50,-17 → -52,-15 → -55,-14 → -58,-15 → -60,-17 → -62,-21 → -63,-26 → -63,-32 → -61,-38 → -57,-42 → -52,-45 → -47,-48 → -43,-52 → -38,-54 → -32,-53 → -27,-49 → -23,-43 → -20,-36 → -18,-30 → -15,-26 → -11,-25 → -4,-24 → 4,-24 → 12,-24 → 18,-23 → 22,-20 → 24,-16 → 23,-11 → 19,-7 → 14,-3 → 10,-1` | B (pirâmides): hub → cauda suave → volta N larga da pirâmide média → face O → face S → alameda E sob o arco-íris → face leste → nó 1 (41 ctrls; deflex máx 39,1°, raio mín 4,43 m) |
| B2 | `10,-1 → 6,0 → 2,1 → -2,2` | B: nó 1 → hub (diagonal reta; continuação tangente do B1) |

Nós compartilhados: **hub `-2,2` (grau 4)**, **nó leste `44,34` (grau 2, NE do
oásis)** e **nó 1 `10,-1` (grau 2, leste da alameda, sob o arco-íris)**.
O **hub é um cruzamento tangente suave**: o anel A atravessa em N–S (A1 sai
para N em `0,12`; A2 chega de N) e o anel B chega do leste (B2, do nó 1) e
segue para o oeste (B1, rumo às pirâmides) com deflexão de apenas **23,5°** —
um canto de vila gentil, não um "V" (o antigo 74° foi eliminado). Deflexão
máxima entre segmentos de controle da rede inteira: **≤ 40°**; raio de
curvatura mínimo da spline amostrada: **≥ 4,0 m** em todos os pontos.
Nenhuma estrada cruza o oásis (a A1/A2 fica a ≥ 4,6 m da margem) nem toca as
pirâmides (≥ 7 m dos centros). A volta N do anel B ao redor da pirâmide média
`(-54,-24)` usa raio largo (~9–10 m); o canto NE do anel A sobe uma rampa
suave (~1,4 m) sobre a duna `(58,42)` — regra 8 (a faixa acompanha o terreno).

## 4. História de descoberta
A criança nasce com o carro/avião perto de `(0,20)` e entra no **anel A** pelo
handle: primeiro a **vila** (casinhas + luzes), depois a estrada corre ao lado
do **oásis** — a água azul com cactos em volta — e contorna o campo leste. Pelo
**anel B** ela visita as **pirâmides** (a estrada envolve o cluster em curva
larga) e depois cruza **por baixo do arco-íris** antes de voltar à vila. Um
passeio de 3–4 min toca as paradas; a rede fechada garante que qualquer caminho
volta à vila. À noite, o mesmo deserto acende (janelas + 9 postes com luz real)
— recompensa de voltar.

## 5. Animais (32, cada um no seu habitat)
- **Vila / handle** (5): 1 cachorro `(10,8)`; 1 gato `(-14,6)`; 1 galinha
  `(-16,6)`; 2 ovelhas `(12,10)`, `(16,6)`.
- **Campo sul** (5): 3 ovelhas `(52,10)`, `(-14,48)`, `(22,14)`; 1 galinha
  `(12,48)`; 1 cachorro `(24,14)`.
- **Prado do oásis** (7): 3 ovelhas `(40,16)`, `(44,14)`, `(50,32)`;
  2 galinhas `(34,12)`, `(46,48)`; 1 gato `(26,12)`; 1 ovelha `(18,18)`.
- **Pirâmides** (5): 2 ovelhas `(-28,-14)`, `(-46,-11)`; 1 galinha `(-44,-11)`;
  1 cachorro `(-48,-8)`; 1 gato `(-70,-36)`.
- **Arco-íris / campo norte** (6): 4 ovelhas `(0,-12)`, `(16,4)`, `(28,-2)`,
  `(30,-40)`; 1 galinha `(-6,-14)`; 1 gato `(34,-14)`.
- **Sudoeste** (4): 2 ovelhas `(-30,20)`, `(-44,14)`; 1 galinha `(-36,8)`;
  1 cachorro `(-48,4)`.
Regra: nenhum animal nasce em picos, no meio da água ou na estrada; os
círculos de wander ficam livres de estradas (≥ wanderR + 1,7 + 0,2), do oásis
e de sólidos (validado pelo auto-check). NENHUM pato (deserto não tem patos).

## 6. Dia/noite
A fase funciona nos dois estados:
- **Dia**: luz natural; postes apagados; janelas das 3 casas apagadas.
- **Noite** (ciclo diurno da fase, `startNight: false`): céu estrelado,
  janelas das 3 casas acesas (emissive), cabeças dos 9 postes em emissivo
  (`setNightLamps`) + 9 `PointLight(0xffd97a, 2,6, 14, 2)` reais em cada
  poste (luz quente de alcance 14 u).

## 7. Implementação técnica
- `src/world/desertLayout.ts` — módulo **puro, determinístico e livre de
  THREE**: seed `DESERT_SEED = 20240815` (`mulberry32`), zonas, estradas,
  objetos colocados, solids. `desertTerrainHeight(x,z)` é a **única fonte de
  verdade** do terreno (soma de hemisférios `sqrt(1-n²)`), compartilhada por
  renderização, colocação e auto-check. Jitter visual (rotação de pirâmides,
  fase dos cactos) usa `mulberry32(DESERT_SEED + 1)` — **nunca**
  `Math.random` para colocação.
- `src/world/Desert.ts` — constrói a cena a partir do layout (L0→L4): terreno,
  oásis (disco), dunas, 3 casas adobe (House) viradas para a rua, 3 pirâmides
  (GLB + jitter visual), 9 postes (com `setNightLamps` + PointLight real),
  32 animais (classe `Animal`, expostos em `this.animals`), cactos
  instanciados com sway suave.
- `src/rails/roadDefs.ts` → `ROAD_DEFS.desert = DESERT_ROADS` — mesma fonte de
  verdade para o ribbon (`Roads.ts`) e o tour em trilhos (`roadTour.ts`).
- `src/rails/flightTour.ts` — tour do avião apontando para os POIs da nova
  rede (o coordenador espelha os waypoints sugeridos).
- `src/levels.ts` — `deserto` ("Descubra a pirâmide e os cactos",
  `starCount` 18, `cycleSeconds` 150).

## 8. Garantias (Definition of Done)
1. `npx tsc --noEmit` verde.
2. Auto-check estrutural: `node scripts/check-desert-level.mjs` — verifica:
   determinismo; conteúdo ≤ r≈80; casas na faixa `[5,1..8,1]`; **rede em
   anéis fechados (todo endpoint compartilhado ≤ 0,8 m)**; **deflexão entre
   pontos de controle ≤ 40° (regra 5a) E raio de curvatura da spline amostrada
   ≥ 4,0 m (regra 5b)**; nenhuma estrada cruza o oásis (tolerância de
   segurança de 4 m); amostras da spline (CatmullRom centripetal, 70 amostras)
   a ≥ 2,0 m de todo sólido; spawn `(0,20)` ≤ 3 m da estrada; POIs (vila,
   oásis, pirâmides, alameda) a ≤ 8 m; **postes na faixa [2,5..5,0]** da
   spline; **≥ 30 animais** (32) com wander livre de estradas/oásis/sólidos;
   tour de voo (240 pts) `3,2 ≤ y ≤ 26`, clareza ≥ 1,5 m, arco-íris
   `[24,10,-24]` presente; sem `Math.random`/`rand()` para posição no layout
   puro.
3. Tour de trilhos: `node scripts/check-rail-tour.mjs` — car desert com
   **0 U-turns**, cobertura total da rede (x1,00), off-road 0,00.
4. Evidência visual em `_shots/` (`qa6-pw-*.png`: topdown, pirâmides, hub,
   sul; e `qa5-deserto-*.png` do rework anterior).
5. Este documento.

## 9. Invariantes do jogo (2–3 anos)
Sem texto, sem game over, sem vida, sem dano; uma interação por vez;
causa-efeito imediato; descoberta recompensa; nada assustador. As dunas são
"de brinquedo": suaves, arredondadas, com cactos fofos. As luzes de poste
aquecem a noite sem escuro total. As pirâmides são grandes mas distantes da
estrada — para ver, não para escalar.

## 10. Nota sobre o carro (mecânica global, não da fase)
O `CarController` tem condução automática suave (~9 u/s) com retorno para a
origem ao passar de 150 u (`maxRadius`) — mesma em todas as fases do carro.
O limite de 150 u ficou **fora do anel de conteúdo** (r≈75), então o carro
"volta para casa" antes de travar nas dunas. Se a criança não dirija, o carro
segue o anel A (que passa perto do spawn); o anel B existe para virar e
descobrir pirâmides e arco-íris.

## 11. Desvios / decisões
- **Spawn perto, não sobre o anel**: o antigo R1 (spawn → vila, beira-morte)
  virou o handle do anel A; o spawn `(0,20)` fica a ~2,7 m da estrada (o
  handle passa em `(3,20)` via `(0,12)`) — o veículo "glide" até o tour.
- **Padrão de curva suave (2025-08-19)**: o usuário pediu ângulos menores
  (40°) e um "distância mínima para a curva" para evitar cotovelos. Solução:
  deflexão de controle ≤ 40° E raio mínimo da spline amostrada ≥ 4,0 m
  (regras 5a/5b do checker). O anel B foi redesenhado inteiro para cumprir.
- **Canto NE (cap) achatado**: a primeira tentativa de volta N da pirâmide
  média (`-50,-17 → -53,-15 → -56,-15 → -59,-16`) deu raio 3,79 m (< 4,0).
  Achatando para `[-52,-15] [-55,-14] [-58,-15]` o raio subiu para 4,43 m.
- **Hub tangente (nó compartilhado com cuidado)**: o anel B é aberto em 2
  polilinhas que se encontram no hub `(-2,2)` e no nó 1 `(10,-1)` (B1 termina
  no nó 1, não volta ao hub) — 2 nós distintos, sem aresta de tour zerada.
  No hub, A1/A2 passam em N–S e B1/B2 se encontram com deflexão de 23,5°
  (canto de vila), em vez do antigo 74° em "V".
- **Casa `(-1,34)` (ex-`(2,32)`)**: a `(2,32)` antiga ficava a 3,6 m da nova
  faixa A2 (dentro do anel); recuada para `(-1,34)` na faixa `[5,1..8,1]`.
- **Postes reposicionados**: `[-4,7]→[-6,5]`, `[9,18]→[9,21]`, `[-26,-14]→
  [-28,-6]`, `[20,-28]→[20,-26,5]` para ficarem na faixa `[2,5..5,0]` da
  spline nova.
- **Animais ajustados à rede nova**: ex.: ovelha `(-2,40)→(-14,48)` (wander
  tocava a casa nova `(-1,34)`), galinha `(8,40)→(12,48)` (ficava a 2,75 m da
  A2), e 8 outros pequenos ajustes de distância às estradas/sólidos.
- **Rampa na duna NE**: o canto NE do anel A sobe a duna `(58,42)` (~1,4 m) —
  a faixa acompanha o terreno com pitch por segmento (regra 8), sem degraus.
- **POI pirâmides** = `(-44,-20)` (aproximação da estrada, ~4 m dela; era
  `(-40,-30)` no rework de 2025-08): o anel B envolve o cluster a ~8–10 m dos
  centros — ver de longe, sem encostar.
