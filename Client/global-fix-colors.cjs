const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      if (!dirPath.includes('node_modules') && !dirPath.includes('.git')) {
        walk(dirPath, callback);
      }
    } else if (dirPath.endsWith('.jsx')) {
      callback(dirPath);
    }
  });
}

const map = [
  // Text colors
  { p: /\btext-slate-500\b/g, r: 'text-on-surface-variant' },
  { p: /\btext-slate-400\b/g, r: 'text-on-surface-variant' },
  { p: /\btext-slate-600\b/g, r: 'text-on-surface-variant' },
  { p: /\btext-slate-300\b/g, r: 'text-outline-variant' },
  { p: /\btext-slate-700\b/g, r: 'text-on-surface' },
  { p: /\btext-slate-900\b/g, r: 'text-on-surface' },
  { p: /\btext-white\b/g, r: 'text-on-surface' }, // Most white text should be dynamic
  { p: /\btext-slate-50\b/g, r: 'text-on-surface' },
  
  // Backgrounds
  { p: /\bbg-\[\#0d0d14\]\b/g, r: 'bg-surface-container-low' }, // Sidebar
  { p: /\bbg-\[\#0e0d15\]\b/g, r: 'bg-surface-container-lowest' }, // Code blocks
  { p: /\bbg-\[\#1b1b23\]\b/g, r: 'bg-surface-container-high' },
  { p: /\bbg-\[\#04040a\]\b/g, r: 'bg-surface-container' }, // Footer
  { p: /\bbg-slate-900\b/g, r: 'bg-surface-container' },
  { p: /\bbg-slate-950\b/g, r: 'bg-surface-container-lowest' },
  
  // Borders
  { p: /\bborder-slate-800\/50\b/g, r: 'border-outline-variant/20' },
  { p: /\bborder-slate-900\b/g, r: 'border-outline-variant/10' },
  { p: /\bborder-slate-200\/50\b/g, r: 'border-outline-variant/20' },
  
  // Specific fixes for buttons that should stay colored but text should be on-primary if background is primary
  // (Assuming primary is a dark color in light mode but light in dark mode)
  // Actually text-on-primary is better.
  { p: /\bbg-primary\s+text-white\b/g, r: 'bg-primary text-on-primary' },
  { p: /\bbg-red-600\s+text-on-surface\b/g, r: 'bg-error text-on-error' },
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
    console.log(`Updated ${filePath}`);
    changedCount++;
  }
});

console.log(`Global fix complete. Updated ${changedCount} files.`);
