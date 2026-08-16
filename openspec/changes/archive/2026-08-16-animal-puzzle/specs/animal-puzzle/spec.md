## Purpose

Quebra-cabeça de encaixe dos animais para crianças de 2–3 anos: a criança arrasta cada animal da bandeja até o slot de silhueta correspondente no quadro; o som do animal só toca como recompensa quando ele é encaixado na posição correta. Sem pontuação, timer ou estado de "errou" — o som é o feedback e o objetivo.

## ADDED Requirements

### Requirement: Quadro de slots em silhueta
O puzzle SHALL exibir um slot por animal no quadro, cada um com a silhueta (fantasma) do animal correspondente, sem rótulos de nome ou número.

#### Scenario: Abertura do puzzle
- **WHEN** a criança abre o quebra-cabeça dos animais
- **THEN** o quadro exibe um slot de silhueta por animal disponível (6) e a bandeja exibe os mesmos animais em posições embaralhadas

#### Scenario: Slot já preenchido
- **WHEN** um slot já está preenchido com o animal correto
- **THEN** o slot fica marcado como ocupado (sem silhueta fantasma) e não aceita novo encaixe

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

### Requirement: Encaixe correto
Quando o animal é solto no slot correspondente (dentro de um raio de acerto generoso), o jogo SHALL encaixá-lo no slot e reproduzir o som daquele animal.

#### Scenario: Solto no slot correto
- **WHEN** a criança solta o cachorro sobre o slot da silhueta de cachorro
- **THEN** o cachorro encaixa no slot com animação curta, o som do cachorro e um chime curto de acerto tocam, e um pequeno efeito visual (estrelas) aparece no slot

#### Scenario: Encaixe estável
- **WHEN** um animal está encaixado no seu slot
- **THEN** ele permanece no slot, centralizado, até o puzzle ser reiniciado

### Requirement: Erro sem punição
Quando o animal é solto em um slot errado ou fora de qualquer slot, o jogo NÃO SHALL marcar falha, nem esconder o animal; ele retorna suavemente à bandeja com um som bem suave.

#### Scenario: Solto no slot errado
- **WHEN** a criança solta o gato sobre o slot da silhueta de cachorro
- **THEN** o gato não fica no slot, um som bem suave ("tum") toca e o gato desliza de volta para a sua posição na bandeja

#### Scenario: Toque simples não produz som
- **WHEN** a criança toca ou segura um animal na bandeja sem arrastá-lo até um slot
- **THEN** nenhum som de animal toca (o som é apenas a recompensa do encaixe correto)

### Requirement: Puzzle sem jeito de errar
O puzzle NÃO SHALL ter pontuação, timer, limite de tentativas ou estado de "falhou": a criança pode repetir tentativas indefinidamente.

#### Scenario: Tentativas ilimitadas
- **WHEN** a criança solta animais em posições erradas várias vezes
- **THEN** o jogo continua aceitando novas tentativas, sem penalidade, mensagem de erro ou mudança de estado além do retorno à bandeja

### Requirement: Celebração e reinício
Quando todos os animais estiverem encaixados, o jogo SHALL celebrar com efeito de confete e um jingle de vitória, e oferecer jogar novamente.

#### Scenario: Quadro completo
- **WHEN** o último animal encaixa no seu slot
- **THEN** confete aparece sobre o quadro, um jingle curto de vitória toca e o botão "Jogar de novo" fica visível ao lado do botão de voltar ao launcher

#### Scenario: Jogar de novo
- **WHEN** a criança toca "Jogar de novo"
- **THEN** o quadro é limpo, os animais voltam para a bandeja com novo embaralhamento e o jogo recomeça
