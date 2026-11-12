"""Photoreal material overrides for every non-Mario asset (art direction round 3). Keys: (asset or '*', material name).
Values are MatSpec attributes. Poly Haven ids are CC0 scans (ATTRIBUTION.md); procedural kinds live in lib/detail.py."""
KER = dict(kind='keratin', photo=None, rough=0.38, bump=2.0, coat=0.35, coat_rough=0.25)
SCALES = dict(kind='scales', photo=None, rough=0.55, bump=1.6, params=dict(cells=90))
LEATHER = dict(photo='brown_leather', rough=0.42, bump=1.2, chroma=0.0, contrast=0.6)
METAL = dict(photo='metal_plate', rough=0.35, metal=0.9, bump=1.0, chroma=0.0, contrast=0.6)
RUST = dict(photo='rusty_metal_02', rough=0.5, metal=0.8, bump=1.0, chroma=0.15, contrast=0.6)
VELVET = dict(photo='velour_velvet', rough=0.8, bump=0.8, sheen=0.7, sheen_rough=0.35)
COTTON = dict(photo='cotton_jersey', rough=0.9, bump=1.6, sheen=0.3)
LINEN = dict(photo='rough_linen', rough=0.88, bump=1.6, sheen=0.25)
WET = dict(kind='skin_real', photo=None, rough=0.3, bump=0.8, coat=0.6, coat_rough=0.1)
EYE = dict(rough=0.04, coat=1.0, coat_rough=0.02)

TABLE = {
    ('*', 'M_Eye'): EYE,
    # goomba: leathery fungal cap creature
    ('goomba', 'M_Head'): dict(photo='fabric_leather_02', overlay='fungal', rough=0.55, bump=1.5, chroma=0.0, contrast=0.6),
    ('goomba', 'M_Stem'): dict(kind='fungal', rough=0.65, bump=1.4), ('goomba', 'M_Feet'): LEATHER,
    ('goomba', 'M_Brow'): dict(kind='hair_fine', rough=0.5, bump=3.0),
    # turtles: keratin shells with growth rings, reptile scales
    ('*', 'M_Shell'): KER, ('*', 'M_Belly'): dict(KER, params=dict(cells=4, rings=6.0), coat=0.2), ('*', 'M_Skin'): SCALES,
    ('*', 'M_Shoe'): LEATHER, ('*', 'M_Hair'): dict(kind='hair_fine', rough=0.5, bump=3.0), ('*', 'M_Rim'): dict(KER, params=dict(cells=12)),
    ('*', 'M_Spike'): dict(kind='grain', rough=0.4, bump=1.0, coat=0.3), ('*', 'M_Horn'): dict(kind='grain', rough=0.45, bump=1.2),
    ('koopa', 'M_Wing'): dict(kind='hair_fine', rough=0.7, bump=2.0, sheen=0.3), ('hammer_bro', 'M_Helmet'): RUST,
    ('lakitu', 'M_Goggle'): METAL, ('lakitu', 'M_Cloud'): dict(kind='fur', rough=1.0, bump=1.2, sheen=0.5),
    # metal objects
    ('bullet', 'M_Body'): dict(METAL, rough=0.42, metal=0.75), ('bullet', 'M_Base'): RUST, ('bullet', 'M_Arm'): COTTON,
    ('*', 'M_Metal'): RUST, ('*', 'M_Handle'): dict(kind='hair', rough=0.7, bump=2.0),
    # plants / sea creatures
    ('piranha', 'M_Head'): dict(kind='fungal', rough=0.35, bump=1.0, coat=0.4), ('piranha', 'M_Spot'): dict(kind='fungal', rough=0.4, bump=0.8),
    ('piranha', 'M_Stem'): dict(kind='hair', rough=0.5, bump=1.5), ('piranha', 'M_Lip'): dict(kind='skin_real', rough=0.35),
    ('piranha', 'M_Mouth'): WET, ('bowser', 'M_Mouth'): WET,
    ('blooper', 'M_Body'): WET, ('blooper', 'M_Mask'): dict(WET, rough=0.2),
    ('cheep', 'M_Body'): dict(SCALES, rough=0.3, coat=0.6, coat_rough=0.1, params=dict(cells=60)), ('cheep', 'M_Belly'): dict(SCALES, rough=0.3, coat=0.5),
    ('cheep', 'M_Fin'): dict(kind='hair_fine', rough=0.35, bump=2.0, coat=0.4),
    # items
    ('mushroom', 'M_Cap'): VELVET, ('one_up', 'M_Cap'): VELVET, ('mushroom', 'M_Spot'): VELVET, ('one_up', 'M_Spot'): VELVET,
    ('mushroom', 'M_Stem'): dict(kind='fungal', rough=0.7, bump=1.2), ('one_up', 'M_Stem'): dict(kind='fungal', rough=0.7, bump=1.2),
    ('coin', 'M_Coin'): dict(kind='worn_gold', rough=0.3, metal=1.0, bump=1.2),
    ('star', 'M_Star'): dict(kind='smooth', rough=0.12, coat=1.0, coat_rough=0.03, bump=0.3),
    ('fire_flower', 'M_PetalOut'): VELVET, ('fire_flower', 'M_PetalIn'): VELVET, ('fire_flower', 'M_Leaf'): dict(kind='hair', rough=0.45, bump=1.4, coat=0.3),
    ('fire_flower', 'M_Face'): dict(kind='fungal', rough=0.5, bump=0.8),
    # npcs
    ('toad', 'M_Cap'): VELVET, ('toad', 'M_Spot'): VELVET, ('toad', 'M_Vest'): LINEN, ('toad', 'M_Pants'): LINEN,
    ('*', 'M_Dress'): dict(photo='stretch_poplin', rough=0.75, bump=1.4, sheen=0.4), ('*', 'M_Trim'): VELVET,
    ('*', 'M_Crown'): dict(kind='worn_gold', rough=0.25, metal=1.0), ('toad', 'M_Skin'): dict(kind='skin_real', rough=0.45, bump=0.6),
    ('princess', 'M_Skin'): dict(kind='skin_real', rough=0.45, bump=0.5),
}


def apply(asset_name, specs):
    for sp in specs:
        o = TABLE.get((asset_name, sp.name)) or TABLE.get(('*', sp.name))
        if not o:
            continue
        if ('kind' in o or 'photo' in o) and 'params' not in o:
            sp.params = {}
        if 'kind' in o and 'photo' not in o:
            sp.photo = None
        for k, v in o.items():
            setattr(sp, k, v)
        if o.get('photo'):
            sp.flat = False
    return specs
