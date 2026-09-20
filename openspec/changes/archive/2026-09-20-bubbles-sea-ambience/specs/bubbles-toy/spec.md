# Spec Delta

## ADDED Requirements

### Requirement: A ostra respira e guarda uma pérola

A areia SHALL ter pelo menos uma ostra desenhada pelo brinquedo, com uma pérola
guardada dentro. A ostra SHALL abrir-se e fechar-se sozinha, devagar e em ciclos
próprios, sem nada lhe ter pedido, e SHALL deitar bolhinhas de ar quando abre.
Esta respiração SHALL ser silenciosa: o que acontece por si não soa, para que o
som continue a ser sempre coisa que a criança provocou.

Tocada, a ostra SHALL abrir-se por completo, mostrar a pérola, fazer ouvir-se o
seu som e largar uma bolha a sério — das que se estouram — a subir da sua boca.
A oferta SHALL caber no limite do que cabe no ecrã: se já houver bolhas
demais, a ostra abre-se na mesma mas não cria bolha nenhuma.

A pérola não é um prémio nem um alvo: não dá pontos, não diz palavra e não há
maneira de a errar.

#### Scenario: Respira sem ninguém lhe tocar

- **WHEN** a cena está aberta e ninguém toca a ostra durante um minuto
- **THEN** a ostra abriu-se e fechou-se sozinha várias vezes, cada uma ao seu
  ritmo, e deitou bolhinhas de ar ao abrir

#### Scenario: Silêncio do que acontece por si

- **WHEN** a ostra se abre sozinha no ciclo dela
- **THEN** nenhum som é produzido

#### Scenario: Tocada, abre-se e oferece uma bolha

- **WHEN** a criança toca a ostra com bolha pouca no ecrã
- **THEN** a valva de cima levanta-se por inteiro, a pérola aparece, ouve-se o
  som da ostra e uma bolha sobe da boca dela, estourável como qualquer outra

#### Scenario: Não inunda o ecrã

- **WHEN** a criança toca uma ostra com o ecrã já cheio de bolhas
- **THEN** a ostra abre-se e soa na mesma, mas não nasce bolha nenhuma

#### Scenario: Não se abre debaixo de água fechada

- **WHEN** o ecrã se bloqueia ou o separador passa para segundo plano
- **THEN** as ostras deixam de se abrir, de respirar e de criar bolhas até o app
  voltar a estar visível

### Requirement: Um caranguejo passeia pela areia

A areia SHALL ter um caranguejo desenhado pelo brinquedo a atravessar o fundo a
pé, de um lado ao outro, em ciclo contínuo — o único bicho da cena que anda em
vez de ser levado pela corrente. As patas SHALL mover-se em dois grupos que
alternam, porque um bicho de oito patas com as patas paradas é uma figura colada
no sítio.

O caranguejo SHALL viver na mesma camada das restantes figuras do fundo e SHALL
entrar no DOM antes dos peixes: passa por cima das algas e das conchas, mas onde
se sobrepõe a uma bolha ou a um peixe o toque pertence à bolha ou ao peixe.

Tocado, SHALL assustar-se à sua maneira — tenazes para cima, patas a acelerar, um
passinho para o lado OPPOSTO ao dedo e um som seu, mais baixo que um estouro. NÃO
SHALL dizer palavra, dar pontos nem criar bolha fora do que a criança pediu.

#### Scenario: Atravessa o fundo a pé

- **WHEN** o app está aberto e a cena é observada ao longo de um ciclo
- **THEN** o caranguejo entra por um lado do ecrã, atravessa a areia até sair do
  outro, e volta a entrar, com as patas a alternar e o corpo a gingar

#### Scenario: Tocado, assusta-se sem dizer nada

- **WHEN** a criança toca no caranguejo
- **THEN** ele levanta as tenazes, as patas aceleram, dá um passinho para o lado
  oposto ao dedo e ouvem-se dois estalidos de tenaz mais baixos que um estouro,
  sem nenhuma palavra dita nem ponto marcado

#### Scenario: Passa por baixo do que é do brinquedo

- **WHEN** uma bolha a subir ou um peixe a passar se sobrepõem ao caranguejo
- **THEN** o toque naquele ponto vai para a bolha ou para o peixe e o caranguejo
  não reage

#### Scenario: Volta ao repouso

- **WHEN** termina o gesto de susto
- **THEN** as patas voltam ao passo de passeio, as tenazes descem e nenhuma
  animação de susto continua a correr

## MODIFIED Requirements

### Requirement: A cena é debaixo de água

