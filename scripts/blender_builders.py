import bpy, math, mathutils

BASE = "/Users/filipe.esch/projects/pessoal/sofia-jogo/public/models"

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
    if b is None:
        b = nt.nodes.new('ShaderNodeBsdfPrincipled')
        out = nt.nodes.get('Material Output')
        if out:
            nt.links.new(b.outputs['BSDF'], out.inputs['Surface'])
    b.inputs['Base Color'].default_value = _hex(hexcolor)
    b.inputs['Roughness'].default_value = rough
    for en in ('Emission Color', 'Emission'):
        if en in b.inputs:
            if emissive:
                b.inputs[en].default_value = _hex(emissive)
                if 'Emission Strength' in b.inputs:
                    b.inputs['Emission Strength'].default_value = estr
            break
    return m

def _rot(ob, rx, ry, rz):
    ob.rotation_euler = (rx, ry, rz)

def _scale(ob, sx, sy, sz):
    ob.scale = (sx, sy, sz)

def _dim(ob, dx, dy, dz):
    ob.dimensions = (dx, dy, dz)

def _matassign(ob, mat):
    ob.data.materials.clear()
    ob.data.materials.append(mat)

def _flat(ob):
    for p in ob.data.polygons:
        p.use_smooth = False

def _sphere(name, r, x, y, z, mat=None, seg=16, ring=12, scale=None, rot=None):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x, y, z), segments=seg, ring_count=ring)
    ob = bpy.context.object
    ob.name = name
    if rot: _rot(ob, *rot)
    if scale: _scale(ob, *scale)
    _matassign(ob, mat)
    _flat(ob)
    return ob

def _cyl(name, r, depth, x, y, z, mat=None, verts=14, rot=None, scale=None):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=(x, y, z), vertices=verts)
    ob = bpy.context.object
    ob.name = name
    if rot: _rot(ob, *rot)
    if scale: _scale(ob, *scale)
    _matassign(ob, mat)
    _flat(ob)
    return ob

def _cone(name, r, depth, x, y, z, mat=None, verts=12, rot=None, scale=None):
    bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=0, depth=depth, location=(x, y, z), vertices=verts)
    ob = bpy.context.object
    ob.name = name
    if rot: _rot(ob, *rot)
    if scale: _scale(ob, *scale)
    _matassign(ob, mat)
    _flat(ob)
    return ob

def _cube(name, dx, dy, dz, x, y, z, mat=None, bevel=0.0, rot=None):
    bpy.ops.mesh.primitive_cube_add(location=(x, y, z))
    ob = bpy.context.object
    ob.name = name
    _dim(ob, dx, dy, dz)
    if bevel > 0:
        bpy.ops.object.modifier_add(type='BEVEL')
        ob.modifiers['Bevel'].width = bevel
        ob.modifiers['Bevel'].segments = 2
    if rot: _rot(ob, *rot)
    _matassign(ob, mat)
    _flat(ob)
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

def _join(objs, name):
    if len(objs) == 1:
        objs[0].name = name
        return objs[0]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    j = bpy.context.view_layer.objects.active
    j.name = name
    return j

def _parent_all(root, objs):
    for o in objs:
        o.parent = root
        o.matrix_parent_inverse = root.matrix_world.inverted()

def _export(root, glb):
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


def _snap_view(root, yaw=0, dist_factor=2.1):
    """Frame root's bounding box in the 3D viewport (front view + optional yaw)."""
    import mathutils
    minv = [1e9, 1e9, 1e9]; maxv = [-1e9, -1e9, -1e9]
    for o in root.children_recursive:
        if o.type == 'MESH':
            for c in o.bound_box:
                w = o.matrix_world @ mathutils.Vector(c)
                for i in range(3):
                    minv[i] = min(minv[i], w[i]); maxv[i] = max(maxv[i], w[i])
    ctr = [(minv[i] + maxv[i]) / 2 for i in range(3)]
    dist = max(maxv[0] - minv[0], maxv[1] - minv[1], maxv[2] - minv[2])
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            sp = area.spaces[0]
            for region in area.regions:
                if region.type == 'WINDOW':
                    with bpy.context.temp_override(area=area, region=region):
                        bpy.ops.view3d.view_axis(type='FRONT')
            r3d = sp.region_3d
            r3d.view_location = ctr
            r3d.view_distance = dist * dist_factor + 0.4
            if yaw:
                r3d.view_rotation = mathutils.Quaternion((0, 0, 1), math.radians(yaw)) @ r3d.view_rotation
            sp.shading.type = 'MATERIAL'

