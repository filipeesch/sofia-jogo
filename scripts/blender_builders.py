import bpy, bmesh, math

# ---------------------------------------------------------------- helpers

def _hex(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) / 255 for i in (0, 2, 4)) + (1.0,)

def _mat(name, hexcolor, rough=0.9, emissive=None, estr=0.0):
    m = bpy.data.materials.get(name)
    if not m:
        m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes.get('Principled BSDF')
    if not b:
        b = nt.nodes.get('Material Output').links.from_node if nt.nodes.get('Material Output') else None
        if b is None:
            b = nt.nodes.new('ShaderNodeBsdfPrincipled')
    b.inputs['Base Color'].default_value = _hex(hexcolor)
    b.inputs['Roughness'].default_value = rough
    # emissive (Blender 4.x+ names)
    for en in ('Emission Color', 'Emission'):
        if en in b.inputs:
            if emissive:
                b.inputs[en].default_value = _hex(emissive)
                b.inputs['Emission Strength'].default_value = estr
            break
    return m

def _fresh(name):
    """create a fresh mesh object with given name, delete old mesh data of same name first"""
    old = bpy.data.objects.get(name)
    if old:
        bpy.data.objects.remove(old, do_unlink=True)
    me = bpy.data.meshes.new(name)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob

def _setloc(ob, x, y, z):
    ob.location = (x, y, z)

def _setrot(ob, rx, ry, rz):
    ob.rotation_euler = (rx, ry, rz)

def _setdim(ob, dx, dy, dz):
    ob.dimensions = (dx, dy, dz)

def _setscale(ob, sx, sy, sz):
    ob.scale = (sx, sy, sz)

def _matassign(ob, mat):
    ob.data.materials.clear()
    ob.data.materials.append(mat)

def _shade_flat(ob):
    for p in ob.data.polygons:
        p.use_smooth = False

def _mesh_sphere(name, r, x, y, z, seg=16, ring=12, mat=None, scale=None):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x, y, z), segments=seg, ring_count=ring)
    ob = bpy.context.object
    ob.name = name
    if scale:
        _setscale(ob, *scale)
    _matassign(ob, mat)
    _shade_flat(ob)
    return ob

def _mesh_cyl(name, r, depth, x, y, z, mat=None, verts=16, rot=None, scale=None):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=(x, y, z), vertices=verts)
    ob = bpy.context.object
    ob.name = name
    if rot:
        _setrot(ob, *rot)
    if scale:
        _setscale(ob, *scale)
    _matassign(ob, mat)
    _shade_flat(ob)
    return ob

def _mesh_cone(name, r, depth, x, y, z, mat=None, verts=16, rot=None, scale=None):
    bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=0, depth=depth, location=(x, y, z), vertices=verts)
    ob = bpy.context.object
    ob.name = name
    if rot:
        _setrot(ob, *rot)
    if scale:
        _setscale(ob, *scale)
    _matassign(ob, mat)
    _shade_flat(ob)
    return ob

def _mesh_cube(name, dx, dy, dz, x, y, z, mat=None, bevel=0.0, rot=None, scale=None):
    bpy.ops.mesh.primitive_cube_add(location=(x, y, z))
    ob = bpy.context.object
    ob.name = name
    _setdim(ob, dx, dy, dz)
    if bevel > 0:
        bpy.ops.object.modifier_add(type='BEVEL')
        ob.modifiers['Bevel'].width = bevel
        ob.modifiers['Bevel'].segments = 2
    if rot:
        _setrot(ob, *rot)
    if scale:
        _setscale(ob, *scale)
    _matassign(ob, mat)
    _shade_flat(ob)
    return ob

def _root(name):
    old = bpy.data.objects.get(name)
    if old:
        for c in list(old.children):
            bpy.data.objects.remove(c, do_unlink=True)
        bpy.data.objects.remove(old, do_unlink=True)
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
    ob = bpy.context.object
    ob.name = name
    return ob

