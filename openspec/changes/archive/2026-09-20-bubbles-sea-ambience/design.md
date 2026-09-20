# Design

## Context

Ver `proposal.md` — Why. O que importa aqui é o terreno que já existe:

- Todo o som do jogo é **sintetizado** (`src/ui/sfx.ts`), sem ficheiros. Há um
  único `AudioContext` partilhado, obtido por `audioCtx()`, que sabe adormecer:
  `idleSfx()` suspende-o quando se vai para o launcher e `main.ts` chama-o no
  `clearAll()`. Sair das bolhas já suspende o áudio; o que falta é uma música
  que obedeça a esse contexto e não a um seu.
- Os estouros tocam numa escala de cinco notas (Dó Ré Mi Sol Lá, três oitavas),
  `PENTA` em `sfx.ts`. Qualquer nota fora dela vai desafinar com um estouro.
- O `AudioManager` dos jogos 3D já usa o padrão *lookahead*: um `setInterval` a
  agendar notas à frente de `ctx.currentTime`. É esse padrão que se replica, em
  vez de se inventar outro.
- A cena é DOM+CSS: figuras `position: absolute` com `z-index: 3`, `pointer-events`
  só no `<span>` interior com uma caixa `::before` de ~90 px, e uma única lei —
  as bolhas (z 6) ganham sempre o toque. Qualquer figura nova tem de entrar
  exactamente nesta forma.
- O autopolice do Safari/iOS não deixa ouvir nada antes de um gesto: o `resume()`
  já é chamado por todos os toques do app, pelo que a música pode ser ligada no
  `mount` e simplesmente só se ouvirá a partir do primeiro toque.

## Goals / Non-Goals

**Goals:**

- Um fundo contínuo, sem emenda audível e sem repetir um ciclo de 4 s, que se
  ouça como «mar» e não como «sintetizador».
- Que a música nunca suba acima de um estouro nem tape o som de uma acção da
  criança.
- Ostras cuja valva de cima se mexe *por dentro do desenho* — não uma figura a
  trocar por outra.
- Que tudo o que a cena faz por si (respirar, respiração da música) seja
  silencioso, para o som continuar a ser prova de que a criança foi a autora.

**Non-Goals:**

- Não há ficheiros de música, nem `public/sounds/`, nem mp3/ogg.
- Não há botão de mudo na cena: o mudo do jogo 3D é do `AudioManager`, e o das
  bolhas é sair para o launcher.
- Não se mexe na paleta nem às outras figuras; a excepção é a concha em espiral,
  pedida pela referência.
- Não se cria estado de jogo algum com a pérola.

## Decisions

### 1. Música no contexto partilhado, com barramento próprio

A música vive em `src/ui/seaAmbience.ts` e liga-se ao `audioCtx()` de `sfx.ts`
por um `GainNode` próprio (o *barramento*), que é o único ponto de volume e de
fade. Alternativa considerada: um `AudioContext` exclusivo — rejeitada, porque
são dois caminhos de hardware, o nosso sobreviveria ao `idleSfx()` e ficava
música no launcher. Com barramento próprio, calar a música é uma rampa de gain
de 0,35 s e `disconnect()`; não é preciso tocar em mais nada do áudio.

### 2. Três camadas sintetizadas, todas muito calmas

1. **Ondulação distante** — ruído castanho gravado uma vez num buffer de 3 s e
   posto em *loop*, passado por um passa-baixas que sobe e desce lentamente
   (LFO de ~0,07 Hz no `frequency`) e por um ganho que respira noutro LFO. É
   uma fonte, um filtro e dois ganhos para o fundo todo: custa quase nada e não
   há duas ondas iguais.
2. **Acorde que respira** — três osciladores senoidais em uníssono/oitava com um
   detune de ±4 cents, com os picos de ganho acesa e apagada à mão a cada
   ~18 s. Os acordes são **subconjuntos das cinco notas da escala dos estouros**
   (Dó-Sol-Mi, Lá-Dó-Mi, Sol-Dó-Mi): nenhuma combinação pode formar semitom com
   um estouro. Alternativa considerada: progressão com Fá e Si — rejeitada, o Fá
   contra o Mi dos estouros é exactamente o semitom que faz doer.
