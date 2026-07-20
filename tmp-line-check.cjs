const fs = require('fs');
const path = require('path');
const lines = fs.readFileSync(path.join(__dirname, 'src', 'App.tsx'), 'utf8').split(/\r?\n/);
for (const idx of [2218, 2219, 2518, 2519, 2528]) {
  console.log(`LINE ${idx+1}: ${JSON.stringify(lines[idx])}`);
}
