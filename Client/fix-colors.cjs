const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      if (!dirPath.includes('node_modules')) {
        walk(dirPath, callback);
      }
    } else if (dirPath.endsWith('.jsx')) {
      callback(dirPath);
    }
  });
}

const map = [
  { p: /\btext-white\b/g, r: 'text-on-surface' },
  { p: /\btext-slate-50\b/g, r: 'text-on-surface' },
  { p: /\btext-slate-100\b/g, r: 'text-on-surface' },
  { p: /\btext-slate-200\b/g, r: 'text-on-surface' },
  { p: /\btext-slate-300\b/g, r: 'text-on-surface-variant' },
  { p: /\btext-slate-400\b/g, r: 'text-on-surface-variant' },
  { p: /\bbg-slate-900\/70\b/g, r: 'bg-surface/70' },
  { p: /\bbg-slate-900\b/g, r: 'bg-surface-container' },
  { p: /\bbg-\[\#0e0d15\]\b/g, r: 'bg-surface-container-lowest' },
  { p: /\bbg-\[\#1b1b23\]\b/g, r: 'bg-surface-container-low' },
  { p: /\bbg-\[\#04040a\]\b/g, r: 'bg-surface-container' }, // Footer bg
  { p: /\btext-slate-900\b/g, r: 'text-on-surface' }, // Some light theme specific text
  { p: /\btext-slate-800\b/g, r: 'text-on-surface' }, 
  { p: /\btext-slate-700\b/g, r: 'text-on-surface-variant' },
  { p: /\btext-slate-600\b/g, r: 'text-on-surface-variant' }, 
];

let changedFiles = 0;

walk('./src', (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;
  
  for (const rep of map) {
    newContent = newContent.replace(rep.p, rep.r);
  }
  
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated ${filePath}`);
    changedFiles++;
  }
});

console.log(`Finished updating ${changedFiles} files with semantic design tokens!`);
