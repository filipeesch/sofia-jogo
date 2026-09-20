# Design: decalque honesto e mixer do avião

## Contexto

Já não chegava inventar bichos «ao estilo» do jogo: a criança disse, com razão,
que o cavalo-marinho novo era pior e que o caranguejo nem parecia um caranguejo.
A referência que a própria família escolheu (a imagem do Etsy) mostrou o que
faltava: silhuetas certas. E a música foi comparada com a única música que a
criança conhece do jogo — a do avião.

## Decisões

### 1. Decalque por raster, não por olho

Um descascador de contornos Caseiro (`_shots/trace.mjs`, efémero, não entra no
commit): BMP 24 bits → limiar de tinta → flood-fill do exterior → figura cheia
→ contorno exterior de Moore com regra de Jacob → RDP → quadráticas de ponto
médio. Duas descobertas de laboratório valem registo:

- seguir o traço fino de um contorno salta de margem para margem; primeiro
  preenche-se o interior, e só se segue a figura cheia;
- a erosão morfológica sozinha deixa degraus de 1 px que fazem o caminhante
  fechar um laço antecipado; abrir (erosão + dilatação) resolveu.

As peças (carapaça, tenaz) são recortadas da mesma raster num sistema de
coordenadas comum (`GLOBAL`) e as costuras seguem o contorno do vizinho já
decalcado (`SUBTRAI`), não um corte recto. Braços, patas, olhos e antenas são à
mão: o decalque não separa peças que se escondem, e uma pata de caranguejo é
geometria pobre à partida — três rectas grossas com o joelho mais alto que o pé.

A gravura de referência do caranguejo é de domínio público (coleção de vetores
livre de direitos de autor); o texto do sprite credita a origem. O descascador e
as raster de trabalho vivem em `_shots/`, que está fora do git.

### 2. O caranguejo mantém os contratos, muda a geometria

As classes `cang-pernas-e`, `cang-pernas-d` e `cang-bracos` e as animações
(`cangPata`, `sustou`) ficam exatamente como estavam; o viewBox passa a
268,8 × 104 (a proporção da referência) e a caixa de toque acompanha a
silhueta larga (150 × 84 px). O espelhamento do lado direito é o mesmo
`translate(268.8 0) scale(-1 1)` com a animação no grupo filho.

### 3. Música: o mixer do avião, os timbres do mar

Desvio deliberado da decisão arquivada anterior (barramento a 0,16): o pedido
explícito foi «segue o mesmo padrão da música do jogo do avião». Em vez do
barramento baixo compensar uma orquestra de 7 fontes contínuas, copiou-se a
mistura do jogo — master 0,8, grave 0,10, acorde 0,045, melodia 0,05, envelope
de ataque exponencial 0,02 — e fez-se a música mais pequena: bordão único em vez
de drone de 3 osciladores, pad fora, melodia aleatória fora. Ficaram 5 fontes
vivas. O medidor da cena confirma o resultado, não a intenção: RMS 0,016–0,025
com tudo no 0,8, pico de um estouro 0,22 — o estouro continua ~10× acima da
música e o cenário «A música é fundo, nunca notícia» está honrado com números
novos. A melodia só pisa as cinco notas da escala dos estouros.

## Riscos

- Um decalque traz proporções de outro desenho: por isso a validação é por
  comparação lado a lado na mesma folha, em duas resoluções, e não por gosto
  próprio no editor.
- O sequenciador herda do avião o `setInterval` de 200 ms com horizonte de
  1,2 s e re-anchor quando o relógio escorrega; foi medido no jogo há meses e
  é o comportamento copiado, não um redesenho.
