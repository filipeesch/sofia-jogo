# bubbles-toy — deltas

## MODIFIED Requirements

### Requirement: Um caranguejo passeia pela areia

A areia SHALL ter um caranguejo desenhado pelo brinquedo a atravessar o fundo a
pé, de um lado ao outro, em ciclo contínuo — o único bicho da cena que anda em
vez de ser levado pela corrente. As patas SHALL mover-se em dois grupos que
alternam, porque um bicho de oito patas com as patas paradas é uma figura colada
no sítio.

A forma do caranguejo SHALL ler-se como um caranguejo a esta altura de ecrã:
carapaça mais larga do que alta, dois olhos brancos baixos na frente com dois
pontos de narina entre eles, duas antenas finas a sair do topo, uma tenaz
grande de cada lado com a fenda entre os dedos, e TREZ patas curtas por lado,
cada uma com o joelho articulado mais alto que o pé — porque pernas finas e
direitas fazem de um caranguejo uma aranha. A silhueta da carapaça e das tenazes
foi decalcada de uma gravura de domínio público, rasterizada e seguida por um
descascador de contornos; braços e patas são desenhados à mão sobre esse espaço
de coordenadas comum.

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

#### Scenario: Parece um caranguejo

- **WHEN** o caranguejo é visto a ~60 px de altura, ao tamanho do ecrã
- **THEN** distinguem-se a carapaça larga, as duas tenazes com fenda, os olhos
  baixos da frente e três patas curtas articuladas de cada lado, sem nenhum
  traço a mais que o faça ler como outro bicho

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
- **THEN** o caranguejo desce as tenazes, as patas voltam ao passo de passeio e
  continua a travessia como se nada fosse

## ADDED Requirements

### Requirement: Os cavalos-marinhos lêem-se como cavalos-marinhos

Os dois cavalos-marinhos do fundo SHALL ter a forma de um cavalo-marinho e não a
de um peixe com risca: corpo em curva de dois arcos (peito para fora, barriga
para dentro), cabeça em ângulo com o corpo acabada numa tromba comprida e curva,
uma crina curta e lisa no alto da cabeça — nunca pontas de sol nem cristas de
galo —, barbatana dorsal em leque na dobra das costas, cauda a afinar até se
fechar em caracol, e as costelas da barriga marcadas como gomos. As cores entre
os dois exemplares SHALL ser as únicas diferenças de desenho.

#### Scenario: Visto pequeno, continua a ser cavalo-marinho

- **WHEN** um cavalo-marinho deriva a ~100 px de altura no ecrã do tablet
- **THEN** lêem-se a tromba, o ângulo da cabeça, a cauda em caracol e a curva em
  S do corpo, sem nenhum elemento que pareça inventado
