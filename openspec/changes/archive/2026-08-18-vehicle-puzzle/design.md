## Context

O animal-puzzle (`src/apps/AnimalsApp.ts`) já tem o mecanismo maduro (drag com pointer capture, raio generoso no slot próprio, shuffle garantido, sons reais com fallback). O novo jogo precisa do mesmo comportamento com outro conjunto de peças — a implementação correta é extrair a classe genérica e trocar o conjunto de dados.

## Decisions

- **Classe genérica `PuzzleApp` + configs de dados.** `PuzzleApp` recebe `{ title, items, onBack }` onde `PuzzleItem = { emoji, name, sound, file, maxDur? }`. `puzzleAnimals.ts` e `puzzleVehicles.ts` exportam os conjuntos; `main.ts` instancia um `PuzzleApp` por app. `AnimalsApp.ts` é removido; o CSS e o comportamento do app de animais não mudam (mesma classe raiz `.animals`, mesmo título).
- **Colunas do quadro por quantidade.** 12 itens → 4 colunas (3 linhas); 15 itens → 5 colunas (3 linhas). Evita estourar 720p com 4 linhas de slots.
- **`maxDur` no pipeline de áudio.** `preloadSound(url, maxDur?)` corta o buffer decodificado nos primeiros `maxDur` segundos (4 s para bombeiro, avião, helicóptero e trator). Decidir no decode (e não no play) mantém o cache simples e a latência do encaixe baixa.
- **15 fallbacks procedurais.** Cada veículo ganha uma síntese curta em `sfx.ts` (bipes de buzina, sirenes em varredura, apito de trem, "whup" de helicóptero...), na mesma filosofia dos fallbacks dos animais: a gravação é o ideal, a síntese é o piso.
- **Escolha dos sons.** MyInstants (mesma fonte dos animais), um som distintivo por veículo, 1,1–3 s na maioria; as 4 gravações longas (>4 s) foram preferidas às alternativas curtas quando a cauda era apenas silêncio/cópia (decisão registrada nos créditos).

## Risks / trade-offs

- 15 peças na bandeja em telas pequenas: com peças de 56 px e wrap, a bandeja faz 3 linhas (5 por linha em 375 px) — verificado no build de 720p e tablet.
- Refatorar `AnimalsApp` → `PuzzleApp` no mesmo change aumenta a superfície de mudança do app de animais; o risco é baixo porque o comportamento é mantido e coberto pelo mesmo teste Playwright (re-executado no fim).
