# bubbles-toy — deltas

## ADDED Requirements

### Requirement: Uma baleia passa pelo topo com sopro e boca

O mar SHALL ter UMA baleia desenhada pelo brinquedo a atravessar o topo do ecrã,
de um lado ao outro, em ciclo contínuo e ao dobro da lentidão do peixe mais
lento — o gigante da cena anda devagar. A sua entrada SHALL estar faseada por
um atraso que apanha o jogo já a meio da travessia: abrir o app não SHALL
mostrar um mar parado.

A forma da baleia SHALL ler-se como uma baleia: corpo de cabeça arredondada e
cauda erguida virado para a esquerda como os restantes bichos, barriga clara
pregueada sob a boca, barbatana peitoral visível sobre o flanco, olho com
brilho e um furinho no lombo. A silhueta do corpo, a boca aberta e a barbatana
ventral foram decalcadas, por descascador de contornos, de uma ilustração de
banco de imagem gratuito usada apenas como modelo de forma; nada do ficheiro
original é publicado e a origem é creditada no código.

A baleia SHALL animar-se sozinha, sem espera por toque: três bolhas de sopro
SHALL largar do lombo, subir, crescer e esvanecer-se em ciclo desencontrado, e
a boca SHALL fechar e reabrir devagar em torno da maxila de cima — ambas as
animações apenas de `transform` e `opacity`, como todo o resto da cena.

Tocada, SHALL dar uma cavalgada para o lado OPPOSTO ao dedo, escancarar a boca
de golpe, deitar ar pela boca e soltar um glup-glup — o mesmo som de bolhas do
peixe, boca a mexer com ar dentro. NÃO SHALL dizer palavra, dar pontos nem
criar bolha fora do que a criança pediu.

A baleia SHALL viver na mesma camada das figuras do fundo e SHALL entrar no DOM
antes dos peixes; a sua caixa de SVG é grande, por isso o toque SHALL pertencer
só ao corpo (não ao espaço do sopro nem aos cantos da moldura), e onde se
sobrepõe a uma bolha ou a um peixe o toque continua a ser da bolha ou do peixe.

#### Scenario: Atravessa o topo devagar, soprando

- **WHEN** o app está aberto e a cena é observada ao longo de um ciclo
- **THEN** a baleia entra por um lado do topo do ecrã, atravessa-o ao dobro da
  lentidão do peixe mais lento, com as bolhas do sopro a subir-lhe do lombo e a
  boca a fechar e reabrir sozinha, e volta a entrar

#### Scenario: O jogo não começa parado

- **WHEN** a criança abre as Bolhas
- **THEN** a baleia já vai a meio do ecrã a soprar, sem esperar um ciclo inteiro

#### Scenario: Parece uma baleia

- **WHEN** a baleia é vista ao tamanho do ecrã (~150 px de alto, folga do sopro
  incluída)
- **THEN** distinguem-se a cabeça redonda virada à esquerda, a barriga clara
  pregueada, a boca aberta, a barbatana peitoral, o olho com brilho e o sopro
  por cima, sem traço a mais que a faça ler como outro bicho

#### Scenario: Toca no corpo e ela responde

- **WHEN** a criança toca no corpo da baleia
- **THEN** ela cavalga para o lado oposto ao dedo, escancara a boca, deita ar
  pela boca e ouve-se um glup-glup, sem palavra nem ponto

#### Scenario: O céu do sopro não é alvo

- **WHEN** a criança toca no espaço acima do lombo, onde as bolhas do sopro
  crescem, ou num canto da moldura do desenho
- **THEN** a baleia não reage, e o toque segue o seu curso (bolha por baixo,
  ou nada)

#### Scenario: Passa por baixo do que é do brinquedo

- **WHEN** uma bolha a subir ou um peixe a passar se sobrepõem à baleia
- **THEN** o toque naquele ponto vai para a bolha ou para o peixe e a baleia
  não reage

#### Scenario: Continua barata como o resto da cena

- **WHEN** o check de fps mede a cena com a baleia a nadar, soprando sem parar
  e com o CPU 4× mais lento
- **THEN** o fps mediano mantém-se nos 60, nenhum frame é um corte visível, e
  as animações a decorrer somam ~40 a 43 — todas de `transform` e `opacity`
