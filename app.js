/* FamExpenses V1 - offline-first + Google Sheets sync, INR, Me/Wife profiles */
const $ = id => document.getElementById(id);
const LS = { e:'famexp_entries_v1', b:'famexp_budgets_v1', g:'famexp_goals_v1', s:'famexp_settings_v1' };
const EXP_CATS = ["Food","Groceries","Rent","Transport","Utilities","Health","Shopping","Entertainment","Education","Travel","Other"];
const INC_CATS = ["Salary","Business","Interest","Gift","Other income"];
const MODES = ["UPI","Cash","Card","Bank"];

const load = (k,f)=>{ try{ const v=JSON.parse(localStorage.getItem(k)); return v??f; }catch{ return f; } };
const save = (k,v)=> localStorage.setItem(k, JSON.stringify(v));
const uid = ()=> Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const inr = n => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(n)||0);
const todayStr = ()=> new Date().toISOString().slice(0,10);
const monthStr = d => (d||todayStr()).slice(0,7);

let entries = load(LS.e, []);
let budgets = load(LS.b, {});           // {Food: 8000}
let goals = load(LS.g, []);             // [{id,name,target,saved,deadline}]
let settings = load(LS.s, { sheetUrl:'', secret:'', nameMe:'Me', nameWife:'Wife' });

let ui = { month: monthStr(), profile: localStorage.getItem('famexp_profile')||'Me', type:'expense' };

// ---------- profile ----------
function renderProfile(){
  const meLabel = settings.nameMe||'Me', wifeLabel = settings.nameWife||'Wife';
  $('profileMe').textContent = meLabel; $('profileWife').textContent = wifeLabel;
  $('profileMe').classList.toggle('active', ui.profile==='Me');
  $('profileWife').classList.toggle('active', ui.profile==='Wife');
  $('fBy').value = ui.profile;
  $('nameMe').value = settings.nameMe||''; $('nameWife').value = settings.nameWife||'';
}
$('profileMe').onclick = ()=>{ ui.profile='Me'; localStorage.setItem('famexp_profile','Me'); renderProfile(); renderAll(); };
$('profileWife').onclick = ()=>{ ui.profile='Wife'; localStorage.setItem('famexp_profile','Wife'); renderProfile(); renderAll(); };

// ---------- tabs ----------
document.querySelectorAll('.bottomnav button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.bottomnav button').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  $('tab-'+b.dataset.tab).classList.add('active');
});
$('gotoAdd').onclick = ()=> document.querySelector('[data-tab="add"]').click();

// ---------- type toggle + categories ----------
function renderCats(){
  const cats = ui.type==='expense'?EXP_CATS:INC_CATS;
  $('fCategory').innerHTML = cats.map(c=>`<option>${c}</option>`).join('');
  $('newBudgetCat').innerHTML = EXP_CATS.map(c=>`<option>${c}</option>`).join('');
}
$('typeExpense').onclick = ()=>{ ui.type='expense'; $('typeExpense').className='type active-expense'; $('typeIncome').className='type'; renderCats(); };
$('typeIncome').onclick = ()=>{ ui.type='income'; $('typeIncome').className='type active'; $('typeExpense').className='type'; renderCats(); };

// ---------- add / edit ----------
$('fDate').value = todayStr();
$('entryForm').onsubmit = e=>{
  e.preventDefault();
  const amt = Number($('fAmount').value);
  if(!amt||amt<=0) return alert('Enter valid amount');
  const editId = $('editId').value;
  const obj = { id: editId||uid(), type: ui.type, date: $('fDate').value||todayStr(),
    amount: Math.round(amt), category: $('fCategory').value, mode: $('fMode').value,
    note: $('fNote').value.trim(), by: $('fBy').value, updatedAt: Date.now() };
  if(editId) entries = entries.map(x=>x.id===editId?obj:x);
  else entries.push(obj);
  persist(); resetForm(); renderAll(); autoPush();
  document.querySelector('[data-tab="home"]').click();
};
function resetForm(){ $('editId').value=''; $('fAmount').value=''; $('fNote').value=''; $('fDate').value=todayStr(); $('cancelEdit').hidden=true; $('saveBtn').textContent='Save'; }
$('cancelEdit').onclick = resetForm;
function startEdit(id){
  const x = entries.find(e=>e.id===id); if(!x) return;
  ui.type = x.type;
  (x.type==='expense'?$('typeExpense').onclick:$('typeIncome').onclick)();
  $('editId').value=x.id; $('fAmount').value=x.amount; $('fDate').value=x.date;
  renderCats(); $('fCategory').value=x.category; $('fMode').value=x.mode; $('fBy').value=x.by; $('fNote').value=x.note||'';
  $('cancelEdit').hidden=false; $('saveBtn').textContent='Update';
  document.querySelector('[data-tab="add"]').click(); window.scrollTo({top:0,behavior:'smooth'});
}
function delEntry(id){ if(!confirm('Delete this entry?')) return; entries=entries.filter(e=>e.id!==id); persist(); renderAll(); autoPush(); }

