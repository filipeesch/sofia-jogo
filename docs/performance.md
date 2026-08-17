# Performance do jogo (avião e carro) — análise e otimizações

## Diagnóstico

O jogo (Three.js) era **CPU-bound**: o custo por frame vinha de milhares de
*draw calls* e de um *shadow map* 2048px re-renderizado a 60fps, não da
quantidade de polígonos (geometria é low-poly). Isso explicava o framerate
baixo mesmo em máquinas competentes.

Contando os modelos GLB (cada .glb tem vários *meshes* = vários draw calls),
um cenário como a Ilha Feliz chegava a **~3000 draw calls por frame**:

| Fonte | Meshes por instância | Ocorrências | Draw calls (antes) |
|---|---|---|---|
| Estradas (segmentos BoxGeometry) | 2 | ~420 segmentos | **~840** |
| Flores (flower.glb) | 11 | 60 | **~660** |
| Arbustos (bush.glb) | 9 | 34 | **~306** |
| Árvores (palm/tree/appletree) | 9–11 | 34 | **~350** |
| Cercas (fence.glb) | 10 | 16 | **~160** |
| Postes, bancos, bonecos, cactos | 2–23 | — | **~150** |
| Animais, pássaros, balões, tráfego, aviões, céu | 5–31 | — | ~700 |

Além disso, loadGLB() marcava castShadow = true em **todos** os meshes, e o
sol se move a cada frame no ciclo dia/noite — então o *shadow pass* re-desenhava
a cena inteira a 60fps.

## O que foi feito

1. **Estradas mescladas** (src/world/Roads.ts) — todos os segmentos de uma
   rede viram **1 BufferGeometry por material** (2 draw calls no total).
2. **Instancing de props densos** (src/world/instancing.ts, novo) — árvores,
   arbustos, flores, cercas, postes, bancos, bonecos de neve e cactos passam a
   usar THREE.InstancedMesh (um por mesh do modelo). A vegetação da Ilha caiu
   de ~1500 draw calls para **64**. O balanço das árvores é preservado via
   atualização de matriz por instância.
3. **Sombras otimizadas** (src/core/Game.ts) — shadowMap.autoUpdate = false
   e o mapa é re-renderizado em cadência fixa (~7Hz) em vez de todo frame;
   mapa reduzido de 2048→1024. Props pequenos (flores, arbustos, cercas, postes,
   bancos) não mais projetam sombra.
4. **Hook de profiling** — com ?debug=1, window.__debug.stats() retorna
   draw calls, triângulos, memória GPU e contagens de instâncias.

## Resultados medidos

Câmera vendo o mundo inteiro (pior caso):

| Cenário | Draw calls (antes, est.) | Draw calls (depois) |
|---|---|---|
| Vale Vivo | ~2800 | **802** |
| Mundo da Neve | ~1500 | **712** |
| Deserto | ~1400 | **684** |

Com a câmera de jogo (chase), o frame típico fica em **50–75 draw calls**. O
custo do *shadow pass* caiu ~12× (60fps → ~7Hz) com mapa menor. **Zero erros de
runtime** em todos os cenários verificados (ilha, vale, montanhas, neve,
deserto, noite, valenoite).

## Recomendações seguintes (não implementadas)

- **Mesclar meshes dos GLBs por material** (no Blender): aviao.glb tem 31
  meshes, car.glb 31, cow 26, cat 24, chicken 21, bird 21, sheep 18, dog 17,
  whale 19, snowman 23. Animais + tráfego + aviões ambiente + pássaros + balões
  respondem por ~500 dos ~700 draw calls restantes. Fundir por material
  (mantendo nós animáveis como Propeller/Wheel/Wing) reduziria isso a ~1/3.
  Ver skill blender-model.
- **Nuvens**: cada nuvem são 5 esferas (10 nuvens = 50 draw calls) → mesclar as
  5 esferas em 1 geometria por nuvem (~10 draw calls).
- **Céu**: 22 sprites de estrelas cintilantes → 1 THREE.Points.

## Nota

O tsc --noEmit ainda aponta 14 erros de tipo, todos pré-existentes em
src/rails/roadTour.ts (módulo "sobre trilhos", ainda não rastreado no git).
Nenhum dos arquivos alterados aqui introduz erro de tipo; o build de produção
(vite build) compila normalmente.
