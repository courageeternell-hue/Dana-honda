const path = require("path");
const fs = require("fs");
const Jimp = require("jimp-compact");

module.exports = async ({ config }) => {
  const assetsDir = path.join(__dirname, "assets");
  const source = path.join(assetsDir, "dana-honda-icon.png");
  const square = path.join(assetsDir, "dana-honda-icon-square.png");

  if (!fs.existsSync(source)) {
    throw new Error("Dana Honda launcher icon source is missing: " + source);
  }

  // Build a square launcher icon at Expo config time, including manual EAS builds.
  // Keep all artwork visible by fitting it onto a transparent square canvas.
  const artwork = await Jimp.read(source);
  artwork.scaleToFit(920, 920);
  const canvas = new Jimp(1024, 1024, 0x00000000);
  const x = Math.floor((1024 - artwork.bitmap.width) / 2);
  const y = Math.floor((1024 - artwork.bitmap.height) / 2);
  canvas.composite(artwork, x, y);
  await canvas.writeAsync(square);

  return {
    ...config,
    icon: "./assets/dana-honda-icon-square.png",
    android: {
      ...(config.android || {}),
      adaptiveIcon: {
        ...(config.android?.adaptiveIcon || {}),
        backgroundColor: "#FFFFFF",
        foregroundImage: "./assets/dana-honda-icon-square.png"
      }
    }
  };
};