def render_viewport(png):
    sc = bpy.context.scene
    sc.render.image_settings.file_format = 'PNG'
    sc.render.filepath = png
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            for region in area.regions:
                if region.type == 'WINDOW':
                    with bpy.context.temp_override(area=area, region=region):
                        bpy.ops.render.opengl(write_still=True)

def _frame(root):
    try:
        bpy.ops.object.select_all(action='DESELECT')
        root.select_set(True)
        bpy.context.view_layer.objects.active = root
        for area in bpy.context.screen.areas:
            if area.type == 'VIEW_3D':
                for region in area.regions:
                    if region.type == 'WINDOW':
                        with bpy.context.temp_override(area=area, region=region):
                            bpy.ops.view3d.view_selected()
                            area.spaces[0].shading.type = 'MATERIAL'
    except Exception as e:
        print('frame skipped:', e)

def _by_mat(parts, mat):
    return [o for o in parts if o.data.materials and o.data.materials[0] == mat]

def _join_by_mat(parts, names):
    """Group parts by first material (before any join deletes objects), then
    join each group once. names maps material datablock -> output mesh name."""
    groups = {}
    for o in parts:
        m = o.data.materials[0] if o.data.materials else None
        groups.setdefault(m, []).append(o)
    out = []
    for m, lst in groups.items():
        nm = names.get(m, m.name if m else "Joined")
        out.append(_join(lst, nm))
    return out


# ================================================================ COW
def build_cow():
    root = _root("Cow")
    white = _mat("CowWhite", "#f5f1e8", 0.9)
    spot  = _mat("CowSpot",  "#3a3a40", 0.9)
    pink  = _mat("CowPink",  "#f2a0b4", 0.85)
    cream = _mat("CowCream", "#f0dcb4", 0.85)
    ew    = _mat("EyeWhite", "#ffffff", 0.5)
    blk   = _mat("Pupil",    "#202028", 0.5)
    parts = []
    parts.append(_sphere("CwBody", 0.5, 0, 0, 0.85, mat=white, scale=(1.0, 1.25, 0.95)))
    parts.append(_sphere("CwHead", 0.34, 0, -0.62, 1.15, mat=white))
    parts.append(_sphere("CwMuzzle", 0.17, 0, -0.88, 1.02, mat=pink, scale=(1.1, 0.8, 0.9)))
    for sx in (-1, 1):
        s = "L" if sx < 0 else "R"
        parts.append(_sphere("CwEye" + s, 0.07, sx*0.17, -0.85, 1.28, mat=ew))
        parts.append(_sphere("CwPupil" + s, 0.035, sx*0.17, -0.905, 1.28, mat=blk))
        parts.append(_sphere("CwCheek" + s, 0.05, sx*0.24, -0.82, 1.10, mat=pink))
        parts.append(_cone("CwHorn" + s, 0.05, 0.14, sx*0.16, -0.55, 1.5, mat=cream, rot=(math.radians(-20), 0, 0)))
        parts.append(_sphere("CwEar" + s, 0.09, sx*0.36, -0.62, 1.32, mat=white, scale=(0.6, 1, 1)))
    for i, (lx, lz) in enumerate([(-0.28, 0.35), (0.28, 0.35), (-0.28, -0.35), (0.28, -0.35)]):
        parts.append(_cyl("CwLeg%d" % i, 0.085, 0.5, lx, lz, 0.25, mat=white))
        parts.append(_cyl("CwHoof%d" % i, 0.09, 0.14, lx, lz, 0.07, mat=spot))
    parts.append(_sphere("CwSpot1", 0.16, 0.3, -0.2, 1.05, mat=spot, scale=(1, 1, 0.7)))
    parts.append(_sphere("CwSpot2", 0.13, -0.35, 0.25, 0.95, mat=spot, scale=(1, 1, 0.7)))
    parts.append(_cyl("CwTail", 0.04, 0.4, 0, 0.5, 0.95, mat=white, rot=(math.radians(140), 0, 0)))
    parts.append(_sphere("CwTailTuft", 0.07, 0, 0.62, 0.78, mat=spot))
    parts.append(_sphere("CwUdder", 0.12, 0, 0.3, 0.62, mat=pink, scale=(1.2, 0.8, 0.8)))
    joined = _join_by_mat(parts, {white: "CowWhite", spot: "CowSpot", pink: "CowPink", cream: "CowCream", ew: "CowEyeWhite", blk: "CowPupil"})
    _parent_all(root, joined)
    _export(root, BASE + "/cow.glb")
    _frame(root)

