import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
import worker from '../worker/index.js';import {createPairingService} from '../pairing.mjs';
const service=createPairingService(()=>['http://192.168.1.2:4173']);
const request=(p,o)=>new Request('http://test.local'+p,o);
let failUpload=false;const fetcher=async(p,o)=>{if(failUpload&&p.startsWith('/api/pair/')&&o?.method==='PUT')throw Error('Simulated network interruption');return await service(request(p,o))||worker.fetch(request(p,o))};
const pair=await (await fetcher('/api/pair',{method:'POST'})).json();
async function device(expert){
 const nodes=new Map(),events={};const node=s=>{if(!nodes.has(s))nodes.set(s,{innerHTML:'',value:'',classList:{add(){},remove(){}},focus(){}});return nodes.get(s)};
 const context={document:{querySelector:node,querySelectorAll:()=>[],addEventListener:(t,f)=>(events[t]??=[]).push(f)},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},console,Date,Intl,structuredClone,AbortSignal,confirm:()=>true,setInterval(){},setTimeout(){},location:{pathname:expert?'/mentor':'/'},fetch:fetcher};context.window={addEventListener(){}};
 const ctx=vm.createContext(context);vm.runInContext(['main','phone','pairing'].map(f=>fs.readFileSync('public/'+f+'.js','utf8')).join('\n'),ctx);await new Promise(r=>setImmediate(r));
 const run=s=>vm.runInContext(s,ctx);run(`pairing=${JSON.stringify({id:pair.id,token:expert?pair.mentorToken:pair.userToken})}`);await run('pollPair()');
 return {run,node,click:async a=>{for(const f of events.click)await f({target:{closest:()=>({dataset:{action:a}})}})}};
}
const user=await device(false),mentor=await device(true);
user.run("state.name='테스트 지원자';state.profile={situation:'성균관대 컴퓨터교육과 재학중입니다',role:'인프라 엔지니어를 희망합니다',experience:'관련 경험·활동 없음',concern:'업무 강도가 궁금해',interests:'비공개 관심사'};state.selected='persona-olivia-lee';state.questions=[{question:'어떤 일을 하시나요?',reason:'업무를 알고 싶음.'}];state.screen='questions';render()");
await user.click('review');assert.equal(user.run('state.screen'),'review');assert.ok(user.node('#app').innerHTML.includes('정리된 소개 수정하기'));
user.run("state.requestSummary.role='인프라 분야를 희망함.'");await user.click('request');failUpload=true;await user.run('flushPair()');assert.equal(user.run('state.request.status'),'pending','failed send must retain local request');failUpload=false;user.run("pairBaseline=''");await user.run('pollPair()');assert.equal(user.run('state.request.status'),'pending','empty remote cannot overwrite unsent request');assert.equal(user.run('state.screen'),'waiting');await user.run('flushPair()');await mentor.run('pollPair()');
assert.equal(mentor.run('state.request.applicantName'),'테스트 지원자');assert.equal(mentor.run('state.request.profile.role'),'인프라 분야를 희망함.');assert.equal(mentor.run('state.request.profile.interests'),undefined);assert.ok(mentor.node('#app').innerHTML.includes('테스트 지원자'));assert.ok(!mentor.node('#app').innerHTML.includes('비공개 관심사'));
await mentor.click('accept');await mentor.run('flushPair()');await user.run('pollPair()');assert.equal(user.run('state.request.status'),'live');assert.equal(user.run('state.screen'),'live');
console.log('PASS two devices: applicant review/edit/send, private field excluded, mentor receives and accepts, applicant updates to booking.');

assert.equal(user.run('state.request.scheduledAt'),null);assert.ok(!user.node('#app').innerHTML.includes('datetime-local'));console.log('PASS immediate coffee chat without scheduling.');
