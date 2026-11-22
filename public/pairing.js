// Only the reviewed public request is shared. Private onboarding and AI drafts stay local.
const pairingKey='coffeebean-pair-'+(expertView?'mentor':'user');
let pairing=null,pairRevision=0,pairBaseline='',pairWorking=false,pairScheduled=false,pairLinks=[],pairError='';
try{pairing=JSON.parse(localStorage.getItem(pairingKey)||'null')}catch{}
if(pairing){pairRevision=pairing.revision||0;pairBaseline=pairing.baseline||'';pairLinks=pairing.links||[]}
function rememberPair(){if(pairing){pairing.revision=pairRevision;pairing.baseline=pairBaseline;pairing.links=pairLinks;localStorage.setItem(pairingKey,JSON.stringify(pairing))}}
if(typeof location!=='undefined'&&typeof URLSearchParams!=='undefined'){
 const query=new URLSearchParams(location.search);
 if(query.get('session')&&query.get('token')){
  pairing={id:query.get('session'),token:query.get('token')};pairRevision=0;pairBaseline='';pairLinks=[];localStorage.setItem(pairingKey,JSON.stringify(pairing));
  history.replaceState(null,'',location.pathname);
 }
}
const syncSnapshot=()=>({request:state.request,overrides:expertView?state.overrides:undefined,...(!expertView&&typeof sharedCommunityRooms==='function'?{communityRooms:sharedCommunityRooms(),hostReceipts:state.hostReceipts||{}}:{}),[expertView?'mentorZone':'userZone']:state[expertView?'mentorZone':'userZone']});
const syncSignature=()=>JSON.stringify(syncSnapshot());
async function pairCall(method,body,suffix=''){
 let r;try{r=await fetch('/api/pair/'+pairing.id+suffix,{method,signal:AbortSignal.timeout(suffix==='/host-topic'?90000:30000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+pairing.token},...(body?{body:JSON.stringify(body)}:{})})}catch{throw Error('서버에 잠시 연결되지 않았어요. PC 서버와 Wi-Fi를 확인해 주세요. 자동으로 다시 연결합니다.')}
 const d=await r.json();if(!r.ok){if(r.status===409){const pending=!expertView&&!d.request&&state.request?.status==='pending'?structuredClone(state.request):null;applyPair(d);if(pending){state.request=pending;showRequest();render()}}throw Error(d.error||'연결을 확인해 주세요.')}return d;
}
function applyPair(data){
 const previous=state.request?.status,screen=state.screen;
 state.request=data.request;state.overrides=data.overrides||{};state.userZone=data.userZone;state.mentorZone=data.mentorZone;
 if(state.request)state.selected=state.request.mentorId;
 if(!expertView&&['waiting','booking','live'].includes(screen)&&previous!==state.request?.status)showRequest();
 if(expertView&&screen==='manager')state.screen='manager';
 pairRevision=data.revision;pairBaseline=syncSignature();pairError='';
 if(expertView){state.remoteCommunityRooms=data.communityRooms||[];state.remoteHostReceipts=data.hostReceipts||{}}
 if(typeof receiveHostTopic==='function')for(const item of data.hostTopics||(data.hostTopic?[data.hostTopic]:[]))receiveHostTopic(item);
 rememberPair();
 const draft=$('#message')?.value;
 render();if(draft&&$('#message'))$('#message').value=draft;
}
async function flushPair(){
 pairScheduled=false;if(!pairing||pairWorking||!pairBaseline||busy)return;
 const snapshot=syncSnapshot(),signature=JSON.stringify(snapshot);if(signature===pairBaseline)return;
 pairWorking=true;
 try{const d=await pairCall('PUT',{revision:pairRevision,...snapshot});pairRevision=d.revision;pairBaseline=signature;pairError='';rememberPair();render()}
 catch(e){pairError=e.message;toast(e.message)}
 finally{pairWorking=false}
}
function queuePair(){if(!pairing||pairScheduled)return;pairScheduled=true;setTimeout(flushPair,200)}
const beforePairRender=render,beforePairContent=content;
content=function(){
 if(state.screen==='pairing')return `<div class="card"><h3>휴대폰으로 실무자 관리</h3><p>신청한 기기에서 링크를 만들거나 다시 확인하고, 실무자 역할을 할 휴대폰에서 그 링크를 열어 주세요. 휴대폰에서 별도로 새 링크를 만들면 PC의 신청과 연결되지 않습니다. PC와 휴대폰은 같은 Wi-Fi에 연결해 주세요.</p><div class="notice">${pairing?'기기 연결 활성화 · 마지막 사용 후 7일 유지':'아직 연결하지 않았습니다.'}</div>${pairError?`<p role="alert">${escape(pairError)}</p>`:''}${!expertView?button(pairing?'기존 실무자 링크 다시 보기':'실무자 연결 링크 만들기','createpair'):''}${pairLinks.map(url=>`<div class="profile-line"><strong>휴대폰에서 열 주소</strong><textarea readonly aria-label="실무자 전용 연결 주소">${escape(url)}</textarea><a href="${escape(url)}" target="_blank" rel="noreferrer">실무자 페이지 열기</a></div>`).join('')}<p>이 링크를 가진 사람은 실무자로 제어할 수 있습니다. 시연 담당자에게만 전달하세요. 공유되는 정보는 전송을 확인한 공개 프로필·질문·대화와 일정입니다. AI 전용 프로필·온보딩 원문·코파일럿 초안은 공유하지 않습니다.</p>${pairing?button('기기 연결 해제','disconnectpair','secondary'):''}${button(expertView?'실무자 관리로':'내 설정으로',expertView?'manager':'settings','secondary')}<p>모바일 데이터나 다른 Wi-Fi에서는 공개 배포가 필요합니다. PC 방화벽이 묻는 경우 신뢰하는 개인 네트워크만 허용하세요.</p></div>`;
 const html=beforePairContent();const delivery=state.screen==='waiting'&&!expertView?`<div class="card"><strong>${!pairing?'아직 휴대폰 실무자와 연결하지 않았어요':pairError?'전송 재시도 중':syncSignature()!==pairBaseline?'실무자에게 전송 중…':'실무자 조회용 서버에 저장됐어요'}</strong><p>${pairing?'휴대폰에서는 아래의 전용 연결 링크를 열어 주세요. 일반 /mentor 주소만 열면 이 요청과 연결되지 않습니다.':'요청은 이 PC에 보관 중입니다. 전용 링크를 만들고 휴대폰에서 열면 전달됩니다.'}</p>${button('실무자 연결 링크 확인','pairing','secondary')}</div>`:'';return delivery+html+(['settings','manager'].includes(state.screen)?`<div class="card">${!pairing&&expertView?'<p>연결되지 않은 관리 화면입니다. PC에서 만든 실무자 전용 링크로 들어와 주세요.</p>':''}${button(expertView?'기기 연결 상태':'휴대폰 실무자 연결','pairing','secondary')}${pairing?'<small>기기 간 연결됨 · 2초 간격 반영</small>':''}</div>`:'');
};
render=function(){beforePairRender();queuePair()};
document.addEventListener('input',queuePair);document.addEventListener('change',queuePair);
document.addEventListener('click',async e=>{
 const el=e.target.closest('[data-action]');if(!el||el.disabled||busy)return;const a=el.dataset.action;
 if(a==='pairing'){state.screen='pairing';render()}
 if(a==='createpair'&&!expertView){
  if(state.request&&state.request.status!=='pending'&&!pairing)return toast('이 브라우저에는 신청 연결 정보가 없어요. 신청했던 PC에서 기존 실무자 링크를 확인해 휴대폰으로 열어 주세요. 커피챗을 종료할 필요는 없어요.');
  await task(async()=>{
   const infoResponse=await fetch('/api/pair-info');if(!infoResponse.ok)throw Error('이 연결 기능은 npm run dev 로 실행한 PC 서버에서 사용할 수 있습니다.');const info=await infoResponse.json();
   if(!info.origins?.length)throw Error('PC의 Wi-Fi 주소를 찾지 못했습니다. 네트워크 연결을 확인해 주세요.');
   if(pairing){const invite=await pairCall('GET',undefined,'/invite');pairing.mentorToken=invite.mentorToken;pairLinks=info.origins.map(origin=>origin+'/mentor?session='+pairing.id+'&token='+invite.mentorToken);rememberPair();return}
   const r=await fetch('/api/pair',{method:'POST'});const d=await r.json();if(!r.ok)throw Error(d.error);
   pairing={id:d.id,token:d.userToken,mentorToken:d.mentorToken};pairRevision=0;localStorage.setItem(pairingKey,JSON.stringify(pairing));
   pairLinks=info.origins.map(origin=>origin+'/mentor?session='+d.id+'&token='+d.mentorToken);
   const saved=await pairCall('PUT',{revision:0,...syncSnapshot()});pairRevision=saved.revision;pairBaseline=syncSignature();pairError='';rememberPair();
  });
 }
 if(a==='disconnectpair'){
  if(!expertView&&pairing){try{await pairCall('DELETE')}catch{}}
  pairing=null;pairBaseline='';pairLinks=[];localStorage.removeItem(pairingKey);render();
 }
});
async function pollPair(){
 if(!pairing||pairWorking||busy)return;
 if(pairBaseline&&syncSignature()!==pairBaseline){await flushPair();return}
 pairWorking=true;
 try{const d=await pairCall('GET');if(!pairBaseline||d.revision!==pairRevision){const pending=!expertView&&!d.request&&state.request?.status==='pending'?structuredClone(state.request):null;applyPair(d);if(pending){state.request=pending;showRequest();render()}}}catch(e){if(pairError!==e.message){pairError=e.message;toast(e.message)}}finally{pairWorking=false}
}
setInterval(pollPair,2000);if(pairing)pollPair();render();
