(function(root){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:1}):'—';
const duration=s=>s<60?`${fmt(s)} sec`:s<3600?`${fmt(s/60)} min`:`${fmt(s/3600)} hr`;
const cache=new WeakMap(),requests=new WeakMap();
function load(raw){
 if(cache.has(raw))return cache.get(raw);
 const promise=new Promise((resolve,reject)=>{
  const worker=new Worker('refinery-planner-worker.js');
  const timer=setTimeout(()=>finish(Error('Calculation timed out. Import a full export and retry.')),60000);
  function finish(error,result){clearTimeout(timer);worker.terminate();error?reject(error):resolve(result);}
  worker.onmessage=e=>finish(e.data.error?Error(e.data.error):null,e.data.result);
  worker.onerror=()=>finish(Error('The refinery calculator could not load. Refresh and retry.'));
  worker.postMessage(raw);
 });cache.set(raw,promise);promise.catch(()=>cache.delete(raw));return promise;
}
function content(m){
 if(m.missing)return '<section class="ref-empty"><h3>Load your save to plan your refinery</h3><p>Import a complete export from Home to see salt balances and rank targets.</p></section>';
 const unlocked=m.rows.filter(r=>r.unlocked),deficits=unlocked.filter(r=>r.isDeficit),paused=unlocked.filter(r=>!r.active);
 const headline=deficits.length?`${deficits.length} salt ${deficits.length===1?'supply is':'supplies are'} draining`:m.plan.length?'Ranks need balancing before all salts can run':'Running salt production covers demand';
 const plan=m.plan.length?`<ol class="ref-plan">${m.plan.map(r=>`<li><div><strong>${esc(r.name)}</strong><span>Rank ${fmt(r.from)} → <b>${fmt(r.to)}</b></span></div><p>Reach this support rank before increasing the next salt. Keep later salts at their current ranks while following this order.</p></li>`).join('')}</ol>`:'<p class="ref-muted">No support-rank increases are needed for the current unlocked chain. Use each salt’s safe ceiling before its next rank-up.</p>';
 return `<section class="ref-summary ${deficits.length?'ref-warning':''}"><div><p class="eyebrow">Salt-lock check</p><h3>${esc(headline)}</h3><p>Salt lock means a later salt consumes its supply faster than the earlier salt produces it. A stockpile delays the shortage; it does not fix the rank imbalance.</p></div><div class="ref-summary-count"><strong>${unlocked.length}</strong><span>salts unlocked</span><small>${paused.length} paused</small></div></section>
 <div class="ref-overview"><section class="ref-panel"><h3>What to level first</h3><p class="ref-muted">Minimum support targets for your current unlocked ranks, in upgrade order. Assumes every unlocked salt runs continuously.</p>${plan}${m.blocked.length?'<p class="ref-alert">Some demand exceeds the production cap. Higher ranks alone cannot balance it; pause or alternate the consuming salt.</p>':''}<p class="ref-tip"><strong>If you are already running dry:</strong> pause the downstream salt consuming the shortage, let its supplier build a reserve, then rank suppliers in the order above. Ranks cannot be lowered.</p></section>
 <section class="ref-panel"><h3>Keep the chain moving</h3><ul class="ref-rules"><li>Red is the first priority: it has no salt input. Keep ranking it until its output cap.</li><li>Green supplies purple and nullo. Prioritize it when those need more supply, but check blue can feed it first.</li><li>For a salt you want to rank, turn auto-refine off and let its power bar fill. Auto-refining early prevents rank-ups.</li><li>Hold other salts at or below their safe ceilings. Leave surplus for buildings, gear and other salt spending.</li></ul><div class="ref-clocks">${['Combustion','Synthesis','Polymerization'].map((s,i)=>`<div><span>${s}</span><strong>${duration(m.cycleTimes[i])}</strong><small>per cycle</small></div>`).join('')}</div></section></div>
 ${[0,1,2].map(group=>{const rows=m.rows.slice(group*3,group*3+3);if(!rows.length)return '';return `<section class="ref-group"><h3>${['Combustion','Synthesis','Polymerization'][group]} <span>${group===0?'Red → Orange → Blue':group===1?'Green → Purple → Nullo':'Advanced salts'}</span></h3><div class="ref-grid">${rows.map(r=>saltCard(r)).join('')}</div></section>`;}).join('')}
 <details class="ref-panel ref-assumptions"><summary>How the targets are calculated</summary><p>Uses your saved ranks, salt-cost merit upgrade, companion power bonus, and rounded cycle times with decoded account bonuses. Costs scale with rank; salt inputs use the merit-adjusted exponent. Production is capped at 250,000 power per cycle.</p><p>Balances assume continuous production and collection. Power waiting for manual refinement is not immediately spendable salt. Rank targets exclude extra cycles from active skills or deity procs, outside salt spending, and future upgrades. Keep a reserve and re-import after ranking up. “Safe ceiling” only checks salt supply; ordinary ingredients can still run out.</p><p>Refinery stock below is the saved refinery inventory. Ingredient availability includes storage. Calculation basis: <a href="https://github.com/Morta1/IdleonToolbox" target="_blank" rel="noopener noreferrer">Idleon Toolbox</a>.</p></details>`;
}
function saltCard(r){
 const status=!r.unlocked?'Locked':!r.active?'Paused':r.isDeficit?'Supply draining':'Running';
 const next=!r.unlocked?'Unlock this salt to start planning.':r.outputMaxed?'Output cap reached. Further ranks raise costs without increasing output.':r.rank+1<=r.safeRank?`Next rank fits the salt supply. Ceiling: rank ${fmt(r.safeRank)}.`:r.nextSupport===null?`The next rank exceeds your supplier’s output cap. Alternate production instead.`:`Hold this rank. ${r.priorName} needs rank ${fmt(r.nextSupport)} to support your next rank.`;
 return `<article class="ref-salt ${r.isDeficit?'ref-draining':''} ${!r.unlocked?'ref-locked':''}"><header><img src="${esc(r.icon)}" alt=""><div><h4>${esc(r.name)}</h4><span class="ref-status">${status}</span></div><b>R${fmt(r.rank)}</b></header>${!r.unlocked?'<p class="ref-muted">Not unlocked in this save.</p>':`<dl class="ref-stats"><div><dt>Produced / hr</dt><dd>${fmt(r.outputPerHour)}</dd></div><div><dt>Used by next salt / hr</dt><dd>${fmt(r.consumedPerHour)}</dd></div><div class="ref-net"><dt>Net / hr</dt><dd>${r.balancePerHour>0?'+':''}${fmt(r.balancePerHour)}</dd></div><div><dt>Refinery stock</dt><dd>${fmt(r.stored)}</dd></div></dl><div class="ref-progress"><label>Rank-up power <span>${fmt(r.refined)} / ${fmt(r.capacity)}</span></label><progress max="${Math.max(1,r.capacity)}" value="${Math.max(0,r.refined)}"></progress><small>Auto-refine: ${r.auto>0?fmt(r.auto*100)+'%':'Off'} · ${fmt(r.power)} power / cycle</small></div><p class="ref-next">${esc(next)}</p>${!r.active&&r.steadyDeficit?'<p class="ref-alert">The full chain would drain this salt if all salts were running.</p>':''}<details><summary>Ingredients per cycle</summary><ul class="ref-inputs">${r.inputs.map(i=>`<li><span>${esc(i.name)}</span><strong>${fmt(i.quantity)}</strong><small>${fmt(i.stock)} available</small></li>`).join('')}</ul>${r.shortage?`<p class="ref-muted">First ingredient shortage in about ${duration(r.shortage.hoursLeft*3600)} at saved rates, without refills.</p>`:''}</details>`}</article>`;
}
function render(host,raw,addTabs=()=>{}){
 const token={};requests.set(host,token);
 host.innerHTML='<div class="section-head compact"><div><p class="eyebrow">World 3 · Construction</p><h2>Refinery</h2><p>Balance your salt chain and plan the next rank.</p></div></div><div class="refinery-planner" data-refinery-content role="status">Calculating salt production…</div>';addTabs();
 const panel=host.querySelector('[data-refinery-content]');
 const current=()=>requests.get(host)===token&&host.contains(panel)&&(!host.dataset.page||host.dataset.page==='refinery');
 load(raw).then(m=>{if(current()){panel.removeAttribute('role');panel.innerHTML=content(m);}}).catch(e=>{if(current()){panel.innerHTML=`<section class="ref-empty"><h3>Refinery calculation unavailable</h3><p>${esc(e.message)}</p><button type="button" data-ref-retry>Retry</button></section>`;panel.querySelector('button').onclick=()=>render(host,raw,addTabs);}});
}
root.RefineryPlanner={render,content};
})(window);
