# memory-game Specification

## Purpose

Jogo da Memória com pares de animais para crianças pequenas: a criança revela cartas num grid silenciosamente e procura os pares; ao acertar um par, ouve de imediato o som do animal e, a seguir, o seu nome em pt-PT, com dificuldade (tamanho do grid) escolhida pelo adulto.

## Requirements

### Requirement: Seletor de tamanho do tabuleiro
O jogo SHALL exibir no topo, abaixo do cabeçalho com o botão 🏠, um seletor com exatamente três tamanhos de grid: 2x3 (3 pares), 3x4 (6 pares) e 4x5 (10 pares). O tamanho pré-definido é 3x4 e o último tamanho escolhido SHALL ser lembrado entre sessões.

#### Scenario: Abertura com preferência lembrada
- **WHEN** a criança abre o jogo depois de ter jogado no tamanho 4x5
- **THEN** o tabuleiro abre em 4x5 com o seletor marcado nesse tamanho

#### Scenario: Troca de tamanho a meio do jogo
- **WHEN** a criança (ou o adulto) escolhe outro tamanho no seletor com o jogo em curso
- **THEN** o jogo recomeça imediatamente com o novo grid, sem diálogo de confirmação

#### Scenario: Orientação da tela
- **WHEN** o tabuleiro é desenhado em retrato ou em paisagem
- **THEN** o grid usa o número de células do tamanho escolhido, distribuindo linhas e colunas de forma a caber no ecrã sem scroll

### Requirement: Revelação de carta silenciosa
Ao tocar numa carta virada para baixo, a carta SHALL virar mostrando o emoji do animal sem qualquer fala nem som. Tocar numa carta já revelada SHALL ser ignorado.

#### Scenario: Primeira carta do par
- **WHEN** a criança toca numa carta virada
- **THEN** a carta vira mostrando o animal e nenhum som ou fala é produzido

#### Scenario: Toque numa carta já revelada
- **WHEN** a criança toca numa carta que está virada para cima
- **THEN** nada acontece (a carta não bloqueia o jogo nem produz som)

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

### Requirement: Sorteio dos pares
A cada partida o jogo SHALL sortear do elenco dos 12 animais existentes exatamente N pares, onde N é metade do número de células do grid escolhido (3, 6 ou 10), e embaralhar as cartas; o embaralhamento SHALL ser repetido até a disposição ser diferente da partida anterior.

#### Scenario: Partida nova com sorteio
- **WHEN** o jogo abre ou é reiniciado em "Jogar de novo" com grid 3x4
- **THEN** 6 animais distintos (cada um em 2 cartas) são sorteados dos 12 e colocados em posições embaralhadas

### Requirement: Fim de partida celebrativo
Quando o último par for encontrado, o jogo SHALL celebrar com jingle e fala de celebração em pt-PT, manter todas as cartas visíveis e oferecer um botão "Jogar de novo" que reinicia com um novo sorteio. O jogo SHALL NOT ter pontuação, cronómetro ou estado de derrota (filosofia infantil do projeto).

#### Scenario: Último par
- **WHEN** o par final é casado
- **THEN** toca o jingle de vitória, é falada uma celebração, e aparece o botão "Jogar de novo"

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
