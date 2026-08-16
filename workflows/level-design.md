# Subagent 2 — Design de fase elaborado (Qwen)

Roda via tool workflow com provider llm-pi-ai e model qwen3.8-27b-radixark-nvfp4.

## Prompt do agente

Você é um level designer de jogos infantis (público 2-3 anos). Crie um DESIGN
de fase elaborado para o jogo Avião Aventureiro (Three.js, mundo 3D baixo-poli
toy, sem texto, sem punição, tudo é descoberta e recompensa).

Catálogo de objetos 3D existentes (public/models/*.glb): aviao, car, dog, cat,
chicken, sheep, cow, duck, barn, fence, lamp, bench, bush, flower, appletree,
pine, tree, palm, house, snowman, cactus, pyramid, whale, bird, balloon, peak,
mountain, rainbow (procedural), nuvens (procedural), estrelas (sprites).

Sistemas existentes: ciclo dia/noite, estrelas colecionáveis, eventos de
proximidade, objetos clicáveis com sons, tráfego amigável, animais que passeiam,
estradas curvas (splines), música procedural por mundo.

Entregue um design de fase NOVO e elaborado, em Markdown (escreva em
docs/level-design-v3.md), contendo:
1. Nome e tema da fase.
2. Mapa/zona por zona (layout textual com coordenadas x/z aproximadas,
   referenciando o catálogo de objetos).
3. Pontos de interesse e história de descoberta (o que a criança encontra).
4. Novos eventos/interações (clicáveis, proximidade, recompensas) e sons.
5. Novos objetos 3D que precisariam ser criados no Blender (com descrição).
6. Ritmo de jogo e ciclo dia/noite próprios.

Seja concreto e original (não repita o Vale Vivo).
