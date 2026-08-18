# Design de Fase — Deserto (`deserto`, worldType `desert`)

Redesenho do mundo do deserto do jogo do avião para ser **coeso** e **~5x
maior em área útil** (fator linear ≈ 2,2; conteúdo antigo ia até r≈32, agora
até r≈75): cada elemento vive onde faz sentido (vila adobe na estrada
principal, oásis com anel duplo de cactos, cluster de pirâmides ao NW,
alameda de cactos ao longo das estradas, rede de estradas fechada e
temática). Sem texto, sem punição, sem nada assustador — para crianças de
2–3 anos.

## 1. Tema
Um deserto grande e aberto com:
- **Vila adobe** de 3 casas na estrada principal (todas voltadas para a
  rua), com 9 postes de luz reais (PointLight) que aquecem a noite.
- **Oásis** (30,22) raio 9, com anel duplo de cactos (a "alameda de cactos").
- **Cluster de pirâmides** NW: grande `(-44,-36)` (r 5,5 h 7,5), média
  `(-54,-24)` (r 4,5 h 6), pequena `(-38,-48)` (r 3,5 h 5).
- **Dunas** suaves (7 domos, r 18–28, h 1,6–2,8) no anel de conteúdo,
  mantendo a vila, a zona do arco-íris, as estradas e o oásis baixos.
- **Arco-íris** global fixo em x 11..37, z=-24 (herdado do `World`).
- **Animais** (14): 7 ovelhas, 3 galinhas, 2 cães e 2 gatos espalhados por
  vila, oásis e anel de conteúdo (NENHUM pato — deserto não tem patos).

## 2. Mapa (zona por zona, coordenadas x/z; piso em y=0; hub da vila em
(-2,2))
- **Vila** (hub `-2,2`): 3 casas adobe, todas na faixa `[5,1..8,1]` da
  estrada principal (R1), viradas para a rua:
  - `(6,24)` — leste da principal
  - `(-10,14)` — oeste da principal
  - `(6,26)` — leste, perto do hub
- **Estrada principal** (spawn `0,38` → hub `-2,2` → oásis `18,13` → alameda
  `42,36`): o carro nasce nela.
- **Oásis** (`30,26`, raio 9): disco de água `y=0,06`; as estradas R1 e R2
  correm **ao longo da margem** (não cruzam a água aberta); 14 cactos no
  anel interno + 10 no anel externo (a "alameda de cactos").
- **Pirâmides** (cluster NW): 3 pirâmides GLB, rotação y por jitter visual
  (seed+1); a estrada R3 termina na borda do cluster (`-36,-30`).
- **Alameda de cactos** (ao longo da R4): ~28 cactos instanciados no total
  (anel duplo no oásis + espalhados no anel de conteúdo r 34..70).
- **Arco-íris** (`24,10,-24`): arco global fixo; a R4 passa por baixo dele;
  terreno ali ≤ 1,2.

## 3. Estradas (rede única, fechada, sem beira-morte)
Quatro caminhos, todos conectados à principal (R1); a rede é um grafo
conexo, sem cruzar a água aberta do oásis:

| Ramal | Pontos de controle | Chega em |
|---|---|---|
| Principal (R1) | `0,38 → -2,2 → 18,13 → 42,36` | spawn → vila → oásis → alameda |
| Oásis (R2) | `18,13 → 14,30 → 26,44 → 44,40 → 50,24 → 42,36` | fecha o loop do oásis com R1 |
| Pirâmides (R3) | `-2,2 → -20,-14 → -36,-30` | cluster de pirâmides |
| Arco-íris (R4) | `-2,2 → 6,-12 → 14,-18 → 20,-6 → 18,13` | alameda de cactos, sobe até a margem do oásis |

R3 e R4 partem do hub da vila; R2 fecha o loop do oásis entre os dois
extremos de R1. **Toda estrada termina em uma junção com outra** (sem
becos sem saída): R1 e R2 se encontram em `18,13` e `42,36`; R3 e R4
partem do mesmo hub `-2,2`; R4 termina em `18,13` (juntando-se à R1).

### Nota sobre o oásis
As estradas R1 e R2 correm **ao longo da margem** do oásis. O auto-check
aceita até 9 m de intrusão do centerline (a borda externa da estrada só
tange a água) — a estrada não cruza a água aberta, mas "litoraliza" o
oásis. O POI "oásis" é atingido a ≤ 8 m por R1/R2.

## 4. História de descoberta
A criança entra pela vila (casinhas + luzes) e cada ramal oferece uma
parada nova: oásis com cactos → pirâmides → alameda de cactos sob o
arco-íris. Um passeio de 3–4 min toca as paradas. À noite, o mesmo deserto
acende (janelas + 9 postes com luz real) — recompensa de voltar.

