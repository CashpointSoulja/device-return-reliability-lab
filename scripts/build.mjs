import {cp, mkdir, rm} from 'node:fs/promises';
await rm('dist', {recursive:true, force:true});
await mkdir('dist/modules', {recursive:true});
await cp('public', 'dist', {recursive:true});
for (const name of ['domain.js','scenarios.js']) await cp(`src/${name}`, `dist/modules/${name}`);
console.log('Built static UI and shared deterministic domain/scenario modules.');
