# Proposal

## Why

O app **Bolhas** estava morto para a criança. As bolhas continuavam a ser criadas — 21 delas no DOM ao fim de poucos segundos — mas nasciam a `bottom: -80 px` com `animation: floatUp ...` e **não existia nenhuma `@keyframes floatUp`** no `src/style.css`: o bloco foi apagado sem querer no commit `200fd69` ("fix(puzzle): os quebra-cabeças ocupam o ecrã todo"), que reescreveu precisamente aquela zona da folha de estilos. Resultado medido num browser real: as bolhas ficavam todas paradas entre `y = 718` e `y = 760` com um viewport de 720 px, ou seja, invisíveis fora do ecrã, e o que a Sofia via era um céu azul vazio com uma "espuma" presa ao rebordo de baixo — nada para tocar.

Como nada era removido (não havia `animationend` nem teto), era também uma fuga de ~2,4 nós de DOM por segundo enquanto o app está aberto.

Repor a animação deixaria um app pobre para uma criança de 3 anos: um fundo liso, alvos pequenos e um único som. Este change transforma-o num brinquedo de causa-e-efeito — musical, com cor, com um clímax dentro — sem introduzir pontuação, tempo ou qualquer maneira de errar.

**Este change já foi aplicado uma vez e verificado num browser real.** A primeira versão era *educativa*: dizia a cor de cada bolha ao estourar e, na gigante, revelava um animal — cor falada → nome falado → gravação do som do bicho, uma corrente de ~4 s entre o toque e a recompensa. A revisão inverteu as duas peças, por uma razão de **tempo de resposta**: tudo o que ocupe um canal faz a criança esperar, e a fala ocupa-o sempre. As palavras saem do jogo; ficam nas apps que são sobre palavras (quebra-cabeça, letras, números). No lugar do animal entra um espectáculo que herda a cor da bolha — fogo de artifício de fagulhas, sem estrondo — e o estouro comum passa a soar a uma bolha a rebentar em vez de a uma nota de xilofone.

## What Changes

- As bolhas voltam a subir: `@keyframes floatUp` reposto (com vaivém lateral, para não parecerem um elevador) e cada bolha é destruída no `animationend`, com um teto de bolhas simultâneas — acaba a fuga de nós.
- **Cena debaixo de água**: água clara com feixes de luz, areia no fundo e três peixinhos que reagem ao estouro de uma bolha próxima.
- **O som de cada estouro são duas camadas no mesmo instante**: um ataque que soa a bolha a rebentar (blip com deslizamento para grave + estalido de ruído filtrado) e, por baixo e mais baixinho, uma nota da escala pentatônica de Dó escolhida pela dimensão (grande = grave, pequena = aguda). Nada de samples novos: tudo sintetizado em Web Audio, com um buffer de ruído criado uma só vez.
- **Zero fala neste app**: nenhuma palavra é dita — nem o nome da cor, nem o nome de um animal. É um requisito escrito na especificação, verificável por escuta em `speechSynthesis.speak`.
- **A cor é a matéria do brinquedo, nunca o seu nome**: cada bolha é de uma cor nítida (com a azul mais escura que a água, para se ver) e é essa cor que vai para o estouro, para as fagulhas e para a nódoa que a gigante deixa.
- **Esforço e clímax**: três classes de dimensão; as **GIGANTES** tremem e crescem a cada toque, soltam já fagulhas a cada toque (poucas, depois mais), e ao terceiro rebentam em **fogo de artifício** — sorteado entre quatro formas (roda, chuveiro, espiral, coroa), sempre na cor da bolha, com assobio e chuvisco e **sem estrondo grave** que possa assustar.
- **Vagas sem fim e sem derrota**: uma vaga são ~6 bolhas médias + 1 gigante; ao estourar a última há confetti e o som de vitória já existente, e a vaga nova entra com uma cor a mais e uma forma de fogo ainda não usada. Uma bolha que escapa pelo topo simplesmente sai — não conta contra ninguém.
- **Botão "soprar"**: manter o dedo liberta um enxame de bolhas a partir do dedo da criança — as bolhas passam a ser obra dela, não do temporizador.
- **Os peixes deixam de ser só cenário**: cada peixe ganha uma caixa de toque de 90 × 90 px (o emoji continua pequeno e cenográfico) e, tocado, dá uma **cabriola**, dispara para longe com um rasto de bolhinhas decorativas e faz um glup-glup curto — sem nome, sem palavra, sem estrondo.
- Multi-toque a funcionar a sério: vários dedos a estourar bolhas ao mesmo tempo.
- Reusa o que já existe: `src/ui/sfx.ts`, `src/ui/sounds.ts`, as `@keyframes confettiFall` do puzzle, e os mesmos utilitários de ciclo de vida dos outros apps 2-D. Nenhum ficheiro de áudio novo; os 12 MP3 de animais ficam onde estão e continuam a servir os quebra-cabeças e a pintura.

