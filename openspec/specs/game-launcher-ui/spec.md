# game-launcher-ui Specification

## Purpose

O ecrã "Meus Joguinhos" (launcher): a porta de entrada de todos os mini-jogos, acessível em qualquer tamanho de ecrã — rolável por toque em telemóvel — sem interferir com os gestos travados dos jogos.

## Requirements

### Requirement: Launcher rolável em ecrãs pequenos
O ecrã do launcher SHALL dar acesso a todos os jogos em qualquer tamanho de ecrã: quando a grelha não couber na viewport, o launcher SHALL ser rolável por toque vertical (e por roda/teclado no desktop), sem corta conteúdo por centering, e sem que o gesto de rolar abra jogo algum. O scroll do launcher SHALL conter a propagação (sem scroll chain para a página) e SHALL respeitar as safe areas do iOS em baixo. Durante o launcher, o comportamento de toque da página passa a permitir pan vertical; ao entrar em qualquer jogo SHALL voltar ao estado travado atual (`touch-action: none`), sem alterar os gestos dentro dos jogos.

#### Scenario: Jogar fora do ecrã fica acessível
- **WHEN** o launcher é aberto num ecrã onde a grelha não cabe (ex.: 390×664 com 12 jogos)
- **THEN** um arrasto de toque vertical rola o launcher até a última fila ficar totalmente visível e tocável

#### Scenario: Rolar não abre jogos
- **WHEN** a criança começa um arrasto de scroll em cima de um cartão do launcher
- **THEN** o launcher rola e nenhum jogo é aberto no fim do gesto

#### Scenario: Toque num cartão abre o jogo
- **WHEN** a criança toca (sem arrastar) num cartão do launcher
- **THEN** o jogo correspondente abre como hoje

#### Scenario: Jogos mantêm os gestos travados
- **WHEN** um jogo é aberto a partir do launcher rolável
- **THEN** o `touch-action` da página volta a `none` e nenhum gesto dentro do jogo muda de comportamento

#### Scenario: Conteúdo cabe — sem scroll
- **WHEN** o launcher é aberto num ecrã onde a grelha cabe (tablet/desktop)
- **THEN** o conteúdo fica centrado como hoje e não há scroll nem barras visíveis
