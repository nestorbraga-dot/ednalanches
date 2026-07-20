const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'src', 'App.tsx');
const source = fs.readFileSync(filePath, 'utf8');
const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const diagnostics = ts.getPreEmitDiagnostics(sourceFile);
if (diagnostics.length === 0) {
  console.log('no diagnostics');
  process.exit(0);
}
for (const diag of diagnostics) {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(diag.start || 0);
  console.log(`${filePath}:${line+1}:${character+1} - ${ts.flattenDiagnosticMessageText(diag.messageText, '\n')}`);
  const lines = source.split(/\r?\n/);
  const start = Math.max(0, line-3);
  const end = Math.min(lines.length-1, line+3);
  for (let i = start; i <= end; i++) {
    console.log(`${i+1}: ${lines[i]}`);
  }
  console.log('---');
}
