const PROFILE_FIELDS=['situation','role','experience','concern','interests'];
function normalizeSchool(value){
 let text=String(value||'').trim().replace(/성균관대(?:학교)?/g,'성균관대학교');
 const school=text.match(/([가-힣A-Za-z]+대학교)/)?.[1];
 const major=text.match(/([가-힣A-Za-z]+(?:교육과|학과|학부|전공))/)?.[1];
 if(!school)return text;
 const status=/졸업|나왔|마쳤/.test(text)?'졸업':/재학|다니|학생/.test(text)?'재학':/휴학/.test(text)?'휴학':null;
 return [school,major,status].filter(Boolean).join(' · ');
}
function nextOnboarding(profile,completed=[]){
 const missing=['situation','role','experience','concern','interests'].find(k=>!profile[k]?.trim()&&!completed.includes(k));
 if(missing)return missing;
 return '';
}
function normalizeOnboarding(result,body){
 const p=result.profile;p.situation=normalizeSchool(p.situation);p.interests=splitInterests(p.interests).join(', ');
 const done=[...new Set([...(body.completed||[]),...PROFILE_FIELDS.filter(k=>p[k]?.trim())])].filter(k=>PROFILE_FIELDS.includes(k));
 const last=body.messages.filter(m=>m.role==='user').at(-1)?.text||'';
 if(body.asked==='experience'&&/^(?:(?:저는|나는|아직|딱히|특별히|관련|활동|경험|은|는|이|가)\s*)*(?:없|안 했|안했|하지 않았)/.test(last.trim())){p.experience='관련 경험·활동 없음';done.push('experience')}
 if(/건너|모르겠|없어요|없어|없습니다/.test(last)&&PROFILE_FIELDS.includes(body.asked))done.push(body.asked);
 const next=nextOnboarding(p,done),ready=!next;
 return {...result,profile:p,completed:[...new Set(done)],nextField:next,ready,message:ready?'네 이야기를 이렇게 정리했어. 잘못 이해한 부분이 있으면 편하게 고쳐줘! 확인하고 나면 함께 이야기할 실무자를 찾아볼게.':onboardingQuestion(next)};
}
function onboardingQuestion(key){return {situation:'지금 다니는 학교와 전공을 알려줄래? 학교에 다니지 않는다면 현재 상황을 알려줘.',role:'어떤 직무나 분야에서 일해보고 싶어? 아직 정하지 못했다면 관심 있는 방향을 편하게 이야기해 줘.',experience:'지금까지 해본 프로젝트나 활동 중 기억에 남는 경험이 있어? 없어도 괜찮아.',concern:'그 분야의 실무자를 만나면 가장 물어보고 싶은 건 뭐야?',interests:'평소 쉬는 시간에는 뭘 하며 지내? 좋아하는 취미가 있다면 편하게 알려줘. 이 정보는 따로 동의한 경우에만 모임 추천에 쓸게.'}[key]||''}
function conversationalDemo(body){
 const p={...body.profile},text=body.messages.filter(m=>m.role==='user').at(-1)?.text||'';
 const segments=text.split(/[.!?\n]+/).map(x=>x.trim()).filter(Boolean);
 const rules={situation:/대학|학과|전공|재학|학생|졸업|취준|취업.?준비|재직|이직|직장|학교|휴학/,role:/마케팅|디자인|개발|데이터|기획|인사|금융|디자이너|PM|UX|직무|커리어|진로/,experience:/프로젝트|공모전|대외활동|인턴|알바|아르바이트|인터뷰|경험/,concern:/고민|궁금|막막|어려|모르|어떻게|걱정|배우|알고.?싶/,interests:/취미|고양이|독서|카페|여행|운동|음악|영화|게임/};
 const skip=/^(?:이 항목은 )?건너|^없어|^없습니다|^모르겠/.test(text);
 if(!skip){
  for(const [key,re] of Object.entries(rules)){const hits=segments.filter(s=>re.test(s));if(hits.length)p[key]=hits.join('. ')}
  if(PROFILE_FIELDS.includes(body.asked)&&!Object.entries(rules).some(([key,re])=>key!==body.asked&&re.test(text))&&text.trim())p[body.asked]=text.trim();
 }
 return normalizeOnboarding({profile:p},body);
}
