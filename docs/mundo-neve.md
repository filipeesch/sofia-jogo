# Design de Fase — Mundo da Neve (`neve`, worldType `snow`)

Redesenho do mundo de neve do jogo do avião para ser **coeso** e **~5x maior em
área útil** (fator linear ≈ 2,2; conteúdo ia até r≈32, agora até r≈80): cada
elemento vive onde faz sentido (vila aconchegante no hub `(0,6)`, lago
congelado a oeste, bosque de pinheiros a leste, alameda de bonecos de neve
que faz um loop pelo norte). Sem texto, sem punição, sem nada assustador —
para crianças de 2–3 anos.

## 1. Tema
Um mundo branco e aberto com:
- **Vila** de 3 casinhas no hub `(0,6)`, todas na faixa `[5,1..8,1]` da
  estrada mais próxima, com 8 postes de luz (PointLight) que aquecem a noite.
- **Lago congelado** `(-26,-20)` raio 11 — disco de gelo liso
  (`0xbfe6f7`); a R2 termina na margem leste `(-30,-6)`. Nenhum pato: o lago
  está congelado.
- **Bosque de pinheiros**: anel de 24 pinheiros ao redor de `(34,-16)`
  (raio 4..14) + 8 pinheiros fixos no campo aberto; a R3 termina na borda
  oeste do bosque `(30,8)`.
- **Alameda de bonecos de neve** (centro `0,-30`): 10 bonecos ao longo do
  loop R4 (5 perto da vila + 5 na alameda norte).
- **Dunas de neve** suaves (7 hemisférios, r 16–18, h 1,4–2,4) no anel de
  conteúdo, mantendo vila, lago, estradas e a zona do arco-íris planos.
- **Animais** (14): 4 ovelhas, 3 galinhas, 3 vacas, 2 cachorros, 2 gatos.

## 2. Mapa (zona por zona, coordenadas x/z; piso em y=0; hub da vila em
(0,6))

- **Vila** (hub `0,6`): 3 casinhas na faixa `[5,1..8,1]`, voltadas para a
  rua:
  - `(7,14)` — lateral leste da R3, cor 0 (`0xc9644a`)
  - `(-7,14)` — lateral oeste da R1, cor 1 (`0x9fd0f0`)
  - `(-12,-4)` — lateral oeste da R4, cor 2 (`0xe0b060`)
- **Estrada principal** (spawn `0,20` → hub `0,6`): o carro/avião nasce nela.
- **Lago congelado** (`-26,-20`, raio 11): disco de gelo `y=0,06`; a R2
  termina em `(-30,-6)`, na margem leste. Terreno no interior do disco
  ≤ 0,5 m.
- **Bosque de pinheiros** (centro `34,-16`): 24 pinheiros no anel r 4..14
  (rejeição com seed) + 8 pinheiros fixos no campo aberto:
  `(-40,20)`, `(40,30)`, `(-50,-10)`, `(50,-30)`, `(-30,50)`, `(40,50)`,
  `(-60,30)`, `(60,20)`. A R3 termina em `(30,8)`, na borda do anel.
- **Alameda de bonecos** (centro `0,-30`): 10 bonecos — 5 perto da vila
  (`(12,-10)`, `(8,-22)`, `(-6,-14)`, `(4,-28)`, `(10,-30)`) + 5 na alameda
  norte (`(4,-48)`, `(-4,-48)`, `(-10,-42)`, `(10,-44)`, `(14,-36)`).
- **Postes de luz** (8): `[4,15]`, `[-4,15]` (lateral da R1), `[4,2]`
  (hub), `[-16,-4]` (R2), `[-26,-10]` (margem do lago), `[8,14]`
  (lateral R3), `[4,-36]` e `[14,-22]` (alameda R4).
- **Dunas de neve** (7 hemisférios achatados):
  `40,20` r18 h2,0 · `-40,30` r16 h2,2 · `20,50` r16 h1,6 ·
  `-35,-50` r18 h2,4 · `50,-30` r18 h1,8 · `-48,-42` r16 h2,0 ·
  `10,55` r16 h1,4. Bordas externas ≤ r80; vila, lago e estradas ficam
  fora.
- **Arco-íris** (`24,10,-24`): arco global fixo; a tour de voo passa por ele;
  terreno ali é plano (≤ 1,2 m).

## 3. Estradas (4 caminhos, rede conectada)

