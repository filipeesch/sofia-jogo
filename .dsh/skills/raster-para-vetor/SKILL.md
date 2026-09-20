---
name: raster-para-vetor
description: Transformar uma imagem estática (foto, gravura, desenho, render de referência) de QUALQUER assunto — animal, objeto, veículo, planta — num asset SVG vetorial e animável, decalcando a silhueta com o descascador de contornos do projeto e montando a peça no estilo da casa (camadas planas, paleta por parâmetro, grupos animáveis por CSS). Usar quando o pedido for «copiar esta imagem», «fazer X a partir desta referência», «criar um vetor nosso a partir de um raster», ou quando uma figura desenhada à mão «não se reconhece» e precisar da forma verdadeira.
---

# Da imagem estática ao asset vetorial animável

Este documento instrói o modelo a transformar UMA IMAGEM ESTÁTICA DE QUALQUER
ASSUNTO num asset vetorial animável. Não é um ensaio sobre um caso: é o
procedimento. A regra-mãe: tu não «redesanhas à mão uma figura que não se
reconhece» — tu **decalcas a silhueta** com o descascador (`trace.mjs`, nesta
pasta) e montas a peça no estilo da casa. O decalque resolve a forma (a parte
difícil, a que o olho humano corrige mal e o rato desenha pior); o estilo da
casa resolve cor, luz e animação (a parte tua).

Ferramentas desta skill, todas dentro desta pasta:

- `trace.mjs` — descascador: lê um BMP 24 bits, binariza a tinta, preenche o
  interior, segue o contorno (Moore, regra de Jacob), simplifica (RDP) e
  suaviza (quadráticas de ponto médio), e escreve um `<path>` já na escala pedida.

## Fase 0 — direitos e matéria-prima

Vale para qualquer assunto (foto de animal, gravura de objeto, render de
veículo):

1. Preferência a **domínio público / CC0**; se for CC-BY, apontar a origem no
   comentário do asset. Imagens privadas (loja, catálogo, direito de terceiro)
   servem de *modelo* — decalcas a forma, não publicas o ficheiro.
2. Trazer e preparar com `sips` (já existe no macOS):

   ```bash
   mkdir -p _shots                       # o trabalho de laboratório fica fora do git
   curl -L -o _shots/ref.jpg "<url>"
   sips -Z 1400 _shots/ref.jpg           # ~1000–1500 px de lado maior é o ponto óptimo
   sips -s format bmp _shots/ref.jpg --out _shots/ref.bmp   # já sai 24 bits sem compressão
   ```

   O `trace.mjs` só lê **BMP 24 bits** (sem compressão) e aceita topo-para-baixo
   ou base-para-cima. Só tinta escura sobre fundo claro: se a referência for o
   contrário (linha clara sobre fundo escuro), inverte a luminância primeiro —
   `sips` não inverte; um limiar alto não resolve: passa por um filtro teu de
   luminância antes de escrever o BMP.

## Fase 1 — o descasque

```bash
node .dsh/skills/raster-para-vetor/trace.mjs _shots/ref.bmp <alturaVB> <eps> [limiar]
```

- `<alturaVB>` — altura que a figura terá nas unidades do viewBox final
  (escolhe um número redondo à volta do tamanho de exibência, ex.: 104). O
  descascador escala a figura inteira para essa altura.
- `<eps>` — tolerância do RDP, **na escala final**. Formas grandes e calmas:
  1,5–3. Peças pequenas ou isoladas: 7–9. `eps` grande de mais = polígono de 3
  pontos; a bom de mais = path de 8 KB.
- `[limiar]` — luminância abaixo da qual é tinta (128 por omissão; subir para
  160–180 se a referência for clara).

Variáveis de ambiente (é aqui que se ganha a guerra):

| env | para que serve |
|---|---|
| `CROP="x,y,l,a"` | só essa caixa conta; o resto vira «fora». O contorno corta direito onde a peça ia ligar ao corpo — que é onde o corpo a vai tapar na montagem |
| `APAGA="x,y,l,a;x,y,l,a"` | apaga caixas ANTES de tudo: corta apêndices finos (cabos, fios, antenas, caules, pelos) que fazem o caminhante fechar laços à volta deles |
| `ERODE=r` + `DILATE=r` | **sempre em par** (abrir): faz desaparecer traços mais finos do que 2r e alisa os degraus. Erosão SOZINHA deixa degraus de 1 px que partem o caminhante |
| `GLOBAL="x,y,l,a,altura"` | peças múltiplas no MESMO sistema de coordenadas (o do objeto inteiro, não do recorte). É o que permite desmontar e remontar |
| `SUBTRAI="a.json,b.json"` | tira do sólido as peças já decalcadas — a costura segue o contorno do vizinho em vez de ser um corte recto |
| `SALVA="p.json"` | grava o contorno simplificado (em px) para servir de `SUBTRAI` às peças seguintes |
| `DUMP="x.bmp"` | escreve o sólido tal como o caminhante o vê — para não afinar algoritmo às cegas |
| `Saida="f.svg"` | nome do ficheiro SVG de saída |

Três tipos de trabalho, sempre pela mesma ordem:

- **Figura inteira** — uma corrida sem `CROP`, e está feito. É o caso mais
  comum: um objeto compacto, lido de um só traço.
- **Figura em peças** — decalca primeiro a peça que fica À FRENTE na pintura,
  `SALVA` o seu contorno, e decalca as peças de trás com `SUBTRAI` dele. Todas
  as corridas partilham o `GLOBAL` idêntico, que é o espaço do objeto inteiro.
- **Figura com apêndices finos** — decide YA o que é apêndice (tudo o que é
  mais fino do que ~2 % da largura da figura costuma sê-lo): ou fica, e aceita-
  se a dureza do contorno, ou `APAGA`-se e desenha-se à mão na Fase 3. Nunca
  meio termo.

