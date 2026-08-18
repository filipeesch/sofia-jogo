## MODIFIED Requirements

### Requirement: Encaixe correto
Quando o animal é solto perto do slot do próprio animal (dentro de um raio de acerto bem generoso), o jogo SHALL encaixá-lo no slot e reproduzir a gravação real do som daquele animal. O raio é medido em relação ao **slot do próprio animal**, de modo que não importa se outro slot estiver mais próximo.

#### Scenario: Solto no slot correto
- **WHEN** a criança solta o cachorro sobre o slot da silhueta de cachorro
- **THEN** o cachorro encaixa no slot com animação curta, a gravação do latido e um chime curto de acerto tocam, e um pequeno efeito visual (estrelas) aparece no slot

#### Scenario: Solto quase certo, com slot vizinho mais próximo
- **WHEN** a criança solta o cachorro perto da silhueta de cachorro, mas geometricamente mais perto do slot do gato (ainda fora do raio do slot do gato)
- **THEN** o cachorro encaixa no próprio slot — o jogo compara apenas a proximidade com o slot do animal segurado

#### Scenario: Encaixe estável
- **WHEN** um animal está encaixado no seu slot
- **THEN** ele permanece no slot, centralizado, até o puzzle ser reiniciado

### Requirement: Arrastar e soltar o animal
O animal SHALL ser arrastado da bandeja com o ponteiro (mouse ou dedo), seguindo o ponteiro enquanto segurado, com área de toque generosa e sem depender de clique.

#### Scenario: Animal segue o ponteiro
- **WHEN** a criança segura um animal na bandeja e move o ponteiro
- **THEN** o animal acompanha o ponteiro por cima de todos os elementos (bandeja, quadro, botões)

#### Scenario: Arraste por toque
- **WHEN** a criança arrasta um animal com o dedo em tela sensível ao toque
- **THEN** o arraste funciona sem rolagem da página (pointer capture + touch-action none)

#### Scenario: Arraste cancelado
- **WHEN** o ponteiro é cancelado durante o arraste (pointercancel)
- **THEN** o animal volta para a sua posição na bandeja, sem som de erro

#### Scenario: Bandeja sempre diferente
- **WHEN** o puzzle é aberto ou reiniciado com "Jogar de novo"
- **THEN** a ordem das peças na bandeja é sempre diferente da ordem anterior (o embaralhamento é repetido até mudar)