3. **Nota de caixinha** — de quando em quando (8-16 s, sorteado), uma nota da
   escala duas oitavas acima das bolhas, com ataque lentinho e cauda de 1,6 s.
   Duas oitavas acima é a região onde nenhum estouro anda (os estouros vão das
   graves às médias), por isso as duas coisas nunca se atropelam.

### 3. Uma só agenda, com lookahead

Um `setInterval` de 250 ms, com lookahead de 1,2 s, decide o que calha tocar.
Nada de `setInterval` por nota: é o que faz a música picar num tablet com o
*timer* a atrasar-se, porque cada nota ficava agendada atrás do atraso das
outras. Como tudo é agendado em relação a `ctx.currentTime`, a suspensão do
contexto por `idleSfx()` congela a música exactamente onde estava — ao retomar,
continua, sem salto nem sobreposição. Parar = `clearInterval` + rampa do
barramento + `stop()` da fonte em loop (uma `BufferSource` em loop **não** tem
fim, por isso há de a parar à mão) + `disconnect()`.

### 4. Volume: a música é sete a dez vezes mais baixa que um estouro

Barramento a 0,16; pico de cada nota 0,05; ondulação 0,05; acorde 0,045 por
oscilador. Nada de `DynamicsCompressor` nem de filtros com Q alto: um compressor
num contexto partilhado levanta o piso de tudo o resto, e Q alto em agudos soa a
assobio estridente a volume de tablet. Nada abaixo de ~110 Hz com ataque rápido.

### 5. Ostra: um SVG com dois grupos e a valva a rodar por CSS

O sprite devolve **um** `<svg>` com `<g class="ostra-corpo">` (valva de baixo,
leito, pérola) e `<g class="ostra-valva">` (a de cima). Abrir é `transform:
rotate(-42deg)` com `transform-origin` na charneira, aplicado por uma classe no
`<span>` da figura, com `transition` de ~420 ms. Alternativas rejeitadas: dois
SVGs empilhados (a emenda e as duas sombras entregavam o truque) e SMIL/`animate`
(Safari antigo e nenhum controlo fino do estado). A transição é só uma rotação —
não há `filter` nem `scale` em cadeia, que são o que custa num tablet.

O `drop-shadow` fica no **contentor** `.bubbles-ostra`, que não anima, e não no
`<span>` que roda: um `filter` sobre uma subárvore que está a animar re-rasteriza
essa subárvore a cada frame.

### 6. Respiração ambiente: agendada por ostra, silenciosa e limpa

Cada ostra tem o seu `setTimeout` encadeado (8-14 s com sorteio), que abre,
espera ~1,8 s e fecha. Os ids vão para a lista de timeouts do app, a mesma que o
`destroy()` limpa, e o encadeamento pára em `visibilitychange` para não acordar
a página nem encher de bolhinhas um ecrã que ninguém vê. É o mesmo mecanismo do
spawner das bolhas, não um sistema novo.

### 7. A bolha oferecida é uma bolha normal

O toque na ostra chama `spawn('pequena', boca)` — a mesma função do botão de
soprar. Assim a bolha entra no `live`, obedece ao `MAX_NO_ECRÃ` e é estourável,
sem haver uma segunda classe de bolhas para manter. Junta-se um limite mais
apertado (só com `live.size <= 4`) para a prenda não vir num ecrã já cheio. A
respiração ambiente **não** oferece bolha: só as bolhinhas decorativas de sempre
em `fx`, a camada sem `pointer-events`.

### 8. Onde vivem as ostras

Duas, na areia: uma a 64 % com 76 px (o vão livre mais largo entre a alga de 55
% e a concha de 72 %) e outra a 33 % com 60 px. Ficam em z-index 3, inseridas
**antes** dos peixes no DOM, e longe do canto de soprar. A caixa de toque é a
das conchas (92×86): mais larga que alta, porque a ostra é um leque deitado.

### 9. Concha em espiral redesenhada dentro do mesmo viewBox

Mantém-se o `viewBox="0 0 96 74"` para não se mexer no layout, nas caixas de
toque nem nas sombras. O que muda é a leitura: corpo em volta que afina para
trás em três degraus, riscas perpendicularmente atravessadas sobre a volta
(calculadas, não desenhadas à mão), e uma abertura grande escura virada para a
frente-esquerda — que é o que a referência mostra e o que diz «concha» a um
bicho de dois anos.

