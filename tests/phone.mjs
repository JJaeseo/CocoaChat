import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import worker from '../worker/index.js';
const blank=()=>({situation:'',role:'',experience:'',concern:'',interests:''});
async function answer(text, profile=blank(), asked='situation',completed=[]){
 const r=await worker.fetch(new Request('https://test.local/api/assistant',{method:'POST',body:JSON.stringify({task:'onboard',profile,asked,completed,messages:[{role:'user',text}]})}));
 assert.equal(r.status,200);return r.json();
}
for(const [text,expected] of [['나는 성균관대학교 컴퓨터교육과를 나왔어','성균관대학교 · 컴퓨터교육과 · 졸업'],['성균관대학교 컴퓨터교육과','성균관대학교 · 컴퓨터교육과'],['성균관대 컴퓨터교육과 재학중입니다','성균관대학교 · 컴퓨터교육과 · 재학']]){
 const d=await answer(text);assert.equal(d.profile.situation,expected);assert.equal(d.nextField,'role');assert.equal(d.ready,false);
}
let d=await answer('성균관대 컴퓨터교육과');d=await answer('교육 서비스 기획',d.profile,'role',d.completed);assert.equal(d.nextField,'experience');d=await answer('딱히 없어요',d.profile,'experience',d.completed);assert.equal(d.profile.experience,'관련 경험·활동 없음');assert.equal(d.nextField,'concern');d=await answer('건너뛸게요',d.profile,'concern',d.completed);assert.equal(d.ready,false);assert.equal(d.nextField,'interests');d=await answer('없어요',d.profile,'interests',d.completed);assert.equal(d.ready,true);
const nodes=new Map();const node=s=>{if(!nodes.has(s))nodes.set(s,{innerHTML:'',value:'',classList:{add(){},remove(){}},focus(){}});return nodes.get(s)};
const listeners={};const context={document:{querySelector:node,querySelectorAll:()=>[],addEventListener:(k,f)=>(listeners[k]??=[]).push(f)},localStorage:{getItem:()=>null,setItem(){}},console,Date,Intl,structuredClone,confirm:()=>true,setTimeout(){},setInterval(){},location:{pathname:'/'},fetch:(p,o)=>worker.fetch(new Request('https://test.local'+p,o))};
context.window={addEventListener(){}};const ctx=vm.createContext(context);
vm.runInContext(fs.readFileSync('public/main.js','utf8')+'\n'+fs.readFileSync('public/phone.js','utf8'),ctx);await new Promise(r=>setImmediate(r));
assert.ok(node('#app').innerHTML.includes('친구 1'));assert.ok(!node('#app').innerHTML.includes('시연 컨트롤'));assert.ok(!node('#app').innerHTML.includes('class="left"'));
vm.runInContext("state.screen='onboard';render()",ctx);assert.ok(node('#app').innerHTML.includes('학교와 전공'));assert.ok(!node('#app').innerHTML.includes('textarea data-field'));
await vm.runInContext("send('성균관대 컴퓨터교육과 재학중입니다')",ctx);assert.equal(vm.runInContext('state.asked',ctx),'role');assert.ok(node('#app').innerHTML.includes('어떤 직무'));
assert.equal((await worker.fetch(new Request('https://test.local/mentor'))).status,200);
console.log('PASS phone: first friend, applicant shell, sequential conversation, school normalization, skip, mentor route.');
