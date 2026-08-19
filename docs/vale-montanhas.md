# Design de Fase — Vale das Montanhas (`montanhas`, worldType `mountains`)

Reconstrução da fase de montanhas para ser **coesa** e **5x maior em área útil**:
cada elemento vive onde faz sentido (vila na estrada, fazenda com cercado e
gado, lago com patos na margem, poço no campo, pinheiral denso com clareira,
anel de 8 picos nevados como borda do vale). Sem texto, sem punição, sem nada
assustador — para crianças de 2–3 anos.

Rework de 2025-08 (regras novas da skill `level-gen`): a rede de estradas agora
é **fechada em laços** (sem beira-morte — todo extremo de estrada é
compartilhado com outra), as curvas têm **deflexão ≤ 60°** (nada de canto de
90°), a estrada acompanha o relevo de forma suave, e o vale tem **31 animais**
(regra: ≥ 30). O tráfego ambiente foi removido do jogo inteiro — só o veículo
do jogador existe na estrada.

## 1. Tema
Um vale grande e aberto cercado por **8 picos nevados** (borda em r ≈ 96–99).
No centro, uma vila de 5 cabanas com postes de luz; a oeste, uma **fazenda**
com cercado, celeiro e gado; a noroeste, um **lago** redondo com patos na
margem; um pequeno **poço** no campo ao norte; a leste, um **pinheiral** denso
com clareira; e, nas encostas dos picos, 4 bonecos de neve que olham o vale.
Um arco-íris pontua o céu (herdado do jogo) e, à noite, as janelas e os
postes acendem.

## 2. Mapa (zona por zona, coordenadas x/z; piso do vale em y=0; hub da vila em (0,6))
- **Vila** (hub `0,6` — onde os dois anéis se encontram): 5 cabanas, cada uma
  ao lado do seu trecho de estrada, porta virada para a via:
  `12,16` e `-7,11` (ao lado da R1), `7,-13` (na R4), `-14,-2` (na R2),
  `4,26` (na R1, norte do hub). 10 postes de luz distribuídos nos dois anéis
  (faixa 2–5 m da estrada).
- **Lago** (`-38,-30`, raio 11): o anel oeste passa **na margem NE** (`-38,-16`,
  nunca cruza a água); banco `-32,-20` voltado para a água; 4 patos na faixa de
  margem `[11, 12,6]` (lado oeste/sul, longe da estrada).
- **Poço** (`14,-46`, raio 4,5): lagoa pequena no anel norte; banco `10,-42` na
  margem; 2 patos na faixa `[4,5, 6,1]`.
- **Fazenda** (oeste): cercado 14×14 centrado em `(-30,20)` (postes a cada 3,5u)
  **dentro do anel oeste**; celeiro `(-14,38)` ao lado da estrada; 2 cachorros
  perto do celeiro; 4 animais dentro do cercado (2 ovelhas + 2 galinhas) em
  grade com ≥ 3 m; vacas pastando fora.
- **Pinheiral** (leste, centro `56,30`): anel denso de 42 pinheiros entre r=14
  e r=36; o anel leste (R3) **chega na clareira** (`46,22`) e a R4 volta pelo
  norte — a estrada corta o anel numa faixa limpa de árvores (rejeição);
  **nenhuma casa dentro** (floresta é dos pinheiros).
- **Picos nevados**: 8 cones em anel (r ≈ 96–99, base 24–25, alturas 30–35),
  perfil linear — montanhas de brinquedo, nunca íngremes demais.
- **Colinas suaves**: 4 domos baixos (h 3,5–4,0) longe das estradas para variar
  o horizonte sem subir a via.
- **Campos abertos** (entre as zonas): 8 árvores fixas + pinheiros da floresta
  por rejeição, 40 arbustos e 70 flores — respiro visual entre os blocos.
- **Bonecos de neve** (L4): 4, nas encostas dos picos leste, oeste, norte e
  sul, sempre de frente para o vale.

