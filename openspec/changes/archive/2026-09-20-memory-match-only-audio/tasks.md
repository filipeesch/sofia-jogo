# Tasks

## 1. Implementação

- [x] 1.1 Em `MemoryApp.ts`, remover a fala/som da virada de carta (revelação silenciosa) e tocar a cadeia `speakName(nome) → gravação/fallback` apenas quando o par casa, junto do `ding()` atual, verificando por contagem de chamadas a `speechSynthesis.speak`: 0 ao virar carta, 1 ao acertar par

## 2. Verificação

- [x] 2.1 `npm run typecheck` e `npm run build` sem erros e verificação no browser: virar duas cartas diferentes produz 0 falas e só o clique suave; acertar um par produz exatamente 1 fala do nome; "Jogar de novo" mantém o comportamento, com 0 erros de consola
