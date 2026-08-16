## MODIFIED Requirements

### Requirement: Quadro de slots em silhueta
O puzzle SHALL exibir um slot por animal no quadro, cada um com a silhueta (fantasma) do animal correspondente, sem rótulos de nome ou número.

#### Scenario: Abertura do puzzle
- **WHEN** a criança abre o quebra-cabeça dos animais
- **THEN** o quadro exibe um slot de silhueta por animal disponível (12: cachorro, gato, galinha, ovelha, vaca, pato, porco, cavalo, leão, sapo, coruja e galo) e a bandeja exibe os mesmos animais em posições embaralhadas

#### Scenario: Slot já preenchido
- **WHEN** um slot já está preenchido com o animal correto
- **THEN** o slot fica marcado como ocupado (sem silhueta fantasma) e não aceita novo encaixe

### Requirement: Encaixe correto
Quando o animal é solto no slot correspondente (dentro de um raio de acerto generoso), o jogo SHALL encaixá-lo no slot e reproduzir a gravação real do som daquele animal.

#### Scenario: Solto no slot correto
- **WHEN** a criança solta o cachorro sobre o slot da silhueta de cachorro
- **THEN** o cachorro encaixa no slot com animação curta, a gravação do latido e um chime curto de acerto tocam, e um pequeno efeito visual (estrelas) aparece no slot

#### Scenario: Encaixe estável
- **WHEN** um animal está encaixado no seu slot
- **THEN** ele permanece no slot, centralizado, até o puzzle ser reiniciado

## ADDED Requirements

### Requirement: Sons reais com fallback procedural
Cada animal SHALL ter uma gravação real de MP3 (1–4 s) pré-carregada na abertura do app; o encaixe correto toca a gravação quando disponível e um som procedural equivalente quando o arquivo não pode ser carregado ou decodificado.

#### Scenario: Pré-carregamento na abertura
- **WHEN** a criança abre o quebra-cabeça
- **THEN** o jogo busca e decodifica as gravações em segundo plano, sem bloquear a interface, e o primeiro encaixe já toca a gravação real se os arquivos estiverem acessíveis

#### Scenario: Arquivo indisponível
- **WHEN** uma gravação não carrega (offline ou falha de rede) e a criança encaixa o animal correspondente
- **THEN** o encaixe acontece normalmente e toca o som procedural do animal em vez da gravação (o puzzle continua funcionando por completo)

#### Scenario: Crédito do áudio
- **WHEN** o projeto é distribuído
- **THEN** `docs/audio-credits.md` lista cada gravação e sua fonte, atendendo à atribuição exigida pela licença dos áudios
