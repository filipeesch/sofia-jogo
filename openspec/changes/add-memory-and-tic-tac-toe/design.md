# Design

## Context

O projeto é um app Three.js + DOM (Vite, TypeScript, pt-PT) para uma criança de 2–3 anos. Mini-jogos são classes DOM com contrato `new App({ onBack }) → mount() / destroy()`, montadas em `#ui` por `src/main.ts`, que também mantém o launcher de cartões (sem spec própria). Serviços reusáveis: `speakName/cancelSpeech` (`src/ui/speech.ts`, robusto em iOS), elenco `ANIMALS` com `emoji/name/file/sound` (`src/apps/puzzleAnimals.ts`), sons procedurais (`src/ui/sfx.ts`, inclui `clique`, `ding`, `win`, `thump`) e gravações via `playSound` (`src/ui/sounds.ts`). Ver proposal.md para motivação; ver os deltas `specs/` para o comportamento obrigatório.

Restrição de convívio: há desenvolvimento paralelo na main tocando `style.css` e `BubblesApp`; esta mudança deve minimizar contacto com esses ficheiros.

## Goals / Non-Goals

**Goals:**
- Dois mini-jogos completos, coerentes com a linguagem visual e a filosofia "sem perder" dos existentes.
- Seletor de dificuldade como escolha do adulto, persistente entre sessões.
- Fusão trivial com a main em curso (ficheiros quase todos novos).

**Non-Goals:**
- Nada de assets novos (sons, imagens, modelos) nem novos animais no elenco.
- Sem integração com as tools MCP/debug de captura (são dos mundos 3D).
- Sem confetes/partículas novos; feedback é som + CSS.

## Decisions

- **CSS próprio (`src/apps/games.css`) importado por efeito dos módulos dos jogos.** Alternativa: acrescentar ao `style.css` partilhado — rejeitada: o `style.css` está a ser editado em paralelo na main e causaria conflito de merge; o projeto já usa CSS por superfície (`editor.css`).
- **Grid do memory por orientação do viewport.** Em vez de fixar linhas×colunas, o tamanho escolhido (6/12/20 células) é fatorado na orientação que melhor preenche o ecrã (paisagem → mais colunas; retrato → mais linhas), com célula = mínimo disponível por lado. Rejeitado: grid fixo 2 linhas × 3 colunas etc. — estouraria em retrato de telemóvel. O `puzzleLayout.ts` não é reaproveitado (resolve outra geometria), mas segue a mesma filosofia de medir o ecrã em runtime com `ResizeObserver`.
- **Máquina de estados do memory: `idle → oneOpen → twoOpen(lock)` no próprio app.** No par errado: `clique()` suave + `setTimeout` de ~1000 ms para fechar, input travado nesse intervalo (nunca 3 cartas abertas). Todos os timeouts vivem numa lista limpa em `destroy()` (padrão do `PuzzleApp`).
- **Revelação fala com a cadeia dos quebra-cabeças:** `speakName(nome, ok → file ? playSound(file, fallback sound) : sound?.())`. A fala da segunda carta interrompe a primeira de forma natural (`speakName` já cancela a fila — aceitável e já é o comportamento do puzzle em iOS).
- **CPU do galo:** tabela das 8 linhas vencedoras; Fácil = célula vazia uniforme; Média = bloqueia se e só se houver exatamente uma célula de bloqueio, senão aleatória; Difícil = minimax puro (3×3 é exaustivo, sem necessidade de alpha-beta, mas usa-o na mesma por trivialidade). A jogada da CPU sai por `setTimeout` de 600–900 ms com **contador de geração** (padrão `navSeq` do `main.ts`): qualquer reset/destroy invalida a jogada agendada.
- **Turnos**: modo CPU — criança sempre X, sempre abre; 2 Jogadores — primeiro X alterna a cada "Jogar de novo" em variável de sessão. Indicador de turno: as duas peças (X, O) vivem ao lado do tabuleiro; a do turno pulsa em CSS (sem texto — criança pré-leitora).
- **Seletor = segmented control com emoji + rótulo curto** (🧸 Fácil / 😯 Média / 🤖 Difícil / 👫 2; no memory: 2x3/3x4/4x5 com emoji 🐣/🐥/🐔 de tamanho). Toque no seletor = recomeço imediato (espec). Persistência em `localStorage` (`sofia.mem.grid`, `sofia.ttt.mode`) com `try/catch` (modo privado do Safari).
- **Celebrações via `speakName` + `sfx.win()`:** memory "Encontraste todos os pares!"; galo vitória "Ganhaste!", CPU "A CPU fez três!" (neutro-positivo, sem drama), empate "Empate!". Botão "Jogar de novo" reutiliza o estilo `puzzle-again`.
- **Sorteio do memory:** Fisher-Yates sobre os 12 animais → N pares → 2N cartas embaralhadas; repete o embaralhamento até a disposição diferir da anterior (padrão "Bandeja sempre diferente" do animal-puzzle).

## Risks / Trade-offs

- [Fala dupla ao virar duas cartas depressa] → `speakName` serializa por cancelamento interno; a primeira carta ser cortada pela segunda é o mesmo compromisso já aceite nos quebra-cabeças.
- [`localStorage` indisponível (private mode)] → leitura/escrita em `try/catch`; sem persistência, usa os padrões 3x4/Fácil.
- [CPU aleatória poder ganhar no Fácil] → aceite pelo spec: a criança perde raramente; o feedback de vitória da CPU é neutro-positivo, e "Jogar de novo" está sempre a um toque.
- [Jogo do galo tem perdedor, contra a filosofia "não há como perder"] → mitigado pelo modo Fácil como padrão, pela calibração e pela ausência total de mensagem negativa.
- [Dois `setTimeout` de CPU concorrentes com reset] → contador de geração invalida jogadas agendadas; `destroy()` limpa tudo (mesma classe de corrida que `main.ts` já resolve com `navSeq`).
