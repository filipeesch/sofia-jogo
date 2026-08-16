# Debug Capture — viewport do jogo em runtime

Permite controlar a câmera do jogo rodando e capturar imagens/vídeos para o
modelo de visão revisar o cenário real (luz, dia/noite, tráfego, animais).

## Como usar
1. Terminal 1: npm run dev
2. Terminal 2: npm run shots   (servidor de captura na porta 4477, salva em _shots/)
3. Navegador: http://localhost:5173/?debug=1  (o sufixo ?debug=1 ativa o modo)

## API no console do navegador (window.__debug)
- __debug.setView(px, py, pz, tx, ty, tz)  — posiciona a câmera olhando para um alvo
  (ex.: __debug.setView(8, 6, 8, 0, 0, 0) vê a vila de cima).
- __debug.snap('nome.png')  — captura o frame atual e envia ao servidor.
- __debug.record(10)  — grava um vídeo de 10s e envia (webm).
- __debug.stopRecord()  — para a gravação antes do tempo.
- __debug.sweep([[px,py,pz,tx,ty,tz], ...])  — voa a câmera por vários pontos,
  capturando um PNG em cada ponto (ex.: tour pela vila, fazenda, lago, floresta).
- __debug.resumeChase()  — volta a câmera para seguir o veículo.

## Exemplo de sweep (tour do Vale Vivo)
__debug.sweep([
  [10, 8, 14, 0, 1, 0],
  [10, 10, 30, -70, 2, 40],
  [14, 8, -18, 50, 1, -30],
  [10, 12, 50, 60, 2, 40]
]);

## Saída
Os arquivos ficam em _shots/ (gitignorado) prontos para o agente de visão
ler com read_image.

## MCP do jogo (interface para o AGENTE — caminho preferido)

Registrado no DSH em ~/.dsh/profiles/web/cordis.patch.yml como serverName `game`
(scripts/game-mcp.mjs, stdio). Depois de reiniciar/recarregar o DSH, o agente ganha
as ferramentas:

- mcp__game__set_view_and_snap(px,py,pz,tx,ty,tz,filename)
- mcp__game__set_view(px,py,pz,tx,ty,tz)
- mcp__game__snap(filename)
- mcp__game__record(seconds)
- mcp__game__sweep(points)
- mcp__game__resume_chase()
- mcp__game__list_captures()

Pré-requisitos para o loop fechar:
1. Terminal: npm run dev + abrir http://localhost:5173/?debug=1
2. Terminal: npm run shots (servidor de captura na 4477)
3. Reiniciar o DSH para carregar o novo MCP.

Fluxo do agente de visão:
  mcp__game__set_view_and_snap(8,6,8, 0,0,0, "vila.png") -> read_image _shots/vila.png
  -> ajustar (código/Blender) -> repetir.

## Canal de comandos HTTP (alternativa manual, via curl)

O jogo em modo debug faz polling de comandos no servidor. Um agente (subagent ou
script) controla tudo via curl:

    # 1. posicionar a câmera E capturar um frame (com nome)
    curl -s -X POST http://localhost:4477/cmd -H 'Content-Type: application/json' \\
      -d '{"cmd":"viewSnap","args":[8,6,8,0,0,0,"vila.png"]}'

    # 2. capturar o frame atual
    curl -s -X POST http://localhost:4477/cmd -H 'Content-Type: application/json' \\
      -d '{"cmd":"snap","args":["frame.png"]}'

    # 3. gravar 10s de vídeo
    curl -s -X POST http://localhost:4477/cmd -H 'Content-Type: application/json' \\
      -d '{"cmd":"record","args":[10]}'

    # 4. tour: voa pelos pontos e captura em cada um
    curl -s -X POST http://localhost:4477/cmd -H 'Content-Type: application/json' \\
      -d '{"cmd":"sweep","args":[[[10,8,14,0,1,0],[10,10,30,-70,2,40],[14,8,-18,50,1,-30]]]}'

    # 5. voltar a câmera para o veículo
    curl -s -X POST http://localhost:4477/cmd -H 'Content-Type: application/json' \\
      -d '{"cmd":"resumeChase","args":[]}'

    # 6. listar capturas
    curl -s http://localhost:4477/list

Loop completo do agente de visão:
  POST /cmd viewSnap -> esperar ~1s -> read_image _shots/nome.png -> ajustar
  (código/Blender) -> repetir.
