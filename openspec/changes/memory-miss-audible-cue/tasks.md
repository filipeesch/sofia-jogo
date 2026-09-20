# Tasks

## 1. Implementação

- [x] 1.1 `src/ui/sfx.ts`: adicionar `missBoop()` — duas notas de triângulo descendentes (523→440 Hz; 392→330 Hz, +0.13 s), volumes 0.2/0.18.
- [x] 1.2 `src/apps/MemoryApp.ts`: par errado usa `missBoop()` em vez de `thump()` (ajustar import e comentário).

## 2. Verificação

- [x] 2.1 Typecheck/build limpos.
- [x] 2.2 Browser com espião no `createOscillator`: par errado emite exatamente as frequências de `missBoop` (523/392, sem o thump de 150 Hz); ding do acerto intacto; shake `.wrong` presente e removido no fecho; 0 falas no par errado; 0 erros de consola.