## 3. Estradas (dois anéis fechados, sem beira-morte)
Malha de **4 polilinhas** formando **dois anéis fechados** que compartilham o
nó da vila — todo ponto final de estrada é compartilhado com outra estrada,
então o passeio completo não precisa de meia-volta (0 U-turn no tour de
trilhos):

| Trecho | Pontos de controle | No anel |
|---|---|---|
| R1 | `0,6 → 0,20 → -10,28 → -22,34 → -34,36 → -44,30 → -50,18 → -50,4 → -46,-8 → -42,-14 → -38,-16` | Oeste (vila → fazenda → lago NE) |
| R2 | `-38,-16 → -28,-14 → -18,-10 → -8,-4 → 0,6` | Oeste (lago → vila) |
| R3 | `0,6 → 16,10 → 30,16 → 40,20 → 46,22` | Leste (vila → clareira do pinheiral) |
| R4 | `46,22 → 50,19 → 50,10 → 46,2 → 38,-8 → 28,-18 → 18,-28 → 10,-36 → 4,-40 → -3,-39 → -6,-34 → -4,-22 → 0,-12 → 0,6` | Leste (clareira → norte/poço/mirante → vila) |

Nós compartilhados: vila `0,6` (grau 4 — os dois anéis se encontram), margem do
lago `-38,-16` (grau 2) e clareira `46,22` (grau 2). Deflexão máxima entre
segmentos de controle: **≤ 60°** (a spline Catmull-Rom centrípeta suaviza
ainda mais). Sem cruzar o lago (limite ≥ 13 m do centro), sem cruzar o poço
(≥ 6,5 m), sem tocar os picos (≥ 26 m do centro dos cones), sem sair do piso
do vale (altura máxima na via ≈ 0,0 — as colinas ficam longe). O spawn do carro
`(0,20)` fica **em cima da R1** (o carro nasce e já está no anel).

## 4. História de descoberta
O carro nasce na R1, perto da vila, e a criança pode seguir qualquer direção —
os dois anéis são laços, então **não existe beco sem saída**: andando sempre em
frente, ela volta. Cada parada oferece uma descoberta: vila (casinhas + luzes)
→ fazenda (bichinhos no cercado, cachorros, celeiro) → lago (patos na margem,
banco) → pinheiral (a estrada entra na clareira e volta pelo norte) → poço e
mirante (patinhos, banco olhando os picos). Um passeio de 2–3 min toca as
paradas sem nunca precisar dar meia-volta. À noite, o mesmo vale acende
(janelas + postes) — recompensa de voltar.

## 5. Animais (31, cada um no seu habitat)
- **Cercado** (4): 2 ovelhas + 2 galinhas — wanderR ≤ 4, âncoras a ≥ 5 m da
  cerca, grade com ≥ 3 m entre animais.
- **Fazenda fora do cercado** (5): 2 cachorros perto do celeiro + 3 vacas
  pastando.
- **Vila / campos** (12): 2 gatos, 5 galinhas e 5 ovelhas espalhados pelos
  campos e pela vila, sempre com o círculo de passeio longe das estradas.
- **Norte (poço/mirante)** (3): 2 ovelhas + 1 vaca no campo norte.
- **Águas** (6): 4 patos na margem do lago + 2 na margem do poço (faixa
  `[r, r+1,6]`; sem solid de colisão, como nas outras fases).
Regra: nenhum animal nasce em picos, no meio da água ou na estrada; os raios
de wander são validados contra estradas/água/solids no auto-check. Cada animal
leva uma **esfera de hit invisível de r≈1,5** (global, `Animals.ts`) para o
toque ser generoso no tablet.

## 6. Dia/noite
A fase funciona nos dois estados:
- **Dia**: luz natural; postes apagados; bonecos de neve brancos nos picos.
- **Noite** (`noite` / Noite Estrelada, mesmo worldType, `startNight`): céu
  estrelado, janelas das 5 cabanas acesas (emissive), cabeças dos 10 postes em
  emissivo (`setNightLamps`). `World.setNight` aciona as luzes da vila.

