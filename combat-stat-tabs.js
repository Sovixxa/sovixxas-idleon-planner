(function(root){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// IdleOn keeps its familiar large-number suffixes rather than switching stat
// panels to e-notation. T is intentionally allowed to grow through 999,999T,
// matching the in-game Class EXP display (for example, 202622T).
const idleonTiers=[[1e36,'S'],[1e30,'s'],[1e24,'q'],[1e18,'Q'],[1e12,'T'],[1e9,'B'],[1e6,'M'],[1e3,'K']];
const num=(v,d=2)=>{
 if(!Number.isFinite(v))return 'Unavailable';
 const sign=v<0?'-':'',absolute=Math.abs(v),tier=idleonTiers.find(([floor])=>absolute>=floor);
 if(!tier)return sign+absolute.toLocaleString('en-US',{maximumFractionDigits:d});
 const scaled=absolute/tier[0],digits=scaled>=100000?0:scaled>=10000?1:scaled>=1000?2:scaled>=100?3:scaled>=10?4:5;
 const rounded=Number(scaled.toFixed(digits));
 return sign+String(rounded)+tier[1];
};
const configs={damage:{title:'Damage',unit:'',copy:'Calculated maximum damage from your saved equipment, talents and account bonuses.'},classExp:{title:'Class EXP',unit:'×',copy:'Calculated Class EXP multiplier from your saved setup. This is the stat multiplier, not EXP per hour.'}};
const groups=[['additive','Additive'],['multi','Multipliers'],['misc','Misc']];
const states={},jobs=new Map(),hosts=new WeakMap();
const contribution=row=>row.display||`${row.operation==='multiply'?'×':row.value>0?'+':''}${num(row.value,4)}${row.operation==='multiply'?'':row.unit==='%'?'%':row.unit==='×'?'×':' damage'}`;
function calculate(raw,kind){
 const cached=jobs.get(kind);if(cached?.raw===raw)return cached.promise;
 const promise=new Promise((resolve,reject)=>{
  const worker=new Worker('combat-stat-worker.js');
  const timer=setTimeout(()=>finish(Error('Calculation timed out. Retry with a complete export.')),60000);
  function finish(error,result){clearTimeout(timer);worker.terminate();error?reject(error):resolve(result);}
  worker.onmessage=e=>finish(e.data.error?Error(e.data.error):null,e.data.result);
  worker.onerror=e=>finish(Error(e.message||'Calculation failed.'));
  worker.postMessage({raw,kind});
 });
 jobs.set(kind,{raw,promise});promise.catch(()=>{if(jobs.get(kind)?.promise===promise)jobs.delete(kind);});return promise;
}
function characterHtml(ch,kind,state){
 if(ch.error)return `<section class="carry-empty"><h3>${esc(ch.name)}</h3><p>Unavailable: ${esc(ch.error)}</p></section>`;
 const config=configs[kind],match=row=>(state.filter==='all'||(state.filter==='active')===row.active)&&(!state.query||`${row.name} ${row.stage} ${row.detail||''}`.toLowerCase().includes(state.query));
 const stages=kind==='damage'?`<p class="loadout-note">Damage range: <strong title="${esc(ch.min)} – ${esc(ch.total)}">${num(ch.min)} – ${num(ch.total)}</strong>.<br>Maximum = base damage (${num(ch.stages.baseDamage)}) × Per-X multiplier (${num(ch.stages.perDamage)}) × damage-percentage multiplier (${num(ch.stages.percentDamage)}). HP/MP pool (${num(ch.stages.hpMpDamage)}×) is already included in Per-X. Stage outputs include their soft caps.</p>`:'';
 return `<details class="drop-character" ${state.selected!=='all'?'open':''}><summary><div><h3>${esc(ch.name)}</h3><small>${esc(ch.className?.replaceAll('_',' '))} · ${esc(ch.map?.replaceAll('_',' '))} · ${ch.rows.filter(r=>r.active&&r.operation!=='rule').length} active sources</small></div><div class="carry-summary"><strong title="${esc(ch.total)}">${num(ch.total)}${config.unit}</strong><span>Calculated ${kind==='damage'?'maximum damage':'Class EXP'}</span></div></summary>${ch.missing.length?`<p class="loadout-note">Incomplete export: ${esc(ch.missing.join(', '))}. Missing fields use defaults.</p>`:''}${stages}<div class="drop-groups">${groups.map(([key,label])=>{
  const all=ch.rows.filter(r=>r.group===key),rows=all.filter(match);
  return `<details class="drop-group" ${state.query&&rows.length?'open':''}><summary><strong>${label}</strong><span>${rows.length} of ${all.length} sources</span></summary><div class="carry-table-wrap"><table class="carry-table"><thead><tr><th>Source</th><th>Current contribution</th><th>${kind==='damage'?'Calculation stage':'Running EXP'}</th><th>Details</th></tr></thead><tbody>${rows.map(row=>`<tr class="drop-clickable carry-source-${row.active?'active':'inactive'}" data-stat-char="${ch.id}" data-stat-source="${ch.rows.indexOf(row)}"><th scope="row"><button type="button" class="drop-source-button" aria-haspopup="dialog">${esc(row.name)}</button></th><td title="${esc(row.value)}">${esc(contribution(row))}</td><td>${kind==='damage'?esc(row.stage):`${num(row.running)}×`}</td><td>${esc(row.detail||(row.active?(row.operation==='multiply'?'Multiplies this stage.':'Adds within the named bonus pool.'):'No contribution in this saved setup.'))}</td></tr>`).join('')||'<tr><td colspan="4">No matching sources.</td></tr>'}</tbody></table></div></details>`;
 }).join('')}</div><p class="loadout-note">${kind==='damage'?'Damage sources apply within separate pools. Percentage contributions cannot all be added together; expand Misc for soft-cap rules.':'Running totals include sources hidden by filters. The complete breakdown reconciles with the total.'}</p></details>`;
}
function missingHtml(chars,kind,state){
 const missing=new Map(),unknown=chars.filter(c=>c.error||c.missing?.length);
 for(const ch of chars){if(ch.error||ch.missing.length)continue;ch.rows.forEach((row,index)=>{
  if(row.active||row.eligible===false||state.query&&!`${row.name} ${row.stage}`.toLowerCase().includes(state.query))return;
  const key=`${row.stage}:${row.name}`;
  if(!missing.has(key))missing.set(key,{row,affected:[]});missing.get(key).affected.push({ch,index});
 });}
 const entries=[...missing.values()];
 return `<section class="drop-missing"><p class="loadout-note"><strong>${entries.length} missing / inactive sources</strong>. These contribute nothing in the saved setup; they may be unowned, unequipped, locked or inapplicable to that class. Select a character below for source details and its upgrade page.</p>${unknown.length?`<p class="loadout-note">Could not assess ${unknown.map(c=>esc(c.name)).join(', ')} because their export is incomplete or unavailable.</p>`:''}${entries.length?groups.map(([key,label])=>{
  const rows=entries.filter(e=>e.row.group===key);if(!rows.length)return '';
  return `<details class="drop-group" open><summary><strong>${label}</strong><span>${rows.length} sources</span></summary><div class="carry-table-wrap"><table class="carry-table"><thead><tr><th>Source</th><th>Stage</th><th>Characters with no contribution</th></tr></thead><tbody>${rows.map(({row,affected})=>`<tr><th scope="row">${esc(row.name)}</th><td>${esc(row.stage)}</td><td><div class="drop-missing-characters">${affected.map(({ch,index})=>`<button type="button" class="secondary" data-stat-char="${ch.id}" data-stat-source="${index}" aria-haspopup="dialog">${esc(ch.name)}</button>`).join('')}</div></td></tr>`).join('')}</tbody></table></div></details>`;
 }).join(''):'<p class="carry-empty">No missing / inactive sources found among the assessed characters for these filters.</p>'}</section>`;
}
function showSource(host,ch,row,trigger,kind){
 const info=root.CombatSourceInfo.get(row,kind),panel=host.querySelector('#dropSourceDetail');
 const links=info.page?[[info.page,info.label]]:[];
 if(/golden/i.test(row.name))links.push(['beanstalk','Beanstalk']);
 if(/equipment|equip|gallery|hat rack/i.test(row.name))links.push(['characters','Characters & Talents']);
 panel.innerHTML=`<button type="button" class="secondary upgrade-close" aria-label="Close source details">Close</button><p class="eyebrow">${esc(ch.name)} · ${configs[kind].title}</p><h3 id="statDetailTitle">${esc(row.name)}</h3><p class="drop-detail-current"><strong title="${esc(row.value)}">${esc(contribution(row))}</strong>${row.active?'Current contribution':'Inactive in this saved setup'}</p><h4>What it does</h4><p>${esc(info.effect)}</p>${row.detail&&row.operation!=='rule'?`<p>${esc(row.detail)}</p>`:''}<h4>Practical max / target</h4><p>${esc(info.max)}</p><p class="drop-detail-order">${esc(row.stage)}${kind==='classExp'?` · running EXP ${num(row.running)}×`:''}</p><nav class="drop-detail-links" aria-label="Related upgrade pages">${links.map(([page,label])=>`<button type="button" class="secondary" data-stat-page="${page}">Open ${esc(label)}</button>`).join('')}</nav>`;
 panel.classList.remove('detail-dismissed');
 const close=()=>{panel.classList.add('detail-dismissed');if(trigger?.isConnected)trigger.focus();};
 panel.querySelector('.upgrade-close').onclick=close;panel.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();close();}};
 panel.querySelectorAll('[data-stat-page]').forEach(b=>b.onclick=()=>{hosts.delete(host);panel.classList.add('detail-dismissed');root.dispatchEvent(new CustomEvent('idleon:navigate',{detail:b.dataset.statPage}));});
 panel.querySelector('.upgrade-close').focus();
}
async function render(host,raw,kind,navigate){
 const config=configs[kind];if(!config)throw Error('Unknown stat tab');
 const state=states[kind]||(states[kind]={view:'characters',selected:'all',filter:'all',query:''}),token={};hosts.set(host,token);
 host.innerHTML=`<section id="statLoading" class="carry-empty" role="status"><h2>${config.title}</h2><p>Calculating saved character stats…</p></section>`;
 const current=()=>hosts.get(host)===token&&(!host.dataset.page||host.dataset.page==='loadouts')&&host.querySelector('#statLoading');
 let result;try{result=await calculate(raw,kind);}catch(error){if(current()){host.innerHTML=`<section class="carry-empty"><h2>${config.title} unavailable</h2><p>${esc(error.message)}</p><button id="statRetry">Retry</button></section>`;host.querySelector('#statRetry').onclick=()=>render(host,raw,kind,navigate);}return;}
 if(!current())return;
 function paint(){
  const chars=result.characters;if(state.selected!=='all'&&!chars.some(c=>String(c.id)===state.selected))state.selected='all';
  const display=state.selected==='all'?chars:chars.filter(c=>String(c.id)===state.selected);
  const content=()=>state.view==='todo'?'<div id="statTodoHost"></div>':state.view==='items'?'<div id="statItemsHost"></div>':!chars.length?'<section class="carry-empty"><h3>No saved characters</h3><p>Import a full export from Home to see character stats.</p></section>':state.view==='missing'?missingHtml(display,kind,state):display.map(ch=>characterHtml(ch,kind,state)).join('');
  host.innerHTML=`<section class="loadouts-page"><div class="section-head compact loadout-heading"><div><p class="eyebrow">Optimizers · saved account</p><h2>${config.title}</h2><p>${config.copy}</p></div></div><nav class="skill-tabs loadout-groups" aria-label="Loadout sections">${[['builds','Build loadouts'],['carry','Carry Capacity'],['drop','Drop Rate'],['damage','Damage'],['classExp','Class EXP']].map(([key,label])=>`<button type="button" class="skill-tab ${key===kind?'active':''}" data-stat-tab="${key}" ${key===kind?'aria-current="page"':''}>${label}</button>`).join('')}</nav><nav class="skill-tabs loadout-groups" aria-label="Stat views">${[['characters','Per character'],['sources','All sources / inactive'],['missing','Missing'],['items','Equipment & items'],['todo','To-do']].map(([key,label])=>`<button type="button" class="skill-tab ${state.view===key?'active':''}" data-stat-view="${key}">${label}</button>`).join('')}</nav><div class="loadout-controls drop-controls" ${['items','todo'].includes(state.view)?'hidden':''}><label>Character<select id="statCharacter"><option value="all">All characters</option>${chars.map(c=>`<option value="${c.id}" ${String(c.id)===state.selected?'selected':''}>${esc(c.name)} · ${num(c.total)}${config.unit}</option>`).join('')}</select></label><label ${state.view==='missing'?'hidden':''}>Show<select id="statFilter">${[['all','All sources'],['active','Active'],['inactive','Inactive / no contribution']].map(([key,label])=>`<option value="${key}" ${key===state.filter?'selected':''}>${label}</option>`).join('')}</select></label><label>Find a source<input id="statSearch" type="search" value="${esc(state.query)}" placeholder="Stamps, gear, talents…"></label></div><p class="loadout-note">${result.savedAt?'Export saved '+esc(new Date(result.savedAt).toLocaleString())+'. ':''}Click a source for its effect, practical target and upgrade page. Large values use IdleOn-style scaling; hover a number for its full calculated value. Re-import after changing your setup.</p><div id="statResults" class="stat-results">${content()}</div><section id="dropSourceDetail" class="upgrade-detail detail-dismissed" role="dialog" aria-modal="false" aria-labelledby="statDetailTitle"></section></section>`;
  if(state.view==='todo')root.StatTodo.mount(host.querySelector('#statTodoHost'),kind,result.todo);
  if(state.view==='items')root.StatItems.mount(host.querySelector('#statItemsHost'),kind);
  host.querySelectorAll('[data-stat-tab]').forEach(b=>b.onclick=()=>{if(b.dataset.statTab===kind)return;hosts.delete(host);navigate(b.dataset.statTab);});
  host.querySelectorAll('[data-stat-view]').forEach(b=>b.onclick=()=>{state.view=b.dataset.statView;if(state.view==='sources'&&state.selected==='all'&&chars.length)state.selected=String(chars[0].id);if(state.view!=='sources')state.selected='all';paint();});
  host.querySelector('#statCharacter').onchange=e=>{state.selected=e.target.value;paint();};
  host.querySelector('#statFilter').onchange=e=>{state.filter=e.target.value;paint();};
  host.querySelector('#statSearch').oninput=e=>{state.query=e.target.value.toLowerCase();host.querySelector('#dropSourceDetail').classList.add('detail-dismissed');host.querySelector('#statResults').innerHTML=content();};
  host.querySelector('#statResults').onclick=e=>{const item=e.target.closest('[data-stat-source]');if(!item)return;const ch=chars.find(c=>String(c.id)===item.dataset.statChar),row=ch?.rows?.[Number(item.dataset.statSource)];if(row)showSource(host,ch,row,item.matches('button')?item:item.querySelector('button'),kind);};
 }
 paint();
}
root.CombatStatTabs={render,characterHtml,missingHtml,formatNumber:num};
})(typeof window!=='undefined'?window:globalThis);
