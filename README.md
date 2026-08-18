# Avião Aventureiro 🛩️

Jogo 3D infantil para navegador, para crianças de 2–3 anos. Um avião simpático voa
sozinho pelos pontos turísticos de cada mundo (arco-íris, montanhas, oásis...); em
algumas fases um carrinho percorre as estradas. Por padrão tudo anda "sobre trilhos"
(a câmera e o veículo seguem um percurso fixo que visita cada rua/ponto de interesse);
a criança pode tocar no botão 🚂 (ou apertar T) para assumir o controle manualmente e
depois voltar ao modo trilho a qualquer momento. Coleta de estrelas e ação especial
incluídas.

Sem game over, sem vidas, sem dano — não existe jeito de jogar errado.

## Tecnologia

- TypeScript + Three.js + Vite
- Sem backend, sem login, sem assets externos obrigatórios
- Áudio: efeitos 100% procedurais (Web Audio API); os sons dos animais e dos meios de
  transporte dos quebra-cabeças são gravações reais em `public/sounds/*.mp3`, com
  fallback procedural se falharem (créditos em `docs/audio-credits.md`)
- Avião e objetos dos mundos modelados no Blender (`public/models/*.glb`), com
  fallback procedural automático se o GLB não carregar

## Como executar

    npm install        # instala dependências
    npm run dev        # servidor de desenvolvimento (http://localhost:5173)

Produção:

    npm run build      # typecheck (tsc --noEmit) + build de produção
    npm run preview    # serve a build em http://localhost:4173

> Se o npm install falhar com erro de cache (EPERM em ~/.npm), use um cache local:
> npm install --cache ./.npm-cache

## Controles

| Ação | Desktop | Mobile/tablet |
|------|---------|---------------|
| Virar | mover o mouse para os lados | arrastar o dedo para os lados |
| Subir/descer (avião) | mover o mouse para cima/baixo | arrastar o dedo para cima/baixo |
| Ação especial | clique ou Espaço | botão grande ✨ |
| Trilho ↔ Manual | tecla T | botão 🚂/✋ no topo |

O modo **trilho** é o padrão: o veículo percorre sozinho um circuito fechado (o carro
percorre todas as ruas da fase, com retorno 180° nas ruas sem saída; o avião dá voltas
pelos pontos de interesse — arco-íris, picos, oásis...). Ao trocar para **manual**, o
controle passa para a criança; ao voltar ao **trilho**, o veículo desliza suave até
reatrelar no percurso.

## Estrutura

    src/
      main.ts                 entrada (carrega GLBs e abre o jogo)
      levels.ts               configuração das fases (mundo, céu, veículo, dia/noite)
      core/Game.ts            orquestra tudo (loop, luz, câmera, input, modo trilho)
      assets.ts               carregador GLTF + modelos de cada mundo
      entities/Airplane.ts    avião: GLB do Blender + fallback procedural
      entities/Car.ts         carrinho: GLB do Blender + fallback procedural
      controllers/            FlightController + CarController + CameraController
      rails/                  modo "sobre trilhos":
                              roadDefs.ts (polilinhas das ruas por mundo),
                              roadTour.ts (percurso fechado do carro: percorre TODAS as
                                           ruas; embebidor chinês + Euler; retorno 180° em
                                           becos; desvio lateral de obstáculos),
                              flightTour.ts (loop fechado do avião pelos pontos de interesse),
                              pathFollower.ts (avanço suave pelo polígono fechado)
      world/                  World, Valley, Island, Mountains, Snow, Desert, Ocean, Sky, DayNightCycle, Roads, landmarks
      systems/                Collectibles, ProximityEvents, ParticleEffects, AudioManager
      ui/                     HomeScreen + UI (contador + botões + toggle trilho/manual)
    scripts/
      check-rail-tour.mjs     valida os percursos trilho (cobre todas as ruas, fica na
                              estrada, margem de colisão, loop do avião) — rodar com
                              `node scripts/check-rail-tour.mjs`
      capture-server.mjs      servidor de captura debug (`?debug=1&shots=PORT`)  
    public/models/            aviao, car, palm, tree, whale, bird, balloon, peak,
                               snowman, pine, cactus, pyramid, house, barn, fence (.glb)

## Funcionalidades

- **Modo "sobre trilhos" (padrão)**: circuito fechado calculado por fase — o carro
  percorre todas as ruas do mapa (com retorno 180° nas ruas sem saída) e o avião dá
  voltas pelos pontos de interesse (arco-íris, entre os picos, oásis...); desvio
  lateral automático em volta de obstáculos; botão/tecla T para pilotar manualmente
- 8 fases em 5 mundos (vale, ilha, montanhas, neve, deserto — com variações noturnas),
  objetos 3D detalhados feitos no Blender (palmeira, baleia, boneco de neve, pinheiro,
  cacto, pirâmide, casa, celeiro, cerca...) — com fallback procedural automático se
  algum GLB não carregar
- Ciclo dia/noite contínuo (manhã → dia → pôr do sol → noite → amanhecer)
- Estrelas colecionáveis que reaparecem; recompensa a cada 5 estrelas
- Eventos de proximidade: baleia pula, nuvem mágica, pássaros, luzes das casas, arco-íris
- Ação especial com pirueta + partículas + som
- 5 mundos, com objetos 3D detalhados feitos no Blender (palmeira, árvore frondosa, baleia,
  pássaro, balão, montanha rochosa, boneco de neve, pinheiro, cacto, pirâmide) — com fallback
  procedural automático se algum GLB não carregar
- Música de fundo procedural suave + sons (Web Audio API), com botão de ligar/desligar

## Home screen e fases

Ao abrir, o jogo mostra uma home screen com seleção de fases:

1. 🌄 Vale Vivo — vila, fazenda, lago e floresta (avião ou carro)
2. 🌙 Vale à Noite — o vale com as luzes acesas (avião ou carro)
3. 🌴 Ilha Feliz — ilha cercada pelo mar, com baleia, praia e serra (só avião)
4. ⛰️ Vale das Montanhas — cordilheira com picos nevados, vale e lago (avião ou carro)
5. ❄️ Mundo da Neve — bonecos de neve, pinheiros e lago congelado (avião ou carro)
6. 🏜️ Deserto — pirâmide, cactos e oásis (avião ou carro)
7. ⭐ Noite Estrelada — as montanhas sob a lua, começando à noite (avião ou carro)

Dentro do jogo há um botão 🏠 (canto superior esquerdo) para voltar à home
e escolher outra fase, e um botão 🚂/✋ (topo central) para alternar entre o
modo trilho e o controle manual.
