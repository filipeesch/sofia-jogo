# bubbles-toy Specification

## Purpose
Define o brinquedo das bolhas: como as bolhas nascem, sobem e desaparecem; o que cada uma devolve quando é tocada (o som de uma bolha a rebentar, a sua cor, o esforço das gigantes, o fogo de artifício); como os peixes respondem a toque; como as vagas se sucedem sem fim nem derrota; e as garantias de que a criança é sempre ela a produzir as bolhas, de que nada lhe é dito e de que nunca pode errar.

## Requirements

### Requirement: Bolhas visíveis a subir

O brinquedo SHALL mostrar bolhas a subir desde o fundo do ecrã até ao topo, com deriva lateral, num número reduzido e com alvos grandes o suficiente para o dedo de uma criança de 2–3 anos.

#### Scenario: Abertura do app

- **WHEN** a criança abre Bolhas a partir do launcher
- **THEN** em menos de 2 segundos já há bolhas visíveis a subir, ocupando a metade inferior do ecrã, e nenhuma bolha fica imóvel fora da área visível

#### Scenario: Tamanho do alvo

- **WHEN** uma bolha comum aparece
- **THEN** o seu diâmetro é de pelo menos 72 px, e as bolhas pequenas são exceção ocasional, nunca o normal

#### Scenario: Quantidade simultânea

- **WHEN** o brinquedo está a correr há um minuto
- **THEN** nunca há mais de 8 bolhas em simultâneo no ecrã, e nenhuma bolha desaparecida continua a existir depois de sair pelo topo

#### Scenario: Sair do app

- **WHEN** a criança volta ao launcher com bolhas no ar
- **THEN** as bolhas deixam todas de existir, nada continua a ser criado nem a tocar, e o launcher fica limpo de elementos do app

### Requirement: Estourar soa a bolha e faz música

Cada bolha SHALL produzir, ao ser estourada, um som de duas camadas simultâneas: um ataque curto que soa a uma bolha a rebentar (blip com deslizamento para grave e estalido de ruído) e uma nota musical escolhida pela sua dimensão — as grandes mais graves, as pequenas mais agudas — dentro de uma escala em que duas notas quaisquer soam bem juntas, para que não exista toque errado possível.

#### Scenario: Reconhecível como bolha

- **WHEN** a criança estoura uma bolha
- **THEN** ouve-se primeiro o estalo curto de uma bolha a rebentar, e só depois a nota a soar por baixo

#### Scenario: Dimensão define a nota

- **WHEN** a criança estoura uma bolha grande e depois uma pequena
- **THEN** a grande soa mais grave que a pequena, e nenhuma das duas soa como um erro

#### Scenario: Garatujar é sempre agradável

- **WHEN** a criança estoura bolhas sem qualquer ritmo ou ordem, várias vezes seguidas
- **THEN** as notas produzidas pertencem todas à mesma escala e continuam a soar consonantes entre si

#### Scenario: Nenhum som de falha

- **WHEN** a criança toca no fundo do ecrã, fora de qualquer bolha ou peixe
- **THEN** nada soa e nada muda — não existe som de erro nem penalização

#### Scenario: Primeiro toque acorda o áudio

- **WHEN** o primeiro gesto da criança no app acontece depois de o áudio estar adormecido
- **THEN** o som do estouro é ouvido nesse mesmo toque, sem precisar de um segundo toque

### Requirement: O brinquedo não fala

O brinquedo das bolhas SHALL NEVER produzir fala: nenhuma palavra é dita em resposta a um toque, a um estouro ou a uma celebração. A razão é a de tempo — uma frase demora ~1,5 s, abafa o estouro seguinte e faz a criança esperar por algo em vez de o provocar.

#### Scenario: Nenhuma utterance durante toda a sessão

- **WHEN** a criança joga durante vários minutos com o sintetizador de voz do dispositivo disponível
- **THEN** o sintetizador nunca é convidado a falar, `speechSynthesis.speaking` mantém-se falso do princípio ao fim, e nenhuma espera por fala atrasa um som

#### Scenario: Voz indisponível é irrelevante

- **WHEN** o dispositivo não consegue falar (por exemplo, sem voz pt-PT instalada em iOS)
- **THEN** o brinquedo é exatamente o mesmo: os mesmos sons, os mesmos fogos, o mesmo comportamento

