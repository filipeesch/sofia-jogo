# Proposal

## Why

O adulto não ouve o som do par errado: «mal consigo ouvi-lo, tente outro». O `thump()` do par errado desliza de 150→90 Hz — uma senoza muito grave que os altifalantes minúsculos de tablet e telemóvel fisicamente não conseguem reproduzir (roll-off abaixo de ~200 Hz). O jogo toca-o, mas o hardware apaga-o.

## What Changes

- Novo som `missBoop()` em `sfx.ts`: um "ups" fofo — duas notas de triângulo em quinta banda média a descer (523→440 Hz, depois 392→330 Hz), volume 0.2/0.18, comparável ao `ding()` do acerto. O range 330–523 Hz é reproduzido por qualquer altifalante, por qualquer criança se ouve em qualquer dispositivo.
- `MemoryApp.ts`: o par errado passa de `thump()` para `missBoop()`. O shake suave das cartas e o resto do ritual não mudam.
- `thump()` mantém-se intacto — continua a ser o "erro" do quebra-cabeças, onde foi desenhado para o contexto de encaixar peças.

## Capabilities

### New Capabilities

_(nenhuma)_

### Modified Capabilities
- `memory-game`: "Casamento de pares" — o cenário "Par errado" passa a exigir um som macio **audível em qualquer altifalante** (notas médias descendentes), não apenas "grave".

## Impact

- `src/ui/sfx.ts` — mais uma função de 2 linhas.
- `src/apps/MemoryApp.ts` — troca de import e de chamada.
- Nenhum jogo além da Memória é afetado; o `thump` do quebra-cabeças não muda.
