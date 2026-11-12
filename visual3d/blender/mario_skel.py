"""Mario skeleton constants shared by the model and the clips (armature axes: x forward, y left, z up)."""

HIP_Z, KNEE_Z, ANKLE_Z = 0.80, 0.44, 0.15
L1, L2 = HIP_Z - KNEE_Z, KNEE_Z - ANKLE_Z          # thigh, shin
LEG_Y, SH_Y = 0.15, 0.36
S_ARM = (0.0, SH_Y, 1.14)
E_ARM = (0.0, 0.43, 0.89)
W_ARM = (0.07, 0.46, 0.68)
H_ARM = (0.115, 0.47, 0.54)
NECK = (0.0, 0.0, 1.27)


def bones():
    d = [('Root', None, (0, 0, 0), (0, 0, 0.15)),
         ('Hips', 'Root', (0, 0, HIP_Z), (0, 0, 0.95)),
         ('Spine', 'Hips', (0, 0, 0.95), (0, 0, 1.22)),
         ('Head', 'Spine', NECK, (0, 0, 1.85))]
    for s, sg in (('.L', 1), ('.R', -1)):
        d += [('UpperArm' + s, 'Spine', (S_ARM[0], sg * S_ARM[1], S_ARM[2]), (E_ARM[0], sg * E_ARM[1], E_ARM[2])),
              ('Forearm' + s, 'UpperArm' + s, (E_ARM[0], sg * E_ARM[1], E_ARM[2]), (W_ARM[0], sg * W_ARM[1], W_ARM[2])),
              ('Hand' + s, 'Forearm' + s, (W_ARM[0], sg * W_ARM[1], W_ARM[2]), (H_ARM[0], sg * H_ARM[1], H_ARM[2])),
              ('Thigh' + s, 'Hips', (0, sg * LEG_Y, HIP_Z), (0, sg * LEG_Y, KNEE_Z)),
              ('Shin' + s, 'Thigh' + s, (0, sg * LEG_Y, KNEE_Z), (0, sg * LEG_Y, ANKLE_Z)),
              ('Foot' + s, 'Shin' + s, (0, sg * LEG_Y, ANKLE_Z), (0.32, sg * LEG_Y, 0.11))]
    return d


BONE_NAMES = [b[0] for b in bones()]
LR = {b: b[:-2] + '.R' for b in BONE_NAMES if b.endswith('.L')}