// ---------- month nav ----------
function renderMonth(){
  const [y,m] = ui.month.split('-').map(Number);
  $('monthLabel').textContent = new Date(y,m-1,1).toLocaleString('en-IN',{month:'long',year:'numeric'});
  const inM = entries.filter(e=>e.date.startsWith(ui.month));
  $('monthSub').textContent = `${inM.length} entries • ${settings.nameMe||'Me'} + ${settings.nameWife||'Wife'} shared`;
}
$('prevMonth').onclick = ()=>{ const d=new Date(ui.month+'-01'); d.setMonth(d.getMonth()-1); ui.month=d.toISOString().slice(0,7); renderAll(); };
$('nextMonth').onclick = ()=>{ const d=new Date(ui.month+'-01'); d.setMonth(d.getMonth()+1); ui.month=d.toISOString().slice(0,7); renderAll(); };

// ---------- dashboard ----------
function monthEntries(){ return entries.filter(e=>e.date.startsWith(ui.month)); }
function renderHome(){
  renderMonth();
  const m = monthEntries();
  const inc = m.filter(e=>e.type==='income'), exp = m.filter(e=>e.type==='expense');
  const si = inc.reduce((s,e)=>s+ +e.amount,0), se = exp.reduce((s,e)=>s+ +e.amount,0);
  $('sumIncome').textContent=inr(si); $('sumExpense').textContent=inr(se); $('sumBalance').textContent=inr(si-se);
  const by = p => m.filter(e=>e.by===p);
  const sum = a => a.reduce((s,e)=>s+(e.type==='expense'?-1:1)* +e.amount,0);
  $('splitIncome').textContent=`${settings.nameMe||'Me'} ${inr(inc.filter(e=>e.by==='Me').reduce((s,e)=>s+ +e.amount,0))} • ${settings.nameWife||'Wife'} ${inr(inc.filter(e=>e.by==='Wife').reduce((s,e)=>s+ +e.amount,0))}`;
  $('splitExpense').textContent=`net ${settings.nameMe||'Me'} ${inr(sum(by('Me')))} • ${settings.nameWife||'Wife'} ${inr(sum(by('Wife')))}`;
  $('savingsRate').textContent = si>0 ? `saved ${Math.max(0,Math.round((si-se)/si*100))}%` : 'add income to track savings';

  // category bars
  const byCat={}; exp.forEach(e=>byCat[e.category]=(byCat[e.category]||0)+ +e.amount);
  const max = Math.max(1,...Object.values(byCat));
  $('catBars').innerHTML = Object.keys(byCat).length? Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([c,v])=>{
    const b = budgets[c]; const pct = b? Math.min(100,Math.round(v/b*100)) : null;
    const cls = b&&v>b?'over':(b&&v>b*0.8?'warn':'');
    return `<div class="bar"><div class="lbl"><span>${c}</span><span>${inr(v)}${b?` / ${inr(b)}${pct>=100?' 🔴':pct>=80?' 🟡':''}`:''}</span></div><div class="track"><div class="fill ${cls}" style="width:${Math.round(v/max*100)}%"></div></div></div>`;
  }).join('') : '<p class="muted">No expenses this month yet. Tap + Add.</p>';

  drawTrend(m);
  const recent=[...entries].sort((a,b)=>b.date.localeCompare(a.date)||b.updatedAt-a.updatedAt).slice(0,10);
  $('recentList').innerHTML = recent.length? recent.map(rowHtml).join('') : '<p class="muted">Nothing yet.</p>';
  renderTips(si,se,exp,byCat);
}
function rowHtml(e){
  const neg=e.type==='expense';
  return `<div class="item"><div><strong>${neg?'−':'+'} ${e.category}</strong> <span class="muted small">${e.date} • ${e.by} • ${e.mode}</span><div class="muted small">${e.note||''}</div></div><div class="amt ${neg?'neg':'pos'}">${inr(e.amount)}</div></div>`;
}
function drawTrend(m){
  const c=$('trendChart'), ctx=c.getContext('2d');
  const W=c.width=c.offsetWidth*2, H=c.height=240; ctx.clearRect(0,0,W,H);
  const days=new Date(+ui.month.slice(0,4),+ui.month.slice(5,7),0).getDate();
  const per={}; for(let d=1;d<=days;d++) per[d]=0;
  m.filter(e=>e.type==='expense').forEach(e=>{ const d=+e.date.slice(8,10); if(per[d]!=null) per[d]+= +e.amount; });
  const max=Math.max(1,...Object.values(per)), bw=W/days;
  ctx.fillStyle='#4f46e5';
  Object.entries(per).forEach(([d,v],i)=>{ const h=v/max*(H-30); ctx.fillRect(i*bw+2,H-h,bw-4,h); });
  ctx.fillStyle='#64748b'; ctx.font='20px system-ui'; ctx.fillText('₹/day • peak '+inr(max),10,22);
}

