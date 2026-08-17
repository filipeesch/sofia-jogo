# Design de Fase — Ilha Feliz (`ilha`, worldType `island`)

Reconstrução da fase da ilha para o avião: **coesa** e **5x maior em área útil**
(raio da ilha 34 → 76). Cada elemento vive onde faz sentido: vila na estrada,
lagoa com patos na margem, fazenda com cercado e gado, prainha com palmeiras,
e — por ser uma ilha **tropical** — serras **rochosas e verdes, sem nenhuma
neve** (o antigo "teto branco" da montanha era a inconsistência apontada;
removido de vez, junto com o `mountain.glb`/`peak.glb` nevados, que saíram da
lista de modelos da ilha). Sem texto, sem punição, sem nada assustador — para
crianças de 2–3 anos.

## 1. Tema
Uma ilha grande e quente em alto mar: ao sul, um campo aberto que recebe a
estrada principal; no centro, uma vila de 6 casas coloridas em volta do
cruzamento; a leste, uma **lagoa** redonda com 2 patinhos na margem; a oeste,
uma **fazenda** com cercado, celeiro, ovelhas, galinhas, vaca e cachorro; ao
norte, a **serra** — dois morros rochosos (um grande, um menor) com pedras
soltas no alto, **sem neve**; e, em todo o litoral, uma faixa de areia com
**palmeiras**. Baleia no mar aberto (sudoeste), pássaros, balões e nuvens no
céu. Um arco-íris pontua a costa norte.

## 2. Mapa (zona por zona, coordenadas x/z; ilha de raio 76, dome central h≈4)
- **Vila** (hub `0,4`): 6 casas, cada uma ao lado da sua estrada —
  `-7,40` e `-6,24` à esquerda da principal; `7,28` à direita; `-12,14` do
  ramal da fazenda; `15,1` do ramal da lagoa; `0,-16` do ramal da serra.
  6 postes de luz pela rua principal.
- **Estrada principal** (`0,54` → hub `0,4`): a mais longa; os carros do
  tráfego circulam pela rede toda.
- **Lagoa** (`38,20`, raio 10): a estrada da margem (R3) termina **~4u da
  costa** (nunca cruza a água); o terreno é suavemente aplainado num "tanque"
  até a cota do fundo da lagoa para a água assentar justa; banco `30,8`
  voltado para a água; 2 patos na faixa de margem `[10, 11,6]`.
- **Fazenda** (oeste): cercado 16×16 centrado em `(-40,14)` (postes a cada
  4u); celeiro `(-54,24)` fora, a noroeste; 2 galinhas + 2 ovelhas dentro;
  vaca pastando fora (`-28,28`) e cachorro perto do celeiro (`-52,34`).
- **Serra** (norte): morro grande `(-16,-42)` (base 16, h 16) e menor
  `(34,-26)` (base 11, h 10) — domos rochosos verdes-cinza com 4 pedras
  facetadas cada um; **zero neve**. O ramal R2 termina no pé do grande, com
  banco `-16,-24` mirando o topo; o R6 chega no pé do menor.
- **Prainha / litoral**: anel de areia (raio 73 → 81,5) + 8 palmeiras fixas
  no litoral sul/sudoeste; colinas suaves (6, h 2,8–3,4) variam o horizonte.
- **Campos abertos** (entre as zonas): 26 árvores/palmeiras espalhadas por
  rejeição + 8 palmeiras fixas do litoral, 34 arbustos e 60 flores.

## 3. Estradas (rede única, sem beira-morte)
Malha conectada com 6 caminhos, todos saindo do hub da vila:

| Ramal | Pontos de controle | Chega em |
|---|---|---|
| Principal (R1) | `0,54 → 0,30 → 0,4` | campo sul → vila |
| Serra (R2) | `0,4 → -6,-14 → -12,-26` | pé do morro grande (mirante) |
| Lagoa (R3) | `0,4 → 14,7 → 21,10 → 27,11` | margem da lagoa |
| Fazenda (R4) | `0,4 → -12,6 → -24,9 → -28,12` | para **diante** do cercado |
| Sudeste (R5) | `0,4 → 10,18 → 20,32` | colinas do sudeste |
| Mirante (R6) | `0,4 → 8,-8 → 20,-20` | pé do morro menor |

Sem beira-morte, sem cruzar a lagoa, sem sair da ilha. Cada estrada termina
"de cara" com o que importa (costa, cerca, mirante) — descoberta instantânea.

