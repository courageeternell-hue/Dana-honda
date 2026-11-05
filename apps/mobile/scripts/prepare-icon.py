from pathlib import Path
from PIL import Image, ImageOps

# Use the exact logo uploaded by the project owner at the repository root.
repo_root = Path(__file__).resolve().parents[3]
source = repo_root / "20261105_213102.png"
target = Path(__file__).resolve().parents[1] / "assets" / "dana-honda-icon-square.png"

if not source.is_file():
    raise SystemExit(f"Uploaded app logo not found: {source}")

target.parent.mkdir(parents=True, exist_ok=True)
with Image.open(source) as original:
    # Center-crop to square, then resize for Android launcher and splash assets.
    image = ImageOps.fit(
        original.convert("RGBA"),
        (1024, 1024),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    )
    image.save(target, format="PNG", optimize=True)

with Image.open(target) as check:
    if check.size != (1024, 1024):
        raise SystemExit(f"Invalid app icon size: {check.size}")

print(f"App icon prepared from uploaded logo: {source} -> {target}")
