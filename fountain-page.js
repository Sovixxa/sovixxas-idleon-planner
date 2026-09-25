(function(root){'use strict';
const M=root.FountainOptimizer,esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number.isFinite(n)?(n>=1e15?n.toExponential(2):n.toLocaleString(undefined,{maximumFractionDigits:2,notation:n>=1e6?'compact':'standard'})):'—';
const pct=n=>`${(n*100).toLocaleString(undefined,{maximumFractionDigits:3})}%`;
const defaults=()=>({goal:'income',target:'all',mode:'roadmap',active:true,overflow:false,marble:true,marbleLimitMode:'current',marbleLimit:1,marbleUnit:1000000,steps:100});
let previousRaw,settings=defaults(),water=0,payment='all',compressed=false,compressAll=false,checklistSignature='',completed=[],undoCounts=[];
const checklistKey='idleon-fountain-completed-v1';
const stepKey=a=>[a.water,a.index,a.kind,a.from+1].join(':');
function loadChecklist(signature){
 if(signature===checklistSignature)return;
 checklistSignature=signature;completed=[];undoCounts=[];
 try{const record=JSON.parse(localStorage.getItem(checklistKey)||'null');if(record?.signature===signature&&Array.isArray(record.steps))completed=[...new Set(record.steps.filter(k=>typeof k==='string'&&/^[0-2]:[0-9]{1,2}:(level|marble):[0-9]+$/.test(k)))].slice(-5000);const counts=record?.undoCounts;undoCounts=Array.isArray(counts)&&counts.every(n=>Number.isInteger(n)&&n>0)&&counts.reduce((a,b)=>a+b,0)===completed.length?counts:completed.map(()=>1);}catch{}
}
function persistChecklist(){try{localStorage.setItem(checklistKey,JSON.stringify({signature:checklistSignature,steps:completed,undoCounts}));}catch{}}
const icon=u=>`assets/HoleFountainUpg${u.water}_${u.index}.png`;
const money=(n,c)=>`${c<9?`<img src="assets/HoleFountainCoin${c}.png" alt="">`:''}${fmt(n)} ${M.currencies[c]}`;
const currencyIcon=value=>value==='all'?'':`<img src="assets/${value==='9'?'Marble':`HoleFountainCoin${Number(value)}`}.png" alt="">`;
function currencyPickers(host){
 host.querySelectorAll('select[data-payment-filter], select[name="target"]').forEach(select=>{
  const key=select.name==='target'?'target':'payment',label=key==='target'?'Currency':'Costs currency';
  const original=select.closest('label'),container=document.createElement('div');container.className='fountain-currency-control';
  original.replaceWith(container);container.append(...original.childNodes);
  select.hidden=true;select.tabIndex=-1;select.setAttribute('aria-hidden','true');
  const picker=document.createElement('details');picker.className='fountain-currency-picker';picker.dataset.currencyPicker=key;
  const selected=select.selectedOptions[0];
  picker.innerHTML=`<summary aria-label="${label}: ${esc(selected.textContent)}" aria-haspopup="listbox">${currencyIcon(selected.value)}<span>${esc(selected.textContent)}</span><span class="fountain-picker-arrow" aria-hidden="true">▾</span></summary><div role="listbox" aria-label="${label}">${[...select.options].map(option=>`<button type="button" role="option" data-currency-option="${option.value}" aria-selected="${option.selected}">${currencyIcon(option.value)}<span>${esc(option.textContent)}</span></button>`).join('')}</div>`;
  container.append(picker);
  const summary=picker.querySelector('summary'),options=[...picker.querySelectorAll('[role=option]')];
  summary.onkeydown=event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();picker.open=true;options[event.key==='ArrowUp'?options.length-1:Math.max(0,select.selectedIndex)].focus();}};
  picker.onkeydown=event=>{
   if(event.key==='Escape'){event.preventDefault();picker.open=false;summary.focus();}
   const index=options.indexOf(document.activeElement);
   if(index>=0&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?options.length-1:(index+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;options[next].focus();}
  };
  picker.addEventListener('focusout',event=>{if(!picker.contains(event.relatedTarget))picker.open=false;});
  options.forEach(option=>option.onclick=()=>{select.value=option.dataset.currencyOption;select.dispatchEvent(new Event('change',{bubbles:true}));host.querySelector(`[data-currency-picker="${key}"] summary`)?.focus({preventScroll:true});});
 });
}
if(typeof document!=='undefined')document.addEventListener('pointerdown',event=>document.querySelectorAll('.fountain-currency-picker[open]').forEach(picker=>{if(!picker.contains(event.target))picker.open=false;}));
const effectText=e=>`${e.lower?'−':'+'}${pct(e.lower?1-e.before/e.after:e.gain)} ${e.lower?'Minau costs':e.label}`;
function render(host,raw){
 if(raw!==previousRaw){previousRaw=raw;settings=defaults();water=0;payment='all';compressed=false;compressAll=false;}
 let saved;try{saved=M.decode(raw);}catch{}
 if(!saved){host.innerHTML='<section class="bonus-system-empty section-head"><h2>Fountain Upgrade Optimizer</h2><p>Import an IdleOn save with Fountain data to plan upgrades.</p></section>';return;}
 loadChecklist(JSON.stringify([raw?.charNames||[],saved]));
 let cachedPlan,cachedSettings;
 const draw=()=>{
  const settingsKey=JSON.stringify(settings);
  if(settingsKey!==cachedSettings){cachedPlan=M.plan(saved,{...settings,marbleBudget:settings.marbleLimitMode==='custom'?settings.marbleLimit*settings.marbleUnit:settings.marbleLimitMode});cachedSettings=settingsKey;}
  const result=cachedPlan,remaining=result.steps.filter(a=>!completed.includes(stepKey(a))),steps=remaining.filter(a=>payment==='all'||a.currency===Number(payment)),doneCount=result.steps.length-remaining.length,income=settings.goal==='income',outside=settings.goal==='outside',roadmap=settings.mode==='roadmap';
  const rows=M.recommendationRows(result.steps,{completed,payment,compress:compressAll?'all':compressed});
  const ready=steps.filter(a=>!a.future).length,needs=result.funding.map((n,c)=>({n,c})).filter(x=>x.n>0);
  const summary=settings.goal==='measurement'?`−${pct(1-1/(1+result.gain))} Minau costs`:`+${pct(result.gain)} ${outside?'balanced source score':income?'modeled income':M.goalLabel(settings)+' multiplier'}`;
  const info=income?'Compares coin value × fill speed for the selected currencies. All currencies uses an equal-weight geometric mean of the currency types currently enabled in your save.':outside?'Balances all 18 outside Fountain multipliers with equal weight. The score is their geometric mean; each row shows the actual affected multiplier.':settings.goal==='marbleIncome'?'Compares marble per fill × fill speed. Water Bender speeds up the marble bar while active; Fountain Filling only speeds up coins.':'Compares this Fountain bonus’s multiplier, not your total account stat. Other Fountain effects on the same system are not combined.';
  // Detach change handlers before replacing a focused input; blur can fire change again.
  host.querySelectorAll('[name]').forEach(input=>input.onchange=null);
  host.innerHTML=`<section class="fountain-page"><div class="bonus-system-hero"><div><p class="eyebrow">World 5 · The Hole</p><h2>Fountain Upgrade Optimizer</h2><p>${roadmap?'Long-term upgrade order, with purchases to save for.':'Affordable purchases using your imported balances.'}</p></div><strong>${esc(summary)}</strong></div>
   <div class="fountain-wallet">${saved.balances.map((n,c)=>`<span title="${n} ${M.currencies[c]}">${money(n,c)}</span>`).join('')}</div>
   ${root.FountainTimers.html(raw)}
   <form class="fountain-controls"><label>Goal <select name="goal">${M.goals.map(g=>`<option value="${g.id}" ${settings.goal===g.id?'selected':''}>${esc(g.label)}</option>`).join('')}</select></label>
   ${income?`<label>Currency <select name="target"><option value="all" ${settings.target==='all'?'selected':''}>All enabled currencies</option>${M.currencies.slice(0,9).map((n,i)=>`<option value="${i}" ${i===settings.target?'selected':''}>${n}${!M.targetOpen(saved,i)?' · locked':!M.activeCurrencies(saved).includes(i)?' · ignored':''}</option>`).join('')}</select></label>`:''}
   <label>Plan <select name="mode"><option value="roadmap" ${roadmap?'selected':''}>Long-term roadmap</option><option value="now" ${!roadmap?'selected':''}>Buy now</option></select></label>
   <label>Purchases <select name="steps">${[20,50,100,250,500].map(n=>`<option ${n===settings.steps?'selected':''}>${n}</option>`).join('')}</select></label>
   ${(income||settings.goal==='marbleIncome')?`<label><input type="checkbox" name="active" ${settings.active?'checked':''}> Active in Fountain</label>`:''}
   ${income?`<label><input type="checkbox" name="overflow" ${settings.overflow?'checked':''}> At full capacity</label>`:''}
   <label><input type="checkbox" name="marble" ${settings.marble?'checked':''}> Include marbleization</label>
   <label>Marble budget <select name="marbleLimitMode" ${settings.marble?'':'disabled'}><option value="current" ${settings.marbleLimitMode==='current'?'selected':''}>Current balance</option><option value="custom" ${settings.marbleLimitMode==='custom'?'selected':''}>Custom maximum</option><option value="unlimited" ${settings.marbleLimitMode==='unlimited'?'selected':''}>Unlimited</option></select></label>
   ${settings.marbleLimitMode==='custom'?`<label>Maximum <input aria-label="Maximum marble amount" name="marbleLimit" type="number" min="0" step="any" value="${settings.marbleLimit}" style="width:100px" ${settings.marble?'':'disabled'}></label><label>Units <select name="marbleUnit" ${settings.marble?'':'disabled'}>${[[1,'Marbles'],[1000,'Thousand (K)'],[1000000,'Million (M)'],[1000000000,'Billion (B)']].map(([v,label])=>`<option value="${v}" ${settings.marbleUnit===v?'selected':''}>${label}</option>`).join('')}</select></label>`:''}</form>
   ${settings.marble?`<p class="fountain-note" data-marble-budget>Marble spending in full plan: ${fmt(result.spent[9])}${settings.marbleLimitMode==='unlimited'?' (unlimited)':` / ${fmt(settings.marbleLimitMode==='current'?saved.balances[9]:settings.marbleLimit*settings.marbleUnit)} maximum`}. This caps total spending across all upgrades, including checked-off purchases. Other currencies can still use the long-term roadmap.</p>`:''}
   <div class="fountain-controls"><label>Costs currency <select data-payment-filter><option value="all" ${payment==='all'?'selected':''}>All currencies</option>${M.currencies.map((name,c)=>`<option value="${c}" ${payment===String(c)?'selected':''}>${name}</option>`).join('')}</select></label><span class="fountain-note">Filters the recommendation list and upgrade catalogue by purchase cost.</span></div>
   ${payment!=='all'?'<p class="fountain-note">Filtered view: row numbers keep the full purchase order. Other-currency steps may come first; gains and funding totals cover the full plan.</p>':''}
   <p class="fountain-note">${esc(info)}</p>
   <div class="fountain-checklist"><label><input type="checkbox" data-compress ${compressed?'checked':''}> Compress upgrades</label><label><input type="checkbox" data-compress-all ${compressAll?'checked':''}> Compress all</label><span>${compressAll?'All scattered purchases are grouped by upgrade. These are totals, not purchase order. Levels and marble tiers stay separate.':compressed?'Consecutive levels are combined. Done marks the entire displayed range.':'Click Done after buying a level in-game. Each level is tracked separately.'}</span><button type="button" data-undo-done ${completed.length?'':'disabled'}>Undo last</button><button type="button" data-reset-done ${completed.length?'':'disabled'}>Reset checklist</button></div>
   ${completed.length?'<p class="fountain-note">Checklist only: balances, costs and gain totals still use your imported save. Import a fresh save to update them; changed save data starts a new checklist.</p>':''}
   <div class="fountain-plan-summary"><strong>${payment==='all'?steps.length+' remaining purchases':steps.length+' shown · '+remaining.length+' remaining in full plan'}${doneCount?` · ${doneCount} done`:''}${compressed||compressAll?` · ${rows.length} rows`:''}</strong><span>${ready} can be bought in sequence now${roadmap?` · ${steps.length-ready} after saving`:''}</span></div>
   <div class="fountain-plan" aria-live="polite">${steps.length?`<table><thead><tr><th>Done</th><th>#</th><th>${compressAll?'Upgrade totals':'Buy in order'}</th><th>Level</th><th>Cost</th><th>Gain</th><th>Funding</th></tr></thead><tbody>${rows.map((a,i)=>`<tr class="${a.future?'fountain-future':''}"><td><button type="button" class="fountain-done" data-done="${a.keys[0]}" data-done-row="${i}" aria-label="Mark ${esc(a.name)} ${a.kind==='marble'?'marble tier':'level'} ${a.keys.length>1?`${a.from+1} through ${a.to}`:a.to} done">${a.keys.length>1?'Done all':'Done'}</button></td><td>${compressAll?i+1:a.startOrder}${!compressAll&&a.endOrder!==a.startOrder?'–'+a.endOrder:''}</td><td><button type="button" data-detail="${a.water*20+a.index}"><img src="${icon(a)}" alt=""><span>${esc(a.name)}<small>${M.waters[a.water]} · ${a.kind==='marble'?'Marbleize':'Upgrade'}</small></span></button></td><td>${a.from} → ${a.to}${a.keys.length>1?`<small>${a.keys.length} purchases</small>`:''}${compressAll&&a.to-a.from>a.keys.length?`<small>${a.to-a.from-a.keys.length} already done within range</small>`:''}</td><td class="fountain-money" title="${a.cost} ${M.currencies[a.currency]}">${money(a.cost,a.currency)}</td><td>${compressAll?'See ordered plan':a.effects.length?esc(effectText(a.effects[0])):`+${pct(a.gain)}`}<small>${compressAll?'Gains depend on order':a.effects.length?'Fountain source effect':settings.goal==='marbleIncome'?'Marble production':'Modeled income'}</small></td><td>${compressAll?`${a.readyCount} in funded sequence · ${a.futureCount} after saving<small>${a.shortfall>0?'Save '+money(a.shortfall,a.currency)+' more':'Follow ordered plan'}</small>`:a.shortfall>0?`Save ${money(a.shortfall,a.currency)} more`:a.future?'After earlier steps':'Buy now'}</td></tr>`).join('')}</tbody></table>`:`<p>${remaining.length?'No remaining recommendations cost '+esc(M.currencies[Number(payment)])+'. Choose All currencies to see the other steps.':doneCount?'All purchases in this plan are checked off.':esc(result.reason)}</p>`}</div>
   ${needs.length?`<div class="fountain-funding"><strong>Additional currency needed for the full roadmap${doneCount?' (including checked-off steps)':''}</strong><p>${needs.map(({n,c})=>money(n,c)).join(' · ')}</p><small>Not in your current balance. No earning rate or completion time is assumed.</small></div>`:''}
   ${result.effects.length?`<details class="fountain-effects"><summary>Outside bonus changes (${result.effects.length})</summary><div class="fountain-effect-grid">${result.effects.map(e=>`<p><strong>${esc(effectText(e))}</strong><span>${fmt(e.before)}× → ${fmt(e.after)}× Fountain multiplier</span></p>`).join('')}</div></details>`:''}
   <details class="fountain-assumptions"><summary>Accuracy and planning method</summary><p>Costs, prerequisite levels, rounded bonuses, marbleization and currency formulas are checked against the supplied game client. Each purchase is recalculated at its projected level. Minau shows the actual cost reduction, not the larger efficiency percentage.</p><p>The order is a greedy recommendation: gain divided by the share of the payment currency budget spent. Currency budgets stay separate. Affordable purchases come first. After additional funding is required, ranking uses the original wallet as its budget reference (minimum 1 unit), and every required top-up is recorded. This is not a globally optimal plan or a time-to-goal estimate.</p><p>Income comparisons hold enabled currency types, saved desire, lucky coins and duck stacks constant. They exclude future lucky/duck rolls, royal-stack randomness, storage capacity and indirect account changes. Outside goals show direct Fountain multipliers; unlocks, caps, monument interactions and other account bonuses can change the final account result. Prerequisites with no immediate benefit are not automatically purchased. Your save is never changed.</p></details>
   <div class="fountain-catalog-head"><h3>All upgrades</h3><div class="skill-tabs">${M.waters.map((name,i)=>`<button type="button" class="skill-tab ${water===i?'active':''}" data-water="${i}">${name}${M.waterOpen(saved,i)?'':' · locked'}</button>`).join('')}</div></div>
   <div class="fountain-grid compact-upgrades">${M.catalog.filter(u=>u.water===water&&(payment==='all'||(payment==='9'?u.marbleEligible:u.currency===Number(payment)))).map(u=>`<button type="button" class="arcade-tile ${M.unlocked(saved,u)?'':'arcade-zero'}" data-detail="${u.water*20+u.index}"><img class="arcade-icon" src="${icon(u)}" alt=""><span class="arcade-name">${esc(u.name)}</span><strong>Lv ${saved.levels[u.water][u.index]} · M${saved.marbles[u.water][u.index]}</strong><small>${M.unlocked(saved,u)?(payment==='9'?'Marbleize · '+money(M.cost(saved,u,'marble'),9):money(M.cost(saved,u),u.currency)):'Locked'}</small><span class="upgrade-tip"><strong>${esc(u.name)}</strong><span>${esc(description(saved,u))}</span></span></button>`).join('')||'<p class="fountain-note">No upgrades in this water tier use this currency. Choose another water tier or All currencies.</p>'}</div>
   <section class="exp-card upgrade-detail detail-dismissed fountain-detail" aria-live="polite"></section></section>`;
  const redrawChecklist=()=>{const box=host.querySelector('.fountain-plan'),top=box?.scrollTop||0,left=box?.scrollLeft||0;draw();const next=host.querySelector('.fountain-plan');next.scrollTop=top;next.scrollLeft=left;};
  host.querySelectorAll('[data-done]').forEach(button=>button.onclick=()=>{const keys=rows[Number(button.dataset.doneRow)].keys.filter(key=>!completed.includes(key));if(keys.length){completed.push(...keys);undoCounts.push(keys.length);persistChecklist();redrawChecklist();host.querySelector('[data-done], [data-undo-done]')?.focus({preventScroll:true});}});
  host.querySelector('[data-undo-done]').onclick=()=>{completed.splice(-undoCounts.pop());persistChecklist();redrawChecklist();};
  host.querySelector('[data-reset-done]').onclick=()=>{completed=[];undoCounts=[];persistChecklist();redrawChecklist();};
  host.querySelector('[data-compress-all]').onchange=e=>{compressAll=e.target.checked;if(compressAll)compressed=false;draw();};
  host.querySelector('[data-compress]').onchange=e=>{compressed=e.target.checked;if(compressed)compressAll=false;draw();};
  host.querySelector('[data-payment-filter]').onchange=e=>{payment=e.target.value;draw();};
  host.querySelector('form').onsubmit=e=>e.preventDefault();
  host.querySelectorAll('[name]').forEach(input=>input.onchange=()=>{if(input.type==='number'&&(!input.checkValidity()||input.value===''||!Number.isFinite(Number(input.value)*settings.marbleUnit))){input.reportValidity();return;}settings[input.name]=input.type==='checkbox'?input.checked:['steps','target','marbleLimit','marbleUnit'].includes(input.name)&&input.value!=='all'?Number(input.value):input.value;draw();});
  host.querySelectorAll('[data-water]').forEach(button=>button.onclick=()=>{water=Number(button.dataset.water);draw();});
  host.querySelectorAll('[data-detail]').forEach(button=>button.onclick=()=>{
   const u=M.catalog[Number(button.dataset.detail)],panel=host.querySelector('.fountain-detail'),p=M.catalog[u.water*20+u.prerequisite];
   const requirement=!M.waterOpen(saved,u.water)?`Unlock ${M.waters[u.water]} Water first.`:M.unlocked(saved,u)?'Available':`Requires ${p.name} Lv ${u.water===0&&[2,14].includes(u.index)?1:10} (saved Lv ${saved.levels[u.water][u.prerequisite]}).`;
   panel.innerHTML=`<button type="button" class="secondary" aria-label="Close Fountain details">Close</button><h3><img src="${icon(u)}" alt="">${esc(u.name)}</h3><p>${esc(description(saved,u))}</p><p>Imported save: ${M.waters[u.water]} · Lv ${saved.levels[u.water][u.index]} · Marble ${saved.marbles[u.water][u.index]}</p><p>${esc(requirement)}</p><p>Next saved level: ${money(M.cost(saved,u),u.currency)}</p><p>${u.marbleEligible?`Next saved marbleization: ${money(M.cost(saved,u,'marble'),9)}`:'Cannot be marbleized.'}</p>`;
   panel.classList.remove('detail-dismissed');panel.querySelector('button').onclick=()=>panel.classList.add('detail-dismissed');
  });
  currencyPickers(host);
  host.bonusAfterRender?.();
 };
 draw();
}
function description(s,u){const b=M.bonus(s,u.water,u.index);return u.description.replaceAll('}x',`${fmt(1+b/100)}×`).replaceAll('{',fmt(b)).replaceAll('@',' ').replace(/\s+/g,' ').replace(/\$|\^|#/g,'…');}
const prior=root.BonusSystems.render;
root.BonusSystems={...root.BonusSystems,render(host,key,raw={}){if(key==='holeFountain')return render(host,raw);return prior(host,key,raw);}};
root.FountainPage={render};
})(window);
