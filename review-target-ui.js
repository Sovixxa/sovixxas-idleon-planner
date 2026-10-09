(function(root){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>!Number.isFinite(v)?'—':Math.abs(v)>=1e12?Number(v).toExponential(3):v.toLocaleString('en-US',{maximumFractionDigits:3});
const link=(page,label='Open')=>`<button type="button" class="secondary" data-review-target-page="${esc(page)}">${esc(label)}</button>`;
const change=c=>`${esc(c.displayFrom||fmt(c.from)+' '+c.unit)} → ${esc(c.displayTo||fmt(c.to)+' '+c.unit)}`;
let retained=null,activeDispose=null;
const scanNotice=p=>p.quick?`<p class="loadout-note" data-quick-notice><strong>Quick plan${p.partial?' · partial scan':''}.</strong> ${p.tested} upgrade scenarios compared${p.candidates?' out of '+p.candidates:''}. Every displayed gain is recalculated from your save. ${p.partial?'More upgrades remain unchecked or the route is unfinished. Continue the quick scan or run a full comparison; this is not a limit on your account.':'This is a possible route, not a cheapest-upgrade guarantee.'}</p>`:'';
const requirements=c=>`<details class="drop-target-step-details"><summary>Requirements${c.refills?.length?' & food':''}</summary><ul>${c.requirements.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></details>`;
function audit(p){return `${p.rows.length?`<details class="drop-target-audit review-target-audit"><summary>Bonus sources · ${p.rows.length} formula inputs</summary><p>These are inputs in their native formula groups, not separate gains to add together. Zero entries remain visible for missing or inactive bonuses. The system audit below distinguishes simulated upgrades from setup checks.</p><label>Find a source<input type="search" data-review-source-search placeholder="Meal, talent, stamp…"></label><div class="carry-table-wrap"><table class="carry-table"><thead><tr><th>Source</th><th>Saved input</th><th>Formula group / detail</th></tr></thead><tbody>${p.rows.map(r=>`<tr data-review-source-row><th>${esc(r.name)}</th><td>${fmt(r.value)}${esc(r.unit||'')}</td><td>${esc(r.stage||'Input')}${r.detail?`<details><summary>Details</summary>${esc(r.detail)}</details>`:''}</td></tr>`).join('')}</tbody></table></div></details>`:''}<details class="drop-target-audit"><summary>Verified upgrade systems · ${p.families.filter(f=>f.positive>0).length} ${p.families.filter(f=>f.positive>0).length===1?'family':'families'}</summary><div class="carry-table-wrap"><table class="carry-table"><thead><tr><th>System</th><th>Upgrade coverage</th><th>Requirements & scope</th></tr></thead><tbody>${p.families.filter(f=>f.positive>0).map(f=>`<tr><th>${esc(f.name)}</th><td>${f.tested!==undefined?`${f.tested} compared · ${f.positive} positive`:f.candidates?`${f.candidates} candidate milestones`:'Setup / acquisition review'}</td><td><details><summary>Scope</summary><p>${esc(f.detail)}</p>${link(f.page)}</details></td></tr>`).join('')}</tbody></table></div></details><details class="drop-target-audit"><summary>Planning limits and setup checks</summary><ul>${p.notes.map(t=>`<li>${esc(t)}</li>`).join('')}</ul><p>${esc(p.note)}</p></details>`;}
function routeSteps(steps,unit){return steps.map(c=>`<li><div class="drop-target-step-row"><div class="drop-target-step-name"><strong>${root.UpgradeIcons.html(c)}</strong><span>${change(c)}</span></div><div class="drop-target-step-gain"><strong>${c.relative==null?'+'+fmt(c.gain)+(unit==='% gain'?' pp':''):'+'+fmt(c.relative)+'%'}</strong><span>${fmt(c.after)}${esc(unit)} projected</span></div>${link(c.page)}</div>${requirements(c)}</li>`).join('');}
function accountHtml(p,planned){
 const intro=p.sharedGain?'Shared upgrades only · target improvement over your current save.':p.shared?'Shared account metric — counted once.':'The target applies to each eligible character. Routes are independent; shared upgrades may repeat. Re-import after making changes.';
 const heading=planned?(p.reached?(p.results.every(r=>r.result.before>=p.target)?'Target already reached':p.shared?'Path to your target':'Paths to your target'):'Account Wide upgrade plan'):'Account Wide';
 return `<h3>${heading}</h3>${planned?scanNotice(p):''}<p class="drop-target-caption">${intro}</p>${p.results.map((r,i)=>p.shared?`<div data-account-result="${i}">${planned?resultHtml({...r.result,quick:false}).replace(/^<h3>.*?<\/h3>/,''):descriptionHtml(r.result)}</div>`:`<details class="drop-target-audit"><summary>${esc(r.name)} · Current: ${fmt(planned?r.result.before:r.result.value)}${esc(p.unit)}${planned?' → '+fmt(r.result.after)+esc(p.unit):''}</summary><div data-account-result="${i}">${planned?resultHtml({...r.result,quick:false}).replace(/^<h3>.*?<\/h3>/,''):descriptionHtml(r.result)}</div></details>`).join('')}${p.excluded.length?`<details class="drop-target-audit"><summary>${p.excluded.length} characters unavailable for this metric</summary><ul>${p.excluded.map(e=>`<li>${esc(e.name)}: ${esc(e.error)}</li>`).join('')}</ul></details>`:''}`;
}

function primaryStatsHtml(p){if(!p.primaryStats)return '';const planned=!!p.beforePrimaryStats;return `<section data-primary-stats aria-label="All four stats"><h4>STR · WIS · AGI · LUK</h4><p class="drop-target-caption">${p.sharedGain?'Average stat totals per eligible saved character. The target is the average percentage gain in their combined total.':'The target uses STR + WIS + AGI + LUK. Each stat does not need to reach the target individually.'}</p><div class="carry-table-wrap"><table class="carry-table"><thead><tr><th>Stat</th><th>Current</th>${planned?'<th>After this plan</th><th>Change</th>':''}</tr></thead><tbody>${p.primaryStats.map(stat=>{const before=p.beforePrimaryStats?.find(s=>s.id===stat.id)?.value??stat.value;return `<tr><th>${esc(stat.label)}</th><td>${fmt(before)}</td>${planned?`<td>${fmt(stat.value)}</td><td>${stat.value-before>=0?'+':''}${fmt(stat.value-before)}</td>`:''}</tr>`;}).join('')}</tbody></table></div></section>`;}
function descriptionHtml(p){return p.accountWide?accountHtml(p,false):p.sharedGain?'<p class="drop-target-caption">Enter the percentage improvement you want from shared upgrades, such as 10 for +10%.</p>'+primaryStatsHtml(p):`<p><strong>Current: ${fmt(p.value)}${esc(p.unit)}</strong> · Saved output for this stat</p>${primaryStatsHtml(p)}${audit(p)}`;}
function resultHtml(p){if(p.accountWide)return accountHtml(p,true);const tags=p.options.filter(c=>c.group==='nametags'&&c.gain>0),n=p.options.filter(c=>c.group!=='nametags'&&c.gain>0).length;
 return `<h3>${p.before>=p.target?'Target already reached':p.reached?'Path to your target':p.partial?'Quick plan · scan unfinished':'More progression needed to reach this target'}</h3>${scanNotice(p)}<div class="drop-target-summary"><p>Current<br><strong>${fmt(p.before)}${esc(p.unit)}</strong></p><p>After this plan<br><strong>${fmt(p.after)}${esc(p.unit)}</strong>${p.before&&!p.sharedGain?`<br>+${fmt(100*(p.after/p.before-1))}%`:''}</p><p>Your target<br><strong>${fmt(p.target)}${esc(p.unit)}</strong></p></div>${primaryStatsHtml(p)}${!p.reached?`<p>${fmt(p.target-p.after)}${esc(p.unit)} remains after the milestones checked. <strong>This is not your account’s maximum.</strong> ${p.limited?'This component is capped; choose another metric to explore the other parts of this goal.':'Further levels, unlocks and setup changes can still help. Review the source and system audits below.'}</p>`:''}${p.steps.length?`<h4>Upgrade route <small>(${p.steps.length} ${p.steps.length===1?'step':'steps'})</small></h4><ol class="drop-target-steps">${routeSteps(p.steps.slice(0,10),p.unit)}</ol>${p.steps.length>10?`<details class="drop-target-audit"><summary>Show remaining ${p.steps.length-10} steps</summary><ol class="drop-target-steps" start="11">${routeSteps(p.steps.slice(10),p.unit)}</ol></details>`:''}<p class="drop-target-caption">Complete each step’s requirements, then re-import. Projections include the listed farming and unlocks; costs and time are not budgeted.</p>`:''}
 ${!p.id.startsWith('unlock:')&&p.id!=='accountLevels'?`<section aria-label="Optional nametag upgrades"><details class="drop-target-audit"><summary>Nametags · ${tags.length} gem-shop / time-gated improvements</summary><p>Independent comparisons, excluded from the route and projected total.</p>${tags.length?tags.map(c=>`<div class="review-target-tag"><strong>${root.UpgradeIcons.html(c)}</strong> · ${change(c)} · +${fmt(p.sharedGain?c.gain:c.relative)}%${requirements(c)}</div>`).join(''):p.partial?'<p>Nametags have not been fully compared in this quick scan.</p>':p.tested?'<p>No positive next-grade nametag scenario was found for this metric in this save.</p>':'<p>No upgrade comparisons were needed for this target. Nametags have not been compared.</p>'}${link('nametags','Open Nametag Gallery')}</details></section>`:''}
 <details class="drop-target-audit"><summary>Compare upgrades · ${n} positive / ${p.tested} tested</summary><p>Each comparison starts from the current save. Combined gains are recalculated in the route above. Changes below 0.01% stay here unless they reach the target. A zero gain can mean the source is inactive, capped, affects another metric, or needs another unlock.</p><div class="review-target-filters"><label>Find an upgrade<input type="search" data-review-option-search placeholder="Mason Jar, meal, talent…"></label><label><input type="checkbox" data-review-option-all> Include reductions</label></div><div data-review-option-table></div></details>${audit(p)}${p.issues.length?`<details class="drop-target-audit"><summary>${p.issues.length} scenarios could not be verified</summary><ul>${p.issues.map(i=>`<li>${esc(i.name)}: ${esc(i.error)}</li>`).join('')}</ul></details>`:''}`;
}
function bind(box,p){
 if(p.accountWide){p.results.forEach((r,i)=>bind(box.querySelector(`[data-account-result="${i}"]`),r.result));return;}
 box.querySelectorAll('[data-review-target-page]').forEach(b=>b.onclick=()=>root.dispatchEvent(new CustomEvent('idleon:navigate',{detail:b.dataset.reviewTargetPage})));
 const search=box.querySelector('[data-review-source-search]');if(search)search.oninput=()=>{const q=search.value.toLowerCase();box.querySelectorAll('[data-review-source-row]').forEach(r=>r.hidden=!r.textContent.toLowerCase().includes(q));};
 if(!p.options)return;let page=0;
 const query=box.querySelector('[data-review-option-search]'),all=box.querySelector('[data-review-option-all]'),table=box.querySelector('[data-review-option-table]');
 function paint(){const options=p.options.filter(c=>c.group!=='nametags'&&(all.checked?c.gain!==0:c.gain>0)&&`${c.name} ${c.system}`.toLowerCase().includes(query.value.toLowerCase())),pages=Math.max(1,Math.ceil(options.length/20));page=Math.min(page,pages-1);
  table.innerHTML=`<div class="carry-table-wrap"><table class="carry-table"><thead><tr><th>Upgrade</th><th>Target</th><th>Gain</th><th>Requirements</th></tr></thead><tbody>${options.slice(page*20,page*20+20).map(c=>`<tr><th>${root.UpgradeIcons.html(c)}</th><td>${change(c)}</td><td>${c.gain>0?'+':''}${fmt(c.gain)}${esc(p.unit)}${p.sharedGain?'':'<br>'+fmt(c.relative)+'%'}</td><td>${requirements(c)}${link(c.page)}</td></tr>`).join('')||'<tr><td colspan="4">No matching upgrades.</td></tr>'}</tbody></table></div><div class="review-pagination"><button type="button" class="secondary" data-option-prev ${page===0?'disabled':''}>Previous</button><span>${options.length} options · ${page+1} / ${pages}</span><button type="button" class="secondary" data-option-next ${page+1>=pages?'disabled':''}>Next</button></div>`;
  table.querySelector('[data-option-prev]').onclick=()=>{page--;paint();};table.querySelector('[data-option-next]').onclick=()=>{page++;paint();};table.querySelectorAll('[data-review-target-page]').forEach(b=>b.onclick=()=>root.dispatchEvent(new CustomEvent('idleon:navigate',{detail:b.dataset.reviewTargetPage})));
 }
 query.oninput=all.onchange=()=>{page=0;paint();};paint();
}
function mount(box,raw,goal){
 activeDispose?.();
 const choices=root.ReviewTargetMetrics.metrics.filter(m=>m.goals.includes(goal));
 if(!choices.length){box.textContent='Choose a supported goal.';return;}
 let worker,initialized=false,serial=0,pending,disposed=false,debounce,current,characters=[],busy=false,operationSerial=0,rejectFull,routeBatch;
 const fullChildren=new Set(),workerPreferenceKey='idleon.review.workers.v1',workerLimit=Math.min(8,Math.max(1,Math.floor(Number(root.navigator?.hardwareConcurrency)||2)-1));
 let workerPreference='auto';try{const saved=root.localStorage.getItem(workerPreferenceKey);if(saved!==null&&saved!=='auto'&&Number.isInteger(Number(saved))&&Number(saved)>0)workerPreference=String(Math.min(workerLimit,Number(saved)));}catch{}
 if(retained){if(retained.raw===raw){worker=retained.worker;initialized=true;}else retained.worker.terminate();retained=null;}
 function stop(){operationSerial++;for(const child of fullChildren)child.terminate();fullChildren.clear();rejectFull?.(Error('Cancelled'));rejectFull=null;worker?.terminate();worker=null;initialized=false;if(pending){pending.reject(Error('Cancelled'));pending=null;}busy=false;}
 function request(q){if(!worker)worker=new Worker('review-target-worker.js');worker.onmessage=e=>{const m=e.data;if(!pending||m.id!==pending.id)return;if(m.routeBatch){const active=worker;Promise.resolve().then(()=>routeBatch(m.routeBatch)).then(results=>{if(worker===active&&pending?.id===m.id)active.postMessage({id:m.id,action:'routeResults',results});},error=>{if(worker===active&&pending?.id===m.id){pending.reject(error);pending=null;stop();controls(false);status.textContent=error.message;}});return;}if(m.progress){const p=m.progress;status.textContent=`${p.phase==='compare'?'Comparing sources':'Building combined route'}: ${p.current}/${p.total}${p.workers?` · ${p.workers} worker${p.workers===1?'':'s'}`:''} · ${p.name}`;return;}const done=pending;pending=null;m.error?done.reject(Error(m.error)):done.resolve(m.result);};worker.onerror=e=>{const message=e.message||'Calculation failed.';pending?.reject(Error(message));pending=null;stop();controls(false);status.textContent=message;};
  return new Promise((resolve,reject)=>{const id=++serial;pending={id,resolve,reject};worker.postMessage({...q,id,...(!initialized?{raw}:{})});initialized=true;});
 }
 async function fullRequest(q,operation){
  const context=await request({...q,action:'prepareFull'});
  if(disposed||!busy||operation!==operationSerial)throw Error('Cancelled');
  const cores=root.navigator?.hardwareConcurrency||2,memory=root.navigator?.deviceMemory||8;
  const chosen=form.elements.workers.value;
  const jobs=Math.max(context.candidates.length,context.routeCandidates||0);
  const count=chosen==='auto'?Math.min(memory<=4?2:3,Math.max(1,cores-1),Math.ceil(jobs/16)):Math.min(workerLimit,Math.max(1,Number(chosen)||1),jobs);
  // Auto avoids extra engine initialization for small scans; manual choices are honored up to the remaining job count.
  if(count<2)return request(q);
  let completed=0,next=0,readyCount=0,ownReject;const children=new Set(),comparisons=new Array(context.candidates.length);
  try{
   await new Promise((resolve,reject)=>{
    ownReject=reject;rejectFull=reject;
    const assign=child=>{if(next<context.candidates.length){const index=next++;child.postMessage({index,candidate:context.candidates[index]});}};
    for(let i=0;i<count;i++){
     const child=new Worker('review-target-compare-worker.js');fullChildren.add(child);children.add(child);
     child.onerror=e=>reject(Error(e.message||'A comparison worker could not load. Please retry.'));
     child.onmessage=({data:m})=>{
      if(disposed||operation!==operationSerial)return;
      if(m.error){reject(Error(m.error));return;}
      if(m.ready){readyCount++;assign(child);if(completed===context.candidates.length&&readyCount===count)resolve();return;}
      if(comparisons[m.index])return;
      comparisons[m.index]=m.result;completed++;
      status.textContent=`Comparing upgrades: ${completed}/${context.candidates.length} · ${count} workers · ${context.candidates[m.index].name}`;
      if(completed===context.candidates.length&&readyCount===count)resolve();else assign(child);
     };
     const {candidates,...smallContext}=context;child.postMessage({init:true,raw,context:smallContext});
    }
   });
   if(disposed||!busy||operation!==operationSerial)throw Error('Cancelled');
   routeBatch=batch=>new Promise((resolve,reject)=>{
    ownReject=reject;rejectFull=reject;
    const results=new Array(batch.candidates.length);let finished=0;
    const {candidates,...scenario}=batch;
    [...children].slice(0,candidates.length).forEach((child,index)=>{
     child.onerror=e=>reject(Error(e.message||'A route worker failed. Please retry.'));
     child.onmessage=({data:m})=>{
      if(disposed||operation!==operationSerial)return;
      if(m.error){reject(Error(m.error));return;}
      results[m.index]=m.result;if(++finished===candidates.length)resolve(results);
     };
     child.postMessage({index,route:scenario,candidate:candidates[index]});
    });
   });
   status.textContent=`Recalculating the combined upgrade route · ${count} workers…`;
   return await request({...q,action:'finishFull',context,comparisons,workers:count});
  }finally{for(const child of children){child.terminate();fullChildren.delete(child);}if(rejectFull===ownReject)rejectFull=null;routeBatch=null;}
 }
 box.className='carry-empty review-target-calculator';
 box.innerHTML=`<h3>Target calculator</h3><p class="drop-target-caption">Choose what to improve, then enter your target.</p><form class="loadout-controls review-target-controls"><label>Scope<select name="character" aria-label="Calculator character" disabled></select></label><label>Metric<select name="metric" aria-label="Target metric" disabled>${choices.map(m=>`<option value="${esc(m.id)}">${esc(m.label)}${m.unit?' ('+esc(m.unit)+')':''}</option>`).join('')}</select></label><label data-yield-label hidden>Measured resource yield / hour<input name="yield" type="number" min="0.000001" step="any" placeholder="From in-game AFK info"></label><label><span data-target-label>Target</span> <span data-target-unit></span><input name="target" type="number" min="0.000001" step="any" required aria-label="Target value"></label><button type="submit" class="secondary" disabled>Calculate upgrades</button><label class="review-worker-control" title="Full comparison and combined route. More workers use more CPU and memory.">Workers<select name="workers" data-qol-ignore aria-label="Full comparison workers"><option value="auto">Auto</option>${Array.from({length:workerLimit},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('')}</select></label><button type="submit" class="secondary" data-full disabled>Full comparison</button><button type="button" class="secondary" data-cancel hidden>Cancel</button></form><p class="drop-target-caption" data-metric-note></p><details class="drop-target-method"><summary>How this plan works</summary><p>Calculate upgrades runs a short quick scan. Continue it for more options, or choose Full comparison to check the entire catalogue using parallel workers when available. Full comparison uses the selected workers for both source comparisons and combined-route checks. The route checks upcoming upgrades together and recalculates them after each accepted step. Auto selects a conservative count; a manual choice allows 1–${workerLimit} on this device (maximum 8). More workers use more CPU and memory and may not be faster. Your choice is saved on this browser. Both modes verify gains by recalculating the saved account, including shared amplifiers. The route ranks gains among the upgrades checked, not price or time, and retains the saved setup. Farming, point and acquisition requirements are shown per step. Nametags remain separate. Expand the source and system audits to see coverage and setup checks.</p></details><p class="drop-target-caption" data-target-status role="status">Loading account…</p><div data-target-result></div>`;
 const form=box.querySelector('form'),status=box.querySelector('[data-target-status]'),output=box.querySelector('[data-target-result]'),button=form.querySelector('[type=submit]'),full=form.querySelector('[data-full]'),cancel=form.querySelector('[data-cancel]');
 form.elements.workers.value=workerPreference;
 form.elements.workers.onchange=()=>{try{root.localStorage.setItem(workerPreferenceKey,form.elements.workers.value);}catch{}};
 const def=()=>choices.find(m=>m.id===form.elements.metric.value),settings=()=>({yieldPerHour:def().measured?Number(form.elements.yield.value):0});
 function controls(loading){busy=loading;form.elements.workers.disabled=loading;button.disabled=full.disabled=loading||!current;cancel.hidden=!loading||!current;form.elements.target.disabled=loading&&!current;}
 function metricLabels(){const d=def(),account=form.elements.character.value==='all',gain=account&&!['printing','kitchens','recipes','research','bits','power','accountLevels'].includes(d.id)&&!d.id.startsWith('unlock:');
  for(const option of form.elements.metric.options){const m=choices.find(x=>x.id===option.value),g=account&&!['printing','kitchens','recipes','research','bits','power','accountLevels'].includes(m.id)&&!m.id.startsWith('unlock:');option.textContent=m.label+(g?' · shared upgrades (% gain)':m.unit?' ('+m.unit+')':'');option.disabled=account&&!!m.measured;}
  box.querySelector('[data-target-label]').textContent=gain?'Target improvement':'Target';box.querySelector('[data-yield-label]').hidden=!d.measured;form.elements.yield.required=!!d.measured;box.querySelector('[data-target-unit]').textContent=gain?'%':d.unit;box.querySelector('[data-metric-note]').textContent=gain?'Calculate a single plan from shared bonus upgrades. Personal upgrades are excluded.':d.note;form.elements.target.step=d.integer?'1':'any';form.elements.target.min=d.integer?'1':'0.000001';}
 async function baseline(){
  const token=++serial;current=null;controls(true);metricLabels();button.textContent='Calculate upgrades';output.innerHTML='';
  if(def().measured&&form.elements.character.value==='all'){status.textContent='Choose an individual character and enter their measured resource yield per hour.';controls(false);return;}
  if(def().measured&&!(settings().yieldPerHour>0)){status.textContent='Enter measured resource yield per hour to calculate sample size.';controls(false);return;}
  status.textContent='Calculating current bonuses…';
  try{const p=await request({action:'describe',character:form.elements.character.value,metric:def().id,settings:settings()});if(disposed||token!==serial-1)return;current=p;box.querySelector('[data-metric-note]').textContent=p.accountWide&&!p.overview?p.results[0].result.note:def().note;form.elements.target.value=String(p.sharedGain?10:p.integer?Math.max(1,Math.ceil(p.value*1.1)):Math.max(.01,p.value*1.1));output.innerHTML=descriptionHtml(p);bind(output,p);status.textContent='';}
  catch(e){if(e.message!=='Cancelled'&&!disposed)status.textContent=e.message;}
  finally{if(!disposed)controls(false);}
 }
 form.elements.metric.onchange=form.elements.character.onchange=form.elements.yield.oninput=()=>{if(pending||fullChildren.size)stop();clearTimeout(debounce);current=null;button.disabled=full.disabled=true;output.innerHTML='';if(form.elements.character.value==='all'&&def().measured)form.elements.metric.value=choices.find(m=>!m.measured).id;metricLabels();debounce=setTimeout(baseline,250);};
 form.elements.target.oninput=()=>{if(busy){stop();controls(false);}output.innerHTML='';status.textContent='Target changed. Calculate to update the plan.';};
 cancel.onclick=()=>{stop();controls(false);status.textContent='Calculation cancelled. Your imported save is unchanged.';};
 form.onsubmit=async e=>{e.preventDefault();clearTimeout(debounce);if(!current||!form.reportValidity())return;if(busy)stop();controls(true);const mode=e.submitter===full?'full':'quick';status.textContent=mode==='full'?'Comparing all supported source families…':'Finding a quick, verified upgrade route…';output.innerHTML='';const operation=++operationSerial;
  try{const query={action:'plan',mode,character:form.elements.character.value,metric:def().id,target:Number(form.elements.target.value),settings:settings()},p=await (mode==='full'?fullRequest(query,operation):request(query));if(disposed||operation!==operationSerial)return;output.innerHTML=resultHtml(p);bind(output,p);button.textContent=p.partial?'Continue quick scan':'Calculate upgrades';status.textContent=`${p.quick?'Quick plan · ':''}${p.tested} scenarios compared${p.partial?' · unfinished; more upgrades remain to check':''}${p.issues.length?' · '+p.issues.length+' excluded':''}.`;}
  catch(e){if(e.message!=='Cancelled'&&!disposed)status.textContent=e.message;}
  finally{if(!disposed&&operation===operationSerial)controls(false);}
 };
 const dispose=()=>{if(disposed)return;disposed=true;clearTimeout(debounce);if(worker&&!pending&&!fullChildren.size){retained?.worker.terminate();retained={raw,worker};worker=null;}else stop();observer.disconnect();};
 const observer=new MutationObserver(()=>{if(!box.isConnected)dispose();});observer.observe(box.parentNode,{childList:true,subtree:true});activeDispose=dispose;
 request({action:'init'}).then(p=>{if(disposed)return;characters=p.characters;form.elements.character.innerHTML='<option value="all">Account Wide</option>'+characters.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');form.elements.character.disabled=false;form.elements.metric.disabled=false;baseline();}).catch(e=>{if(!disposed)status.textContent=e.message;});
}
root.ReviewTargetUI={mount,resultHtml,release:()=>activeDispose?.()};
})(typeof window!=='undefined'?window:globalThis);
