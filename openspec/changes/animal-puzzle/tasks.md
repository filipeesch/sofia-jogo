## 1. Sons (sfx)

- [x] 1.1 Adicionar `thump()`, `ding()` e `win()` em `src/ui/sfx.ts` (volumes/durações consistentes com os sons existentes)

## 2. Estrutura do puzzle (AnimalsApp)

- [x] 2.1 Substituir a grade de toque por quadro 2×3 de slots (emoji fantasma) + bandeja com os 6 animais embaralhados (Fisher–Yates)
- [x] 2.2 Manter os dados dos 6 animais (emoji, nome, som) e a API da classe (`mount`/`destroy`, `onBack`)

## 3. Arrastar e soltar

- [x] 3.1 `pointerdown/pointermove/pointerup` nas peças da bandeja com pointer capture e `touch-action: none` no board
- [x] 3.2 Clone `position: fixed` segue o ponteiro (escala ~1.1); peça original "segurada" (invisível no lugar)
- [x] 3.3 Hit-test no release: centro do ponteiro vs retângulos dos slots livres, com raio generoso
- [x] 3.4 Acerto: snap no slot (transition curta) + som do animal + `ding()` + starburst; slot passa a "ocupado"
- [x] 3.5 Erro: `thump()` + peça desliza de volta à bandeja; `pointercancel` também devolve a peça (sem som)

## 4. Completo e reinício

- [x] 4.1 Todos os 6 encaixados: confete sobre o board + `win()` + botão "Jogar de novo" visível
- [x] 4.2 "Jogar de novo": limpar o quadro, devolver animais à bandeja com novo embaralhamento

## 5. Visual e acessibilidade

- [x] 5.1 CSS: board, slots (fantasma), bandeja, animações (snap, retorno, starburst, confete) em `src/style.css`
- [x] 5.2 Áreas de toque ≥ 64px e `aria-label` nas peças, slots e botões
- [x] 5.3 Renomear item do launcher "Sons" → "Quebra-Cabeça" em `src/main.ts` (manter 🐶 e `id: 'sons'`)

## 6. Verificar e entregar

- [x] 6.1 `npm run typecheck` + `npm run build`
- [x] 6.2 Jogar no dev server: arraste por mouse, arraste por toque, slot errado, quadro completo, "Jogar de novo"
- [ ] 6.3 git commit + push
