# Makes the goldfish bowl's fish textures (public/goldfish/) in Blender, for the shapes the page builds
# (src/tools/goldfish/fish-model.client.ts; scripts/goldfish/make-textures.mjs exports them and runs this). The page keeps building
# each fish and painting its colours (so that every red-and-white fish is patched its own way); these are the details it
# cannot draw well live, at a finer grain:
#   <kind>-body.webp     the body's shading, laid over its colours: overlapping scales, each a little different, with a
#                        bright rim, the lateral line's pores, and the shade the fins and eyes cast (ambient occlusion,
#                        baked with Cycles from the fish's shape)
#   <kind>-normal.webp   the scales' bumps, as a normal map (baked with Cycles)
#   <kind>-iris.webp     the iris: golden (dark for a demekin), with fine radial fibres and a dark edge
#   fin.webp             the fins: rays that fork towards the edge and are jointed, darker than the clear skin between
# Texture coordinates are the page's: the body's u along it (0 tail .. 1 nose) and around it (0 .. 1 from the back);
# a fin's w across it and s from root to edge; the eye sphere's own.
#
#   blender -b --factory-startup --python scripts/goldfish/bake-textures.py -- <kind> <raw.glb> <out dir> [--preview]
#
# --preview also renders the fish with Cycles (<out dir>/<kind>-preview-*.png) to look at.
import math
import os
import sys

import bpy
import numpy as np

args = sys.argv[sys.argv.index("--") + 1:]
KIND, SOURCE, OUT = args[0], args[1], args[2]
PREVIEW = "--preview" in args

# Along the body (the page's units, nose towards +z there; -y here, as glTF is brought in z-up), and where the gill cover
# begins (no scales in front of it).
SHAPES = {
    "wakin": {"z_tail": -0.5, "z_nose": 0.5, "gill": 0.74},
    "ryukin": {"z_tail": -0.4, "z_nose": 0.42, "gill": 0.7},
    "demekin": {"z_tail": -0.42, "z_nose": 0.44, "gill": 0.72},
}
SHAPE = SHAPES[KIND]
BODY_W, BODY_H = 1024, 512
FIN_SIZE, IRIS_W, IRIS_H = 512, 512, 256

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SOURCE)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
objects = {o.name: o for o in scene.objects if o.type == "MESH"}
body = objects["body"]


def new_image(name, width, height, alpha=False, colour=True):
    image = bpy.data.images.new(name, width, height, alpha=alpha, float_buffer=False)
    image.colorspace_settings.name = "sRGB" if colour else "Non-Color"
    return image


def set_pixels(image, rgba):
    image.pixels.foreach_set(np.ascontiguousarray(rgba, dtype=np.float32).ravel())
    image.update()


def get_pixels(image):
    array = np.empty(image.size[0] * image.size[1] * 4, dtype=np.float32)
    image.pixels.foreach_get(array)
    return array.reshape(image.size[1], image.size[0], 4)