## 4. História de descoberta
O avião nasce sobre o campo sul (`0,42`) e a criança voa em círculos sobre a
vila (casinhas + luzes + carros na estrada), depois explora cada zona: lagoa
com patinhos e banco → fazenda com bichinhos no cercado → serra rochosa (bem
diferente da neve!) → prainha com palmeiras e a baleia no mar. Um passeio de
2–3 min toca as paradas. À noite, as janelas e os postes da vila acendem.

## 5. Animais (10, cada um no seu habitat)
- **Cercado**: 2 ovelhas + 2 galinhas (wander pequeno — ficam presas).
- **Fora do cercado, na fazenda**: vaca pastando + cachorro perto do celeiro.
- **Vila**: gato e cachorro no campo da vila.
- **Lagoa**: 2 patos **na margem** (faixa `[r, r+1,6]`; solids de colisão
  desligados, como nas outras fases).
Regra: nenhum animal nasce na praia, no mar, na água ou na estrada; os raios
de wander são validados contra estradas/lagoa/solids no auto-check. A baleia
(ambient, `World`) ficou no mar aberto a sudoeste, longe da faixa de areia.

## 6. Dia/noite
A fase funciona nos dois estados:
- **Dia**: sol de ilha, mar azul; postes apagados; serras rochosas secas.
- **Noite** (ciclo diurno da fase, `startNight: false` mas com ciclo de
  150s): céu estrelado, janelas das 6 casas acesas (emissive), cabeças dos 6
  postes em emissivo (`setNightLamps` — `World.setNight` agora aciona a ilha
  junto de vale/montanhas).

## 7. Implementação técnica
- `src/world/islandLayout.ts` — módulo **puro, determinístico e livre de
  THREE**: seed `ISLAND_SEED = 20240601` (`mulberry32`), zonas, estradas,
  objetos colocados, solids. `islandTerrainHeight(x,z)` (dome + serras
  + colinas + **aplainamento do tanque da lagoa**) é a **única fonte de
  verdade** do terreno, compartilhada por renderização, colocação e
  auto-check.
- `src/world/Island.ts` — constrói a cena a partir do layout (L0→L4): dome +
  areia + colinas + **serras procedurais rochosas** (dome que casa com a
  função de terreno + 4 pedras facetadas por morro — **sem neve**), lagoa
  (disco a cota do fundo), casas (House) viradas para a rua, postes (com
  `setNightLamps`), bancos, celeiro, cercas, animais (classe `Animal`,
  expostos em `this.animals`), palmeiras/árvores (GLB ou draft),
  arbustos/flores. Jitter visual usa `mulberry32(ISLAND_SEED + 1)` —
  **nunca** `Math.random` para colocação.
- `src/world/Roads.ts` — novo `kind: 'island'` usa `ISLAND_ROADS`
  (Catmull-Rom centrípedo, 70 amostras; meia-largura 1,7u — a mesma
  matemática do auto-check).
- `src/world/World.ts` — ramo default (`island`) agora cria estradas +
  tráfego (3 carros) e empurra `island.animals` para `creatures`; **não** usa
  mais `scatterAnimals` (os animais têm habitat próprio) — antes, 28 animais
  nasciam aleatórios, até na praia. Baleia reposicionada para o mar aberto
  (`-88,56`).
- `src/assets.ts` — lista de modelos da ilha atualizada: palmeira, árvore,
  baleia, pássaro, balão, casa, **celeiro, cerca, poste, banco, pato, vaca,
  arbusto, flor**; **removidos** `mountain` e `peak` (GLBs com neve —
  incompatíveis com ilha tropical).
- `src/levels.ts` — `ilha` ("Vila, lagoa, fazenda e serra na ilha",
  `starCount` 22 — o raio de 90u das estrelas cobre a ilha de raio 76).

## 8. Garantias (Definition of Done)
1. `npm run typecheck` verde.
2. Auto-check estrutural: `node scripts/check-island-level.mjs` — 7 regras:
   solids sem sobreposição, wander de animais limpo de estradas/lagoa/solids
   (patos na faixa de margem `[r, r+1,6]`), estradas sem cruzar a lagoa /
   tocar solids / **sair da ilha**, grafo de estradas conectado (fecho a
   partir de R1), y == terreno para todo objeto, casas na faixa
   [5,1, 8,1] da estrada, spawn do avião (`0,42`) sobre a ilha e longe da
   lagoa.
3. Evidência visual em `_shots/` (topdown, vila, fazenda, serra).
4. Este documento + `LevelConfig` atualizados.

## 9. Invariantes do jogo (2–3 anos)
Sem texto, sem game over, sem vida, sem dano; uma interação por vez;
causa-efeito imediato; descoberta recompensa; nada assustador. A ilha é
"de brinquedo": litoral areado, serras arredondadas e **quentes** — nada de
neve em ilha tropical.
