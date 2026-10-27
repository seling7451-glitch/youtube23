const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

async function main() {
  const root = process.cwd();
  const source = path.join(root, 'assets', 'navo-mark.svg');
  const svg = await fs.readFile(source);
  const assets = path.join(root, 'assets');
  for (const [name, size] of [
    ['icon.png', 1024],
    ['adaptive-icon.png', 1024],
    ['splash.png', 512],
  ]) {
    await sharp(svg).resize(size, size).png().toFile(path.join(assets, name));
  }
}

main().catch((error) => {
  console.error('Ilova rasmlari yaratilmay qoldi:', error);
  process.exitCode = 1;
});
