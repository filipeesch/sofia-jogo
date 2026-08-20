# Editor de Mapas (🛠️)

Ferramenta de desenvolvimento para criar e editar fases do Avião Aventureiro.
Aberta pelo launcher (item "🛠️ Editor") ou pela URL `?editor=1[&level=<id>]`.
Por ser ferramenta de dev, o editor tem textos e um "game over" invisível —
as regras do jogo (sem texto, sem punição) valem só para a experiência de
criança; aqui a conveniência do dev importa mais.

## Arquitetura

| Arquivo | Papel |
| --- | --- |
| `src/editor/levelData.ts` | Modelo de save (`LevelData`, versão 1), conversão procedural → dados (`layoutToLevelData`), `normalizeLevelData`, `resolveLevelData` (JSON da build → localStorage → procedural) e `saveToLocalStorage`. Também exporta `terrainHeightFor` (altura do terreno por tipo de mundo). |
| `src/editor/editorTypes.ts` | Tipos do editor (`Mode`, `Category`, `Sel`, `PlaceSpec`, `EditorCallbacks`), limites de posicionamento (`BOUND = 140`, `ISLAND_BOUND = 70`), metadados de animais/árvores e paletas por mundo (`PALETTES`). |
| `src/editor/entries.ts` | Helpers puros entre `LevelData` e itens do outliner (arrays por categoria, posição, proxy de colisão). |
| `src/editor/editorDom.ts` | Fábricas de DOM (botões, linhas de propriedade numérica/texto/select). |
| `src/editor/EditorScene.ts` | Camada 3D: renderer, `World` com os dados, picking (objetos → alças → estradas → chão por marcha de raios), overlays de estrada (CatmullRom), alças, fantasma de posicionamento, tour do carro em ciano, sombras e estado dia/fixo. |
| `src/editor/EditorApp.ts` | Estado e interação: modos (selecionar/estrada/apagar/posicionar), rascunho de estrada, seleção, undo/redo, painéis (topo, paleta + outliner, propriedades, tour), persistência (salvar/baixar/importar) e troca/criação de fases. Modo ao vivo: `▶ Testar` passa o objeto `LevelData` para o `Game` real; o botão de voltar do jogo reabre o editor com **o mesmo objeto** (sem reload). |
| `src/editor/editor.css` | Estilo dos painéis. |

## Modelo de dados (`LevelData`)

`public/levels/<id>.json` e `localStorage["sofia:level:<id>"]`:

- `level`: config completa da fase (id, nome, emoji, cores, veículo, ciclo).
- `roads`: `number[][][]` — polilinhas de controle (CatmullRom centripetal),
  o mesmo formato dos módulos de layout procedural.
- `houses`, `lamps`, `benches`, `animals`, `trees`, `bushes`, `flowers`,
  `barn?`, `fencePosts`, `snowmen`, `pyramids`, `cacti`, `flightWaypoints?`.

O que o editor **não** edita (v1): o relevo do terreno (colinas, dunas,
montanhas, lagos) — ele é procedural por tipo de mundo e os objetos usam a
mesma função de altura que o jogo (`terrainHeightFor`).

## Fluxo de save/load

1. **Abrir**: `resolveLevelData(id)` tenta `levels/<id>.json` (save enviado
   na build), depois `localStorage`, senão usa o layout procedural.
2. **Salvar (💾)**: grava em `localStorage` e, em dev, faz `POST /save-level`
   (plugin do Vite, só em modo dev) que escreve `public/levels/<id>.json`.
   Fora de dev o save fica só no localStorage do navegador.
3. **Baixar (⬇)**: download do JSON (para enviar/commitar manualmente).
4. **Importar (⬆)**: lê um JSON, normaliza e aplica na fase atual.

`public/levels/*.json` está git-ignorado (são saves de dev do editor); para
enviar uma fase, use "Baixar JSON" e commit o arquivo.

## Atalhos

| Tecla | Ação |
| --- | --- |
| `V` / `R` / `X` | Selecionar / Estradas / Apagar |
| `Enter` ou botão direito | Terminar a estrada em rascunho |
| `Esc` | Cancela rascunho → deseleciona → volta a selecionar |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Desfazer / refazer |
| `Q` / `E` | Gira o selecionado ∓ 15° |
| `F` | Enquadra o selecionado |
| `Delete` | Apaga o selecionado |

## Rotas do carro

"▶ Testar com o carro" (ou a fase inteira) monta o tour com
`buildRoadTour` (`src/rails/roadTour.ts`): conecta as estradas pela
proximidade de extremos, sem cruzamentos, e percorre cada estrada até o fim.
O editor mostra o resultado no painel direito (distância e U-turns) e desenha
a rota em ciano quando "Rota do carro" está marcada. Com zero estradas o
carro faz um círculo no spawn (comportamento do jogo, não do editor).

## Modo ao vivo

"▶ Testar" monta o `Game` real com os dados atuais. O botão 🏠 do jogo volta
para o editor com o **mesmo objeto** `LevelData` (nenhum reload), então o que
se editou antes continua lá. O `Game` usa o mesmo `LevelData` para desenhar
estradas e objetos — o editor e o jogo compartilham a mesma fonte de verdade.