# ================================================================ SHEEP
def build_sheep():
    root = _root("Sheep")
    wool  = _mat("SheepWool", "#fbf7ee", 0.95)
    face  = _mat("SheepFace", "#5a4a42", 0.9)
    ew    = _mat("EyeWhite", "#ffffff", 0.5)
    blk   = _mat("Pupil", "#202028", 0.5)
    parts = []
    parts.append(_sphere("SpWool", 0.42, 0, 0, 0.8, mat=wool, scale=(1.1, 1.3, 0.95)))
    parts.append(_sphere("SpWool2", 0.3, -0.28, -0.1, 1.0, mat=wool))
    parts.append(_sphere("SpWool3", 0.3, 0.3, -0.05, 0.95, mat=wool))
    parts.append(_sphere("SpHead", 0.2, 0, -0.55, 1.05, mat=face))
    for sx in (-1, 1):
        s = "L" if sx < 0 else "R"
        parts.append(_sphere("SpEye" + s, 0.055, sx*0.1, -0.68, 1.12, mat=ew))
        parts.append(_sphere("SpPupil" + s, 0.028, sx*0.1, -0.72, 1.12, mat=blk))
        parts.append(_sphere("SpEar" + s, 0.07, sx*0.22, -0.5, 1.15, mat=face, scale=(0.6, 1, 1)))
    for i, (lx, lz) in enumerate([(-0.2, 0.25), (0.2, 0.25), (-0.2, -0.25), (0.2, -0.25)]):
        parts.append(_cyl("SpLeg%d" % i, 0.07, 0.5, lx, lz, 0.25, mat=face))
    parts.append(_sphere("SpTail", 0.1, 0, 0.45, 1.0, mat=wool))
    joined = _join_by_mat(parts, {wool: "SheepWool", face: "SheepFace", ew: "SheepEyeWhite", blk: "SheepPupil"})
    _parent_all(root, joined)
    _export(root, BASE + "/sheep.glb")
    _frame(root)

# ================================================================ CHICKEN
def build_chicken():
    root = _root("Chicken")
    cream  = _mat("ChkCream", "#f7f3ea", 0.9)
    orange = _mat("ChkOrange", "#ff9e3d", 0.85)
    red    = _mat("ChkRed", "#e84545", 0.85)
    blk    = _mat("Pupil", "#202028", 0.5)
    parts = []
    parts.append(_sphere("CkBody", 0.24, 0, 0, 0.28, mat=cream, scale=(1, 1.15, 1)))
    parts.append(_sphere("CkHead", 0.14, 0, -0.18, 0.52, mat=cream))
    for i, dx in enumerate((-0.07, 0, 0.07)):
        parts.append(_sphere("CkComb%d" % i, 0.045, dx, -0.2, 0.66, mat=red))
    parts.append(_cone("CkBeak", 0.05, 0.12, 0, -0.32, 0.5, mat=orange, rot=(math.radians(-90), 0, 0)))
    parts.append(_sphere("CkWattle", 0.04, 0, -0.26, 0.42, mat=red))
    for sx in (-1, 1):
        s = "L" if sx < 0 else "R"
        parts.append(_sphere("CkEye" + s, 0.03, sx*0.08, -0.27, 0.55, mat=blk))
        parts.append(_sphere("CkWing" + s, 0.1, sx*0.2, 0, 0.32, mat=cream, scale=(0.5, 1.2, 0.8)))
    for i, dx in enumerate((-0.06, 0, 0.06)):
        parts.append(_sphere("CkTail%d" % i, 0.05, dx, 0.24, 0.42, mat=cream, scale=(0.5, 1, 1.4)))
    for sx in (-1, 1):
        i = 0 if sx < 0 else 1
        parts.append(_cyl("CkLeg%d" % i, 0.025, 0.18, sx*0.08, 0, 0.1, mat=orange))
        parts.append(_cyl("CkFoot%d" % i, 0.05, 0.03, sx*0.08, -0.04, 0.02, mat=orange, rot=(math.radians(90), 0, 0)))
    joined = _join_by_mat(parts, {cream: "ChkCream", orange: "ChkOrange", red: "ChkRed", blk: "ChkPupil"})
    _parent_all(root, joined)
    _export(root, BASE + "/chicken.glb")
    _frame(root)

