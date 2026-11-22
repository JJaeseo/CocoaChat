
async function hostedFetch(request,env,ctx){
 const u=new URL(request.url);if(!u.pathname.startsWith('/api/pair'))return app.fetch(request,env,ctx);
 if(u.pathname==='/api/pair-info')return Response.json({available:true,origins:[u.origin]});
 if(!env.DB)return Response.json({error:'Session database is not configured.'},{status:503});
 const id=u.pathname.split('/')[3];let row=id?await env.DB.prepare('SELECT body, version FROM sessions WHERE id = ?').bind(id).first():null;
 let version=row?.version??-1;
 const initial=row?[[id,JSON.parse(row.body)]]:[];
 const onPersist=async sessions=>{
  if(!sessions.size){if(id)await env.DB.prepare('DELETE FROM sessions WHERE id = ? AND version = ?').bind(id,version).run();return}
  for(const [key,value] of sessions){
   if(version<0){await env.DB.prepare('INSERT INTO sessions (id, body, version, expires) VALUES (?, ?, 0, ?)').bind(key,JSON.stringify(value),value.expires).run();version=0}
   else {const r=await env.DB.prepare('UPDATE sessions SET body = ?, version = version + 1, expires = ? WHERE id = ? AND version = ?').bind(JSON.stringify(value),value.expires,key,version).run();if(!r.meta.changes)throw Error('Another device updated this session. Refresh and try again.');version++}
  }
 };
 const generateTopic=async topic=>(await app.fetch(new Request(u.origin+'/api/community-topic',{method:'POST',body:JSON.stringify({topic})}),env,ctx)).json();
 try{return await createPairingService(()=>[u.origin],{initialSessions:initial,onPersist,generateTopic})(request)}catch{return Response.json({error:'Session update failed. Please try again.'},{status:503})}
}
export default {fetch:hostedFetch};
