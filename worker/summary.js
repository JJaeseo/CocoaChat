function standardProfile(profile){
 const out={};
 for(const [key,value] of Object.entries(profile)){
  if(!PROFILE_FIELDS.includes(key)||typeof value!=='string'||!value.trim())continue;
  let t=value.trim().replace(/^(?:나는|저는|제가|내가)\s+/,'').replace(/[.!。]+$/,'');
  if(key==='situation'){out[key]=normalizeSchool(t).replace(/(?:입니다|이에요|이야)$/,'')+'임.';continue}
  if(key==='experience'&&/^(?:관련 경험·활동 )?없/.test(t)){out[key]='관련 경험·활동은 없음.';continue}
  t=t.replace(/(?:\s*(?:쪽으로\s*)?(?:지망하고 있어요?|희망하고 있어요?|희망합니다|하고 싶어요?|가고 싶어요?))$/,'');
  t=t.replace(/(?:에?\s*대해서?\s*)?(?:물어보고 싶어요?|알고 싶어요?|궁금해요?|궁금합니다)$/,'');
  t=t.replace(/(?:입니다|이에요|이야|예요)$/,'').trim();
  t=t.replace(/완전 코딩은 아니지만\s*/g,'코딩 중심 직무보다는 ').replace(/\s*쪽으로$/,'').replace(/\s*(?:분야에|에) 관심(?:이)? (?:있어요|있어|있습니다)$/,'').replace(/(?:를|을)?\s*(?:하고|가고|되고) 싶(?:어요|어|습니다)$/,'').replace(/(?:를|을) 희망(?:합니다|해요|해)$/,'');
  t=t.replace(/어떻게 준비해야 할지 모르겠(?:어요|어)/g,'준비 방법').replace(/어떻게 준비해야할지 모르겠(?:어요|어)/g,'준비 방법').replace(/어떤 일을 하는지/g,'실제 담당 업무').replace(/어떤지/g,'수준').replace(/알려(?:주세요|줘요|줘)$/,'').trim();
  t=t.replace(/업무 강도는 어떤지랑 연봉/g,'업무 강도와 연봉 수준').replace(/실제 기업 내에서 발생할 수 있는 문제들/g,'기업 현장에서 발생할 수 있는 문제').replace(/\s+처럼\s+/g,' 등 ');
  out[key]=key==='role'?`${t} 분야를 희망함.`:key==='experience'?t.split(/[,\n]+/).map(x=>'• '+x.trim().replace(/(?:을|를)?\s*(?:했어요|했어|했습니다)$/,' 수행함').replace(/(?:에서)?\s*(?:일했어요|일했어)$/,' 근무함')).join('\n'):key==='concern'?`${t.replace(/(?:이|가)?\s*(?:고민이야|고민이에요|고민입니다)$/,'')}에 대해 조언을 구하고자 함.`:`관심사는 ${t}임.`;
 }
 return out;
}
