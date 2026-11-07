from pathlib import Path
from PIL import Image

# Keep the app icon supplied in the mobile assets directory.
# Do not regenerate it from a legacy image at the repository root.
target = Path(__file__).resolve().parents[1] / "assets" / "dana-honda-icon-square.png"

if not target.is_file():
    raise SystemExit(f"New app icon not found: {target}")

with Image.open(target) as image:
    if image.size != (1024, 1024):
        raise SystemExit(f"Invalid app icon size: {image.size}; expected (1024, 1024)")
    if image.format != "PNG":
        raise SystemExit(f"Invalid app icon format: {image.format}; expected PNG")

print(f"New app icon verified without overwriting it: {target}")
