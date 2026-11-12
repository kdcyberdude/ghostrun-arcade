"""Contact sheets: original | 3D pairs, 6 areas per sheet. Usage: python contact_sheet.py shots.json out_prefix"""
import json, sys
from PIL import Image, ImageDraw
shots = json.load(open(sys.argv[1])); prefix = sys.argv[2]; W, H = 384, 360
for k in range(0, len(shots), 6):
    page = shots[k:k + 6]; sheet = Image.new('RGB', (W * 2 + 12, len(page) * (H + 22)), (30, 30, 36)); d = ImageDraw.Draw(sheet)
    for i, s in enumerate(page):
        y = i * (H + 22); d.text((4, y + 4), f"{s['level']} / {s['area']} ({s['theme']})   original | 3D", fill=(255, 220, 80))
        sheet.paste(Image.open(s['orig']).convert('RGB').resize((W, H), Image.NEAREST), (0, y + 20))
        sheet.paste(Image.open(s['v25']).convert('RGB').resize((W, H), Image.LANCZOS), (W + 12, y + 20))
    sheet.save(f'{prefix}-{k // 6:02d}.png')
print('sheets:', (len(shots) + 5) // 6)