#### Scenario: Sair não deixa voz pendurada

- **WHEN** a criança volta ao launcher a qualquer momento
- **THEN** nenhuma fala do app pode ouvir-se no launcher, porque o app nunca fala

### Requirement: A cor mostra-se, nunca se diz

Cada bolha SHALL ter uma cor nítida, e essa cor SHALL ser a matéria de todas as recompensas visuais dessa bolha — o estouro, as fagulhas do fogo de artifício e a nódoa que a gigante deixa — sem que o seu nome seja jamais pronunciado ou escrito.

#### Scenario: Estouro na cor da bolha

- **WHEN** a criança estoura a bolha vermelha
- **THEN** o estouro, os fragmentos e o brilho ficam vermelhos, e nenhum texto nem palavra aparece no ecrã

#### Scenario: Nódoa apenas nas gigantes

- **WHEN** uma bolha comum estoura
- **THEN** não fica nenhuma marca persistente no fundo do ecrã; apenas a bolha gigante deixa uma nódoa da sua cor, que se desvanece

#### Scenario: Contraste com a água

- **WHEN** uma bolha da cor mais próxima da água aparece na zona mais clara do fundo
- **THEN** continua a distinguir-se claramente do fundo, pelo que cada cor se reconhece sem esforço

#### Scenario: Fogo visível em qualquer cor

- **WHEN** rebenta o fogo de uma bolha azul — a cor mais próxima da água — na zona média do fundo
- **THEN** as fagulhas lêem-se claramente contra a água, porque somam luz ao fundo em vez de o tapar, e continuam a distinguir-se do fogo de uma bolha roxa ou laranja

### Requirement: As gigantes pedem esforço e crescem

As bolhas GIGANTES SHALL exigir três toques para rebentar, crescendo e tremendo a cada toque, com a nota a subir e as fagulhas a crescer a cada toque, para que a criança sinta o esforço a construir a recompensa.

#### Scenario: Toques parciais

- **WHEN** a criança toca uma gigante uma ou duas vezes
- **THEN** ela cresce, treme, toca uma nota mais alta que a anterior e salta-lhe um punhado de fagulhas cada vez maior, mas não rebenta nem desaparece

#### Scenario: Terceiro toque

- **WHEN** a criança completa o terceiro toque na mesma gigante
- **THEN** ela rebenta num estouro maior e dispara imediatamente o fogo de artifício

#### Scenario: Gigante nunca é castigada por demora

- **WHEN** a criança deixa uma gigante a meio, sem a acabar, e vai estourar outras bolhas
- **THEN** a gigante continua à espera com os toques já dados contados, sem perder o progresso nem encolher

### Requirement: A gigante rebenta em fogo de artifício

Ao terceiro toque, uma bolha gigante SHALL rebentar num fogo de artifício de fagulhas brilhantes, sempre na cor da bolha, escolhido entre quatro formas, com som de assobio e chuvisco e sem estrondo grave.

#### Scenario: As quatro formas

- **WHEN** uma gigante rebenta
- **THEN** as fagulhas descrevem uma das quatro formas — roda que se abre em anel, chuveiro que sobe e cai, espiral que rodopia, ou coroa que cai pendendo — e a mesma forma não se repete duas vezes consecutivas

#### Scenario: Sempre na cor da bolha

- **WHEN** a gigante que rebentava era roxa
- **THEN** todas as fagulhas desse fogo são roxas

#### Scenario: Assobio e chuvisco, sem bum

- **WHEN** o fogo dispara
- **THEN** ouve-se um assobio a descer seguido de um chuvisco de estalidos curtos, e nada produz um estrondo grave ou prolongado que possa assustar

#### Scenario: Fim limpo

- **WHEN** o fogo termina
- **THEN** todas as fagulhas deixam de existir no DOM, e o número de fagulhas em simultâneo nunca ultrapassa um teto declarado, seja qual for o número de dedos a tocar

### Requirement: Os peixes respondem a quem os toca

Cada peixe SHALL ser um alvo tocável do tamanho do dedo de uma criança de 2–3 anos e SHALL responder a um toque dando uma cabriola, fugindo a toda a velocidade com um rasto de bolhinhas e produzindo um som curto de bolhas de ar, para depois retomar a natação normal.

