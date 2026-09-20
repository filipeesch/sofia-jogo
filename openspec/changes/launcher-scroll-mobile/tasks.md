# Tasks

## 1. Implementação

- [x] 1.1 `src/style.css`: `.launcher` passa a scroll-container (overflow-y auto, touch-action pan-y, overscroll-behavior contain, -webkit-overflow-scrolling touch, scrollbars escondidas, paddings com env(safe-area-inset-*)); centering por `margin-top:auto` no título e `margin-bottom:auto` na grelha em vez de `justify-content: center`; `html.launcher-touch, html.launcher-touch body { touch-action: pan-y }`.
- [x] 1.2 `src/ui/Launcher.ts`: cartões e botão ⛶ abrem por `click` (não `pointerdown`); `show()` adiciona a classe `launcher-touch` ao `documentElement`.
- [x] 1.3 `src/main.ts`: `clearAll()` remove a classe `launcher-touch`.

## 2. Verificação

- [x] 2.1 Build/typecheck limpos.
- [x] 2.2 Playwright com viewport de smartphone e toques reais (CDP touch): scroll por arrasto move o launcher e NÃO abre jogo; após rolar, o último cartão (Galo) fica visível e um toque abre-o; um toque simples sem arrasto abre à primeira; com um jogo aberto (ex.: Memória) o `documentElement` perde a classe e `touch-action` da página volta a `none`; num viewport grande o launcher continua centrado; 0 erros de consola.
