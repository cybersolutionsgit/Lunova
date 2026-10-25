"""Blender build step for the owner-supplied CC BY Grauwolf model.
Usage: blender -b -t 4 --python scripts/prepare-jeans-shopper.py -- INPUT_GLB OUTPUT_DIR
Original: https://sketchfab.com/3d-models/d81314a29e3943d88a6ee1426021a177
Modifications: scale/origin normalization, decimation, texture resizing, lower-body rig and walking loop.
"""
import bpy, math, pathlib, sys, json
from mathutils import Vector
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent))
from shopper_pose import repose_arms
source, output = sys.argv[sys.argv.index('--') + 1:][:2]
output = pathlib.Path(output); output.mkdir(parents=True, exist_ok=True)
def smooth(value):
    v=max(0,min(1,value)); return v*v*(3-2*v)
for name, ratio, color_size in [('shopper-push',.18,1024),('shopper-push-low',.065,512)]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=source)
    mesh = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
    mesh.parent=None; bpy.context.view_layer.objects.active=mesh; mesh.select_set(True)
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    points=[v.co.copy() for v in mesh.data.vertices]
    lo=Vector(tuple(min(p[i] for p in points) for i in range(3))); hi=Vector(tuple(max(p[i] for p in points) for i in range(3)))
    offset=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z)); scale=1.72/(hi.z-lo.z)
    for vertex in mesh.data.vertices: vertex.co=(vertex.co-offset)*scale
    mesh.data.update()
    repose_arms(mesh)
    mod=mesh.modifiers.new('Mobile topology budget','DECIMATE'); mod.ratio=ratio
    bpy.ops.object.modifier_apply(modifier=mod.name)
    mesh.name='Grauwolf_Jeans_Shopper'
    # Keep the original UV mapping and material nodes. Only resize/compress their images.
    for image in list(bpy.data.images):
        if not image.size[0]: continue
        is_color=image.name=='Image_1'
        size=color_size if is_color else min(color_size,512)
        if max(image.size)>size: image.scale(size,size)
        image.file_format='JPEG' if is_color else 'PNG'
        image.filepath_raw=str(output/(name+'-'+image.name+('.jpg' if is_color else '.png')))
        image.save(); image.pack()
    bpy.ops.object.select_all(action='DESELECT')
    armdata=bpy.data.armatures.new('JeansShopperRig'); rig=bpy.data.objects.new('JeansShopperRig',armdata)
    bpy.context.collection.objects.link(rig); bpy.context.view_layer.objects.active=rig; rig.select_set(True); bpy.ops.object.mode_set(mode='EDIT')
    specifications={'body':((0,0,.86),(0,0,1.15),None)}
    for side,hip,knee,ankle in [('L',(-.108,.031,.84),(-.115,.035,.46),(-.10,.006,.14)),('R',(.104,-.06,.84),(.156,-.02,.46),(.23,.01,.14))]:
        specifications['thigh_'+side]=(hip,knee,'body');specifications['shin_'+side]=(knee,ankle,'thigh_'+side);specifications['foot_'+side]=(ankle,(ankle[0],ankle[1]-.1,.045),'shin_'+side)
    for bone_name,(head,tail,parent) in specifications.items():
        bone=armdata.edit_bones.new(bone_name);bone.head=head;bone.tail=tail
        if parent: bone.parent=armdata.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    groups={bone_name:mesh.vertex_groups.new(name=bone_name) for bone_name in specifications}
    for vertex in mesh.data.vertices:
        x,y,z=vertex.co;side='L' if x < .025 else 'R'
        thigh=1-smooth((z-.82)/.12)
        shin=1-smooth((z-.38)/.20)
        foot=1-smooth((z-.10)/.12)
        weights={'body':1-thigh,'thigh_'+side:thigh*(1-shin),'shin_'+side:thigh*shin*(1-foot),'foot_'+side:thigh*shin*foot}
        for bone_name,weight in weights.items():
            if weight>.00001: groups[bone_name].add([vertex.index],weight,'REPLACE')
    modifier=mesh.modifiers.new('Walking skin','ARMATURE');modifier.object=rig;mesh.parent=rig
    rig.animation_data_create();action=bpy.data.actions.new('Walk');rig.animation_data.action=action
    scene=bpy.context.scene;scene.render.fps=30;scene.frame_start=1;scene.frame_end=31
    for frame in range(1,32):
        phase=(frame-1)/30*math.tau
        for side,shift in [('L',0),('R',math.pi)]:
            for part,angle in [('thigh',math.sin(phase+shift)*.19),('shin',-max(0,math.sin(phase+shift))*.25),('foot',math.sin(phase+shift)*.04)]:
                bone=rig.pose.bones[part+'_'+side];bone.rotation_mode='XYZ';bone.rotation_euler=(angle,0,0);bone.keyframe_insert(data_path='rotation_euler',frame=frame)
        body=rig.pose.bones['body'];body.location=(0,.006*math.sin(phase)**2,0);body.keyframe_insert(data_path='location',frame=frame)
    for curve in action.fcurves:
        for key in curve.keyframe_points: key.interpolation='LINEAR'
    scene.frame_set(1)
    bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);rig.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(output/(name+'.glb')),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_image_format='AUTO',export_yup=True,export_copyright='model an jeans by Grauwolf; CC BY 4.0 https://creativecommons.org/licenses/by/4.0/ ; source https://sketchfab.com/3d-models/d81314a29e3943d88a6ee1426021a177')
    print('ASSET_REPORT',json.dumps({'variant':name,'vertices':len(mesh.data.vertices),'triangles':sum(len(p.vertices)-2 for p in mesh.data.polygons),'fileBytes':(output/(name+'.glb')).stat().st_size}))