#### Scenario: Cabriola e arrancada

- **WHEN** a criança toca num peixe
- **THEN** o peixe roda sobre si próprio, dispara para longe do dedo, e pouco depois volta a nadar tranquilamente no seu ritmo

#### Scenario: Caixa de toque generosa

- **WHEN** a criança toca o ar imediatamente à volta de um peixe, até cerca de 45 px do seu centro
- **THEN** o toque conta como toque no peixe, porque o desenho pequeno não pode obrigar a apontar

#### Scenario: Som curto, sem fala

- **WHEN** o peixe faz a cabriola
- **THEN** ouve-se apenas um glup-glup curto de bolhas de ar — nenhum nome, nenhuma palavra, nenhum estrondo

#### Scenario: Rasto decorativo

- **WHEN** o peixe deixa o rasto de bolhinhas
- **THEN** esse rasto não é um alvo: tocá-lo não produz som nem efeito, porque as bolhinhas do rasto são pequenas demais para serem alvos honestos

#### Scenario: Fuga a um estouro mantém-se

- **WHEN** uma bolha estoura perto de um peixe sem que ela o tenha tocado
- **THEN** o peixe afasta-se do ponto do estouro, sem som e sem bloquear nada, e a cabriola só acontece por toque directo

### Requirement: Vagas sem fim e sem derrota

O brinquedo SHALL organizar as bolhas em vagas que se sucedem para sempre, celebrando o fim de cada vaga, e NÃO SHALL ter pontuação, tempo limite, contagem de erros nem estado de "falhou". A celebração SHALL ser curta e NÃO SHALL atirar ícones do topo do ecrã: tudo o que aparece na cena é provocado por um gesto da criança ou pela subida das bolhas.

#### Scenario: Fim de vaga

- **WHEN** a criança estoura a última bolha de uma vaga
- **THEN** soa um jingle curto de vitória e uma nova vaga entra poucos instantes depois, com uma cor nova e formas de fogo ainda não usadas nesta sessão, sem nada cair do topo do ecrã

#### Scenario: Bolha que escapa

- **WHEN** uma bolha sobe até ao topo sem ser tocada
- **THEN** sai simplesmente pelo topo, sem som, sem marca e sem qualquer consequência, e a vaga pode ainda assim ser celebrada quando as restantes terminam

#### Scenario: Sem estado de derrota

- **WHEN** a criança não estoura absolutamente nenhuma bolha durante um minuto
- **THEN** nada acontece de negativo: não há mensagem, penalização, fim nem contagem visível de falhas

### Requirement: As bolhas são obra da criança

O brinquedo SHALL dar à criança um meio de criar bolhas ela própria: enquanto mantiver o dedo sobre o comando de soprar, bolhas saem do ponto onde ela está a tocar.

#### Scenario: Manter o dedo

- **WHEN** a criança mantém o dedo sobre o comando de soprar
- **THEN** um enxame contínuo de bolhas sai da posição do dedo dela enquanto o gesto se mantiver

#### Scenario: Soltar o dedo

- **WHEN** a criança levanta o dedo do comando
- **THEN** a produção pá de imediato, sem bolhas atrasadas a aparecerem depois do gesto ter acabado

#### Scenario: Ainda há bolhas sem pedir

- **WHEN** a criança nunca usa o comando de soprar
- **THEN** o brinquedo continua a criar bolhas sozinho, a um ritmo calmo, e nada fica bloqueado à espera do comando

### Requirement: Multi-toque a sério

O brinquedo SHALL responder a vários dedos em simultâneo, permitindo que duas ou mais bolhas sejam estouradas ao mesmo tempo.

#### Scenario: Dois dedos, duas bolhas

- **WHEN** a criança toca duas bolhas com dois dedos ao mesmo tempo
- **THEN** as duas rebentam, cada uma com a sua nota e a sua cor, sem que uma cancele a outra

#### Scenario: Comandos não bloqueiam as bolhas

- **WHEN** a criança toca nas áreas dos comandos enquanto as toca noutra zona do ecrã
- **THEN** os dois gestos produzem efeito e o regresso ao launcher continua acessível em qualquer momento

