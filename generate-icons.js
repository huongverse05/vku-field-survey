const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Generating official VKU icons...');
const psScript = path.join(__dirname, 'generate-pwa-icons.ps1');
const svgScript = path.join(__dirname, 'generate-svg-icons.js');

try {
  execSync(`powershell -ExecutionPolicy Bypass -File "${psScript}"`, { stdio: 'inherit' });
  execSync(`node "${svgScript}"`, { stdio: 'inherit' });
  console.log('VKU PWA icons generated successfully!');
} catch (err) {
  console.error('Error generating icons:', err.message);
}
