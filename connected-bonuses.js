(function(root){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Match the effect, never the source: a Cooking meal can improve Mining.
const BENEFITS=[
 ['damage','Damage',/damage|\bdmg\b|weapon power|multikill|overkill/i],
 ['combat','Accuracy, defence & critical hits',/accuracy|defen[cs]e|critical|\bcrit\b|surviv|block chance/i],
 ['stats','Stats, HP, MP & talents',/\b(str|agi|wis|luk|hp|mp)\b|strength|agility|wisdom|luck|all stat|base stat|talent|health|mana/i],
 ['exp','Experience',/\bexp\b|\bxp\b|experience/i],
 ['drops','Drops, cards & money',/drop|\bcash\b|money|coins|card chance/i],
 ['afk','AFK & respawn',/afk|respawn|offline/i],
 ['mining','Mining',/mining|multi.ore|pickaxe|ore gain/i],
 ['chopping','Chopping',/chopping|multi.log|hatchet/i],
 ['fishing','Fishing',/fishing|multi.fish|fishing rod/i],
 ['catching','Catching',/catching|multi.bug|catching net/i],
 ['trapping','Trapping',/trapping|critter|trap |shiny pet/i],
 ['worship','Worship',/worship|souls|tower damage/i],
 ['skilling','General skilling',/skill|efficiency|efficicency|prowess/i],
 ['carry','Carry capacity & storage',/carry|carrying|storage|inventory|bag capacity/i],
 ['smithing','Smithing & Forge',/smithing|anvil|forge|smelt/i],
 ['alchemy','Alchemy',/alchemy|bubble|vial|sigil|cauldron|liquid|brew/i],
 ['construction','Construction, printing & refinery',/construction|build speed|cog|printer|printing|sample|refinery|salt production/i],
 ['cooking','Cooking',/cooking|meal|kitchen|ladle/i],
 ['breeding','Breeding',/breeding|incubat|egg|pet damage|pet power/i],
 ['lab','Laboratory',/laboratory|\blab\b|jewel|chip|line width|connection range/i],
 ['sailing','Sailing',/sailing|boat|artifact/i],
 ['gaming','Gaming',/gaming|\bbits\b|sprout|fertili/i],
 ['divinity','Divinity',/divinity|deity|divinities/i],
 ['farming','Farming',/farming|crop|evolution|overgrowth|beanstalk/i],
 ['sneaking','Sneaking',/sneaking|stealth|jade|door damage/i],
 ['summoning','Summoning',/summoning|essence|summon damage/i],
 ['hole','The Hole',/villager|cavern|opals|sediment|motherlode|motherload|bravery|justice|monument|wish|gambit|harp|hole /i],
 ['world7','World 7',/spelunk|research|coral|clam|sushi|minehead|amber|tachyon|stamina|outpost|royal|bone gain|dust gain/i]
];
const STATUS={active:'Active / available',owned:'Owned / inactive',missing:'Missing / locked',unknown:'Check save'};
const number=v=>Number.isFinite(v)&&Math.abs(v)>=1e42?v.toExponential(3):root.CombatStatTabs.formatNumber(v);
// Group presentation only; preserve the original calculation and dependency order.
const poolOrder=['Base','Additive','Multipliers','True multipliers','Percentage inputs','Caps & rules','Inputs','Intermediate calculations','Final total'];
function poolKind(r){
 const label=String(r.stage||r.name||'');
 // Outputs remain outputs even when their final expression includes a cap.
 if(/^result(?:\.|$)|^display/.test(r.id||''))return 'Final total';
 if(r.operation==='rule'||String(r.id||'').startsWith('?')||/\b(?:cap|caps|rounding)\b/i.test(label)||/\b(?:min|max|floor|ceil|round)\s*\(/i.test(r.formula||''))return 'Caps & rules';
 if(/true[ -]?(?:multi|multiplicative)/i.test(label))return 'True multipliers';
 // An explicit operation wins over the name of the surrounding stage.
 if(r.operation==='multiply'||r.group==='multi')return 'Multipliers';
 if(/\bbase\b|\bflat\b/i.test(label))return 'Base';
 if(r.operation==='add'||r.group==='additive'||/additive/i.test(label))return 'Additive';
 if(/multiplicative|multiplier|\bmulti\b/i.test(label))return 'Multipliers';
 if(/percent|%/i.test(label))return 'Percentage inputs';
 // Mixed expressions are intermediate calculations, not standalone multipliers.
 if(r.parents?.length)return 'Intermediate calculations';
 return 'Inputs';
}
function groupedRows(rows,render){
 const groups=new Map();
 for(const row of rows){const kind=poolKind(row),stage=row.stage||kind,key=kind+'|'+stage;if(!groups.has(key))groups.set(key,{kind,stage,rows:[]});groups.get(key).rows.push(row);}
 return [...groups.values()].sort((a,b)=>poolOrder.indexOf(a.kind)-poolOrder.indexOf(b.kind)||a.stage.localeCompare(b.stage)).map(g=>{
  const sorted=g.rows.slice().sort((a,b)=>{const av=typeof a.value==='number'&&Number.isFinite(a.value)?a.value:-Infinity,bv=typeof b.value==='number'&&Number.isFinite(b.value)?b.value:-Infinity;return bv-av;});
  return `<details class="connected-pool" data-calculation-pool="${esc(g.kind)}"><summary>${esc(g.kind)}${g.stage!==g.kind?' · '+esc(g.stage):''} <small>(${sorted.length})</small></summary>${sorted.map(r=>`<div class="connected-ranked-row" data-source-value="${typeof r.value==='number'&&Number.isFinite(r.value)?r.value:''}">${render(r)}</div>`).join('')}</details>`;
 }).join('');
}
function legacyTotalsHtml(totals,character){
 const cards=[['damage','Damage','', 'damage'],['dropRate','Drop rate','×','dropRate'],['classExp','Class EXP','×','classExp'],['cooking','Cooking speed',' / hr','cooking']];
 return `<div class="connected-totals">${cards.map(([key,title,unit,page])=>{
  const result=totals[key],ch=(result?.characters||result?.values||[]).find(c=>c.id===character),error=result?.error||ch?.error;
  if(!ch||error)return `<section class="connected-total"><h3>${title}</h3><strong>${result?'Unavailable':'Calculating…'}</strong><p>${esc(error||(result?'No saved character data.':'Reading your saved setup.'))}</p></section>`;
  const cooking=key==='cooking',rows=cooking?ch.sources.map(r=>({...r,operation:'multiply',active:r.value!==1,stage:'First kitchen speed'})):ch.rows;
  const formula=key==='damage'?`Maximum damage = ${number(ch.stages.baseDamage)} base × ${number(ch.stages.perDamage)} Per-X × ${number(ch.stages.percentDamage)} damage %. These stages already include their soft caps. HP/MP scaling is inside Per-X.`:key==='classExp'?'Add the base and additive EXP contributions, then apply the multiplier chain. Running totals include every source.':key==='dropRate'?(ch.cove?'Crystal Cove overrides normal drop rate here. The source list below explains the normal '+number(ch.normal)+'× rate.':'Additive contributions build the base drop rate, then multipliers apply in order. Special chip and bundle rules are included.'):`Combined speed adds all ${ch.kitchens} kitchens. The factors below multiply to the first kitchen’s ${number(ch.speeds[0])} / hr; kitchen upgrades can make the other kitchens different.`;
  const scenario=result?.scenarios?.find(s=>s.id==='current');
  const links=cooking&&scenario?`<p>Diamond Chef: ${number(scenario.diamond.perMeal)}× per diamond meal, raised to ${scenario.diamond.meals} meals. Blood Marrow scales across ${number(scenario.totalMealLevels)} total meal levels. Meal effects already include their account boosts.</p>`:'';
  return `<details class="connected-total" data-total="${key}"><summary><span>${title}</span><strong title="${esc(cooking?ch.speed:ch.total)}">${key==='dropRate'?ch.total.toLocaleString(undefined,{maximumFractionDigits:2}):number(cooking?ch.speed:ch.total)}${unit}</strong><small>${key==='damage'?'Maximum damage · saved setup':cooking?'All kitchens · saved active presets':'Saved character setup'} · view connections</small></summary><div class="connected-total-body">${ch.missing?.length?`<p>Incomplete export: ${esc(ch.missing.join(', '))}. Missing fields use defaults.</p>`:''}<p>${esc(formula)}</p>${links}${cooking?`<details><summary>Speed of each kitchen</summary>${ch.speeds.map((v,i)=>`<p>Kitchen ${i+1}: ${number(v)} / hr</p>`).join('')}</details>`:''}<p class="connected-note">Expand a calculation pool to see its sources from highest to lowest. Running totals follow the original calculation order.</p><div class="connected-ledger">${groupedRows(rows,r=>{
   const info=cooking?null:key==='dropRate'?root.DropSourceInfo.get(r):root.CombatSourceInfo.get(r,key);
   const value=r.display||(r.operation==='rule'?'Rule':`${r.operation==='multiply'?'×':r.value>=0?'+':''}${number(r.value)}${r.operation!=='multiply'?(r.unit||'×'):''}`);
   return `<details class="connected-factor${r.active?'':' inactive'}"><summary><span>${esc(r.name)}<small>${esc(r.stage||(r.operation==='multiply'?'Multiplier':'Additive pool'))}</small></span><b>${esc(value)}</b></summary><p>${esc(r.detail||info?.effect||(r.operation==='multiply'?'Multiplies the current pool.':'Adds inside this pool.'))}</p>${Number.isFinite(r.running)?`<p>Running total in original calculation order: ${number(r.running)}×</p>`:''}${info?.max?`<p>${esc(info.max)}</p>`:''}${info?.page?`<button class="secondary" data-connected-destination="${esc(info.page)}">Open ${esc(info.label||'source')}</button>`:''}</details>`;
  })}</div><button class="secondary" data-connected-destination="${page}">Open full ${title} breakdown</button></div></details>`;
 }).join('')}</div>`;
}
const extraCache=new WeakMap(),totalsCache=new WeakMap();
function loadTotals(raw,data){
 if(totalsCache.has(raw))return totalsCache.get(raw);
 const job=(async()=>{const totals={};for(const [key,load] of [['damage',()=>root.CombatStatTabs.calculate(raw,'damage')],['dropRate',()=>root.DropRate.calculate(raw)],['classExp',()=>root.CombatStatTabs.calculate(raw,'classExp')],['cooking',()=>root.Cooking.calculate(data,raw)],['extra',()=>loadExtra(raw)]]){try{totals[key]=await load();}catch(error){totals[key]={error:error.message};}}if(Object.values(totals).some(r=>r?.error))totalsCache.delete(raw);return totals;})();
 totalsCache.set(raw,job);return job;
}

function loadExtra(raw){
 if(extraCache.has(raw))return extraCache.get(raw);
 const job=new Promise((resolve,reject)=>{const worker=new Worker('connected-stats-worker.js'),timer=setTimeout(()=>finish(Error('Additional stat calculations timed out.')),90000);function finish(error,result){clearTimeout(timer);worker.terminate();error?reject(error):resolve(result);}worker.onmessage=e=>finish(e.data.error?Error(e.data.error):null,e.data.result);worker.onerror=e=>finish(Error(e.message));worker.postMessage(raw);});
 extraCache.set(raw,job);job.catch(()=>extraCache.delete(raw));return job;
}
function traceHtml(stat){
 const trace=stat.trace;if(!trace)return '';
 const links={allEff:'allEff',allSkillExp:'allExp',cookingEff:'cookingEff',movementSpeed:'movementSpeed',maxHp:'maxHp',maxMp:'maxMp',accuracy:'accuracy',survivability:'survivability',killPerkill:'killPerkill'};
 return `<h4>Calculation steps</h4><p class="connected-note">Expand a calculation group to see values from highest to lowest. Each step keeps its original inputs; intermediate totals are not separate bonuses to add together.</p><div class="connected-trace">${groupedRows(trace.rows,r=>`<details class="connected-trace-step"><summary><span>${esc(r.name)}</span><b>${number(r.value)}</b></summary><p>${esc(r.formula)}</p>${r.parents?.length?`<ul>${r.parents.map(p=>{const input=trace.rows[p];return `<li>${esc(input.name)}: <strong>${number(input.value)}</strong></li>`;}).join('')}</ul>`:''}${links[r.id]&&links[r.id]!==stat.id?`<button class="secondary" data-stat-open="${links[r.id]}" data-stat-title="${esc(r.name)}">Follow this stat’s sources</button>`:''}</details>`)}</div>`;
}
function primaryHtml(stat){
 const p=stat.primary;if(!p)return '';
 const exact=v=>Number(v).toLocaleString(undefined,{maximumFractionDigits:4});
 return `<div class="connected-reconciliation"><p><strong>Saved ${esc(stat.title)}: ${exact(p.saved)}</strong></p><p>Reconstructed: <strong>${exact(p.computed)}</strong></p>${p.difference!==0?`<p class="connected-mismatch">Not reconciled · difference ${p.difference>0?'+':''}${exact(p.difference)}. This is an unexplained difference, not a bonus. Saved stat snapshots and current decoded bonuses can differ.</p>${p.snapshotLevel!==p.currentLevel?`<p>The saved stat snapshot says level ${exact(p.snapshotLevel)}; the character level elsewhere in this export is ${exact(p.currentLevel)}.</p>`:''}`:'<p>Matches the saved total.</p>'}<p>floor(${exact(p.baseTotal)} base × ${exact(p.multiplier)} + ${exact(p.outside)} final additions) = ${exact(p.computed)}</p><details><summary>How the pools combine</summary><p>Equipment base × (1 + equipment amplification % / 100) = ${exact(p.equipment)}.</p><p>Obol base × (1 + obol amplification % / 100) = ${exact(p.obols)}.</p><p>Add both to the base additions. Multiply by 1 + (additive stat % + the all-stat % pool rounded down to one decimal) / 100. Add total-stat alchemy, Stat Overload and Sandy Pot afterward, then round down.</p></details>${p.unknown.length?`<p>Unresolved sources: ${esc(p.unknown.join(', '))}</p>`:''}</div>`;
}
function totalsHtml(totals,character,query='',bodyCache=new Map(),openGroups=new Set()){
 const cards=[];
 for(const [key,title,unit,group] of [['damage','Damage','','Combat'],['dropRate','Drop rate','×','Drops & money'],['classExp','Class EXP','×','Experience'],['cooking','Cooking speed',' / hr','Cooking']]){
  const result=totals[key],ch=(result?.characters||result?.values||[]).find(c=>c.id===character),error=result?.error||ch?.error;
  const value=!ch||error?'Unavailable':key==='dropRate'?ch.total.toLocaleString(undefined,{maximumFractionDigits:2})+unit:number(key==='cooking'?ch.speed:ch.total)+unit;
  cards.push({id:key,title,value,group,note:key==='cooking'?'All kitchens · saved active presets':'Saved character setup',body:()=>{
   if(!ch||error)return `<p>${esc(error||'No saved character data.')}</p>`;
   const holder=document.createElement('div');holder.innerHTML=legacyTotalsHtml({[key]:result},character);
   return holder.querySelector(`[data-total="${key}"] .connected-total-body`)?.innerHTML||'';
  }});
 }
 const extras=[...(totals.extra?.characters?.find(c=>c.id===character)?.entries||[]),...(totals.extra?.account||[])];
 for(const stat of extras){
  const body=()=>{const steps=traceHtml(stat);
  const ledger=primaryHtml(stat)+(stat.rows.length?`<h4>Calculation sources</h4><p class="connected-note">Sources are sorted highest to lowest within each calculation pool. Values retain their original units and are not amounts to add directly to the final total.</p>${groupedRows(stat.rows,r=>`<div class="connected-source-value"><span>${esc(r.name)}</span><b>${esc(r.display||(typeof r.value==='number'?number(r.value):r.value))}</b></div>${r.detail?`<p class="connected-note">${esc(r.detail)}</p>`:''}${r.linkedStat?`<button class="secondary" data-stat-open="${esc(r.linkedStat)}">See golden-food effect sources</button>`:''}`)}`:'')+(stat.rows.length&&steps?`<details class="connected-full-trace"><summary>Calculation steps · full trace</summary>${steps}</details>`:steps);
  return `<p class="connected-popup-number">${stat.value===null?'Unavailable':number(stat.value)+esc(stat.unit)}</p><p>${esc(stat.note)}</p>${ledger}<button class="secondary" data-related-benefit="${esc(stat.benefit)}">Explore related bonus sources</button>`;};
  cards.push({id:stat.id,title:stat.title,value:stat.value===null?'Unavailable':number(stat.value)+stat.unit,group:['cash','crystal'].includes(stat.id)?'Drops & money':['allExp'].includes(stat.id)||stat.group==='Skill EXP'?'Experience':stat.id==='cookingEff'?'Cooking':stat.group,note:stat.id.startsWith('account.')||stat.id==='bits'?'Account-wide':'Selected character',body});
 }
 bodyCache.clear();for(const card of cards)bodyCache.set(card.id,{title:card.title,html:card.body});
 const filtered=cards.filter(s=>`${s.title} ${s.group} ${s.note}`.toLowerCase().includes(query.toLowerCase().trim())),groups=[...new Set(filtered.map(s=>s.group))].sort((a,b)=>{const order=['Combat','Stats','Drops & money','Experience','Skilling','AFK gains','Food','Carry capacity','Production','Construction','Cooking'];const rank=g=>order.includes(g)?order.indexOf(g):order.length;return rank(a)-rank(b)||a.localeCompare(b);});
 return `<p class="connected-stat-count" role="status">${cards.length} stat totals${totals.extra?'':' · Loading more game stats…'}${totals.extra?.error?' · '+esc(totals.extra.error):''}</p>${groups.map(group=>`<details class="connected-stat-group" data-stat-group="${esc(group)}" ${openGroups.has(group)?'open':''}><summary>${esc(group)} <small>${filtered.filter(s=>s.group===group).length} stats</small></summary><div class="connected-totals">${filtered.filter(s=>s.group===group).map(s=>`<button type="button" class="connected-total" data-total="${esc(s.id)}" data-stat-open="${esc(s.id)}" data-stat-title="${esc(s.title)}" aria-haspopup="dialog" title="${esc(s.note)}"><span>${esc(s.title)}</span><strong>${esc(s.value)}</strong></button>`).join('')}</div></details>`).join('')||'<p>No stats match your search.</p>'}`;
}
function model(rows){
 const unique=new Map();
 for(const row of rows){const key=JSON.stringify([row.source,row.name,row.effect,row.level,row.status]);if(!unique.has(key))unique.set(key,row);}
 const entries=[...unique.values()].map((r,id)=>{const text=r.benefitText||r.effect||'',benefits=BENEFITS.filter(([, ,pattern])=>pattern.test(text)).map(([key])=>key);return {...r,id,benefits:benefits.length?benefits:['other']};});
 return {entries,groups:[...BENEFITS.map(([id,title])=>({id,title})),{id:'other',title:'Other bonuses & unlocks'}].map(g=>({...g,entries:entries.filter(r=>r.benefits.includes(g.id))})).filter(g=>g.entries.length),sources:[...new Set(entries.map(r=>r.source))].sort()};
}
function readableTable(rows){
 if(!rows.length)return '<p>No account entries match these filters.</p>';
 return `<div class="connected-data-scroll"><table class="connected-data-table"><caption>Saved account buffs and values</caption><thead><tr><th scope="col">Source system</th><th scope="col">Buff / entry</th><th scope="col">Level / progress</th><th scope="col">Value / effect</th><th scope="col">Status</th></tr></thead><tbody>${rows.slice().sort((a,b)=>String(a.source||'Unknown source').localeCompare(String(b.source||'Unknown source'))||String(a.name||'Unnamed entry').localeCompare(String(b.name||'Unnamed entry'))).map(r=>`<tr><td>${esc(r.source)}</td><th scope="row"><button type="button" class="secondary" data-connected-entry="${r.id}" aria-haspopup="dialog">${esc(r.name||'Unnamed entry')}</button></th><td>${esc(r.level||'—')}</td><td>${r.value!=null?`<strong>${esc(r.value)}</strong><br>`:''}${esc(r.effect||'Value unavailable')}${r.note?`<small>${esc(r.note)}</small>`:''}</td><td>${esc(STATUS[r.status]||'Check save')}</td></tr>`).join('')}</tbody></table></div>`;
}
async function render(host,raw,data){
 host.innerHTML='<section class="connected-bonuses"><h2>All Account Bonuses</h2><p role="status">Connecting bonus sources…</p></section>';
 const shell=host.firstElementChild;
 if(!raw||!Object.keys(data||{}).length){shell.innerHTML='<h2>All Account Bonuses</h2><p>Load your account save on Home to see bonuses from all connected systems.</p>';return;}
 let view='overview';let character=0;const totals={};let statQuery='';const bodyCache=new Map(),openGroups=new Set();
 shell.innerHTML='<div class="section-head"><div><p class="eyebrow">Your account · the whole picture</p><h2>All Account Bonuses</h2><p>Compact totals from your saved setup. Click a tile for its calculation and connected sources.</p></div></div><nav class="skill-tabs" aria-label="Account bonus views"><button type="button" class="skill-tab active" data-bonus-view="overview" aria-pressed="true">Overview</button><button type="button" class="skill-tab" data-bonus-view="data" aria-pressed="false">Readable data</button></nav><div class="connected-toolbar"><label class="connected-character">Character<select id="connectedTotalCharacter"></select></label><label class="connected-stat-search">Find a stat<input id="connectedStatSearch" type="search" placeholder="Damage, AFK, efficiency, EXP, capacity…"></label></div><div id="connectedTotals"></div><section id="connectedPopup" class="connected-popup" role="dialog" aria-modal="false" aria-labelledby="connectedPopupTitle" hidden></section><div id="connectedCatalogue"><p role="status">Loading every bonus system…</p></div>';
 const marker=shell.querySelector('#connectedCatalogue'),totalHost=shell.querySelector('#connectedTotals'),picker=shell.querySelector('#connectedTotalCharacter');
 marker.hidden=true;
 const names=raw.charNames||[];
 picker.innerHTML=names.map((name,id)=>`<option value="${id}">${esc(name)}</option>`).join('')||'<option value="0">Character 1</option>';
 let refreshCatalogue=()=>{},catalogueEntries=[];
 shell.querySelectorAll('[data-bonus-view]').forEach(button=>button.onclick=()=>{view=button.dataset.bonusView;shell.querySelectorAll('[data-bonus-view]').forEach(tab=>{tab.classList.toggle('active',tab===button);tab.setAttribute('aria-pressed',String(tab===button));});totalHost.hidden=view==='data';shell.querySelector('.connected-stat-search').hidden=view==='data';marker.hidden=false;closePopup();refreshCatalogue();});const popup=shell.querySelector('#connectedPopup');let popupTrigger=null;
 function closePopup(){popup.hidden=true;popup.innerHTML='';if(popupTrigger?.isConnected)popupTrigger.focus();}
 function openPopup(title,html,trigger){popupTrigger=trigger;popup.innerHTML=`<button class="secondary upgrade-close" data-close-connected aria-label="Close bonus details">Close</button><h3 id="connectedPopupTitle">${esc(title)}</h3>${html}`;popup.hidden=false;popup.querySelector('[data-close-connected]').onclick=closePopup;popup.querySelector('[data-close-connected]').focus();}
 popup.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();closePopup();}};
 function drawTotals(){if(!ready)return;for(const group of totalHost.querySelectorAll('[data-stat-group]')){if(group.open)openGroups.add(group.dataset.statGroup);else openGroups.delete(group.dataset.statGroup);}totalHost.innerHTML=totalsHtml(totals,character,statQuery,bodyCache,openGroups);}
 shell.querySelector('#connectedStatSearch').oninput=e=>{statQuery=e.target.value;drawTotals();};
 picker.onchange=()=>{character=Number(picker.value);closePopup();drawTotals();refreshCatalogue();};
 shell.onclick=e=>{const related=e.target.closest('[data-related-benefit]');if(related){const select=marker.querySelector('#connectedBenefit');if(select){select.value=[...select.options].some(o=>o.value===related.dataset.relatedBenefit)?related.dataset.relatedBenefit:'';select.dispatchEvent(new Event('change',{bubbles:true}));marker.scrollIntoView({block:'start',behavior:'smooth'});closePopup();}return;}const tile=e.target.closest('[data-stat-open]');if(tile){const key=tile.dataset.statOpen,template=bodyCache.get(key);if(template){if(typeof template.html==='function')template.html=template.html();openPopup(template.title,template.html,tile);}return;}const entry=e.target.closest('[data-connected-entry]');if(entry){const r=catalogueEntries[Number(entry.dataset.connectedEntry)];if(r)openPopup(r.name,`<p class="eyebrow">${esc(r.source)} · ${esc(r.level)}</p><p class="exp-benefit">${esc(r.effect)}</p><p>${esc(r.note||'Conditions follow the source system’s decoded description.')}</p>${r.page?`<button class="secondary" data-connected-destination="${esc(r.page)}">Open source</button>`:''}`,entry);return;}const button=e.target.closest('[data-connected-destination]');if(button){let page=button.dataset.connectedDestination;if(['damage','dropRate','classExp'].includes(page)){root.Loadouts.selectTab(page==='dropRate'?'drop':page);page='loadouts';}root.dispatchEvent(new CustomEvent('idleon:navigate',{detail:page}));}};
 totalHost.innerHTML='<p class="connected-stat-count" role="status">Calculating account stats…</p>';
 let ready=false;
 loadTotals(raw,data).then(result=>{if(!host.contains(shell))return;Object.assign(totals,result);ready=true;drawTotals();marker.hidden=false;});
 const results=await Promise.allSettled([root.BonusSystems.getRowsAsync(raw),root.BubbleOptimizer.prepare(raw),root.StampCalculator.load(raw)]);
 if(!host.contains(marker))return;
 if(results[0].status==='rejected'){marker.innerHTML=`<h2>All Account Bonuses</h2><p>Could not load bonuses: ${esc(results[0].reason?.message)}</p>`;return;}
 let base;
 try{base=root.MiscBuffs.model(data,raw).rows;}catch(error){marker.innerHTML=`<h2>All Account Bonuses</h2><p>Could not load bonuses: ${esc(error.message)}</p>`;return;}
 let query='',source='',benefit='',status='current',groupBy='source';
 const warnings=results.slice(1).some(r=>r.status==='rejected')?'Some detailed calculations are unavailable; those entries retain their source descriptions.':'';
 const stamps=results[2].status==='fulfilled'?results[2].value:null;
 const reportCache=new Map();
 function report(){
  if(reportCache.has(character))return reportCache.get(character);
  let rows=base;
  if(results[1].status==='fulfilled'){
   rows=rows.filter(r=>r.source!=='Alchemy Bubbles');
   rows=rows.concat(root.BubbleBonuses.model(raw,root.ALCHEMY_CATALOG,results[1].value).entries.map(r=>({source:'Alchemy Bubbles',name:r.name,effect:r.summary.effect,benefitText:r.label,level:r.level===null?'Level unknown':`Lv ${r.level}`,value:r.value,target:r.targetValue,targetLabel:r.targetLabel,note:[r.qualifier,r.summary.scope,r.summary.note].filter(Boolean).join(' · '),status:r.level===null?'unknown':r.level===0?'missing':r.active?'owned':'active',page:'bubbleBonuses'})));
  }
  if(stamps){rows=rows.filter(r=>r.source!=='Stamps').concat(root.StampBonuses.model(stamps,character).entries.map(r=>({source:'Stamps',name:r.name,effect:r.effectText,benefitText:r.label,level:r.known?`Lv ${r.level}`:'Level unknown',value:r.value,target:r.targetValue,targetLabel:r.targetLabel,note:r.targetText,status:!r.known?'unknown':r.level===0?'missing':'active',page:'stampBonuses'})));}
  const result=model(rows);reportCache.set(character,result);return result;
 }
 function paint(){
  const m=report();catalogueEntries=m.entries;const matches=r=>(status==='all'||(status==='current'&&r.status!=='missing')||r.status===status)&&(!source||r.source===source)&&(!benefit||r.benefits.includes(benefit))&&`${r.source} ${r.name} ${r.effect} ${r.benefitText||''}`.toLowerCase().includes(query.toLowerCase().trim()),filtered=m.entries.filter(matches);
  const groups=groupBy==='source'?m.sources.map(title=>({id:title,title,entries:filtered.filter(r=>r.source===title)})):m.groups.filter(g=>!benefit||g.id===benefit).map(g=>({...g,entries:g.entries.filter(matches)}));
  marker.innerHTML=`<div class="section-head"><div><p class="eyebrow">All your bonus systems</p><h2>${view==='data'?'Readable account data':'Explore the sources'}</h2><p>${view==='data'?'Your saved buffs and values across connected systems, in one table.':'Expand Alchemy, Stamps, Cooking, or any other source to see its bonuses.'}</p></div></div><div class="connected-controls"><label>Find a bonus<input id="connectedSearch" type="search" placeholder="Cooking, damage, mining…" value="${esc(query)}"></label><label>Benefit<select id="connectedBenefit"><option value="">Every benefit</option>${m.groups.map(g=>`<option value="${g.id}" ${benefit===g.id?'selected':''}>${esc(g.title)}</option>`).join('')}</select></label><label>Source<select id="connectedSource"><option value="">Every source (${m.sources.length})</option>${m.sources.map(s=>`<option ${source===s?'selected':''}>${esc(s)}</option>`).join('')}</select></label><label>Show<select id="connectedStatus">${[['current','Current account entries'],['all','All bonuses'],...Object.entries(STATUS)].map(([id,title])=>`<option value="${id}" ${id===status?'selected':''}>${title}</option>`).join('')}</select></label><label ${view==='data'?'hidden':''}>Group by<select id="connectedGrouping"><option value="benefit" ${groupBy==='benefit'?'selected':''}>Benefit</option><option value="source" ${groupBy==='source'?'selected':''}>Source system</option></select></label></div><p class="connected-note">Each entry is a separate contribution, not a combined stat total. Benefits are grouped from their effect descriptions; bonuses affecting several benefits appear in each. Equipment, activation and character requirements still apply. Bubble values are before matching-class boosts.</p>${warnings?`<p role="status">${esc(warnings)}</p>`:''}<p id="connectedCount" role="status">${filtered.length} unique entries · ${new Set(filtered.map(r=>r.source)).size} sources</p>${view==='data'?readableTable(filtered):''}<div class="connected-groups" ${view==='data'?'hidden':''}>${(view==='data'?[]:groups).filter(g=>g.entries.length).map(g=>`<details class="connected-group"><summary><h3>${esc(g.title)}</h3><span>${g.entries.length} contributions · ${new Set(g.entries.map(r=>r.source)).size} sources</span></summary><div>${g.entries.slice(0,6).map(card).join('')}</div>${g.entries.length>6?`<details class="connected-more"><summary>Show ${g.entries.length-6} more contributions</summary><div data-more="${esc(g.id)}"></div></details>`:''}</details>`).join('')||'<p>No bonuses match these filters.</p>'}</div>`;
  const controls={connectedBenefit:v=>benefit=v,connectedSource:v=>source=v,connectedStatus:v=>status=v,connectedGrouping:v=>groupBy=v,connectedCharacter:v=>character=Number(v)};
  for(const [id,set] of Object.entries(controls)){const el=marker.querySelector('#'+id);if(el)el.onchange=()=>{set(el.value);paint();};}
  marker.querySelector('#connectedSearch').oninput=e=>{const cursor=e.target.selectionStart;query=e.target.value;paint();const input=marker.querySelector('#connectedSearch');input.focus();input.setSelectionRange(cursor,cursor);};
  marker.querySelectorAll('.connected-more').forEach(el=>el.ontoggle=()=>{const slot=el.querySelector('[data-more]');if(el.open&&!slot.hasChildNodes())slot.innerHTML=groups.find(g=>g.id===slot.dataset.more).entries.slice(6).map(card).join('');});
 }
 function card(r){return `<button type="button" class="connected-entry" data-connected-entry="${r.id}" aria-haspopup="dialog"><span><strong>${esc(r.name)}</strong><small>${esc(r.source)} · ${esc(r.level)}</small></span><span class="connected-value">${esc(r.value??STATUS[r.status]??'Check save')}</span></button>`;}

 refreshCatalogue=paint;
 paint();
}
const api={model,render,readableTable,BENEFITS,poolKind,groupedRows};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ConnectedBonuses=api;
})(typeof window!=='undefined'?window:globalThis);
