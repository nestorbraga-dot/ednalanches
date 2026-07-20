const fs = require('fs');
const path = require('path');
const text = fs.readFileSync(path.join(__dirname, 'src', 'App.tsx'), 'utf8');
const lines = text.split(/\r?\n/);
let paren = 0;
let brace = 0;
let angle = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const ch = line[j];
    if (ch === '(') paren++;
    else if (ch === ')') paren--;
    else if (ch === '{') brace++;
    else if (ch === '}') brace--;
    else if (ch === '<') angle++;
    else if (ch === '>') angle--;
  }
  if (paren < 0 || brace < 0 || angle < 0) {
    console.log('negative at', i+1, line);
    break;
  }
  if ([1186, 2243, 2569].includes(i+1)) {
    console.log('line', i+1, 'counts', {paren, brace, angle});
  }
}
console.log('final counts', {paren, brace, angle});
