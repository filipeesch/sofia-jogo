# Design de Fase — Vale Vivo (`valley`, worldType `valley`)

Reconstrução da fase do vale (carro + avião) para ser **coesa** e **~5x maior
em área útil** (conteúdo dentro de r≈95 do hub (0,0); centros dos morros
dentro de r≈85): cada elemento vive onde faz sentido (vila na estrada
principal, fazenda cercada com animais no curral, lago com bancos e patos,
floresta densa com galinha no meio, arco-íris que a R2 cruza). Sem texto,
sem punição, sem nada assustador — para crianças de 2–3 anos.

## 1. Tema
Um vale grande e vivo com:
- **Vila** de 5 casinhas na estrada principal (todas voltadas para a rua),
  com 10 postes de luz reais (`THREE.PointLight`) que aquecem a noite.
- **Fazenda** (`-64,34`): curral 18×18 com **1 portão na cerca leste
  `(-55,32)`** (onde a R4 chega); **celeiro** `(-50,44)` no pátio, fora da
  cerca; **6 animais dentro do curral** (2 bois, 2 ovelhas, 2 galinhas) e
  2 no pátio (cachorro, gato).
- **Lago** (`56,-36` r 13,5): 3 bancos na margem (NW/L/S), **4 patos na
  faixa da margem [r, r+1,6]**, ovelha/boi/cachorro pastando na beira.
- **Floresta** (`54,48`): anel 8..18 com ~55 árvores alvo (mix pinheiro/
  árvore/maçã); **1 galinha no meio do campo** (a galinha do bosque).
- **Arco-íris** global em x 11..37, z = −24: a R2 passa por baixo do arco.
- Morros suaves emolduram o anel de conteúdo; o fundo do vale (vila,
  fazenda, lago, estradas) é plano; só a R3 sobe um degrau leve rumo à
  floresta.

## 2. Estradas (5, conectadas, hub (0,0))
Fonte única: `VALLEY_ROADS` em `src/world/valleyLayout.ts` (usada por
`src/rails/roadDefs.ts`, `Roads.ts` e o tour on-rails).

| ID | Controle | Papel |
|----|----------|-------|
| R1 | `[[0,26],[0,14],[0,0]]` | Principal: spawn `(0,20)` → hub |
| R2 | `[[0,0],[16,-10],[26,-24],[40,-30],[46,-24]]` | Hub → arco-íris → beira do lago |
| R3 | `[[0,0],[18,12],[36,26],[44,34]]` | Hub → borda da floresta |
| R4 | `[[0,0],[-16,6],[-34,18],[-48,26],[-55,32]]` | Hub → portão da fazenda |
| R5 | `[[-55,32],[-28,48],[6,54],[36,26]]` | Portão → anel N → junta na R3 em (36,26) |

Pontos cegos (U-turn no tour do carro): fim do R1 `(0,26)`, beira do lago
`(46,-24)` e borda da floresta `(44,34)` — 3 U-turns no total.

## 3. Zonas e âncoras
- **Casas** (banda 5,1..8,1 m da spline da estrada, todas voltadas para a
  rua): `(10,16)` R3, `(7,12)` R1, `(-7,10)` R1, `(-8,22)` R1, `(-7,16)` R1.
- **Postes** (10, NÃO são sólidos; banda 2..5 m da estrada):
  `(2.6,20) (-2.6,14) (4.5,8) (-3.2,6) (11,-3) (24,-18) (38,-26) (43,28)
  (-26,10) (-50,24)`. À noite: emissivo 1.6 + `PointLight(0xffd97a, 2.6,
  dist 14)` a `y+3.3`.
- **Bancos** (3, na margem do lago, voltados para a água): `(42,-18)
  (71,-34) (52,-50)`.
- **Cerca**: 22 postes (linhas N/S completas c/ cantos; E/W só miolo;
  portão leste sem postes a ±3 m do z=32). Postes **são sólidos** (r0.4).
- **Animais** (18, r1.0, wander 14–15 m):
  - Curral (6): bois `(-67,31) (-59,38)`, ovelhas `(-68,38) (-60,30)`,
    galinhas `(-63,33) (-59,33)`.
  - Pátio (2): cachorro `(-50,40)`, gato `(-66,46)`.
  - Vila (6): cachorro `(12,22)`, gato `(-12,22)`, galinhas `(12,-12)
    (-14,-4)`, ovelhas `(16,4) (-16,-10)`.
  - Lago (3): ovelha `(34,-40)`, boi `(28,-36)`, cachorro `(68,-48)`.
  - Bosque (1): galinha `(48,52)`.