# ================================================================ DUCK
def build_duck():
    root = _root("Duck")
    yellow = _mat("DkYellow", "#ffd23f", 0.85)
    orange = _mat("DkOrange", "#ff8c42", 0.85)
    white  = _mat("DkWhite", "#fdfaf2", 0.85)
    blk    = _mat("Pupil", "#202028", 0.5)
    parts = []
    parts.append(_sphere("DkBody", 0.22, 0, 0, 0.2, mat=yellow, scale=(1.1, 1.25, 0.9)))
    parts.append(_sphere("DkHead", 0.13, 0, -0.2, 0.4, mat=yellow))
    parts.append(_cone("DkBeak", 0.06, 0.14, 0, -0.32, 0.38, mat=orange, rot=(math.radians(-90), 0, 0), scale=(1.3, 0.6, 1)))
    for sx in (-1, 1):
        s = "L" if sx < 0 else "R"
        parts.append(_sphere("DkEye" + s, 0.035, sx*0.09, -0.29, 0.45, mat=blk))
        parts.append(_sphere("DkWing" + s, 0.11, sx*0.19, 0.02, 0.22, mat=white, scale=(0.5, 1.2, 0.85)))
    parts.append(_cone("DkTail", 0.07, 0.14, 0, 0.24, 0.3, mat=yellow, rot=(math.radians(60), 0, 0)))
    for sx in (-1, 1):
        s = "L" if sx < 0 else "R"
        parts.append(_cyl("DkFoot" + s, 0.05, 0.03, sx*0.08, -0.04, 0.02, mat=orange, rot=(math.radians(90), 0, 0)))
    joined = _join_by_mat(parts, {yellow: "DkYellow", orange: "DkOrange", white: "DkWhite", blk: "DkPupil"})
    _parent_all(root, joined)
    _export(root, BASE + "/duck.glb")
    _frame(root)

# ================================================================ DOG
def build_dog():
    root = _root("Dog")
    tan   = _mat("DgTan", "#d8a35f", 0.9)
    white = _mat("DgWhite", "#f5efe2", 0.9)
    dark  = _mat("DgDark", "#8a6a48", 0.9)
    blk   = _mat("Pupil", "#202028", 0.5)
    pink  = _mat("DgPink", "#f2a0b4", 0.85)
    parts = []
    parts.append(_sphere("DgBody", 0.3, 0, 0, 0.45, mat=tan, scale=(1, 1.3, 0.95)))
    parts.append(_sphere("DgChest", 0.2, 0, -0.2, 0.35, mat=white, scale=(1, 1, 0.9)))
    parts.append(_sphere("DgHead", 0.22, 0, -0.42, 0.75, mat=tan))
    parts.append(_sphere("DgSnout", 0.11, 0, -0.56, 0.68, mat=white, scale=(1, 0.9, 0.85)))
    parts.append(_sphere("DgNose", 0.05, 0, -0.64, 0.7, mat=blk))
    for sx in (-1, 1):
        s = "L" if sx < 0 else "R"
        parts.append(_sphere("DgEye" + s, 0.045, sx*0.12, -0.56, 0.85, mat=blk))
        parts.append(_sphere("DgEar" + s, 0.09, sx*0.2, -0.42, 0.88, mat=dark, scale=(0.5, 1.2, 1)))
    for i, (lx, lz) in enumerate([(-0.16, 0.22), (0.16, 0.22), (-0.16, -0.22), (0.16, -0.22)]):
        parts.append(_cyl("DgLeg%d" % i, 0.06, 0.4, lx, lz, 0.2, mat=tan))
        parts.append(_sphere("DgPaw%d" % i, 0.06, lx, lz, 0, mat=dark, scale=(1, 1, 0.6)))
    parts.append(_cyl("DgTail", 0.05, 0.3, 0, 0.4, 0.6, mat=tan, rot=(math.radians(120), 0, 0)))
    parts.append(_sphere("DgTongue", 0.04, 0, -0.62, 0.6, mat=pink, scale=(0.7, 0.7, 1.2)))
    joined = _join_by_mat(parts, {tan: "DgTan", white: "DgWhite", dark: "DgDark", blk: "DgPupil", pink: "DgPink"})
    _parent_all(root, joined)
    _export(root, BASE + "/dog.glb")
    _frame(root)

