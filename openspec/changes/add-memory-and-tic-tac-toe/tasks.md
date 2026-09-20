# Tasks

## 1. Scaffolding e launcher

- [ ] 1.1 Criar `src/apps/games.css` com o reset visual dos jogos (root full-screen, cabeçalho com 🏠, segmented control do seletor) e verificar que `npm run typecheck` passa com o import vazio dos módulos
- [ ] 1.2 Criar `src/apps/MemoryApp.ts` e `src/apps/TicTacToeApp.ts` como stubs com o contrato `{ onBack }`, `mount()`, `destroy()` e registar os cartões "Memória" 🃏 e "Jogo do Galo" ⭕ em `src/main.ts`, verificando que ambos abrem e o botão 🏠 regressa ao launcher

## 2. Jogo da Memória

- [ ] 2.1 Implementar o grid do memory: fatorar 6/12/20 células em linhas×colunas conforme a orientação do viewport (célula do maior tamanho que caiba sem scroll, `ResizeObserver`), verificando por screenshot em retrato e paisagem
- [ ] 2.2 Implementar revelação de carta: virar com animação CSS, falar o nome via `speakName` e tocar o som do bicho a seguir (`file` → `playSound`, fallback `sound`), ignorando toques em cartas abertas, verificando que cada toque produz fala audível da palavra certa
- [ ] 2.3 Implementar a máquina de estados do par: match (ficam abertas, `ding`, destaque) e no-match (`clique` suave, ~1000 ms abertas, fecham, input travado no intervalo, nunca 3 cartas abertas), com todos os `setTimeout` registados e limpos em `destroy()`, verificável por toques rápidos sem estados pendurados
- [ ] 2.4 Implementar o sorteio: Fisher-Yates dos 12 `ANIMALS` → N pares → 2N cartas embaralhadas, repetindo até a disposição diferir da anterior, verificando em dois "Jogar de novo" consecutivos que nenhuma carta repete posição
- [ ] 2.5 Implementar fim de partida: ao casar o último par, `speakName('Encontraste todos os pares!')` + `win()` + botão "Jogar de novo" (estilo `puzzle-again`), verificando que o jogo não aceita mais toques nas cartas
- [ ] 2.6 Implementar o seletor de grid (2x3/3x4/4x5) com padrão 3x4, persistência em `localStorage` (`sofia.mem.grid`, `try/catch`) e recomeço imediato na troca, verificando que recarregar a página mantém a escolha

## 3. Jogo do Galo

- [ ] 3.1 Implementar tabuleiro 3x3 (células grandes tocáveis), colocação X/O alternada com `clique()`, recusa de célula ocupada sem mudar o turno, e indicador visual de turno (peça do turno pulsa, sem texto), verificável por sequência de toques com estado correto
- [ ] 3.2 Implementar o seletor de modo (👫 2 / 🧸 Fácil / 😯 Média / 🤖 Difícil) com padrão CPU Fácil, persistência (`sofia.ttt.mode`) e recomeço imediato na troca, verificando recarga da página com a escolha mantida
- [ ] 3.3 Implementar a CPU: Fácil aleatória, Média bloqueia quando existe exatamente uma célula de bloqueio (senão aleatória), Difícil minimax imbatível; jogada após `setTimeout` de 600–900 ms invalidável por contador de geração em reset/destroy, verificável por jogadas completas nos três modos
- [ ] 3.4 Implementar o modo 2 Jogadores: X abre, alternância por toques no mesmo ecrã, e primeiro jogador X alternando a cada "Jogar de novo", verificável em duas partidas seguidas
- [ ] 3.5 Implementar vitória/empate: deteção das 8 linhas, bloqueio de jogadas, destaque CSS da linha vencedora, `win()` + fala ("Ganhaste!" / "A CPU fez três!" / "Empate!") e botão "Jogar de novo" que mantém o modo, verificável pelos três desfechos

## 4. Verificação integrada

- [ ] 4.1 Correr `npm run typecheck` e `npm run build` sem erros
- [ ] 4.2 Playwright: walkthrough completo dos dois jogos (launcher → abrir → jogar um par/vitória → trocar seletor → 🏠) com screenshots em retrato (390x844) e paisagem (844x390), sem erros de consola
- [ ] 4.3 Validar o change com `openspec validate` e revisar cada cenário dos deltas `specs/memory-game` e `specs/tic-tac-toe` contra o comportamento observado