def smoothstep(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


# ---- The body's UVs: along it (0 tail .. 1 nose) and around it (0 .. 1 from the back), one texture over the whole ----

# The page's own (u, around), which glTF brings in with v flipped; the pictures are drawn with "around" from the bottom,
# as the page reads them.
mesh = body.data
old_uv = mesh.uv_layers[0]
bake_uv = mesh.uv_layers.new(name="bake")
for poly in mesh.polygons:
    for index in poly.loop_indices:
        uv = old_uv.data[index].uv
        bake_uv.data[index].uv = (uv.x, 1.0 - uv.y)
# The cap over the end of the tail stalk shares one centre point: keep its corners off the edge of the texture.
for poly in mesh.polygons:
    us = [bake_uv.data[i].uv.x for i in poly.loop_indices]
    if max(us) < 0.002:
        for i in poly.loop_indices:
            bake_uv.data[i].uv = (0.002, bake_uv.data[i].uv.y)
mesh.uv_layers.active = bake_uv
mesh.uv_layers.remove(old_uv)

# ---- Scales: height and tint, drawn straight into the body's texture ----

U, V = np.meshgrid((np.arange(BODY_W) + 0.5) / BODY_W, (np.arange(BODY_H) + 0.5) / BODY_H)
gill = SHAPE["gill"]
cols, rows = 26, 22
cell_u, cell_v = gill / cols, 1.0 / rows
height = np.full(U.shape, 0.5, dtype=np.float32)
tint = np.ones(U.shape, dtype=np.float32)
rim = np.zeros(U.shape, dtype=np.float32)
top = np.full(U.shape, -1, dtype=np.int32)
rng = np.random.default_rng(7)
shade = rng.uniform(0.86, 1.0, size=(cols + 3, rows + 3))
base_col = np.floor(U / cell_u).astype(np.int32)
# Each texel is covered by the scale nearest the head among those that reach it (each scale's free edge lies over the next
# towards the tail).
for dc in (-1, 0, 1):
    col = base_col + dc
    stagger = np.where(col % 2 == 1, 0.5, 0.0)
    row = np.floor(V / cell_v - stagger).astype(np.int32)
    for dr in (-1, 0, 1):
        r = row + dr
        cu = (col + 0.55) * cell_u
        cv = (r + 0.5 + stagger) * cell_v
        du = (U - cu) / (cell_u * 0.95)
        dv = ((V - cv + 0.5) % 1.0 - 0.5) / (cell_v * 0.78)
        dist = np.sqrt(du * du + dv * dv)
        covers = (dist < 1.0) & (col >= 0) & (col < cols) & (col >= top)
        # Raised towards the free edge (towards the tail, du < 0), a groove at the very edge.
        h = 0.55 + 0.25 * (1 - dist ** 2) + 0.12 * np.clip(-du, 0, 1) - 0.35 * smoothstep(dist, 0.86, 1.0)
        height = np.where(covers, h, height)
        s = shade[np.clip(col, 0, cols + 2), np.clip(r % rows, 0, rows + 2)]
        tint = np.where(covers, s, tint)
        rim = np.where(covers, smoothstep(dist, 0.7, 0.9) * (1 - smoothstep(dist, 0.92, 1.0)), rim)
        top = np.where(covers, col, top)
# In front of the gill cover there are no scales: the head is smooth, with a fine texture.
head = smoothstep(U, gill - 0.01, gill + 0.01)
fine = 0.5 + 0.02 * np.sin(U * 900) * np.sin(V * 700)
height = height * (1 - head) + fine * head
tint = tint * (1 - head) + 0.97 * head
rim = rim * (1 - head)
# The lateral line: a row of pores along the middle of each flank.
for side in (0.25, 0.75):
    on_line = np.exp(-(((V - side) / 0.006) ** 2)) * (U > 0.08) * (U < gill)
    pore = np.exp(-((((U / cell_u) % 1.0) - 0.45) / 0.12) ** 2)
    tint = tint * (1 - 0.22 * on_line * pore)

height_image = new_image("body_height", BODY_W, BODY_H, colour=False)
h = np.clip(height, 0, 1)
set_pixels(height_image, np.dstack([h, h, h, np.ones_like(h)]))


def bake(obj, image, kind, setup):
    """Bakes `kind` for `obj` into `image`, with a material set up by `setup(nodes, links)` for the bake."""
    material = bpy.data.materials.new(f"bake_{image.name}")
    material.use_nodes = True
    nodes, links = material.node_tree.nodes, material.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    setup(nodes, links, output)
    target = nodes.new("ShaderNodeTexImage")
    target.image = image
    nodes.active = target
    saved = list(obj.data.materials)
    obj.data.materials.clear()
    obj.data.materials.append(material)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    scene.render.bake.margin = 8
    if kind == "NORMAL":
        scene.render.bake.normal_space = "TANGENT"
    bpy.ops.object.bake(type=kind, use_clear=True)
    obj.data.materials.clear()
    for m in saved:
        obj.data.materials.append(m)


def uv_node(nodes, name):
    node = nodes.new("ShaderNodeUVMap")
    node.uv_map = name
    return node


# The bumps, as a normal map.
normal_image = new_image("body_normal", BODY_W, BODY_H, colour=False)
def bumped(nodes, links, output):
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = height_image
    texture.interpolation = "Cubic"
    links.new(uv_node(nodes, "bake").outputs["UV"], texture.inputs["Vector"])
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.45
    bump.inputs["Distance"].default_value = 0.004
    links.new(texture.outputs["Color"], bump.inputs["Height"])
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    links.new(bump.outputs["Normal"], shader.inputs["Normal"])
    links.new(shader.outputs["BSDF"], output.inputs["Surface"])
bake(body, normal_image, "NORMAL", bumped)

# The shade the fins, eyes and the body itself cast on it.
ao_image = new_image("body_ao", BODY_W, BODY_H, colour=False)
def plain(nodes, links, output):
    shader = nodes.new("ShaderNodeBsdfDiffuse")
    links.new(shader.outputs["BSDF"], output.inputs["Surface"])
scene.cycles.samples = 64
scene.world = bpy.data.worlds.new("bake") if scene.world is None else scene.world
bake(body, ao_image, "AO", plain)

ao = get_pixels(ao_image)[..., 0]
# The shading the page multiplies its colours by: 0.85 is "as painted", so that a scale's rim can be brighter.
shading = np.clip(0.85 * tint * (0.62 + 0.38 * ao) + 0.15 * rim, 0, 1)
body_image = new_image("body_shading", BODY_W, BODY_H)
set_pixels(body_image, np.dstack([shading, shading, shading, np.ones(U.shape)]))

# ---- Fins: rays that fork towards the edge, darker than the clear skin between them ----

FU, FS = np.meshgrid((np.arange(FIN_SIZE) + 0.5) / FIN_SIZE, (np.arange(FIN_SIZE) + 0.5) / FIN_SIZE)
s = FS  # rows from the bottom: the page reads the picture with v = s
rays = np.zeros_like(FU)
for count, start in ((13, 0.0), (26, 0.45), (52, 0.78)):
    wobble = 0.004 * np.sin(s * 23 + count)
    phase = (FU + wobble) * count
    line = np.exp(-(((phase % 1.0) - 0.5) / 0.09) ** 2)
    rays = np.maximum(rays, line * smoothstep(s, start, start + 0.08) * (1 - 0.3 * s))
# The rays are jointed: faint bands across them.
rays = rays * (0.85 + 0.15 * np.sin(s * 140) ** 2)
fin_alpha = np.clip(0.5 - 0.3 * s + rays * (0.45 - 0.2 * s), 0.08, 1)
fin_shade = 1.0 - 0.28 * rays
fin_image = new_image("fin", FIN_SIZE, FIN_SIZE, alpha=True)
set_pixels(fin_image, np.dstack([fin_shade, fin_shade * 0.97, fin_shade * 0.95, fin_alpha]))

# ---- Eyes: a golden iris with fine radial fibres and a dark edge ----

IU, IV = np.meshgrid((np.arange(IRIS_W) + 0.5) / IRIS_W, (np.arange(IRIS_H) + 0.5) / IRIS_H)
phi, theta = IU * 2 * math.pi, (1 - IV) * math.pi
# The page's sphere: x = -cos(phi) sin(theta), y = cos(theta), z = sin(phi) sin(theta); the pupil looks along +z.
ex, ey, ez = -np.cos(phi) * np.sin(theta), np.cos(theta), np.sin(phi) * np.sin(theta)
angle = np.arccos(np.clip(ez, -1, 1))
around = np.arctan2(ey, ex)
fibres = 0.75 + 0.25 * np.sin(around * 60 + np.sin(around * 7) * 2) * np.sin(angle * 25)
edge = 1 - 0.6 * smoothstep(angle, 0.95, 1.35)
iris_colour = {"wakin": (0.73, 0.47, 0.12), "ryukin": (0.75, 0.5, 0.16), "demekin": (0.24, 0.2, 0.16)}[KIND]
iris = np.dstack([c * fibres * edge for c in iris_colour] + [np.ones_like(IU)])
iris_image = new_image("iris", IRIS_W, IRIS_H)
set_pixels(iris_image, iris)

# ---- The pictures, for the page ----

os.makedirs(OUT, exist_ok=True)


def save(image, name):
    image.filepath_raw = os.path.join(OUT, name)
    image.file_format = "WEBP"
    scene.render.image_settings.quality = 88
    image.save(filepath=image.filepath_raw, quality=88)
    print("SAVED", name, os.path.getsize(image.filepath_raw))


save(body_image, f"{KIND}-body.webp")
save(normal_image, f"{KIND}-normal.webp")
save(iris_image, f"{KIND}-iris.webp")
save(fin_image, "fin.webp")

# ---- A picture to look at (not used by the page) ----

def preview_material(name, colour=None, image=None, normal=None, vertex_colours=False, alpha=False, roughness=0.36, transmission=0.0):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    nodes, links = material.node_tree.nodes, material.node_tree.links
    shader = nodes["Principled BSDF"]
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Coat Weight"].default_value = 0.5
    shader.inputs["Transmission Weight"].default_value = transmission
    if colour is not None:
        shader.inputs["Base Color"].default_value = (*colour, 1)
    out = None
    if image is not None:
        texture = nodes.new("ShaderNodeTexImage")
        texture.image = image
        out = texture.outputs["Color"]
        if alpha:
            links.new(texture.outputs["Alpha"], shader.inputs["Alpha"])
    if vertex_colours:
        attribute = nodes.new("ShaderNodeVertexColor")
        if out is None:
            out = attribute.outputs["Color"]
        else:
            mix = nodes.new("ShaderNodeMix")
            mix.data_type, mix.blend_type = "RGBA", "MULTIPLY"
            mix.inputs["Factor"].default_value = 1
            links.new(attribute.outputs["Color"], mix.inputs[6])
            links.new(out, mix.inputs[7])
            out = mix.outputs[2]
    if out is not None:
        links.new(out, shader.inputs["Base Color"])
    if normal is not None:
        texture = nodes.new("ShaderNodeTexImage")
        texture.image = normal
        normal_map = nodes.new("ShaderNodeNormalMap")
        links.new(texture.outputs["Color"], normal_map.inputs["Color"])
        links.new(normal_map.outputs["Normal"], shader.inputs["Normal"])
    return material


if PREVIEW:
    # As the page shows it: its colours times the shading, the bumps, see-through fins, and the eye's parts.
    looks = {
        "body": preview_material("body", image=body_image, normal=normal_image, vertex_colours=True),
        "fin": preview_material("fin", image=fin_image, vertex_colours=True, alpha=True, roughness=0.45),
        "iris": preview_material("iris", image=iris_image, roughness=0.4),
        "pupil": preview_material("pupil", colour=(0.005, 0.005, 0.006), roughness=0.15),
        "cornea": preview_material("cornea", colour=(1, 1, 1), roughness=0.0, transmission=1.0),
        "lips": preview_material("lips", colour=(0.9, 0.45, 0.35)),
        "mouth": preview_material("mouth", colour=(0.05, 0.01, 0.005), roughness=0.9),
        "nostril": preview_material("nostril", colour=(0.1, 0.02, 0.01), roughness=0.8),
        "stalk": preview_material("stalk", colour=(0.01, 0.01, 0.012)),
    }
    for name, obj in objects.items():
        if name.startswith("fin_"):
            # Blender holds a fin's s the other way up (glTF's v is flipped on import); the picture follows the page.
            for loop in obj.data.uv_layers[0].data:
                loop.uv.y = 1 - loop.uv.y
        key = "fin" if name.startswith("fin_") else name.split(".")[0]
        if key in looks:
            obj.data.materials.clear()
            obj.data.materials.append(looks[key])
    world = bpy.data.worlds.new("preview")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.62, 0.74, 0.74, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.7
    scene.world = world
    for name, energy, location in (("key", 500, (1.5, 1.0, 2.5)), ("fill", 150, (-2.0, 0.5, 0.8)), ("rim", 300, (-0.5, -2.0, 1.5))):
        light = bpy.data.lights.new(name, "AREA")
        light.energy = energy
        light.size = 1.5
        obj = bpy.data.objects.new(name, light)
        obj.location = location
        obj.rotation_euler = (0, 0, 0)
        direction = -obj.location
        obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
        scene.collection.objects.link(obj)
    scene.cycles.samples = 96
    scene.render.resolution_x, scene.render.resolution_y = 1200, 800
    scene.render.film_transparent = False
    for label, location in (("side", (1.9, -0.25, 0.25)), ("front", (1.3, -1.3, 0.45))):
        camera_data = bpy.data.cameras.new(label)
        camera_data.lens = 70
        camera = bpy.data.objects.new(label, camera_data)
        camera.location = location
        camera.rotation_euler = (-camera.location + bpy.context.scene.cursor.location).to_track_quat("-Z", "Y").to_euler()
        scene.collection.objects.link(camera)
        scene.camera = camera
        scene.render.filepath = os.path.join(OUT, f"{KIND}-preview-{label}.png")
        bpy.ops.render.render(write_still=True)
    print("PREVIEW", OUT)
