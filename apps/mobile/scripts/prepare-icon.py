from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

# Create an original Asisten Sales launcher mark; the old artwork is not reused.
root = Path(__file__).resolve().parents[1]
target = root / "assets" / "dana-honda-icon-square.png"
S = 1024
img = Image.new("RGBA", (S, S), (18, 20, 27, 255))
draw = ImageDraw.Draw(img)

# Soft inset panel and red corner accents
draw.rounded_rectangle((58, 58, 966, 966), radius=210, fill=(27, 30, 39, 255), outline=(63, 67, 78, 255), width=10)
draw.rounded_rectangle((112, 112, 912, 912), radius=170, outline=(230, 0, 18, 255), width=24)

# Original abstract "D" monogram built from bold geometric strokes
draw.rounded_rectangle((245, 235, 420, 790), radius=72, fill=(255, 255, 255, 255))
draw.rounded_rectangle((330, 235, 745, 790), radius=205, outline=(255, 255, 255, 255), width=112)
draw.rounded_rectangle((330, 350, 650, 675), radius=150, fill=(27, 30, 39, 255))

# Red forward-motion slash and small dashboard signal bars
draw.polygon([(495, 690), (610, 690), (760, 515), (645, 515)], fill=(230, 0, 18, 255))
draw.rounded_rectangle((690, 755, 755, 830), radius=24, fill=(230, 0, 18, 255))
draw.rounded_rectangle((785, 700, 850, 830), radius=24, fill=(255, 255, 255, 255))
draw.rounded_rectangle((880, 640, 945, 830), radius=24, fill=(230, 0, 18, 255))

# Small highlight for a clean app-store finish
draw.ellipse((168, 165, 214, 211), fill=(255, 255, 255, 230))
img.save(target, "PNG", optimize=True)

with Image.open(target) as check:
    if check.size != (1024, 1024):
        raise SystemExit(f"Generated icon is not square: {check.size}")
print(f"Prepared original launcher icon: {target} ({target.stat().st_size} bytes)")
