"""Contact sheet assembly (run with the tools venv python: PIL)."""
import json
import sys

from PIL import Image, ImageDraw

spec = json.load(open(sys.argv[1]))
items, cols = spec['items'], spec['cols']
ims = [Image.open(i['path']).convert('RGB') for i in items]
w, h = ims[0].size
rows = (len(ims) + cols - 1) // cols
pad = 4
sheet = Image.new('RGB', (cols * (w + pad) + pad, rows * (h + pad + 14) + pad), tuple(spec['bg']))
d = ImageDraw.Draw(sheet)
for k, (im, it) in enumerate(zip(ims, items)):
    x, y = pad + (k % cols) * (w + pad), pad + (k // cols) * (h + pad + 14)
    sheet.paste(im, (x, y + 14))
    d.text((x + 3, y + 1), it['label'], fill=(255, 255, 120))
sheet.save(spec['out'])
print('sheet', spec['out'], sheet.size)
