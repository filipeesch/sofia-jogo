# Avião Aventureiro 🛩️

Jogo 3D infantil para navegador, para crianças de 2–3 anos. Um avião simpático voa
sozinho por uma ilha cercada pelo mar; a criança só mexe o mouse (ou arrasta o dedo)
para virar/subir/descer, coleta estrelas e dispara uma ação especial.

Sem game over, sem vidas, sem dano — não existe jeito de jogar errado.

## Tecnologia

- TypeScript + Three.js + Vite
- Sem backend, sem login, sem assets externos obrigatórios
- Tudo procedural (geometrias básicas + Web Audio)

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
| Subir/descer | mover o mouse para cima/baixo | arrastar o dedo para cima/baixo |
| Ação especial | clique ou Espaço | botão grande ✨ |

## Estrutura

    src/
      main.ts                 entrada
      core/Game.ts            orquestra tudo (loop, luz, câmera, input)
      entities/Airplane.ts    avião feito de primitivas
      controllers/            FlightController + CameraController
      world/                  World, Island, Ocean, Sky, DayNightCycle, landmarks
      systems/                Collectibles, ProximityEvents, ParticleEffects, AudioManager
      ui/UI.ts                contador + botões

## Funcionalidades

- Ciclo dia/noite contínuo (manhã → dia → pôr do sol → noite → amanhecer)
- Estrelas colecionáveis que reaparecem; recompensa a cada 5 estrelas
- Eventos de proximidade: baleia pula, nuvem mágica, pássaros, luzes das casas, arco-íris
- Ação especial com pirueta + partículas + som
- Áudio 100% procedural (Web Audio API), com botão de ligar/desligar

## Home screen e fases

Ao abrir, o jogo mostra uma home screen com seleção de fases:

1. 🌴 Ilha Feliz — ilha cercada pelo mar (com baleia e praia)
2. ⛰️ Vale das Montanhas — cordilheira com picos nevados, vale e lago
3. 🌙 Noite Estrelada — as montanhas sob a lua, começando à noite

Dentro do jogo há um botão 🏠 (canto superior direito) para voltar à home
e escolher outra fase.