# ================================================================ CAT
def build_cat():
    root = _root("Cat")
    orange = _mat("CtOrange", "#f5994b", 0.9)
    white  = _mat("CtWhite", "#f7f3ea", 0.9)
    blk    = _mat("Pupil", "#202028", 0.5)
    pink   = _mat("CtPink", "#f2a0b4", 0.85)
    parts = []
    parts.append(_sphere("CtBody", 0.26, 0, 0, 0.35, mat=orange, scale=(1, 1.2, 0.95)))
    parts.append(_sphere("CtBelly", 0.18, 0, -0.14, 0.3, mat=white, scale=(0.9, 1, 0.9)))
    parts.append(_sphere("CtHead", 0.2, 0, -0.34, 0.62, mat=orange))
    for sx in (-1, 1):
        s = "L" if sx < 0 else "R"
        parts.append(_cone("CtEar" + s, 0.08, 0.14, sx*0.14, -0.3, 0.78, mat=orange, rot=(0, 0, math.radians(20 if sx > 0 else -20))))
        parts.append(_sphere("CtEarIn" + s, 0.04, sx*0.13, -0.33, 0.76, mat=pink))
        parts.append(_sphere("CtEye" + s, 0.05, sx*0.1, -0.48, 0.66, mat=blk))
    parts.append(_sphere("CtMuzzle", 0.09, 0, -0.48, 0.56, mat=white, scale=(1, 0.8, 0.8)))
    parts.append(_sphere("CtNose", 0.03, 0, -0.54, 0.58, mat=pink))
    for i, (lx, lz) in enumerate([(-0.13, 0.18), (0.13, 0.18), (-0.13, -0.18), (0.13, -0.18)]):
        parts.append(_cyl("CtLeg%d" % i, 0.05, 0.3, lx, lz, 0.15, mat=orange))
    parts.append(_cyl("CtTail", 0.04, 0.3, 0, 0.3, 0.4, mat=orange, rot=(math.radians(110), 0, 0)))
    parts.append(_sphere("CtTailTip", 0.05, 0, 0.4, 0.5, mat=blk))
    joined = _join_by_mat(parts, {orange: "CtOrange", white: "CtWhite", blk: "CtPupil", pink: "CtPink"})
    _parent_all(root, joined)
    _export(root, BASE + "/cat.glb")
    _frame(root)
