# Design

## Context

O app é 100 % DOM: `BubblesApp` monta um `<div class="bubbles">` dentro de `#ui` (o overlay fixo com `pointer-events: none`, em `src/style.css`) e cada bolha é um `<div class="bubble">` animado por CSS. Os outros apps 2-D (`PaintApp`, `PuzzleApp`) seguem exactamente o mesmo padrão — montar em `#ui`, `destroy()` chamado por `clearAll()` em `src/main.ts`, voltar ao launcher com `launcher.show()`.

Restrições que shapeiam a solução:

- É uma PWA instalada num tablet de criança: `100dvh`, áreas seguras, multi-toque, e nada pode continuar a correr depois de sair (há um regression check dedicado, `scripts/check-exit-cleanup.mjs`, para exatamente essa classe de bug).
- A causa raiz da avaria foi uma regressão de CSS: `@keyframes floatUp` foi apagada quando o bloco do puzzle foi reescrito por cima. Não há nada no build que detecte uma `animation-name` órfã.
- Todo o áudio do projeto é **sintetizado** em Web Audio (`tone()` em `src/ui/sfx.ts`, `playSound()` em `src/ui/sounds.ts`); os únicos MP3 existentes são animais e veículos, usados por outras apps.

**Este change já foi aplicado uma vez** e verificado num browser real. A primeira versão falava: dizia a cor de cada bolha ao estourar e, na gigante, revelava um animal — cor falada → nome falado → MP3 do bicho, uma corrente de ~4 s. Uma revisão com a criança em mente inverteu as duas coisas, e é essa versão que este documento descreve agora.

## Goals / Non-Goals

**Goals:**

- Bolhas que vivem e morrem num ciclo de vida fechado: criadas, animadas, removidas — com teto de simultâneas e zero nós órfãos.
- Resposta **imediata** a cada toque: nada no app pode fazer a criança esperar por um som.
- A cor como matéria visual do brinquedo (estouro, fagulhas, nódoa) em vez de vocabulário dito.
- O brinquedo tem de funcionar e ser evidente em **silêncio total** (áudio adormecido, tablet no mudo).
- Reusar o que já existe em vez de introduzir assets novos.

**Non-Goals:**

- Não é um jogo com progresso persistente: sem estrelas, níveis ou recordes gravados.
- Não há modos nem seletor de conteúdo — uma cena, quatro atributos.
- Não se toca no `Launcher`, no `PuzzleApp` nem no HUD do Avião/Carro (o botão esticado é o change `fix-hud-home-button`).
- **Não há fala neste app** — nem nomes de cores, nem nomes de animais. As palavras ficam nas apps que são sobre palavras (quebra-cabeça, letras, números).
- Não se trazem animais, frutas ou vozes novas.

## Decisions

### 1. Continuar em DOM + CSS, sem canvas nem rAF

Com um teto de 8 bolhas + 3 peixes + confetti + um fogo de cada vez (~18 fagulhas), são ~40 elementos animados por vez nos piores segundos. O `transform` em keyframes é composto pelo compositor e não custa um frame. Alternativas consideradas: um `<canvas>` 2-D (mais código, perde o `pointerdown` nativo por elemento, e teria de reimplementar os hit-tests grandes) e uma cena Three.js (absurdo para o efeito, e o `Game` tem um ciclo de vida pesado com `disposeAll()`). Mantemos o padrão dos outros apps 2-D.

Consequência directa: a subida é CSS, mas o ciclo de vida é JS — `animationend` remove a bolha. É isto que fecha a fuga actual.

### 2. Duas keyframes separadas em vez de uma só

`floatUp` (progresso vertical, `translateY(0) → translateY(-130vh)`) e `wobble` (deriva lateral e ligeira rotação, em ciclo) aplicadas como duas animações no mesmo elemento.

Porquê não meter tudo numa keyframe só: a duração da subida varia por bolha (4–7 s) e o vaivém tem de manter um ritmo próprio; juntas, uma bolha lenta derivaria devagar e uma rápida derivaria depressa, o que lê como "escorregadio" e não como água. Duas animações independentes também tornam impossível apagar a subida ao mexer no vaivém — que é literalmente como este app partiu.

### 3. Estouro em duas camadas: bolha realista por cima, pentatônica por baixo

Hoje o estouro é `tone(freq, 0.16, 'triangle')` — uma nota limpa, que soa a xilofone e não a bolha. Passa a ter duas camadas no mesmo `pointerdown`:

1. **Ataque de bolha** — `blip()`: seno com `exponentialRampToValueAtTime` de ~700 Hz para ~180 Hz em 70–90 ms (o "plop" descendente), somado a **`pop()`**: um `AudioBufferSourceNode` de ruído branco, passa-alto ~800 Hz com envelope a fechar em ~50 ms (o estalido). É a forma como uma bolha de sabão soa realmente, e é o que faz a criança reconhecer o gesto.
2. **Cauda musical** — `bubbleTone(sizePx)`, a nota da pentatônica de Dó (Dó, Ré, Mi, Sol, Lá em três oitavas) escolhida pela dimensão, mais baixa de volume do que o ataque.

A pentatônica continua a decisão mais barata do change: cinco notas por oitava sem semitons ⇒ duas notas quaisquer soam consonantes, e "não existe toque errado" deixa de ser uma esperança e passa a ser uma propriedade da escala. O ruído do ataque é banda larga e muito curto, por isso **não desafina** com a nota por baixo.

Novo em `sfx.ts`: um buffer de ruído branco criado uma vez e guardado (`noiseBuffer()`), porque gerar 128 ms de ruído por estouro seria CPU deitada fora.

### 4. Fogo de artifício em vez de animal revelado

Terceiro toque na gigante → fogo de artifício **na cor da bolha**, escolhido entre quatro formas, com som de assobio + chuvisco.

Porquê os fogos e não outra coisa: a gigante já é um clímax construído a três toques; o que pede é um espectáculo, não uma informação. E os fogosherdam a cor da bolha automaticamente, o que carrega o trabalho pedagógico que a fala da cor fazia — sem uma palavra.

**Implementação — partículas DOM + CSS, sem rAF** (coerente com a decisão 1): o JS gera ~18 `<span class="spark">` com variáveis por fagulha (`--dx`, `--dy`, `--atraso`, `--dur`) e uma classe de forma; o `@keyframes sparkFly` trata da trajetória (arranque rápido com `cubic-bezier` de desaceleração, depois queda) e o `animationend` remove cada fagulha. As quatro formas são apenas quatro geradores de offsets: `roda` (anel radial uniforme), `chuveiro` (todas para cima, com gravidade a trazê-las de volta), `espiral` (ângulo progressivo com raio a crescer) e `coroa` (anel com caídas pendentes).

Um fogo de cada vez (`fogando` boolean, no padrão da revelação anterior) com rede de segurança pelo `animationend` da última fagulha, e teto declarado de ~60 fagulhas em voo: dois fogos em paralelo não se sobrepõem, e um tablet fraco nunca apanha centenas de nós. Rejeitado: `<canvas>` para partículas — só pagaria-se se quiséssemos centenas de fagulhas, e perderíamos a remoção automática via `animationend` que garante o "fim limpo" exigido pelo spec.

**Som — sem estrondo.** `sparkle()`: um assobio (`tone()` com glide descendente 1200 → 400 Hz em ~280 ms, volume modesto) seguido de um **chuvisco**: 6–10 estalidos de ruído filtrado (o buffer da decisão 3) em passa-banda, em instantes pseudo-aleatórios nos ~400 ms seguintes, cada um de ~25 ms. Explicitamente não há "bum": sem seno grave prolongado, sem ruído passa-baixo com ataque forte. Um estrondo súbito a volume de tablet assusta uma criança de 3 anos, e o susto não é algo que o brinquedo possa medir ou recuperar.

### 5. O app não fala: `speech.ts` sai do `BubblesApp`

Removidos do `BubblesApp`: `speakName`, `speakIfIdle`, `speechLooksDead`, a fila de revelações e `cancelSpeech`. Não há nada a falar, logo nada a interromper.

`cancelSpeech()` **mantém-se exportado** em `src/ui/speech.ts` — foi acrescentado por este change, é a forma correta de cortar fala (passa pelo `synth.cancel()` guardado que já trata do erro `canceled` espúrio e do espaçamento de 125 ms em iOS) e serve qualquer app futuro. As bolhas deixam de o chamar; um export sem chamada no `BubblesApp` não é dívida, remover o export é que seria perder a salvaguarda.