Todos os ramos partem do hub `(0,6)`. R4 é um **loop fechado**; R1 é aberta
no spawn (o carro nasce ali); R2 e R3 terminam em pontos cênicos (margem do
lago e borda do bosque), onde a tour on-rails faz U-turn.

| Ramal | Pontos de controle | Chega em |
|---|---|---|
| Principal (R1) | `0,20 → 0,12 → 0,6` | spawn → vila |
| Oeste (R2) | `0,6 → -10,4 → -20,0 → -30,-6` | margem leste do lago |
| Leste (R3) | `0,6 → 10,8 → 20,10 → 30,8` | borda do bosque de pinheiros |
| Norte (R4) | `0,6 → -6,-4 → -10,-18 → -8,-34 → 0,-44 → 10,-38 → 12,-22 → 6,-8 → 0,6` | loop da alameda de bonecos (volta ao hub) |

Meia-largura: 1,7 u (mesma matemática de `Roads.ts`: CatmullRom centrípedo,
70 amostras inclusive). Nenhuma estrada cruza o lago; nenhum sólido fica a < 2
m de uma amostra da estrada.

## 4. História de descoberta

A criança decola pelo caminho principal (R1) e chega à vila (casinhas +
luzes + animais). Cada ramal oferece uma parada nova: oeste → lago congelado
(descoberta de um espelho branco); leste → bosque de pinheiros denso; norte →
alameda de 10 bonecos de neve em loop. Um passeio de 3–4 min toca as paradas.
À noite, os 8 postes acendem com luz real — recompensa de voltar.

## 5. Animais (14, cada um no seu habitat)

- **Campo aberto (norte/nordeste)**: 4 ovelhas
  `(-8,24)`, `(10,22)`, `(-18,16)`, `(24,16)` (wander r=3) + 3 vacas
  `(-20,28)`, `(18,30)`, `(30,24)` (wander r=4).
- **Vila**: 3 galinhas `(-4,16)`, `(14,4)`, `(26,4)` (wander r=2) + 2
  cachorros `(-12,12)`, `(12,28)` (wander r=3) + 2 gatos `(2,-14)`,
  `(24,-4)` (wander r=2).
- Regra: nenhum animal nasce na estrada, no lago ou nos sólidos; os raios de
  wander ficam a ≥ 3 m das estradas (validado pelo auto-check).
- **Sem patos**: o lago está congelado.

## 6. Dia/noite

A fase funciona nos dois estados:
- **Dia**: luz natural; postes apagados; janelas das casas apagadas; gelo
  azul-pálido.
- **Noite**: céu estrelado, janelas das 3 casinhas acesas (emissive),
  cabeças dos 8 postes em emissivo `0xffd97a` (intensity 1,6) + 8
  `PointLight(0xffd97a, 0→2,6, 14, 2)` reais a `y+3,3` de cada poste (luz
  quente de alcance 14 u).

> Nota: `World.setNight` (linhas 175–181) só chama `setNightLamps` em
> Valley/Mountains/Island — **Snow não está incluído** (limitação de
> `World.ts`, que não é um dos 4 arquivos autorizados para alteração). O
> método `Snow.setNightLamps` existe e funciona; basta adicioná-lo ao
> `instanceof` check em `World.ts` para ativar.

## 7. Implementação técnica

- `src/world/snowLayout.ts` — módulo **puro, determinístico e livre de
  THREE**: seed `SNOW_SEED = 20240125` (`mulberry32`), zonas, estradas,
  objetos colocados, solids. `snowTerrainHeight(x,z)` é a **única fonte de
  verdade** do terreno (soma de hemisférios `h·√(1−n²)`), compartilhada por
  renderização, colocação e auto-check. Jitter visual (rotação dos pinheiros,
  fase do sway) usa `mulberry32(SNOW_SEED + 1)` — **nunca**
  `Math.random` para colocação.
- `src/world/Snow.ts` — constrói a cena a partir do layout (L0→L4):
  terreno/planície (900×900), disco de gelo (`layout.waters[0]`), 7 dunas
  (esferas escaladas), 3 casinhas (`House` viradas para a rua), 10 bonecos de
  neve (instanciados), 8 postes (instanciados + `setNightLamps` +
  PointLight), 14 animais (classe `Animal`, expostos em `this.animals`), 32
  pinheiros instanciados com sway suave. Mesma assinatura de construtor:
  `new Snow({ ground, lake, houseColors }, models)`.
