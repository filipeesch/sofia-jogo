# Voz em português (pt-PT)

Os quebra-cabeças (animais, transportes, frutas, números, letras) e a pintura
dizem o nome das coisas em voz alta. Há duas formas de isso acontecer, por ordem
de preferência:

1. **Gravações** em `public/voice/*.mp3` (opcional, ver §4) — se existirem, mandam.
2. **`speechSynthesis`** do navegador em `pt-PT` (`src/ui/speech.ts`) — o que está
   sempre disponível, mas depende das vozes que o dispositivo tem instaladas.

## 1. Nomes das letras

`src/apps/puzzleLetters.ts` usa os nomes oficiais do Acordo Ortográfico de 1990
(Base I, 1.º), tal como publicados pela Academia das Ciências de Lisboa:
<https://vocabulario.acad-ciencias.pt/index.php/ortografia/texto-integral-do-ao90>.

| Letra | Nome | | Letra | Nome |
|---|---|---|---|---|
| A | á | | N | ene |
| B | bê | | O | ó |
| C | cê | | P | pê |
| D | dê | | Q | quê |
| E | é | | R | erre |
| F | efe | | S | esse |
| G | gê (ou guê) | | T | tê |
| H | agá | | U | u |
| I | i | | V | vê |
| J | jota | | W | dáblio |
| K | capa (ou cá) | | X | xis |
| L | ele | | Y | ípsilon |
| M | eme | | Z | zê |

Três detalhes que parecem birrinha e não são:

- **os acentos fazem o som**. Sem eles uma voz pt-PT lê `e` e `o` como /ɨ/ e /u/
  (quase mudos) e lê `aga` como o verbo *agar*. `á`, `é`, `ó`, `agá`, `quê` e os
  circunflexos em `bê/cê/dê/gê/pê/tê/vê/zê` são o que faz a voz dizer o nome.
- **nunca se dá a letra sozinha à voz**. Um `F` isolado lê-se /f/ (o som), não
  «efe». Por isso o `name` de cada peça é a *palavra*; o glifo grande no ecrã é o
  campo `emoji`. É o campo `spoken` que pode por override quando se quer mostrar
  uma coisa e dizer outra (é o que o ⛵ «Veleiro» faz, dizendo «barco»).
- **o K é `capa`, não `cá`**. O Acordo escreve «capa ou cá» — por esta ordem — e
  é o primeiro que se diz na escola: `capa` grafa-se com `c`, mas lê-se *ka-pa*,
  e assim uma criança nunca vê um `k` dentro do nome da letra K. `Cá`, a segunda
  variante, uma voz pt-PT lê /ka/ — que é o som da letra, não o nome.

Formas que **não** usamos, e porquê: `éfe` (não existe nos dicionários pt — o
nome é `efe`; `fê` é variante registada), `há` (é o verbo haver; a letra é `agá`),
`él`/`el`, `em`, `en` (são `ele`, `eme`, `ene`), `Qué` (leva circunflexo: `quê`),
`dábliu` (brasileiro; em Portugal é `dáblio`/`dâblio`), `gé` (escreve-se `gê`) e —
para o K — `cá`, que o Acordo admite como segunda variante mas uma voz lê /ka/,
o som da letra, e numa frase qualquer já é o advérbio.


## 2. Porque é que no iOS não se ouvia nada

O iOS não devolve erro quando não fala — simplesmente emudece. As causas, todas
deliberadamente contornadas em `src/ui/speech.ts`:

| Causa | O que o código faz |
|---|---|
| O WebKit **deita fora** o primeiro `speak()` da página se não houver gesto,
e não dispara evento nenhum; um só `speak()` aceites durante um gesto liberta o
documento todo | `primeOnGesture()` gasta o primeiro toque do Launcher num
`speak()` silencioso (volume 0) |
| `getVoices()` chega vazio no arranque; o evento `voiceschanged` só existe em
Safari ≥ 16 | `initSpeech()` escuta o evento **e** faz polling 4 s; falar nunca
espera por uma voz |
| `end` (e por vezes `start`) dispara quando quer; `cancel()` dispara um erro
`canceled` falso | `finish()` idempotente + dois watchdogs + referência forte à
utterance (se for recolhida pelo GC, o `end` nunca chega) |
| falar no mesmo *tick* a seguir a `cancel()` é uma corrida | no iOS espera 125 ms
(o valor que a equipa do PhET mediu em produção) |
| texto com `<`, aspas ou marcação entope o motor no iOS 17/26 | `sanitize()` tira
essas personagens |
| **não** usar: os hacks de `pause()`/`resume()` de 1 s são só para o Chromium de
mesa e partem o som noutros lados | não existem aqui |

## 3. Checklist quando «não tem voz» num iPad/iPhone

Isto é o que fica fora do alcance de uma página web — vale a pena verificar antes
de procurar um bug:

1. **Volume e modo silencioso.** O interruptor silencioso do iPhone e o botão de
   mudo no Centro de Controlo do iPad calam a voz **e** os efeitos — uma página web
   não consegue ler esse estado. Depois de duas tentativas mudas, o jogo mostra um
   aviso uma única vez por sessão.
2. **Voz em português instalada?** Ajustes → Acessibilidade → Conteúdo Falado →
   Vozes → Adicionar voz → Português (Portugal). Sem ela, o iOS usa a voz do
   sistema (que lê «efe» em inglês) ou não fala. Nota: há vozes que o iOS nem
   mostra no `getVoices()` (bugs WebKit 250665 / 290497).
3. **App instalada (Add to Home Screen)** arranca sem qualquer gesto: a primeira
   coisa que a criança tocar é o que desbloqueia o som.

## 4. Gravações próprias (recomendado para as letras e os números)

O vocabulário é fixo e pequenino, por isso uns mp3 resolvem de vez o que o
`speechSynthesis` não garante: voz igual em todos os aparelhos, português
europeu verdadeiro, funciona offline e num iPad sem qualquer voz instalada.

    node scripts/gen-voice-manifest.mjs   # regenera a lista de palavras
    cp public/voice/manifest.example.json public/voice/manifest.json
    # e colocar os mp3 em public/voice/  (um por palavra: efe.mp3, aga.mp3, ...)

- Uma palavra = um ficheiro, partilhado por todos os jogos (`gato.mp3` serve para
  o quebra-cabeça e para a pintura).
- As chaves do manifest são a palavra **falada**, sem acentos e em minúsculas
  (`dablio`, `ipsilon`, `cao`); o nome do ficheiro é a chave.
- Sem `public/voice/manifest.json` não é pedido nenhum ficheiro — o jogo fala
  pelo navegador como sempre.
- 101 palavras, todas curtas. Dá para gravar com a família (uma criança de 2 anos
  gosta muito mais de ouvir a voz da casa) ou gerar com um TTS neural pt-PT
  (Azure `RaquelNeural`/`DuarteNeural`, Amazon Polly pt-PT, ElevenLabs).
- Para funcionar offline é preciso acrescentar `voice/**` ao cache do service
  worker (`public/sw.js`).
