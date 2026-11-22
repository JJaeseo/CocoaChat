const hostInFlight=new Set(),hostRetries=new Map();
function scheduledSlot(date=new Date()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:state.userZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));
 const hours=state.hostFrequency==='low'?[21]:[12,18,21];
 if(!hours.includes(+parts.hour)||+parts.minute>14)return null;
 return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:00@${state.userZone}`;
}
hostTick=async function(){
 if(state.hostFrequency==='off')return;
 const slot=scheduledSlot();if(!slot)return;
 for(const index of state.joined){
  const r=rooms()[index];if(!r)continue;const key=slot+'|'+r.common,now=Date.now();const messages=state.roomMessages[index]||[];
  if(messages.some(m=>m.scheduleKey===key)||hostInFlight.has(key)||now-(hostRetries.get(key)||0)<60000)continue;
  if(messages.filter(m=>m.role==='user'&&now-m.at<120000).length>=3)continue;
  hostInFlight.add(key);hostRetries.set(key,now);
  try{
   const response=await fetch('/api/community-topic',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic:r.common.slice(0,120),consent:true})});const d=await response.json();
   if(state.hostFrequency==='off')continue;
   if(!response.ok||!d.available){state.hostNewsStatus=d.message||'최신 소식을 확인하지 못했어요.';save();continue}
   (state.roomMessages[index]??=[]).push({role:'host',text:d.message||`${d.article.title}\n\n${d.question}`,article:d.article,at:now,scheduleKey:key});state.hostNewsStatus='';save();if(state.screen==='room'&&state.room===index)render();
  }catch{state.hostNewsStatus='연결을 확인하고 최신 소식을 다시 가져올게요.';save()}finally{hostInFlight.delete(key)}
 }
};
room=function(){
 const r=rooms()[state.room];if(!r)return '<div class="card">관심사 추천 동의를 확인해 주세요.</div>'+button('추천 목록','communities');
 return `<details class="card host-settings"><summary>AI 호스트 · 정시 소식 설정</summary><span class="tag">AI 커뮤니티 호스트</span><h3>${escape(r.title)}</h3><p>관심사와 관련한 최신 뉴스 제목을 함께 보고 이야기해요.</p><label>소식 받는 시간 · ${escape(state.userZone)}</label><select data-bind="hostFrequency"><option value="normal" ${state.hostFrequency==='normal'?'selected':''}>12:00 · 18:00 · 21:00</option><option value="low" ${state.hostFrequency==='low'?'selected':''}>하루 한 번 · 21:00</option><option value="off" ${state.hostFrequency==='off'?'selected':''}>호스트 끄기</option></select>${state.hostNewsStatus?`<p role="status">${escape(state.hostNewsStatus)}</p>`:''}</details>${(state.roomMessages[state.room]||[]).map(t=>bubble(t.text,t.role==='host'?'코코아챗 AI':state.name,t.role==='user')+(t.article?`<div class="news-source"><a href="${escape(t.article.url)}" target="_blank" rel="noopener noreferrer">${escape(t.article.source)} 기사 보기 ↗</a><small>${escape(time(t.article.publishedAt,state.userZone))} · 뉴스 제목 기반 화두</small></div>`:'')).join('')}`;
};