// ---------- smart tips (free, rule-based) ----------
function renderTips(si,se,exp,byCat){
  const tips=[];
  const total=se||1;
  const food=(byCat.Food||0)+(byCat.Groceries||0);
  if(se>0&&food/total>0.4) tips.push(`🍛 Food is ${Math.round(food/total*100)}% of spending — cook 2 more days/week to save ~${inr(Math.round(food*0.15))}/mo.`);
  const fun=(byCat.Entertainment||0)+(byCat.Shopping||0);
  if(se>0&&fun/total>0.25) tips.push(`🛍️ Fun+Shopping ${Math.round(fun/total*100)}% — set a weekly fun cap of ${inr(Math.round(fun/4*0.8))}.`);
  const smallLeaks=exp.filter(e=>+e.amount<200).length;
  if(smallLeaks>=8) tips.push(`🕳️ ${smallLeaks} tiny UPI spends (<₹200) — these leak ~${inr(exp.filter(e=>+e.amount<200).reduce((s,e)=>s+ +e.amount,0))}. Use a ₹500/week cash envelope.`);
  Object.entries(budgets).forEach(([c,b])=>{ const v=byCat[c]||0; if(v>b) tips.push(`🔴 ${c} over budget by ${inr(v-b)} — pause non-urgent ${c} till next month.`); else if(v>b*0.8&&b>0) tips.push(`🟡 ${c} at ${Math.round(v/b*100)}% of budget — ${inr(b-v)} left.`); });
  if(si>0&&(si-se)/si<0.1) tips.push(`🐷 Savings <10% — auto-move 10% (${inr(si*0.1)}) to your goal on salary day.`);
  else if(si>0) tips.push(`✅ Great! Saving ${Math.round((si-se)/si*100)}% — push surplus to “Emergency fund”.`);
  if(!Object.keys(budgets).length) tips.push(`🎯 No budgets set — set Food + Transport limits in Budget tab to start.`);
  if(!goals.length) tips.push(`🐷 No savings goal yet — create one (e.g. ₹50,000 emergency fund).`);
  $('tipsList').innerHTML=tips.slice(0,5).map(t=>`<li>${t}</li>`).join('');
}
$('refreshTips').onclick=renderHome;

// ---------- full list + filters ----------
function renderList(){
  const q=($('q').value||'').toLowerCase(), fb=$('filterBy').value, ft=$('filterType').value;
  let list=[...entries].sort((a,b)=>b.date.localeCompare(a.date)||b.updatedAt-a.updatedAt);
  if(q) list=list.filter(e=>(e.note+e.category+e.amount).toLowerCase().includes(q));
  if(fb) list=list.filter(e=>e.by===fb);
  if(ft) list=list.filter(e=>e.type===ft);
  $('allList').innerHTML=list.slice(0,200).map(e=>`<div class="item"><div><strong>${e.type==='expense'?'−':'+'} ${e.category}</strong> <span class="muted small">${e.date} • ${e.by} • ${e.mode}</span><div class="muted small">${e.note||''}</div></div><div><div class="amt ${e.type==='expense'?'neg':'pos'}">${inr(e.amount)}</div><div class="row"><button class="btn ghost small" onclick="startEdit('${e.id}')">Edit</button><button class="btn ghost small" onclick="delEntry('${e.id}')">Del</button></div></div></div>`).join('')||'<p class="muted">No matches.</p>';
}
['q','filterBy','filterType'].forEach(id=>$(id).oninput=renderList);
window.startEdit=startEdit; window.delEntry=delEntry;

