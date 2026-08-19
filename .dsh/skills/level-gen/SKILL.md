---
name: level-gen
description: Gerar cenários coerentes para o jogo Avião Aventureiro (Three.js, 2–3 anos) — posicionar objetos com regras de estrada/adjacência/colisão, criar drafts com primitivos, e validar o resultado por visão usando as MCPs do jogo (câmera, foto, vídeo).
---

# Gerador de cenários — Avião Aventureiro

Você gera fases e cenários **coerentes** para o jogo `Avião Aventureiro`
(Three.js + TypeScript + Vite, mundo 3D toy low-poly, público 2–3 anos). Não é
um "design doc": você **implementa** o layout — calcula posições, cria objetos
em draft com primitivos, e produz um cenário consistente (estradas que conectam,
casas ao lado da estrada, sem colisão).

## 1. Princípios inegociáveis (público 2–3 anos)

- **Sem texto** (só emoji/ícones/cores), **sem game over, sem vidas, sem dano**.
- **Uma interação por vez** (mouse/toque); **causa-e-efeito imediato** (tocar → som + partícula).
- **Descoberta e recompensa** > objetivo. Sem pressão de tempo. Repetição previsível é bom.
- **Nada assustador**: sem monstros, sustos, quedas, escuro total. "Fogos suaves", nunca explosões.
- **Alto contraste, cores saturadas, formas grandes, ritmo lento**.
- Som e visual sempre sincronizados.

## 2. Arquitetura do jogo (o que você edita)

- **Fase** = `src/levels.ts` → `LevelConfig` + array `LEVELS`. Campos:
  `id, name, emoji, description, worldType, skyDayTop, skyDayHorizon, groundColor,
  oceanDeep, oceanShallow, cycleSeconds, startNight, starCount, cloudCount,
  houseColors, music, vehicle('airplane'|'car'|'both')`.
- **Mundos** = `src/world/*.ts` (`Valley, Island, Mountains, Snow, Desert`,
  `World.ts` orquestra). Cada mundo tem `terrainHeight(x,z)` e um array `solids`.
- **Estradas** = `src/world/Roads.ts` — splines Catmull-Rom; `roads.paths` são
  polilinhas `[x,z]` prontas para tráfego e medição de distância. O ribbon é
  **construído segmentado com pitch ao longo do perfil suavizado do terreno**:
  em ladeiras a via sobe/desce como rampa contínua (nunca degraus/escada).
- **Colisão** = `src/utils.ts` → `Solid { x, y, z, r, h }` (cilindro de ocupação).
  **Todo objeto ancorado deve registrar um `Solid`.**
- **Objetos** = `public/models/*.glb` + classes em `src/world/landmarks.ts`
  (`House, Whale, Bird, Cloud, Rainbow, Balloon`), `src/world/Animals.ts`
  (`Animal` com `wanderR` + esfera de hit invisível p/ tap).
  O veículo on-rails (carro/avião) é o **único** veículo da cena — não há
  tráfego ambiente (`Traffic` foi removido do jogo).

### Constantes de referência (medidas reais do código)

| Coisa | Valor |
|---|---|
| Largura da estrada (`Roads`) | **3.4** |
| Casa `Solid` | `r:1.9, h:3.2` (centro em `y+1.6`) |
| Árvore `Solid` | `r:1.2·s, h:4·s` (s ∈ 0.9–1.5) |
| Pirâmide `Solid` | `r:4.5, h:7` |
| Pico de montanha `Solid` | `r~11–13, h~14–18` |
| Lagos | círculo `r 6–15` |
| Animal `wanderR` | 2–6 (curto e local); curral ≤ 4 |
| Whale | base `y=-1.2`, pula até `+3.6` (precisa de água) |
| Rainbow | arco `r~13` |

## 3. Catálogo de objetos — por "natureza" (a regra respeita a natureza)

| Natureza | Objetos | Implicação |
|---|---|---|
| **Ancorado** (tem `Solid`) | house, barn, fence, bench, lamp, snowman, cactus, pyramid, palm, tree, pine, appletree, bush, flower, peak, mountain, balloon(ancorado) | colisão + clearance + encaixe no chão |
| **Água** | whale | só em oceano (ilha) ou lago |
| **Estrada** | (nenhum) | o carro/avião on-rails é o único veículo; **sem carros de tráfego ambiente** |
| **Errante** (`wanderR`) | cow, sheep, chicken, dog, cat, duck | base + raio de passeio livre de obstáculo/estrada; **≥ 30 animais por fase** |
| **Aéreo/ambiente** (sem colisão) | bird, cloud, rainbow, estrelas(sprites), nuvens, balloon(flutuante) | posição livre, com propósito visual |

## 4. Paleta por mundo (bioma — objeto fora do bioma = erro)

