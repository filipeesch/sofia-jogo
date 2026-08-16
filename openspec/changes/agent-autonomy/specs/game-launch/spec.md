## Purpose

Permite que um agente de IA inicie o jogo diretamente em um cenário específico em modo debug, sem um humano clicando pelo launcher ou subindo servidores.

## ADDED Requirements

### Requirement: Direct scenario deep-link
O jogo SHALL iniciar um cenário específico diretamente quando aberto com o parâmetro `level`, pulando o launcher.

#### Scenario: Open scenario by level id
- **WHEN** o jogo é aberto em `/?level=vale`
- **THEN** ele inicia direto no cenário "Vale Vivo" em vez de mostrar o launcher

#### Scenario: Vehicle selection via query
- **WHEN** o jogo é aberto em `/?level=vale&vehicle=car`
- **THEN** ele inicia o cenário com o carro (respeitando níveis exclusivos de avião)

### Requirement: Debug mode via query
O jogo SHALL habilitar o viewport de captura de debug quando aberto com `debug=1`.

#### Scenario: Debug capture active
- **WHEN** o jogo é aberto em `/?debug=1&level=vale`
- **THEN** o runtime expõe o controle de câmera e faz polling do capture server por comandos

### Requirement: Agent-orchestrated launch
Um comando de lançamento SHALL iniciar o capture server e o dev server quando não estiverem rodando e abrir o browser na URL de deep-link em modo debug.

#### Scenario: Launch with no servers running
- **WHEN** o agente executa o comando de lançamento para um cenário
- **THEN** ambos os servidores são iniciados e o browser abre em `http://localhost:5173/?debug=1&level=<id>&vehicle=<vehicle>`
