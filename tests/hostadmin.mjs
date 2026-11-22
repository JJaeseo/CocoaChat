import assert from 'node:assert/strict';import {createPairingService} from '../pairing.mjs';
let calls=0;const service=createPairingService(()=>[],{generateTopic:async topic=>{calls++;return {available:true,article:{title:topic+' 소식',url:'https://news.google.com/rss/articles/test',source:'테스트 매체',publishedAt:new Date().toISOString()},question:'어떤 생각이 드나요?'}}});
const call=(p,method='GET',key,body)=>service(new Request('http://test.local'+p,{method,headers:key?{Authorization:'Bearer '+key}:{},...(body?{body:JSON.stringify(body)}:{})}));
const pair=await (await call('/api/pair','POST')).json(),p='/api/pair/'+pair.id;
assert.equal((await call(p+'/host-topic','POST',pair.userToken,{topic:'축구',consent:true})).status,403);
assert.equal((await call(p+'/host-topic','POST',pair.mentorToken,{topic:'축구',consent:false})).status,400);
const seed=await call(p,'PUT',pair.userToken,{revision:0,request:null,userZone:'Asia/Seoul',communityRooms:[{id:'football',title:'축구 좋아하는 사람들',topic:'축구',enabled:true},{id:'off',title:'꺼진 방',topic:'독서',enabled:false}]});assert.equal(seed.status,200);
assert.equal((await call(p+'/host-topic','POST',pair.mentorToken,{roomId:'off',consent:true})).status,422);
assert.equal((await call(p+'/host-topic','POST',pair.mentorToken,{roomId:'missing',consent:true})).status,400);
const d=await (await call(p+'/host-topic','POST',pair.mentorToken,{roomId:'football',topic:'무시할 주제',consent:true})).json();assert.equal(d.hostTopic.topic,'축구');assert.equal(calls,1);
const applicant=await (await call(p,'GET',pair.userToken)).json();assert.equal(applicant.hostTopic.id,d.hostTopic.id);assert.equal(applicant.request,null);assert.equal(applicant.revision,2);
console.log('PASS host admin: mentor-only generation, consent validation, cross-device topic delivery, request unaffected.');

assert.equal(d.hostTopic.roomId,'football');
const ack=await call(p,'PUT',pair.userToken,{revision:2,request:null,userZone:'Asia/Seoul',hostReceipts:{[d.hostTopic.id]:{status:'posted',reason:''}}});assert.equal(ack.status,200);
assert.equal((await (await call(p,'GET',pair.mentorToken)).json()).hostReceipts[d.hostTopic.id].status,'posted');
