## Why

Os mundos 3D já têm animais interativos: a fazenda do Vale (2 vacas, 2 ovelhas, 2 galinhas, 1 cachorro, 1 gato e 3 patos) e os demais mundos (cachorros, gatos, galinhas e ovelhas espalhados). Hoje, clicar num animal reproduz um som sintetizado. O quebra-cabeça dos animais trouxe gravações reais em `public/sounds/`, e a criança já reconhece "o latido do cachorro" e "o moo da vaca" de lá — tocar a **mesma gravação real** quando ela clica no animal no mundo reforça a associação animal↔som em todo o jogo, sem custo de assets novos.

## What Changes

- Clicar num animal do mundo (qualquer fase) passa a reproduzir a **gravação real** da espécie (`sounds/{dog,cat,chicken,sheep,cow,duck}.mp3`) em vez do som sintetizado; o animal continua pulando (`hop()`).
- Reaproveita o módulo `src/ui/sounds.ts`: as 6 gravações são pré-carregadas na criação do mundo; se um arquivo não carregar (offline/falha), o **synth procedural equivalente** (o som de hoje, via `AudioManager`) toca como fallback.
- Interações de baleia, pássaros, nuvens e balões ficam **inalteradas** (não fazem parte do conjunto de 12 gravações).
- Nenhum novo asset: os 6 MP3s já viajam no build pelo quebra-cabeça.

## Capabilities

### New Capabilities

- `world-creatures`: animais interativos do mundo 3D — clique faz o animal pular e tocar a gravação real da espécie, com fallback procedural quando o arquivo não está disponível.

### Modified Capabilities

(nenhuma)

## Impact

- `src/core/Game.ts` (registro de clique dos creatures + preload das gravações).
- Sem novos arquivos ou assets; `public/sounds/*.mp3` já está no build.
- Sem impacto no quebra-cabeça dos animais, nos demais apps do launcher nem no pipeline de capture.
