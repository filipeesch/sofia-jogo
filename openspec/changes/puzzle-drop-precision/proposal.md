## Why

O encaixe do quebra-cabeça ainda é "errático" para a mão de uma criança de 2–3 anos: o hit-test atual escolhe o **slot mais próximo** e só aceita se for o slot certo — então soltar quase certo, mas com um slot vizinho um pouquinho mais perto, gera "tum" de erro. A regra precisa ser mais simples e generosa: **perto da silhueta do próprio animal, encaixa; em qualquer outro lugar, volta suave**.

## What Changes

- **Novo hit-test simplificado**: ao soltar, o jogo mede a distância até o **centro do slot do próprio animal**; dentro de um raio bem generoso (~1× o tamanho do slot) o animal encaixa — mesmo que outro slot esteja geometricamente mais próximo. Fora do raio: som suave + retorno à bandeja (sem punição, como hoje).
- **Bandeja sempre visivelmente embaralhada**: o shuffle agora garante que a ordem das peças difere da ordem anterior (re-embalhamento até mudar), tanto na abertura quanto no "Jogar de novo".
- **Imagens maiores**: o quadro passa a 4 colunas e slots/peças crescem (slot 60–84 px, peça 56–72 px), mantendo os 12 animais dentro de 720p e tablet em pé.
- Regras intactas: silhueta sem rótulo, toque simples sem som, erro sem punição, celebração e reinício.

## Capabilities

### New Capabilities

(nenhuma)

### Modified Capabilities

- `animal-puzzle`: o raio de encaixe passa a ser medido em relação ao slot do próprio animal (mais generoso e previsível) e a bandeja garante embaralhamento visível.

## Impact

- `src/apps/AnimalsApp.ts` (novo hit-test, shuffle com garantia).
- `src/style.css` (4 colunas, dimensões maiores).
- Sem impacto no jogo 3D, nos sons nem nos demais apps.
