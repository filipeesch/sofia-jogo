# Design de Fase — Deserto (`deserto`, worldType `desert`)

Redesenho do mundo do deserto do jogo do avião para ser **coeso** e **~5x
maior em área útil** (conteúdo vai até r≈75): cada elemento vive onde faz
sentido — vila adobe na estrada principal, oásis com anel duplo de cactos,
cluster de pirâmides ao NW, alameda de cactos ao longo das estradas e o
arco-íris cruzado por uma estrada. Sem texto, sem punição, sem nada
assustador — para crianças de 2–3 anos.

Rework de 2025-08 (regras novas da skill `level-gen`): a rede de estradas agora
é **fechada em laços** (união de 2 anéis, sem beira-morte), as curvas têm
deflexão ≤ 60°, e o mundo tem **32 animais**. O tour de trilhos do carro faz
**0 U-turns** (validado pelo `check-rail-tour`).

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
  - `(-8,8)` — oeste do handle, cor 0
  - `(7,14)` — leste do handle, cor 1
  - `(2,32)` — norte do handle, cor 2
- **Handle / spawn**: a A1 passa por `(2,20)`, a 2 m do spawn do carro
  `(0,20)` — o veículo "glide" até o anel.
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
  `(24,-24)`, sob o centro do arco.
- **Postes de luz** (9): `[-4,7]`, `[-3,16]`, `[9,18]`, `[30,51]`, `[38,50]`,
  `[20,30]`, `[-26,-14]`, `[10,-20]`, `[20,-28]` — todos na faixa
  `[2,5..5,0]` da spline amostrada.

## 3. Estradas (2 anéis fechados, sem beira-morte)
Malha de **4 polilinhas** formando **dois anéis que compartilham o nó da vila**
`(-2,2)` — todo ponto final de estrada é compartilhado com outra estrada,
então o passeio completo não precisa de meia-volta (0 U-turn no tour):

| Trecho | Pontos de controle | No anel |
|---|---|---|
| A1 | `-2,2 → 0,12 → 2,20 → 10,24 → 16,32 → 26,40 → 36,42 → 42,38 → 44,34` | A (oásis): vila → handle/spawn → margem S/E do oásis |
| A2 | `44,34 → 42,40 → 36,46 → 28,48 → 20,44 → 12,36 → 4,24 → 2,20 → 0,12 → -2,2` | A: margem N/O do oásis → handle → vila |
| B1 | `-2,2 → -12,-5 → -22,-15 → -32,-24 → -42,-26 → -45,-24 → -48,-18 → -56,-16 → -60,-19 → -62,-24 → -60,-30 → -52,-38 → -48,-46 → -46,-52 → -42,-54 → -38,-54 → -30,-52 → -28,-48 → -26,-42 → -22,-34 → -18,-26 → -8,-24 → 4,-24 → 16,-24 → 24,-24` | B (pirâmides): vila → cluster (E → N → W → S) → arco-íris |
| B2 | `24,-24 → 16,-14 → 8,-6 → -2,2` | B: arco-íris → vila |

Nós compartilhados: vila `-2,2` (grau 4, onde os dois anéis se encontram),
`44,34` (grau 2, NE do oásis) e `24,-24` (grau 2, sob o arco-íris). Deflexão
máxima entre segmentos de controle: **≤ 60°** (validado pelo auto-check; a
spline Catmull-Rom suaviza ainda mais). Nenhuma estrada cruza o oásis (a A1/A2
fica a ≥ 4,6 m da margem) nem toca as pirâmides (≥ 7 m dos centros). A passagem
N do cluster faz um "S" gentil ao redor da pirâmide média; o canto NE do anel
A sobe uma rampa suave (~1,4 m) sobre a duna `(58,42)` — regra 8 (a faixa
acompanha o terreno).