- **Patos** (4, sem sólido, faixa da margem): `(43.5,-30) (49.5,-48.5)
  (68,-28) (66,-47)`.
- **Vegetação**: árvores do anel da floresta (pinheiro/árvore/maçã —
  `appletree.glb` no `assets.ts`), **18 arbustos + 34 flores** espalhados
  nos campos (com clearance de estrada/água/casas).

## 4. Terreno
`valleyTerrainHeight(x,z)` = soma de hemisférios (mesma fórmula dos outros
mundos). 6 morros:

| (x,z) | r | h | papel |
|-------|---|---|-------|
| (-52,66) | 26 | 2.6 | NW do anel da R5 |
| (34,36) | 28 | 2.4 | abaixo da floresta (R3 sobe) |
| (0,-85) | 46 | 3.6 | borda norte |
| (-82,-20) | 34 | 3.0 | borda oeste |
| (84,10) | 34 | 2.8 | borda leste |
| (44,70) | 24 | 2.4 | borda SE |

Vila/fazenda/lago ficam a ~0 m; a R3 ganha ~2 m subindo o morro da floresta.

## 5. Tour do avião (8 waypoints, fechado)
Idêntico a `src/rails/flightTour.ts` (valley):
`[[0,13,42],[0,11,2],[24,10,-24] (arco-íris),[50,14,-30],[56,14,48],[6,12,54],
[-64,14,34],[-30,13,0]]` — CatmullRom centripetal fechado, 240 amostras
`getPointAt`. Banda de altitude [3.2, 26] ± 0.5; clearance ≥ 1.5 m do
terreno.

## 6. Auto-check
`node scripts/check-valley-level.mjs` — 12 categorias:
1. determinismo (build duas vezes → deep equal)
2. conteúdo ≤ r95 (centros dos morros ≤ r85)
3. casas na banda [5.1, 8.1] da spline
4. 5 estradas conectadas; nenhuma cruza o lago; R4 termina no portão (linha
   leste da cerca)
5. amostras da spline (CatmullRom centripetal, n=70) ≥ r_sólido + 2.0 de todo
   sólido (animais isentos)
6. spawn (0,20) ≤ 3 m da R1; POIs ≤ 8 m de estrada: vila (0,0), lago
   (46,-24), fazenda (-55,32), floresta (44,34), arco-íris (24,-24)
7. animais ≥ 3 m de estrada, fora da água; **6 animais dentro do curral**
8. patos na faixa da margem [r, r+1.6]
9. postes a 2..5 m de estrada e longe de sólidos
10. tour do avião: banda, clearance ≥ 1.5, waypoint↔POI, arco-íris
11. sem `Math.random`/`rand()` no layout puro
12. sólido×sólido (animais×animais ignorados)

Contrato `layoutSolids` (compartilhado c/ o tour on-rails): casas, celeiro,
cerca, bancos, árvores e animais — **postes, arbustos, flores e patos NÃO
são sólidos**.

## 7. Desvios documentados
- **42 árvores no anel (meta 55)**: o rejeitamento por clearance (estrada,
  árvores vizinhas, campo da galinha) só acomoda 42 no anel 8..18 com a
  semente 20240415. Mix determinístico: 16 pinheiros / 15 árvores / 11
  maçãs.
- **Morros re-tunados**: os parâmetros exatos do arquivo original se perderam
  quando uma sub-sessão paralela sobrescreveu `valleyLayout.ts` (18/08,
  ~16h); a lista de 6 morros acima foi reconstruída mantendo os mesmos
  invariantes (centros ≤ r85, vale plano, R3 sobe, floresta no topo).
- **Cerca com 1 portão** (leste, onde a R4 chega) — o carro "parar na
  fazenda" resolve no portão; o celeiro fica no pátio, fora da cerca.

## 8. QA visual
- Dia: top-down (vila + anel R3/R5 + fazenda + lago + floresta), chase cam
  sobre a R1 com faixa tracejada, carros de tráfego, arco-íris, balões e
  dirigíveis.
- Noite (`valenoite`): postes acesos com poça de luz real no chão
  (`PointLight`), janelas das casas acesas, estrelas.
- Câmeras de QA < ~150 u (fog 60..240).
