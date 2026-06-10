import sharp from "sharp";
import { mkdirSync } from "node:fs";

mkdirSync("public/icons", { recursive: true });

const svg = "public/package.svg";

await sharp(svg)
  .resize(192, 192, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile("public/icons/icon-192.png");

await sharp(svg)
  .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile("public/icons/icon-512.png");

await sharp(svg)
  .resize(410, 410, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .extend({ top: 51, bottom: 51, left: 51, right: 51, background: { r: 31, g: 41, b: 55, alpha: 1 } })
  .png()
  .toFile("public/icons/maskable-512.png");

await sharp(svg)
  .resize(180, 180, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile("public/icons/apple-touch-icon.png");

console.log("icons generated");
