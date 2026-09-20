# sea-ambience — deltas

## MODIFIED Requirements

### Requirement: O mar tem fundo musical

O app das bolhas SHALL ter, enquanto estiver aberto, uma música de fundo contínua
e sem emenda própria do mar, construída com o MESMO padrão da canção do jogo do
avião — um sequenciador de dezasseis passos que, a cada passo, toca um grave na
primeira nota de cada compasso, uma nota do acorde em todos os passos e, quando
a melodia pede, uma nota da melodia por cima — com as notas, o andamento e o
timbre adaptados ao fundo do mar: marulho grave filtrado que respira devagar, um
bordão único e contínuo por baixo, sinos macios na voz da melodia e, de quando
em quando, uma bolha que sobe em arpejo. A música SHALL ser produzida pelo
próprio brinquedo, sem ficheiros de som para descarregar, e SHALL soar desde o
primeiro instante em que o áudio do navegador é permitido, sem nenhum botão de
música.

A música SHALL usar a mesma escala de cinco notas dos estouros — e só essas
notas na melodia —, por forma a que uma bolha rebentada sobre a música soe a
música e não a dois barulhos a disputarem-se.

#### Scenario: Abrir e ouvir o mar

- **WHEN** a criança abre o app das bolhas e toca em qualquer coisa da cena
- **THEN** passa a ouvir-se um fundo contínuo de mar, sem cortes nem repeticões
  percetíveis, por cima do qual os estouros continuam a soar

#### Scenario: A nota solta não desafina com o estouro

- **WHEN** rebenta uma bolha no instante em que a música toca uma nota sua

- **THEN** as duas notas soam consonantes, sem choque nem dissonância de semitom

#### Scenario: Reconhece-se o padrão do avião

- **WHEN** a música corre por uma volta completa dos dezasseis passos
- **THEN** ouve-se a mesma estrutura grave-acorde-melodia do jogo do avião, em
  andamento mais lento e com os timbres do mar, sem a caixinha de música nem o
  zumbido do motor
