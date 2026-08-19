# Design de Fase — Ilha Feliz (`ilha`, worldType `island`)

Reconstrução da fase da ilha para o avião: **coesa** e **5x maior em área útil**
(raio da ilha 34 → 76). Cada elemento vive onde faz sentido: vila na estrada,
lagoa com patos na margem, fazenda com cercado e gado, prainha com palmeiras,
e — por ser uma ilha **tropical** — serras **rochosas e verdes, sem nenhuma
neve** (o antigo "teto branco" da montanha era a inconsistência apontada;
removido de vez, junto com o `mountain.glb`/`peak.glb` nevados, que saíram da
lista de modelos da ilha). Sem texto, sem punição, sem nada assustador — para
crianças de 2–3 anos.

Rework de 2024-06 (regras novas da skill `level-gen`): a rede de estradas
agora é **fechada em laços** (sem beira-morte), as curvas têm deflexão ≤ 60°,
a estrada acompanha o relevo de forma suave (sem "escadinha" no morro), a
vila tem 7 casas e a ilha tem **34 animais**. O tráfego de carros ambiente foi
removido do jogo inteiro — só o veículo do jogador existe na estrada.

## 1. Tema
Uma ilha grande e quente em alto mar: ao sul, um campo aberto que recebe o
anel sul da estrada; no centro, uma vila de 7 casas coloridas em volta do
nó onde os dois anéis se encontram; a leste, uma **lagoa** redonda que o anel
da estrada contorna por fora, com patos na margem; a oeste, uma **fazenda**
com cercado, celeiro e gado; ao norte, a **serra** — dois morros rochosos
(um grande, um menor) com pedras soltas no alto, **sem neve**; e, em todo o
litoral, uma faixa de areia com **palmeiras**. Baleia no mar aberto
(sudoeste), pássaros, balões e nuvens no céu. Um arco-íris pontua a costa
norte.

## 2. Mapa (zona por zona, coordenadas x/z; ilha de raio 76, dome central h≈4)
- **Vila** (nó `0,4` — onde os dois anéis se encontram): 7 casas, cada uma
  ao lado do seu trecho de estrada, porta virada para a via:
  `-20,20` (trecho da fazenda), `-8,44`, `2,45` e `12,43` (praia), `40,-4` e
  `28,-5` (lagoa), `4,-10` (vale central). 12 postes de luz distribuídos nos
  dois anéis (faixa 2–5 m da estrada).
- **Lagoa** (`38,20`, raio 10): a estrada **contorna** a lagoa (nunca cruza a
  água); o terreno é suavemente aplainado num "tanque" até a cota do fundo da
  lagoa para a água assentar justa; banco `30,9` voltado para a água; 4 patos
  na faixa de margem `[10, 11,6]`.
- **Fazenda** (oeste): cercado 16×16 centrado em `(-40,14)` (postes a cada
  4u, sem portão — a estrada não chega mais até ela); celeiro `(-54,24)` fora,
  a noroeste; 8 animais dentro do cercado (4 galinhas, 3 ovelhas, 1 vaca) em
  grade com ≥ 3 m entre eles; 3 vacas pastando no campo oeste.
- **Serra** (norte): morro grande `(-16,-42)` (base 16, h 16) e menor
  `(34,-26)` (base 11, h 10) — domos rochosos verdes-cinza com 4 pedras
  facetadas cada um; **zero neve**. O anel B passa **no pé** do morro grande
  e fecha pela sela `0,-30` (banco `-18,-26` mirando o topo); o vale central
  entre os anéis fica aberto para os animais do campo norte.
- **Prainha / litoral**: anel de areia (raio 73 → 81,5) + 17 palmeiras fixas
  no litoral sul/sudoeste; colinas suaves (6, h 2,8–3,4) variam o horizonte;
  banco `6,58` olhando o mar.
- **Campos abertos** (entre as zonas): 34 árvores/palmeiras espalhadas por
  rejeição + palmeiras fixas do litoral, arbustos e flores.

## 3. Estradas (rede fechada em dois anéis, sem beira-morte)
Malha de **4 polilinhas** formando dois anéis que compartilham nós — todo
ponto final de estrada é compartilhado com outra estrada, então o passeio
completo não precisa de meia-volta (0 U-turn no tour de trilhos):

