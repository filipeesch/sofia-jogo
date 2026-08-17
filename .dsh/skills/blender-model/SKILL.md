---
name: blender-model
description: Modelar objetos 3D para o jogo Avião Aventureiro usando o Blender MCP (execute_blender_code) — toy low-poly infantilizado, com detalhes reconhecíveis, exportando GLB otimizado (draw calls ≈ 1 por material; root EMPTY + meshes com nomes/material names específicos).
---

# Modelagem de objetos (Blender MCP)

Você cria os objetos 3D do jogo **Avião Aventureiro** (`.glb` em
`public/models/`) usando o Blender via MCP. O alvo: **objetos reais
reconhecíveis, mas infantilizados** — versão "brinquedo" fofa, low-poly, de
cores vivas, com os detalhes que fazem a criança (2–3 anos) identificar o que é.

## 1. Estilo "infantilizado" (as regras de look)

1. **Flat shading (low-poly facetado)**: poucos polígonos, facetas visíveis,
   como os fallbacks do jogo (`flatShading: true`). Nada de alta densidade.
2. **Proporções gordinhas/atarracadas**: exagere o que é fofo — cabeça grande,
   corpo pequeno, pernas curtas (animais); janelas redondas grandes e chaminé
   torta (casa); rodas grandes (carro).
3. **Cantos arredondados**: bevel/suavizado, esferas/cápsulas em vez de caixas
   afiadas. Nunca quinas agressivas.
4. **Rosto amigável** (personagens/animais): 2 olhos grandes (esferas) + boca
   sorrindo (curva) + bochechas rosadas. **Sem dentes, garras, chifres afiados,
   armas ou texto.**
5. **Cores "bala"/candy**: saturadas, quentes, alto contraste, 2–3 cores por
   objeto, distintas do chão (o objeto precisa ser **visto**).
6. **Silhueta reconhecível de longe**: mesmo estilizado, lê-se "vaca", "casa",
   "carro" — a criança identifica pela forma, não pelo detalhe fino.
7. **Detalhes assinatura (2–4)**: modele só os traços que definem o objeto —
   casa = porta + janelas + telhado; vaca = 4 patas + chifres + manchas + rabo;
   carro = 4 rodas + farol + cabine. O resto, omita (é brinquedo, não foto).
8. **Escala consistente** (unidades ~metros, relativo ao mundo): casa ~3, árvore
   ~4, pirâmide ~7, pico ~15, baleia ~2.4 de corpo. Modelo 1:1 no jogo (o
   `Solid` da skill `level-gen` assume esses tamanhos).

## 2. Contrato do jogo (o que o código espera — não invente)

`src/assets.ts` (`loadGLB`) faz: pega a cena, move os filhos para um `Group`,
e seta `castShadow = true` em todo mesh. Consequências:

- **Root = 1 EMPTY** nomeado como o objeto (ex.: `Aviao`), na origem (0,0,0);
  **todos os meshes são filhos dele**. Não exporte a cena inteira com outros
  objetos soltos.
- **Y-up**: Three.js usa Y como "cima". Na exportação mantenha a conversão
  Y-up do exporter glTF (default). No Blender, o "cima" é Z; deixe o exporter
  converter.
- **Escala real 1:1**: não exporte escalas de 100×. Objeto na origem, de pé,
  com o pé em y=0 (não enterrado, não flutuando).

### Nomes que o código consulta (preserve EXATOS)

| Objeto | Contrato (o que o código procura) |
|---|---|
| **House** | **materiais** `Body`, `Roof`, `Windows` — `Body`/`Roof` são tingidos por `houseColors`; `Windows` acende à noite (emissive) |
| **Bird** | **meshes** `WingL`, `WingR` — asas animadas |
| **Lamp** | **mesh** `LampHead` — emissivo acende à noite |
| **Car** | **objetos** cujo nome começa com `Wheel` — rodas giram |
| Demais (whale, balloon, cow, tree, ...) | sem nomes especiais; qualquer nome descritivo |