## 4. História de descoberta
A criança nasce com o carro/avião perto de `(0,20)` e entra no **anel A** pelo
handle: primeiro a **vila** (casinhas + luzes), depois a estrada corre ao lado
do **oásis** — a água azul com cactos em volta — e contorna o campo leste. Pelo
**anel B** ela visita as **pirâmides** (a estrada envolve o cluster) e depois
cruza **por baixo do arco-íris** antes de voltar à vila. Um passeio de 3–4 min
toca as paradas; a rede fechada garante que qualquer caminho volta à vila. À
noite, o mesmo deserto acende (janelas + 9 postes com luz real) — recompensa
de voltar.

## 5. Animais (32, cada um no seu habitat)
- **Vila / handle** (5): 1 cachorro `(8,4)`; 1 gato `(-12,2)`; 1 galinha
  `(-16,6)`; 2 ovelhas `(12,10)`, `(16,6)`.
- **Campo sul** (5): 3 ovelhas `(52,10)`, `(-2,40)`, `(22,14)`; 1 galinha
  `(8,40)`; 1 cachorro `(24,14)`.
- **Prado do oásis** (7): 3 ovelhas `(40,16)`, `(44,14)`, `(50,32)`;
  2 galinhas `(34,12)`, `(46,48)`; 1 gato `(26,12)`; 1 ovelha `(18,18)`.
- **Pirâmides** (5): 2 ovelhas `(-26,-6)`, `(-34,-12)`; 1 galinha `(-44,-14)`;
  1 cachorro `(-56,-10)`; 1 gato `(-68,-34)`.
- **Arco-íris / campo norte** (6): 4 ovelhas `(0,-12)`, `(14,-2)`, `(22,-8)`,
  `(30,-40)`; 1 galinha `(-6,-14)`; 1 gato `(26,-18)`.
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
   anéis fechados (todo endpoint compartilhado ≤ 0,8 m)**; **deflexão ≤ 60°**;
   nenhuma estrada cruza o oásis (tolerância de segurança de 4 m); amostras da
   spline (CatmullRom centripetal, 70 amostras) a ≥ 2,0 m de todo sólido;
   spawn `(0,20)` ≤ 3 m da estrada; POIs (vila, oásis, pirâmides, alameda) a
   ≤ 8 m; **postes na faixa [2,5..5,0]** da spline; **≥ 30 animais** (32) com
   wander livre de estradas/oásis/sólidos; tour de voo (240 pts)
   `3,2 ≤ y ≤ 26`, clareza ≥ 1,5 m, arco-íris `[24,10,-24]` presente; sem
   `Math.random`/`rand()` para posição no layout puro.
3. Tour de trilhos: `node scripts/check-rail-tour.mjs` — car desert com
   **0 U-turns**, cobertura total da rede (x1,00), off-road 0,00.
4. Evidência visual em `_shots/` (`qa5-deserto-*.png`: topdown, vila, oásis,
   pirâmides, arco, cactos, estrada, carro, noite).
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
  virou o handle do anel A; o spawn `(0,20)` fica a 2 m da estrada (a A1 passa
  em `(2,20)`) — o veículo "glide" até o tour.
- **Casa `(6,28)→(2,32)`**: a primeira versão colocou a casa sobre a spline
  (o spline "estufa" além do polígono de controle); o auto-check com amostras
  pegou e a casa foi recuada.
- **Passagem N do cluster em "S"**: a pirâmide média `(-54,-24)` obriga um
  desvio gentil (deflexões até ~57°) entre `(-42,-26)` e `(-60,-19)`; a
  estrada passa a ≥ 7 m do centro dela.
- **Rampa na duna NE**: o canto NE do anel A sobe a duna `(58,42)` (~1,4 m) —
  a faixa acompanha o terreno com pitch por segmento (regra 8), sem degraus.
- **POI pirâmides** = `(-40,-30)` (aproximação da estrada, 4 m dela): o anel B
  envolve o cluster a ~8–10 m dos centros — ver de longe, sem encostar.