def _join(objs):
    """join list of objects into first; returns the joined object"""
    if len(objs) == 1:
        return objs[0]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    return bpy.context.view_layer.objects.active

def _parent_all(root, objs):
    for o in objs:
        o.parent = root
        o.matrix_parent_inverse = root.matrix_world.inverted()

def _finish(root, objs, glb):
    """parent to root, select root+children, export glb (y-up)."""
    _parent_all(root, objs)
    bpy.ops.object.select_all(action='DESELECT')
    root.select_set(True)
    for c in root.children_recursive:
        c.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=glb,
        export_format='GLB',
        use_selection=True,
        export_yup=True,
        export_apply=True,
    )
    print("exported", glb)

BASE = "/Users/filipe.esch/projects/pessoal/sofia-jogo/public/models"

# ================================================================ COW
def build_cow():
    root = _root("Cow")
    white = _mat("CowWhite", "#f5f1e8", 0.9)
    spot = _mat("CowSpot", "#3a3a40", 0.9)
    pink = _mat("CowPink", "#f2a0b4", 0.85)
    cream = _mat("CowCream", "#f0dcb4", 0.85)
    parts = []
    # body (big round, front toward -Y)
    parts.append(_mesh_sphere("CwBody", 0.5, 0, 0, 0.85, mat=white, scale=(1.0, 1.25, 0.95)))
    # head big
    parts.append(_mesh_sphere("CwHead", 0.34, 0, -0.62, 1.15, mat=white))
    # muzzle (front, pink)
    parts.append(_mesh_sphere("CwMuzzle", 0.17, 0, -0.88, 1.02, mat=pink, scale=(1.1, 0.8, 0.9)))
    # eyes white + pupil
    ew = _mat("EyeWhite", "#ffffff", 0.5)
    blk = _mat("Pupil", "#202028", 0.5)
    for sx in (-1, 1):
        parts.append(_mesh_sphere("CwEye% s" % ("L" if sx<0 else "R"), 0.07, sx*0.17, -0.85, 1.28, mat=ew))
        parts.append(_mesh_sphere("CwPupil% s" % ("L" if sx<0 else "R"), 0.035, sx*0.17, -0.90, 1.28, mat=blk))
    # cheeks pink
    for sx in (-1, 1):
        parts.append(_mesh_sphere("CwCheek" + ("L" if sx<0 else "R"), 0.05, sx*0.24, -0.82, 1.10, mat=pink))
    # horns small cream (rounded cones)
    for sx in (-1, 1):
        parts.append(_mesh_cone("CwHorn" + ("L" if sx<0 else "R"), 0.05, 0.14, sx*0.16, -0.55, 1.5, mat=cream, rot=(math.radians(-20), 0, 0)))
    # ears
    for sx in (-1, 1):
        parts.append(_mesh_sphere("CwEar" + ("L" if sx<0 else "R"), 0.09, sx*0.36, -0.62, 1.32, mat=white, scale=(0.6, 1, 1)))
    # 4 legs white + hooves
    for lx, lz in ((-0.28, 0.35), (0.28, 0.35), (-0.28, -0.35), (0.28, -0.35)):
        parts.append(_mesh_cyl("CwLeg", 0.085, 0.55, lx, 0, lz, mat=white, rot=(math.radians(90), 0, 0)))
        parts.append(_mesh_cyl("CwHoof", 0.085, 0.14, lx, 0, lz, mat=spot, rot=(math.radians(90), 0, 0), scale=(1, 1, 1)))
    # hooves actually at bottom: reposition (cyl rotated 90 about X lies along Y). keep simple.
    # spots on body
    parts.append(_mesh_sphere("CwSpot1", 0.16, 0.3, -0.2, 1.05, mat=spot, scale=(1, 1, 0.7)))
    parts.append(_mesh_sphere("CwSpot2", 0.13, -0.35, 0.25, 0.95, mat=spot, scale=(1, 1, 0.7)))
    # tail
    parts.append(_mesh_cyl("CwTail", 0.04, 0.4, 0, 0.5, 0.95, mat=white, rot=(math.radians(140), 0, 0)))
    parts.append(_mesh_sphere("CwTailTuft", 0.07, 0, 0.62, 0.78, mat=spot))
    # udder
    parts.append(_mesh_sphere("CwUdder", 0.12, 0, 0.3, 0.62, mat=pink, scale=(1.2, 0.8, 0.8)))
    _finish(root, parts, BASE + "/cow.glb")

