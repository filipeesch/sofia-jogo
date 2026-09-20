# Tasks

## 1. A música do mar

- [x] 1.1 Criar `src/ui/seaAmbience.ts` com o barramento ligado ao `audioCtx()`
      partilhado e o balanço de ondulação distante (ruído castanho em loop,
      passa-baixas e ganho a respirar por LFO) e verificar no browser que, ao
      abrir as bolhas e tocar, se ouve um fundo contínuo sem cortes.
      → `?debug=1` com um medidor pendurado no barramento: `tocando:true`,
      `ganho:0.16`, `estado:'running'`, `fontes:7`. Amostrado 88 vezes em 22 s:
      RMS mínimo 0,0046, médio 0,0087, máximo 0,0133 — contínuo, sem buracos.
- [x] 1.2 Juntar o acorde que respira (três senos com detune mínimo, acordes
      subconjuntos da escala `PENTA`) e a nota de caixinha sorteada a cada
      8-16 s, duas oitavas acima dos estouros, e verificar que uma nota da música
      e um estouro soam consonantes.
      → `CAIXINHA` = C6-D6-E6-G6-A6-C7-D7-E7 (só notas de `PENTA`, sem F nem B);
      `ACORDES` = C3-G3-E4, A2-C3-E4 e G2-C3-D4 — todos subconjuntos de C-D-E-G-A.
      Em janelas de ~20 s o contador de notas marcou 2 e 3, a bater com o sorteio
      de 8-16 s. Nada fora da escala dos estouros, por construção.
- [x] 1.3 Escrever a agenda de lookahead (um `setInterval` de 250 ms, lookahead
      de 1,2 s) com tudo agendado em relação a `ctx.currentTime`, e verificar que
      ao bloquear e desbloquear o ecrã a música retoma sem salto nem sobreposição.
      → Com `visibilityState` a `hidden` e o evento disparado: `tocando:false`,
      `fontes:0`, `ganho:0` e o contador de notas igual em duas leituras 1,8 s
      apartadas. Ao voltar: `tocando:true` com o ganho a subir 0,058 → 0,16
      (rampa de 2,5 s) e RMS 0,0117 — retoma do silêncio, nunca por cima de si
      própria. A agenda ressincroniza `proximaNota`/`mudaAcorde` quando ficam para
      trás, que é o que corta o burst depois de o contexto acordar.
- [x] 1.4 Dar-lhe volumes de fundo (barramento 0,16; nota 0,05; ondulação 0,05)
      sem compressor nem Q alto, e verificar que o estouro de uma bolha continua
      o som mais saliente da mistura.
      → O medidor obrigou a subir a ondulação de 0,05 para 0,08 e o acorde para
      0,045: a 0,05 o RMS ia em 0,007 e não se ouvia nada. Ficou em RMS médio
      0,0087 / pico 0,0133, contra o pico de 0,22 de um estouro, que vai directo
      ao `destination` — ~16× acima do topo do fundo. Sem compressor e com Q 0,4
      no passa-baixas.
- [x] 1.5 Escrever o `pararMar()`: clearInterval, rampa de gain, `stop()` da
      fonte em loop e `disconnect()`, e verificar saindo dez vezes para o
      launcher que o áudio fica mudo e nada fica agendado a acordar a página.
      → 10 ciclos entrar/sair, medidos dentro e fora: dentro sempre
      `tocando:true, fontes:7`; fora sempre `tocando:false, fontes:0, ganho:0,
      ctx:'suspended', nivel:-1`. O `disconnect()` dos 7 nós é o que fica
      garantido com o tempo parado; o medidor desliga-se com o mar e devolve `-1`,
      para o último quadro de um contexto suspenso não se ler como música.

## 2. A ostra

- [x] 2.1 Desenhar `OSTRA` em `src/apps/bubblesSprites.ts` — um só `<svg>` com
      `<g class="ostra-corpo">` (valva de baixo com costelas, leito, pérola com
      brilho) e `<g class="ostra-valva">` (a de cima, interior nacarado), sem
      `<defs>` nem `url(#...)`, e verificar a 120 px e a 60 px numa folha de
      sprites no browser: lê-se ostra com pérola, nada cortado pelo viewBox.
      → Folha de sprites a 260 px e a 62 px (`_shots/ostras-v1.png`): valva de
      cima lilás-perolada com babado, leito salmão, pérola com sombra e dois
      realces, charneira à direita e boca à esquerda. Na cena, 0 `<defs>`,
      0 `url(`, 0 `id=` dentro dos SVG e 0 filtros SVG.
