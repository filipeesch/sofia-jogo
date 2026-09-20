# Spec Delta

## ADDED Requirements

### Requirement: Acertar o par fala o nome e o som do animal
Quando um par é encontrado, o jogo SHALL falar o nome do animal em pt-PT uma única vez e, quando existir gravação do som do animal, esse som SHALL tocar depois de terminar a fala (comportamento `speak` + `soundAfter` dos quebra-cabeças), como recompensa do acerto.

#### Scenario: Par encontrado fala o nome
- **WHEN** a segunda carta revelada fecha um par
- **THEN** o nome do animal é falado uma única vez

#### Scenario: Som do bicho depois da fala
- **WHEN** o par casado tem gravação do som do animal
- **THEN** o som toca imediatamente depois de terminar a fala do nome

#### Scenario: Voltar ao launcher a meio de uma fala
- **WHEN** a criança toca no botão 🏠 enquanto um nome está a ser falado
- **THEN** a fala é cortada imediatamente e o launcher é mostrado

### Requirement: Revelação de carta silenciosa
Ao tocar numa carta virada para baixo, a carta SHALL virar mostrando o emoji do animal sem qualquer fala nem som. Tocar numa carta já revelada SHALL ser ignorado.

#### Scenario: Primeira carta do par
- **WHEN** a criança toca numa carta virada
- **THEN** a carta vira mostrando o animal e nenhum som ou fala é produzido

#### Scenario: Toque numa carta já revelada
- **WHEN** a criança toca numa carta que está virada para cima
- **THEN** nada acontece (a carta não bloqueia o jogo nem produz som)

## REMOVED Requirements

### Requirement: Revelar carta fala o nome do animal
**Reason**: A fala a cada revelação fazia dois toques rápidos cortarem a palavra um do outro; o adulto pediu nome e som do animal somente quando a criança acerta o par.
**Migration**: O nome e o som do animal passam a ser tocados no momento do acerto, cobertos pela requirement "Acertar o par fala o nome e o som do animal"; a revelação passa a ser silenciosa, descrita na requirement "Revelação de carta silenciosa".

## MODIFIED Requirements

### Requirement: Casamento de pares
Quando duas cartas reveladas mostram o mesmo animal, ambas SHALL ficar viradas para cima de forma definitiva e o jogo SHALL dar uma recompensa positiva (som de acerto, destaque na carta e o par fala o nome e o som do animal conforme a requirement "Acertar o par fala o nome e o som do animal"). Quando as duas cartas forem diferentes, o jogo SHALL tocar um som neutro (nunca um som de "erro"), sem qualquer fala, e ambas SHALL virar para baixo depois de um curto atraso que permita à criança vê-las.

#### Scenario: Par encontrado
- **WHEN** a segunda carta revelada é igual à primeira
- **THEN** as duas cartas ficam para cima, tocam o som de acerto com o nome do animal falado, e o jogo aceita imediatamente o próximo par de toques

#### Scenario: Par errado
- **WHEN** a segunda carta revelada é diferente da primeira
- **THEN** toca um som suave e neutro sem fala nenhuma, e as duas cartas fecham-se depois de um atraso visível (~1 s), sem qualquer mensagem de erro

#### Scenario: Toque durante a pausa do par errado
- **WHEN** a criança toca numa terceira carta enquanto as duas do par errado ainda estão abertas
- **THEN** o toque é ignorado até as cartas se fecharem (o jogo nunca fica com três cartas abertas)
