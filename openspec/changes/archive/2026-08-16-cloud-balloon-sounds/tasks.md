## 1. Sons (AudioManager)

- [x] 1.1 `cloudPuff()`: ruído lowpass ~0.45 s + dois tintles etéreos em subida
- [x] 1.2 `balloonBoing()`: triangle 420→180→260 Hz com LFO de wobble (26 Hz), ~0.35 s

## 2. Interação (Game)

- [x] 2.1 Handler de nuvem: `plim()` → `cloudPuff()`; handler de balão: `pop()` → `balloonBoing()`
- [x] 2.2 Estender `window.__debug` com `objects()` (posições + escala de nuvens e balões) para captura/testes

## 3. Verificar e entregar

- [x] 3.1 `tsc --noEmit` + `vite build` passando
- [x] 3.2 Testar no browser: clique em nuvem → puff (buffer source) e burst; clique em balão → boing + squash
- [x] 3.3 Commit + push