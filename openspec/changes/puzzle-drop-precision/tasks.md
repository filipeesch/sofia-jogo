## 1. Hit-test

- [x] 1.1 `AnimalsApp`: remover `hitSlot`; em `onDragEnd`, encaixar se a soltura estiver a ≤ ~1.05× do slot do próprio animal (constante nomeada); senão `thump()` + retorno

## 2. Embaralhamento

- [x] 2.1 `shuffleTray`: re-embalhar até a ordem diferir da atual (teto de tentativas); usar na abertura e no "Jogar de novo"

## 3. Visual

- [x] 3.1 CSS: quadro com 4 colunas (helper `n > 12 ? 5 : 4`), slot 60–84 px, peça 56–72 px, fontes proporcionais, gaps 10 px

## 4. Verificar e entregar

- [x] 4.1 `tsc --noEmit` + `vite build` passando
- [x] 4.2 Testar no browser: soltar quase no slot certo (vizinho mais próximo) → encaixa; soltar longe → tum + retorno; "Jogar de novo" → ordem visivelmente diferente
- [x] 4.3 Commit + push