- `src/world/Roads.ts` — o snow continua usando `kind: 'grid'` (limitação:
  `World.ts` não está autorizado para alteração; a malha genérica de grade
  ainda é aplicada ao snow). O auto-check valida `SNOW_ROADS` separadamente.
- `src/world/World.ts` — ramo `snow` cria estradas + tráfego (`grid`) e chama
  `scatterAnimals` (9 animais aleatórios extras além dos 14 do layout).
- `src/assets.ts` — lista de modelos do mundo de neve: snowman, pine, bird,
  balloon, house, **lamp**, **cow** + ALWAYS (dog, cat, chicken, sheep, car,
  cloud, appletree).
- `src/levels.ts` — `neve` (`oceanShallow` `0xbfe6f7`, `groundColor`
  `0xf0f6fc`, `houseColors` `[0xc9644a, 0x9fd0f0, 0xe0b060]`, vehicle
  `both`).

## 8. Garantias (Definition of Done)

1. `npx tsc --noEmit` verde.
2. Auto-check estrutural: `node scripts/check-snow-level.mjs` — verifica:
   - determinismo (build ×2 → deep equal)
   - todo conteúdo ≤ r ≈ 80
   - casas na faixa `[5,1..8,1]` m da estrada mais próxima
   - 4 estradas; R4 é loop; rede conectada
   - nenhuma estrada cruza o lago (amostras fora do raio 11)
   - terreno no interior do lago ≤ 0,5 m
   - amostras das estradas a ≥ 2,0 m de todo sólido (exceto animais)
   - R1 a ≤ 3 m do spawn `(0,20)`
   - POIs (vila `0,-6`, lago `-26,-8`, pinheiros `30,8`, bonecos `0,-44`)
     a ≤ 8 m de alguma estrada
   - animais a ≥ 3 m das estradas e fora do rim do lago
   - tour de voo (240 pts): `3,2 ≤ y ≤ 26` (tol 0,5), clareza ≥ 1,5 m,
     waypoints a ≤ 8 m da tour, arco-íris `[24,10,-24]` presente
   - sem `Math.random` / `rand()` no `snowLayout.ts`
3. Evidência visual em `_shots/` (outro agente).
4. Este documento.

## 9. Invariantes do jogo (2–3 anos)

Sem texto, sem game over, sem vida, sem dano; uma interação por vez;
causa-efeito imediato; descoberta recompensa; nada assustador. As dunas são
"de brinquedo": suaves, arredondadas. O lago é gelo — seguro para andar, não
para nadar. Os bonecos de neve são fofos e grandes (r 1,6, h 3,8).

## 10. Nota sobre o carro (mecânica global, não da fase)

O `CarController` tem condução automática suave (~9 u/s) com retorno para a
origem ao passar de 150 u (`maxRadius`) — mesma em todas as fases do carro.
O limite de 150 u ficou **fora do anel de conteúdo** (r ≈ 80), então o carro
"volta para casa" antes de travar nas dunas. Se a criança não dirija, o carro
segue reto pela principal; os ramos da rede existem para a criança virar e
descobrir cada zona.

## 11. Limitações / desvios conhecidos

- **32 pinheiros** (8 campo + 24 bosque) em vez de ~45: `SNOW_PINE_TOTAL=45`
  é um teto, não um alvo; aumentar `SNOW_FOREST.count` para 37 atingiria 45,
  mas o anel r=4..14 já é denso o suficiente.
- **R1/R2/R3 são ramos abertos** + R4 loop, em vez de rede 100% fechada: a
  exigência de spawn `(0,20)` força R1 a ser aberta; R2/R3 terminam em
  pontos cênicos (U-turn). O auto-check valida conectividade em vez de
  pareamento estrito de extremidades.
- `World.ts` usa `kind: 'grid'` para o snow (não `SNOW_ROADS`); os 14
  animais do layout + 9 espalhados pelo `scatterAnimals` coexistem.
- `World.setNight` não chama `setNightLamps` para Snow (limitação do arquivo
  compartilhado).
- `layoutSolids` retorna `LayoutSolid` (x, z, r, clearance, kind) — sem y/h
  (o auto-check só precisa de x, z, r).
- `check-rail-tour.mjs` tem uma lista `SNOW_HILLS` espelhada do design
  antigo; não afeta o auto-check do snow (que importa `snowTerrainHeight`
  diretamente do `snowLayout.ts`).
