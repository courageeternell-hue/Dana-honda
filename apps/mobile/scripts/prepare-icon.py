from pathlib import Path
from PIL import Image, ImageOps

# Use the new logo already stored in the mobile assets directory.
# Never read or copy the legacy image from the repository root.
target = Path(__file__).resolve().parents[1] / "assets" / "dana-honda-icon-square.png"
temporary = target.with_name(target.stem + ".prepared.png")

if not target.is_file():
    raise SystemExit(f"New app icon not found: {target}")

try:
    with Image.open(target) as original:
        if original.format != "PNG":
            raise SystemExit(f"Invalid app icon format: {original.format}; expected PNG")
        # Normalize the source (including 2048x2048) to Expo's 1024x1024 icon size.
        prepared = ImageOps.fit(
            original.convert("RGBA"),
            (1024, 1024),
            method=Image.Resampling.LANCZOS,
            centering=(0.5, 0.5),
        )
        prepared.save(temporary, format="PNG", optimize=True)

    with Image.open(temporary) as check:
        if check.size != (1024, 1024):
            raise SystemExit(f"Invalid prepared app icon size: {check.size}")

    temporary.replace(target)
finally:
    if temporary.exists():
        temporary.unlink()

print(f"New app icon resized and verified at 1024x1024: {target}")
