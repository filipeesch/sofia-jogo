## Context

O quebra-cabeça dos animais (capacidade `animal-puzzle`) já distribui 12 MP3s em `public/sounds/` e o loader em `src/ui/sounds.ts`. O mundo 3D tem animais clicáveis (`world.creatures`) registrados em `Game.registerClickables()`, que hoje tocam o synth da espécie via `AudioManager`. Esta change troca apenas a fonte do som: gravação real, com o synth de sempre como fallback.

## Decisions

- **Zero assets novos.** Reaproveitar os 6 MP3s que já existem (`dog, cat, chicken, sheep, cow, duck`). Os outros 6 do quebra-cabeça (porco, cavalo, leão, sapo, coruja, galo) não existem como 3D model no mundo, então não entram aqui.
- **Preload em `registerClickables()`.** A criação do mundo é o momento em que os types são conhecidos; pré-carregar apenas as espécies presentes (dedupe por type) mantém os mundos sem animais (hipoteticamente) leves e o primeiro clique pronto. O preload é o mesmo de sempre: `fetch` + `decodeAudioData` no `AudioContext` compartilhado do `sfx.ts`.
- **Fallback = AudioManager atual.** O `playSound(file, fallback)` recebe como fallback o mesmo synth de hoje (`this.audio.bark()` etc.), sem tocar no `AudioManager`. Tipos de creature fora dos 6 conhecidos seguem com `plim()`, como hoje.
- **Baleia, pássaros, nuvens e balões inalterados.** Não fazem parte do conjunto de gravações; mexer neles seria escopo de outra change (ex.: gravações de baleia/pássaro no futuro).
- **Auditoria de teste.** O som real passa pelo contexto do `sfx.ts` (buffer source); o synth/música usam o contexto do `AudioManager` (osciladores). Por isso o teste mede `createBufferSource` no primeiro contexto e osciladores no segundo — sem contaminação pela música de fundo.

## Risks / trade-offs

- Volume: a gravação sai pelo contexto compartilhado com volume 1.0, enquanto o synth sai do master do AudioManager (0.8). Se parecer alto demais ao lado da música, o `volume` do `playSound` já é parâmetro pronto para calibrar — decisão pós-escuta, não bloqueio.
- Clique em animal distante: o raycast do `clickables` continua sendo o filtro de interatividade; nada muda no alcance.
