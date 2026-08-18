## ADDED Requirements

### Requirement: Quadro de slots em silhueta
O puzzle de transportes SHALL exibir um slot por veículo no quadro (15 no total: carro, táxi, polícia, ambulância, bombeiro, caminhão, ônibus, bicicleta, motocicleta, trem, avião, helicóptero, foguete, veleiro e trator), cada um com a silhueta (fantasma) do veículo correspondente, sem rótulos de nome ou número.

#### Scenario: Abertura do puzzle
- **WHEN** a criança abre o quebra-cabeça de meios de transporte
- **THEN** o quadro exibe 15 slots de silhueta (5 por linha) e a bandeja exibe os mesmos 15 veículos em posições embaralhadas

#### Scenario: Slot já preenchido
- **WHEN** um slot já está preenchido com o veículo correto
- **THEN** o slot fica marcado como ocupado (sem silhueta fantasma) e não aceita novo encaixe

### Requirement: Arrastar e soltar o veículo
O veículo SHALL ser arrastado da bandeja com o ponteiro (mouse ou dedo), seguindo o ponteiro enquanto segurado, com área de toque generosa e sem depender de clique.

#### Scenario: Veículo segue o ponteiro
- **WHEN** a criança segura um veículo na bandeja e move o ponteiro
- **THEN** o veículo acompanha o ponteiro por cima de todos os elementos (bandeja, quadro, botões)

#### Scenario: Arraste por toque
- **WHEN** a criança arrasta um veículo com o dedo em tela sensível ao toque
- **THEN** o arraste funciona sem rolagem da página (pointer capture + touch-action none)

#### Scenario: Arraste cancelado
- **WHEN** o ponteiro é cancelado durante o arraste (pointercancel)
- **THEN** o veículo volta para a sua posição na bandeja, sem som de erro

### Requirement: Encaixe correto
Quando o veículo é solto perto do slot do próprio veículo (dentro de um raio de acerto bem generoso, medido em relação ao slot próprio), o jogo SHALL encaixá-lo no slot e reproduzir a gravação real do som daquele veículo.

#### Scenario: Solto no slot correto
- **WHEN** a criança solta o trem sobre o slot da silhueta de trem
- **THEN** o trem encaixa no slot com animação curta, a gravação do apito do trem e um chime curto de acerto tocam, e um pequeno efeito visual (estrelas) aparece no slot

#### Scenario: Solto quase certo, com slot vizinho mais próximo
- **WHEN** a criança solta um veículo perto da silhueta do próprio veículo, mas geometricamente mais perto do slot vizinho
- **THEN** o veículo encaixa no próprio slot — o jogo compara apenas a proximidade com o slot do veículo segurado

#### Scenario: Encaixe estável
- **WHEN** um veículo está encaixado no seu slot
- **THEN** ele permanece no slot, centralizado, até o puzzle ser reiniciado

### Requirement: Erro sem punição
Quando o veículo é solto longe do slot do próprio veículo, o jogo NÃO SHALL marcar falha, nem esconder o veículo; ele retorna suavemente à bandeja com um som bem suave.

#### Scenario: Solto no slot errado
- **WHEN** a criança solta o avião sobre o slot da silhueta de carro, longe do slot de avião
- **THEN** o avião não fica no slot, um som bem suave ("tum") toca e o avião desliza de volta para a sua posição na bandeja

#### Scenario: Toque simples não produz som
- **WHEN** a criança toca ou segura um veículo na bandeja sem arrastá-lo até um slot
- **THEN** nenhum som de veículo toca (o som é apenas a recompensa do encaixe correto)

### Requirement: Puzzle sem jeito de errar
O puzzle de transportes NÃO SHALL ter pontuação, timer, limite de tentativas ou estado de "falhou": a criança pode repetir tentativas indefinidamente.

#### Scenario: Tentativas ilimitadas
- **WHEN** a criança solta veículos em posições erradas várias vezes
- **THEN** o jogo continua aceitando novas tentativas, sem penalidade, mensagem de erro ou mudança de estado além do retorno à bandeja

### Requirement: Sons reais com fallback procedural
Cada veículo SHALL ter uma gravação real de MP3 pré-carregada na abertura do app; gravações com mais de 4 s são cortadas nos primeiros 4 s no momento da decodificação; o encaixe correto toca a gravação quando disponível e um som procedural equivalente quando o arquivo não pode ser carregado ou decodificado.

#### Scenario: Pré-carregamento na abertura
- **WHEN** a criança abre o quebra-cabeça de transportes
- **THEN** o jogo busca e decodifica as 15 gravações em segundo plano, sem bloquear a interface, e o primeiro encaixe já toca a gravação real se os arquivos estiverem acessíveis

#### Scenario: Gravação longa é cortada
- **WHEN** uma gravação tem mais de 4 s (ex.: trator, avião)
- **THEN** apenas os primeiros 4 s são mantidos no buffer, para o encaixe responder rápido

#### Scenario: Arquivo indisponível
- **WHEN** uma gravação não carrega (offline ou falha de rede) e a criança encaixa o veículo correspondente
- **THEN** o encaixe acontece normalmente e toca o som procedural do veículo em vez da gravação (o puzzle continua funcionando por completo)

#### Scenario: Crédito do áudio
- **WHEN** o projeto é distribuído
- **THEN** `docs/audio-credits.md` lista cada gravação e sua fonte, atendendo à atribuição exigida pela licença dos áudios

### Requirement: Celebração e reinício
Quando todos os veículos estiverem encaixados, o jogo SHALL celebrar com efeito de confete e um jingle de vitória, e oferecer jogar novamente.

#### Scenario: Quadro completo
- **WHEN** o último veículo encaixa no seu slot
- **THEN** confete aparece sobre o quadro, um jingle curto de vitória toca e o botão "Jogar de novo" fica visível ao lado do botão de voltar ao launcher

#### Scenario: Jogar de novo
- **WHEN** a criança toca "Jogar de novo"
- **THEN** o quadro é limpo, os veículos voltam para a bandeja com novo embaralhamento (ordem sempre diferente da anterior) e o jogo recomeça
