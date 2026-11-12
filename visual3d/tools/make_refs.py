#!/usr/bin/env python3
"""Upscaled, labeled reference sheets of the EXISTING sprites (design references for the 3D kit; never shipped).
Usage: .cache3d/venv-tools/bin/python visual3d/tools/make_refs.py   (run from the worktree root)"""
import json, os
from PIL import Image, ImageDraw
G = 'assets/graphics/'; OUT = 'visual3d/refs/'; S = 6
tables = json.load(open(G + 'tables.json'))['enemy_cells']
os.makedirs(OUT, exist_ok=True)

def sheet(items, cols, cw, ch, name):
    rows = (len(items) + cols - 1) // cols
    img = Image.new('RGB', (cols * (cw * S + 8), rows * (ch * S + 22)), (60, 64, 80)); d = ImageDraw.Draw(img)
    for i, (label, im) in enumerate(items):
        x, y = (i % cols) * (cw * S + 8) + 4, (i // cols) * (ch * S + 22) + 4
        bg = Image.new('RGBA', im.size, (104, 136, 252, 255)); bg.alpha_composite(im.convert('RGBA'))
        img.paste(bg.resize((im.width * S, im.height * S), Image.NEAREST).convert('RGB'), (x, y)); d.text((x, y + ch * S + 3), label, fill=(255, 255, 0))
    img.save(OUT + name); print(name, img.size)

# player cells: 16x32, 13 columns (renderer.ts player())
for who in ['mario', 'luigi', 'fire']:
    atlas = Image.open(f'{G}player-{who}-right.png').convert('RGBA'); cells = []
    for c in range(26):
        x, y = c % 13 * 16, c // 13 * 32; cells.append((f'{who} cell {c}', atlas.crop((x, y, x + 16, y + 32))))
    sheet(cells, 13, 16, 32, f'player-{who}-cells.png')

# enemy cells: 3x2 tiles of 8x8 from sprite-tiles-<palette>.png (renderer.ts enemyCell())
def enemy_cell(cell, palette):
    tiles = tables[cell]['tiles']; atlas = Image.open(f'{G}sprite-tiles-{palette}.png').convert('RGBA')
    img = Image.new('RGBA', (16, 24), (0, 0, 0, 0))
    for i in range(6):
        col, row = i % 2, i // 2; t = tiles[i]
        if t == 252: continue
        sym = tiles[row * 2] == tiles[row * 2 + 1]
        tile = atlas.crop((t % 16 * 8, t // 16 * 8, t % 16 * 8 + 8, t // 16 * 8 + 8))
        if sym and col == 1: tile = tile.transpose(Image.FLIP_LEFT_RIGHT)
        img.alpha_composite(tile, (col * 8, row * 8))
    return img
GREEN, RED, DARK = '0f-1a-30-27', '0f-16-30-27', '0f-0f-36-17'
named = [('goomba walk A', 14, DARK), ('goomba squash', 23, DARK), ('koopa A', 2, GREEN), ('koopa B', 3, GREEN), ('red koopa A', 2, RED), ('red koopa B', 3, RED),
 ('koopa shell A', 17, GREEN), ('koopa shell B', 18, GREEN), ('paratroopa A', 4, GREEN), ('paratroopa B', 5, GREEN), ('buzzy A', 0, DARK), ('buzzy B', 1, DARK),
 ('buzzy shell', 19, DARK), ('spiny A', 6, RED), ('spiny B', 7, RED), ('spiny egg A', 8, RED), ('piranha A', 32, GREEN), ('piranha B', 33, GREEN),
 ('blooper A', 10, '0f-00-30-10'), ('blooper B', 11, '0f-00-30-10'), ('cheep A', 12, RED), ('cheep B', 13, RED), ('bullet', 39, '0f-00-30-10'),
 ('lakitu A', 24, GREEN), ('lakitu B', 25, GREEN), ('hammer bro 0', 28, GREEN), ('hammer bro 1', 29, GREEN), ('hammer bro 2', 30, GREEN), ('hammer bro 3', 31, GREEN),
 ('podoboo', 34, RED), ('bowser 35', 35, GREEN), ('bowser 36', 36, GREEN), ('bowser 37', 37, GREEN), ('bowser 38', 38, GREEN),
 ('spring 40', 40, GREEN), ('spring 41', 41, GREEN), ('spring 42', 42, GREEN), ('toad/retainer 27', 27, RED), ('princess 26', 26, RED)]
sheet([(f'{n} [{c}]', enemy_cell(c, p)) for n, c, p in named], 8, 16, 24, 'enemy-cells.png')
