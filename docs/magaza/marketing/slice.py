"""Slice out/panorama.png (7920x2868) into out/01..06.png (1320x2868) and build out/preview.png."""
from PIL import Image
p = Image.open('out/panorama.png').convert('RGB')
assert p.size == (7920, 2868), p.size
for i in range(6):
    p.crop((i*1320, 0, (i+1)*1320, 2868)).save(f'out/{i+1:02d}.png')
p.resize((7920//6, 2868//6), Image.LANCZOS).save('out/preview.png')
