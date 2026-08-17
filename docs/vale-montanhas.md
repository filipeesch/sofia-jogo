# Design de Fase — Vale das Montanhas (`montanhas`, worldType `mountains`)

Reconstrução da fase de montanhas do jogo do carro para ser **coesa** e **5x
maior em área útil**: cada elemento vive onde faz sentido (vila na estrada,
fazenda com cercas e animais dentro de um anel de estradas, lago com patos na
margem, pinheiral denso, anel de 8 picos nevados como borda do vale). Sem
texto, sem punição, sem nada assustador — para crianças de 2–3 anos.

## 1. Tema
Um vale grande e aberto cercado por **8 picos nevados** (borda em r ≈ 96–99).
No centro, uma vila de 5 cabanas com postes de luz; ao sudoeste, uma fazenda
inteira **dentro de um anel de estradas** (cercado + celeiro + gado); a
noroeste, um lago redondo onde patos ficam na margem; um pequeno poço de
campo ao norte; a leste, um pinheiral denso com clareira; e, nas encostas dos
picos, 4 bonecos de neve que olham o vale. Um arco-íris pontua o céu (herdado
do jogo) e, à noite, as janelas e os postes acendem.

## 2. Mapa (zona por zona, coordenadas x/z; piso do vale em y=0; hub da vila em (0,6))
- **Vila** (hub `0,6`): 5 cabanas, todas voltadas para a sua rua —
  `7,30` e `-7,42` nas laterais da principal; `12,16` do ramal do pinheiral;
  `-8,10` do ramal do lago; `10,-4` do ramal norte. 8 postes de luz pela vila.
- **Estrada principal** (spawn `0,54` → hub `0,6`): o carro nasce nela.
- **Fazenda** (sudoeste): cercado 14×14 centrado em `(-30,20)` (postes a cada
  3,5u) **dentro do anel formado por R4+R6**; celeiro `(-14,48)` ao sul do
  cercado; 2 ovelhas + 2 galinhas dentro; 2 vacas pastando fora (`-10,36` e
  `-50,40`) e cachorro perto do celeiro (`-8,54`).
- **Lago** (`-38,-30`, raio 11): a estrada da margem (R3) termina **na costa**
  (nunca cruza a água); banco de pedra na margem (`-26,-24`) voltado para a
  água; 3 patos na margem (regra: água é só para quem nada).
- **Poço do campo** (`14,-46`, raio 4,5): lagoa pequena na estrada norte;
  1 pato na margem; banco/mirante `10,-36` olhando os picos.
- **Pinheiral** (leste, centro `56,30`): anel denso de 42 pinheiros entre
  r=14 e r=36; o ramal R2 termina numa clareira na borda do anel;
  **nenhuma casa dentro** (floresta é dos pinheiros, não das casinhas).
- **Picos nevados**: 8 cones em anel (r ≈ 96–99, base 24–25, alturas 30–35),
  perfil linear — montanhas de brinquedo, nunca íngremes demais; abrem um
  corredor largo a norte (gap entre os picos de 45°/135°).
- **Colinas suaves**: 4 domos baixos (h 3,5–4,0) para variar o horizonte.
- **Campos abertos** (entre as zonas): 8 árvores fixas + espalhadas por
  rejeição, 40 arbustos e 70 flores — respiro visual entre os blocos.
- **Bonecos de neve** (L4): 4, nas encostas dos picos leste, oeste, norte e
  sul, sempre de frente para o vale (recompensa de olhar para cima).

## 3. Estradas (rede única, sem beira-morte)
Uma malha conectada com 6 caminhos, todos saindo do hub da vila (o anel R6
fecha o circuito da fazenda):

| Ramal | Pontos de controle | Chega em |
|---|---|---|
| Principal (R1) | `0,54 → 0,30 → 0,6` | spawn → vila |
| Pinheiral (R2) | `0,6 → 16,10 → 32,16 → 46,22` | clareira do anel de pinheiros |
| Lago (R3) | `0,6 → -14,0 → -28,-6 → -38,-16` | margem NE do lago |
| Fazenda (R4) | `0,6 → -8,20 → -20,32 → -32,38` | entrada do anel da fazenda |
| Norte (R5) | `0,6 → 4,-8 → 6,-22 → 2,-40` | mirante do vale (poço ao lado) |
| Anel da fazenda (R6) | `-28,-6 → -44,4 → -46,24 → -32,38` | fecha R3 ↔ R4 em volta do cercado |