// ---------- budgets ----------
function renderBudgets(){
  const m=monthEntries().filter(e=>e.type==='expense');
  const spent={}; m.forEach(e=>spent[e.category]=(spent[e.category]||0)+ +e.amount);
  $('budgetList').innerHTML = Object.keys(budgets).length? Object.entries(budgets).map(([c,b])=>{
    const v=spent[c]||0, pct=b?Math.min(100,Math.round(v/b*100)):0;
    const cls=v>b?'over':v>b*0.8?'warn':'';
    return `<div class="bar"><div class="lbl"><span>${c} — ${inr(v)} / ${inr(b)}</span><span>${pct}% <button class="btn ghost small" onclick="rmBudget('${c}')">✕</button></span></div><div class="track"><div class="fill ${cls}" style="width:${pct}%"></div></div></div>`;
  }).join('') : '<p class="muted">No budgets yet. Add one below.</p>';
}
window.rmBudget=c=>{ delete budgets[c]; persist(); renderAll(); autoPush(); };
$('addBudget').onclick=()=>{ const c=$('newBudgetCat').value, a=Number($('newBudgetAmt').value); if(!a||a<=0) return alert('Enter limit'); budgets[c]=a; $('newBudgetAmt').value=''; persist(); renderAll(); autoPush(); };

// ---------- goals ----------
function renderGoals(){
  $('goalsList').innerHTML = goals.length? goals.map(g=>{
    const pct=Math.min(100,Math.round((+g.saved||0)/(+g.target||1)*100));
    return `<div class="goal"><strong>${g.name}</strong> <span class="muted small">${g.deadline||''}</span><div class="lbl row-between small"><span>${inr(g.saved||0)} / ${inr(g.target)}</span><span>${pct}%</span></div><div class="track"><div class="fill" style="width:${pct}%"></div></div><div class="row" style="margin-top:8px"><input type="number" id="add-${g.id}" placeholder="+ ₹" style="max-width:120px"/><button class="btn small" onclick="goalAdd('${g.id}')">+ Add</button><button class="btn ghost small" onclick="goalDel('${g.id}')">Delete</button></div></div>`;
  }).join('') : '<p class="muted">No goals yet. Emergency fund first!</p>';
}
window.goalAdd=id=>{ const v=Number(document.getElementById('add-'+id).value); if(!v||v<=0) return alert('Enter amount'); goals=goals.map(g=>g.id===id?{...g,saved:(+g.saved||0)+v,updatedAt:Date.now()}:g); persist(); renderAll(); autoPush(); };
window.goalDel=id=>{ if(!confirm('Delete goal?'))return; goals=goals.filter(g=>g.id!==id); persist(); renderAll(); autoPush(); };
$('addGoal').onclick=()=>{ const n=$('gName').value.trim(), t=Number($('gTarget').value); if(!n||!t) return alert('Name + target needed'); goals.push({id:uid(),name:n,target:t,saved:0,deadline:$('gDeadline').value,updatedAt:Date.now()}); $('gName').value='';$('gTarget').value=''; persist(); renderAll(); autoPush(); };

// ---------- report ----------
function renderReport(){
  const m=monthEntries();
  const si=m.filter(e=>e.type==='income').reduce((s,e)=>s+ +e.amount,0);
  const se=m.filter(e=>e.type==='expense').reduce((s,e)=>s+ +e.amount,0);
  const byCat={}; m.filter(e=>e.type==='expense').forEach(e=>byCat[e.category]=(byCat[e.category]||0)+ +e.amount);
  const rows=Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`<div class="row-between small"><span>${c}</span><span>${inr(v)} (${se?Math.round(v/se*100):0}%)</span></div>`).join('')||'No expenses';
  const top=[...m.filter(e=>e.type==='expense')].sort((a,b)=>b.amount-a.amount).slice(0,5).map(e=>`<div class="small">• ${e.date} ${e.category} ${inr(e.amount)} (${e.by})</div>`).join('');
  $('reportBox').innerHTML=`<p><strong>${$('monthLabel').textContent}</strong><br>Income ${inr(si)} • Expense ${inr(se)} • Saved ${inr(si-se)}</p>${rows}<hr><div class="muted small">Top 5 spends:</div>${top||'<div class="muted small">—</div>'}`;
}
$('exportCsv').onclick=()=>{
  const rows=[['id','type','date','amount','category','mode','note','by']];
  entries.forEach(e=>rows.push([e.id,e.type,e.date,e.amount,`"${(e.category||'').replace(/"/g,'')}"`,e.mode,`"${(e.note||'').replace(/"/g,'')}"`,e.by]));
  const blob=new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`expenses-${ui.month}.csv`; a.click();
};
$('shareWa').onclick=()=>{
  const m=monthEntries(); const si=m.filter(e=>e.type==='income').reduce((s,e)=>s+ +e.amount,0), se=m.filter(e=>e.type==='expense').reduce((s,e)=>s+ +e.amount,0);
  const txt=`*FamExpenses ${$('monthLabel').textContent}*%0AIncome: ${si}%0AExpense: ${se}%0ASaved: ${si-se}%0AEntries: ${m.length}`;
  window.open('https://wa.me/?text='+encodeURIComponent(`FamExpenses ${$('monthLabel').textContent}\nIncome: ₹${si}\nExpense: ₹${se}\nSaved: ₹${si-se}\nEntries: ${m.length}`),'_blank');
};
$('printBtn').onclick=()=>window.print();

