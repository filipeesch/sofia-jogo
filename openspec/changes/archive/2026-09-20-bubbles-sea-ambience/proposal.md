# Proposal

## Why

O fundo das bolhas já responde a quem o toca, mas o mar continua mudo: entre um
estouro e outro não há nada, e um brinquedo de água sem água a soar parece uma
fotografia. Falta também na areia uma criatura que faça a criança esperar — as
conchas abanam e fecham-se, mas nada na cena se abre devagarinho por si, e nada
lhe dá uma prenda sem ela a ter pedido.

## What Changes

- Nova **música de fundo do mar** no app das bolhas: um fundo contínuo e muito
  baixinho, sintetizado no próprio browser (sem ficheiros de áudio), com o
  balanço de uma ondulação distante, um acorde grave que respira e uma nota de
  caixinha de música de vez em quando. Entra com o app, adormece com ele.
- Nova figura na areia: a **ostra**, com uma **pérola** dentro. Abre e fecha
  sozinha, devagar, e deita bolhinhas quando abre; tocada, abre-se por completo,
  faz ouvir-se o seu som e larga uma bolha a sério, que a criança pode estourar.
- Nova figura na areia, esta a andar: o **caranguejo**. Atravessa o fundo de um
  lado ao outro ao ritmo de quem vai a pé, com as patas a alternar e as tenazes
  levantadas; tocado, assusta-se — levanta as tenazes, acelera as patas e dá um
  passinho para o lado oposto ao dedo, com dois estalidos de tenaz.
- A **concha em espiral** é revista pela referência dada: volta em espiral com
  riscas a atravessá-la, abertura larga escura virada para a frente e bico a
  afinar para trás — o desenho actual lê-se como uma batata riscada.
- Sem novas palavras, sem pontuação, sem nada a cair do topo: a lei do brinquedo
  não muda. A ostra não fala, não marca acertos e continua por baixo das bolhas.

## Capabilities

### New Capabilities
- `sea-ambience`: a música de fundo do mar do app das bolhas — o que se ouve, a
  que volume, quando entra, quando adormece e o que nunca pode fazer.

### Modified Capabilities
- `bubbles-toy`: a cena passa a ter ostras com pérola na areia, com respiração
  própria, reacção ao toque e bolhas que saem delas; um caranguejo que passeia a
  pé pela areia e se assusta quando o tocam; a concha em espiral passa a ter
  volta e riscas de espiral a sério.

## Impact

- `src/ui/seaAmbience.ts` (novo) — a composição procedural, no AudioContext
  partilhado de `src/ui/sfx.ts`.
- `src/ui/sfx.ts` — o som da ostra (abrir e fechar da valva + brilho da pérola).
- `src/apps/BubblesApp.ts` — ostras e caranguejo na cena (tabelas de posição e
  paleta, respiração ambiente, bolha oferecida), ciclo de vida da música no
  `mount` / `destroy` / `visibilitychange`.
- `src/apps/bubblesSprites.ts` — novos `OSTRA` e `CARANGUEJO`, e `CONCHA_ESPIRAL`
  revista.
- `src/ui/sfx.ts` — `pinca()`, os dois estalidos de tenaz do caranguejo.
- `src/style.css` — `.bubbles-ostra` (camada 3, caixa de toque, transição da
  valva) e `.bubbles-caranguejo` (camada 3, caixa de toque, gingado, patas em
  dois grupos a alternar e reacção de susto).
- Nenhuma dependência nova, nenhum ficheiro novo em `public/`.
