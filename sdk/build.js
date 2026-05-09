import fs from 'fs';
import path from 'path';

// Create dist directory
const distDir = 'dist';
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Copy main files
const files = [
  'chainforge-sdk.js',
  'chainforge-sdk.d.ts',
  'README.md',
  'LICENSE'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join(distDir, file));
    console.log(`Copied ${file} to dist/`);
  }
});

// Generate package.json for dist
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
delete packageJson.scripts;
delete packageJson.devDependencies;
fs.writeFileSync(
  path.join(distDir, 'package.json'),
  JSON.stringify(packageJson, null, 2)
);

console.log('Build completed successfully!');
