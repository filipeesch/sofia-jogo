# Proposal

## Why

A Sofia já domina os quebra-cabeças de arrastar-e-encaixar; o repertório de jogos precisa de dois degraus acima na mesma linguagem visual: memória visual com pares (Jogo da Memória) e um jogo de turno com regra simples (Jogo do Galo). Ambos reusam o vocabulário, a fala pt-PT e o sistema de sons já existentes, sem criar nenhum asset novo.

## What Changes

- Novo mini-jogo **Jogo da Memória** (`MemoryApp`): grid de cartas viradas para baixo com pares de animais; ao revelar uma carta o nome do animal é falado em pt-PT (e o som do bicho toca depois da fala quando houver gravação); seletor de dificuldade no topo escolhe o tamanho do grid (2x3 = 3 pares, 3x4 = 6 pares, 4x5 = 10 pares — o máximo, pois só existem 12 animais no app); os pares são sorteados dos 12 animais existentes a cada partida.
- Novo mini-jogo **Jogo do Galo** (`TicTacToeApp`): tabuleiro 3x3 com peças X e O; seletor no topo escolhe o modo — 2 Jogadores, CPU Fácil (jogadas aleatórias), CPU Média (só bloqueia vitória iminente, senão aleatória) ou CPU Difícil (minimax, perfeita); ao vencer, a linha é destacada com jingle e fala de celebração, sem ênfase no perdedor.
- Ambos os jogos seguem o contrato dos apps existentes (`onBack`, `mount()`, `destroy()`, botão 🏠 que corta a fala) e a filosofia infantil do projeto: sem pontuação, sem cronómetro, som neutro (nunca de "erro") quando algo falha.
- Dois cartões novos no launcher: "Memória" e "Jogo do Galo".
- Último tamanho/modo escolhido em cada seletor é lembrado (localStorage); padrões: 3x4 e CPU Fácil.
- Estilos dos dois jogos vivem em `src/apps/games.css` (importado pelos módulos), seguindo o padrão `editor.css`, para não tocar no `style.css` partilhado.

## Capabilities

### New Capabilities
- `memory-game`: Jogo da Memória dos animais — seletor de grid, revelação com nome falado, casamento de pares, fim de partida celebrativo.
- `tic-tac-toe`: Jogo do Galo — seletor de modo (2 jogadores / 3 dificuldades de CPU), alternância de turnos com indicação visual, vitória/empate com feedback suave.

### Modified Capabilities

_(nenhuma — o launcher não tem spec própria e nenhum requisito existente muda)_

## Impact

- `src/main.ts` — registar os dois apps no launcher (único ficheiro partilhado tocado).
- `src/apps/MemoryApp.ts`, `src/apps/TicTacToeApp.ts`, `src/apps/games.css` — novos.
- Reuso sem alteração: `src/ui/speech.ts` (`speakName`, `cancelSpeech`), `src/apps/puzzleAnimals.ts` (`ANIMALS`), `src/ui/sfx.ts` (`win`, `ding`, `thump`), `src/ui/sounds.ts`.
- Nenhum asset novo em `public/`; nenhum endpoint ou tool MCP novo.
