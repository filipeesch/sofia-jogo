# Tasks

Estado: **tudo verificado num browser real** (Playwright, retrato e paisagem). A evidência está nas capturas em `_shots/ref-bubbles-*` e nas medições: fala a zero (`speechSynthesis.speak` escutado), fogo nas quatro formas sem repetição consecutiva, fagulhas e clarão a somar-se à água (`mix-blend-mode: screen`) para que o fogo azul se veja, peixe tocável com caixa de 90 px, e zero nós deixados ao sair.

## 1. Matar a avaria e o vazamento

- [x] 1.1 Repor `@keyframes floatUp` (`translateY(0) → translateY(-130vh)`) num bloco de CSS próprio das bolhas, longe do bloco do puzzle, com comentário a indicar que `BubblesApp` o consome, e verificar no browser que `getComputedStyle(bolha).animationName` devolve `floatUp` *e* que a mesma bolha muda de `getBoundingClientRect().y` ao fim de 1 s
- [x] 1.2 Adicionar `@keyframes wobble` de deriva lateral em ciclo, aplicada como segunda animação independente da subida, e confirmar a olho que uma bolha lenta e uma rápida derivam ao mesmo ritmo
- [x] 1.3 Ligar `animationend` à remoção da bolha e impor o teto de 8 simultâneas, e verificar com uma contagem de `document.querySelectorAll('.bubble').length` estável (oscila, nunca cresce) ao longo de minutos

## 2. Cena debaixo de água

- [x] 2.1 Dar ao contentor o fundo de água clara com feixes de luz e areia no fundo, ocupando o ecrã todo sem barras de rolagem nem áreas brancas, e confirmar com uma captura em retrato e em paisagem
- [x] 2.2 Acrescentar três peixes animados só por CSS (nada de `requestAnimationFrame`), e confirmar que `destroy()` os faz desaparecer todas com o resto do app
- [x] 2.3 Fazer o peixe mais próximo fugir do ponto de um estouro dentro de um raio generoso (classe `flee` + direcção, removida no fim), e verificar que o peixe se afasta e depois retoma a natação sem som nem bloqueio

## 3. Som de bolha, cor mostrada, zero fala