// ---------- backup / names ----------
$('exportJson').onclick=()=>{ const blob=new Blob([JSON.stringify({entries,budgets,goals,settings},null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='famexp-backup.json'; a.click(); };
$('importJson').onchange=e=>{ const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=()=>{ try{ const d=JSON.parse(r.result); if(d.entries)entries=d.entries; if(d.budgets)budgets=d.budgets; if(d.goals)goals=d.goals; persist(); renderAll(); alert('Restored!'); }catch{ alert('Bad file'); } }; r.readAsText(f); };
$('wipe').onclick=()=>{ if(confirm('Erase ALL data on this phone? (do Backup first)')){ entries=[];budgets={};goals=[]; persist(); renderAll(); } };
$('saveNames').onclick=()=>{ settings.nameMe=$('nameMe').value.trim()||'Me'; settings.nameWife=$('nameWife').value.trim()||'Wife'; persist(); renderProfile(); renderAll(); };

// ---------- sheets sync ----------
function persist(){ save(LS.e,entries); save(LS.b,budgets); save(LS.g,goals); save(LS.s,settings); }
function syncUI(msg,ok){ $('syncStatus').textContent=msg; $('syncBar').innerHTML=(ok?'🟢 ':'📴 ')+msg; }
$('saveSync').onclick=()=>{ settings.sheetUrl=$('sUrl').value.trim(); settings.secret=$('sSecret').value.trim(); persist(); syncUI('Settings saved. Tap Sync now.',true); };
async function syncNow(){
  const {sheetUrl,secret}=settings;
  if(!sheetUrl||!secret) return syncUI('Add Web App URL + secret first (More tab).',false);
  syncUI('Syncing…',true);
  try{
    // pull
    const res=await fetch(`${sheetUrl}?action=pull&secret=${encodeURIComponent(secret)}`);
    const remote=await res.json();
    if(!remote.ok) throw new Error(remote.error||'pull failed');
    const map=new Map(entries.map(e=>[e.id,e]));
    (remote.entries||[]).forEach(r=>{ const cur=map.get(r.id); if(!cur||(r.updatedAt||0)>(cur.updatedAt||0)) map.set(r.id,r); });
    entries=[...map.values()];
    if(remote.budgets) budgets={...remote.budgets,...budgets};
    if(remote.goals&&remote.goals.length){ const gm=new Map(goals.map(g=>[g.id,g])); remote.goals.forEach(g=>{ const c=gm.get(g.id); if(!c||(g.updatedAt||0)>(c.updatedAt||0)) gm.set(g.id,g); }); goals=[...gm.values()]; }
    // push merged
    await fetch(sheetUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({secret,action:'push',entries,budgets,goals})});
    persist(); renderAll();
    syncUI(`Synced ✅ ${entries.length} entries shared with ${settings.nameWife||'Wife'}.`,true);
  }catch(err){ syncUI('Sync failed: '+err.message+' — data still safe on phone.',false); }
}
$('syncNow').onclick=syncNow;
let pushT=null;
function autoPush(){ if(!settings.sheetUrl||!settings.secret) return; clearTimeout(pushT); pushT=setTimeout(()=>{ fetch(settings.sheetUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({secret:settings.secret,action:'push',entries,budgets,goals})}).catch(()=>{}); },1500); }

// ---------- boot ----------
function renderAll(){ renderProfile(); renderHome(); renderList(); renderBudgets(); renderGoals(); renderReport(); $('sUrl').value=settings.sheetUrl||''; $('sSecret').value=settings.secret||''; }
renderCats(); renderAll();
