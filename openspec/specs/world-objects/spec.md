# world-objects Specification

## Purpose
Os objetos do céu que a criança pode tocar (nuvens e balões) têm sons de interação próprios, coerentes com o que acontece na tela quando são clicados.

## Requirements

### Requirement: Som próprio de nuvem
Quando a criança clica em uma nuvem, o jogo SHALL reproduzir um som procedural de dispersão suave ("psshh" + brilhos etéreos), distinto dos sons usados em outros objetos (casas, balões, animais).

#### Scenario: Clique na nuvem
- **WHEN** a criança clica numa nuvem e ela estoura em partículas brancas
- **THEN** um "psshh" suave de ruído filtrado com dois tintles curtos em subida toca, combinando com as partículas subindo

#### Scenario: Distinto das casas
- **WHEN** a criança clica numa nuvem e depois numa casa
- **THEN** cada um toca um som diferente (a nuvem não toca mais o "plim" genérico da casa)

### Requirement: Som próprio de balão
Quando a criança clica em um balão, o jogo SHALL reproduzir um "boing" de borracha (pitch que despenca e volta com leve wobble), coerente com o squash do balão ao ser clicado.

#### Scenario: Clique no balão
- **WHEN** a criança clica num balão e ele amassa e volta ao formato original
- **THEN** um "boing" de borracha com wobble toca, no lugar do "pop" curto anterior
