const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      if (!dirPath.includes('node_modules')) walk(dirPath, callback);
    } else if (dirPath.endsWith('.jsx')) {
      callback(dirPath);
    }
  });
}

const map = [
  // Fix for text on dark backgrounds (buttons, badges)
  { p: /bg-primary(\s+[^>]*?)?\s+text-on-surface\b/g, r: 'bg-primary$1 text-on-primary' },
  { p: /bg-red-600(\s+[^>]*?)?\s+text-on-surface\b/g, r: 'bg-error$1 text-on-error' },
  { p: /bg-primary-container(\s+[^>]*?)?\s+text-on-surface\b/g, r: 'bg-primary-container$1 text-on-primary' },
  { p: /bg-gradient-to-r(\s+[^>]*?)?\s+text-on-surface\b/g, r: 'bg-gradient-to-r$1 text-white' },
  { p: /text-on-surface-variant(\s+[^>]*?)?\s+bg-gradient-to-r/g, r: 'text-white$1 bg-gradient-to-r' },
  
  // Specific fix for the Landing page hero gradient button
  { p: /bg-gradient-to-r from-primary-container to-secondary-container text-on-surface/g, r: 'bg-gradient-to-r from-primary-container to-secondary-container text-white' },
  
  // Fix for violet-400 contrast in light mode
  { p: /\btext-violet-400\b/g, r: 'text-primary' },
  
  // Fix for hardcoded slate borders in light mode
  { p: /\bborder-slate-700\/30\b/g, r: 'border-outline-variant/20' },
  { p: /\bborder-slate-200\/50\b/g, r: 'border-outline-variant/20' },
];

let changedCount = 0;

walk('./src', (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;
  
  for (const rep of map) {
    newContent = newContent.replace(rep.p, rep.r);
  }
  
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Contrast Fixed: ${filePath}`);
    changedCount++;
  }
});

console.log(`Contrast fix complete. Updated ${changedCount} files.`);