| Trecho | Pontos de controle | No anel |
|---|---|---|
| A1 | `0,4 → -12,8 → -24,14 → -30,26 → -22,42 → 0,52 → 18,48 → 32,38 → 45,31` | A (sul/lagoa): vila → fazenda → praia → lagoa SW |
| A2 | `45,31 → 52,20 → 48,8 → 36,2 → 20,0 → 0,4` | A: lagoa E/NE → vila |
| B1 | `0,4 → -12,-8 → -14,-22 → -8,-28 → 0,-30` | B (montes): vila → pé da serra grande → sela |
| B2 | `0,-30 → 10,-27 → 16,-16 → 10,-6 → 0,4` | B: sela → vale central → vila |

Nós compartilhados: vila `0,4` (grau 4), sela `0,-30` (grau 2) e
encruzilhada da lagoa `45,31` (grau 2). Deflexão máxima entre segmentos de
controle: **59,6°** (regra da skill: ≤ 60° — nada de canto de 90°). A
spline Catmull-Rom suaviza ainda mais. A faixa da estrada acompanha o
terreno (média móvel de 5 amostras + pitch por segmento) — morro sem
escadinha. Sem cruzar a lagoa (limite ≥ 12 m), sem tocar os solids, sem sair
da ilha. A1 sobe no máximo ~2,3 m em 20 m no trecho da praia — rampa
gentil.

## 4. História de descoberta
O avião nasce sobre o campo sul (`0,42`) e a criança voa em círculos sobre a
vila (casinhas + luzes), depois explora cada zona pelo tour de voo: lagoa
com patinhos e banco → praia com palmeiras e a baleia no mar → fazenda com
bichinhos no cercado → serra rochosa (bem diferente da neve!) → sela entre os
morros. Um passeio de 2–3 min toca as paradas. À noite, as janelas e os
postes da vila acendem. Toque nos animais (a alça invisível de ~1,5 m de
raio facilita o clique no tablet): o bicho pula e faz barulinho.

## 5. Animais (34, cada um no seu habitat)
- **Cercado** (8): 4 galinhas, 3 ovelhas e 1 vaca — wander ≤ 4, âncoras a
  ≥ 5 m da cerca, grade com ≥ 3 m entre animais.
- **Campo oeste** (3): 3 vacas pastando fora do cercado.
- **Vila / campo central** (6): 2 cachorros, 2 gatos, 2 galinhas.
- **Campo sul** (7): 4 ovelhas + 3 galinhas entre a vila e a praia.
- **Lagoa** (4): 4 patos **na margem** (faixa `[r, r+1,6]`; sem solid de
  colisão, como nas outras fases).
- **Campo norte** (6): 2 ovelhas, 2 cachorros, 1 gato, 1 galinha.
Regra: nenhum animal nasce na praia, no mar, na água ou na estrada; os raios
de wander são validados contra estradas/lagoa/solids no auto-check. A baleia
(ambient, `World`) ficou no mar aberto a sudoeste, longe da faixa de areia.
Toda fase tem agora ≥ 30 animais (regra da skill) e cada animal leva uma
**esfera de hit invisível de r≈1,5** (`visible = false` — o raycaster
ignora a visibilidade) para o toque ser generoso no tablet.

## 6. Dia/noite
A fase funciona nos dois estados:
- **Dia**: sol de ilha, mar azul; postes apagados; serras rochosas secas.
- **Noite** (ciclo diurno da fase, `startNight: false` mas com ciclo de
  150s): céu estrelado, janelas das 7 casas acesas (emissive), cabeças dos 12
  postes em emissivo (`setNightLamps` — `World.setNight` aciona a ilha junto
  de vale/montanhas).

## 7. Implementação técnica
- `src/world/islandLayout.ts` — módulo **puro, determinístico e livre de
  THREE**: seed `ISLAND_SEED = 20240601` (`mulberry32`), zonas, estradas,
  objetos colocados, solids. `islandTerrainHeight(x,z)` (dome + serras
  + colinas + **aplainamento do tanque da lagoa**) é a **única fonte de
  verdade** do terreno, compartilhada por renderização, colocação e
  auto-check. (Bug caçado no rework: o `continue` dentro do `for` de
  rejeição das casas só saltava para a casa seguinte — as árvores/arbustos/
  flores agora usam `nearHouse` + `break`.)
