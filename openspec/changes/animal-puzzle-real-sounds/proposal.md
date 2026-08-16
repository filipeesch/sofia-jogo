## Why

O quebra-cabeça dos animais hoje tem 6 animais e todos os sons são sintetizados por Web Audio. Para crianças de 2–3 anos, gravações reais são muito mais reconhecíveis que um "moo" ou "baa" de sintetizador: o som é a recompensa central do jogo, e um som real de vaca, porco ou leão fortalece a associação animal↔som. Ampliar o conjunto de 6 para 12 animais também dá mais repetição de treino (fazenda + zoológico) sem aumentar o tempo de jogo de forma perceptível.

## What Changes

- Seis animais novos no puzzle: 🐷 Porco, 🐴 Cavalo, 🦁 Leão, 🐸 Sapo, 🦉 Coruja, 🐓 Galo (12 no total; quadro 3×4).
- Todos os 12 animais passam a tocar **gravações reais** (MP3 curtos, 1–4 s) servidos de `public/sounds/`.
- Novo módulo `src/ui/sounds.ts`: pré-carregamento (`fetch` + `decodeAudioData` no `AudioContext` compartilhado, na abertura do app) e reprodução por buffer. Se um arquivo não carregar (offline, falha de rede, decodificação), um **fallback procedural** toca no lugar — a mesma filosofia de fallback do GLB do avião.
- `sfx.ts`: seis novos sons procedurais de fallback (`oink`, `neigh`, `roar`, `ribbit`, `hoot`, `crow`) e export de `audioCtx()` para o novo módulo.
- CSS compactado para 12 slots + 12 peças caberem em telas pequenas (720p / tablet em pé).
- `docs/audio-credits.md` com a atribuição exigida pela licença (MyInstants) e nota no `README.md`.
- Regras do puzzle intactas: silhueta sem rótulo, hit-test generoso, erro sem punição, toque simples sem som, celebração e "Jogar de novo".

## Capabilities

### New Capabilities

(nenhuma)

### Modified Capabilities

- `animal-puzzle`: o conjunto de animais passa de 6 para 12 e o som do encaixe correto passa a ser a gravação real do animal, com fallback procedural quando o arquivo indisponível.

## Impact

- `src/apps/AnimalsApp.ts` (lista de 12 animais, preload em `mount()`, `playSound` com fallback em `place()`).
- `src/ui/sounds.ts` (novo), `src/ui/sfx.ts` (`audioCtx()` + 6 fallbacks).
- `public/sounds/*.mp3` (12 arquivos, ~550 KB no total), `src/style.css` (dimensões compactas do puzzle).
- `docs/audio-credits.md` (novo), `README.md` (linha de áudio).
- Sem impacto no jogo 3D, nos demais apps do launcher nem nos servidores de captura.