### Requirement: A cena é debaixo de água

O brinquedo SHALL decorrer debaixo de água — água clara, feixes de luz e areia com dunas e grão no fundo — de modo que subir seja o comportamento natural das bolhas, com dois ou três peixes a nadar na cena, algas enraizadas na areia, conchas deitadas nela e dois cavalos-marinhos à deriva.

Todas as figuras da cena SHALL ser desenhadas pelo próprio brinquedo, num único traço reconhecível de uma figura para outra, e nenhuma figura nem o comando de soprar SHALL ser um glifo de emoji: os desenhos são nossos, para poderem ter detalhe, animar-se por dentro e não mudarem de aparência consoante o sistema de quem nos usa. O botão de voltar não é uma figura da cena e continua a reger-se pela capability `game-hud`.

#### Scenario: Cena ocupada sem poluição

- **WHEN** o app abre
- **THEN** a cena de água cobre o ecrã todo, sem qualquer barra de rolagem nem zona branca fora do ecrã, e as bolhas são sempre o elemento mais saliente da imagem

#### Scenario: Peixes presentes

- **WHEN** o app está aberto
- **THEN** há dois ou três peixes a atravessar a cena em ciclos próprios, sem nunca pararem nem saírem definitivamente

#### Scenario: Traço único, sem emoji

- **WHEN** a cena é inspecionada — peixes, algas, conchas, cavalos-marinhos e o comando de soprar
- **THEN** são todos desenhos do brinquedo com a mesma linguagem de sombra, contorno e brilho, e nenhuma personagem da cena é um glifo de emoji

#### Scenario: Nada é cortado num ecrã alto ou largo

- **WHEN** o app corre num ecrã largo deitado e num ecrã alto em pé
- **THEN** nenhuma figura do fundo fica cortada pelo rebordo do ecrã nem por baixo dos comandos

### Requirement: Não incomodar os outros apps

O brinquedo das bolhas NÃO SHALL deixar nada a correr depois de a criança sair para o launcher, incluindo criação de bolhas, fagulhas em voo e áudio.

#### Scenario: Sair a meio de um fogo de artifício

- **WHEN** a criança volta ao launcher enquanto as fagulhas de uma gigante estão em voo
- **THEN** as fagulhas desaparecem todas, nada continua a ser criado nem a soar no launcher, e o áudio volta a ficar adormecido

#### Scenario: Ecrã bloqueado ou app para segundo plano

- **WHEN** o ecrã se bloqueia ou o separador passa para segundo plano com o app aberto
- **THEN** nenhuma bolha nem fagulha nova é criada e nada soa até o app voltar a estar visível

### Requirement: O fundo devolve o toque, sem voz e sem roubar nada

Cada elemento do fundo — alga, concha e cavalo-marinho — SHALL responder a um toque com um som seu, curtíssimo e mais baixo que o estouro de uma bolha, e com um movimento seu. Nenhum SHALL dizer palavra, dar pontos ou criar estado de acerto e erro.

O fundo SHALL viver por baixo das bolhas na ordem das camadas, de modo que onde uma bolha e um adorno se sobrepõem o toque pertença sempre à bolha: o cenário não pode tirar nada ao brinquedo.

#### Scenario: Cada elemento tem o seu gesto

- **WHEN** a criança toca uma alga, uma concha ou um cavalo-marinho
- **THEN** a alga abana para o lado oposto ao dedo e larga ar pelo pontal de cima, a concha fecha-se, reabre e assenta, e o cavalo-marinho dá um pulo com rebolado — cada um com o seu som

#### Scenario: Nada é dito

- **WHEN** a criança esgota os elementos do fundo a tocar
- **THEN** nenhuma utterance é produzida e nenhuma palavra aparece na cena

#### Scenario: Bolha ganha sempre a sobreposição

- **WHEN** uma bolha a subir se sobrepõe a um adorno do fundo
- **THEN** o toque naquele ponto vai para a bolha, e o adorno não reage

#### Scenario: O adorno não fica pendurado

- **WHEN** termina o gesto de reacção de um elemento do fundo
- **THEN** o elemento volta ao seu estado de repouso e nada fica a animar-se nem a soar depois de o gesto ter acabado
