(function(root){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(v,d=2)=>Number.isFinite(v)?v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}):'Unavailable';
let lastRaw,lastResult,pending,selected='all',status='all',query='',view='characters';
const hosts=new WeakMap();
function calculate(raw){
 if(raw===lastRaw&&lastResult)return Promise.resolve(lastResult);
 if(raw===lastRaw&&pending)return pending;
 lastRaw=raw;lastResult=null;
 const job=new Promise((resolve,reject)=>{
  const worker=new Worker('drop-rate-worker.js');
  const timer=setTimeout(()=>finish(new Error('Calculation timed out. Reopen Drop Rate to retry.')),45000);
  function finish(error,result){clearTimeout(timer);worker.terminate();error?reject(error):resolve(result);}
  worker.onmessage=e=>finish(e.data.error?new Error(e.data.error):null,e.data.result);
  worker.onerror=e=>finish(new Error(e.message||'Drop-rate calculation failed.'));
  worker.postMessage(raw);
 });
 pending=job;return job.then(result=>{if(lastRaw===raw){lastResult=result;pending=null;}return result;},error=>{if(lastRaw===raw)pending=null;throw error;});
}
const contribution=r=>r.operation==='multiply'?`×${fmt(r.value,4)}`:`+${fmt(r.value,4)}×`;
const miscSources=new Set(['Base','Drop-rate chip (base capped at 5×)','Drop-rate bundle (+2)','Ninja Mastery']);
const sourceGroup=r=>miscSources.has(r.name)?'misc':r.operation==='multiply'?'multi':'additive';
const groups=[
 ['additive','Additive','Bonuses added to the base drop rate.'],
 ['multi','Multipliers','Factors that multiply the running drop rate.'],
 ['misc','Misc','Base value, capped chip bonus, flat bundle bonus and Ninja Mastery.']
];
function sourceGroups(ch,rows){
 return groups.map(([key,label,description])=>{
  const all=ch.rows.filter(r=>sourceGroup(r)===key),matching=rows.filter(r=>sourceGroup(r)===key);
  return `<details class="drop-group" ${query&&matching.length?'open':''}><summary><strong>${label}</strong><span>${matching.length} of ${all.length} sources · ${all.filter(r=>r.active).length} active</span></summary><p class="drop-group-description">${description}</p><div class="carry-table-wrap"><table class="carry-table"><thead><tr><th>Step</th><th>Source</th><th>Contribution</th><th>Running drop rate</th><th>Details</th></tr></thead><tbody>${matching.map(r=>`<tr data-drop-character="${ch.id}" data-drop-source="${ch.rows.indexOf(r)}" class="drop-clickable carry-source-${r.active?'active':'inactive'}"><td>${ch.rows.indexOf(r)+1}</td><th scope="row"><button type="button" class="drop-source-button" aria-haspopup="dialog">${esc(r.name)}</button></th><td>${contribution(r)}</td><td>${fmt(r.running)}×</td><td>${esc(r.detail||(r.active?(r.operation==='multiply'?'Multiplies the preceding total':'Added to the drop-rate multiplier'):'No contribution in this saved setup'))}</td></tr>`).join('')||'<tr><td colspan="5">No matching sources.</td></tr>'}</tbody></table></div></details>`;
 }).join('');
}
function characterHtml(ch){
 if(ch.error)return `<article class="carry-empty"><h3>${esc(ch.name)}</h3><p>Unavailable: ${esc(ch.error)}</p></article>`;
 const rows=ch.rows.filter(r=>(status==='all'||(status==='active')===r.active)&&(!query||`${r.name} ${r.detail}`.toLowerCase().includes(query)));
 return `<details class="drop-character" ${selected!=='all'?'open':''}><summary><div><h3>${esc(ch.name)}</h3><small>${esc(String(ch.className||'').replaceAll('_',' '))} · ${esc(String(ch.map||'Saved setup').replaceAll('_',' '))} · ${ch.rows.filter(r=>r.active).length} active sources</small></div><div class="carry-summary"><strong>${fmt(ch.total)}×</strong><span>Calculated Drop Rate · expand</span></div></summary>${ch.missing.length?`<p class="loadout-note">Incomplete character export: ${esc(ch.missing.join(', '))}. This total uses defaults for missing fields.</p>`:''}${ch.cove?`<p class="loadout-note">Crystal Glunko Cove replaces the normal stat with ${fmt(ch.total)}×. Your normal drop rate is ${fmt(ch.normal)}×; the breakdown below explains that normal stat.</p>`:''}<div class="drop-groups">${sourceGroups(ch,rows)}</div><p class="loadout-note">Normal drop rate: <strong>${fmt(ch.normal)}×</strong>. Step numbers and running totals follow the full calculation order across all groups, including hidden sources.</p></details>`;
}
function missingHtml(characters){
 const sources=new Map(),unknown=characters.filter(ch=>ch.error||ch.missing?.length);
 for(const ch of characters){
  if(ch.error||ch.missing?.length)continue;
  ch.rows.forEach((row,index)=>{
   if(row.active)return;
   // A capped chip is not an upgrade opportunity once the base already exceeds 5x.
   if(row.name==='Drop-rate chip (base capped at 5×)'&&ch.rows[index-1]?.running>=5)return;
   if(query&&!`${row.name} ${row.detail}`.toLowerCase().includes(query))return;
   const key=`${row.operation}:${row.name}`;
   if(!sources.has(key))sources.set(key,{row,characters:[]});
   sources.get(key).characters.push({ch,index});
  });
 }
 const entries=[...sources.values()];
 return `<section class="drop-missing"><p class="loadout-note"><strong>${entries.length} missing / inactive sources</strong> across the selected characters. These contribute no drop rate in the saved setup; they may be unowned, unequipped, locked or not applicable to that character. Capped chips with no remaining benefit are excluded. Click a character to see the source details and upgrade page.</p>${unknown.length?`<p class="loadout-note">Could not assess ${unknown.map(ch=>esc(ch.name)).join(', ')} because their saved data is incomplete or unavailable.</p>`:''}${entries.length?groups.map(([key,label])=>{
  const matching=entries.filter(entry=>sourceGroup(entry.row)===key);
  if(!matching.length)return '';
  return `<details class="drop-group" open><summary><strong>${label}</strong><span>${matching.length} sources</span></summary><div class="carry-table-wrap"><table class="carry-table"><thead><tr><th>Source</th><th>Characters with no contribution</th><th>What it does</th></tr></thead><tbody>${matching.map(({row,characters:affected})=>`<tr><th scope="row">${esc(row.name)}</th><td><div class="drop-missing-characters">${affected.map(({ch,index})=>`<button type="button" class="secondary" data-drop-character="${ch.id}" data-drop-source="${index}" aria-haspopup="dialog">${esc(ch.name)}</button>`).join('')}</div></td><td>${esc(root.DropSourceInfo.get(row).effect)}</td></tr>`).join('')}</tbody></table></div></details>`;
 }).join(''):`<p class="carry-empty">${query?'No missing / inactive sources match your search.':unknown.length?'No missing / inactive sources found among the characters that could be assessed.':'No missing / inactive drop-rate sources found for the selected characters.'}</p>`}</section>`;
}
function showSource(host,ch,row,trigger){
 const panel=host.querySelector('#dropSourceDetail'),info=root.DropSourceInfo.get(row);
 const links=info.page?[[info.page,info.label]]:[];
 if(row.name.toLowerCase()==='golden food')links.push(['beanstalk','Beanstalk']);
 if(row.name==='Sushi + Jelly Operator')links.push(['research','Research']);
 if(row.name.includes('equipment pool')||row.name==='Equipment, Gallery & Hat Rack')links.push(['characters','Characters & Talents']);
 panel.innerHTML=`<button type="button" class="secondary upgrade-close" aria-label="Close source details">Close</button><p class="eyebrow">${esc(ch.name)} · ${esc(groups.find(g=>g[0]===sourceGroup(row))[1])}</p><h3 id="dropDetailTitle">${esc(row.name)}</h3><p class="drop-detail-current"><strong>${contribution(row)}</strong> ${row.active?'Current contribution':'Inactive in this saved setup'}</p><h4>What it does</h4><p>${esc(info.effect)}</p>${row.detail?`<p>${esc(row.detail)}</p>`:''}<h4>Practical max / target</h4><p>${esc(info.max)}</p><p class="drop-detail-order">Step ${ch.rows.indexOf(row)+1}: running drop rate ${fmt(row.running)}×. ${row.operation==='multiply'?'Multiplies the preceding total.':'Adds to the running multiplier at this step.'}</p>${links.length?`<nav class="drop-detail-links" aria-label="Related upgrade pages">${links.map(([page,label])=>`<button type="button" class="secondary" data-drop-page="${esc(page)}">Open ${esc(label)}</button>`).join('')}</nav>`:''}`;
 panel.classList.remove('detail-dismissed');
 const close=()=>{panel.classList.add('detail-dismissed');if(trigger?.isConnected)trigger.focus();};
 panel.querySelector('.upgrade-close').onclick=close;
 panel.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();close();}};
 panel.querySelectorAll('[data-drop-page]').forEach(button=>button.onclick=()=>{
  panel.classList.add('detail-dismissed');hosts.delete(host);
  root.dispatchEvent(new CustomEvent('idleon:navigate',{detail:button.dataset.dropPage}));
 });
 panel.querySelector('.upgrade-close').focus();
}
const goldAdvice={
 'Family Bonus':'Level the highest Shaman-family character; the supplying character can also use The Family Guy.',
 'The Family Guy':"Boosts the provider's family bonus; it is already included in the Family Bonus row.",
 'Obols':'Compare gold-food-effect personal and family obols, including the bonuses you would replace.',
 'Talent':'Raise HAUNGRY FOR GOLD on an eligible class within its talent-book and point limits.',
 'Stamp':'Upgrade Golden Apple; check the Golden Nomwich hand-in, carry capacity and stamp discounts.',
 'Achievement':'Complete the golden-food achievement.',
 'Bubble':'Improve SHIMMERON and its effective class, Prisma and Alchemy multipliers.',
 'Sigil':'Advance EMOJI VEGGIE and its sigil amplification.',
 'Meal':'Improve Yumi Peachring levels, ribbon and Cooking Mastery; Endless Summoning rewards, meal shinies and Black Diamond Rhinestone amplify it.',
 'Star Sign':'Compare available Golden Food signs, Infinite Stars and sign amplification for this character.',
 'Bribe':'Purchase Gold from Lead if missing.',
 'Charm':'Find the Gumm Stick pristine charm.',
 'Achievements':'Complete the relevant golden-food achievements.',
 'Vote':'Depends on the current vote; this cannot be freely leveled.',
 'Apocalypse Wow':'Improve the Death Bringer talent and complete its Apocalypse progression.',
 'Legend Talent':'Spend Legend points on the gold-food-effect talent within its current cap.',
 'Card':'Improve the passive gold-food cards; each card has its own effect cap.',
 'Vault Upgrade':'Upgrade 24 Karat Foods within its Vault cap.',
 'Jelly Operator':'Reach the golden-food rewards after obstructions 10 and 51.',
 'Armor Set':'Unlock and amplify the Secret Set reward.',
 'Verminous Companion':'Ownership and upgraded tier affect both the additive and outer multiplier.',
 'Purp Mushroom Companion':'Check companion ownership and its available upgrade tier.',
 'Vanillie Companion':'Check companion ownership and its available upgrade tier.',
 'Equipment':'Compare gold-food gear without assuming the replaced item is free of tradeoffs.',
 'Gallery':'Improve applicable Gallery nametags, trophy placements and Gallery amplification.',
 'Hat Rack':'Improve the relevant collected hats and Hat Rack amplification.'
};
function targetResultHtml(p){
 const change=c=>`${esc(c.displayFrom||`${fmt(c.from,0)} ${c.unit}`)} &rarr; ${esc(c.displayTo||`${fmt(c.to,0)} ${c.unit}`)}`;
 const link=(page,label='Open upgrade page')=>page?`<button type="button" class="secondary" data-target-page="${esc(page)}">${esc(label)}</button>`:'';
 const food=c=>c.foodAfter?`<p><strong>Required food stack:</strong> ${fmt(c.foodBefore.amount,0)} &rarr; ${fmt(c.foodAfter.amount,0)} ${esc(c.foodAfter.name)}. ${c.foodBefore.bank>=c.foodAfter.amount-c.foodBefore.amount?`Move ${fmt(Math.max(0,c.foodAfter.amount-c.foodBefore.amount),0)} from your saved bank stock.`:`Use available bank stock, then farm ${fmt(Math.max(0,c.foodAfter.amount-c.foodBefore.amount-c.foodBefore.bank),0)} more.`} Equip at ${esc(c.foodAfter.loadAt)}. Projected food capacity: ${fmt(c.foodAfter.capacity,0)} per slot.</p>`:'';
 return `<h3>${p.before>=p.target?'Target already reached':p.reached?'Path to your target':'More progression needed to reach this target'}</h3><div class="drop-target-summary"><p>Current<br><strong>${fmt(p.before,2)}&times;</strong></p><p>After this plan<br><strong>${fmt(p.after,2)}&times;</strong><br>+${fmt(100*(p.after/p.before-1),2)}%</p><p>Your target<br><strong>${fmt(p.target,2)}&times;</strong></p></div>${!p.reached?`<p>The next milestones checked here leave ${fmt(p.target-p.after,2)}&times; to go. <strong>This is not your maximum drop rate.</strong> Further levels, unlocks and setup changes can still help; review the source audit below.</p>`:''}
 ${p.food&&!p.food.missing?`<details class="drop-target-audit"><summary>Golden food &amp; capacity: ${fmt(p.food.amount,0)} equipped / ${fmt(p.food.capacity,0)} capacity</summary><p>${esc(p.food.name)} is the effective drop-rate food. Bank stock: ${fmt(p.food.bank,0)}. Golden-food effect multiplier: ${fmt(p.golden.multiplier,3)}&times;.</p><p>Mason Jar increases capacity; fill the larger cake stack to gain drop rate. Golden Apple, Shimmeron, Peachring levels/ribbons/mastery and meal-bonus shinies increase the effect of both equipped cakes and the active Beanstalk contribution.</p>${p.golden.categories.map(group=>`<h4>${esc(group.name)} golden-food inputs</h4><ul>${[...group.sources,...(group.subSections||[]).flatMap(section=>section.sources||[])].map(r=>`<li><strong>${esc(r.name)}: ${fmt(r.value,3)}${r.name==='Family Bonus'?' (family factor)':'%'}</strong> &mdash; ${esc(goldAdvice[r.name]||'Review this source in the golden-food breakdown.')}</li>`).join('')}</ul>`).join('')}<h4>Food-capacity inputs (${esc(p.food.loadAt)})</h4><ul>${(p.food.capacityBreakdown||[]).filter(r=>r.value!==undefined&&r.name).map(r=>`<li>${esc(r.name)}: ${fmt(r.value,3)}</li>`).join('')}</ul><p>These are formula inputs, not separate DR gains. Capacity is capped at 2,050,000,000 per slot.</p>${link('goldFood','Open golden-food breakdown')}${link('loadouts','Open loadouts / carry capacity')}</details>`:''}
 ${p.steps.length?`<h4>${p.reached?'Upgrade route':'Useful next upgrades'}</h4><ol class="drop-target-steps">${p.steps.map(c=>`<li><h4>${esc(c.name)}</h4><p>${change(c)}</p><p><strong>${fmt(c.after,2)}&times; projected</strong> (+${fmt(c.gain,2)}&times; / +${fmt(c.relative,3)}%)</p>${food(c)}<ul>${c.requirements.map(r=>`<li>${esc(r)}</li>`).join('')}</ul>${link(c.page)}</li>`).join('')}</ol><p class="loadout-note">These are conditional projections, not promises that you can afford every upgrade now. Follow the listed prerequisites and re-import after making changes.</p>`:''}
 <details class="drop-target-audit"><summary>Compare ${p.options.length} calculated upgrade options</summary><p>Each comparison starts from your current save. Do not add these gains together: the route above recalculates their interactions. Options below 0.01% are shown here but left out of the route unless they close the target gap.</p><div class="carry-table-wrap"><table class="carry-table"><thead><tr><th>Upgrade</th><th>Target</th><th>Drop rate gain</th><th>What is required</th></tr></thead><tbody>${p.options.map(c=>`<tr><th>${esc(c.name)}</th><td>${change(c)}</td><td>+${fmt(c.gain,3)}&times;<br>+${fmt(c.relative,3)}%</td><td>${c.requirements.map(esc).join(' ')}${food(c)}${link(c.page)}</td></tr>`).join('')}</tbody></table></div></details>
 <details class="drop-target-audit"><summary>Full source audit: ${p.coverage.length} drop-rate entries</summary><p>The saved total includes every entry below. A source marked for review still affects your drop rate; it has no verified next-step simulation in this planner yet. That is a coverage limit, not a maxed bonus.</p><div class="carry-table-wrap"><table class="carry-table"><thead><tr><th>Source</th><th>Current contribution</th><th>Planner coverage</th><th>How to improve it</th></tr></thead><tbody>${p.coverage.map(r=>`<tr><th>${esc(r.name)}</th><td>${r.operation==='multiply'?'&times;':'+'}${fmt(r.value,4)}${r.operation==='add'?'&times;':''}</td><td>${esc(r.status)}</td><td>${esc(r.max)} ${esc(r.effect)}${link(r.page,r.label||'Review source')}</td></tr>`).join('')}</tbody></table></div></details>
 ${p.notes.length?`<details class="drop-target-audit"><summary>Planning limits and setup checks</summary><ul>${p.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul></details>`:''}${p.issues.length?`<p class="loadout-note">${p.issues.length} scenarios could not be verified and were excluded: ${p.issues.map(i=>esc(i.name+': '+i.error)).join('; ')}</p>`:''}`;
}
function mountCalculator(host,raw,chars){
 const valid=chars.filter(c=>!c.error&&!c.cove),box=host.querySelector('#dropCalculator');
 box.innerHTML=`<h3>Target drop rate calculator</h3><p>Choose a character and enter the multiplier you want, such as 25 for 25×.</p>${valid.length?`<form id="dropTargetForm" class="loadout-controls"><label>Character<select name="character">${valid.map(c=>`<option value="${c.id}">${esc(c.name)} · ${fmt(c.total)}×</option>`).join('')}</select></label><label>Target drop rate (×)<input name="target" type="number" min="0.01" step="any" required placeholder="25" value="${Math.ceil(valid[0].total*1.1)}"></label><button type="submit" class="secondary">Calculate upgrades</button></form>`:'<p>Import a full character export saved outside special drop-rate areas to calculate a target.</p>'}<p class="loadout-note">Checks golden-food stacks, Mason Jar capacity plus a refill, Golden Apple, Alchemy, Peachring meals/ribbons/mastery, Beanstalk, Gallery, shiny pets and other verified next upgrades. The full source audit shows what is calculated and what still needs review. The route fills existing food capacity first, then compares gains. Projections assume the listed farming, unlocks and costs are completed; it is not a cheapest or fastest route.</p><div id="dropTargetResult" aria-live="polite"></div>`;
 const form=box.querySelector('form');if(!form)return;
 let worker,timer;
 const cancel=()=>{worker?.terminate();clearTimeout(timer);worker=null;};
 form.oninput=()=>{cancel();form.querySelector('button').disabled=false;box.querySelector('#dropTargetResult').textContent='Inputs changed. Calculate to update the plan.';};
 form.onsubmit=e=>{
  e.preventDefault();cancel();const target=Number(form.elements.target.value),output=box.querySelector('#dropTargetResult'),button=form.querySelector('button');
  if(!Number.isFinite(target)||target<=0){output.textContent='Enter a target greater than zero.';return;}
  button.disabled=true;output.textContent='Simulating upgrade combinations…';
  worker=new Worker('drop-target-worker.js');
  const finish=(error,p)=>{cancel();button.disabled=false;if(!box.isConnected)return;
   if(error){output.textContent=error;return;}
   output.innerHTML=targetResultHtml(p);
   output.querySelectorAll('[data-target-page]').forEach(b=>b.onclick=()=>root.dispatchEvent(new CustomEvent('idleon:navigate',{detail:b.dataset.targetPage})));
  };
  worker.onmessage=e=>{if(e.data.progress){const p=e.data.progress;output.textContent=`${p.phase==='compare'?'Comparing sources':'Building combined route'}: ${p.current}/${p.total} - ${p.name}`;}else finish(e.data.error,e.data.result);};worker.onerror=e=>finish(e.message||'Calculation failed. Please retry.');timer=setTimeout(()=>finish('Calculation timed out. Try again with a closer target.'),180000);
  worker.postMessage({raw,character:form.elements.character.value,target});
 };
 const observer=new MutationObserver(()=>{if(!box.isConnected){cancel();observer.disconnect();}});
 observer.observe(host,{childList:true});
}
async function render(host,raw,navigate){
 const token={};hosts.set(host,token);
 const current=()=>hosts.get(host)===token&&(!host.dataset.page||host.dataset.page==='loadouts')&&!!host.querySelector('#dropLoading');
 host.innerHTML='<section id="dropLoading" class="carry-empty" role="status"><h2>Drop Rate</h2><p>Calculating character stats and account bonuses…</p></section>';
 let result;try{result=await calculate(raw);}catch(error){if(current())host.innerHTML=`<section class="carry-empty"><h2>Drop Rate unavailable</h2><p>${esc(error.message)}</p><button id="dropRetry">Retry</button></section>`;host.querySelector('#dropRetry')?.addEventListener('click',()=>render(host,raw,navigate));return;}
 if(!current())return;
 function paint(){
  const chars=result.characters;if(selected!=='all'&&!chars.some(c=>String(c.id)===selected))selected='all';
  const display=selected==='all'?chars:chars.filter(c=>String(c.id)===selected);
  host.innerHTML=`<section class="loadouts-page"><div class="section-head compact loadout-heading"><div><p class="eyebrow">Optimizers · saved account</p><h2>Drop Rate</h2><p>Calculated character drop-rate multipliers from your imported save, shown to two decimals like the game.</p></div></div><nav class="skill-tabs loadout-groups" aria-label="Loadout sections"><button class="skill-tab" data-loadout-tab="builds">Build loadouts</button><button class="skill-tab" data-loadout-tab="carry">Carry Capacity</button><button class="skill-tab active" aria-current="page">Drop Rate</button><button class="skill-tab" data-loadout-tab="damage">Damage</button><button class="skill-tab" data-loadout-tab="classExp">Class EXP</button><button type="button" class="skill-tab" data-loadout-tab="shinies">Shiny Critters</button></nav><nav class="skill-tabs loadout-groups"><button class="skill-tab ${view==='characters'?'active':''}" data-view="characters">Per character</button><button class="skill-tab ${view==='sources'?'active':''}" data-view="sources">All sources / inactive</button><button class="skill-tab ${view==='missing'?'active':''}" data-view="missing">Missing</button><button class="skill-tab ${view==='items'?'active':''}" data-view="items">Equipment &amp; items</button><button class="skill-tab ${view==='todo'?'active':''}" data-view="todo">To-do</button><button class="skill-tab ${view==='calculator'?'active':''}" data-view="calculator">Calculator</button></nav><div class="loadout-controls drop-controls" ${['items','todo','calculator'].includes(view)?'hidden':''}><label>Character<select id="dropCharacter"><option value="all">All characters</option>${chars.map(c=>`<option value="${c.id}" ${String(c.id)===selected?'selected':''}>${esc(c.name)} · ${fmt(c.total)}×</option>`).join('')}</select></label><label ${view==='missing'?'hidden':''}>Show<select id="dropFilter">${[['all','All sources'],['active','Active'],['inactive','Inactive / no contribution']].map(([v,label])=>`<option value="${v}" ${status===v?'selected':''}>${label}</option>`).join('')}</select></label><label>Find a source<input id="dropSearch" type="search" value="${esc(query)}" placeholder="Golden food, gear, Jelly…"></label></div><p class="loadout-note">${result.savedAt?'Export saved '+esc(new Date(result.savedAt).toLocaleString())+'. ':''}Calculated for the saved equipment, talents and location. +1× adds one to the multiplier; ×1.20 multiplies it by 1.20. Card-find, crystal-spawn and special loot chances are separate stats. Click a source for its effect, practical max and upgrade page. Re-import after changing your in-game setup.</p><div id="dropResults">${view==='calculator'?'<section id="dropCalculator" class="carry-empty"></section>':view==='todo'?'<div id="statTodoHost"></div>':view==='items'?'<div id="statItemsHost"></div>':chars.length?(view==='missing'?missingHtml(display):display.map(characterHtml).join('')):'<section class="carry-empty"><h3>No saved characters</h3><p>Import a full export from Home to see your drop-rate totals.</p></section>'}</div><section id="dropSourceDetail" class="upgrade-detail detail-dismissed" role="dialog" aria-modal="false" aria-labelledby="dropDetailTitle"></section></section>`;
  if(view==='calculator')mountCalculator(host,raw,chars);
  if(view==='todo')root.StatTodo.mount(host.querySelector('#statTodoHost'),'drop',result.todo);
  if(view==='items')root.StatItems.mount(host.querySelector('#statItemsHost'),'drop');
  host.querySelector('#dropResults').onclick=e=>{
   const row=e.target.closest('[data-drop-source]');if(!row)return;
   const ch=chars.find(c=>String(c.id)===row.dataset.dropCharacter);
   if(ch)showSource(host,ch,ch.rows[Number(row.dataset.dropSource)],row.matches('button')?row:row.querySelector('button'));
  };
  host.querySelectorAll('[data-loadout-tab]').forEach(b=>b.onclick=()=>{hosts.delete(host);navigate(b.dataset.loadoutTab);});
  host.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;if(view==='sources'&&selected==='all'&&chars.length)selected=String(chars[0].id);if(view==='characters'||view==='missing')selected='all';paint();});
  host.querySelector('#dropCharacter').onchange=e=>{selected=e.target.value;paint();};
  host.querySelector('#dropFilter').onchange=e=>{status=e.target.value;paint();};
  host.querySelector('#dropSearch').oninput=e=>{host.querySelector('#dropSourceDetail')?.classList.add('detail-dismissed');query=e.target.value.toLowerCase();host.querySelector('#dropResults').innerHTML=view==='missing'?missingHtml(display):display.map(characterHtml).join('');};
 }
 paint();
}
root.DropRate={calculate,render,characterHtml,missingHtml,mountCalculator,targetResultHtml};
})(typeof window!=='undefined'?window:globalThis);