# ================================================================ CAR
# Contract: meshes named Wheel* (FL/FR/RL/RR) must stay separate nodes so the
# game can spin them; front faces -Y in Blender (+Z in the game, like the old car).
def build_car():
    root = _root("Car")
    red    = _mat("CarRed", "#ef5350", 0.7)
    glass  = _mat("CarGlass", "#9fd0f0", 0.35)
    dark   = _mat("CarTire", "#2a2a2e", 0.6)
    cream  = _mat("CarLight", "#fff3c4", 0.6)
    # body + cabin + bumpers (red)
    body    = _cube("CarBody", 1.6, 2.4, 0.62, 0, 0, 0.55, mat=red, bevel=0.12)
    cabin   = _cube("CarCabin", 1.3, 1.35, 0.55, 0, -0.1, 1.05, mat=red, bevel=0.12)
    bump_f  = _cube("CarBumperF", 1.5, 0.25, 0.3, 0, -1.25, 0.45, mat=red, bevel=0.08)
    bump_r  = _cube("CarBumperR", 1.5, 0.25, 0.3, 0, 1.25, 0.45, mat=red, bevel=0.08)
    hood    = _cube("CarHood", 1.45, 0.5, 0.2, 0, -1.05, 0.72, mat=red, bevel=0.08)
    trunk   = _cube("CarTrunk", 1.45, 0.5, 0.2, 0, 1.05, 0.72, mat=red, bevel=0.08)
    red_j = _join([body, cabin, bump_f, bump_r, hood, trunk], "CarBody")
    # glass: windshield, rear, sides
    wsh = _cube("CarWind", 1.15, 0.06, 0.5, 0, -0.72, 1.02, mat=glass, rot=(math.radians(-18), 0, 0))
    rw  = _cube("CarRearWin", 1.15, 0.06, 0.45, 0, 0.62, 1.0, mat=glass, rot=(math.radians(15), 0, 0))
    swl = _cube("CarWinL", 0.06, 0.95, 0.38, -0.62, -0.1, 1.05, mat=glass)
    swr = _cube("CarWinR", 0.06, 0.95, 0.38, 0.62, -0.1, 1.05, mat=glass)
    glass_j = _join([wsh, rw, swl, swr], "CarGlass")
    # lights + hubcaps (cream, static)
    hl = _sphere("CarHeadL", 0.11, -0.45, -1.32, 0.62, mat=cream)
    hr = _sphere("CarHeadR", 0.11, 0.45, -1.32, 0.62, mat=cream)
    tl = _sphere("CarTailL", 0.07, -0.55, 1.3, 0.6, mat=cream)
    tr = _sphere("CarTailR", 0.07, 0.55, 1.3, 0.6, mat=cream)
    hubs = []
    for i, (wx, wy) in enumerate([(-0.78, -0.82), (0.78, -0.82), (-0.78, 0.82), (0.78, 0.82)]):
        hubs.append(_cyl("CarHub%d" % i, 0.15, 0.25, wx, wy, 0.36, mat=cream, rot=(0, math.radians(90), 0)))
    cream_j = _join([hl, hr, tl, tr] + hubs, "CarLight")
    # wheels: separate named nodes, cylinder axis Z rotated +90deg about Y
    # (same convention as the previous working car.glb).
    wheel_names = ["WheelFL", "WheelFR", "WheelRL", "WheelRR"]
    wheels = []
    for i, (wx, wy) in enumerate([(-0.78, -0.82), (0.78, -0.82), (-0.78, 0.82), (0.78, 0.82)]):
        w = _cyl(wheel_names[i], 0.36, 0.24, wx, wy, 0.36, mat=dark)
        # BAKE the +90deg Y-rotation into the MESH data (cylinder axis -> local X) so the
        # glTF node keeps identity rotation. Car.ts spins wheels about local X:
        # axis = (1,0,0).applyQuaternion(o.quaternion.invert()).
        w.data.transform(mathutils.Matrix.Rotation(math.radians(90), 4, 'Y'))
        wheels.append(w)
    _parent_all(root, [red_j, glass_j, cream_j] + wheels)
    _export(root, BASE + "/car.glb")
    _frame(root)

# ================================================================ BARN
def build_barn():
    root = _root("Barn")
    red    = _mat("BarnRed", "#d64545", 0.9)
    tan    = _mat("BarnRoof", "#b58a63", 0.95)
    door   = _mat("BarnDoor", "#8a5a3a", 0.9)
    cream  = _mat("BarnTrim", "#f5f1e8", 0.9)
    hay    = _mat("BarnHay", "#d8c088", 0.95)
    dark   = _mat("BarnDark", "#3a3a40", 0.8)
    body   = _cube("BnBody", 4.2, 3.4, 2.6, 0, 0, 1.7, mat=red, bevel=0.12)
    roof   = _cone("BnRoof", 3.1, 2.2, 0, 0, 3.9, mat=tan, verts=4, rot=(0, 0, math.radians(45)), scale=(1.35, 1.1, 1))
    dr     = _cube("BnDoor", 1.3, 0.15, 2.0, 0.9, -1.72, 1.05, mat=door, bevel=0.04)
    hayb   = _cyl("BnHay", 0.5, 0.95, -1.6, -1.55, 0.48, mat=hay, rot=(math.radians(90), 0, 0), verts=12)
    # round loft window facing front (-Y)
    win    = _cyl("BnLoftWin", 0.38, 0.12, 0, -1.7, 2.95, mat=cream, rot=(math.radians(90), 0, 0), verts=12)
    wcx    = _cube("BnWinX1", 0.75, 0.05, 0.07, 0, -1.72, 2.95, mat=cream)
    wcy    = _cube("BnWinX2", 0.07, 0.05, 0.75, 0, -1.72, 2.95, mat=cream)
    # white corner trims
    trims = []
    for tx, tz in [(-2.0, -1.62), (2.0, -1.62), (-2.0, 1.62), (2.0, 1.62)]:
        trims.append(_cube("BnTrim", 0.22, 0.22, 2.7, tx, tz, 1.55, mat=cream))
    trim_j = _join([win, wcx, wcy] + trims, "BarnTrim")
    # weathervane on roof peak
    pole   = _cyl("BnVanePole", 0.035, 0.55, 0, 0, 5.05, mat=dark, verts=8)
    arrow  = _cube("BnVaneArrow", 0.55, 0.06, 0.08, 0, 0, 5.35, mat=dark)
    fin    = _cube("BnVaneFin", 0.12, 0.06, 0.2, 0.3, 0, 5.35, mat=dark)
    vane_j = _join([pole, arrow, fin], "BarnVane")
    _parent_all(root, [body, roof, dr, hayb, trim_j, vane_j])
    _export(root, BASE + "/barn.glb")
    _frame(root)

