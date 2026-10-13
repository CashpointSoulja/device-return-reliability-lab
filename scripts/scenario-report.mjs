import {mkdir, writeFile} from 'node:fs/promises';
import {runScenarios} from '../src/scenarios.js';
const report=runScenarios();
await mkdir('docs/results',{recursive:true});
await writeFile('docs/results/scenarios.json',JSON.stringify(report,null,2)+'\n');
console.log(`${report.passed}/${report.total} scenarios passed; ${report.assertionCount} executed assertions; ${report.failed} failed.`);
process.exitCode=report.failed?1:0;