## 7. Implementação técnica
- `src/world/mountainsLayout.ts` — módulo **puro, determinístico e livre de
  THREE**: seed `MOUNTAIN_SEED = 20240517` (`mulberry32`), zonas, estradas,
  objetos colocados, solids. `mountainTerrainHeight(x,z)` é a **única fonte de
  verdade** do terreno (cones lineares + domos de colina), compartilhada por
  renderização, colocação e auto-check.
- `src/world/Mountains.ts` — constrói a cena a partir do layout (L0→L4):
  terreno/picos/lago+poço (discos a partir de `layout.waters`), cabanas (House)
  viradas para a rua, postes (com `setNightLamps`), bancos
  (`layout.benches`), celeiro, cercas, animais (classe `Animal`, expostos em
  `this.animals`), árvores (GLB ou draft), arbustos/flores, bonecos. Jitter
  visual usa `mulberry32(MOUNTAIN_SEED + 1)` — **nunca** `Math.random` para
  colocação.
- `src/world/Roads.ts` — `kind: 'mountains'` usa `MOUNTAINS_ROADS`
  (Catmull-Rom centrípedo, 70 amostras; meia-largura 1,7u — a mesma matemática
  do auto-check). A faixa acompanha o terreno (média móvel de 5 amostras +
  pitch por segmento) — sem escadinhas.
- `src/world/World.ts` — ramo `mountains` cria estradas e empurra
  `mountains.animals` para `creatures`; **não** usa `scatterAnimals`
  (os animais têm habitat próprio). **Sem tráfego**: a classe `Traffic`
  foi removida do jogo inteiro.
- `src/rails/roadTour.ts` — tour do carro sobre a rede fechada: com todos os
  nós de grau par (vila 4, lago 2, clareira 2), o circuito de Euler anda a rede
  inteira com **0 U-turns**.
- `src/assets.ts` — lista de modelos do mundo montanhoso: casas, pinheiros,
  ovelha/galinha/cachorro/vaca/gato/pato, boneco de neve, celeiro, cerca,
  poste, banco, arbusto, flor.
- `src/levels.ts` — `montanhas` ("Vila, fazenda, lago e pinheiral entre picos
  nevados", `starCount` 22) e `noite` (mesmo worldType, `startNight`).

## 8. Garantias (Definition of Done)
1. `npm run typecheck` verde.
2. Auto-check estrutural: `node scripts/check-mountain-level.mjs` — 10 regras:
   solids sem sobreposição, wander de animais limpo de estradas/águas/solids
   (patos na faixa de margem `[r, r+1,6]` de alguma água), estradas sem
   cruzar água/solids/piso, grafo conectado, y == terreno para todo objeto,
   casas na faixa [5,1, 8,1] da estrada, spawn do carro na via, **sem
   beira-morte** (todo endpoint compartilhado com outra estrada),
   **deflexão ≤ 60°** entre segmentos de controle, **≥ 30 animais**.
   (Exclui o par intencional pico × boneco de neve.)
3. Tour de trilhos: `node scripts/check-rail-tour.mjs` — car mountains com
   **0 U-turns** (rede fechada) e flight mountains dentro da banda de altitude
   com clearance ≥ 2,5 m.
4. Evidência visual em `_shots/` (topdown dos dois anéis, vila, fazenda, lago,
   pinheiral, norte, noite).
5. Este documento + `LevelConfig` atualizados.

## 9. Invariantes do jogo (2–3 anos)
Sem texto, sem game over, sem vida, sem dano; uma interação por vez;
causa-efeito imediato; descoberta recompensa; nada assustador. As montanhas
são "de brinquedo": suaves, arredondadas, com bonecos de neve fofos.

## 10. Nota sobre o carro (mecânica global, não da fase)
O `CarController` tem condução automática suave (~9 u/s) com retorno para a
origem ao passar de 150u (`maxRadius`) — mesma em todas as fases do carro.
O limite de 150u ficou logo **fora do anel de picos** (r ≈ 96–99 + base
24–25 ≈ 121–124u até a borda), então o carro "volta para casa" antes de
travar nos picos. Se a criança não dirija, o carro segue o tour pelos dois
anéis; como são laços, ele nunca para num beco.