# ================================================================ SHEEP
def build_sheep():
    root = _root("Sheep")
    wool = _mat("SheepWool", "#fbf7ee", 0.95)
    face = _mat("SheepFace", "#5a4a42", 0.9)
    ew = _mat("EyeWhite", "#ffffff", 0.5)
    blk = _mat("Pupil", "#202028", 0.5)
    parts = []
    # fluffy wool: overlapping spheres
    parts.append(_mesh_sphere("SpWool", 0.42, 0, 0, 0.8, mat=wool, scale=(1.1, 1.3, 0.95)))
    parts.append(_mesh_sphere("SpWool2", 0.3, -0.28, -0.1, 1.0, mat=wool))
    parts.append(_mesh_sphere("SpWool3", 0.3, 0.3, -0.05, 0.95, mat=wool))
    # head dark
    parts.append(_mesh_sphere("SpHead", 0.2, 0, -0.55, 1.05, mat=face))
    for sx in (-1, 1):
        parts.append(_mesh_sphere("SpEye" + ("L" if sx<0 else "R"), 0.055, sx*0.1, -0.68, 1.12, mat=ew))
        parts.append(_mesh_sphere("SpPupil" + ("L" if sx<0 else "R"), 0.028, sx*0.1, -0.72, 1.12, mat=blk))
        parts.append(_mesh_sphere("SpEar" + ("L" if sx<0 else "R"), 0.07, sx*0.22, -0.5, 1.15, mat=face, scale=(0.6, 1, 1)))
    # 4 short dark legs
    for lx, lz in ((-0.2, 0.25), (0.2, 0.25), (-0.2, -0.25), (0.2, -0.25)):
        parts.append(_mesh_cyl("SpLeg", 0.07, 0.5, lx, 0, lz, mat=face))
    # tail little wool
    parts.append(_mesh_sphere("SpTail", 0.1, 0, 0.45, 1.0, mat=wool))
    _finish(root, parts, BASE + "/sheep.glb")

# ================================================================ CHICKEN
def build_chicken():
    root = _root("Chicken")
    cream = _mat("ChkCream", "#f7f3ea", 0.9)
    orange = _mat("ChkOrange", "#ff9e3d", 0.85)
    red = _mat("ChkRed", "#e84545", 0.85)
    blk = _mat("Pupil", "#202028", 0.5)
    parts = []
    # body
    parts.append(_mesh_sphere("CkBody", 0.24, 0, 0, 0.28, mat=cream, scale=(1, 1.15, 1)))
    # head
    parts.append(_mesh_sphere("CkHead", 0.14, 0, -0.18, 0.52, mat=cream))
    # comb 3 bumps
    for i, dx in enumerate((-0.07, 0, 0.07)):
        parts.append(_mesh_sphere("CkComb%d" % i, 0.045, dx, -0.2, 0.66, mat=red))
    # beak
    parts.append(_mesh_cone("CkBeak", 0.05, 0.12, 0, -0.32, 0.5, mat=orange, rot=(math.radians(-90), 0, 0)))
    # wattle
    parts.append(_mesh_sphere("CkWattle", 0.04, 0, -0.26, 0.42, mat=red))
    # eyes
    for sx in (-1, 1):
        parts.append(_mesh_sphere("CkEye" + ("L" if sx<0 else "R"), 0.03, sx*0.08, -0.27, 0.55, mat=blk))
    # wings
    for sx in (-1, 1):
        parts.append(_mesh_sphere("CkWing" + ("L" if sx<0 else "R"), 0.1, sx*0.2, 0, 0.32, mat=cream, scale=(0.5, 1.2, 0.8)))
    # tail feathers
    for i, dx in enumerate((-0.06, 0, 0.06)):
        parts.append(_mesh_sphere("CkTail%d" % i, 0.05, dx, 0.24, 0.42, mat=cream, scale=(0.5, 1, 1.4)))
    # legs + feet
    for sx in (-1, 1):
        parts.append(_mesh_cyl("CkLeg%d" % (0 if sx<0 else 1), 0.025, 0.18, sx*0.08, 0, 0, mat=orange))
        parts.append(_mesh_cyl("CkFoot%d" % (0 if sx<0 else 1), 0.05, 0.03, sx*0.08, -0.04, 0.015, mat=orange, rot=(math.radians(90), 0, 0)))
    _finish(root, parts, BASE + "/chicken.glb")

