(function(root){'use strict';
const M=root.CoveOptimizer,esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),fmt=n=>Number.isFinite(n)?n.toLocaleString(undefined,{maximumFractionDigits:2,notation:n>=1e6?'compact':'standard'}):'—',pct=n=>`${fmt(n*100)}%`;
const money=(n,i)=>`<img src="assets/HoleGshape${i}.png" alt="">${fmt(n)} ${M.shapes[i]}`;
const shapeIcon=value=>value==='all'?'':`<img src="assets/HoleGshape${Number(value)}.png" alt="">`;
function shapePicker(host){
 host.querySelectorAll('select[name="shape"]').forEach(select=>{
  const key='shape',label='Costs shape';
  const original=select.closest('label'),container=document.createElement('div');container.className='fountain-currency-control';
  original.replaceWith(container);container.append(...original.childNodes);
  select.hidden=true;select.tabIndex=-1;select.setAttribute('aria-hidden','true');
  const picker=document.createElement('details');picker.className='fountain-currency-picker';picker.dataset.currencyPicker=key;
  const selected=select.selectedOptions[0];
  picker.innerHTML=`<summary aria-label="${label}: ${esc(selected.textContent)}" aria-haspopup="listbox">${shapeIcon(selected.value)}<span>${esc(selected.textContent)}</span><span class="fountain-picker-arrow" aria-hidden="true">▾</span></summary><div role="listbox" aria-label="${label}">${[...select.options].map(option=>`<button type="button" role="option" data-shape-option="${option.value}" aria-selected="${option.selected}">${shapeIcon(option.value)}<span>${esc(option.textContent)}</span></button>`).join('')}</div>`;
  const list=picker.querySelector('[role=listbox]'),items=[...list.children];
  list.classList.add('cove-shape-options');
  const heading=text=>{const node=document.createElement('strong');node.className='cove-shape-heading';node.setAttribute('role','presentation');node.textContent=text;return node;};
  list.replaceChildren(items[0],heading('Gooey shapes'),heading('Quartz shapes'));
  for(let i=0;i<6;i++)list.append(items[i+1],items[i+7]);
  container.append(picker);
  const summary=picker.querySelector('summary'),options=[...picker.querySelectorAll('[role=option]')];
  summary.onkeydown=event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();picker.open=true;options[event.key==='ArrowUp'?options.length-1:Math.max(0,options.findIndex(option=>option.dataset.shapeOption===select.value))].focus();}};
  picker.onkeydown=event=>{
   if(event.key==='Escape'){event.preventDefault();picker.open=false;summary.focus();}
   const index=options.indexOf(document.activeElement);
   if(index>=0&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?options.length-1:(index+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;options[next].focus();}
  };
  picker.addEventListener('focusout',event=>{if(!picker.contains(event.relatedTarget))picker.open=false;});
  options.forEach(option=>option.onclick=()=>{select.value=option.dataset.shapeOption;select.dispatchEvent(new Event('change',{bubbles:true}));host.querySelector(`[data-currency-picker="${key}"] summary`)?.focus({preventScroll:true});});
 });
}
let signature='',settings,done=[];
function render(host,raw,afterRender=()=>{}){const saved=M.decode(raw);if(!saved){host.innerHTML='<section class="bonus-system-empty section-head"><h2>Cove Upgrade Optimizer</h2><p>Import an IdleOn save with Cove data to plan upgrades.</p></section>';afterRender();return;}
 const key='idleon-cove-checklist-v1',nextSignature=JSON.stringify([raw?.charNames||[],saved]);
 if(signature!==nextSignature){signature=nextSignature;settings={goal:'drop',mode:'roadmap',steps:100,shape:'all',tab:0,compress:false};done=[];try{const stored=JSON.parse(localStorage.getItem(key));if(stored?.signature===signature&&Array.isArray(stored.done))done=stored.done.filter(x=>typeof x==='string');}catch{}}
 const persist=()=>{try{localStorage.setItem(key,JSON.stringify({signature,done}));}catch{}},stepKey=a=>`${a.id}:${a.to}`;
 function draw(){const result=M.plan(saved,settings),countGoal=['opal','ribbon'].includes(settings.goal),remaining=result.steps.filter(a=>!done.includes(stepKey(a))),filtered=remaining.filter(a=>settings.shape==='all'||a.shape===Number(settings.shape)),rows=[];
  for(const a of filtered){const previous=rows.at(-1);if(settings.compress&&previous?.id===a.id&&previous.to===a.from&&previous.orderEnd+1===a.order&&previous.future===a.future){previous.to=a.to;previous.cost+=a.cost;previous.gain=(1+previous.gain)*(1+a.gain)-1;previous.orderEnd=a.order;previous.keys.push(stepKey(a));}else rows.push({...a,orderEnd:a.order,keys:[stepKey(a)]});}
  host.innerHTML=`<section class="fountain-page cove-optimizer"><div class="bonus-system-hero"><div><p class="eyebrow">World 5 · The Hole</p><h2>Cove Upgrade Optimizer</h2><p>${settings.mode==='now'?'Purchases using your imported shapes.':'An upgrade order with extra shapes to save for.'}</p></div><strong>+${countGoal?fmt(result.gain):pct(result.gain)} ${esc(M.goals.find(g=>g.id===settings.goal).label)}</strong></div>
  ${saved.unlocked===false?'<p class="collection-note">Cove unlocks at Explorer level 18. No purchases are recommended yet.</p>':saved.unlocked===null?'<p class="collection-note">Explorer level is unavailable. Confirm Cavern 18 is unlocked.</p>':''}
  <div class="fountain-wallet">${saved.balances.map(money).map(x=>`<span>${x}</span>`).join('')}</div>
  <form class="fountain-controls"><label>Goal <select name="goal">${M.goals.map(g=>`<option value="${g.id}" ${settings.goal===g.id?'selected':''}>${esc(g.label)}</option>`).join('')}</select></label><label>Plan <select name="mode"><option value="roadmap" ${settings.mode==='roadmap'?'selected':''}>Long-term roadmap</option><option value="now" ${settings.mode==='now'?'selected':''}>Buy now</option></select></label><label>Purchases <select name="steps">${[20,50,100,250,500].map(n=>`<option ${n===settings.steps?'selected':''}>${n}</option>`).join('')}</select></label><label>Costs shape <select name="shape"><option value="all">All shapes</option>${M.shapes.map((n,i)=>`<option value="${i}" ${settings.shape===String(i)?'selected':''}>${n}</option>`).join('')}</select></label></form>
  <p class="fountain-note">Ranks marginal goal gain per share of your imported shape balances, with a two-purchase check for Active Drops discounts. This is a greedy recommendation, not a guaranteed optimal order or a farming-time estimate. Undiscovered shapes stay locked.</p>
  <p class="fountain-note">Drop-rate comparisons hold shape digits, Glunko kills and normal drop rate at imported values. Spending shapes can lower collector bonuses in-game. AFK uses drop rate × AFK gains only; combat, respawn and multikill are separate goals. Outside goals show the Cove multiplier, not your total account gain.</p>
  <p class="fountain-note">${saved.studyKnown?`Study discount: ${Math.max(0,saved.study-saved.purchases)} discounted purchases remaining (15% off).`:'Study data unavailable: the temporary 15% discount is not assumed.'} ${settings.goal==='ribbon'&&saved.ribbons===null?'Ribbon data is missing; ribbon purchases cannot be recommended.':''}</p>
  <div class="fountain-checklist"><label><input type="checkbox" data-compress ${settings.compress?'checked':''}> Compress consecutive upgrades</label><button type="button" data-undo ${done.length?'':'disabled'}>Undo last level</button><button type="button" data-reset ${done.length?'':'disabled'}>Reset checklist</button><span>${remaining.length} remaining purchases${settings.shape!=='all'?` · ${filtered.length} shown`:''}</span></div>
  ${done.length?'<p class="fountain-note">Checklist only: balances and gain totals still use the imported save. Import a fresh save after purchasing to recalculate.</p>':''}
  <div class="fountain-plan" aria-live="polite">${rows.length?`<table><thead><tr><th>Done</th><th>#</th><th>Buy in order</th><th>Level</th><th>Cost</th><th>Goal gain</th><th>Funding</th></tr></thead><tbody>${rows.map((a,i)=>`<tr class="${a.future?'fountain-future':''}"><td><button type="button" data-done="${i}" aria-label="Mark ${esc(a.name)} done">Done</button></td><td>${a.order}${a.orderEnd!==a.order?'–'+a.orderEnd:''}</td><td>${esc(a.name)}</td><td>${a.from} → ${a.to}</td><td>${money(a.cost,a.shape)}</td><td>${a.id===7&&settings.goal!=='discount'?'Cost preparation':countGoal?`+${a.to-a.from}`:'+'+pct(a.gain)}</td><td>${a.future?'Save for':'Available'}</td></tr>`).join('')}</tbody></table>`:'<p class="fountain-note">No purchases match this goal, budget and filter. Try another goal or a roadmap, or collect the required shape.</p>'}</div>
  ${result.funding.some(n=>n>0)?`<div class="fountain-funding"><h3>Extra shapes needed for the full plan</h3>${result.funding.map((n,i)=>n>0?`<span>${money(n,i)}</span>`:'').join('')}</div>`:''}
  <p class="fountain-note">Filters keep the full purchase order and totals. “Available” uses that shape’s balance after earlier planned spending; follow the order, including any preceding “Save for” steps.</p>
  <div class="fountain-controls">${['Gooey upgrades','Quartz upgrades'].map((n,i)=>`<button type="button" data-tab="${i}" aria-pressed="${settings.tab===i}">${n}</button>`).join('')}</div><div class="cove-upgrade-grid">${M.catalog.slice(settings.tab*12,settings.tab*12+12).filter(u=>settings.shape==='all'||u.shape===Number(settings.shape)).map(u=>`<button type="button" class="cove-upgrade-card${M.eligible(saved,u.id)?'':' is-missing'}" data-detail="${u.id}"><span><strong>${esc(u.name)}</strong><small>Lv ${saved.levels[u.id]}</small></span><em>${esc(M.description(saved,u.id))}</em><small>${money(M.cost(saved,u.id),u.shape)}</small>${!saved.balances[u.shape]?'<small>Find this shape to unlock</small>':''}</button>`).join('')}</div><section class="exp-card cove-detail detail-dismissed" aria-live="polite"></section></section>`;
  host.querySelector('form').onsubmit=e=>e.preventDefault();host.querySelectorAll('[name]').forEach(el=>el.onchange=()=>{settings[el.name]=el.name==='steps'?Number(el.value):el.value;if(el.name==='shape'&&el.value!=='all')settings.tab=Number(el.value)<6?0:1;draw();});
  host.querySelector('[data-compress]').onchange=e=>{settings.compress=e.target.checked;draw();};
  host.querySelectorAll('[data-done]').forEach(el=>el.onclick=()=>{done.push(...rows[Number(el.dataset.done)].keys);persist();draw();});
  host.querySelector('[data-undo]').onclick=()=>{done.pop();persist();draw();};host.querySelector('[data-reset]').onclick=()=>{done=[];persist();draw();};
  host.querySelectorAll('[data-tab]').forEach(el=>el.onclick=()=>{settings.tab=Number(el.dataset.tab);draw();});
  host.querySelectorAll('[data-detail]').forEach(el=>el.onclick=()=>{const id=Number(el.dataset.detail),u=M.catalog[id],panel=host.querySelector('.cove-detail');panel.innerHTML=`<button type="button" aria-label="Close Cove details">Close</button><h3>${esc(u.name)}</h3><p>Level ${saved.levels[id]} · ${esc(M.description(saved,id))}</p><p>Next level: ${money(M.cost(saved,id),u.shape)}</p><p>${id===23?'Reserved for a future skill; excluded from recommendations.':id===5?`${saved.ribbons??'Unknown'} empty ribbon slots remain. Only empty slots can receive a ribbon.`:id===7?'Costs divide by 1 + 3% × level. The planner checks this upgrade before goal purchases.':'Costs and bonuses reflect your imported save.'}</p>`;panel.classList.remove('detail-dismissed');panel.querySelector('button').onclick=()=>panel.classList.add('detail-dismissed');});
  shapePicker(host);
  afterRender();
 }
 draw();
}
root.CovePage={render};
})(typeof globalThis!=='undefined'?globalThis:this);
