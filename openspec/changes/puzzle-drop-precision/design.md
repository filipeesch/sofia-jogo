## Context

O hit-test atual (`hitSlot`) encontra o **slot livre mais próximo** dentro do retângulo do slot expandido por 30% e só aceita se for o animal certo. Para dedos de 2–3 anos, "quase certo" precisa valer como certo: a criança aponta para a silhueta do animal que segura; o que importa é a proximidade com **a silhueta correspondente**, não com o slot vizinho.

## Decisions

- **Raio próprio, não slot mais próximo.** `onDragEnd` passa a medir a distância do ponto de soltura ao **centro do slot do próprio animal**; se for ≤ ~1.05× o tamanho do slot, encaixa. Fora disso: `thump()` + retorno suave à bandeja (mantido o feedback sonoro de "quase" / "errou", sem punição). A função `hitSlot` (slot mais próximo) é removida — menos lógica, comportamento mais previsível.
- **Raio 1.05× do slot.** Com 12 slots em 4 colunas e gap de 10 px, os centros de slots vizinhos ficam a ~1.2× do tamanho do slot; um raio de 1.05× cobre quase metade do caminho entre dois slots, mas exige que a criança mire visivelmente na silhueta certa. Ajuste trivial (uma constante) se a calibração não agradar.
- **Shuffle com garantia de diferença.** `shuffleTray` compara a sequência de nomes resultante com a ordem atual no DOM; se for idêntica (probabilisticamente raro, mas possível), re-embalha (até um teto de tentativas). Aplica na abertura e no "Jogar de novo".
- **Layout 4 colunas + peças maiores.** 12 slots em 4×3 encurta o quadro (de 4 linhas para 3) e libera altura para slots/peças maiores — o pedido de "imagens maiores" sem estourar 720p. O novo helper de colunas (`n > 12 ? 5 : 4`) já prepara o quadro para o próximo jogo (15 veículos).

## Risks / trade-offs

- Raio próprio pode parecer "fácil demais" se dois slots ficarem muito perto; com 4 colunas e gap 10 px o raio de 1.05× mantém ~0.2× do tamanho do slot de folga entre a fronteira de um slot e o centro do vizinho.
- Peças maiores + 4 colunas: verificado no build de 720p (quadro 3 linhas, bandeja 3 linhas). Se o tablet em paisagem apertar, o `clamp` já dá respiro.
