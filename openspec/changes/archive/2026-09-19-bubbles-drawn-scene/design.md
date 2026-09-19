# Design

## Decisões

### 1. Um ficheiro só para toda a arte: `src/apps/bubblesSprites.ts`

Todas as figuras num único módulo, lado a lado. O traço só se pode comparar
quando se vê junto, e uma alteração de linguagem (mais sombra, contornos mais
grossos) passa a ser uma edição num sítio. O `BubblesApp` fica com um import e
os dados de cena (`ALGAS`, `CONCHAS`, `CAVALOS`) só dizem *onde* cada desenho
vive.

### 2. Os desenhos são texto com uma paleta por instância, não ficheiros

Cada sprite é uma `const` que devolve um `<svg>` e recebe uma paleta
(`{ pele, barriga, barbatana }`, `{ folha, clara, talo }`, ...) com valores de
recurso. O mesmo desenho serve duas instâncias de cores diferentes sem duplicar
arte e sem JS por instância — a instância só passa cores e tamanho. Sem
ficheiros `.svg` em `public/`: nada para carregar, nada para falhar, e o app
continua a funcionar offline sem um pedido extra.

A cor passa por argumento de função e não por `var(--pele)`: nenhuma figura
muda de cor em runtime, e o mecanismo de partilha de cor dentro do SVG — um
`<linearGradient>` num `<defs>` com `id` — é precisamente o que duas instâncias
do mesmo desenho não podem ter, porque dividem o `id` e a segunda herda as cores
da primeira.

### 3. Detalhe a troco de camadas, nunca de filtros

Profundidade vem de **camadas planas sobrepostas**, fixas por figura: corpo com
contorno → faixa mais escura no lado de baixo → faixa clara no lombo com
opacidade → textura (escamas, nervuras, raios das barbatanas) a traço fino e
opacidade baixa → olho com branco + pupila + um ponto de brilho. O contorno é o
mesmo traço passado duas vezes (largo na cor da linha, fino na cor da pele) ou
`paint-order="stroke"`, para a linha contornar por fora sem comer píxeis ao
desenho.

Deliberadamente **sem `filter`/`<feGaussianBlur>` dentro do SVG**: num tablet
fraco, blur por sub-caminho paga-se em cada frame de cada peixe. O único filtro
é o `drop-shadow()` que já existe no contentor CSS — um por figura, como hoje.
E, pelo mesmo motivo do ponto anterior, **sem gradientes**: exigiriam `id`s
partilhados.

### 4. Escala por `--h` em píxeis, `viewBox` alto

Cada figura usa um `viewBox` próprio com ~100 unidades de altura de personagem
e `height: var(--h)`, `width: auto` no CSS — `--h` quer mesmo dizer altura, que
é a dimensão que as tabelas de cenário declaram (`h:`), e os desenhos têm
larguras diferentes entre si. A dimensão passa a ser medida em píxeis reais da
figura, não em `font-size` dum glifo — que era o que fazia os peixes mudarem de
tamanho conforme a fonte do sistema.

### 5. Todos virados para a esquerda

O `swim` leva tudo da direita para a esquerda. Desenhar virado para a esquerda
evita `scaleX(-1)` e evita a figura mais estranha do mundo: um peixe a nadar de
costas.

### 6. As caixas de toque ficam, e não vêm do desenho

Os SVG têm zonas finas (barbatanas, cauda, talos de alga). A caixa de toque
continua a ser o pseudo-elemento `::before` com ~90 px, centrado na figura — a
regra do projeto é que um alvo se mede pelo dedo de quem tem 2-3 anos, não pelo
desenho. Um desenho bonito não é um alvo.

### 7. O confetti sai, o som de vitória fica

`celebrate()` perde o laço que criava os `span.bubbles-confetti` e a regra CSS
correspondente; mantém `win()` e o `later(() => startWave(), 1600)`. O motivo
não é gosto apenas: um adorno que cai do topo sem que a criança o tenha
provocado é a única coisa no app que acontece *à* criança, num brinquedo cuja
lei é que ela é sempre a autora. O marco de fim de vaga passa a ser sonoro, e o
espetáculo visual continua a ser o fogo de artifício das gigantes.

### 8. Anima-se o contentor, não as partes

Cada figura continua a animar como animava: o contentor atravessa o ecrã, o
`span` interior faz o bob/abanão/reacção. As partes internas do SVG não têm
animação própria — detalhe visual, não marioneta. Manter isto é o que deixa o
custo de animação igual ao de hoje, com N figuras.

## Riscos

- **Nós DOM por figura.** Um desenho detalhado são 12 a 30 elementos SVG por
  instância; com 14 figuras fixas são algumas centenas de nós estáticos. Medido
  no fim (objetivo: nada de animação por sub-caminho, e a cena a abrir sem
  quebra visível). Se pesar, o corte é na textura, não nas figuras.
- **Traço incoerente entre figuras** — o risco exacto de desenhar oito bichos
  de uma vez. Mitigado por uma só paleta de sombra/brilho partilhada e por
  revisão por captura de ecrã nas duas razões de aspecto.
- **Concha e alga demasiado parecidas com ruído de fundo** a cores quentes na
  areia clara. Mitigado pela sombra projectada de cada figura, como já acontece.
- Fica por decisão explícita o **botão de regresso (🏠)** continuar emoji: é a
  mesma classe de todos os apps e tem spec própria (`game-hud`).
