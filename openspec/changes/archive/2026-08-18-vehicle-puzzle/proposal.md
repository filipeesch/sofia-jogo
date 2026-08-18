## Why

O quebra-cabeça de animais funcionou bem (e foi refinado em `puzzle-drop-precision`); agora queremos um segundo jogo da mesma família com **meios de transporte**, para expandir o vocabulário sonoro e visual da Sofia: 15 veículos variados, cada um com o seu som real, mesmas regras amigáveis (sem jeito de errar, som como recompensa).

## What Changes

- Novo app **"Meios de Transporte"** no launcher (ícone 🚕), com o mesmo mecanismo do quebra-cabeça de animais: arrastar 15 veículos da bandeja até as silhuetas; o som do veículo toca apenas no encaixe correto.
- 15 veículos variados: 🚗 carro, 🚕 táxi, 🚓 polícia, 🚑 ambulância, 🚒 bombeiro, 🚛 caminhão, 🚌 ônibus, 🚲 bicicleta, 🏍️ motocicleta, 🚂 trem, ✈️ avião, 🚁 helicóptero, 🚀 foguete, ⛵ veleiro, 🚜 trator.
- Sons reais em MP3 (`public/sounds/*.mp3`, ~640 KB) pré-carregados na abertura, com corte opcional de 4 s no decode para gravações longas; fallback procedural (15 sintetizações novas em `src/ui/sfx.ts`) quando o arquivo não carrega.
- O quebra-cabeça de animais passa a usar a mesma classe genérica (`src/apps/PuzzleApp`); `src/apps/AnimalsApp.ts` é removido — sem mudança de comportamento visível para o app de animais.
- Regras idênticas às do quebra-cabeça de animais: silhueta sem rótulo, raio de encaixe generoso em relação ao slot próprio, toque simples sem som, erro sem punição, bandeja sempre visivelmente embaralhada, celebração com confete e "Jogar de novo".
- Créditos das gravações em `docs/audio-credits.md`.

## Capabilities

### New Capabilities

- `vehicle-puzzle`: quebra-cabeça de encaixe de 15 meios de transporte com sons reais (mesmo contrato de jogabilidade do animal-puzzle).

### Modified Capabilities

(nenhuma — a extração de `PuzzleApp` é refatoração interna do animal-puzzle, sem mudança de requisito)

## Impact

- Novo: `src/apps/PuzzleApp.ts` (classe genérica), `src/apps/puzzleAnimals.ts`, `src/apps/puzzleVehicles.ts`, 15 MP3 em `public/sounds/`.
- Removido: `src/apps/AnimalsApp.ts` (substituído por `PuzzleApp` + config).
- `src/main.ts` (novo item do launcher + `openVehicles`), `src/ui/sounds.ts` (parâmetro `maxDur` em `preloadSound`), `src/ui/sfx.ts` (15 fallbacks de veículos), `docs/audio-credits.md`, `README.md`.
- Sem impacto no jogo 3D.