- `src/world/Island.ts` — constrói a cena a partir do layout (L0→L4): dome +
  areia + colinas + **serras procedurais rochosas** (dome que casa com a
  função de terreno + 4 pedras facetadas por morro — **sem neve**), lagoa
  (disco a cota do fundo), casas (House) viradas para a rua, postes (com
  `setNightLamps`), bancos, celeiro, cercas, animais (classe `Animal`,
  expostos em `this.animals`), palmeiras/árvores (GLB ou draft),
  arbustos/flores. Jitter visual usa `mulberry32(ISLAND_SEED + 1)` —
  **nunca** `Math.random` para colocação.
- `src/world/Roads.ts` — `kind: 'island'` usa `ISLAND_ROADS` (Catmull-Rom
  centrípedo, 70 amostras; meia-largura 1,7u — a mesma matemática do
  auto-check). A faixa acompanha o terreno: altura suavizada com média móvel
  de 5 amostras e **pitch por segmento** (yaw + inclinação), sem escadinhas.
- `src/world/World.ts` — ramo default (`island`) cria estradas e empurra
  `island.animals` para `creatures`; **não** usa mais `scatterAnimals`
  (os animais têm habitat próprio). **Sem tráfego**: a classe `Traffic`
  foi removida do jogo inteiro — a única coisa que roda pela estrada é o
  veículo do jogador.
- `src/world/Animals.ts` — cada animal ganha uma esfera de hit invisível
  (`SphereGeometry(1.5)`, `visible = false`, y +0,9) para o `raycaster`
  acertar com folga no tablet.
- `src/rails/flightTour.ts` — tour do avião atualizado para os POIs da nova
  rede: vila (nó dos anéis) → lagoa (o anel A contorna) → costa sul →
  fazenda → serra menor → **sela `0,-30`** (onde B1/B2 se encontram) →
  serra grande → costa NW.
- `src/assets.ts` — lista de modelos da ilha: palmeira, árvore, baleia,
  pássaro, balão, casa, **celeiro, cerca, poste, banco, pato, vaca**,
  arbusto, flor; **sem** `mountain`/`peak` nevados.
- `src/levels.ts` — `ilha` ("Vila, lagoa, fazenda e serra na ilha",
  `starCount` 22 — o raio de 90u das estrelas cobre a ilha de raio 76).

## 8. Garantias (Definition of Done)
1. `npm run typecheck` verde.
2. Auto-check estrutural: `node scripts/check-island-level.mjs` — 9 regras:
   solids sem sobreposição, wander de animais limpo de estradas/lagoa/solids
   (patos na faixa de margem `[r, r+1,6]`), estradas sem cruzar a lagoa /
   tocar solids / sair da ilha, **sem beira-morte** (todo endpoint
   compartilhado), **deflexão ≤ 60°** entre segmentos, y == terreno para
   todo objeto, casas na faixa [5,1, 8,1] da estrada, **≥ 30 animais**,
   spawn do avião (`0,42`) sobre a ilha e longe da lagoa.
3. Tour de trilhos: `node scripts/check-rail-tour.mjs` — car island com
   **0 U-turns** (rede fechada) e flight island dentro da banda de altitude
   com clearance ≥ 2,5 m.
4. Evidência visual em `_shots/` (topdown, vila, fazenda, serra, praia com a
   estrada acompanhando o morro, postes à noite).
5. Este documento + `LevelConfig` atualizados.

## 9. Invariantes do jogo (2–3 anos)
Sem texto, sem game over, sem vida, sem dano; uma interação por vez;
causa-efeito imediato; descoberta recompensa; nada assustador. A ilha é
"de brinquedo": litoral areado, serras arredondadas e **quentes** — nada de
neve em ilha tropical.

## 10. Desvios / decisões
- A fazenda **não tem mais estrada até ela** (a A1 passa a ~8 m do cercado):
  o cercado ficou sem portão — mais simples para a criança (nenhum caminho
  "meio aberto").
- O anel B **não contorna o morro menor**: cercá-lo exigia deflexões de 75–79°
  e o passeio ganha a serra por cima no tour de voo; o vale central fica
  aberto como campo de animais.
- Postes a 3,3–4,6 m da spline (regra da skill pedia 2–5 m; o spline
  "estufar" além do polígono de controle obrigou afundar alguns para ≥ 2,5 m
  de folga do checker, mantendo todos dentro da faixa).
