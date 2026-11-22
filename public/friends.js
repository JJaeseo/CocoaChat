// Profiles never mark messages as read; entering the conversation does.
state.chatRead??={};state.welcomeAt??=Date.now();
function incomingCount(kind){return kind==='bean'?1+state.onboard.filter(m=>m.role==='assistant').length:(state.request?.transcript||[]).filter(m=>m.role==='mentor').length}
function readKey(kind){return kind==='bean'?'bean':'mentor:'+state.request?.id}
function unreadChat(kind){return Math.max(0,incomingCount(kind)-(state.chatRead?.[readKey(kind)]||0))}
const beforeFriendContent=content,beforeFriendHeader=header,beforeFriendComposer=composer,beforeFriendRender=render;
header=function(){return state.screen==='friendprofile'?'':beforeFriendHeader()};
composer=function(){return state.screen==='friendprofile'?'':beforeFriendComposer()};
content=function(){
 if(state.screen==='friendprofile'){const isBean=state.friendProfile!=='mentor',m=mentor();return '<section class="friend-profile"><div class="profile-close">'+ib('plus','friends','프로필 닫기')+'</div><div class="profile-cover-note">'+(isBean?'새로운 시작에, 대화 한 잔.':'커리어 경험을 나누는 친구')+'</div><div class="friend-profile-info">'+(isBean?bean:photo(m))+'<h1>'+escape(isBean?'코코아챗':m?.name||state.request?.mentorName||'실무자')+'</h1><p>'+escape(isBean?'AI 커리어 친구 · 첫 커피챗을 함께 준비해요.':[m?.company,m?.field].filter(Boolean).join(' · '))+'</p>'+button(ico('chat')+' 1:1 채팅','openfriendchat:'+(isBean?'bean':'mentor'),'profile-chat-button')+'</div><p class="profile-news-empty">아직 친구가 남긴 소식이 없어요</p></section>'}
 if(state.screen!=='chatlist')return beforeFriendContent();
 const row=(kind,name,avatar,text,at)=>'<button class="chatroom-row" data-action="openfriendchat:'+kind+'">'+avatar+'<span class="room-row-body"><strong>'+escape(name)+'</strong><span class="room-last-message">'+escape(text)+'</span></span><span class="room-row-meta"><time>'+escape(roomTime(at))+'</time>'+(unreadChat(kind)?'<span class="room-unread">'+unreadChat(kind)+'</span>':'')+'</span></button>';
 const last=state.onboard.at(-1),r=state.request,l=r?.transcript?.at(-1);
 return '<div class="friends-page"><div class="home-top"><h1>채팅</h1>'+ib('settings','settings','설정')+'</div>'+row('bean','코코아챗 AI',bean,last?.text||'반가워! 너의 이야기를 들려줘 ☕',last?.at||state.welcomeAt)+(r?row('mentor',r.mentorName,photo(mentor()),l?.text||statuses[r.status],l?.at||r.createdAt):'')+'</div>';
};
render=function(){if(!expertView){state.chatRead??={};if(state.screen==='onboard')state.chatRead.bean=incomingCount('bean');if(['waiting','booking','live'].includes(state.screen))state.chatRead[readKey('mentor')]=incomingCount('mentor')}return beforeFriendRender()};
document.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(!el||el.disabled||busy)return;const [a,kind]=el.dataset.action.split(':');if(a==='friendprofile'){state.friendProfile=kind;state.screen='friendprofile';render()}if(a==='openfriendchat'){if(kind==='bean')state.screen='onboard';else showRequest();render()}});
render();
