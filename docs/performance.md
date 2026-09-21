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

## Sair para o launcher: nada pode continuar a correr

Sintoma reportado: às vezes, ao voltar ao launcher com o 🏠, ouvia-se a música
do jogo e a app continuava a consumir recursos em segundo plano.

Causa: abrir uma fase é async (JSON da fase + vários GLBs). Um toque duplo no
cartão da fase — ou escolher outra fase enquanto a anterior ainda carregava —
corria startLevel() duas vezes, e o Game criado primeiro ficava sem referência:
o 🏠 só destruía o último. Cada órfão trazia o seu loop de render
(setAnimationLoop), o seu AudioContext com a música procedural e um canvas em
#app. Verificada com Playwright: 2, 3 e 4 jogos vivos ao mesmo tempo.

Invariantes de hoje:

1. navSeq (src/main.ts) — cada navegação incrementa o número; uma carga que
   ficou para trás desiste antes de construir renderer e áudio.
2. Game.live / Game.disposeAll() (src/core/Game.ts) — registo de todas as
   instâncias vivas; clearAll() destrói todas, por isso nenhum órfão sobrevive
   ao launcher mesmo que alguma corrida nova aconteça.
3. Game.dispose() é idempotente e corta por cima: loop de render, música
   (AudioManager.dispose() fecha o AudioContext, e ensure() recusa-se a
   recriar um context já fechado) e forceContextLoss() do WebGL.
4. O AudioContext partilhado dos sons gravados (src/ui/sfx.ts) não pertence a
   nenhum ecrã: adormece com idleSfx() (chamado por clearAll()) e com o ecrã
   bloqueado, e acorda sozinho quando alguém toca num som.
5. Ecrã bloqueado / app em segundo plano: visibilitychange, freeze e pagehide
   páram o loop, o cronómetro e a música — e o timer da música pára também,
   para não andar a acordar a página.
6. A música do mar das Bolhas (src/ui/seaAmbience.ts) não abre AudioContext
   próprio: usa o mesmo barramento partilhado do ponto 4, e pararMar() corta o
   marulho, o bordão e os LFOs no destroy() — o sequenciador de 16 passos é um
   setInterval que ele também limpa. É por isso que
   o passo «depois das Bolhas» de scripts/check-exit-cleanup.mjs continua a ver
   zero AudioContext em 'running', agora com cinco fontes de música a mais em
   jogo enquanto se está dentro da app.

Verificação: node scripts/check-exit-cleanup.mjs abre o jogo num browser real
e depois de cada saída (normal, toque duplo, troca rápida de fase, __loadLevel
da ferramenta MCP, editor → Testar, Pintura/Bolhas/Quebra-Cabeça) confirma que
#app fica vazio, que não fica nenhum Game vivo (window.__diag().games), que
não fica nenhum AudioContext em 'running' e que nenhum canvas continua a
mudar de pixels. Precisa do dev server (npm run dev); use GAME_URL se a porta
não for a 5173.

O passo [1] (arranque normal) afirmava logo a seguir a '.btn.hud-home' aparecer,
mas o canvas do renderer é afixado ~90 ms depois (medido: 90, 91 e 100 ms), por
isso ele chumbava há muito tempo com três FAIL — canvases=0, musicRunning=0,
active=0 — que não eram um problema do jogo, eram do teste. Agora espera pelo
canvas antes de afirmar, e o check passa inteiro.

## As apps de DOM (Bolhas, Pintura): aqui mede-se fps, não draw calls

As apps de brinquedo não têm canvas nem Three.js — são HTML e CSS. Isso não é de
graça: nas Bolhas há uma cena inteira em movimento permanente, com 18 figuras de
cenário (algas, conchas, duas ostras, cavalos, um caranguejo, uma baleia e os
peixes que passam) a somar 470 nós de SVG, mais as bolhas que sobem sozinhas ou
do soprar, e uma música procedural por cima. É exactamente aqui que uma cena
«só DOM» se desmente num tablet.

Verificação: `npm run check:fps-bolhas` (scripts/check-bubbles-fps.mjs) abre as
Bolhas com `?debug=1`, conta os intervalos entre `requestAnimationFrame` durante
6 s em três situações, e confirma que a música estava mesmo a tocar durante a
medição (5 fontes vivas, RMS 0,016 a 0,025 com o barramento no 0,8 do jogo do avião):

| Situação | fps mediano | 10% piores | frames > 20 ms |
|---|---|---|---|
| a cena sozinha, com a vida própria e a música | **59,9** | 59,9 | 0 / 359 |
| soprando sem parar, ecrã cheio (8 bolhas) | **59,9** | 59,9 | 0 / 359 |
| soprando com o CPU 4× mais lento | **59,9** | 59,9 | 0 / 359 |

O custo real da cena, medido no mesmo instante: **40 a 43 animações CSS a
decorrer ao mesmo tempo** — as três bolhas do sopro da baleia e o abrir e
fechar da boca incluídos, todas de `transform` e `opacity`. É esse o número que
um tablet paga, e não os nós parados.

Porque é que o CPU 4× mais lento não se nota: quase nada corre na *main thread*
a cada frame. As animações são todas de `transform` e `opacity` — a sombra vai no
contentor que só translada, o gingado vai no `<span>` interior, e as patas do
caranguejo são dois `rotate` num grupo — por isso vivem no compositor. Na main
thread só há cronómetros lentos: o spawner de bolhas (900 ms), o soprar (240 ms)
e o agendador da música (250 ms). O throttle é por isso um **limite inferior**,
não uma simulação fiel de tablet.

Daqui fica a regra para as próximas figuras: **sombra no contentor parado,
movimento no interior**, e nunca um `filter`/`blur` num elemento que se mexe — aí
o compositor tem de re-rasterizar o desenho a cada frame, e é isso que deita o
framerate abaixo.

*(Nota honesta: na primeira corrida, com o Vite ainda a transformar módulos,
apanhou-se um único frame de 133 ms. Nas corridas seguintes, com a cena quente,
zero frames lentos em três situações.)*

## Nota

O tsc --noEmit ainda aponta 14 erros de tipo, todos pré-existentes em
src/rails/roadTour.ts (módulo "sobre trilhos", ainda não rastreado no git).
Nenhum dos arquivos alterados aqui introduz erro de tipo; o build de produção
(vite build) compila normalmente.