# ================================================================ FENCE
# One 3.0 m section along X (the level tiles sections at 3 m spacing).
def build_fence():
    root = _root("Fence")
    wood  = _mat("FenceWood", "#c09060", 0.95)
    post  = _mat("FencePost", "#9a6f4a", 0.95)
    p1 = _cube("FcPost1", 0.15, 0.15, 1.0, -1.45, 0, 0.5, mat=post, bevel=0.03)
    p2 = _cube("FcPost2", 0.15, 0.15, 1.0, 1.45, 0, 0.5, mat=post, bevel=0.03)
    posts_j = _join([p1, p2], "FencePost")
    pickets = []
    for px in (-0.75, 0, 0.75):
        pickets.append(_cube("FcPicket", 0.28, 0.08, 0.85, px, 0, 0.425, mat=wood, bevel=0.02))
    r1 = _cube("FcRail1", 2.9, 0.08, 0.1, 0, 0, 0.42, mat=wood)
    r2 = _cube("FcRail2", 2.9, 0.08, 0.1, 0, 0, 0.8, mat=wood)
    wood_j = _join(pickets + [r1, r2], "FenceWood")
    _parent_all(root, [posts_j, wood_j])
    _export(root, BASE + "/fence.glb")
    _frame(root)

# ================================================================ LAMP
# Contract: the glowing globe must be a single mesh named "LampHead".
def build_lamp():
    root = _root("Lamp")
    metal = _mat("LampMetal", "#4a5568", 0.7)
    glow  = _mat("LampLight", "#fff2cc", 0.6, emissive="#ffd97a", estr=0.5)
    base = _cyl("LpBase", 0.22, 0.16, 0, 0, 0.08, mat=metal, verts=12)
    pole = _cyl("LpPole", 0.055, 2.3, 0, 0, 1.3, mat=metal, verts=10)
    mid  = _cyl("LpMid", 0.09, 0.18, 0, 0, 2.42, mat=metal, verts=10)
    fin  = _sphere("LpFin", 0.06, 0, 0, 2.58, mat=metal)
    pole_j = _join([base, pole, mid, fin], "LampPole")
    head = _sphere("LampHead", 0.27, 0, 0, 2.42, mat=glow, seg=14, ring=10)
    _parent_all(root, [pole_j, head])
    _export(root, BASE + "/lamp.glb")
    _frame(root)

