# memory-game — Delta

## MODIFIED Requirements

### Requirement: Casamento de pares
Quando duas cartas reveladas mostram o mesmo animal, ambas SHALL ficar viradas para cima de forma definitiva e o jogo SHALL dar uma recompensa positiva (som de acerto, destaque na carta e o par fala o nome e o som do animal conforme a requirement "Acertar o par: som do animal imediato, nome a seguir"). Quando as duas cartas forem diferentes, o jogo SHALL dar um sinal visível do "não é este" — as duas cartas SHALL balançar suavemente — enquanto toca um som neutro e macio (nunca um som de "erro"), sem qualquer fala; ambas SHALL virar para baixo depois de um curto atraso que permita à criança vê-las.

#### Scenario: Par encontrado
- **WHEN** a segunda carta revelada é igual à primeira
- **THEN** as duas cartas ficam para cima, tocam o som de acerto com o nome do animal falado, e o jogo aceita imediatamente o próximo par de toques

#### Scenario: Par errado
- **WHEN** a segunda carta revelada é diferente da primeira
- **THEN** as duas cartas balançam suavemente enquanto toca um som grave e macio, sem fala nenhuma, e fecham-se depois de um atraso visível (~1 s), sem qualquer mensagem, símbolo ou cor de erro

#### Scenario: Toque durante a pausa do par errado
- **WHEN** a criança toca numa terceira carta enquanto as duas do par errado ainda estão abertas
- **THEN** o toque é ignorado até as cartas se fecharem (o jogo nunca fica com três cartas abertas)

## REMOVED Requirements

### Requirement: Acertar o par fala o nome e o som do animal
**Reason**: a ordem definida na mudança anterior (fala completa → som do bicho) introduce um atraso de 2–3 s até ao som do animal — a síntese de voz pode começar ~1,6 s depois e o watchdog de fim estica a espera; para uma criança de 2-3 anos perde-se o vínculo entre o acerto e o som.
**Migration**: substituída por "Acertar o par: som do animal imediato, nome a seguir", que mantém o nome pt-PT uma única vez como recompensa do acerto, mas toca a gravação de imediato e fala o nome a seguir ao som.

## ADDED Requirements

### Requirement: Acertar o par: som do animal imediato, nome a seguir
Quando um par é encontrado, o som do animal SHALL tocar de imediato, no mesmo toque que fecha o par, sem esperar por qualquer fala; quando existir gravação do som do animal, ela SHALL ser a primeira coisa a soar, logo após o som de acerto. O nome do animal SHALL ser falado em pt-PT uma única vez, a seguir ao fim do som; quando não existir gravação, o nome SHALL ser falado de imediato, acompanhado do som procedural do animal quando existir. A celebração do fim de partida SHALL aguardar o fim de tudo do último par.

#### Scenario: Som do bicho chega sem espera
- **WHEN** a criança acerta um par de um animal que tem gravação
- **THEN** a gravação do animal começa imediatamente após o toque, sem esperar por fala nenhuma

#### Scenario: Nome falado a seguir ao som
- **WHEN** termina o som do animal recém-acertado
- **THEN** o nome do animal é falado uma única vez em pt-PT

#### Scenario: Sem gravação, nome na hora
- **WHEN** o par acertado é de um animal sem ficheiro de som
- **THEN** o nome é falado de imediato (acompanhado do som procedural do animal, quando existir)

#### Scenario: Celebração espera pelo último animal
- **WHEN** o último par acertado tem som ou nome em curso
- **THEN** o jingle e a fala de celebração só começam depois de o nome desse animal terminar

#### Scenario: Voltar ao launcher a meio de uma fala
- **WHEN** a criança toca no botão 🏠 enquanto um nome está a ser falado
- **THEN** a fala é cortada imediatamente e o launcher é mostrado
