import {readFile,writeFile} from 'node:fs/promises';
const source=await readFile(new URL('../src/weather-station-card.js',import.meta.url));
const target=new URL('../dist/weather-station-card.js',import.meta.url);
if(process.argv.includes('--check')){
  if(!source.equals(await readFile(target)))throw new Error('dist bundle is stale; run npm run build');
  console.log('Source and HACS bundle match.');
}else await writeFile(target,source);