- **Ilha** (`island`): palm, whale, beach, trees, houses, rainbow, mountain. ❌ snowman/cactus/pine.
- **Neve** (`snow`): snowman, pine, cabin, frozen lake, drifts. ❌ palm/cactus/whale/pyramid.
- **Deserto** (`desert`): cactus, pyramid, oasis, adobe house, dunes. ❌ snowman/pine/whale.
- **Montanhas** (`mountains`): peak(anel), pine, lake, cabin, snowman(nos picos). ❌ pyramid.
- **Vale** (`valley`): house, barn, fence, animals, trees, lake, roads (o mais rico).

## 5. Pipeline em camadas (ordem obrigatória)

```
L0 terreno/zona   → zonas { centro, raio, tema, objetos:{tipo:contagem} } + chão
L1 estradas       → rede em laço (união de anéis fechados, sem beco sem saída)
                    ligando os centros das zonas; curvas suaves (deflexão ≤ 40°, raio ≥ 4.0 m — ver regra 7)
L2 âncoras        → casas/celeiro/coreto encaixados AO LADO das estradas
L3 preenchimento  → árvores/arbustos/flores/bancos/postes/animais (densidade, rejeição)
L4 decoração      → estrelas/nuvens/arco-íris (não colidem, só enfeitam)
```

Cada camada valida contra as anteriores. **Estrada antes de casa; casa antes de árvore.**

## 6. As regras

### Semânticas (faz sentido)

1. **Paleta por bioma** (seção 4) — whale no deserto é erro.
2. **Whale exige água** — x/z dentro do oceano/lago.
3. **Fazenda = cluster**: barn + anel de fence + animais **dentro** da cerca + dog perto do barn + cat perto da casa.
4. **Vila = núcleo**: casas agrupadas, **todas viradas pra estrada**, lamps entre elas, bancos perto de água/praça.
5. **Floresta = volume**: árvores em anel/densidade (`r∈[5,26]`), pássaros dentro/sobre, **nenhuma casa dentro**.

### Espaciais (evita colisão)

6. **Estrada = rede em laço, SEM beco sem saída**: todo extremo de estrada
   coincide com um ponto de outra estrada (nó compartilhado); a rede é união de
   anéis/laços fechados. Nada termina no nada: a estrada "sempre dá em algum
   lugar". O tour on-rails faz 0 U-turns.
   (O checker valida: nenhum nó de grau 1 — extremos não compartilhados.)
7. **Curvas suaves, sem cotovelo** (padrão de curva suave): a deflexão entre
    segmentos consecutivos dos pontos de controle deve ser ≤ 40° (ângulo
    interno ≥ 140°) — a via lida como curva fluida, nunca um "V". E o raio da
    curva, medido no spline *amostrado* (70 pts), deve ser ≥ 4.0 m em todos os
    pontos: para cada trio de pontos amostrados consecutivos, o raio da
    circunferência circunscrita `R = (a·b·c)/(4·área)` (Heron) ≥ 4.0 m, o que
    impede "curvas de cotovelo" (giro num trecho curto) — a curva só se resolve
    ao longo de ≥ ~5.6 m de corda. O checker valida as duas: deflexão ≤ 40°
    (regra 5a) E raio mínimo ≥ 4.0 m (regra 5b) sobre a spline amostrada.
    **Nota (legado)**: vale/ilha/montanhas/neve ainda seguem o padrão antigo
    (60° / sem raio mínimo; medidos: vale 55.4°/4.78 m, ilha 59.6°/5.76 m,
    montanhas 53.1°/3.41 m, neve 45.0°/4.66 m). Só o **deserto** foi refeito no
    padrão novo; re-fazer os demais é trabalho futuro.
8. **Estrada segue o terreno**: o ribbon tem pitch por segmento sobre o
   perfil suavizado — em ladeiras, rampa contínua, nunca degraus. Ao desenhar,
   prefira pontos de controle espaçados ao longo de vertentes (evitar subida
   íngreme dentro de 10–20 m).
9. **Estrada não cruza água**: ponto de controle mantém `dist ≥ raioÁgua + 1.7 + margem`.
10. **Casa ao lado da estrada** (adjacência):
   ```
   dist(ponto, estrada) ∈ [1.7 + 1.9 + 1.5, 1.7 + 1.9 + 1.5 + 3.0]
   orientação = atan2(tangente da estrada)   // porta/janela virada pra rua
   ```
   `dist < 1.7 + 1.9` = dentro da via = erro.
11. **Colisão = teste contra `Solid`** (regra-mãe):
   ```
   ∀ s ∈ solids: dist2D(novo, s) ≥ novo.r + s.r + folga(classe)
   ```
   folga: casa/celeiro/pirâmide → grande; árvore/arbusto → média; flor → pequena (>0).
   Use grid hash (célula ~5) pra não virar O(n²).
