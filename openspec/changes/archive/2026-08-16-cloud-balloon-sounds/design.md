## Context

Nuvem e balão são interações de clique já existentes em `Game.registerClickables()`; hoje tocam `plim()` (nuvem) e `pop()` (balão). O `plim()` é compartilhado com casas e eventos de proximidade, e o `pop()` é curto demais para o squash de borracha — por isso sons **dedicados**, sem tocar nos genéricos.

## Decisions

- **`cloudPuff()` = noise + tintles.** O burst da nuvem é um puff de partículas brancas subindo; um ruído lowpass (~0.45 s, 900 Hz) dá o "psshh" fofo, e dois sines etéreos em subida (1320→1760, 1760→2200, volume ~0.05) sugerem "mágica" sem competir com a trilha. Reaproveita o `noise()` já existente do `AudioManager`.
- **`balloonBoing()` = triangle + LFO.** O squash do `bounce()` dura 0.4 s; o boing dura ~0.35 s: pitch 420→180 Hz (despenca de borracha) e volta a 260 Hz, com LFO de 26 Hz (ganho 18) no pitch para o wobble característico de látex. Ganho pico 0.2, envelope com rampa exponencial como os demais sons.
- **Métodos dedicados no `AudioManager`.** `plim()` e `pop()` continuam existindo e com os mesmos usos (casas, fallback de creatures, proximidade); apenas os handlers de nuvem/balão trocam de método. Zero risco de efeito colateral em outros sons.
- **Teste: nuvem tem assinatura única.** O puff usa `createBufferSource` (noise), e nada mais no jogo cria buffer source ao clicar em nuvem/balão — então o teste mede o delta de buffer sources no clique em nuvem. O balão comprova-se pelo squash (`scale > 1` via hook de debug) + assinatura do boing em teste unitário (instanciar `AudioManager` via import dinâmico e inspecionar os osciladores criados).

## Risks / trade-offs

- Volume: pico 0.2 no boing e 0.28 no puff, sobre o master 0.8 — calibrado para não encobrir a música; ajustes são triviais nos parâmetros dos métodos.
- O "boing" cria 2 osciladores + 1 LFO por clique: custo irrelevante (cliques humanos, com cooldown natural do squash).