- [x] 2.2 Rever `CONCHA_ESPIRAL` pela referência: volta em três degraus a afinar
      para trás, riscas calculadas a atravessá-la e abertura grande escura à
      frente, dentro do mesmo `viewBox`, e verificar na mesma folha a 46 px.
      → A primeira tentativa lia-se como um tomate com raios; reescrita como
      espiral logarítmica a sério (razão 2,6 por volta) com riscas que atravessam
      a volta de dentro para fora e boca escura grande virada para a frente.
      `_shots/conchas-v3.png` a 150 px: lê-se a turbinide da referência, riscas
      sempre dentro da silhueta, sem buraco no eixo.
- [x] 2.3 Adicionar `.bubbles-ostra` ao `src/style.css` em `z-index: 3`, com o
      `drop-shadow` no contentor parado, caixa de toque `::before` de 92×86 e a
      transição da valva a rodar na charneira, e verificar em paisagem e em retrato
      que a ostra não fica cortada nem por baixo do botão de soprar.
      → `z-index:3`, contentor `pointer-events:none`, caixa medida em
      `getComputedStyle(::before)` = 92×86 com `pointer-events:auto`. Paisagem
      1280×720 e retrato 834×1112: as duas dentro do ecrã e sem tocar o botão de
      soprar (`encosta_no_soprar:false`; botões em 1166,606 e 720,998).
- [x] 2.4 Pôr duas ostras na cena (64 %/76 px e 33 %/60 px), inseridas antes dos
      peixes no DOM, e verificar que um peixe a passar por cima delas continua a
      levar o toque no ponto da sobreposição.
      → `this.root.append(this.algas(), this.conchas(), this.ostras(),
      this.cavalos(), this.caranguejos())`, tudo antes dos peixes e tudo em
      z-index 3. Ao vigiar o centro de cada ostra, ao fim de 70 sondas o elemento
      do topo era um `.bubbles-fish` a passar: o peixe ganhou a sobreposição, como
      sempre ganhou às algas.
- [x] 2.5 Ligar o toque: som novo (`abraOstra()` em `sfx.ts`: a valva a levantar,
      o estalido abafado e um brilho agudo da pérola, tudo mais baixo que um
      estouro), valva por inteiro, bolhinhas de ar e uma bolha a sério a subir da
      boca com `spawn('pequena', boca)` quando `live.size <= 4`, e verificar as
      duas situações (com lugar e com o ecrã cheio: abre e soa, não nasce bolha).
      → Com 2 bolhas no ecrã: `aberta respira` e uma bolha nova nascida em
      x=448 quando a boca calculada era x=447. Com o ecrã cheio (8 de 8): o toque
      chegou à ostra (topo = `SPAN`), abriu a valva e soou, e o número de bolhas
      nunca passou de 8 — a ostra abre-se sempre, mas só oferece bolha quando há
      lugar. Os picos de `abraOstra()` são 0,085/0,055/0,042/0,026, todos abaixo
      dos 0,22 de um estouro.
- [x] 2.6 Agendar a respiração ambiente por ostra (8-14 s com sorteio, abrir →
      esperar → fechar), **sem som e sem bolha estourável**, com os ids na lista de
      timeouts do app e parada em `visibilitychange`, e verificar com um
      `MutationObserver` que ela abre sozinha várias vezes por minuto sem se ouvir
      nada e sem sair nada para o launcher.
      → `MutationObserver` nas duas valvas durante 22 s: 4 aberturas (2 em cada
      ostra) e 3 fechos, e **0 utterances** com `speechSynthesis.speak` vigiado. A
      respiração só chama `bolhinhas()` decorativa — não passa por `abraOstra()`
      nem por `spawn()`, por isso não tem som nem bolha estourável. Vive em
      `this.respirando` e é desligada em `destroy()` e no `visibilitychange`: com
      o ecrã escondido as duas valvas apareceram fechadas. Os ciclos ficaram
      9-14 s e 12,5-17,5 s (um pouco mais longos que os 8-14 s da tarefa, para as
      duas não abrirem quase em uníssono).

## 3. O caranguejo

- [x] 3.1 Desenhar `CARANGUEJO` em `bubblesSprites.ts` — patas em dois grupos
      (`cang-pernas-e`/`cang-pernas-d`), tenazes em `cang-bracos`, olhos grandes
      colados um ao outro e boca aberta, tudo no mesmo traço do resto da cena e
      sem `<defs>`, e verificar na folha de sprites a 260 px e às alturas da cena.
      → `_shots/caranguejo-v2.png` e `_shots/caranguejo-v3.png`: na primeira
      tentativa as tenazes abriam para fora e liam-se como folhas, e as patas
      convergiam todas para o mesmo ponto, o que lia como aranha; com as tenazes a
      abrir para dentro (como na referência) e as pontas das patas a cair na
      linha do chão, lê-se um caranguejo. 46 nós de SVG, 0 `defs`, 0 `id`, 0 `url`.
