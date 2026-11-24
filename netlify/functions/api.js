const {grade,isAttempt}=require('./lib/parts.js');
const reply=(statusCode,data)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(data)});
exports.handler=async event=>{
 if(event.httpMethod!=='POST')return reply(405,{error:'Method not allowed'});
 const url=process.env.SUPABASE_URL, anon=process.env.SUPABASE_ANON_KEY, service=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!service)return reply(503,{error:'Service configuration is incomplete'});
 async function request(path,key,token,body){const r=await fetch(url.replace(/\/$/,'')+path,{method:body===undefined?'GET':'POST',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(12000)});const d=await r.json();if(!r.ok)throw new Error('Service request failed');return d;}
 const rpc=(name,args)=>request('/rest/v1/rpc/'+name,service,service,args);
 try{
 const b=JSON.parse(event.body||'{}');
 if(['signup','login'].includes(b.action)){
 if(typeof b.email!=='string'||typeof b.password!=='string')return reply(400,{error:'Email and password required'});
 const d=await request('/auth/v1/'+(b.action==='signup'?'signup':'token?grant_type=password'),anon,anon,{email:b.email,password:b.password,...(b.action==='signup'?{data:{username:String(b.username||'').trim().slice(0,40)}}:{})});return reply(200,{session:d.access_token?{access_token:d.access_token,refresh_token:d.refresh_token}:null});}
 const token=(event.headers.authorization||event.headers.Authorization||'').replace(/^Bearer /i,'');if(!token)return reply(401,{error:'Sign in required'});
 let user;try{user=await request('/auth/v1/user',anon,token);}catch{return reply(401,{error:'Session expired. Sign in again.'});}
 const u={p_user:user.id};
 if(b.action==='teams')return reply(200,await rpc('ir_teams',u));
 if(b.action==='create_team')return reply(200,await rpc('ir_create_team',{...u,p_name:String(b.name||'').trim().slice(0,60)}));
 if(b.action==='join_team')return reply(200,await rpc('ir_join_team',{...u,p_team:b.team_id}));
 if(b.action==='dashboard')return reply(200,await rpc('ir_dashboard',u));
 if(b.action==='leaderboard')return reply(200,await rpc('ir_leaderboard',u));
 if(b.action==='submit'){
 const id=String(b.question_id||'');const q=await rpc('ir_question',{p_id:id});if(!q)return reply(404,{error:'Unknown question'});
 let correct=false,pending=!!q.pending;
 if(q.v3){const a=b.answer; if(q.v3==='multi'){if(!Array.isArray(a)||!a.length)return reply(400,{error:'Select an answer'});correct=JSON.stringify([...new Set(a)].sort())===JSON.stringify([...q.expected].sort());}else{if(typeof a!=='string'||!a.trim())return reply(400,{error:'Enter an answer'});correct=a.trim().toLowerCase()===String(q.expected).toLowerCase();}}
 else if(pending){if(!b.answer||!JSON.stringify(b.answer).replace(/[{}\[\]":,\s]/g,''))return reply(400,{error:'Enter your response'});}
 else if(q.parts){const results=Object.entries(q.parts).map(([k,s])=>grade(s,b.answer?.[k]));if(results.some(r=>!isAttempt(r)))return reply(400,{error:'Complete all answer fields'});correct=results.every(r=>r.ok);}
 else {if(typeof b.answer!=='string'||!b.answer)return reply(400,{error:'Choose an answer'});correct=b.answer===q.choice;}
 return reply(200,await rpc('ir_submit',{...u,p_id:id,p_correct:correct,p_pending:pending,p_answer:b.answer}));}
 return reply(400,{error:'Unknown action'});
 }catch(e){return reply(400,{error:'Request could not be completed. Check your input or service setup.'});}
};