## Fase 2 — validar por visão, sem gosto próprio

Nunca confies no path; confia na folha. Monta uma HTML em `_shots/` com a
referência ao lado do decalque (`<img>` + `fetch('t-pecas.svg')`), serve a
pasta (`python3 -m http.server 8899 --directory _shots`) e fotografa com o
Chromium do sistema:

```bash
node -e "
process.env.PLAYWRIGHT_BROWSERS_PATH ||= '.pw-browsers';
const { chromium } = await import('playwright');
const b = await chromium.launch({ headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const p = await (await b.newContext({ viewport: { width: 1300, height: 800 } })).newPage();
await p.goto('http://localhost:8899/folha.html', { waitUntil: 'networkidle' });
await p.screenshot({ path: '_shots/folha.png', fullPage: true }); await b.close();"
```

E olha a imagem. Critérios, por esta ordem: **lê-se como o assunto certo?** as
proporções batem com a referência (largura:altura, onde caem os elementos
característicos — olhos, bicos, rodas, cabos, folhas, o que for)? só então: o
traço é limpo? Cada iteração é UMA mudança só e uma foto nova, com nome
sequencial (`pecas-v1.png`, `v2`…) para comparar. O critério de «se lê» é o do
público da app: um objeto que uma criança de 2–3 anos não reconhece a 60 px de
alto falhou, por mais bonito que o path esteja.

## Fase 3 — do contorno ao asset animável (estilo da casa)

O decalque dá **silhuetas**; os detalhes de cara, superfície, juntas e dobras
são desenhados à mão por cima, porque é isso que um contorno não pode saber.
Regras do estilo (o cânone é `src/apps/bubblesSprites.ts`: lê o topo do
ficheiro antes de escrever):

1. Um path decalcado = o **corpo** da figura, com `paint-order="stroke"` e
   contorno `LINHA`; a sombra-de-si-própria é o mesmo path, reduzido à escala à
   roda do centro (`translate(cx cy) scale(0.955) translate(-cx -cy)`) com a cor
   de pele — dá contorno por fora sem `<defs>` nem filtros.
2. Zero `<defs>`, zero `url(#id)`, zero gradientes: dois exemplares da mesma
   figura na mesma página partilham o id e trocam de cores.
3. Cores por parâmetro (`(cores = {}) => { const pele = cores.pele ?? … }`): o
   mesmo desenho serve N paletas.
4. Animar = **grupos com classe** à volta das peças que se movem, e no CSS
   `transform-box: fill-box` + `transform-origin` em percentagens — assim o
   pivô acompanha a figura a qualquer `--h`. Espelhar um lado: grupo pai com
   `transform="translate(W 0) scale(-1 1)"` e a ANIMAÇÃO no grupo FILHO (a
   animação no pai era destruída pela transform). As classes de animação vivem
   no CSS da app onde a figura vai entrar — define-as por figura, não à mão no
   path.
5. A anatomia da forma vale para qualquer assunto: membros com articulações
   lêem-se melhor com o joelho mais alto que a ponta e bola de articulação
   desenhada (patas, braços, pernas de objeto) — rectas finas lêem-se como
   pelos ou fios, não como membros. E escolhe a pose que mais claramente diz o
   que o assunto É: um bicho de duas patas dianteiras grandes diz-se melhor de
   frente do que de lado; um veículo diz-se melhor de perfil; um objeto
   simétrico diz-se de frente. A pose é decisão de design, não do ficheiro.
6. Figuras que se deslocam na cena viram para a ESQUERDA; `role="img"` e
   `aria-label` no `<svg>`; e o viewBox fica nas unidades decalcadas — a escala
   final faz-se pelo `--h` da app, não reescalando o path.
7. Peso: um path decalcado com eps sensato custa 1–2 KB de texto. Se passar dos
   4 KB, sobe o eps; o detalhe fino perde-se de qualquer forma a 60 px de alto
   — o que se vê de longe é a silhueta, e é exatamente essa que o decalque
   garante.

## Fase 4 — fecho

- A peça vai para o módulo de sprites da app com comentário PT a dizer o que
  foi decalcado e de onde (origem + licença) e o que foi desenhado à mão.
- Os ficheiros de laboratório (BMPs, recortes, folhas, cópias do `trace.mjs`)
  ficam em `_shots/`, que está fora do git; o único artefacto versionado é o
  path final dentro do módulo de sprites.
- Prova final na app: screenshot da cena real (`?debug=1`) nas duas orientações
  (paisagem e retrato do tablet); se a figura entra numa cena com check de fps
  próprio, corre-o — silhuetas novas não devem custar frames.

## Lições duras (não repetir os erros)

- Seguir o **traço fino** de um contorno salta de margem para margem: o
  descascador já preenche o interior primeiro e segue a figura CHEIA — se
  criares outro caminhante, faz o mesmo.
- `ERODE` sem `DILATE` = caminhante a fechar laços antecipados (medido: 219
  passos num contorno que tinha 2 300). Abre sempre o par.
- Apêndices finos e pontiagudos (antenas, fios, cabos, pelos) são o inimigo do
  caminhante: `APAGA`-os e desenha-os à mão por cima — ficam melhores e o
  contorno acalma.
- `eps` é na escala FINAL: o eps que serviu ao recorte de 200 px não serve ao
  objeto inteiro de 104; erra para baixo e sobe, nunca o contrário.
- O `bbox` de paths SVG alheios com comandos relativos não serve de régua —
  rasteriza primeiro, mede depois.
- A régua de um raster não se lê do olho num ecrão: mede extensões com código
  (perfil de tinta por linha/coluna, como faz o `DUMP`) e desenha pelo número.