- [x] 3.2 Pôr `.bubbles-caranguejo` no `style.css`: camada 3, o mesmo `swim` dos
      peixes a `--passeio: 46s`, gingado no `span`, patas em dois grupos a
      alternar com `transform-box: fill-box`, caixa de toque e reacção `sustou`
      com as tenazes a levantar e as patas a acelerar, e verificar que anda.
      → `getComputedStyle`: contentor com `animation-name: swim`,
      `animation-duration: 46s`, `z-index:3`, `pointer-events:none`; grupos das
      patas com `animation-name: cangPata`, `0.66s`, `transform-box: fill-box`.
      Medido o `left` três vezes: 1227 → 1135 → 1043 em passos de 2,5 s — anda
      mesmo, da direita para a esquerda, ~37 px/s. Caixa `::before` de 96×80.
      Tocado: `sustou`, `--dir:1`, `.cang-bracos` com `matrix(1.066 …, -4.71)`
      (levantou as tenazes), patas a `0.16s` e 4 bolhinhas de ar; 900 ms depois
      estava tudo de volta ao repouso (`classe:""`, patas `0.66s`, braços `none`).
- [x] 3.3 Ligar o toque ao caranguejo com `pinca()` (dois estalidos de tenaz e um
      E→G a 0,03), sem palavra, sem pontuação e sem bolha nova, e verificar que
      uma bolha por cima dele ganha o toque.
      → `pinca()` com pico 0,075, um terço de um estouro. Três sobreposições
      apanhadas com `elementsFromPoint` no centro do caranguejo: em todas o topo
      era a bolha (`bubble-skin, bubble-wob, bubble`; diâmetros 104, 66 e 222 px)
      e o toque produziu um estouro com 7 fagulhas enquanto a classe do caranguejo
      continuou vazia — a bolha ganhou sempre e ele nem se assustou.
- [x] 3.4 Verificar em paisagem 1280×720 e retrato 834×1112 que ele anda em cima
      da areia, não é cortado pelo rebordo nem tapado pelo botão de soprar, e que
      a cena continua sem uma palavra.
      → Paisagem: rect `[956,649,83,64]` com a areia a começar em 612 e sem tocar
      o botão de soprar; retrato: `[623,1037,83,64]` com a areia a começar em 945.
      `dentro_do_ecra:true` nos dois, `texto: ["🏠"]`, 14 figuras de cena, 464 nós
      de SVG, 0 `defs`/`url`/`id`/filtros. Capturas:
      `_shots/caranguejo-cena-paisagem.png` e `_shots/caranguejo-cena-retrato.png`.

## 4. Verificação da cena

- [x] 4.1 Verificar a lei das camadas depois do redesenho: com uma bolha
      sobreposta a uma ostra, o toque vai para a bolha e a ostra não reage; e que
      nenhuma figura da cena é emoji nem texto (`textoNaCena` vazio a não ser o 🏠).
      → Segurando o botão de soprar até uma bolha passar por cima da ostra da
      direita: `elementsFromPoint` no centro da bolha deu `bubble-skin, bubble-wob,
      bubble` (z-index 6 contra 3). O toque estourou-a (`estourou:true`, 7
      fagulhas) e a ostra não abriu (contador de aberturas sem crescer, `aberta`
      ausente nas duas). Texto na cena: `["🏠"]`. A mesma prova para o caranguejo
      está no item 3.3.
- [x] 4.2 Verificar que nada na cena diz palavra: zero `utterance` produzidas ao
      tocar esgotando os elementos do fundo, incluindo as ostras.
      → Tocadas as 13 figuras do fundo que lá estavam à partida (5 algas, 4
      conchas, 2 ostras, 2 cavalos), com nova tentativa quando um peixe ou uma
      bolha rouba o toque: 13/13 reagiram (24 mudanças de classe) e
      `speechSynthesis.speak` chamou **0 vezes**. O caranguejo, tocado à parte em
      três ocasiões, também não produziu nenhuma utterance. A música continuou
      nos 0,012 durante todo o percurso.
- [x] 4.3 Verificar `npm run build` sem erros de tipos e capturar duas imagens
      finais (paisagem 1280×720 e retrato 834×1112) com a música a tocar e as
      ostras abertas.
      → `tsc --noEmit && vite build` limpo (70 módulos, 716 ms), antes e depois do
      caranguejo. Imagens: `_shots/ostras-v2-paisagem.png` (as duas ostras
      abertas, pérola e brilho, música a tocar) e `_shots/ostras-v2-retrato.png`
      (ostra da direita aberta; a da esquerda tinha uma bolha em cima a ganhar o
      toque, que é a lei das camadas a funcionar).
