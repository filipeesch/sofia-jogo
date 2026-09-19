# Spec Delta

## MODIFIED Requirements

### Requirement: A cena é debaixo de água

O brinquedo SHALL decorrer debaixo de água — água clara, feixes de luz e areia com dunas e grão no fundo — de modo que subir seja o comportamento natural das bolhas, com dois ou três peixes a nadar na cena, algas enraizadas na areia, conchas deitadas nela e dois cavalos-marinhos à deriva.

Todas as figuras da cena SHALL ser desenhadas pelo próprio brinquedo, num único traço reconhecível de uma figura para outra, e nenhuma figura nem o comando de soprar SHALL ser um glifo de emoji: os desenhos são nossos, para poderem ter detalhe, animar-se por dentro e não mudarem de aparência consoante o sistema de quem nos usa. O botão de voltar não é uma figura da cena e continua a reger-se pela capability `game-hud`.

#### Scenario: Cena ocupada sem poluição

- **WHEN** o app abre
- **THEN** a cena de água cobre o ecrã todo, sem qualquer barra de rolagem nem zona branca fora do ecrã, e as bolhas são sempre o elemento mais saliente da imagem

#### Scenario: Peixes presentes

- **WHEN** o app está aberto
- **THEN** há dois ou três peixes a atravessar a cena em ciclos próprios, sem nunca pararem nem saírem definitivamente

#### Scenario: Traço único, sem emoji

- **WHEN** a cena é inspecionada — peixes, algas, conchas, cavalos-marinhos e o comando de soprar
- **THEN** são todos desenhos do brinquedo com a mesma linguagem de sombra, contorno e brilho, e nenhuma personagem da cena é um glifo de emoji

#### Scenario: Nada é cortado num ecrã alto ou largo

- **WHEN** o app corre num ecrã largo deitado e num ecrã alto em pé
- **THEN** nenhuma figura do fundo fica cortada pelo rebordo do ecrã nem por baixo dos comandos

### Requirement: Vagas sem fim e sem derrota

O brinquedo SHALL organizar as bolhas em vagas que se sucedem para sempre, celebrando o fim de cada vaga, e NÃO SHALL ter pontuação, tempo limite, contagem de erros nem estado de "falhou". A celebração SHALL ser curta e NÃO SHALL atirar ícones do topo do ecrã: tudo o que aparece na cena é provocado por um gesto da criança ou pela subida das bolhas.

#### Scenario: Fim de vaga

- **WHEN** a criança estoura a última bolha de uma vaga
- **THEN** soa um jingle curto de vitória e uma nova vaga entra poucos instantes depois, com uma cor nova e formas de fogo ainda não usadas nesta sessão, sem nada cair do topo do ecrã

#### Scenario: Bolha que escapa

- **WHEN** uma bolha sobe até ao topo sem ser tocada
- **THEN** sai simplesmente pelo topo, sem som, sem marca e sem qualquer consequência, e a vaga pode ainda assim ser celebrada quando as restantes terminam

#### Scenario: Sem estado de derrota

- **WHEN** a criança não estoura absolutamente nenhuma bolha durante um minuto
- **THEN** nada acontece de negativo: não há mensagem, penalização, fim nem contagem visível de falhas

## ADDED Requirements

### Requirement: O fundo devolve o toque, sem voz e sem roubar nada

Cada elemento do fundo — alga, concha e cavalo-marinho — SHALL responder a um toque com um som seu, curtíssimo e mais baixo que o estouro de uma bolha, e com um movimento seu. Nenhum SHALL dizer palavra, dar pontos ou criar estado de acerto e erro.

O fundo SHALL viver por baixo das bolhas na ordem das camadas, de modo que onde uma bolha e um adorno se sobrepõem o toque pertença sempre à bolha: o cenário não pode tirar nada ao brinquedo.

#### Scenario: Cada elemento tem o seu gesto

- **WHEN** a criança toca uma alga, uma concha ou um cavalo-marinho
- **THEN** a alga abana para o lado oposto ao dedo e larga ar pelo pontal de cima, a concha fecha-se, reabre e assenta, e o cavalo-marinho dá um pulo com rebolado — cada um com o seu som

#### Scenario: Nada é dito

- **WHEN** a criança esgota os elementos do fundo a tocar
- **THEN** nenhuma utterance é produzida e nenhuma palavra aparece na cena

#### Scenario: Bolha ganha sempre a sobreposição

- **WHEN** uma bolha a subir se sobrepõe a um adorno do fundo
- **THEN** o toque naquele ponto vai para a bolha, e o adorno não reage

#### Scenario: O adorno não fica pendurado

- **WHEN** termina o gesto de reacção de um elemento do fundo
- **THEN** o elemento volta ao seu estado de repouso e nada fica a animar-se nem a soar depois de o gesto ter acabado
