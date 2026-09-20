# Proposal

## Why

O pedido do adulto é duplo: «o som do animal está demorando muito a tocar após o acerto» e «é bom sinalizar de alguma forma quando erramos e emitir um som».

A demora tem causa estrutural: na cadeia atual o som do animal espera a FALA inteira terminar. A síntese de voz começa até ~1,6 s depois (watchdog de start de iOS), fala a rate 0.9, e o fim da utterance pode não emitir `end` — o watchdog de fim estica a espera até ~3 s. Uma criança de 2-3 anos perde por completo o vínculo entre o acerto e o "muuu".

No erro, hoje só existe um clique suave: com as cartas iguais por trás (🐾), sem nenhum sinal visual a criança não percebe que foi um "não é este" — só vê as cartas fecharem sozinhas.

## What Changes

- Inverter a cadeia do acerto: quando existe gravação, o som do animal toca IMEDIATAMENTE no toque que fecha o par (o ficheiro está pré-carregado e o toque é o gesto que desbloqueia o áudio); o nome em pt-PT passa a ser falado a seguir ao som. Sem gravação, o nome é falado na hora.
- A celebração do último par continua a esperar pelo fim de tudo (agora: som → nome → festa).
- Par errado ganha sinalização própria: as duas cartas balançam suavemente (shake curto, sem qualquer vermelho ou X) enquanto toca um som macio e grave (o `thump` dos quebra-cabeças) — neutro, nunca um som de castigo.

## Capabilities

### New Capabilities

_(nenhuma)_

### Modified Capabilities
- `memory-game`: "Acertar o par fala o nome e o som do animal" é removida e substituída por "Acertar o par: som do animal imediato, nome a seguir" (ordem invertida, sem esperas); "Casamento de pares" passa a exigir shake visível no par errado, além do som neutro.

## Impact

- `src/apps/MemoryApp.ts` — cadeia de `reveal()` invertida; classe `.wrong` no par errado.
- `src/apps/games.css` — keyframe do shake (aplicada no cartão exterior, não conflui com o flip 3D nem com o pop do par certo).
- Nenhum serviço muda: `speakName`, `cancelSpeech`, `playSound`, `thump` permanecem como estão; `primeOnGesture()` já garante que a fala async pós-áudio funciona em iOS (o primeiro pointerdown do documento liberta o motor de fala para todo o documento).
