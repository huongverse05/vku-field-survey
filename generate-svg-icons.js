const fs = require('fs');
const path = require('path');

const icon512Png = fs.readFileSync(path.join(__dirname, 'icons', 'icon-512.png'));
const b64 = icon512Png.toString('base64');

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="64" fill="#ffffff"/>
  <image href="data:image/png;base64,${b64}" x="0" y="0" width="512" height="512" />
</svg>`;

fs.writeFileSync(path.join(__dirname, 'icons', 'icon.svg'), svgContent, 'utf8');
fs.writeFileSync(path.join(__dirname, 'icons', 'icon-192.svg'), svgContent, 'utf8');
fs.writeFileSync(path.join(__dirname, 'icons', 'icon-512.svg'), svgContent, 'utf8');

console.log('Successfully updated icon.svg, icon-192.svg, icon-512.svg!');