### 10. O caranguejo anda com o `swim` dos peixes, mas a pé

O atravessar o ecrã não é um segundo mecanismo: é o mesmo `@keyframes swim`
(direita → esquerda, 112vw → -20vw) com `--passeio: 46s` em vez dos 17-31 s dos
peixes. Uma travessia nova por bicho seria uma lei nova para afinar, e o `swim`
já prova há meses que atravessa bem qualquer largura de tablet.

O que o distingue é tudo o que vem DENTRO do desenho e no `span`:

- `@keyframes cangAnda` ginga o `span` ±1,8° a cada 0,66 s, que é o balanço de
  quem tem oito patas;
- as patas são dois grupos SVG (`.cang-pernas-e`, `.cang-pernas-d`) com o MESMO
  `@keyframes cangPata`, um em `alternate` e o outro em `alternate-reverse` — a
  alternância é o que faz dele um bicho a andar, e com `transform-box: fill-box`
  o pivô acompanha qualquer `--h`;
- o lado de trás é o mesmo desenho com `transform="translate(120 0) scale(-1 1)"`
  no grupo pai, e a animação vai num grupo FILHO: CSS `transform` substitui o
  atributo `transform`, por isso espelhar no pai e animar no filho é o que
  impede o espelho de ser comido pela animação;
- `sustou` (a classe de reacção, dada por `tocaCenario` e limpa pelo seu
  `animationend`) troca o gingado por `cangSusto`, encolhe `animation-duration`
  das patas para 0,16 s e levanta `.cang-bracos` — um susto que se vê todo sem
  uma linha de JS a mais.

**Camada:** z-index 3, entra no DOM depois das conchas/ostras e ANTES dos peixes.
Assim pinta por cima das algas, mas continua a perder o toque para uma bolha
(z 6) e para um peixe que se atravesse. A sombra `drop-shadow` vai no contentor,
que só faz uma translação e é composto como tal; no `span`, que ginga a cada
0,66 s, seria um filtro repintado 60 vezes por segundo.

**Um só exemplar, de propósito:** os outros bichos do fundo estão em quatro e
cinco porque são paisagem; o que anda já é personagem, e dois a passear passava
de um caranguejo a uma fila.

**Som:** `pinca()` em `sfx.ts` — dois estalidos curtos (760/540 Hz) e um E6→G6 a
0,03. Pico 0,075, um terço de um estouro. Nada dito, nada pontuado.

## Risks / Trade-offs

- **Ruído acumulado no contexto partilhado** → cada nota liga-se ao barramento,
  pára com `stop()` e é recolhida; no `stop()` geral desligam-se LFOs, osciladores
  e o barramento. Medir com `ctx` nodes antes/depois de entrar e sair dez vezes.
- **`BufferSource` em loop que nunca acaba** → parada explícita com rampa de gain
  primeiro e `stop()` depois, para não se ouvir o clique de corte.
- **Música a cobrir o brinquedo** → medir em jogo: ganho do barramento é
  0,16 e o pico de uma nota é 0,05, contra 0,26 do «plop» de um estouro. Se ao
  ouvido a mistura ainda parecer apertada, desce-se o barramento e nada mais.
- **Gesto de abrir a ostra caro num tablet velho** → só uma rotação com
  `transition`, sombra no contentor parado; verificar `fps` com duas ostras e a
  respiração ligada.
- **Autoplay bloqueado** → a música liga-se no `mount` mas só se ouve depois do
  primeiro gesto; é o comportamento de todo o som do jogo e não se contorna.
- **Oferenda de bolha a parecer «cai do céu»** → a bolha nasce da boca da ostra,
  visivelmente, e a ostra só a oferece a quem a tocou: a respiração por si não
  cria bolha estourável.
- **Gingado + filtro a 60 fps** → a sombra vai no contentor (translação composta)
  e o gingado no `span`; um só caranguejo na cena. Medido: sem o filtro do `span`,
  e as patas são dois `rotate` num grupo cada uma.
- **Caixas de toque sobrepostas no ecrã em pé** → já acontece hoje entre algas e
  conchas; as ostras vão para os vãos maiores e, onde se sobrepõem, ganha a que
  entra depois no DOM — a ostra, que é a figura nova e tem de ser descoberta.