Regra geral: nomeie meshes/materiais em inglês, descritivos, e **use os nomes
da tabela acima quando o objeto for desses tipos** (senão animação/tinta/brilho
não funcionam).

### Otimização de draw calls — 1 primitiva por material

**Por quê:** no Three.js cada `(mesh, material)` do GLB vira **um draw call por
instância em cena**. Vários modelos atuais explodiram em meshes soltos:
`aviao.glb` tem 31 meshes, `car.glb` 31, `cow` 26, `cat` 24, `chicken`
21, `bird` 21, `sheep` 18, `dog` 17, `whale` 19, `snowman` 23. Como o
cenário repete árvores/animais/carros dezenas de vezes, isso vira **milhares de
draw calls** (a causa do framerate baixo — ver `docs/performance.md`).

**Regra de ouro:** draw calls ≈ **nº de materiais distintos**, não nº de meshes.
- Use **2–4 materiais** por objeto (cor base + detalhe + vidro/janela + rodas…)
  e **reaproveite o mesmo material** (mesmo datablock) em várias partes — não
  crie material novo só porque a cor é igual.
- **Junte (Join) todos os meshes que compartilham o mesmo material** num único
  mesh. Resultado: nº de meshes ≈ nº de materiais.

**Só fica separado o que o código consulta por nome** (animação/tinta/brilho):
`Propeller` (avião, gira), objetos `Wheel*` (carro, giram), `WingL`/`WingR`
(pássaro, batem), mesh `LampHead` (poste, emissivo) e materiais `Body`/`Roof`/
`Windows` (casa, tinta + janela). Todo o resto (fuselagem, cauda, patas,
manchas, chifres…) **junta por material**.

**Alvo orientativo de meshes por modelo:** avião ~5–10, carro ~6–8, vaca ~4–6,
pássaro ~4–6, baleia ~3–5, casa ~4–6, boneco ~4–6, árvore ~3–4. **Nunca 20+.**

**Como juntar no Blender (por material):**
1. Garanta que as partes de mesma cor usam o **mesmo material** (não cópias com
   a mesma cor).
2. Selecione-as e `Join` (`Ctrl+J`) — vira um objeto com 1 material ⇒ 1
   primitiva ⇒ 1 draw call. Repita por material; depois parenteie no root EMPTY
   (seção 3).

**Verificação:** com `?debug=1`, `window.__debug.stats()` retorna
`{ calls, triangles, ... }`. Após exportar e carregar no jogo, o draw call do
modelo deve ser ≈ o nº de materiais (não o nº de meshes do Blender).

### Objetos por mundo (paleta de bioma — combine com a skill `level-gen`)

`assets.ts` define quais GLBs cada mundo carrega. Verifique sempre em
`src/assets.ts` (mapa `WORLD_MODELS`) antes de criar: o nome do arquivo deve
bater com o `name` lá (`snowman.glb`, `pine.glb`, `barn.glb`, ...).

## 3. Workflow via Blender MCP

Ferramentas relevantes:

- `execute_blender_code(code)` — **a principal**: roda Python (bpy) no Blender.
- `get_viewport_screenshot(max_size)` — foto do viewport (você **vê** o modelo).
- `get_scene_info` / `get_object_info` — inspecionar o que já existe.
- `get_addon_status` — checar se o addon está ok (se "outdated", fallback de
  `execute_blender_code` continua funcionando).

### Passo a passo

1. **Limpe**: apague malha/objetos de tentativas anteriores (ou trabalhe em
   coleção nova).
2. **Root EMPTY**: `bpy.ops.object.empty_add(type='PLAIN_ARROWS')`, renomeie
   para o nome do objeto, localização (0,0,0).
3. **Modele os meshes** como filhos do root (primitivas + bevel + shade flat).
   Cada mesh com material nomeado (seguindo a tabela de contratos).
