# Tasks

## 1. Implementação

- [x] 1.1 Em `MemoryApp.ts`, inverter a cadeia de `reveal()`: com gravação, `playSound(file)` toca de imediato e o `speakName(nome)` passa para o `onEnd` (e para o fallback, com o som procedural antes); sem gravação, `speakName` na hora. A celebração do último par continua encadeada no fim de tudo.
- [x] 1.2 Em `MemoryApp.ts`, no ramo do par errado: substituir `clique()` por `thump()` e adicionar a classe `.wrong` às duas cartas, removendo-a no timeout que as fecha.
- [x] 1.3 Em `games.css`, adicionar `@keyframes mem-shake` e `.mem-card.wrong { animation: mem-shake ... }` no cartão exterior (nunca no `.mem-inner`, que tem o transform do flip).

## 2. Verificação

- [x] 2.1 `npm run typecheck` e `npm run build` sem erros.
- [x] 2.2 Browser com instrumentação: o `start()` do buffer do animal acontece no mesmo instante do toque que fecha o par (< 100 ms); 0 falas ao virar carta/errar par; exatamente 1 fala por acerto, depois do início do som; no último par, a ordem é som → nome → jingle+celebração; `.wrong` aparece nas duas cartas do par errado e é removida quando fecham; 0 erros de consola.