## Capabilities

### New Capabilities

- `bubbles-toy`: o brinquedo das bolhas — como as bolhas nascem, sobem e morrem; o que cada uma devolve quando é tocada (o som de uma bolha, a sua cor, o esforço das gigantes, o fogo de artifício); como os peixes respondem a quem os toca; como as vagas se sucedem; e as garantias de que nada é dito, de que a criança é sempre ela a produzir as bolhas e de que nunca pode errar.

### Modified Capabilities

<!-- Nenhuma. animal-puzzle e vehicle-puzzle descrevem o encaixe de peças, que não muda. O facto de as bolhas deixarem de usar puzzleAnimals.ts e speech.ts é uma remoção de consumo, não uma alteração de requisito desses specs — os animais e as suas gravações continuam a ser servidos. -->

## Impact

- `src/apps/BubblesApp.ts` — modelo da bolha (cor, classe de dimensão, nota, carga), vagas, multi-toque, ciclo de vida com remoção, fogo de artifício, peixe tocável. **Deixa de importar `src/ui/speech.ts` e `src/apps/puzzleAnimals.ts`.**
- `src/style.css` — repõe `@keyframes floatUp` (mais vaivém), adiciona água, feixes de luz, areia, nódoa de cor, botão soprar, `sparkFly` para as fagulhas, `spin` para a cabriola e a caixa de toque do peixe; remove o `.bubbles-reveal` que ficou órfão. As keyframes vão para um bloco próprio, longe do bloco do puzzle, com comentário a dizer quem as consome — foi uma reescrita por cima que partiu o app.
- `src/ui/sfx.ts` — `bubbleTone(sizePx)` (a pentatônica pela dimensão) e os novos `blip()`, `pop()` sobre um buffer de ruído reutilizado, `sparkle()` (assobio + chuvisco) e `glup()`. Nenhum componente grave prolongado, por decisão de segurança para a idade.
- `src/ui/speech.ts` — `cancelSpeech()` mantém-se exportado (é a forma correcta de cortar fala em iOS, com as salvaguardas do `canceled` espúrio e dos 125 ms); as bolhas deixam simplesmente de o chamar.
- Alvo: tablet/touch (é uma PWA instalada, com `sw.js`) — usa `100dvh` e respeita as áreas seguras, como os outros apps.
- Coexistência: o app continua montado dentro de `#ui` e a voltar ao launcher pelo mesmo caminho (`clearAll()` + `launcher.show()`); o botão de saída do app tem `z-index` acima das bolhas para não ser tapado por uma bolha a passar no canto, e não é afetado pelo change `fix-hud-home-button`.
- Risco assumido e escrito no design: os 12 animais faziam o trabalho da **novidade** ("o que vem agora?"). Passam a fazê-lo as quatro formas de fogo tintadas em seis cores — 24 aspectos diferentes, sem repetição consecutiva. É aqui que se mexe se a criança deixar de procurar as gigantes, e não à fala que saiu.