4. **Parent**: `mesh.parent = root` (mantenha as transforms locais corretas).
5. **Export GLB** (selecionando só o root):
   ```python
   import bpy
   root = bpy.data.objects["Aviao"]
   bpy.ops.object.select_all(action='DESELECT')
   root.select_set(True)
   for c in root.children_recursive: c.select_set(True)
   bpy.ops.export_scene.gltf(
       filepath="/Users/filipe.esch/projects/pessoal/sofia-jogo/public/models/aviao.glb",
       export_format='GLB',
       use_selection=True,   # só o root + filhos
       export_yup=True,      # Z-up (Blender) -> Y-up (Three.js)
       export_apply=True,    # aplica modificadores (bevel)
   )
   ```
   (Opções podem variar com a versão do addon; confira o log se falhar.)
6. **Verifique** (seção 4).

### Material (Principled BSDF → GLB → MeshStandardMaterial)

- **Base Color** = a cor do objeto. `Roughness` alto (0.7–0.95) pra toy.
- **Emissive** (Windows/LampHead): dê emissão fraca + o código controla a
  intensidade à noite. Nome do material = o que o código espera (`Windows`).
- **Flat shading**: marque `Shade Flat` (menu Object > Shade Flat) ou
  `mesh.data.use_auto_smooth = False`.

### Primitivas + bevel (receita rápida)

```python
import bpy, bmesh

def add_rounded_box(name, size, radius=0.2, location=(0,0,0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object; obj.name = name
    bpy.ops.object.modifier_add(type='BEVEL')
    obj.modifiers["Bevel"].width = radius
    obj.modifiers["Bevel"].segments = 2
    obj.dimensions = size
    return obj
```

Use `primitive_uv_sphere_add`, `primitive_cylinder_add`, `primitive_cone_add`
(idem). Compor = parentar filho no root. Detalhe assinatura: olhos (esferas),
chaminé (cilindro), rodas (cilindro achatado) etc.

## 4. Verificação (você tem visão — use)

1. **No Blender**: `get_viewport_screenshot` e **olhe** — proporção certa?
   reconhecível? fofo? algum mesh solto/fora do root?
2. **No jogo**: `set_view`/`snap`/`set_view_and_snap` posicionando a câmera
   perto do objeto + `read_image` no `_shots/*.png` — o objeto aparece de pé,
   na escala certa, com cor contrastando com o chão, sem buraco/z-fight?
3. **Cheque o contrato**: mesh/material names batem com a tabela (se for House/
   Bird/Lamp/Car). Senão animação/tinta/brilho ficam mudos.

## 5. Definition of Done

1. GLB exportado em `public/models/<nome>.glb` (root EMPTY único + meshes filhos).
2. Nomes de mesh/material conformes à tabela de contratos (quando aplicável).
3. Flat-shaded, toy, infantilizado, reconhecível de longe.
4. Screenshot (Blender) + snap (jogo) **olhados** e aprovados por você.
5. `npm run typecheck` passa e o jogo carrega o modelo sem warning de load.
6. Modelo otimizado: meshes fundidos por material — draw calls ≈ nº de materiais; só ficam separados os nós nomeados (`Propeller`, `Wheel*`, `Wing*`, `LampHead`, materiais `Body`/`Roof`/`Windows`).

## 6. Aceleradores opcionais (use com critério)

- `generate_hyper3d_model_via_text` / `via_images` e `generate_hunyuan3d_model`:
  geram uma base 3D por texto/imagem que você pode **refinar** no Blender (não
  é o produto final — normalize escala, aplique flat shading, ajuste cor, e
  refaça os nomes/root conforme o contrato).
- `search_sketchfab_models` + `download_sketchfab_model`: base/referência de
  silhueta (sempre re-exporte com o contrato do jogo e chegue a escala/estilo).
- Polyhaven (`search/download`): texturas/materiais PBR — raramente necessárias
  (o jogo usa cor sólida + roughness; evite textura pesada pra toy look).
