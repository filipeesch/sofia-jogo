# Debug Capture — viewport do jogo em runtime

Permite controlar a câmera do jogo rodando e capturar imagens/vídeos para o
modelo de visão revisar o cenário real (luz, dia/noite, tráfego, animais).

## Como usar — o caminho curto

```
npm run game                 # Vale Vivo, carro
npm run game ilha airplane   # posição: [level] [vehicle]
npm run game -- --level neve --vehicle car
```

O lançador sonda as portas 4477 (servidor de capturas) e 5173 (vite) e só faz
spawn do que estiver em falta; depois abre o browser no deep-link de debug. É o
caminho preferido porque um agente o consegue chamar sem abrir terminais à mão.

À mão, se for preciso:

1. `npm run dev`
2. `npm run shots` (servidor de capturas na porta 4477, salva em `_shots/`)
3. `http://localhost:5173/?debug=1`

## Deep-link

`http://localhost:5173/?debug=1&level=<id>&vehicle=<car|airplane>`

Arranca direto no cenário, sem passar pelo launcher nem pelo seletor de fases.
Os `id` válidos vêm de `src/levels.ts` (e do `list_levels` do MCP, que agora lê
esse ficheiro em vez de manter uma cópia). Um cenário só de avião — como `ilha`
— força o avião mesmo que o `vehicle` peça carro, porque seria um cenário sem
veículo possível.

## API no console do navegador (`window.__debug`)

- `__debug.setView(px, py, pz, tx, ty, tz)` — **teleporta** a câmera para o ponto
  a olhar para o alvo (ex.: `__debug.setView(8, 6, 8, 0, 0, 0)` vê a vila de
  cima). Sem interpolação: o frame seguinte já está na posição pedida.
- `__debug.snap('nome.png')` — captura o frame atual e envia ao servidor.
- `__debug.record(10)` — grava um vídeo de 10 s e envia (webm).
- `__debug.stopRecord()` — para a gravação antes do tempo.
- `__debug.sweep([[px,py,pz,tx,ty,tz], ...])` — **teleporta** por cada ponto e
  captura um PNG em cada um. Não voa: entre pontos não há movimento interpolado,
  porque frames interpolados não são determinísticos, e um frame não
  determinístico não serve para comparar duas versões do mesmo cenário.
- `__debug.resumeChase()` — volta a câmera para seguir o veículo.
- `__debug.chase()` — diz se a perseguição está ativa.
- `__loadLevel(id, vehicle)` — troca de cenário **sem recarregar a página**
  (está em `window`, não em `__debug`).

Nota sobre o tempo: `setView` teletransporta no frame seguinte, mas
`viewSnap`/`sweep` disparam o `snap` ~300 ms depois do teleporte. Os 300 ms não
são para a câmera chegar — é para o mundo assentar (texturas e agentes animados)
antes de o PNG ser feito. A posição da câmera já é a exacta no instante do
teleporte.

## Exemplo de sweep (tour do Vale Vivo)

```js
__debug.sweep([
  [10, 8, 14, 0, 1, 0],
  [10, 10, 30, -70, 2, 40],
  [14, 8, -18, 50, 1, -30],
  [10, 12, 50, 60, 2, 40]
]);
```

Cada ponto dá um ficheiro (`sweep_0.png`, `sweep_1.png`, …), com a câmera exacta
naquele ponto.

## Saída

Os ficheiros ficam em `_shots/` (gitignorado) prontos para o agente de visão ler
com `read_image`.

## MCP do jogo (interface para o AGENTE — caminho preferido)

Registrado no DSH em `~/.dsh/profiles/web/cordis.patch.yml` como serverName
`game` (`scripts/game-mcp.mjs`, stdio). Depois de reiniciar/recarregar o DSH, o
agente ganha as ferramentas:

- `mcp__game__set_view_and_snap(px,py,pz,tx,ty,tz,filename)`
- `mcp__game__set_view(px,py,pz,tx,ty,tz)`
- `mcp__game__snap(filename)`
- `mcp__game__record(seconds)`
- `mcp__game__sweep(points)`
- `mcp__game__resume_chase()`
- `mcp__game__list_captures()`
- `mcp__game__list_levels()`
- `mcp__game__load_level(level, vehicle)`

Pré-requisitos para o loop fechar:

1. `npm run game [level] [vehicle]` — garante os dois servidores e abre o
   deep-link. (Ou, à mão: `npm run dev` + `npm run shots` + `?debug=1`.)
2. Reiniciar o DSH para carregar o novo MCP.

Fluxo do agente de visão:

```
mcp__game__set_view_and_snap(8,6,8, 0,0,0, "vila.png")
  -> read_image _shots/vila.png
  -> ajustar (código/Blender) -> repetir
```

## Canal de comandos HTTP (alternativa manual, via curl)

O jogo em modo debug faz polling de comandos no servidor. Um agente (subagent ou
script) controla tudo via curl:

```bash
# 1. posicionar a câmera E capturar um frame (com nome)
curl -s -X POST http://localhost:4477/cmd -H 'Content-Type: application/json' \
  -d '{"cmd":"viewSnap","args":[8,6,8,0,0,0,"vila.png"]}'

# 2. capturar o frame atual
curl -s -X POST http://localhost:4477/cmd -H 'Content-Type: application/json' \
  -d '{"cmd":"snap","args":["frame.png"]}'

# 3. gravar 10s de vídeo
curl -s -X POST http://localhost:4477/cmd -H 'Content-Type: application/json' \
  -d '{"cmd":"record","args":[10]}'

# 4. tour: teleporta por cada ponto e captura um PNG em cada um
curl -s -X POST http://localhost:4477/cmd -H 'Content-Type: application/json' \
  -d '{"cmd":"sweep","args":[[[10,8,14,0,1,0],[10,10,30,-70,2,40],[14,8,-18,50,1,-30]]]}'

# 5. voltar a câmera para o veículo
curl -s -X POST http://localhost:4477/cmd -H 'Content-Type: application/json' \
  -d '{"cmd":"resumeChase","args":[]}'

# 6. listar capturas
curl -s http://localhost:4477/list
```

Loop completo do agente de visão:

```
POST /cmd viewSnap -> esperar ~1s -> read_image _shots/nome.png -> ajustar
(código/Blender) -> repetir
```

## Testes

```
npm run test:mcp         # protocolo + tools de leitura (não toca no jogo)
npm run test:mcp:live    # inclui as que mexem na cena (set_view, snap, sweep…)
```

O primeiro é seguro de correr com um agente a meio de uma captura; o segundo não
é — `record`, `sweep` e `load_level` alteram o jogo em curso.

## Limitação conhecida: o editor

`EditorScene` monta um `DebugCapture` sempre que a página leva `?debug`, mas o
editor usa `OrbitControls` com damping e chama `controls.update()` a cada frame,
o que re-aponta a câmera para o alvo da órbita. Um `setView`/`sweep` dentro do
editor pode ser anulado por isso — o teleporte determinístico é garantido no
jogo. Para capturas no editor, desligar o damping ou sincronizar
`controls.target` com o alvo pedido.