12. **Aterramento**: `y = terrainHeight(x,z)` sempre; objeto alto empurra o `Solid` pra cima.
13. **Não bloquear navegação**: nada no leito da estrada; corredor de voo do avião limpo.
14. **Seed + ordem determinística**: PRNG com seed; ordem L0→L4 fixa. Mesmo seed = mesmo cenário.

### Comportamentais (o posicionamento suporta a animação)

15. **Animal precisa de espaço de passeio**: `wanderR` livre de sólido e de estrada. Cercado pequeno → **reduza `wanderR`** (curral: `wanderR` ≤ 4 e âncora ≥ 5 m da cerca).
16. **Duck na borda da água**, não no meio do lago.
17. **≥ 30 animais por fase**: vida abundante e variada (ovelhas, galinhas, vacas, cães, gatos, patos) espalhada pelas zonas (curral, campos, vila, praia, margem da água). O auto-check valida a contagem.
18. **Hitbox generosa de toque**: cada `Animal` leva uma esfera de hit invisível (`r ≈ 1.5`, `visible = false` — o raycast do `Clickables` ignora invisível). Tap no tablet precisa funcionar mesmo fora do modelinho.
19. **Somente o nosso veículo**: o carro/avião on-rails é o único veículo da cena; não há carros de tráfego ambiente (o sistema `Traffic` foi removido).
20. **Bird precisa de céu aberto** (o "fly" de 5s precisa ser visível).
21. **Rainbow é marco voado**: arco `r~13` com espaço livre, na rota provável do avião.
22. **Objetos reativos alcançáveis**: clicáveis/proximidade (casa, balão, coreto) ao alcance do avião/carro.

### Composição (coerência visual)

23. **Cluster, não ruído uniforme**: densidade por zona (vila rala, floresta densa, campo médio).
24. **Áreas de respiro**: prado aberto entre zonas — a criança enxerga o horizonte e distingue zonas.
25. **Silhueta legível**: cada objeto contrasta com o fundo (nada escuro sobre escuro, nada da mesma cor encostado).
26. **Proporção de brinquedo**: casa ~3, árvore ~4, pirâmide ~7, pico ~15. Nada minúsculo perdido, nada gigante.
27. **Rota de descoberta**: estrelas em trilha seguindo a estrada ou circundando POIs.

## 7. Drafts com primitivos

Não espere o GLB. Monte um catálogo `DRAFTS` e use primitivos como placeholder
(com o mesmo `Solid` do objeto final; o GLB entra depois no mesmo ponto):

```ts
const DRAFTS = {
  house: { geo: () => new THREE.BoxGeometry(3, 3, 3),   solid: { r: 1.9, h: 3.2 }, glb: 'house.glb' },
  tree:  { geo: () => new THREE.ConeGeometry(1.2, 4, 8), solid: { r: 1.2, h: 4 },  glb: 'tree.glb' },
  fence: { geo: () => new THREE.BoxGeometry(3, 1, 0.3), solid: { r: 0.4, h: 1 },   glb: 'fence.glb' },
  barn:  { geo: () => new THREE.BoxGeometry(4, 4, 5),   solid: { r: 2.3, h: 4 },   glb: 'barn.glb' },
  // ...
}
```

O gerador coloca o primitivo + registra o `Solid`; o cenário fica visível no
primeiro run com posicionamento/colisão já resolvidos.

## 8. Iniciar e testar o jogo (debug + Playwright)

As tools `mcp__game__*` **só funcionam se o jogo estiver rodando em modo debug**.
A flag é `?debug=1` na URL: ela liga o `DebugCapture` (`src/debug/DebugCapture.ts`),
que instala `window.__debug` e passa a **consultar o capture server** (porta 4477)
a cada 400ms. Sem essa flag, os comandos ficam na fila e nada acontece.

### Stack (subir em background com `bash` + `run_in_background: true`)

- `npm run shots` → capture server em `http://localhost:4477` (grava em `_shots/`).
- `npm run dev` → Vite em `http://localhost:5173`.
- Atalho: `npm run game [level] [vehicle]` → sobe os dois **e** abre o browser em
  `?debug=1&level=<id>&vehicle=<vehicle>`.

Servidores ficam de pé; rode em background, não bloqueie o turno esperando.

### Abrir o jogo em debug (Playwright)

Deep-link: `http://localhost:5173/?debug=1&level=<id>&vehicle=<vehicle>`.

- **Playwright MCP** (`mcp__playwright__*`, se disponível): `navigate` até a URL,
  espere o load, e tire screenshot da **página inteira** (inclui home/UI — o
  `snap` do jogo captura só o canvas 3D, não a UI).
