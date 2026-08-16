# Workflow — revisão visual (agente com visão + MCP)

Revisa visualmente os objetos 3D do Blender renderizando cada um e analisando com
um agente que aceita imagens.

## Como funciona
A tool `workflow` orquestra um agente que usa o MCP do Blender para renderizar
cada objeto em PNG (em `_shots/*.png`) e lê as imagens com `read_image`.

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
     to look at the object and render to /Users/filipe.esch/projects/pessoal/sofia-jogo/_shots/<name>.png.
   - Call read_image on the PNG (you accept images) and inspect it.
3. For each object check: upright orientation, plausible scale/proportions, parts
   connected (nothing detached), no deformities.
4. Return a numbered report in Portuguese: per object "OK" or "PROBLEM: <desc> — <fix>".

## Observação
- Os PNGs ficam em _shots/ (gitignorado) e podem ser reutilizados depois.
