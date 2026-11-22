import fs from 'node:fs';
export function hostedSource(){
 let s=fs.readFileSync('pairing.mjs','utf8').replace(/^import .*;\r?\n/gm,'').replace(/^const personaCatalog=.*;\r?\n/m,'').replaceAll('export function','function');
 s=s.replace("const token=()=>randomBytes(24).toString('hex');","const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(24)),v=>v.toString(16).padStart(2,'0')).join('');");
 s=s.replace('generateTopic=null}={})','generateTopic=null,initialSessions=[],onPersist=null}={})');
 s=s.replace(/const sessions=new Map\([^\n]+/,'const sessions=new Map(initialSessions);');
 s=s.replace(/const persist=\(\)=>\{[^\n]+/,'const persist=async()=>{if(onPersist)await onPersist(sessions)};');
 s=s.replaceAll('persist();','await persist();').replaceAll('if(changed)persist()','if(changed)await persist()').replace('const clean=()=>','const clean=async()=>').replace('  clean();','  await clean();');
 return s;
}
