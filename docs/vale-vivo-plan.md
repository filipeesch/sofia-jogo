# Plano — Vale Vivo (mundo do carro v2)

Decisões roteadas com o usuário:
1. Mundo: **Vale Vivo** (vila + fazenda + lago + floresta em um só continente).
2. Gameplay: **só explorar livremente** (sem missões/entregas).
3. Riqueza: **vida e movimento** + **densidade de decoração**.

## Conceito

Um vale grande e vivo, com zonas temáticas conectadas por **estradas curvas**.
O carro dirige livremente, descobre cada zona, buzina, vê os animais andando,
os outros carrinhos circulando e o ciclo dia/noite acendendo as luzes.

Zonas:
- 🏘️ Vila — casinhas coloridas, praça, lojinhas, postes de luz.
- 🚜 Fazenda — celeiro, curral com cerca, plantações, animais (cão, gato, galinha, ovelha, vaca, pato).
- 🏞️ Lago — água, patinhos, bancos.
- 🌲 Floresta — muitas árvores, arbustos, flores, caminho de terra.

## Estradas (não grade, não loop)

- Rede de estradas **curvas** (splines Catmull-Rom) ligando as zonas:
  Vila ↔ Fazenda, Vila ↔ Lago, Vila ↔ Floresta, Fazenda ↔ Floresta.
- Cada estrada vira uma "fita" de malha que **acompanha o terreno** (altura = terrainHeight + 0.05),
  com linha central tracejada.
- O grafo da rede (nós + segmentos) é exportado para o **tráfego** seguir.

## Carro v2

- **Aceleração/freio suaves**: velocidade cresce/decresce com damping; parar de leve segurando para trás.
- **Suspensão**: o carro segue o terreno com mola/amortecedor (sem "grudar" instantâneo em colinas).
- **Ruas com sensação própria**: dentro da largura da rua o chão é liso (sem bumps); fora, terreno normal.
- **Câmera de carro**: chase baixa e próxima, com atraso suave.
- **Faróis à noite** (cones de luz/luz pontual) + buzina (já tem).
- Inclinação leve do corpo nas curvas; rodas girando.

## Vida do mundo

- **Animais v2**: IA simples de passeio — cada animal tem uma zona, escolhe um ponto próximo,
  anda até lá (virando na direção), pausa, repete. Quando o carro se aproxima, eles **olham e dão
  um pulinho alegre** (sem susto, sem punição).
- **Tráfego amigável**: 2–3 carrinhos seguem as estradas pelo grafo; se o jogador está na frente,
  param e buzinam de leve.
- **Dia/noite consistente**: postes da vila e faróis acendem à noite; janelas das casas também (já existe).

## Densidade de decoração

- Muitas árvores (pinheiro, palmeira, frondosa, macieira, arbusto), cercas, flores, bancos, pedras.
- Cerca em volta do curral; canteiros de flores na vila; bancos no lago.

## Blender (novos objetos, mesmo padrão: root EMPTY + meshes, frente -Y)

- `barn.glb` — celeiro (telhado vermelho, portas).
- `fence.glb` — cerca de madeira (segmento repetível).
- `lamp.glb` — poste de luz (com material emissivo "LampLight" para a noite).
- `bench.glb` — banco de praça.
- `cow.glb`, `duck.glb` — vaca e pato.
- `bush.glb`, `flower.glb` — arbusto e flor.

## Arquitetura

- `src/world/Valley.ts` — terreno grande (400×400), colinas suaves, lago, zonas; terrainHeight próprio.
- `src/world/Roads.ts` v2 — splines + fitas que seguem o terreno + grafo de nós para o tráfego.
- `src/world/Traffic.ts` — carrinhos seguindo waypoints.
- `src/world/Animals.ts` — IA de passeio + reação ao carro.
- `src/controllers/CarController.ts` v2 — aceleração, suspensão, assistência de rua (opcional).
- `src/controllers/CameraController.ts` — modo carro (baixo e próximo).
- `src/levels.ts` — mundos do carro: Vale Vivo (dia), Fazenda (dia), Vale à Noite (começa à noite).

## Fases de implementação

1. Blender: celeiro, cerca, poste, banco, vaca, pato, arbusto, flor.
2. Terreno Valley + estradas curvas + montagem do mundo + níveis do carro.
3. CarController v2 + câmera de carro + faróis.
4. Tráfego amigável nas estradas.
5. Animais que andam e reagem.
6. Densidade de decoração + luzes noturnas.
7. Sons (motor do carro, mugido, quack) + build + push.
