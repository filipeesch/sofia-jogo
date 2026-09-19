# game-hud Specification

## Purpose
Define o HUD do Avião Aventureiro e do Carro Aventureiro — o contador de estrelas, o botão de regresso ao launcher, o botão de ação especial e o seletor de modo trilho/manual — e, sobretudo, o espaço que esses elementos podem ocupar: têm de ser alvos tocáveis pequenos e previsíveis, nunca faixas que tapem ou roubem toques ao mundo 3D.

## Requirements

### Requirement: Botão de regresso ao launcher com forma e lugar estáveis

O botão que devolve a criança ao launcher SHALL ser apresentado como um alvo circular, de diâmetro comparável ao dos outros botões flutuantes do HUD (entre 64 e 88 px conforme o tamanho do ecrã), junto ao canto superior direito, independentemente do veículo, do cenário ou da orientação do dispositivo.

#### Scenario: Cenário de carro

- **WHEN** a criança entra num cenário com carro
- **THEN** o botão de regresso aparece como um círculo no canto superior direito, com a mesma altura e largura, e o ícone de casa centrado dentro dele

#### Scenario: Cenário de avião

- **WHEN** a criança entra num cenário com avião
- **THEN** o botão de regresso tem exatamente a mesma forma, tamanho e posição que no carro

#### Scenario: Rotação ou redimensionamento do ecrã

- **WHEN** o ecrã muda de tamanho ou de orientação com um jogo em curso
- **THEN** o botão continua circular e dentro do ecrã, e nunca se estende por mais de 15 % da largura nem por mais de 15 % da altura visíveis

#### Scenario: Ecrã tão estreito que as duas regras não cabem

- **WHEN** a largura visível é tal que 15 % dela fica abaixo dos 64 px da banda do requisito (a ~427 px de largura para baixo)
- **THEN** o botão mantém os 64 px mínimos — um alvo mais pequeno que isso deixa de ser tocável por uma criança de 2-3 anos, e é o alvo que manda, não a percentagem

### Requirement: O HUD não captura toques fora dos seus alvos

Os elementos do HUD NÃO SHALL ocupam nem interceptar toques fora da sua área visível: tudo o que estiver fora dos botões e do contador tem de continuar a chegar ao jogo.

#### Scenario: Tocar o mundo longe dos botões

- **WHEN** a criança toca no mundo 3D fora de qualquer elemento do HUD
- **THEN** o toque é entregue ao jogo (por exemplo, um animal clicável reage) e nenhum botão do HUD intercepta o gesto

#### Scenario: Nenhum elemento se estende pela área jogável

- **WHEN** um cenário é carregado e o HUD é desenhado
- **THEN** a área somada dos elementos do HUD não cobre faixas verticais ou horizontais contíguas do ecrã: cada um fica confinado ao seu canto ou à sua posição prevista

### Requirement: O seletor de fases mantém o ecrã inteiro

O seletor de fases SHALL continuar a ocupar o ecrã todo, com o seu fundo próprio, depois de os botões flutuantes passarem a partilhar menos nomes de estilo com as telas.

#### Scenario: Abrir o seletor de fases

- **WHEN** a criança abre o Avião ou o Carro a partir do launcher
- **THEN** o seletor de fases cobre o ecrã inteiro, com o fundo azul de início visível de bordo a bordo, e os cartões das fases ficam centrados

#### Scenario: Voltar do seletor para o launcher

- **WHEN** a criança sai de um jogo para o launcher
- **THEN** nem o seletor de fases nem o HUD deixam elementos visíveis ou tocáveis sobre o launcher