- Sem MCP, use o CLI: `npx playwright screenshot <url> _shots/pagina.png`.

Após **criar uma fase nova** em `src/levels.ts`, recarregue a página (Playwright
navigate de novo) pra ela entrar no `LEVELS` do jogo; depois `load_level('id')`.

### Cadeia de relé (como o comando chega ao jogo)

```
mcp__game__*  →  scripts/game-mcp.mjs (MCP stdio)  →  POST /cmd no capture server (4477)
             →  DebugCapture.pollCommands() do jogo  →  executa  →  PNG/webm volta
             →  POST /shot | /clip  →  salvo em _shots/
```

⚠️ **Gotcha**: `mcp__game__list_levels` devolve uma lista **hardcoded** dentro de
`scripts/game-mcp.mjs` (não é o `levels.ts` vivo). Para fases novas, chame
`mcp__game__load_level('id-novo')` direto (que lê o `LEVELS` real do jogo), e
**não** confie no `list_levels` para enxergá-las.

### Troubleshooting

- `mcp__game__*` responde "capture server offline?" → rode `npm run shots`.
- Fase não aparece → confira `level` id e `vehicle` no deep-link; sem `?level=` abre a home (seletor).
- Quer capturar a UI (home, botões)? Playwright screenshot da página, não o `snap` do jogo.

## 9. Verificação visual (modelo com visão + MCPs do jogo)

**Você não confia só no código — você olha.** Tools disponíveis:

- `mcp__game__list_levels()` → lista os cenários (id, nome, veículo permitido).
- `mcp__game__load_level(level, vehicle?)` → troca o cenário **em runtime** (id da fase + `car`|`airplane`), sem recarregar a página. É assim que você carrega a fase recém-criada pra inspecionar.
- `mcp__game__set_view(px,py,pz,tx,ty,tz)` → move a câmera livre para `(px,py,pz)` olhando para `(tx,ty,tz)`.
- `mcp__game__set_view_and_snap(px,py,pz,tx,ty,tz,filename?)` → idem **e** salva `_shots/<filename>.png`.
- `mcp__game__snap(filename?)` → salva o frame atual em `_shots/<filename>.png`.
- `mcp__game__record(seconds?)` → grava um webm em `_shots/` (flythrough).
- `mcp__game__sweep(points)` → teleporta por vários pontos `[px,py,pz,tx,ty,tz]` capturando um PNG em cada (grade aérea).
- `mcp__game__resume_chase()` → volta a câmera a seguir o veículo (encerra o modo livre).
- `mcp__game__list_captures()` → lista os arquivos já salvos em `_shots/`.
- `read_image(_shots/...png)` → **enxergar** o frame (você tem visão).

### Plano de câmera por regra

| Checagem | Tool | O que procurar |
|---|---|---|
| Varredura aérea | `sweep` grade 5×5 olhando pra baixo | objeto flutuando / se interceptando / no leito / zonas misturadas |
| Close nos âncoras | `set_view_and_snap` em cada casa/POI | porta/janela pra rua, nada na frente, banco na margem (não na água) |
| Flythrough da estrada | `record` seguindo a via | estrada contínua, conecta zonas, nada na pista |
| Água | `set_view` sobre oceano/lago | whale na água, duck na borda, banco na areia |
| Noturna | nível `startNight` + `snap` | janelas acesas, lamps acesos, luz suficiente (sem breu) |
| Contraste/cor | `snap` ângulos variados | cada objeto distinguível |
| Proporção | `snap` com avião/carro na cena | escala correta |

## 10. Definition of Done (uma fase está pronta quando)

1. `npm run typecheck` passa.
2. Auto-check estrutural passa: `solids` sem sobreposição (dist ≥ r1+r2+folga), **rede de estradas em laço (nenhum nó de grau 1 / beco sem saída)**, **curvas suaves (deflexão ≤ 40° E raio mínimo da spline amostrada ≥ 4.0 m — regra 7)**, **animais ≥ 30**, todo `y` = `terrainHeight(x,z)`; tour on-rails com **0 U-turns**.
3. Render pass de evidência salvo em `_shots/` (top-down + 4 vistas + flythrough + noite), e **você olhou** cada imagem e não viu erro.
4. `LevelConfig` novo em `src/levels.ts` (+ world/sistemas/GLBs se for fase elaborada), e doc de design atualizado em `docs/`.

## 11. Loop de trabalho

```
brief → layout (zonas + grafo de estradas) → gera (regras 6–12, seed) →
typecheck → sobe stack (shots+dev) → abre debug (Playwright) →
load_level (fase nova) → visual QA (sweep/snap/record + read_image) →
ajusta (seed/posição/regra) → re-shoot
```

Saia sempre com: código + o render pass (`_shots/*.png`) como prova visual.