# ================================================================ DUCK
def build_duck():
    root = _root("Duck")
    yellow = _mat("DkYellow", "#ffd23f", 0.85)
    orange = _mat("DkOrange", "#ff8c42", 0.85)
    white = _mat("DkWhite", "#fdfaf2", 0.85)
    blk = _mat("Pupil", "#202028", 0.5)
    parts = []
    # body
    parts.append(_mesh_sphere("DkBody", 0.22, 0, 0, 0.2, mat=yellow, scale=(1.1, 1.25, 0.9)))
    # head
    parts.append(_mesh_sphere("DkHead", 0.13, 0, -0.2, 0.4, mat=yellow))
    # beak flat cone
    parts.append(_mesh_cone("DkBeak", 0.06, 0.14, 0, -0.32, 0.38, mat=orange, rot=(math.radians(-90), 0, 0), scale=(1.3, 0.6, 1)))
    # eyes
    for sx in (-1, 1):
        parts.append(_mesh_sphere("DkEye" + ("L" if sx<0 else "R"), 0.035, sx*0.09, -0.29, 0.45, mat=blk))
    # wings white
    for sx in (-1, 1):
        parts.append(_mesh_sphere("DkWing" + ("L" if sx<0 else "R"), 0.11, sx*0.19, 0.02, 0.22, mat=white, scale=(0.5, 1.2, 0.85)))
    # tail
    parts.append(_mesh_cone("DkTail", 0.07, 0.14, 0, 0.24, 0.3, mat=yellow, rot=(math.radians(60), 0, 0)))
    # feet orange
    for sx in (-1, 1):
        parts.append(_mesh_cyl("DkFoot" + ("L" if sx<0 else "R"), 0.05, 0.03, sx*0.08, -0.04, 0.015, mat=orange, rot=(math.radians(90), 0, 0)))
    _finish(root, parts, BASE + "/duck.glb")

