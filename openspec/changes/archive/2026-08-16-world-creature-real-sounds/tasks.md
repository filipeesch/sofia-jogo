## 1. Implementação

- [x] 1.1 `src/core/Game.ts`: no clique dos creatures, `playSound` da espécie (dog/cat/chicken/sheep/cow/duck → MP3) com o synth do `AudioManager` como fallback; manter `hop()` e `plim()` para tipos desconhecidos
- [x] 1.2 Pré-carregar as gravações das espécies presentes no mundo em `registerClickables()` (dedupe por type)

## 2. Verificar e entregar

- [x] 2.1 `tsc --noEmit` + `vite build` passando
- [x] 2.2 Testar no browser (`?level=vale`): clique na vaca → buffer source (som real) e pulo; com MP3s bloqueados → fallback procedural (osciladores) e pulo
- [x] 2.3 Commit + push