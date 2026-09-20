# tic-tac-toe Specification

## Purpose

Jogo do Galo (tic-tac-toe 3x3 com X e O) para a criança: modo de dois jogadores no mesmo ecrã ou contra a CPU em três calibrações de dificuldade, com feedback de vitória celebrativo e sem drama de perdedor.

## Requirements

### Requirement: Seletor de modo no topo
O jogo SHALL exibir no topo, abaixo do cabeçalho com o botão 🏠, um seletor com exatamente quatro modos: "2 Jogadores", "CPU Fácil", "CPU Média" e "CPU Difícil". O modo pré-definido é "CPU Fácil" e o último modo escolhido SHALL ser lembrado entre sessões.

#### Scenario: Abertura com preferência lembrada
- **WHEN** a criança abre o jogo depois de ter jogado em "CPU Difícil"
- **THEN** o jogo abre em "CPU Difícil" com o seletor marcado nesse modo

#### Scenario: Troca de modo a meio do jogo
- **WHEN** é escolhido outro modo com o tabuleiro em curso
- **THEN** o tabuleiro é limpo e uma nova partida começa nesse modo, sem diálogo de confirmação

### Requirement: Tabuleiro e colocação de peças
O jogo SHALL apresentar um tabuleiro 3x3 de células grandes e tocáveis onde as jogadas alternam X e O. Uma célula ocupada SHALL recusar nova jogada sem qualquer penalização, e só a jogada do turno atual é aceite. Um indicador visual SHALL mostrar a vez de quem joga (peça do turno destacada junto ao tabuleiro), sem depender de texto.

#### Scenario: Jogada válida
- **WHEN** é a vez do X e a criança toca numa célula vazia
- **THEN** a célula é marcada com X, toca um som suave de colocação, e o indicador passa a mostrar O

#### Scenario: Célula ocupada
- **WHEN** um jogador toca numa célula já marcada
- **THEN** nada acontece: a marca não muda e o turno não avança

#### Scenario: Colocar peça não desloca o tabuleiro
- **WHEN** uma peça é colocada em qualquer célula
- **THEN** o retângulo de todas as outras nove células permanece exatamente na mesma posição e tamanho

#### Scenario: Voltar ao launcher
- **WHEN** o botão 🏠 é tocado a qualquer momento da partida
- **THEN** o launcher é mostrado imediatamente e nenhuma jogada ou som do jogo continua

### Requirement: Calibração das três dificuldades da CPU
No modo contra a CPU, a CPU SHALL jogar a peça O e a criança SHALL jogar X e abrir sempre a partida. A CPU Fácil SHALL escolher uma célula vazia aleatória. A CPU Média SHALL bloquear a vitória iminente do adversário quando existir uma e só uma célula de bloqueio e, caso contrário, jogar aleatoriamente. A CPU Difícil SHALL jogar de forma imbatível (minimax). A jogada da CPU SHALL ocorrer com um atraso curto (~0,5–1 s) após a jogada do jogador, para ser legível por uma criança.

#### Scenario: CPU Fácil não bloqueia
- **WHEN** no modo Fácil o jogador ameaça ganhar em duas células e a CPU joga
- **THEN** a CPU escolhe qualquer célula vazia, podendo inclusive ganhar se o aleatório a levar até lá

#### Scenario: CPU Média bloqueia ameaça direta
- **WHEN** no modo Médio o jogador tem duas peças numa linha com a terceira célula vazia
- **THEN** a CPU marca exatamente essa célula de bloqueio

#### Scenario: CPU Difícil é imbatível
- **WHEN** um jogador joga otimamente contra o modo Difícil
- **THEN** a partida termina em empate, nunca em vitória do jogador

### Requirement: Primeiro jogador no modo 2 Jogadores
No modo "2 Jogadores", dois jogadores SHALL alternar X e O no mesmo ecrã por toques, e o primeiro jogador do X SHALL alternar a cada nova partida (quem jogou X na partida anterior abre a seguinte com O), garantindo justiça entre partidas sem depender de sorteio invisível.

#### Scenario: Alternância entre partidas
- **WHEN** termina uma partida em 2 Jogadores e é tocado "Jogar de novo"
- **THEN** o jogador que abriu com X na partida anterior passa a abrir a nova partida

### Requirement: Vitória e empate com feedback celebrativo
Quando um jogador completar três peças em linha (linha, coluna ou diagonal), o jogo SHALL bloquear novas jogadas, destacar visualmente a linha vencedora e celebrar **apenas com som** (jingle), sem qualquer voz; nenhuma mensagem — falada ou escrita — SHALL culpar ou menosprezar o perdedor. No empate, o jogo SHALL bloquear jogadas e assinalá-lo apenas com um tom suave. Em ambos os casos SHALL existir botão "Jogar de novo" que limpa o tabuleiro mantendo o modo atual. O jogo SHALL NOT manter pontuação acumulada entre partidas (filosofia infantil do projeto).

As células do tabuleiro SHALL manter posição e tamanho inalterados ao receber uma peça: as linhas e colunas da grelha são fixas e o texto da peça não empurra as vizinhas.

#### Scenario: Vitória do jogador
- **WHEN** o jogador completa uma linha de três
- **THEN** a linha vencedora fica destacada, toca o jingle (sem voz), novas jogadas são recusadas e aparece "Jogar de novo"

#### Scenario: Vitória da CPU
- **WHEN** a CPU completa uma linha de três
- **THEN** a linha da CPU é destacada e o jogo dá feedback neutro-positivo (sem mensagem de derrota), oferecendo "Jogar de novo"

#### Scenario: Empate
- **WHEN** o tabuleiro enche sem três em linha
- **THEN** o jogo anuncia empate com som suave e oferece "Jogar de novo"