Sem beira-morte, sem cruzar água, sem subir os picos. Cada estrada termina
"de cara" com o que importa (costa, clareira, cerca, mirante) — descoberta
instantânea.

## 4. História de descoberta
A criança entra pela vila (casinhas + luzes) e cada ramal oferece uma parada
nova: fazenda com bichinhos dentro do anel → lago com patos e banco →
pinheiral denso → mirante norte com poço e bonecos de neve nos picos. Um
passeio de 3–4 min toca as paradas. À noite, o mesmo vale acende
(janelas + postes) — recompensa de voltar.

## 5. Animais (15, cada um no seu habitat)
- **Cercado**: 2 ovelhas + 2 galinhas (wander pequeno — ficam presos).
- **Fora do cercado, na fazenda**: cachorro (perto do celeiro) + 2 vacas
  (pastando).
- **Vila/campo**: gato perto da vila; 2 ovelhas e 1 vaca no campo aberto.
- **Águas**: 3 patos na margem do lago + 1 na margem do poço (solids de
  colisão desligados, como no vale; regra de margem validada no auto-check).
Regra: nenhum animal nasce em picos, no meio da água ou na estrada; os raios
de wander são validados contra estradas/água/solids no auto-check.

## 6. Dia/noite
A fase funciona nos dois estados:
- **Dia**: luz natural; postes apagados; bonecos de neve brancos nos picos.
- **Noite** (`noite` / Noite Estrelada, mesmo worldType, `startNight`): céu
  estrelado, janelas das 5 cabanas acesas (emissive), cabeças dos 8 postes em
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
  do auto-check).
- `src/world/World.ts` — ramo `mountains` cria estradas + tráfego (6 carros) e
  empurra `mountains.animals` para `creatures`; **não** usa `scatterAnimals`
  (os animais têm habitat próprio) nem a malha genérica `grid`.
- `src/assets.ts` — lista de modelos do mundo montanhoso: casas, pinheiros,
  ovelha/galinha/cachorro/vaca/gato/pato, boneco de neve, celeiro, cerca,
  poste, banco, arbusto, flor.
- `src/levels.ts` — `montanhas` ("Vila, fazenda, lago e pinheiral entre picos
  nevados", `starCount` 22) e `noite` (mesmo worldType, `startNight`).

## 8. Garantias (Definition of Done)
1. `npm run typecheck` verde.
2. Auto-check estrutural: `node scripts/check-mountain-level.mjs` — 7 regras:
   solids sem sobreposição, wander de animais limpo de estradas/águas/solids
   (patos na faixa de margem `[r, r+1,6]` de alguma água), estradas sem
   cruzar água/solids/piso, **grafo de estradas conectado** (fecho a partir de
   R1), y == terreno para todo objeto, casas na faixa [5,1, 8,1] da estrada,
   spawn do carro na principal. (Exclui o par intencional pico × boneco de
   neve.)
3. Evidência visual em `_shots/` (top-down, vila, fazenda, lago, noite).
4. Este documento + `LevelConfig` atualizados.

## 9. Invariantes do jogo (2–3 anos)
Sem texto, sem game over, sem vida, sem dano; uma interação por vez;
causa-efeito imediato; descoberta recompensa; nada assustador. As montanhas
são "de brinquedo": suaves, arredondadas, com bonecos de neve fofos.

## 10. Nota sobre o carro (mecânica global, não da fase)
O `CarController` tem condução automática suave (~9 u/s) com retorno para a
origem ao passar de 150u (`maxRadius`) — mesma em todas as fases do carro.
O limite de 150u ficou logo **fora do anel de picos** (r ≈ 96–99 + base
24–25 ≈ 121–124u até a borda), então o carro "volta para casa" antes de
travar nos picos. Se a criança não dirija, o carro segue reto pela principal;
os ramos da rede existem para a criança virar e descobrir cada zona.
