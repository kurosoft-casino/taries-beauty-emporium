#!/usr/bin/env node
// Copies the Next.js static export from ../../taries-beauty-emporium/out into ./web for bundling
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', '..', 'out');
const dest = path.join(__dirname, '..', 'web');

if (!fs.existsSync(src)) {
  console.error('Source build not found at', src);
  console.error('Run "npm run build:web" in desktop-app first.');
  process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });

function copy(s, d) {
  const stat = fs.statSync(s);
  if (stat.isDirectory()) {
    fs.mkdirSync(d, { recursive: true });
    for (const entry of fs.readdirSync(s)) copy(path.join(s, entry), path.join(d, entry));
  } else {
    fs.copyFileSync(s, d);
  }
}

copy(src, dest);
console.log('Copied web export ->', dest);
