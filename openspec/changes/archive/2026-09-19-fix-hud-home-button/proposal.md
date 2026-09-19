# Proposal

## Why

O botão 🏠 do HUD, que devolve a criança ao launcher, aparece esticado: em vez de um círculo de ~88 px no canto superior direito, ocupa uma faixa vertical de 88 × 720 px ao longo de toda a margem esquerda do ecrã. A causa é uma colisão de classes — o botão nasce com `class="btn home"` (`src/ui/UI.ts`), e `.home` já é a classe do contentor do seletor de fases (`src/ui/HomeScreen.ts`). As duas têm o mesmo specificity e `.home` vem depois em `src/style.css`, por isso ganha nos conflitos: `position: fixed`, `inset: 0`, `height: 100dvh`, `padding: 24px`, `flex-direction: column` e o gradiente azul da tela de início.

O problema não é só estético: o botão tem `pointer-events: auto` e cobre 88 px do ecrã inteiro, pelo que engole os toques dados nessa faixa — os objetos clicáveis do mundo (animais, coletores) deixam de estar acessíveis ali.

## What Changes

- O botão de saída do HUD passa a usar uma classe própria, sem colisão com as classes das telas (`btn home` → `btn hud-home`).
- O seletor de fases mantém `.home` como classe do seu contentor — é a tela que tem de continuar a usar o layout de ecrã inteiro.
- Fica escrita como requisito a propriedade que hoje só foi verificada à mão: os botões flutuantes do HUD são circulares, de tamanho fixo, e não ocupam nem bloqueiam a área jogável.
- Verificação de que nenhuma outra classe atribuída em `src/` colide com as classes de layout existentes (até à data, `btn home` é a única colisão real entre as classes usadas no código).

## Capabilities

### New Capabilities

- `game-hud`: o HUD do Avião e do Carro — contador de estrelas, botão de saída para o launcher, botão de ação especial e o seletor de modo trilho/manual — incluindo o espaço que cada elemento pode ocupar e o que deve permanecer tocável.

### Modified Capabilities

<!-- Nenhuma: as especificações existentes (animal-puzzle, vehicle-puzzle, world-creatures, world-objects) não descrevem o HUD nem mudam de requisito com esta correção. -->

## Impact

- `src/ui/UI.ts` — a classe do botão criado no construtor do `UI`.
- `src/style.css` — a regra `.btn.home` passa a `.btn.hud-home`; as regras de `.home` / `.home-*` (seletor de fases) ficam intactas.
- Sem alteração de comportamento, de API ou de assets: os três jogos (Avião, Carro) e o `HomeScreen` usam as mesmas funções, apenas o nome da classe muda.
- Risco de regressão: baixo, mas há um segundo sítio a confirmar — `.btn.fullscreen`, `.btn.special` e `.btn.back-btn` partilham o mesmo padrão de seleção e têm de continuar a renderizar como círculos.
