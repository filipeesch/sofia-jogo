# Proposal

## Why

Com a fala a cada revelação, dois toques rápidos cortam a palavra um do outro e o jogo vira ruído; a criança ouve o nome melhor uma única vez, no momento em que o par acontece — que é a recompensa. O pedido do adulto é explícito: som do animal e nome somente quando acertar.

## What Changes

- Virar uma carta passa a ser silencioso (só a animação da virada; o toque na carta não fala nem toca som nenhum).
- Acertar o par passa a ser o momento sonoro: som de acerto, nome do animal falado em pt-PT e, quando existir gravação, o som do bicho depois da fala (cadeia `speak` + `soundAfter` dos quebra-cabeças).
- Par errado continua com o clique suave e o fecho atrasado, sem fala.

## Capabilities

### New Capabilities

_(nenhuma)_

### Modified Capabilities
- `memory-game`: "Revelar carta fala o nome do animal" passa a ser revelação silenciosa; o nome + som do animal migram para o "Casamento de pares" como recompensa do acerto.

## Impact

- `src/apps/MemoryApp.ts` — mover a cadeia de fala da revelação para o acerto (únicoficheiro de código tocado).
- Nenhum serviço muda: `speakName`, `cancelSpeech`, `playSound`, sfx e gravacões permanecem como estão.
