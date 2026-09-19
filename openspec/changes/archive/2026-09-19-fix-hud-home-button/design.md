# Design

## Context

O botão 🏠 do HUD nasceu com `class="btn home"` e `.home` já pertencia ao contentor do seletor de fases (`src/ui/HomeScreen.ts`). Com o mesmo specificity, quem ganhava era quem viesse depois em `src/style.css`: o botão herdou `position: fixed`, `inset: 0`, `height: 100dvh`, `flex-direction: column` e o gradiente azul da tela, esticando-se por uma faixa de 88 × 720 px. Como tem `pointer-events: auto`, essa faixa engolia os toques do mundo 3D.

Este é um ficheiro de decisões curtas porque a correção é pequena — mas é o sítio onde fica registado **porquê** renomear em vez de tapar com especificidade, que é a escolha que evita que o bug volte.

## Decisions

### 1. Renomear o botão, não subir a especificidade de `.btn.home`

Duas saídas possíveis: escrever `.btn.home { ... }` com specificity acima de `.home`, ou dar ao botão um nome próprio (`btn hud-home`).

Ficou o renome. Subir a especificidade deixaria duas coisas com significados incompatíveis — um botão de 88 px e uma tela de ecrã inteiro — a partilharem o mesmo nome, e a próxima pessoa que editasse `.home` para a tela voltava a apanhar o botão sem perceber porquê. Um conflito de nomes resolve-se na origem, não com `!important` nem com seletores mais específicos. Como bónus, o nome `hud-home` diz o que é: o botão de casa **do HUD**.

### 2. `.home` continua a pertencer ao seletor de fases

O layout de ecrã inteiro (`fixed`, `inset: 0`, `100dvh`, gradiente azul) é a natureza da tela, não um efeito colateral. Nenhuma regra `.home`/`.home-*` foi tocada — a única regra alterada foi `.btn.home` → `.btn.hud-home`.

### 3. Geometria: círculo por `clamp`, com piso de alvo infantil

O botão é `width: height: clamp(64px, 12vw, 88px)` com o `border-radius: 50%` que `.btn` já dá, e fica no canto superior direito como os outros botões flutuantes. O **piso de 64 px não é negociável** — é o mínimo de alvo tocável para 2–3 anos que este projeto já usa nas bolhas. O teto de 88 px existe para o botão não passar por cima do mundo em tablets grandes.

Consequência registada no requisito: a cláusula de "não mais de 15 % da largura/altura" é um teto para os tamanhos de ecrã normais. Abaixo de ~427 px de largura as duas regras colidem, e quem manda é o piso do alvo — encolher o botão para satisfazer a percentagem produziria justamente o problema que este projeto evita noutros lados.

### 4. O contentor do HUD não capta toques; só os alvos captam

O que tornava este bug grave não era a estética, eram os 88 px de mundo inacessíveis. O mecanismo que o impede é estrutural: `#ui { pointer-events: none }` e só os `.btn` reactivam `pointer-events: auto`. Qualquer elemento novo no HUD fica, por omissão, inerte ao toque — quem quiser ser tocado tem de o pedir explicitamente.

### 5. Verificação por medição, não por impressão

Uma correção de CSS que se confirma "a olhar" é a que volta a partir. As tarefas de verificação medem: `getBoundingClientRect()` nos dois veículos (largura = altura, junto ao canto), `getComputedStyle()` para provar que `position`/`height`/`flex-direction`/`background` deixaram de ser os da tela, um redimensionamento 1280×720 → 600×900 com jogo em curso, e um toque num animal clicável junto à margem esquerda — que é exactamente o que estava bloqueado. A auditoria das restantes classes (`btn special`, `btn fullscreen`, `btn back-btn`, `paint-action paint-back`, `counter`, `mode-toggle`) confirmou que `btn home` era a única colisão real.

## Risks / Trade-offs

- **Outro `.btn.*` apanhado pela mesma armadilha** → as tarefas 2.6 e 3.2 auditam as classes restantes e confirmam a nova classe no `dist`; o script e2e `scripts/check-exit-cleanup.mjs` passou a procurar `.btn.hud-home`, por isso uma regressão de nome parte um teste e não só o botão.
- **Nomes de tela e de widget a colidirem outra vez no futuro** → é o risco de não ter um espaço de nomes. Mitigação prática: widgets do HUD levam prefixo `hud-`. Não vale a pena impor BEM a um projeto deste tamanho, mas o prefixo resolve o caso concreto que rebentou.
- **Classe órfã `.btn.sound`** em `src/style.css` (pré-existente, sem atribuição em `src/`): deixada como está para não misturar uma limpeza com uma correção; a remover numa limpeza própria.
