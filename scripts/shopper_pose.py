"""Repose the owner-selected static mesh; Blender-only build helper, no runtime service."""
import math
import bmesh
from mathutils import Vector
import numpy as np

def smooth(value):
    t=max(0.,min(1.,value));return t*t*(3-2*t)
def distance(point,a,b):
    delta=b-a;t=max(0,min(1,(point-a).dot(delta)/delta.length_squared));return (point-(a+delta*t)).length

def repose_arms(mesh):
    """Bake both arms toward a handle at Blender Y=-.28, Z=1.04, retaining UVs."""
    image=next(n.image for n in mesh.active_material.node_tree.nodes if n.type=='TEX_IMAGE' and n.image.name=='Image_1')
    pixels=np.empty(image.size[0]*image.size[1]*4,dtype=np.float32);image.pixels.foreach_get(pixels);pixels=pixels.reshape((image.size[1],image.size[0],4))
    vertex_uv={}
    for loop in mesh.data.loops:
        if loop.vertex_index not in vertex_uv:vertex_uv[loop.vertex_index]=mesh.data.uv_layers.active.data[loop.index].uv.copy()
    def color(index):
        uv=vertex_uv[index];u=(uv.x*15.9267292+.0000301816)%1;v=(uv.y*16.0034485-15.0034485)%1
        return pixels[int(v*(image.size[1]-1)),int(u*(image.size[0]-1)),:3]
    specifications=[
        ('L',(-.11,.045,1.39),(-.24,-.15,1.37),(-.155,-.005,1.605),(-.14,.015,1.69),(-.205,-.28,1.075)),
        ('R',(.13,.005,1.395),(.195,-.045,1.17),(.18,-.095,.945),(.17,-.11,.82),(.205,-.28,1.075))]
    chains=[];reports=[]
    for side,s,e,w,f,target in specifications:
        s,e,w,f,target=map(Vector,(s,e,w,f,target));l1=(e-s).length;l2=(w-e).length;axis=(target-s).normalized();d=(target-s).length
        a=(l1*l1-l2*l2+d*d)/(2*d);height=math.sqrt(max(0,l1*l1-a*a))
        outward=Vector((-1 if side=='L' else 1,0,0));outward=(outward-axis*outward.dot(axis)).normalized()
        elbow=s+axis*a+outward*height
        tip=target+Vector((0,-.035,-.06)).normalized()*(f-w).length
        old=[s,e,w,f];new=[s,elbow,target,tip];segments=[]
        for i,radius in enumerate([.115,.085,.06]):
            q=(old[i+1]-old[i]).rotation_difference(new[i+1]-new[i]);segments.append((old[i],old[i+1],new[i],q,radius))
        chains.append((side,segments));reports.append({'side':side,'shoulder':list(s),'elbow':list(elbow),'wrist':list(target)})
    from mathutils.kdtree import KDTree
    donors=[]
    for vertex in mesh.data.vertices:
        if vertex.co.x<-.03 and .70<vertex.co.z<1.04:
            rgb=color(vertex.index)
            if rgb[2]>rgb[0]*1.05:donors.append((vertex.co.copy(),vertex_uv[vertex.index].copy()))
    denim=KDTree(len(donors))
    for i,(point,uv) in enumerate(donors):denim.insert(point,i)
    denim.balance()
    moved={'L':0,'R':0}; originals={v.index:v.co.copy() for v in mesh.data.vertices}
    for vertex in mesh.data.vertices:
        p=vertex.co.copy();x,y,z=p
        if z<.74:continue
        choices=[]
        rgb=None
        for side,segments in chains:
            if side=='L':
                if x>-.095 or z<1.25:continue
                metrics=[distance(p,a,b)/radius for a,b,_,_,radius in segments]
                if min(metrics)>1.45 and not (x<-.17 and 1.25<z<1.48):continue
                rgb=color(vertex.index)
                if y>.075 and x>-.19 and (rgb[0]<.72 or rgb[1]<.46):continue
                if z>1.48:
                    if x>-.135:continue
                    head=((x+.005)/.09)**2+((y+.015)/.09)**2+((z-1.595)/.125)**2
                    if head<1 or (x>-.15 and (rgb[0]<.63 or rgb[1]<.38)):continue
                if y>.04 and rgb[0]<.68:continue
                # Blend only at the sleeve/shoulder, never at the hand/head contact.
                mask=smooth(((-x)-.095)/.055) if z<1.47 and x>-.15 else 1
            else:
                if x<(.065 if z<1.03 else .115) or z>1.45:continue
                metrics=[distance(p,a,b)/radius for a,b,_,_,radius in segments]
                if min(metrics)>1.3 and z>1.03:continue
                if z<1.03:
                    rgb=color(vertex.index)
                    if rgb[0]<.40 or rgb[1]<.21 or rgb[0]<rgb[2]*1.2:continue
                    mask=1
                else:mask=smooth((x-.115)/.055)
            weights=[math.exp(-m*m*3.5) for m in metrics];total=sum(weights)
            transformed=Vector((0,0,0))
            for weight,(a,b,ta,q,r) in zip(weights,segments):transformed+=(ta+q@(p-a))*(weight/total)
            choices.append((mask,side,transformed))
        if choices:
            mask,side,target=max(choices,key=lambda c:c[0]);vertex.co=p.lerp(target,mask);moved[side]+=1
    # The supplied scan touches hair/thigh. Remove stretched contact bridges rather
    # than dragging the head, hair or jeans along with the hands.
    bm=bmesh.new();bm.from_mesh(mesh.data);bm.verts.ensure_lookup_table()
    damaged=[]
    for face in bm.faces:
        for edge in face.edges:
            a,b=edge.verts
            before=(originals[a.index]-originals[b.index]).length
            if edge.calc_length()>max(.065,before*8):damaged.append(face);break
    bmesh.ops.delete(bm,geom=damaged,context='FACES_ONLY')
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
    boundary=[edge for edge in bm.edges if edge.is_boundary]
    if boundary:
        faces=bmesh.ops.holes_fill(bm,edges=boundary,sides=0).get('faces',[])
        uv=bm.loops.layers.uv.active
        if uv:
            for face in faces:
                for loop in face.loops:
                    original=next((other for other in loop.vert.link_loops if other.face not in faces),None)
                    if original:loop[uv].uv=original[uv].uv
    uv_layer=bm.loops.layers.uv.active
    if uv_layer and donors:
        for vertex in bm.verts:
            x,y,z=vertex.co
            if .05<x<.26 and -.23<y<.03 and .74<z<.97:
                nearest,index,_=denim.find(Vector((-x,y,z)))
                for loop in vertex.link_loops:loop[uv_layer].uv=donors[index][1]
                if y<-.12:vertex.co.y=-.12
    # Smooth only the bent elbow contact area, keeping face/clothing details intact.
    elbow_verts=[v for v in bm.verts if (v.co-Vector((-.271,-.078,1.271))).length<.075]
    for _ in range(4):bmesh.ops.smooth_vert(bm,verts=elbow_verts,factor=.45,use_axis_x=True,use_axis_y=True,use_axis_z=True)
    for face in bm.faces:face.smooth=True
    # A texture-baked hand imprint remained on the original scan's jeans.
    # Cover the repaired contact patch with a matching denim material.
    import bpy
    patch=bpy.data.materials.new('Restored denim contact');patch.use_nodes=True
    shader=patch.node_tree.nodes.get('Principled BSDF');shader.inputs['Base Color'].default_value=(.012,.025,.05,1);shader.inputs['Roughness'].default_value=.9
    mesh.data.materials.append(patch);patch_index=len(mesh.data.materials)-1
    for face in bm.faces:
        x,y,z=face.calc_center_median()
        if .045<x<.27 and -.24<y<.04 and .73<z<.98:face.material_index=patch_index
    # Remove the old touching-hand remnants at the temple and the distorted
    # upper sleeve. Rebuild the sleeve as a continuous garment surface.
    remove=[]
    shoulder=Vector((-.11,.045,1.39));elbow=Vector((-.271,-.078,1.271));cuff=Vector((-.226,-.212,1.14))
    for face in bm.faces:
        point=face.calc_center_median();x,y,z=point
        if (x<-.125 and -.10<y<.06 and 1.50<z<1.73) or (x<-.14 and y<.075 and 1.16<z<1.46 and min(distance(point,shoulder,elbow),distance(point,elbow,cuff))<.11):remove.append(face)
    bmesh.ops.delete(bm,geom=remove,context='FACES_ONLY')
    # Use a small original blouse UV sample, not a new external texture.
    blouse=[(v.co.copy(),vertex_uv[v.index].copy()) for v in mesh.data.vertices if .02<v.co.x<.09 and 1.22<v.co.z<1.30 and v.co.y<-.04]
    blouse_uv=blouse[len(blouse)//2][1] if blouse else Vector((0,0))
    sleeve=bpy.data.materials.new('Reconstructed blouse sleeve');sleeve.use_nodes=True
    sleeve_shader=sleeve.node_tree.nodes.get('Principled BSDF');sleeve_shader.inputs['Base Color'].default_value=(.5,.33,.22,1);sleeve_shader.inputs['Roughness'].default_value=.85
    mesh.data.materials.append(sleeve);sleeve_index=len(mesh.data.materials)-1
    path=[(shoulder,.07),(shoulder.lerp(elbow,.5),.061),(elbow,.056),(elbow.lerp(cuff,.5),.053),(cuff,.048)]
    rings=[]
    for i,(center,radius) in enumerate(path):
        tangent=(path[min(i+1,len(path)-1)][0]-path[max(i-1,0)][0]).normalized()
        u=tangent.cross(Vector((0,1,0))).normalized();v=tangent.cross(u).normalized();ring=[]
        for j in range(24):
            angle=j/24*math.tau;r=radius*(1+.025*math.sin(angle*5))
            ring.append(bm.verts.new(center+(u*math.cos(angle)+v*math.sin(angle))*r))
        rings.append(ring)
    for i in range(len(rings)-1):
        for j in range(24):
            face=bm.faces.new((rings[i][j],rings[i][(j+1)%24],rings[i+1][(j+1)%24],rings[i+1][j]));face.material_index=sleeve_index;face.smooth=True
            if uv_layer:
                for loop in face.loops:loop[uv_layer].uv=blouse_uv
    skin=bpy.data.materials.new('Reconstructed inner forearm');skin.use_nodes=True
    skin_shader=skin.node_tree.nodes.get('Principled BSDF');skin_shader.inputs['Base Color'].default_value=(.48,.27,.17,1);skin_shader.inputs['Roughness'].default_value=.8
    mesh.data.materials.append(skin);skin_index=len(mesh.data.materials)-1
    wrist=Vector((-.205,-.28,1.075));axis=(wrist-elbow).normalized();u=axis.cross(Vector((0,1,0))).normalized();v=axis.cross(u).normalized();skin_rings=[]
    for t,radius in [(0,.037),(.55,.031),(1,.025)]:
        center=elbow.lerp(wrist,t);skin_rings.append([bm.verts.new(center+(u*math.cos(j/24*math.tau)+v*math.sin(j/24*math.tau))*radius) for j in range(24)])
    for i in range(2):
        for j in range(24):
            face=bm.faces.new((skin_rings[i][j],skin_rings[i][(j+1)%24],skin_rings[i+1][(j+1)%24],skin_rings[i+1][j]));face.material_index=skin_index;face.smooth=True
    # Reconstruct the small fused hand/thigh contact surface with the clean
    # matching denim material. The edge rolls behind the existing jeans.
    if uv_layer and donors:
        grid=[];uv_by_vertex={}
        nearest,denim_index,_=denim.find(Vector((-.105,-.04,.85)))
        denim_uv=donors[denim_index][1].copy()
        for row in range(19):
            v=row/18;line=[]
            for col in range(13):
                u=col/12;x=.14+.095*math.sin(math.pi*v)**.3*(2*u-1);z=.72+.28*v
                y=-.146+.022*abs(2*u-1)**2+.018*abs(2*v-1)**2
                point=Vector((x,y,z));vertex=bm.verts.new(point);line.append(vertex)
                uv_by_vertex[vertex]=denim_uv
            grid.append(line)
        for row in range(18):
            for col in range(12):
                face=bm.faces.new((grid[row][col],grid[row][col+1],grid[row+1][col+1],grid[row+1][col]));face.material_index=patch_index;face.smooth=True
                for loop in face.loops:loop[uv_layer].uv=uv_by_vertex[loop.vert]
    bm.normal_update();bm.to_mesh(mesh.data);bm.free()
    print('CONTACT_BRIDGES_REMOVED',len(damaged))
    mesh.data.update()
    print('ARM_POSE',{'joints':reports,'modifiedVertices':moved})
