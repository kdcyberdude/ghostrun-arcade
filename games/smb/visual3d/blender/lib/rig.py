"""Armature + clip authoring helpers (armature-axis rotations, NLA tracks -> glTF animations) and glTF export wrapper."""
import math

import bpy
import numpy as np
from mathutils import Matrix

from .geo import rot_xyz

FPS = 30


def make_armature(name, defs):
    """defs: list of (bone, parent_or_None, head(xyz), tail(xyz)). Returns the armature object."""
    arm = bpy.data.armatures.new(name)
    obj = bpy.data.objects.new(name, arm)
    bpy.context.scene.collection.objects.link(obj)
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.edit_bones
    for n, p, h, t in defs:
        b = eb.new(n)
        b.head, b.tail = h, t
        if p:
            b.parent = eb[p]
    bpy.ops.object.mode_set(mode='OBJECT')
    arm.display_type = 'STICK'
    return obj


def skin_to(mesh_obj, arm_obj):
    mesh_obj.parent = arm_obj
    mod = mesh_obj.modifiers.new('Armature', 'ARMATURE')
    mod.object = arm_obj


class Rig:
    """Pose in ARMATURE AXES: R(bone, rx, ry, rz) is a rotation (degrees) about the bone's joint expressed in armature axes
    (x forward, y left, z up) relative to the parent's current frame. L(bone, x, y, z) is a translation in armature axes."""

    def __init__(self, obj, loc_bones=('Root', 'Hips')):
        self.obj = obj
        self.rest = {b.name: np.array(b.matrix_local.to_3x3()) for b in obj.data.bones}
        for pb in obj.pose.bones:
            pb.rotation_mode = 'QUATERNION'
        self.loc_bones = set(loc_bones)
        self.rot, self.loc, self.prevq = {}, {}, {}

    def reset(self):
        self.rot, self.loc = {}, {}

    def R(self, bone, rx=0.0, ry=0.0, rz=0.0, add=False):
        o = self.rot.get(bone, (0, 0, 0)) if add else (0, 0, 0)
        self.rot[bone] = (o[0] + rx, o[1] + ry, o[2] + rz)

    def L(self, bone, x=0.0, y=0.0, z=0.0):
        self.loc[bone] = (x, y, z)
        self.loc_bones.add(bone)

    def key(self, frame):
        for pb in self.obj.pose.bones:
            Rb = self.rest[pb.name]
            D = rot_xyz(*self.rot.get(pb.name, (0, 0, 0)))
            q = Matrix((Rb.T @ D @ Rb).tolist()).to_quaternion()
            if pb.name in self.prevq:
                q.make_compatible(self.prevq[pb.name])
            self.prevq[pb.name] = q.copy()
            pb.rotation_quaternion = q
            pb.keyframe_insert('rotation_quaternion', frame=frame, group=pb.name)
            if pb.name in self.loc_bones:
                t = Rb.T @ np.asarray(self.loc.get(pb.name, (0, 0, 0)), float)
                pb.location = tuple(t)
                pb.keyframe_insert('location', frame=frame, group=pb.name)

    def begin(self, name):
        ad = self.obj.animation_data_create()
        act = bpy.data.actions.new(name)
        ad.action = act
        self.prevq = {}
        self.reset()
        return act

    def end(self, name, act):
        ad = self.obj.animation_data
        # linear interpolation between (dense) keys keeps the exported curves faithful
        for fc in self.fcurves(act):
            for kp in fc.keyframe_points:
                kp.interpolation = 'LINEAR'
        ad.action = None
        tr = ad.nla_tracks.new()
        tr.name = name
        st = tr.strips.new(name, 0, act)
        st.name = name
        slots = getattr(act, 'slots', None)
        if slots and len(slots):
            try:
                st.action_slot = slots[0]
            except Exception:
                pass
        for pb in self.obj.pose.bones:   # back to rest so the next clip starts clean
            pb.rotation_quaternion = (1, 0, 0, 0)
            pb.location = (0, 0, 0)

    @staticmethod
    def fcurves(act):
        if hasattr(act, 'fcurves') and len(act.fcurves):
            return act.fcurves
        out = []
        for lay in getattr(act, 'layers', []):
            for strip in lay.strips:
                for cb in strip.channelbags:
                    out.extend(cb.fcurves)
        return out

    def clip(self, name, nframes, fn, loop=True):
        """fn(t) with t in [0,1] fills the pose (call R/L) for that phase. Keys frames 0..nframes (loop: last == first)."""
        act = self.begin(name)
        for f in range(nframes + 1):
            self.reset()
            t = f / nframes
            fn(t)
            self.key(f)
        self.end(name, act)
        return act


def set_fps():
    bpy.context.scene.render.fps = FPS


def export_glb(path, objs, anim=True, morph=True):
    """glTF 2.0 binary, Y-up, one animation per NLA track."""
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    props = set(bpy.ops.export_scene.gltf.get_rna_type().properties.keys())
    kw = dict(filepath=path, export_format='GLB', use_selection=True, export_yup=True, export_apply=False,
              export_animations=anim, export_skins=True, export_morph=morph, export_morph_normal=True,
              export_image_format='AUTO', export_texcoords=True, export_normals=True, export_tangents=False,
              export_materials='EXPORT', export_cameras=False, export_lights=False, export_extras=True,
              export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_frame_step=1,
              export_optimize_animation_size=False, export_anim_single_armature=True, export_reset_pose_bones=True,
              export_vertex_color='NONE', export_active_vertex_color_when_no_material=False, export_attributes=False,
              export_original_specular=False, export_def_bones=False, export_influence_nb=4)
    bpy.ops.export_scene.gltf(**{k: v for k, v in kw.items() if k in props})
