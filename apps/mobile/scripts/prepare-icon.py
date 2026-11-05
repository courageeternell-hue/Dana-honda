from pathlib import Path
from PIL import Image

# Expo requires launcher/adaptive icons to be square. Keep the original art intact
# and center it on a transparent 1024x1024 canvas instead of cropping it.
root = Path(__file__).resolve().parents[1]
source = root / "assets" / "dana-honda-icon.png"
target = root / "assets" / "dana-honda-icon-square.png"

with Image.open(source) as original:
    image = original.convert("RGBA")
    image.thumbnail((920, 920), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    x = (1024 - image.width) // 2
    y = (1024 - image.height) // 2
    canvas.alpha_composite(image, (x, y))
    canvas.save(target, format="PNG", optimize=True)

with Image.open(target) as check:
    if check.size != (1024, 1024):
        raise SystemExit(f"Generated icon is not square: {check.size}")
print(f"Prepared square icon: {target} ({target.stat().st_size} bytes)")
