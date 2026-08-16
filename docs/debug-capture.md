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
Os arquivos ficam em _shots/ (gitignorado) prontos para o modelo de visão
(read_image) ou para o subagent Qwen quando o spawn estiver disponível.
