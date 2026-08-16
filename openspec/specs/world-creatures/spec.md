# world-creatures Specification

## Purpose
Os animais que vivem no mundo 3D (fazenda do Vale e os mundos com animais vagando) são interativos: a criança os clica, eles pulam e tocam o som da própria espécie.

## Requirements

### Requirement: Animais interativos com som real
O jogo SHALL exibir animais clicáveis nos mundos — fazenda do Vale (vaca, ovelha, galinha, cachorro, gato e pato) e demais mundos (cachorro, gato, galinha e ovelha) — e, ao serem clicados, o animal SHALL pular e reproduzir a gravação real em MP3 da sua espécie.

#### Scenario: Clique na vaca
- **WHEN** a criança clica em uma vaca no mundo
- **THEN** a vaca dá um pulo e a gravação do "moo" real toca

#### Scenario: Cada espécie toca o seu som
- **WHEN** a criança clica animais de espécies diferentes
- **THEN** cada um reproduz a gravação da própria espécie (latido do cachorro, miado do gato, cotoco da galinha, balada da ovelha, moo da vaca, coaco do pato)

### Requirement: Fallback quando a gravação não está disponível
Quando a gravação do animal clicado não puder ser reproduzida, o jogo SHALL reproduzir um som procedural da espécie equivalente para que a interação continue dando feedback sonoro.

#### Scenario: Arquivo não carregou
- **WHEN** a criança clica um animal cujo MP3 não carregou (offline ou falha de rede)
- **THEN** o animal pula e um som procedural sintetizado da espécie toca no lugar da gravação

#### Scenario: Pré-carregamento na abertura do mundo
- **WHEN** a criança abre uma fase com animais
- **THEN** o jogo pré-carrega em segundo plano as gravações das espécies presentes, sem bloquear a tela, para que o primeiro clique já reproduza a gravação real
