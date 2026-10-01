import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath  = resolve(__dirname, '../public/og-image.svg');
const pngPath  = resolve(__dirname, '../public/og-image.png');

const svgBuffer = readFileSync(svgPath);

await sharp(svgBuffer)
  .resize(1200, 630)
  .png({ quality: 90, compressionLevel: 8 })
  .toFile(pngPath);

console.log('og-image.png generated at', pngPath);