# ================================================================ DOG
def build_dog():
    root = _root("Dog")
    tan = _mat("DgTan", "#d8a35f", 0.9)
    white = _mat("DgWhite", "#f5efe2", 0.9)
    dark = _mat("DgDark", "#8a6a48", 0.9)
    blk = _mat("Pupil", "#202028", 0.5)
    pink = _mat("DgPink", "#f2a0b4", 0.85)
    parts = []
    # body
    parts.append(_mesh_sphere("DgBody", 0.3, 0, 0, 0.45, mat=tan, scale=(1, 1.3, 0.95)))
    # chest white
    parts.append(_mesh_sphere("DgChest", 0.2, 0, -0.2, 0.35, mat=white, scale=(1, 1, 0.9)))
    # head
    parts.append(_mesh_sphere("DgHead", 0.22, 0, -0.42, 0.75, mat=tan))
    # snout
    parts.append(_mesh_sphere("DgSnout", 0.11, 0, -0.56, 0.68, mat=white, scale=(1, 0.9, 0.85)))
    # nose
    parts.append(_mesh_sphere("DgNose", 0.05, 0, -0.64, 0.7, mat=blk))
    # eyes
    for sx in (-1, 1):
        parts.append(_mesh_sphere("DgEye" + ("L" if sx<0 else "R"), 0.045, sx*0.12, -0.56, 0.85, mat=blk))
    # ears floppy dark
    for sx in (-1, 1):
        parts.append(_mesh_sphere("DgEar" + ("L" if sx<0 else "R"), 0.09, sx*0.2, -0.42, 0.88, mat=dark, scale=(0.5, 1.2, 1)))
    # 4 legs tan
    for lx, lz in ((-0.16, 0.22), (0.16, 0.22), (-0.16, -0.22), (0.16, -0.22)):
        parts.append(_mesh_cyl("DgLeg", 0.06, 0.4, lx, 0, lz, mat=tan))
        parts.append(_mesh_sphere("DgPaw" + str(lx) + str(lz), 0.06, lx, 0, lz, mat=dark, scale=(1, 1, 0.6)))
    # tail
    parts.append(_mesh_cyl("DgTail", 0.05, 0.3, 0, 0.4, 0.6, mat=tan, rot=(math.radians(120), 0, 0)))
    # tongue
    parts.append(_mesh_sphere("DgTongue", 0.04, 0, -0.62, 0.6, mat=pink, scale=(0.7, 0.7, 1.2)))
    _finish(root, parts, BASE + "/dog.glb")

# ================================================================ CAT
def build_cat():
    root = _root("Cat")
    orange = _mat("CtOrange", "#f5994b", 0.9)
    white = _mat("CtWhite", "#f7f3ea", 0.9)
    blk = _mat("Pupil", "#202028", 0.5)
    pink = _mat("CtPink", "#f2a0b4", 0.85)
    parts = []
    # body
    parts.append(_mesh_sphere("CtBody", 0.26, 0, 0, 0.35, mat=orange, scale=(1, 1.2, 0.95)))
    # belly white
    parts.append(_mesh_sphere("CtBelly", 0.18, 0, -0.14, 0.3, mat=white, scale=(0.9, 1, 0.9)))
    # head
    parts.append(_mesh_sphere("CtHead", 0.2, 0, -0.34, 0.62, mat=orange))
    # ears (rounded cones)
    for sx in (-1, 1):
        parts.append(_mesh_cone("CtEar" + ("L" if sx<0 else "R"), 0.08, 0.14, sx*0.14, -0.3, 0.78, mat=orange, rot=(0, 0, math.radians(20 if sx>0 else -20))))
        parts.append(_mesh_sphere("CtEarIn" + ("L" if sx<0 else "R"), 0.04, sx*0.13, -0.33, 0.76, mat=pink))
    # eyes big
    for sx in (-1, 1):
        parts.append(_mesh_sphere("CtEye" + ("L" if sx<0 else "R"), 0.05, sx*0.1, -0.48, 0.66, mat=blk))
    # muzzle + nose
    parts.append(_mesh_sphere("CtMuzzle", 0.09, 0, -0.48, 0.56, mat=white, scale=(1, 0.8, 0.8)))
    parts.append(_mesh_sphere("CtNose", 0.03, 0, -0.54, 0.58, mat=pink))
    # 4 short legs
    for lx, lz in ((-0.13, 0.18), (0.13, 0.18), (-0.13, -0.18), (0.13, -0.18)):
        parts.append(_mesh_cyl("CtLeg", 0.05, 0.3, lx, 0, lz, mat=orange))
    # tail long with darker tip
    parts.append(_mesh_cyl("CtTail", 0.04, 0.3, 0, 0.3, 0.4, mat=orange, rot=(math.radians(110), 0, 0)))
    parts.append(_mesh_sphere("CtTailTip", 0.05, 0, 0.4, 0.5, mat=blk))
    _finish(root, parts, BASE + "/cat.glb")
