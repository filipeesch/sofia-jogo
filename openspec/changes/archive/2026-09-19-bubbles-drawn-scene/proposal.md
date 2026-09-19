# Proposal

## Why

O fundo das bolhas foi montado com emoji da Apple ao lado dum cavalo-marinho desenhado à mão: duas linguagens visuais no mesmo ecrã, uma delas que nós não controlamos (muda de sistema para sistema e não pode animar-se por dentro). E no fim de cada vaga caem do topo ícones de emoji — a criança não os provoca, não os toca, e desaparecem; a revisão da dona do jogo não gostou deles.

## What Changes

- Todos os seres e plantas do fundo passam a **desenhos próprios com o mesmo traço**: três peixes, cinco algas, quatro conchas e dois cavalos-marinhos. Nenhum emoji permanece na cena.
- Os desenhos ganham **detalhe** — corpo com sombra e barriga mais clara, barbatanas com raios, escamas, olho com brilho, arestas onduladas — e podem animar-se por dentro, coisa que um emoji não permite.
- O cavalo-marinho, que já era desenhado, é redesenhado com esse mesmo nível de detalhe.
- O comando de soprar passa a desenho, para não ficar um emoji solto no canto duma cena desenhada.
- **Removido:** os ícones de emoji que caíam do topo no fim de cada vaga. A celebração passa a ser o som de vitória seguido da vaga nova — o fogo de artifício das gigantes já é o espetáculo da cena, e um adorno que cai sem que a criança o provoque é a única coisa neste app que acontece *à* criança.
- A reacção do fundo ao toque (alga que abana, concha que se fecha, cavalo-marinho que salta) e a garantia de que o cenário nunca rouba um toque a uma bolha passam a estar **escritas na spec** — já estavam implementadas e verificadas, mas só no código.

Sem alterações de API nem de dados; nada de quebrado para quem usa.

## Capabilities

### New Capabilities

_nenhuma_

### Modified Capabilities

- `bubbles-toy`: a cena deixa de ser feita de emoji e passa a ser desenhada num único traço com reacção ao toque; a celebração do fim de vaga deixa de atirar ícones do topo.

## Impact

- `src/apps/BubblesApp.ts` — sprite de cada elemento, remove o confetti de `celebrate()`.
- `src/apps/bubblesSprites.ts` — **novo**: os desenhos, todos num só sítio para se poder comparar o traço.
- `src/style.css` — dimensionamento por SVG em vez de `font-size`, regras do confetti removidas.
- `openspec/specs/bubbles-toy/spec.md` — dois requisitos modificados.
- Sem novas dependências: Continua a ser DOM+CSS, sem canvas nem ficheiros de imagem.
- Não toca no botão de regresso nem em nenhum outro app.
