# Proposal

## Why

O fundo das Bolhas ganhou vida figura a figura — algas, conchas, ostras,
cavalos-marinhos, um caranguejo — mas o mar ainda não tem o seu gigante. Uma
baleia a passar lentamente pelo topo do ecrã, com bolhas a sair-lhe do lombo e
a boca a abrir e fechar, é o bicho que uma criança de 2-3 anos reconhece ao
primeiro traço e o pretexto para estrear a técnica de decalque genérica
(skill `raster-para-vetor`) numa referência de banco de imagem, usando só a
forma como modelo.

## What Changes

- Nova figura de cenário: **uma baleia** desenhada no estilo da casa, com
  silhueta, boca aberta e barbatana ventral decalcadas por contorno de uma
  ilustração de banco de imagem gratuito (forma apenas; nada do ficheiro
  original é publicado), e barriga pregueada, olho e brilhinhos desenhados à
  mão.
- Animação contínua por CSS, só `transform`/`opacity`: sopro de três bolhas
  por cima do lombo em ciclo, e boca que fecha e reabre em torno da maxila de
  cima (`.baleia-boca` com `transform-box: fill-box`).
- Baleia tocável como o resto do fundo: ao dedo dá uma cavalgada, escancara a
  boca, deita ar da boca e solta um glup-glup (o som `glup` que já existe);
  sem palavra, sem pontos, sem bolha fora do que a criança pediu.
- Uma só baleia, atravessando o topo do ecrã a 75 s, entrada faseada com
  atraso negativo para o jogo não começar parado.
- Contas de cenário do check de fps alargadas com `.bubbles-baleia`
  (18 figuras, ~470 nós de svg, 40-43 animações); docs de performance
  actualizados.
- Correcção colateral do check de saída: `tapAll` passa a disparar também
  `click`, porque o launcher rolável (c682905) mudou os cartões para `click` e
  o passo do editor ficou cego.

## Capabilities

### New Capabilities

(nenhuma)

### Modified Capabilities

- `bubbles-toy`: nova requisito — «Uma baleia passa pelo topo com sopro e boca»
  (figura, animações, comportamento ao toque, camada e prioridade de toque).

## Impact

- `src/apps/bubblesSprites.ts`: novo export `BALEIA(cores)` + caminhos
  decalcados `BALEIA_CORPO/BALEIA_BOCA/BALEIA_VENTRAL`.
- `src/apps/BubblesApp.ts`: constante `BALEIAS`, método `baleias()`, entrada
  na linha de montagem do cenário (antes dos peixes).
- `src/style.css`: bloco `.bubbles-baleia` com keyframes `baleiaBob`,
  `baleiaSalto`, `baleiaBoca`, `baleiaSopro`; svg partilhado de figuras.
- `scripts/check-bubbles-fps.mjs`: seletores e contagem de baleias.
- `scripts/check-exit-cleanup.mjs`: `tapAll` dispara `pointerdown` + `click`.
- `docs/performance.md`: contagens actualizadas.
- Nenhum ficheiro de áudio novo; música intacta (5 fontes).
