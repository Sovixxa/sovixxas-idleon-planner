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
async function render(host,raw,navigate){
 const token={};hosts.set(host,token);
 const current=()=>hosts.get(host)===token&&(!host.dataset.page||host.dataset.page==='loadouts')&&!!host.querySelector('#dropLoading');
 host.innerHTML='<section id="dropLoading" class="carry-empty" role="status"><h2>Drop Rate</h2><p>Calculating character stats and account bonuses…</p></section>';
 let result;try{result=await calculate(raw);}catch(error){if(current())host.innerHTML=`<section class="carry-empty"><h2>Drop Rate unavailable</h2><p>${esc(error.message)}</p><button id="dropRetry">Retry</button></section>`;host.querySelector('#dropRetry')?.addEventListener('click',()=>render(host,raw,navigate));return;}
 if(!current())return;
 function paint(){
  const chars=result.characters;if(selected!=='all'&&!chars.some(c=>String(c.id)===selected))selected='all';
  const display=selected==='all'?chars:chars.filter(c=>String(c.id)===selected);
  host.innerHTML=`<section class="loadouts-page"><div class="section-head compact loadout-heading"><div><p class="eyebrow">Optimizers · saved account</p><h2>Drop Rate</h2><p>Calculated character drop-rate multipliers from your imported save, shown to two decimals like the game.</p></div></div><nav class="skill-tabs loadout-groups" aria-label="Loadout sections"><button class="skill-tab" data-loadout-tab="builds">Build loadouts</button><button class="skill-tab" data-loadout-tab="carry">Carry Capacity</button><button class="skill-tab active" aria-current="page">Drop Rate</button><button class="skill-tab" data-loadout-tab="damage">Damage</button><button class="skill-tab" data-loadout-tab="classExp">Class EXP</button></nav><nav class="skill-tabs loadout-groups"><button class="skill-tab ${view==='characters'?'active':''}" data-view="characters">Per character</button><button class="skill-tab ${view==='sources'?'active':''}" data-view="sources">All sources / inactive</button><button class="skill-tab ${view==='missing'?'active':''}" data-view="missing">Missing</button><button class="skill-tab ${view==='items'?'active':''}" data-view="items">Equipment &amp; items</button><button class="skill-tab ${view==='todo'?'active':''}" data-view="todo">To-do</button></nav><div class="loadout-controls drop-controls" ${['items','todo'].includes(view)?'hidden':''}><label>Character<select id="dropCharacter"><option value="all">All characters</option>${chars.map(c=>`<option value="${c.id}" ${String(c.id)===selected?'selected':''}>${esc(c.name)} · ${fmt(c.total)}×</option>`).join('')}</select></label><label ${view==='missing'?'hidden':''}>Show<select id="dropFilter">${[['all','All sources'],['active','Active'],['inactive','Inactive / no contribution']].map(([v,label])=>`<option value="${v}" ${status===v?'selected':''}>${label}</option>`).join('')}</select></label><label>Find a source<input id="dropSearch" type="search" value="${esc(query)}" placeholder="Golden food, gear, Jelly…"></label></div><p class="loadout-note">${result.savedAt?'Export saved '+esc(new Date(result.savedAt).toLocaleString())+'. ':''}Calculated for the saved equipment, talents and location. +1× adds one to the multiplier; ×1.20 multiplies it by 1.20. Card-find, crystal-spawn and special loot chances are separate stats. Click a source for its effect, practical max and upgrade page. Re-import after changing your in-game setup.</p><div id="dropResults">${view==='todo'?'<div id="statTodoHost"></div>':view==='items'?'<div id="statItemsHost"></div>':chars.length?(view==='missing'?missingHtml(display):display.map(characterHtml).join('')):'<section class="carry-empty"><h3>No saved characters</h3><p>Import a full export from Home to see your drop-rate totals.</p></section>'}</div><section id="dropSourceDetail" class="upgrade-detail detail-dismissed" role="dialog" aria-modal="false" aria-labelledby="dropDetailTitle"></section></section>`;
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
root.DropRate={render,characterHtml,missingHtml};
})(typeof window!=='undefined'?window:globalThis);
