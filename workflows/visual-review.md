# Workflow — revisão visual com modelo de visão (Qwen)

Revisa visualmente os objetos 3D do Blender renderizando cada um e analisando com
um modelo que aceita imagens (ex.: Qwen 3.8 27B).

## Como funciona
A tool `workflow` aceita override de modelo por agente/fase (`model`).
O agente de visão usa o MCP do Blender para renderizar cada objeto em PNG
(em `_shots/*.png`) e lê as imagens com `read_image`.

## Como executar (quando o spawn de agentes estiver funcionando)
```js
const r = await tools.workflow({
  meta: {
    name: 'visual-review-blender',
    description: 'Renderizar objetos do Blender e analisar com modelo de visão',
    phases: [{ title: 'review', detail: 'Renderizar e analisar objetos', model: '<MODEL_ID>' }]
  },
  script: `
phase('review');
const report = await agent(
  'You are a visual QA reviewer with vision... (prompt completo abaixo)',
  { label: 'visual-review', phase: 'review', model: '<MODEL_ID>' }
);
return report;
`
});
```

## Prompt do agente
You are a visual QA reviewer with vision. A Blender scene (accessible via the MCP
tools mcp__blender__execute_blender_code, mcp__blender__get_scene_info) holds 3D
assets of a children game. Analyze the objects VISUALLY and report concrete problems.

Steps:
1. Call mcp__blender__get_scene_info to list objects.
2. For EACH of: Barn, Fence, Lamp, Bench, Cow, Duck, Bush, Flower, Car, Dog, Cat,
   Chicken, Sheep (and if time permits: AppleTree, Palm, Tree, House, Snowman,
   Cactus, Pyramid, Whale, Bird, Balloon, Peak, Mountain):
   - Use mcp__blender__execute_blender_code with Python to move the scene camera
     to look at the object and render to /Users/filipe.esch/projects/pessoal/sofia-jogo/_shots/<name>.png
     (camera location = obj + offset; rotation = direction.to_track_quat('-Z','Y').to_euler();
     then bpy.ops.render.render(write_still=True, filepath=...)).
   - Call read_image on the PNG (you accept images) and inspect it.
3. For each object check: upright orientation, plausible scale/proportions, parts
   connected (nothing detached), no deformities.
4. Return a numbered report in Portuguese: per object "OK" or "PROBLEM: <desc> — <fix>".

## Credenciais confirmadas pelo usuário
- provider: `llm-pi-ai`
- model: `qwen3.8-27b-radixark-nvfp4`

Use no meta.phases OU no agent: `{ provider: 'llm-pi-ai', model: 'qwen3.8-27b-radixark-nvfp4' }`.

## Observação
- Os PNGs ficam em _shots/ (gitignorado) e podem ser reutilizados depois.
- Em 2026-xx-xx o spawn de agentes (subagent/workflow) estava indisponível na sessão;
  quando voltar, rodar este workflow.
