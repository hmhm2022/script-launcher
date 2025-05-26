const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// 确保 assets 目录存在
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const svgPath = path.join(assetsDir, 'icon.svg');
const pngPath = path.join(assetsDir, 'icon.png');
const icoPaths = [
  { path: path.join(assetsDir, 'icon.ico'), size: 256 },
  { path: path.join(assetsDir, 'icon-16.png'), size: 16 },
  { path: path.join(assetsDir, 'icon-32.png'), size: 32 },
  { path: path.join(assetsDir, 'icon-64.png'), size: 64 },
  { path: path.join(assetsDir, 'icon-128.png'), size: 128 },
  { path: path.join(assetsDir, 'icon-256.png'), size: 256 }
];

// 检查 SVG 文件是否存在
if (!fs.existsSync(svgPath)) {
  console.error('SVG 图标文件不存在:', svgPath);
  process.exit(1);
}

// 转换为 PNG (确保主图标是256x256)
console.log('正在将 SVG 转换为 PNG...');
sharp(svgPath)
  .resize(256, 256) // 确保主图标是256x256
  .png()
  .toFile(pngPath)
  .then(() => {
    console.log('PNG 图标已创建:', pngPath);
    
    // 创建不同尺寸的图标
    return Promise.all(
      icoPaths.map(({ path, size }) => {
        console.log(`正在创建 ${size}x${size} 图标...`);
        return sharp(svgPath)
          .resize(size, size)
          .png()
          .toFile(path)
          .then(() => {
            console.log(`${size}x${size} 图标已创建:`, path);
          });
      })
    );
  })
  .catch(err => {
    console.error('转换图标时出错:', err);
  }); 