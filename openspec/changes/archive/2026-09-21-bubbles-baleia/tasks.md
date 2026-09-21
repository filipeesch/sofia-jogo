# Tasks

## 1. Forma

- [x] 1.1 Baixar a referência para `_shots/ref-baleia.jpg` e converter para BMP
      24 bits; confirmar limiar de tinta e caixa do corpo (91,178,584,394).
- [x] 1.2 Decalcar corpo (`GLOBAL` 104 de altura → viewBox 154,1×104), boca
      (`CROP` 135,432,125,75) e barbatana ventral com o traçador da skill.
- [x] 1.3 Montar a folha `_shots/baleia-sheet.html` com corpo + boca + barbatanas
      sobre a referência e validar a silhueta por visão; v2 com barriga, olho,
      realces, furinho e sopro.

## 2. Sprite na casa

- [x] 2.1 Exportar `BALEIA(cores)` em `src/apps/bubblesSprites.ts` com paleta
      `{pele, barriga, barbatana, escura, boca, lingua}`, `olho()` da casa e
      creditos do decalque no comentario.
- [x] 2.2 viewBox com folga de 20 unidades acima do lombo para o sopro;
      grupos `.baleia-sopro` e `.baleia-boca` para o CSS animar.

## 3. Integração nas Bolhas

- [x] 3.1 `Baleia`/`BALEIAS` em `BubblesApp` (uma, top 5 vh, `--nada` 75 s,
      `--atraso` -30 s, `--bob` 6,2 s, h 150) e metodo `baleias()`, tocavel com
      `glup` e ar da boca (`topo 0.75`).
- [x] 3.2 Entrada no DOM na linha das figuras de cenario, ANTES dos peixes.
- [x] 3.3 CSS `.bubbles-baleia`: `swim` + `baleiaBob`, boca em `scaleY` com
      origem na maxila de cima, sopro em tres fases, `baleiaSalto` ao toque, e
      alvo so no corpo via `::before` (span `pointer-events: none`).

## 4. Medida e documentacao

- [x] 4.1 `scripts/check-bubbles-fps.mjs`: seletores com `.bubbles-baleia` e
      contagem de baleias; correr `npm run check:fps-bolhas` — mediano 59,9,
      0 frames > 20 ms nas tres situacoes, 18 figuras / 470 nos / 40-43 anim.
- [x] 4.2 Provas por visao em `_shots/`: `baleia-1280.png`, `baleia-834.png`,
      `baleia-sopro-forte.png`, `baleia-toque.png` (boca escancarada, 0 erros).
- [x] 4.3 `docs/performance.md`: 18 figuras, 470 nos, 40-43 animacoes.
- [x] 4.4 `npm run check:exit` verde — com correcao colateral do `tapAll`
      (`pointerdown` + `click`) que desbloqueou o passo do editor, avariado no
      main desde c682905.
- [x] 4.5 `npm run build` verde.
