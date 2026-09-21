# Design

## Como a forma chegou aqui (skill `raster-para-vetor`)

A referência (ilustração flat de banco de imagem, 740×740) foi convertida para
BMP 24 bits (`sips -s format bmp`) e descascada pelo traçador do projeto
(`.dsh/skills/raster-para-vetor/trace.mjs`): tinta = contorno azul-escuro →
inundação do exterior → sólido = tinta ∪ interior → contorno de Moore → RDP →
suavização por quadráticas. Com `GLOBAL="91,178,584,394,104"` o corpo inteiro
saiu num único contorno fechado (77 pontos) — a boca aberta e a barbatana
peitoral, sendo formas fechadas por dentro, foram recortadas com `CROP` e
traçadas à parte. Nenhum `SUBTRAI` foi preciso: a figura é compacta.

Crédito: a ilustração é usada só como MODELO de forma; o repositório publica
apenas os nossos caminhos decalcados, e o crédito vai no comentário de
`BALEIA` em `bubblesSprites.ts`.

## Camadas no estilo da casa

1. sopro (atrás do corpo, para as bolhas nascerem de trás do lombo);
2. corpo com contorno (`paint-order="stroke"`) + o mesmo caminho a 0,962 sem
   traço — o anel de fora é a tinta do decalque, o de dentro é a pele;
3. barriga clara pregueada e raios finos, desenhados à mão;
4. barbatana ventral (decalque, azul-escuro) e peitoral (mão);
5. boca em grupo próprio com língua;
6. olho (`olho()`), furinho, realces de luz.

O viewBox `"-3 -20 160.1 127"` abre 20 unidades de céu por cima do lombo: é a
folga onde o sopro cresce, medida pelo mesmo `--h` — o corpo visível fica um
pouco menor que `--h` e o sopro tem onde ser visto.

## Animação sem main thread

Tudo `transform`/`opacity`:

- `.baleia-sopro circle` — `baleiaSopro` 4,5 s, três círculos com atrasos
  escalonados (+1,5 s, +3 s) sobre o `--atraso` comum;
- `.baleia-boca` — `baleiaBoca` 5,4 s em `scaleY` com origem na margem de cima
  da maxila (`transform-box: fill-box`), que é como uma boca fecha: a de baixo
  sobe até à de cima;
- body — `baleiaBob` (gingado) + `swim` dos peixes a 75 s; toque: `baleiaSalto`
  + boca `scaleY(1.4)` + sopro a 1,3 s.

## Toque só no corpo

A caixa do svg (160×127 unidades → ~189×150 px) comeria bolhas e peixes a
passar por cima. O `<span>` leva `pointer-events: none` e um `::before` de
68 %×58 % centrado no corpo leva o alvo — a mesma lei do projeto: um alvo mede
pelo corpo do bicho, não pela moldura do desenho.

## Som e ar

Sem ficheiro novo: `glup` (as três bolhas abafadas do peixe) + o ar do
`tocaCenario` a sair de `topo 0.75`, da boca. A música não foi tocada.

## Correcção do check de saída

O launcher rolável (c682905) passou os cartões de `pointerdown` para `click`;
o `tapAll` do check só disparava `pointerdown` e ficou cego para o editor —
falha existente no main, sem relação com a baleia. `tapAll` passa a disparar
`pointerdown` E `click` no mesmo tick: os `.home-card` ouvem o primeiro, o
launcher o segundo, e a corrida de dois toques continua a ser apanhada.
