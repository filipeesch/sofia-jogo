# Tasks

## 1. Corrigir a colisão de classes

- [x] 1.1 Em `src/ui/UI.ts`, mudar a classe do botão de regresso de `btn home` para `btn hud-home` e verificar no browser (dev server em `?debug=1&level=vale&vehicle=car`) que `document.querySelector('.btn.home')` já não existe e que `.btn.hud-home` existe
- [x] 1.2 Em `src/style.css`, renomear a regra `.btn.home` para `.btn.hud-home`, sem tocar nas regras de `.home` e `.home-*` do seletor de fases, e confirmar com `npm run typecheck` que nada partiu

## 2. Verificar contra os requisitos

- [x] 2.1 Medir o botão com `getBoundingClientRect()` em `vale/carro` e em `ilha/avião` e confirmar que largura = altura (círculo de 64–88 px) junto ao canto superior direito, satisfazendo "Botão de regresso ao launcher com forma e lugar estáveis"
- [x] 2.2 Rodar `getComputedStyle` sobre o botão e confirmar que `position` é `absolute`, `height` já não é `100dvh`, `flex-direction` já não é `column` e `background` voltou a ser o branco do `.btn`
- [x] 2.3 Rodar a janela de 1280×720 para um retrato de tablet (por ex. 600×900) com um jogo em curso e verificar que o botão continua circular e dentro dos limites de 15 % da largura/altura do cenário
- [x] 2.4 Tocar um animal clicável junto à margem esquerda do ecrã e confirmar que reage — comprova que "O HUD não captura toques fora dos seus alvos"
- [x] 2.5 Abrir o seletor de fases a partir do Avião e confirmar que continua a cobrir o ecrã inteiro com o fundo azul de início, sem regressão do lado do `HomeScreen`
- [x] 2.6 Percorrer as restantes classes atribuídas em `src/` (`btn special`, `btn fullscreen`, `btn back-btn`, `paint-action paint-back`, `counter`, `mode-toggle`) contra as classes de tela em `src/style.css` e confirmar que `btn home` era mesmo a única colisão

## 3. Fechar

- [x] 3.1 Confirmar visualmente (captura do Avião, do Carro e do seletor de fases) que os quatro botões flutuantes são círculos e que nenhuma faixa azul corta o mundo 3D
- [x] 3.2 Correr `npm run build` para garantir que o bundle de produção inclui a nova classe e que o seletor de fases continua a chegar ao `dist`