# ================================================================ BENCH
def build_bench():
    root = _root("Bench")
    wood  = _mat("BenchWood", "#b5824f", 0.95)
    dark  = _mat("BenchDark", "#8a5f3f", 0.95)
    s1 = _cube("BnSupL", 0.12, 0.55, 0.62, -0.6, 0, 0.33, mat=dark, bevel=0.04)
    s2 = _cube("BnSupR", 0.12, 0.55, 0.62, 0.6, 0, 0.33, mat=dark, bevel=0.04)
    supports_j = _join([s1, s2], "BenchSupport")
    seat = []
    for sy in (-0.13, 0, 0.13):
        seat.append(_cube("BnSeat", 1.45, 0.42, 0.055, 0, sy, 0.66, mat=wood, bevel=0.02))
    back = []
    back.append(_cube("BnBack1", 1.45, 0.06, 0.3, 0, 0.24, 0.95, mat=wood, bevel=0.02))
    back.append(_cube("BnBack2", 1.45, 0.06, 0.22, 0, 0.24, 0.7, mat=wood, bevel=0.02))
    slats_j = _join(seat + back, "BenchSlats")
    _parent_all(root, [supports_j, slats_j])
    _export(root, BASE + "/bench.glb")
    _frame(root)

# ================================================================ BUSH
def build_bush():
    root = _root("Bush")
    g1   = _mat("BushGreen", "#58c15c", 0.95)
    g2   = _mat("BushGreen2", "#3f9e4f", 0.95)
    berry = _mat("BushBerry", "#e84545", 0.85)
    b1 = _sphere("Bs1", 0.45, 0, 0, 0.42, mat=g1, seg=14, ring=10)
    b2 = _sphere("Bs2", 0.34, 0.34, -0.12, 0.3, mat=g1, seg=14, ring=10)
    b3 = _sphere("Bs3", 0.3, -0.3, 0.16, 0.28, mat=g2, seg=14, ring=10)
    b4 = _sphere("Bs4", 0.24, 0.05, 0.3, 0.26, mat=g2, seg=12, ring=9)
    greens1_j = _join([b1, b2], "BushGreen")
    greens2_j = _join([b3, b4], "BushGreen2")
    # Berries must sit ON the green spheres' surface (inset 3 cm so they read as plucked fruit).
    berry_spots = [
        ((0, 0, 0.42), 0.45, (0.5, -0.75, 0.4)),
        ((0, 0, 0.42), 0.45, (-0.8, -0.25, 0.5)),
        ((0, 0, 0.42), 0.45, (-0.4, 0.75, 0.3)),
        ((0.34, -0.12, 0.3), 0.34, (0.3, -0.9, 0.2)),
        ((-0.3, 0.16, 0.28), 0.3, (0.5, -0.6, 0.4)),
    ]
    berries = []
    for i, (ctr, rad, dr) in enumerate(berry_spots):
        d = mathutils.Vector(dr).normalized()
        pos = mathutils.Vector(ctr) + d * (rad - 0.03)
        berries.append(_sphere("BsBerry%d" % i, 0.055, pos.x, pos.y, pos.z, mat=berry, seg=8, ring=6))
    berry_j = _join(berries, "BushBerry")
    _parent_all(root, [greens1_j, greens2_j, berry_j])
    _export(root, BASE + "/bush.glb")
    _frame(root)

# ================================================================ FLOWER
def build_flower():
    root = _root("Flower")
    green = _mat("FlowerGreen", "#3f9e4f", 0.9)
    pink  = _mat("FlowerPink", "#ff7bac", 0.85)
    yellow = _mat("FlowerYellow", "#ffd54f", 0.85)
    stem = _cyl("FlStem", 0.035, 0.62, 0, 0, 0.31, mat=green, verts=8)
    leaf_l = _sphere("FlLeafL", 0.11, -0.1, 0, 0.26, mat=green, scale=(1, 0.35, 0.55), rot=(0, 0, math.radians(-35)))
    leaf_r = _sphere("FlLeafR", 0.11, 0.1, 0, 0.34, mat=green, scale=(1, 0.35, 0.55), rot=(0, 0, math.radians(35)))
    green_j = _join([stem, leaf_l, leaf_r], "FlowerGreen")
    petals = []
    for i in range(6):
        a = math.radians(i * 60)
        petals.append(_sphere("FlPetal%d" % i, 0.1, 0.12 * math.cos(a), 0.12 * math.sin(a), 0.7, mat=pink, seg=10, ring=8, scale=(1, 1, 0.6)))
    petal_j = _join(petals, "FlowerPink")
    center = _sphere("FlCenter", 0.085, 0, 0, 0.71, mat=yellow, seg=10, ring=8)
    _parent_all(root, [green_j, petal_j, center])
    _export(root, BASE + "/flower.glb")
    _frame(root)

