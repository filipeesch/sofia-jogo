# tic-tac-toe Specification

## Purpose

Jogo do Galo (tic-tac-toe 3x3 com X e O) para a criança: modo de dois jogadores no mesmo ecrã ou contra a CPU em três calibrações de dificuldade, com feedback de vitória celebrativo e sem drama de perdedor, e um modo infinito combinável com qualquer modo em que as peças mais antigas de cada jogador esvanecem e desaparecem, tornando o empate impossível.

## Requirements

### Requirement: Seletor de modo no topo
O jogo SHALL exibir no topo, abaixo do cabeçalho com o botão 🏠, um seletor com exatamente quatro modos: "2 Jogadores", "CPU Fácil", "CPU Média" e "CPU Difícil". O modo pré-definido é "CPU Fácil" e o último modo escolhido SHALL ser lembrado entre sessões. Junto ao seletor SHALL existir um interruptor próprio "♾️" (modo infinito), independente do modo escolhido, combinável com qualquer um dos quatro modos, cujo estado SHALL também ser lembrado entre sessões.

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
Quando um jogador completar três peças em linha (linha, coluna ou diagonal), o jogo SHALL bloquear novas jogadas, destacar visualmente a linha vencedora e celebrar **apenas com som** (jingle), sem qualquer voz; nenhuma mensagem — falada ou escrita — SHALL culpar ou menosprezar o perdedor. No empate, o jogo SHALL bloquear jogadas e assinalá-lo apenas com um tom suave (o empate só pode ocorrer com o modo infinito desligado). Em ambos os casos SHALL existir botão "Jogar de novo" que limpa o tabuleiro mantendo o modo atual. O jogo SHALL NOT manter pontuação acumulada entre partidas (filosofia infantil do projeto).

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

### Requirement: Modo infinito com peças que esvanecem
Com o interruptor ♾️ ligado (combinável com qualquer modo), cada jogador SHALL ter no máximo três peças ativas no tabuleiro. Ao colocar a quarta peça, a peça mais antiga desse mesmo jogador SHALL esvanecer em animação curta (~0,4 s) e desaparecer da lógica do tabuleiro no momento da nova colocação — nunca contando para uma linha vencedória depois de expirada ("vitória-fantasma"). Consequências obrigatórias: o tabuleiro nunca enche (máximo 3+3 peças), o empate SHALL ser impossível e a partida SHALL continuar até alguém completar três em linha entre as peças atualmente no tabuleiro; a vitória mantém o feedback celebrativo do modo normal. Ligar ou desligar o ♾️ a meio de uma partida SHALL limpar o tabuleiro e começar nova partida, sem confirmação. No modo infinito a CPU Fácil e a Média mantêm o seu comportamento; a CPU Difícil SHALL usar heurística imediata — ganhar se puder, senão bloquear ameaça de vitória iminente, senão célula aleatória — porque o minimax exato não se aplica a um tabuleiro onde as peças expiram.

#### Scenario: Quarta peça faz a mais antiga desaparecer
- **WHEN** com o ♾️ ligado um jogador coloca a sua quarta peça
- **THEN** a peça mais antiga desse jogador esvanece e desaparece, ficando apenas três peças suas no tabuleiro, sem deslocar as restantes células

#### Scenario: Empate impossível
- **WHEN** dois jogadores jogam muitas jogadas seguidas sem completar três em linha
- **THEN** o tabuleiro nunca fica cheio e o jogo nunca declara empate nem oferece "Jogar de novo"

#### Scenario: Vitória com peças renovadas
- **WHEN** com o ♾️ ligado um jogador completa três em linha com peças ainda ativas
- **THEN** a linha vencedora brilha e toca o jingle exatamente como no modo normal

#### Scenario: Interruptor lembrado e combinável
- **WHEN** o ♾️ é ligado no modo "CPU Difícil" e o jogo é reaberto mais tarde
- **THEN** o jogo reabre em "CPU Difícil" com o ♾️ ligado, e a CPU Difícil infinita bloqueia uma ameaça direta do jogador quando existe

#### Scenario: Peça expirada não conta para vitória
- **WHEN** uma linha de três do adversário ficaria completa apenas com uma peça que acabou de expirar
- **THEN** não há vitória nem jingle, e a jogada continua
