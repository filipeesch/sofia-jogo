# memory-game — Delta

## MODIFIED Requirements

### Requirement: Casamento de pares
Quando duas cartas reveladas mostram o mesmo animal, ambas SHALL ficar viradas para cima de forma definitiva e o jogo SHALL dar uma recompensa positiva (som de acerto, destaque na carta e o par fala o nome e o som do animal conforme a requirement "Acertar o par: som do animal imediato, nome a seguir"). Quando as duas cartas forem diferentes, o jogo SHALL dar um sinal visível do "não é este" — as duas cartas SHALL balançar suavemente — enquanto toca um som neutro e macio, em notas médias descendentes audíveis em qualquer altifalante (nunca um som de "erro"), sem qualquer fala; ambas SHALL virar para baixo depois de um curto atraso que permita à criança vê-las.

#### Scenario: Par encontrado
- **WHEN** a segunda carta revelada é igual à primeira
- **THEN** as duas cartas ficam para cima, tocam o som de acerto com o nome do animal falado, e o jogo aceita imediatamente o próximo par de toques

#### Scenario: Par errado
- **WHEN** a segunda carta revelada é diferente da primeira
- **THEN** as duas cartas balançam suavemente enquanto toca um som macio de duas notas médias a descer (audível nos altifalantes de tablet e telemóvel), sem fala nenhuma, e fecham-se depois de um atraso visível (~1 s), sem qualquer mensagem, símbolo ou cor de erro

#### Scenario: Toque durante a pausa do par errado
- **WHEN** a criança toca numa terceira carta enquanto as duas do par errado ainda estão abertas
- **THEN** o toque é ignorado até as cartas se fecharem (o jogo nunca fica com três cartas abertas)
