import {spawn,spawnSync} from 'node:child_process';
import {watch} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
let server,timer,rebuilding=false,again=false,closing=false;
const watchers=[];
function stopServer(){return new Promise(resolve=>{if(!server||server.exitCode!==null)return resolve();server.once('exit',resolve);server.kill();})}
async function rebuild(){
 if(closing)return;
 if(rebuilding){again=true;return;}
 rebuilding=true;
 await stopServer();
 const build=spawnSync(process.execPath,['scripts/compile.mjs'],{stdio:'inherit'});
 if(build.status===0&&!closing){
  server=spawn(process.execPath,['server.mjs'],{stdio:'inherit',env:process.env});
  server.on('error',()=>console.error('Could not start the development server.'));
 }else if(build.status!==0)console.error('Build failed. Fix the file and save to retry.');
 rebuilding=false;
 if(again){again=false;await rebuild();}
}
function changed(){clearTimeout(timer);timer=setTimeout(()=>{console.log('Source changed. Rebuilding and restarting...');void rebuild();},180)}
for(const folder of ['public','data','prompts'])watchers.push(watch(folder,changed));
for(const file of ['worker/api.js','worker/onboarding.js','worker/summary.js','worker/community.js','pairing.mjs','network.mjs','server.mjs','scripts/compile.mjs'])watchers.push(watch(file,changed));
console.log('CocoaChat development mode. Save source files to restart; refresh the browser to see changes.');
await rebuild();
async function cleanup(){if(closing)return;closing=true;clearTimeout(timer);watchers.forEach(w=>w.close());await stopServer();process.exit(0)}
process.on('SIGINT',cleanup);process.on('SIGTERM',cleanup);