O brinquedo SHALL decorrer debaixo de água — água clara, feixes de luz e areia com
dunas e grão no fundo — de modo que subir seja o comportamento natural das bolhas,
com dois ou três peixes a nadar na cena, algas enraizadas na areia, conchas
deitadas nela, ostras com pérola, um caranguejo a passear pela areia e dois
cavalos-marinhos à deriva.

Todas as figuras da cena SHALL ser desenhadas pelo próprio brinquedo, num único
traço reconhecível de uma figura para outra, e nenhuma figura nem o comando de
soprar SHALL ser um glifo de emoji: os desenhos são nossos, para poderem ter
detalhe, animar-se por dentro e não mudarem de aparência consoante o sistema de
quem nos usa. O botão de voltar não é uma figura da cena e continua a reger-se
pela capability `game-hud`.

#### Scenario: Cena ocupada sem poluição

- **WHEN** o app abre
- **THEN** a cena de água cobre o ecrã todo, sem qualquer barra de rolagem nem
  zona branca fora do ecrã, e as bolhas são sempre o elemento mais saliente da
  imagem

#### Scenario: Peixes presentes

- **WHEN** o app está aberto
- **THEN** há dois ou três peixes a atravessar a cena em ciclos próprios, sem
  nunca pararem nem saírem definitivamente

#### Scenario: Traço único, sem emoji

- **WHEN** a cena é inspecionada — peixes, algas, conchas, ostras,
  caranguejo, cavalos-marinhos e o comando de soprar
- **THEN** são todos desenhos do brinquedo com a mesma linguagem de sombra,
  contorno e brilho, e nenhuma personagem da cena é um glifo de emoji

#### Scenario: Nada é cortado num ecrã alto ou largo

- **WHEN** o app corre num ecrã largo deitado e num ecrã alto em pé
- **THEN** nenhuma figura do fundo fica cortada pelo rebordo do ecrã nem por
  baixo dos comandos

### Requirement: O fundo devolve o toque, sem voz e sem roubar nada

Cada elemento do fundo — alga, concha, ostra, caranguejo e cavalo-marinho — SHALL responder a
um toque com um som seu, curtíssimo e mais baixo que o estouro de uma bolha, e com
um movimento seu. Nenhum SHALL dizer palavra, dar pontos ou criar estado de acerto
e erro.

O fundo SHALL viver por baixo das bolhas na ordem das camadas, de modo que onde
uma bolha e um adorno se sobrepõem o toque pertença sempre à bolha: o cenário não
pode tirar nada ao brinquedo.

#### Scenario: Cada elemento tem o seu gesto

- **WHEN** a criança toca uma alga, uma concha, uma ostra, um caranguejo ou um
  cavalo-marinho
- **THEN** a alga abana para o lado oposto ao dedo e larga ar pelo pontal de
  cima, a concha fecha-se, reabre e assenta, a ostra levanta a valva e mostra a
  pérola, o caranguejo levanta as tenazes e acelera as patas, e o cavalo-marinho
  dá um pulo com rebolado — cada um com o seu som

#### Scenario: Nada é dito

- **WHEN** a criança esgota os elementos do fundo a tocar
- **THEN** nenhuma utterance é produzida e nenhuma palavra aparece na cena

#### Scenario: Bolha ganha sempre a sobreposição

- **WHEN** uma bolha a subir se sobrepõe a um adorno do fundo
- **THEN** o toque naquele ponto vai para a bolha, e o adorno não reage

#### Scenario: O adorno não fica pendurado

- **WHEN** termina o gesto de reacção de um elemento do fundo
- **THEN** o elemento volta ao seu estado de repouso e nada fica a animar-se nem
  a soar depois de o gesto ter acabado

### Requirement: Não incomodar os outros apps

O brinquedo das bolhas NÃO SHALL deixar nada a correr depois de a criança sair
para o launcher, incluindo criação de bolhas, fagulhas em voo, música de fundo,
respiração das ostras, o caranguejo a passear e áudio.

#### Scenario: Sair a meio de um fogo de artifício

- **WHEN** a criança volta ao launcher enquanto as fagulhas de uma gigante estão
  em voo
- **THEN** as fagulhas desaparecem todas, nada continua a ser criado nem a soar
  no launcher, e o áudio volta a ficar adormecido

#### Scenario: Ecrã bloqueado ou app para segundo plano

- **WHEN** o ecrã se bloqueia ou o separador passa para segundo plano com o app
  aberto
- **THEN** nenhuma bolha, fagulha ou abertura de ostra nova acontece e nada soa
  até o app voltar a estar visível

#### Scenario: Sair com as ostras a respirar

- **WHEN** a criança volta ao launcher enquanto uma ostra está a meio da sua
  abertura
- **THEN** nenhuma ostra continua a abrir-se nem a deitar bolhinhas no launcher
