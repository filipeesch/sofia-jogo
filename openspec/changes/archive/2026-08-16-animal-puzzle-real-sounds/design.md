## Context

O puzzle dos animais (capacidade `animal-puzzle`) precisa de mais animais (12) e de sons reais. O app roda em navegador (iPad incluído), sem backend, e a filosofia do projeto é "não existe jeito de errar" + fallback silencioso (GLB → primitivas).

## Decisions

- **MP3, não OGG/WebM.** Safari/iPad não decodifica OGG em Web Audio de forma confiável; MP3 é universal. As fontes com áudio CC (Wikimedia Commons) têm quase tudo em OGG e não há `ffmpeg` local para converter, então a fonte escolhida precisa servir MP3 direto.
- **Fonte: MyInstants.** `curl`-friendly, MP3 direto em `/media/sounds/*.mp3`, sons "one-shot" (um oink, um neigh…) ideais para recompensa. Licença: uso gratuito com atribuição ao site → `docs/audio-credits.md`. Pixabay e BBC bloquearam bots; Commons não tinha conjunto completo em MP3.
- **`AudioContext` compartilhado.** `sfx.ts` exporta `audioCtx()`; `sounds.ts` usa o mesmo contexto (um único contexto por app, sem duplicidade de latência). Pré-carregamento em `mount()` cria o contexto suspenso se preciso — inofensivo para `decodeAudioData`.
- **Contrato `playSound(url, fallback)`.** Buffer carregado → `AudioBufferSourceNode` com gain; senão → `fallback()` (o synth procedural de sempre). `preloadSound` deduplica chamadas e descarta a fila em caso de falha (permite nova tentativa se o usuário reabrir o app online).
- **Sem conversão local.** Os arquivos já chegam em MP3; nenhuma etapa de build toca neles (`public/` é copiado pelo Vite como está).
- **Board 3×4 sem nova lógica.** O grid `repeat(3, auto)` já reflow para 12 slots; o CSS foi compactado (slot 56–80px, peça 52–68px, gaps 10/14px) para caber em 720p e tablet em pé. O hit-test é relativo ao tamanho do slot, então não muda.
- **12 animais: fazenda + zoológico.** Porco, Cavalo, Leão, Sapo, Coruja e Galo — sons bem distintos entre si, evitando confusão para a faixa etária.

## Risks / trade-offs

- Qualidade dos MP3 varia (fonte comunitária): mitigado por duração/bitrate no momento da escolha e pelo fallback; se algum som ficar "errado", basta substituir o arquivo em `public/sounds/` sem tocar no código.
- ~550 KB adicionais de assets: irrisório para o jogo (modelos 3D são maiores) e carregado só quando o app abre.
- Atribuição MyInstants: mantida em `docs/audio-credits.md` (requisito de licença).
