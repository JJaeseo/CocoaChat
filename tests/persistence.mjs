import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createPairingService} from '../pairing.mjs';
fs.mkdirSync('.local-data',{recursive:true});
const dir=fs.mkdtempSync(path.resolve('.local-data/test-')),storagePath=path.join(dir,'pairing.json');let clock=Date.now();
const options={storagePath,now:()=>clock};let service=createPairingService(()=>[],options);
const call=(p,method='GET',key)=>service(new Request('http://test.local'+p,{method,headers:key?{Authorization:'Bearer '+key}:{}}));
try{
 const d=await (await call('/api/pair','POST')).json(),url='/api/pair/'+d.id;
 service=createPairingService(()=>[],options);assert.equal((await call(url,'GET',d.mentorToken)).status,200,'restart restores token');
 clock+=6*86400000;assert.equal((await call(url,'GET',d.mentorToken)).status,200);
 service=createPairingService(()=>[],options);clock+=6*86400000;assert.equal((await call(url,'GET',d.userToken)).status,200,'activity renews persisted expiry');
 clock+=8*86400000;assert.equal((await call(url,'GET',d.userToken)).status,404,'inactive link expires');
 const fresh=await (await call('/api/pair','POST')).json();await call('/api/pair/'+fresh.id,'DELETE',fresh.userToken);service=createPairingService(()=>[],options);assert.equal((await call('/api/pair/'+fresh.id,'GET',fresh.mentorToken)).status,404,'revocation survives restart');
 console.log('PASS persistence: restart, rolling seven-day expiry, inactivity expiration, persistent revocation.');
}finally{for(const p of [storagePath,storagePath+'.tmp'])if(fs.existsSync(p))fs.unlinkSync(p);fs.rmdirSync(dir)}
