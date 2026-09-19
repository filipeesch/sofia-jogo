## Purpose

Permite que um agente de IA posicione a câmera do jogo em coordenadas exatas e capture frames PNG ou vídeos curtos da cena em execução para revisão visual.

## ADDED Requirements

### Requirement: Instant camera positioning
O viewport de debug SHALL mover a câmera para a posição e orientação solicitadas imediatamente, sem animação ou interpolação.

#### Scenario: Set view teleports instantly
- **WHEN** o agente solicita uma view com posição de câmera e alvo de look-at
- **THEN** a câmera fica na posição exata solicitada e olhando para o alvo no próximo frame renderizado

### Requirement: Waypoint sweep without motion
O comando sweep SHALL capturar um frame por waypoint, teleportando a câmera diretamente para cada waypoint sem animar entre eles.

#### Scenario: Sweep captures teleported frames
- **WHEN** o agente solicita um sweep de N waypoints
- **THEN** o jogo teleporta a câmera para cada waypoint e captura exatamente um frame por waypoint, sem movimento interpolado entre frames

### Requirement: Capture artifacts
Snaps e gravações SHALL ser escritos no diretório de capturas e listados pelo capture server.

#### Scenario: Snapshot persists
- **WHEN** um snap conclui
- **THEN** um arquivo PNG é salvo em `_shots/` e aparece na lista de capturas
