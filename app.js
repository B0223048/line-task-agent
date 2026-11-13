import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.TASK_CONFIG || {};
const $ = id => document.getElementById(id);
const labels = {todo:'待處理',doing:'處理中',waiting:'等待別人',reply:'待回覆',done:'已完成'};
const prio = {urgent:0,high:1,normal:2,low:3};
const fmt = v => v ? new Date(v).toLocaleString('zh-TW',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '';
let db, user=null, tasks=[], editing=null, busy=false;
const invalidConfig = !/^https:\/\/[\w-]+\.supabase\.co$/.test(cfg.url||'') || !/^sb_publishable_/.test(cfg.publishableKey||'');
const authMessage = text => $('auth-message').textContent = text;
const msg = text => $('sync').textContent = text;
function uiAuth(show){$('auth-screen').hidden = !show; document.querySelector('.layout').style.visibility=show?'hidden':'visible';}
function handle(err){ console.error(err); msg('同步失敗'); alert('操作未完成：'+(err?.message||String(err))); }
function valid(t){return t&&typeof t.id==='string'&&typeof t.title==='string'&&Object.hasOwn(labels,t.status)&&Object.hasOwn(prio,t.priority)&&typeof t.updated==='number';}
const overdue=t=>t.status!=='done'&&t.due&&new Date(t.due).getTime()<Date.now();
function node(name,cls,txt){const e=document.createElement(name);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;}
function render(){
  const counts={open:tasks.filter(t=>t.status!=='done').length,reply:tasks.filter(t=>t.status==='reply').length,overdue:tasks.filter(overdue).length,done:tasks.filter(t=>t.status==='done').length};
  for(const [k,v] of Object.entries(counts))$('m-'+k).textContent=v;
  const q=$('search').value.trim().toLowerCase();
  const arr=tasks.filter(t=>($('status').value==='all'||t.status===$('status').value)&&[t.title,t.source,t.notes].join(' ').toLowerCase().includes(q));
  const sort=$('sort').value;
  arr.sort((a,b)=>sort==='recent'?b.updated-a.updated:sort==='due'?(a.due?new Date(a.due).getTime():Infinity)-(b.due?new Date(b.due).getTime():Infinity):prio[a.priority]-prio[b.priority]||((a.due?new Date(a.due).getTime():Infinity)-(b.due?new Date(b.due).getTime():Infinity)));
  $('count').textContent=arr.length+' 筆';const root=$('list');root.replaceChildren();
  if(!arr.length){root.append(node('div','empty',tasks.length?'沒有符合條件的任務。':'目前沒有任務，按「新增任務」開始。'));return;}
  for(const t of arr){
    const card=node('article','task'+(overdue(t)?' overdue':''));const body=node('div','taskbody');
    body.append(node('h3','',t.title),node('small','',t.source||'未設定來源'));
    if(t.notes)body.append(node('p','',t.notes));
    const meta=node('div','meta');meta.append(node('span','pill'+(t.status==='done'?' green':t.status==='reply'?' alert':''),labels[t.status]));
    meta.append(node('span','pill',({urgent:'緊急',high:'優先',normal:'一般',low:'稍後'})[t.priority]));
    if(t.due)meta.append(node('span','pill'+(overdue(t)?' alert':''),(overdue(t)?'已逾期 · ':'截止 · ')+fmt(t.due)));
    body.append(meta);const acts=node('div','actions');
    const edit=node('button','','編輯');edit.type='button';edit.onclick=()=>open(t.id);acts.append(edit);
    if(t.status!=='done'){
      const reply=node('button','','標記待回覆');reply.type='button';reply.onclick=()=>change(t.id,'reply');acts.append(reply);
      const done=node('button','done','✓ 完成');done.type='button';done.onclick=()=>change(t.id,'done');acts.append(done);
    }else{const reopen=node('button','','重新開啟');reopen.type='button';reopen.onclick=()=>change(t.id,'todo');acts.append(reopen);}
    const del=node('button','','刪除');del.type='button';del.onclick=async()=>{if(!confirm('確定要刪除「'+t.title+'」？'))return;try{await modify(()=>db.from('tasks').delete().eq('id',t.id));await load();}catch(err){handle(err);}};acts.append(del);
    card.append(body,acts);root.append(card);
  }
}
async function modify(operation){if(!user)throw Error('尚未登入');if(busy)throw Error('已有同步操作執行中');busy=true;msg('同步中…');try{const {error}=await operation();if(error)throw error;msg('已同步')}finally{busy=false;}}
async function load(){if(!user)return;msg('讀取任務中…');const {data,error}=await db.from('tasks').select('id,title,source,notes,due,priority,status,updated').order('updated',{ascending:false}).limit(1000);if(error){handle(error);return;}tasks=data||[];render();msg(`已同步 · ${tasks.length} 筆`);}
async function change(id,status){const t=tasks.find(x=>x.id===id);if(!t)return;try{await modify(()=>db.from('tasks').update({status,updated:Date.now()}).eq('id',id));await load();}catch(err){handle(err);}}
function open(id){editing=id||null;const t=id?tasks.find(x=>x.id===id):null;$('dialog-title').textContent=t?'編輯任務':'新增任務';$('form').reset();$('title').value=t?.title||'';$('source').value=t?.source||'';$('due').value=t?.due||'';$('priority').value=t?.priority||'normal';$('form-status').value=t?.status||'todo';$('notes').value=t?.notes||'';$('dialog').showModal();$('title').focus();}
$('form').addEventListener('submit',async e=>{e.preventDefault();const title=$('title').value.trim();if(!title||busy)return;const data={title,source:$('source').value.trim(),due:$('due').value,priority:$('priority').value,status:$('form-status').value,notes:$('notes').value.trim(),updated:Date.now()};try{if(editing)await modify(()=>db.from('tasks').update(data).eq('id',editing));else await modify(()=>db.from('tasks').insert({...data,user_id:user.id}));$('dialog').close();await load();}catch(err){handle(err);}});
$('new').onclick=()=>open();$('cancel').onclick=()=>$('dialog').close();
for(const id of ['search','status','sort'])$(id).addEventListener(id==='search'?'input':'change',render);
$('nav-reply').onclick=()=>{$('status').value='reply';render();document.querySelector('.main').scrollIntoView({behavior:'smooth'});};
$('nav-all').onclick=()=>{$('status').value='all';render();};
$('export').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,exported:new Date().toISOString(),tasks},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='task-console-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('import').onclick=()=>$('file').click();
$('file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>5*1024*1024)throw Error('備份檔超過 5 MB');const parsed=JSON.parse(await file.text());if(!parsed||parsed.version!==1||!Array.isArray(parsed.tasks)||!parsed.tasks.every(valid))throw Error('格式不正確');if(!confirm(`將匯入 ${parsed.tasks.length} 筆任務。現有任務不會被刪除；相同 ID 會覆蓋，確定繼續？`))return;
const records=parsed.tasks.map(t=>({id:t.id,user_id:user.id,title:t.title.slice(0,160),source:String(t.source||'').slice(0,100),notes:String(t.notes||'').slice(0,3000),due:String(t.due||''),priority:t.priority,status:t.status,updated:t.updated}));
for(let i=0;i<records.length;i+=100)await modify(()=>db.from('tasks').upsert(records.slice(i,i+100),{onConflict:'id'}));await load();alert('匯入成功');}catch(err){handle(err);}finally{e.target.value='';}});
$('login-form').addEventListener('submit',async e=>{e.preventDefault();if(invalidConfig)return;const button=$('login');button.disabled=true;authMessage('登入中…');try{const {error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)throw error;$('password').value='';}catch(err){authMessage('登入失敗：'+err.message);$('auth-message').classList.add('auth-error');}finally{button.disabled=false;}});
$('logout').onclick=async()=>{await db.auth.signOut();};
$('today').textContent=new Intl.DateTimeFormat('zh-TW',{dateStyle:'full'}).format(new Date())+' · 管理交辦、追蹤回覆，不再靠記憶';
async function refreshSession(session){user=session?.user||null;tasks=[];render();uiAuth(!user);$('account').textContent=user?.email||'尚未登入';if(user){$('auth-message').classList.remove('auth-error');await load();}else{msg('已登出');}}
if(invalidConfig){uiAuth(true);authMessage('尚未設定 Supabase：請先修改 config.js 的 URL 與 publishable key，再部署。');$('login').disabled=true;}else{
  db=createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data:{session},error}=await db.auth.getSession();if(error)authMessage('初始化失敗：'+error.message);await refreshSession(session);
  db.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_IN'||event==='SIGNED_OUT'||event==='TOKEN_REFRESHED')setTimeout(()=>refreshSession(session),0);});
}
