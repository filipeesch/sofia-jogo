# Proposta de mudança — Vale Vivo (carro v2)

## Por quê
A experiência do carro tem problemas: dirige sobre a água na ilha, velocidade fixa sem
sensação de direção, câmera de avião, ruas em grade desconectadas, mundo vazio e animais
estáticos. Queremos um mundo maior, rico e consistente, com exploração livre.

## O que muda
1. **Novo mundo "Vale Vivo"** — continente grande (≈400×400) com zonas: Vila, Fazenda,
   Lago e Floresta, conectadas por **estradas curvas** (splines) que seguem o terreno.
2. **Carro v2** — aceleração/freio suaves, suspensão com damping, inclinação em curvas,
   faróis à noite, câmera de carro baixa e próxima.
3. **Vida** — animais que passeiam dentro das zonas (cão, gato, galinha, ovelha, vaca, pato)
   e reagem ao toque/carro; **tráfego amigável** (carrinhos seguindo as estradas).
4. **Densidade** — celeiro, cercas, postes (acendem à noite), bancos, arbustos, flores e
   muitas árvores, distribuídos por zona.
5. **Níveis** — o carro ganha níveis próprios (Vale Vivo, Vale à Noite); a ilha fica só para o avião.

## Requisitos não-funcionais
- Filosofia mantida: sem game over, sem punição, tudo é descoberta e recompensa.
- Reutilizar os GLBs existentes; novos objetos no Blender seguem o padrão atual
  (root EMPTY + meshes, frente em -Y).
- Performance leve (instâncias via clone, partículas moderadas).

## Critérios de sucesso
1. Escolher Carro no launcher → escolher o Vale → dirigir pelas estradas curvas.
2. Ver animais andando, carrinhos de trânsito e zonas temáticas.
3. À noite: postes e faróis acesos.
4. Sem quedas de frame em mobile.
