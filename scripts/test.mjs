import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
// Execute each test file directly so individual invariant results remain visible.
for (const file of (await readdir('tests')).filter(f=>f.endsWith('.test.js')).sort()) {
  const child=spawnSync(process.execPath,[`tests/${file}`],{stdio:'inherit'});
  if (child.error) throw child.error;
  if (child.status!==0) process.exit(child.status || 1);
}
