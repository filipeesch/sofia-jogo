# Spec Delta

## Purpose

Define o fundo musical do app das bolhas: uma música contínua do mar, feita pelo
próprio brinquedo, que acompanha a criança sem nunca lhe disputar os estouros, e
que se apaga quando o brinquedo fecha.

## ADDED Requirements

### Requirement: O mar tem fundo musical

O app das bolhas SHALL ter, enquanto estiver aberto, uma música de fundo contínua
e sem emenda própria do mar — um balanço grave de ondulação distante, um acorde
lento que respira e, de quando em quando, uma nota isolada muito aguda e muito
curta. A música SHALL ser produzida pelo próprio brinquedo, sem ficheiros de som
para descarregar, e SHALL soar desde o primeiro instante em que o áudio do
navegador é permitido, sem nenhum botão de música.

A música SHALL usar a mesma escala de cinco notas dos estouros, por forma a que
uma bolha rebentada sobre a música soe a música e não a dois barulhos a
disputarem-se.

#### Scenario: Abrir e ouvir o mar

- **WHEN** a criança abre o app das bolhas e toca em qualquer coisa da cena
- **THEN** passa a ouvir-se um fundo contínuo de mar, sem cortes nem repeticões
  percetíveis, por cima do qual os estouros continuam a soar

#### Scenario: A nota solta não desafina com o estouro

- **WHEN** rebenta uma bolha no instante em que a música toca uma nota sua

- **THEN** as duas notas soam consonantes, sem choque nem dissonância de semitom

### Requirement: A música é fundo, nunca notícia

A música SHALL estar sempre a um volume nitidamente mais baixo que o estouro de
uma bolha e SHALL não ter ataques súbitos nem graves fortes: nada de estrondo,
de percussão marcada nem de nota em crescendo que possa assustar uma criança de
2 a 3 anos num tablet com o altifalante no máximo. A música SHALL dizer o que é
pelo timbre e pelo andamento lentos, não pelo volume.

Nada da música SHALL ser voz, palavra, canto ou som de animal nomeável: o
brinquedo continua a não falar.

#### Scenario: Uma bolha por cima da música

- **WHEN** a criança estoura uma bolha enquanto a música está no seu ponto mais
  alto
- **THEN** o estouro continua a ser o som mais saliente da mistura

#### Scenario: Nada de sustos

- **WHEN** a música corre durante um minuto
- **THEN** nenhum evento sonoro excede o volume de um estouro comum nem começa
  com um ataque súbito de grave

### Requirement: A música adormece com o brinquedo

A música SHALL parar quando a criança sai para o launcher, quando o ecrã se
bloqueia e quando o separador passa para segundo plano, e SHALL retomar onde
estava quando o app volta a estar visível. Enquanto o app estiver fechado não
pode haver música nenhuma a correr nem a acordar a página.

Sair do app das bolhas NÃO SHALL desligar o áudio dos outros apps: a música vai
embora com o brinquedo, não com o contexto de áudio partilhado.

#### Scenario: Voltar ao launcher a meio duma nota

- **WHEN** a criança volta ao launcher com a música a tocar
- **THEN** a música para imediatamente e o launcher fica silencioso

#### Scenario: Ecrã bloqueado

- **WHEN** o ecrã se bloqueia com o app aberto
- **THEN** a música para e não há nada agendado a acordar a página em segundo
  plano

#### Scenario: Segundo app aberto depois de sair

- **WHEN** a criança sai das bolhas e abre a pintura
- **THEN** o silêncio das bolhas é respeitado e os sons da pintura continuam a
  ouvir-se normalmente
