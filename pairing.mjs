import {randomBytes} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
const personaCatalog=JSON.parse(fs.readFileSync(new URL('./data/mentors.json',import.meta.url),'utf8'));
const terminal=['completed','declined','expired','cancelled'];
const token=()=>randomBytes(24).toString('hex');
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const validZone=z=>{try{new Intl.DateTimeFormat('en',{timeZone:z});return typeof z==='string'}catch{return false}};
function validRequest(r){return r===null||r&&typeof r.id==='string'&&typeof r.mentorId==='string'&&typeof r.applicantName==='string'&&r.profile&&Object.entries(r.profile).every(([k,v])=>['situation','role','experience','concern','interests'].includes(k)&&typeof v==='string'&&v.length<=5000)&&Array.isArray(r.questions)&&r.questions.length<=30&&r.questions.every(q=>typeof q.question==='string'&&typeof q.reason==='string')&&Array.isArray(r.transcript)&&r.transcript.length<=500&&r.transcript.every(m=>['user','mentor'].includes(m.role)&&typeof m.text==='string'&&m.text.length<=4000)&&r.consent&&typeof r.consent.user==='boolean'&&typeof r.consent.mentor==='boolean'}
export function validateChange(old,next,role){
 if(next){const p=personaCatalog.find(m=>m.id===next.mentorId);if(p){if(!p.methods.includes(next.method)||(next.durationMinutes!==undefined&&next.durationMinutes!==p.durationMinutes))throw Error('이 페르소나의 진행 방식과 커피챗 시간은 고정되어 있습니다.')}else if(!(old&&old.id===next.id&&old.mentorId===next.mentorId))throw Error('등록된 페르소나를 선택해 주세요.')}
 if(!validRequest(next))throw Error('요청 형식을 확인해 주세요.');
 if(!old){if(next&&(role!=='user'||next.status!=='pending'||next.transcript.length))throw Error('구직자가 새 요청을 전송해야 합니다.');return}
 if(!next){if(role!=='user'||!terminal.includes(old.status))throw Error('진행 중인 요청은 지울 수 없습니다.');return}
 if(old.id!==next.id){if(role!=='user'||!terminal.includes(old.status)||next.status!=='pending'||next.transcript.length)throw Error('기존 요청을 먼저 종료해 주세요.');return}
 for(const k of ['mentorId','mentorName','applicantName','profile','questions','createdAt','durationMinutes','mentorSnapshot','schedulingMode'])if(!equal(old[k],next[k]))throw Error('전송한 요청 내용은 변경할 수 없습니다.');
 const moves={user:{pending:['cancelled','expired'],accepted:['confirmed','live','cancelled'],confirmed:['accepted','live','cancelled']},mentor:{pending:['accepted','live','declined'],accepted:['confirmed','live','cancelled'],confirmed:['accepted','live','cancelled'],live:['completed']}};
 if(old.status==='accepted'&&next.status==='live'&&old.schedulingMode!=='instant-demo')throw Error('Schedule confirmation required.');
 if(old.status==='pending'&&next.status==='live'&&old.schedulingMode!=='instant-demo')throw Error('Immediate chat requires a demo request.');
 if(old.status!==next.status&&!(moves[role][old.status]||[]).includes(next.status))throw Error('허용되지 않은 상태 변경입니다.');
 if(next.status==='expired'&&Date.now()-Date.parse(old.createdAt)<86400000)throw Error('아직 응답 대기 시간입니다.');
 const changed=['scheduledAt','method','proposedBy'].some(k=>old[k]!==next[k]);
 if(changed&&(!['accepted','confirmed'].includes(old.status)||next.status!=='accepted'||next.proposedBy!==role||!['텍스트','음성','영상'].includes(next.method)||!(Date.parse(next.scheduledAt)>Date.now())))throw Error('유효한 미래 일정을 제안해 주세요.');
 if(old.status==='accepted'&&next.status==='confirmed'&&(!old.proposedBy||old.proposedBy===role))throw Error('상대방이 일정을 확인해야 합니다.');
 if(next.demoClock!==old.demoClock&&role!=='mentor')throw Error('예약 시간은 실무자 화면에서만 제어할 수 있습니다.');
 if(old.status==='confirmed'&&next.status==='live'&&old.schedulingMode!=='instant-demo'&&!(Date.now()>=Date.parse(old.scheduledAt)||old.demoClock))throw Error('예약 시간 전입니다.');
 const other=role==='user'?'mentor':'user';if(next.consent[other]!==old.consent[other])throw Error('상대방 동의를 변경할 수 없습니다.');
 if(!equal(next.transcript,old.transcript)){
  if(old.status!=='live'||next.status!=='live'||next.transcript.length!==old.transcript.length+1||!equal(next.transcript.slice(0,-1),old.transcript)||next.transcript.at(-1).role!==role)throw Error('진행 중인 대화에 본인 메시지만 전송할 수 있습니다.');
 }
}
export function createPairingService(networkOrigins,{storagePath=null,now=Date.now,ttlMs=7*86400000,generateTopic=null}={}){
 const sessions=new Map(storagePath&&fs.existsSync(storagePath)?JSON.parse(fs.readFileSync(storagePath,'utf8')):[]);
 for(const s of sessions.values())for(const o of Object.values(s.data?.overrides||{})){delete o.methods;delete o.durationMinutes}
 const persist=()=>{if(!storagePath)return;fs.mkdirSync(path.dirname(storagePath),{recursive:true});const temp=storagePath+'.tmp';fs.writeFileSync(temp,JSON.stringify([...sessions]),{mode:0o600});fs.renameSync(temp,storagePath)};
 const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
 const clean=()=>{let changed=false;for(const [id,s] of sessions)if(now()>s.expires){sessions.delete(id);changed=true}if(changed)persist()};
 return async request=>{
  const u=new URL(request.url);if(!u.pathname.startsWith('/api/pair'))return null;
  clean();if(request.headers.get('Origin')&&request.headers.get('Origin')!==u.origin)return json({error:'다른 사이트에서는 제어할 수 없습니다.'},403);
  if(u.pathname==='/api/pair-info')return json({available:true,origins:networkOrigins()});
  if(u.pathname==='/api/pair'&&request.method==='POST'){
   if(sessions.size>=100)return json({error:'활성 연결이 너무 많습니다. 서버를 확인해 주세요.'},429);
   const id=token(),user=token(),mentor=token();sessions.set(id,{user,mentor,expires:now()+ttlMs,lastSaved:now(),revision:0,data:{request:null,overrides:{},userZone:'Asia/Seoul',mentorZone:'America/Los_Angeles'}});persist();return json({id,userToken:user,mentorToken:mentor,revision:0});
  }
  const id=u.pathname.split('/')[3],s=sessions.get(id);if(!s)return json({error:'7일 동안 사용하지 않았거나 해제된 연결입니다. PC에서 새 연결 링크를 만들어 주세요.'},404);
  const key=request.headers.get('Authorization')?.replace(/^Bearer /,'');const role=key===s.user?'user':key===s.mentor?'mentor':null;if(!role)return json({error:'연결 권한이 없습니다.'},403);
  s.expires=now()+ttlMs;
  if(now()-(s.lastSaved||0)>=60000){s.lastSaved=now();persist()}
  if(u.pathname.endsWith('/invite'))return request.method==='GET'&&role==='user'?json({mentorToken:s.mentor}):json({error:'신청한 기기에서만 실무자 링크를 확인할 수 있습니다.'},403);
  if(u.pathname.endsWith('/host-topic')){
   if(role!=='mentor'||request.method!=='POST')return json({error:'실무자 관리자만 화두를 요청할 수 있습니다.'},403);
   if(!generateTopic)return json({error:'이 서버에서는 화두 게시를 사용할 수 없습니다.'},503);
   try{const raw=await request.text();if(raw.length>1000)return json({error:'채팅방 선택을 확인해 주세요.'},413);const body=JSON.parse(raw);const room=(s.data.communityRooms||[]).find(r=>r.id===body.roomId);if(!room)return json({error:'연결된 구직자가 참여한 채팅방을 선택해 주세요.'},400);
    if(!room.enabled)return json({error:'이 방의 호스트 또는 뉴스 활용 동의가 꺼져 있습니다. 구직자 화면에서 설정해 주세요.'},422);
    const result=await generateTopic(room.topic);if(!result.available)return json({error:result.message||'관련 최신 소식이 없습니다.'},503);
    s.data.hostTopic={id:token(),roomId:room.id,roomTitle:room.title,topic:room.topic,result,createdAt:new Date(now()).toISOString()};s.data.hostTopics=[...(s.data.hostTopics||[]),s.data.hostTopic].slice(-20);s.revision++;persist();return json({hostTopic:s.data.hostTopic});
   }catch{return json({error:'화두를 가져오지 못했습니다. 잠시 뒤 다시 시도해 주세요.'},503)}
  }
  if(request.method==='GET')return json({revision:s.revision,...s.data});
  if(request.method==='DELETE'&&role==='user'){sessions.delete(id);persist();return json({ok:true})}
  if(request.method!=='PUT')return json({error:'지원하지 않는 요청입니다.'},405);
  try{
   const raw=await request.text();if(raw.length>1500000)return json({error:'공유 데이터가 너무 큽니다.'},413);const body=JSON.parse(raw);
   if(body.revision!==s.revision)return json({error:'다른 기기의 변경 사항을 먼저 반영했습니다. 다시 시도해 주세요.',revision:s.revision,...s.data},409);
   validateChange(s.data.request,body.request,role);
   const zone=role==='user'?'userZone':'mentorZone';if(!validZone(body[zone]))throw Error('시간대를 확인해 주세요.');
   if(role==='user'&&body.communityRooms!==undefined){
    if(!Array.isArray(body.communityRooms)||body.communityRooms.length>50||body.communityRooms.some(r=>!r||typeof r.id!=='string'||r.id.length>1000||typeof r.title!=='string'||r.title.length>300||typeof r.topic!=='string'||r.topic.length>120||typeof r.enabled!=='boolean'))throw Error('참여방 정보를 확인해 주세요.');
    s.data.communityRooms=body.communityRooms.map(({id,title,topic,enabled})=>({id,title,topic,enabled}));
   }
   if(role==='user'&&body.hostReceipts){s.data.hostReceipts=Object.fromEntries((s.data.hostTopics||[]).filter(t=>['posted','blocked'].includes(body.hostReceipts[t.id]?.status)).map(t=>[t.id,{status:body.hostReceipts[t.id].status,reason:String(body.hostReceipts[t.id].reason||'').slice(0,200)}]))}
   if(role==='mentor'){
    if(!body.overrides||Object.values(body.overrides).some(m=>!m||typeof m!=='object'))throw Error('실무자 정보를 확인해 주세요.');
    s.data.overrides=Object.fromEntries(Object.entries(body.overrides).map(([id,values])=>{const {methods,durationMinutes,...editable}=values;return [id,editable]}));
   }
   s.data.request=body.request;s.data[zone]=body[zone];s.revision++;persist();return json({revision:s.revision,...s.data});
  }catch(e){return json({error:e.message||'변경 내용을 확인해 주세요.'},400)}
 };
}
