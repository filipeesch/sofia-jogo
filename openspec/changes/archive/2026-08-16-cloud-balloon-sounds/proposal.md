## Why

Clicar numa nuvem ou num balão no mundo toca sons genéricos reutilizados (`plim` para nuvens — o mesmo som das casas — e um `pop` curto para balões). Como o jogo agora tem gravações reais nos animais e sons mais cuidados em geral, as duas interações mais frequentes do céu merecem sons próprios: a nuvem "estoura" em partículas brancas (pede um "psshh" fofinho) e o balão de borracha amassa e volta (pede um "boing" com cara de látex).

## What Changes

- `AudioManager` ganha dois sons procedurais novos:
  - `cloudPuff()`: ruído filtrado suave ("psshh" da nuvem se dispersando) + dois tintles etéreos em subida — combina com o burst de partículas brancas.
  - `balloonBoing()": "boing" de borracha: pitch que despenca e volta com wobble de LFO — combina com o squash do `bounce()`.
- Clique em **nuvem** passa a tocar `cloudPuff()` (antes `plim()`).
- Clique em **balão** passa a tocar `balloonBoing()` (antes `pop()`).
- Casas, pássaros, baleia e creatures **não mudam** (`plim`/`chirp`/`splash` continuam nos seus usos).
- 100% procedural (Web Audio), sem novos arquivos — consistente com o resto da trilha de efeitos.

## Capabilities

### New Capabilities

- `world-objects`: sons de interação dos objetos do céu — nuvens tocam o "psshh" de dispersão e balões tocam o "boing" de borracha, cada um com seu som próprio e reconhecível.

### Modified Capabilities

(nenhuma)

## Impact

- `src/systems/AudioManager.ts` (`cloudPuff()`, `balloonBoing()`).
- `src/core/Game.ts` (troca dos sons nos handlers de nuvens e balões).
- Sem novos assets, sem impacto nos demais sons nem nos apps do launcher.
