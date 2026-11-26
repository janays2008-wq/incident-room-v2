const answers=require('./lib/answers.js');
const {grade,isAttempt}=require('./lib/parts.js');
const reply=(statusCode,data)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(data)});
exports.handler=async event=>{
 if(event.httpMethod!=='POST')return reply(405,{error:'Method not allowed'});
 const url=process.env.SUPABASE_URL, anon=process.env.SUPABASE_ANON_KEY, service=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!service)return reply(503,{error:'Service configuration is incomplete'});
 async function request(path,key,token,body,method){const r=await fetch(url.replace(/\/$/,'')+path,{method:method||(body===undefined?'GET':'POST'),headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(12000)});const d=await r.json();if(!r.ok){const e=new Error('Service request failed');e.code=d.error_code||d.code;e.status=r.status;throw e;}return d;}
 const rpc=(name,args)=>request('/rest/v1/rpc/'+name,service,service,args);
 try{
 const b=JSON.parse(event.body||'{}');
 if(['signup','login'].includes(b.action)){
 if(typeof b.email!=='string'||typeof b.password!=='string')return reply(400,{error:'Email and password required'});
 if(b.action==='signup'&&(typeof b.username!=='string'||!b.username.trim()||b.username.trim().length>40))return reply(400,{error:'Choose a username (1–40 characters)'});
 const d=await request('/auth/v1/'+(b.action==='signup'?'signup':'token?grant_type=password'),anon,anon,{email:b.email,password:b.password,...(b.action==='signup'?{data:{username:String(b.username||'').trim().slice(0,40)}}:{})});return reply(200,{session:d.access_token?{access_token:d.access_token,refresh_token:d.refresh_token}:null});}
 if(b.action==='refresh'){if(typeof b.refresh_token!=='string'||!b.refresh_token)return reply(400,{error:'Refresh token required'});const d=await request('/auth/v1/token?grant_type=refresh_token',anon,anon,{refresh_token:b.refresh_token});return reply(200,{session:{access_token:d.access_token,refresh_token:d.refresh_token}});}
 const token=(event.headers.authorization||event.headers.Authorization||'').replace(/^Bearer /i,'');if(!token)return reply(401,{error:'Sign in required'});
 let user;try{user=await request('/auth/v1/user',anon,token);}catch{return reply(401,{error:'Session expired. Sign in again.'});}
 const u={p_user:user.id};
 const progressPath='/rest/v1/ir_personal_progress';
 const getProgress=()=>request(progressPath+'?user_id=eq.'+encodeURIComponent(user.id)+'&select=question_id,solved,attempts',service,service);
 if(b.action==='progress')return reply(200,await getProgress());
 if(b.action==='foundation'){const id=String(b.question_id||'');if(!/^foundation:[0-9]$/.test(id))return reply(400,{error:'Invalid question'});await rpc('ir_save_progress',{p_user:user.id,p_id:id,p_solved:true});return reply(200,{correct:true});}
 if(b.action==='profile')return reply(200,{username:user.user_metadata?.username||''});
 if(b.action==='update_username'){const name=typeof b.username==='string'?b.username.trim():'';if(!name||name.length>40)return reply(400,{error:'Choose a username (1–40 characters)'});await request('/auth/v1/user',anon,token,{data:{username:name}},'PUT');return reply(200,{username:name});}
 if(b.action==='teams')return reply(200,await rpc('ir_teams',u));
 if(b.action==='create_team')return reply(200,await rpc('ir_create_team',{...u,p_name:String(b.name||'').trim().slice(0,60)}));
 if(b.action==='join_team')return reply(200,await rpc('ir_join_team',{...u,p_team:b.team_id}));
 if(b.action==='dashboard')return reply(200,await rpc('ir_dashboard',u));
 if(b.action==='leaderboard')return reply(200,await rpc('ir_leaderboard',u));
 if(b.action==='submit'){
 const id=String(b.question_id||'');if(!Object.hasOwn(answers,id))return reply(404,{error:'Unknown or unavailable question'});
 const expected=answers[id], a=b.answer;
 if(Array.isArray(expected)?!Array.isArray(a)||!a.length:typeof a!=='string'||!a.trim())return reply(400,{error:'Enter an answer'});
 const correct=Array.isArray(expected)?JSON.stringify([...new Set(a)].sort())===JSON.stringify([...expected].sort()):a.trim().toLowerCase()===expected.toLowerCase();
 const old=(await getProgress()).find(x=>x.question_id===id);
 if(old?.solved)return reply(200,{correct:true,already:true,points:0});
 const result=await rpc('ir_submit',{...u,p_id:id,p_correct:correct,p_pending:false,p_answer:a});
 const saved=await rpc('ir_save_progress',{p_user:user.id,p_id:id,p_solved:correct});
 return reply(200,{...result,correct, pending:false,remaining:Math.max(0,(Number(result?.remaining)||0)),attempts:saved?.attempts});}
 return reply(400,{error:'Unknown action'});
 }catch(e){const errors={invalid_credentials:'Incorrect email or password.',email_not_confirmed:'Confirm your email before signing in.',user_already_exists:'Account already exists. Sign in instead.',23505:'A membership or team with this value already exists.',23503:'The selected team no longer exists.',21000:'Multiple memberships found. Contact the administrator.',P0001:'Team request rejected. Check your membership and team name.'};console.error('Request failed',e.code||'unknown',e.status||'');return reply(e.status===429?429:400,{error:errors[e.code]||(e.status===429?'Too many requests. Try again later.':'Request failed. Contact the administrator if this continues.')});}
};