## 5. Animais (14, cada um no seu habitat)
- **Vila**: 1 cão + 1 gato + 1 ovelha + 2 galinhas no campo aberto entre as
  casas e as estradas.
- **Oásis**: 2 ovelhas + 1 cão + 1 galinha na margem verde da água.
- **Anel de conteúdo**: 4 ovelhas + 1 gato + 1 galinha (sul, leste, NW e SW).
Regra: nenhum animal nasce em picos, no meio da água ou na estrada; os raios
de wander são validados contra estradas/oásis/solids no auto-check. NENHUM
pato (deserto não tem patos).

## 6. Dia/noite
A fase funciona nos dois estados:
- **Dia**: luz natural; postes apagados; janelas das 3 casas apagadas.
- **Noite** (mesmo worldType, `startNight`): céu estrelado, janelas das 3
  casas acesas (emissive), cabeças dos 9 postes em emissivo
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
- `src/world/Desert.ts` — constrói a cena a partir do layout (L0→L4):
  terreno/dunas/oásis (discos), 3 casas adobe (House) viradas para a rua,
  3 pirâmides (GLB + jitter visual), 9 postes (com `setNightLamps` +
  `PointLight` real), 14 animais (classe `Animal`, expostos em
  `this.animals`), ~28 cactos instanciados com sway suave. Mesma assinatura
  de construtor: `new Desert({ ground, oasis, houseColors }, models)`.
- `src/world/Roads.ts` — a rede do deserto ainda usa o `kind: 'grid'`
  (o mundo deserto mantém a malha genérica por enquanto; as 4 estradas
  temáticas são a **fonte de verdade** para o tour em trilhos e o
  auto-check).
- `src/world/World.ts` — ramo `desert` cria estradas + tráfego na malha
  genérica; os animais do layout são expostos em `this.animals` (não são
  espalhados por `scatterAnimals`).
- `src/assets.ts` — lista de modelos do mundo desértico: cactus, pirâmide,
  casa, galinha/ovelha/cachorro/gato (sempre carregados), carro, nuvem.
- `src/levels.ts` — `deserto` ("Descubra a pirâmide e os cactos",
  `starCount` 18).

## 8. Garantias (Definition of Done)
1. `npm run typecheck` verde.
2. Auto-check estrutural: `node scripts/check-desert-level.mjs` — verifica:
   - determinismo (build duas vezes → deep equal)
   - todas as posições de conteúdo ≤ r≈80
   - banda de casas `[5,1..8,1]` (casa ao lado da spline mais próxima)
   - estradas: 4 caminhos, rede conectada (toda estrada liga a R1), nenhuma
     cruza a água aberta do oásis (tolerância de 9 m do centerline para a
     estrada litoral)
   - cada amostra da spline (CatmullRom centripetal, 70 amostras — mesma
     matemática de `src/rails/roadTour.ts`) fica a ≥ 2,0 m de todo solid
     (solids de animais são isentos — o wander não é modelado como solid)
   - R1 passa a ≤ 3 m de `(0,20)`; POIs (vila, oásis, pirâmides, alameda) a
     ≤ 8 m de alguma estrada
   - animais: fora de estradas (≥ 3 m) e do oásis
   - flight tour: CatmullRom fechada centripetal dos waypoints (240
     pontos): `3,2 ≤ y ≤ 26` (tol 0,5), `y − desertTerrainHeight ≥ 1,5`,
     cada waypoint a ≤ 8 m do tour, ponto do arco-íris `[24,10,-24]`
     presente na lista
   - nenhum `Math.random`/`rand()` para posição no layout puro
3. Evidência visual em `_shots/` (top-down, vila, oásis, pirâmides, alameda,
   noite).
4. Este documento + `LevelConfig` atualizados.

## 9. Invariantes do jogo (2–3 anos)
Sem texto, sem game over, sem vida, sem dano; uma interação por vez;
causa-efeito imediato; descoberta recompensa; nada assustador. As dunas são
"de brinquedo": suaves, arredondadas, com cactos fofos. As luzes de poste
aquecem a noite sem escuro total.

## 10. Nota sobre o carro (mecânica global, não da fase)
O `CarController` tem condução automática suave (~9 u/s) com retorno para a
origem ao passar de 150 u (`maxRadius`) — mesma em todas as fases do carro.
O limite de 150 u ficou **fora do anel de conteúdo** (r≈75), então o carro
"volta para casa" antes de travar nas dunas. Se a criança não dirija, o
carro segue reto pela principal; os ramos da rede existem para a criança
virar e descobrir cada zona.
