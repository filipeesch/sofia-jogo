## 1. Áudio

- [x] 1.1 Baixar 12 MP3s curtos (1–4 s) um por animal → `public/sounds/{dog,cat,chicken,sheep,cow,duck,pig,horse,lion,frog,owl,rooster}.mp3` (MyInstants)
- [x] 1.2 Adicionar 6 fallbacks procedurais (`oink`, `neigh`, `roar`, `ribbit`, `hoot`, `crow`) em `src/ui/sfx.ts` e exportar `audioCtx()`

## 2. Carregador de sons reais

- [x] 2.1 Criar `src/ui/sounds.ts`: `preloadSound` (fetch + decodeAudioData, dedupe, retry após falha), `isSoundLoaded`, `playSound(url, fallback, volume?)` com fallback ao synth quando o buffer não existe

## 3. Puzzle com 12 animais

- [x] 3.1 Estender `ANIMALS` em `src/apps/AnimalsApp.ts` com Porco, Cavalo, Leão, Sapo, Coruja e Galo (emoji, nome pt-BR, `file`, fallback)
- [x] 3.2 `mount()`: pré-carregar as 12 gravações; `place()`: `playSound(file, fallback)` no lugar do synth direto
- [x] 3.3 Compactar o CSS do puzzle (slots/peças/gaps) para 12 peças caberem em 720p e tablet em pé

## 4. Créditos e docs

- [x] 4.1 Criar `docs/audio-credits.md` (arquivo → animal → fonte MyInstants) e atualizar a linha de áudio do `README.md`

## 5. Verificar e entregar

- [x] 5.1 `tsc --noEmit` + `vite build` passando
- [x] 5.2 Testar no browser: 12 slots + 12 peças, preload ok, encaixe correto toca gravação real (sem oscilador), erro continua com thump, fallback quando fetch é bloqueado
- [x] 5.3 Commit + push
