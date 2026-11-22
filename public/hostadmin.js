function communityRoomId(r){return encodeURIComponent(r.title)}
function sharedCommunityRooms(){return state.joined.map(i=>rooms()[i]).filter(Boolean).map(r=>({id:communityRoomId(r),title:r.title,topic:r.common.slice(0,120),enabled:state.hostFrequency!=='off'}))}
function receiveHostTopic(item){
 state.latestHostTopic=item;if(expertView)return;
 state.hostReceipts??={};if(state.hostReceipts[item.id]?.status==='posted')return;
 const index=state.joined.find(i=>rooms()[i]&&communityRoomId(rooms()[i])===item.roomId);
 if(index===undefined||state.hostFrequency==='off'){state.hostReceipts[item.id]={status:'blocked',reason:index===undefined?'아직 참여하지 않은 방입니다.':'호스트 설정을 확인해 주세요.'};save();return}
 (state.roomMessages[index]??=[]).push({role:'host',text:item.result.message||`${item.result.article?.title||''}\n\n${item.result.question}`,article:item.result.article,at:Date.now(),scheduleKey:'manual:'+item.id});
 state.hostReceipts[item.id]={status:'posted',reason:''};save();
}
const contentBeforeHostAdmin=content;
content=function(){const html=contentBeforeHostAdmin();if(!expertView||state.screen!=='manager')return html;const item=state.adminTopicPreview||state.latestHostTopic,catalog=state.remoteCommunityRooms||[],selected=catalog.find(r=>r.id===state.adminRoomId),receipt=item?state.remoteHostReceipts?.[item.id]:null;
 return `<div class="card host-admin"><span class="tag">AI 커뮤니티 호스트 · 관리자</span><h3>선택한 방에 화두 던지기</h3><label>채팅방</label><select data-bind="adminRoomId"><option value="">채팅방을 선택하세요</option>${catalog.map(r=>`<option value="${escape(r.id)}" ${r.id===state.adminRoomId?'selected':''}>${escape(r.title)}${r.enabled?'':' · 호스트 설정 필요'}</option>`).join('')}</select>${!catalog.length?'<p>연결된 구직자가 채팅방 하단의 참여하기를 누르면 여기에 나타납니다.</p>':''}${selected?`<p>이 방의 주제 · ${escape(selected.topic)}</p>`:''}${button('선택한 방에 지금 화두 던지기','hostnow','primary',busy||!catalog.length)}${item?`<div class="notice"><strong>${escape(item.roomTitle)}</strong><p>${escape(item.result.message||item.result.question)}</p>${item.result.article?`<a href="${escape(item.result.article.url)}" target="_blank" rel="noopener noreferrer">${escape(item.result.article.source)} · 근거 기사 ↗</a><p>${escape(time(item.result.article.publishedAt,state.mentorZone))}</p>`:'<small>최근 기사 확인 불가 · 경험 나눔 질문</small>'}<strong>${receipt?.status==='posted'?'채팅방 게시 완료':receipt?.status==='blocked'?'게시 보류: '+escape(receipt.reason):'구직자 기기의 게시 확인을 기다리고 있어요'}</strong></div>`:''}</div>`+html;
};
document.addEventListener('click',async e=>{
 if(e.target.closest('[data-action]')?.dataset.action!=='hostnow'||!expertView||busy)return;
 const room=(state.remoteCommunityRooms||[]).find(r=>r.id===state.adminRoomId);if(!pairing)return toast('구직자와 연결된 실무자 전용 링크를 열어 주세요.');if(!room)return toast('게시할 채팅방을 선택해 주세요.');
 await task(async()=>{const d=await pairCall('POST',{roomId:room.id,consent:true},'/host-topic');state.adminTopicPreview=d.hostTopic;toast('선택한 채팅방에 화두를 전달했습니다. 게시 결과를 확인하고 있어요.')});
});
document.addEventListener('change',e=>{if(e.target.dataset?.bind==='adminRoomId')render();if(['newsConsent','interestConsent','hostFrequency'].includes(e.target.dataset?.bind)&&state.latestHostTopic){receiveHostTopic(state.latestHostTopic);render()}});
render();