- [x] 3.1 Em `src/ui/sfx.ts`, adicionar `blip(sizePx)`: seno com `exponentialRampToValueAtTime` de ~700 Hz para ~180 Hz em 70–90 ms, mais grave para bolhas grandes, e verificar que soa a bolha e não a xilofone
- [x] 3.2 Adicionar `noiseBuffer()` (ruído branco de ~128 ms criado **uma vez** e reutilizado) e `pop(volume)` sobre ele — passa-alto ~800 Hz com envelope a fechar em ~50 ms — para o estalido, e confirmar por auscultação que o estalido não desafina com a nota por baixo
- [x] 3.3 Estourar passa a disparar as duas camadas no mesmo `pointerdown`: `pop()` + `blip()` como ataque e `bubbleTone(sizePx)` mais baixinho como cauda, mantendo `resume()` no gesto, e verificar que o primeiro toque depois do áudio adormecer já se ouve
- [x] 3.4 Retirar **toda** a fala do `BubblesApp`: sem `speakName`, `speakIfIdle`, `speechLooksDead` nem fila de revelações; sem imports de `speech.ts` e `puzzleAnimals.ts`; sem o CSS `.bubbles-reveal`. `cancelSpeech()` fica exportado em `speech.ts` para as outras apps
- [x] 3.5 Verificar o requisito "O brinquedo não fala": com uma escuta em `speechSynthesis.speak`, jogar dois minutos a estourar tudo e confirmar que o contador fica em 0 e `speechSynthesis.speaking` é sempre `false`
- [x] 3.6 Verificar o requisito "Nenhum som de falha": tocar no fundo do ecrã, fora de bolhas e peixes, e confirmar que nada soa, nada fala e nada muda
- [x] 3.7 Definir as seis cores nomeadas em pt-PT e usá-las no gradiente, no halo e no estouro da bolha — com a azul mais escura que a água (#2f9ae0) e reflexo menor nos gigantes — e confirmar visualmente em retrato que cada cor se distingue da água
- [x] 3.8 Distribuir as três classes de dimensão (pequena ocasional, comum ≥ 72 px, gigante), e medir que nenhuma bolha comum nasce com diâmetro abaixo de 72 px
- [x] 3.9 Confirmar que a nódoa de cor só existe nas gigantes, que as bolhas comuns não deixam marca persistente, e que as fagulhas herdam a cor da bolha (`--c`)

## 4. Gigantes e fogo de artifício

- [x] 4.1 Guardar os toques da gigante no próprio elemento e fazê-la crescer e tremer a cada toque, com a nota seguinte da escala, rebentando ao terceiro, e verificar que um e dois toques não a destroem nem a fazem encolher
- [x] 4.2 Usar `setPointerCapture` + `touch-action: none` na gigante, no padrão do `PuzzleApp`, e verificar que um arrastar de dedo sobre ela não cancela o toque
- [x] 4.3 Ao terceiro toque, disparar o fogo no ponto da gigante — `roda`, `chuveiro`, `espiral` ou `coroa`, sorteado entre as quatro — e verificar que a mesma forma não sai duas vezes seguidas ao longo de várias gigantes
- [x] 4.4 Gerar as fagulhas como `<span>` com `--dx`/`--dy`/`--atraso`/`--dur` por fagulha e `@keyframes sparkFly` para arranque + queda (sem `requestAnimationFrame`, sem canvas), com `animationend` a remover cada uma, e confirmar que no fim não fica nenhuma fagulha no DOM
- [x] 4.5 Pigmentar o fogo com a cor da bolha e medir visualmente que um fogo azul e um roxo se distinguem um do outro na zona clara da água
- [x] 4.6 Adicionar `sparkle()` em `sfx.ts`: assobio (glide 1200 → 400 Hz, ~280 ms) + chuvisco de 6–10 estalidos de ruído filtrado em instantes pseudo-aleatórios, sem nenhum componente grave prolongado, e verificar por auscultação que não assusta
- [x] 4.7 Fazer os toques 1 e 2 soltarem já um punhado de fagulhas — pequeno, depois maior — para que o clímax se veja a construir antes do terceiro toque
- [x] 4.8 Um fogo de cada vez (flag no `destroy()` + rede de segurança) com teto declarado de ~60 fagulhas em voo, e verificar que estourar duas gigantes quase em simultâneo nunca põe dois espectáculos um sobre o outro nem passa o teto
- [x] 4.9 Fazer fagulhas e clarão somarem luz ao fundo (`mix-blend-mode: screen`) — com composição normal o fogo azul, a cor que está em jogo desde a primeira vaga, desaparecia contra a água — e confirmar por captura que azul, roxo e laranja se distinguem uns dos outros e do fundo, sem que nenhuma fagulha roube um toque (medido com `elementFromPoint` por cima de 27 fagulhas em voo)

## 5. Vagas sem fim nem derrota

- [x] 5.1 Escrever o director de vaga (entrada a cada ~900 ms enquanto houver menos de 8 no ar, ~6 médias + 1 gigante), com todos os `setTimeout` registados numa lista, e verificar que nenhuma bolha entra fora de ritmo
- [x] 5.2 Celebrar o fim de vaga com `win()` e confetti reusando `@keyframes confettiFall` numa classe própria das bolhas, e verificar que a vaga nova entra instantes depois com uma cor a mais
- [x] 5.3 Tratar a bolha que escapa pelo topo como saída neutra, sem som nem consequência, e verificar que a vaga ainda é celebrada mesmo com bolhas escapadas
- [x] 5.4 Excluir gigantes a meio do cálculo do fim de vaga, de modo que a gigante continue à espera com os toques contados e a vaga nova entre na mesma, e verificar que nada fica pendurado
- [x] 5.5 Verificar que o director e o texto do código deixaram de mencionar animais (a vaga nova traz uma cor e uma forma de fogo, não um animal), e que celebrar com fagulhas em voo não deixa fagulhas para trás

## 6. Soprar e multi-toque

- [x] 6.1 Criar o comando de soprar que produz um enxame contínuo na posição do dedo enquanto mantido e pára de imediato ao soltar, e verificar que não aparece nenhuma bolha atrasada depois do gesto
- [x] 6.2 Verificar o multi-toque com dois dedos: duas bolhas rebentam simultaneamente, cada uma com nota e cor próprias, e o gesto de soprar funciona em paralelo

## 7. Sair sem deixar nada para trás

- [x] 7.1 Exportar `cancelSpeech()` de `src/ui/speech.ts` (a usar o `synth.cancel()` guardado que já trata do erro `canceled` espúrio) — mantém-se exportado para as outras apps, mesmo depois de as bolhas deixarem de falar
- [x] 7.2 Ligar o `destroy()` e o `visibilitychange` ao novo estado: sem fala para cortar, mas com temporizadores do fogo, fagulhas em voo e rasto de peixe a limpar, e confirmar que nada soa com o ecrã bloqueado
- [x] 7.3 Confirmar que `destroy()` limpa a lista de timers, remove o contentor de `#ui` e adormece o áudio (`idleSfx()`), e verificar com `node scripts/check-exit-cleanup.mjs` que ao voltar ao launcher não fica nem áudio nem nós do app
- [x] 7.4 Confirmar que o botão de saída do app continua em cima de tudo e tocável a qualquer momento — `z-index` acima das bolhas, medido com uma bolha de 200 px por cima do botão
- [x] 7.5 Correr `node scripts/check-exit-cleanup.mjs` outra vez com os fogos e o peixe tocável dentro, e confirmar que as fagulhas e o rasto não contam nenhum nó para a limpeza ao sair

## 8. Verificação final contra a especificação

- [x] 8.1 Percorrer os requisitos de `specs/bubbles-toy/spec.md` com o app aberto num browser real e validar um a um os cenários novos: "Estourar soa a bolha e faz música", "O brinquedo não fala", "A cor mostra-se, nunca se diz", "A gigante rebenta em fogo de artifício" e "Os peixes respondem a quem os toca"
- [x] 8.2 Rever a jogabilidade com os olhos de uma criança de 3 anos: alvos grandes, ritmo calmo, recompensa imediata (som e luz no mesmo instante do toque), e nada na tela a pedir uma escolha nem a fazer esperar
- [x] 8.3 Correr `npm run typecheck` e `npm run build`, e confirmar que o bundle de produção leva as keyframes das bolhas e das fagulhas (procura por `floatUp` e `sparkFly` no CSS gerado em `dist/`)
- [x] 8.4 Capturar referências Playwright do estado novo (fogo em cada uma das quatro formas, peixe na cabriola, pop sem fala) em `_shots/`, ao lado das que já lá estão do estado partido

## 9. O peixe deixa de ser só cenário

- [x] 9.1 Dar a cada peixe uma caixa de toque de 90 × 90 px centrada (pseudo-elemento transparente, `pointer-events: auto`, emoji a ficar cenográfico) e medir com `elementFromPoint` que um toque a ~40 px do centro conta como toque no peixe
- [x] 9.2 Implementar a cabriola: classe `spin` com `rotate(360deg)` seguida de arrancada na direcção oposta ao dedo, removida no `animationend`, e o peixe a retomar o `swim` normal sem ficar parado nem fora do ecrã
- [x] 9.3 Deitar 4–6 bolhinhas decorativas ao longo da arrancada, com `pointer-events: none` — não são alvos — e removê-las no `animationend` para não deixarem nós
- [x] 9.4 Adicionar `glup()` em `sfx.ts`: três blips curtos e abafados, sem nota da escala (é som de ar, não música) e sem estrondo, e confirmar que não choca com a nota de um estouro quase simultâneo
- [x] 9.5 Confirmar os dois caminhos lado a lado: estouro próximo → `flee` silenciosa; toque directo → cabriola com som; e nenhum dos dois bloqueia o multi-toque nem o botão de saída
