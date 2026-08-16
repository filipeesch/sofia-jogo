# Design de Fase — Festa das Estrelas (v3)

Fase nova e elaborada para Avião Aventureiro (e para o carro), no estilo toy
low-poly, sem texto, sem punição.

## 1. Tema
Uma festa noturna no vale: barraquinhas iluminadas, lanternas de papel, um bosque
cheio de vaga-lumes e fogos de artifício a cada poucos minutos. A fase COMEÇA
ao entardecer e a noite dura mais (o céu é o espetáculo).

## 2. Mapa (zona por zona, coordenadas x/z)
- Praça da Festa (0, 0): 4 barraquinhas em volta de um chafariz de luz; arco de
  bandeirinhas na entrada da rua; 6 lanternas de papel penduradas em varal.
- Rua do Desfile (-20..20, 12): a estrada central vira rota do desfile; os
  carrinhos do tráfego ganham luzes coloridas e buzinam de leve.
- Bosque dos Vaga-lumes (55, -30): árvores densas + pontos de luz verdes que
  piscam e seguem suavemente o avião/carro quando ele passa (swarm de partículas).
- Morro dos Balões (-45, 25): balões gigantes presos ao chão em cores de festa;
  tocar num balão faz ele subir e soltar confete.
- Lago dos Reflexos (40, 45): lago com lanternas flutuantes; patinhos; reflexos
  (luzes duplicadas no shader da água).
- Coreto (-10, -20): palquinho com toldo listrado; tocar nele toca uma
  fanfarra e acende as luzes da praça.

## 3. Pontos de interesse / história de descoberta
A criança entra de carro ou avião e descobre na ordem: arco de bandeirinhas →
barraquinhas (cada uma com uma surpresa) → coreto (música) → bosque de
vaga-lumes (magia) → morro dos balões (confete) → lago dos reflexos (calma).
Quando a noite fecha, um show de fogos começa sozinho na praça — e repete
a cada ~2 minutos como recompensa contínua.

## 4. Novos eventos/interações e sons
- Tocar em barraquinha: confete + 'jingle' (marimba).
- Tocar em lanterna: ela acende/apaga + 'plim'.
- Tocar no coreto: fanfarra + luzes da praça piscando.
- Passar no bosque: vaga-lumes orbitam o veículo por 6s + 'chime' suave.
- Tocar em balão do morro: sobe + confete + 'pop' festivo.
- Fogos de artifício: rajadas coloridas + 'boom' grave suave (a cada 120s,
  sempre visíveis, nunca assustadores).
- Desfile: os carrinhos do tráfego usam luzes piscantes à noite.

## 5. Novos objetos 3D (Blender, padrão root EMPTY + meshes)
- booth.glb — barraquinha com toldo listrado e balcão.
- lantern.glb — lanterna de papel (esfera achatada emissiva, material LanternLight).
- banner.glb — segmento de bandeirinhas triangulares em barbante (repetível).
- gazebo.glb — coreto (toldo listrado + colunas + palco).
- balloon_large.glb — balão gigante de festa preso ao chão por corda.
- boat_lantern.glb — lanterninha flutuante para o lago.

## 6. Ritmo e ciclo dia/noite
- A fase inicia em 'pôr do sol' (nunca dia cheio) e passa rápido para a noite
  festiva; a noite dura ~70% do ciclo para o espetáculo de luzes dominar.
- Estrelas colecionáveis ficam mais brilhantes e em trilhas sobre as ruas.
- Sem combate, sem contagem regressiva: a festa simplesmente acontece com ou
  sem a criança — e reage quando ela interage.

## Como implementar (resumo técnico)
- Novo worldType 'festival' + ValleyFestival.ts (reaproveita Valley + objetos
  novos) ou extensão do Valley com 'modo festa'.
- FireworksSystem: partículas no pool existente + sons no AudioManager.
- FireflySystem: Points com shader de brilho que orbitam o veículo em proximidade.
- Trafego com luzes: emissive piscante nos carros do tráfego à noite.
- Som: adicionar jingle(), chime(), boom_festa() no AudioManager (procedural).