A justificação é de tempo de resposta, não de gosto: uma frase custa ~1,5 s, e a gigante — o momento de maior excitação — ficava com ~4 s de corrente (cor → nome → MP3) entre o toque e a recompensa. Numa app que é 100 % provocação-resposta, qualquer coisa que ocupe o canal é um custo, e a fala ocupa-o sempre.

Consequências a apanhar na verificação: o `BubblesApp` deixa de importar `puzzleAnimals.ts` e `speech.ts`; o CSS `.bubbles-reveal` fica órfão e sai; os 12 MP3 de animais **não** são apagados (quebra-cabeças e pintura usam-nos).

### 6. Gigante com estado no elemento, hit-test generoso

O número de toques vai em `dataset.taps` no próprio `<div>`; `pointerdown` incrementa, troca a classe de crescimento, toca a nota seguinte e solta o punhado de fagulhas proporcional ao toque (1 → poucas, 2 → mais, 3 → o fogo). Cada gigante usa `pointerdown` com `setPointerCapture` e `touch-action: none`, como os arrastamentos do `PuzzleApp`, para o dedo da criança não ser cancelado por gestos do browser. O progresso não se perde com o tempo (requisito "Gigante nunca é castigada por demora"), pelo que não há timer por gigante.

### 7. Soprar = `pointerdown` mantido, sem timer global

O comando de soprar dispara `pointerdown`/`pointerup`/`pointercancel` e, enquanto estiver preso, um `setTimeout` recorrente (guardado no `destroy()`) cria bolhas na posição do gesto. O gesto é por elemento, logo não interfere com dedos a estourar bolhas ao mesmo tempo — é isto que satisfaz o multi-toque sem coordenar ponteiros à mão. Solto o dedo, o timeout é limpo: nada de bolhas atrasadas.

### 8. Vaga dirigida por temporizadores registados

Um pequeno `director` dentro de `BubblesApp`: `pending` = total - estouradas - escapadas; a ~900 ms entra uma bolha enquanto `pendentes no ar < 8`; quando `pending === 0` e nenhuma gigante está a meio, dispara `win()` + confetti e arma a vaga seguinte. Todos os `setTimeout` vão para uma lista `timeouts[]`, no padrão do `PuzzleApp`, e `destroy()` limpa-a toda.

O confetti reusa as `@keyframes confettiFall` já no CSS com uma classe própria (`bubbles-confetti`), para não haver um `BubblesApp` dependente de classes `.puzzle-*`.

### 9. Peixes: fuga ao estouro, cabriola ao toque, e uma caixa de toque de 90 px

Três peixes em CSS puro a nadar de lado a lado, sem `requestAnimationFrame`. Dois comportamentos distintos:

- **Estouro próximo** → classe `flee` com direcção, retirada no `animationend` (o que já existe).
- **Toque directo** → classe `spin`: uma cabriola (`rotate(360deg)`) seguida de arrancada com `--dir`, com um rasto de 4–6 bolhinhas decorativas e um `glup-glup` curto (três `blip()` muito curtos e abafados, sem nota — é som de ar, não música). No fim, retira-se a classe e o peixe volta ao `swim` normal.

**A caixa de toque é a decisão que faz o peixe ser tocável a sério.** Um emoji de ~44 px não é alvo para 2–3 anos, e este projeto já fixou 72 px como mínimo para alvos (requisito "Tamanho do alvo" das bolhas). O peixe ganha um pseudo-elemento `::before` de 90 × 90 px centrado, transparente e `pointer-events: auto`, enquanto o emoji em si continua pequeno e cenográfico. O rasto de bolhinhas fica `pointer-events: none` — são decorativas, e um alvo de 20 px seria um alvo desonesto que obriga a apontar.

### 10. Cores: seis, nítidas, e nunca ditas

Seis cores (`vermelho`, `azul`, `verde`, `amarelo`, `roxo`, `laranja`), com a azul **#2f9ae0, mais escura que a água** (#7fd8f5 no topo do gradiente) porque a versão anterior usava exatamente a cor da água e a bolha azul perdia-se no fundo — apanhado na revisão visual, não no código. A cor vai para `--c` e é consumida pelo gradiente da bolha, pelo halo (`box-shadow` colorido), pelo estouro, pelas fagulhas e pela nódoa das gigantes. Nos gigantes o reflexo especulativo é mais pequeno para que o miolo de cor se veja.

### 11. Fogo é luz, não pintura: `mix-blend-mode: screen`

Apanhado na verificação visual, outra vez fora do código: com composição normal, o fogo **azul** era praticamente invisível. A cor da bolha azul (#2f9ae0) foi escolhida mais escura que a água para a bolha se ver, mas é precisamente a zona de cor da água — projectada como `box-shadow` sobre a água, apagava-se e o fogo lia-se como quatro pontinhos pálidos. As outras cinco cores saltavam; a azul, que está em jogo desde a primeira vaga, não.

A correção não é mudar a cor (a cor da bolha é que dá a resposta à criança) nem clarear só o azul (ficaria uma cor de segunda). É assumir que **uma fagulha é luz**: `.spark` e `.spark-flash` passaram a `mix-blend-mode: screen`, que soma a luz da fagulha à luz do fundo, como fogo a sério faz. Todas as seis cores ficam acima do fundo, as saturações continuam a distinguir-se umas das outras, e o núcleo branco deixa de ser o único sítio visível no caso azul.

Custo: `mix-blend-mode` cria um stacking context no contentor de effectos, que já era `pointer-events: none` — medido com `elementFromPoint` por cima de 27 fagulhas em voo, nenhuma roubou o toque, e o que estava por baixo (água e um peixe a fugir) continuou alcanzável.

## Risks / Trade-offs

- **A mesma regressão voltar a acontecer** (apagarem `floatUp` por cima) → as keyframes das bolhas vão para um bloco próprio, longe do bloco do puzzle, com um comentário a dizer que `BubblesApp` as consome; e uma tarefa de verificação mede `getComputedStyle(...).animationName` *e* confirma que a bolha efectivamente se desloca, que é o que faltou da última vez.
- **Perder a variedade que os 12 animais traziam.** O animal era novidade ("o que vem agora?"); as fagulhas são sempre fagulhas. Mitigação deliberada: quatro formas sorteadas sem repetição consecutiva, sempre tintadas pela cor da bolha (4 × 6 = 24 aspectos diferentes) e crescendo ao longo dos três toques. A observar: se a criança deixar de procurar as gigantes ao fim de umas semanas, é este o ponto a mexer — não a fala.
- **Custo de DOM das fagulhas** em tablets fracos → um fogo de cada vez, 24 fagulhas por fogo, teto de 60 em voo, remoção garantida no `animationend`; mede-se a contagem de nós antes de sair, como se mediu para as bolhas (medido: máximo de 47 em voo com duas gigantes quase simultâneas).
- **CPU de gerar ruído por estouro** → buffer de ruído único e reutilizado; se ainda assim pesar, o ruído do ataque passa a 3 alternâncias pré-geradas.
- **Áudio adormecido no primeiro toque** → `resume()` no `pointerdown` (padrão já usado hoje em `BubblesApp`); risco residual de o primeiro estouro sair mudo em iOS, aceite porque o segundo toque recupera. Sem fala, já não há `primeOnGesture()` a pesar no primeiro gesto deste app.
- **Vaga "presa"** se uma gigante ficar a meio para sempre → as gigantes não contam para o fim de vaga enquanto não rebentarem: o director celebra e arma a vaga seguinte mesmo assim, e a gigante fica à espera (requisito explícito contra castigar a demora).
- **O peixe parecer "só desenho"** → além da caixa de toque de 90 px, o rasto de bolhinhas e o glup-glup fazem do toque uma resposta evidente; se a criança nunca tocar nos peixes, o peixe é que tem de crescer, não o requisito que tem de baixar.

## Migration Plan

Só código de app: `BubblesApp.ts` (retirada de fala/animais, adição de fogos, peixe tocável), `sfx.ts` (`blip`, `pop`, `sparkle`, `glup`, buffer de ruído), `style.css` (fagulhas, cabriola, caixa de toque; saída de `.bubbles-reveal`). Nenhum dado persistido, nenhuma migração, **nenhum asset novo**. Desfazer é reverter o commit.

## Open Questions

- As bolhinhas do rasto do peixe devem ser rebentáveis? Agora: não (são menores que o mínimo honesto de alvo). Se um dia o forem, têm de nascer com diâmetro de alvo, o que tornaria o rasto visualmente pesado.
- Quantos fogos em paralelo quando duas gigantes rebentam quase ao mesmo tempo — um só, como assume a decisão 4, ou dois com metade das fagulhas cada? Decide-se ao ver a criança jogar.
- Se os feixes de luz se mexem ou ficam fixos. Decisão de CSS a aplicar no final.
