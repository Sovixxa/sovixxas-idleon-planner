(function(root){
'use strict';
const SHEET_URL='https://docs.google.com/spreadsheets/d/1at-y9t5ohYky33nOLoSxHYeyRX-3T91paj-nTSHrB3c/edit?gid=1826222324#gid=1826222324';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const data=()=>root.LOADOUT_DATA||(typeof require==='function'?require('./loadouts-data'):null);
const ORDER=['Equipment','Specials','Food','Chips','Cards','Card set','Prayers','Obols','Trophy','Tools & extras'];
const hints={Equipment:'Gear slots',Specials:'Keychains, gown, cape & ring',Food:'Food slots',Chips:'Chip slots',Cards:'Eight-card layout','Card set':'Set bonus',Prayers:'Prayer choices',Obols:'Obol layout',Trophy:'Trophy options','Tools & extras':'Tools, trap & skull'};
let activeId='crystal-dk',group='All builds',category='All slots',query='',activeTab='builds',carryCharacter='all';
function grouped(ids,catalog,section){
 // Reference equipment is stored in paired columns; display armor together first.
 if(section==='Equipment')ids=[0,2,4,6,1,3,5,7].map(index=>ids[index]).filter(Boolean);
 const rows=new Map();
 for(const id of ids){if(!catalog[id])continue;if(rows.has(id))rows.get(id).quantity++;else rows.set(id,{id,...catalog[id],quantity:1});}
 return [...rows.values()];
}
function model(){
 const source=data();return{builds:source?.builds||[],items:source?.items||{}};
}
function fmt(value){const n=Number(value);return Number.isFinite(n)?n.toLocaleString('en-US'):'—';}
function carryModel(raw){
 if(!raw||!Object.keys(raw.data||raw).length)return {players:[]};
 try{
  const systems=root.BeanValueEngine?.systems?.(raw);
  const players=systems?.get?.('players')||[],capacity=systems?.get?.('capacity'),capacityPlayers=capacity?.players||[];
  return {players:players.map(player=>({...player,capacity:capacityPlayers.find(entry=>entry.playerID===player.playerID)})),capacity,systems};
 }catch(error){return {players:[],error};}
}
function carryRows(player){
 const slots=Number(player?.capacity?.totalInventorySlots)||0;
 return (player?.capacity?.bags||[]).map(bag=>({
  type:bag.name,name:bag.displayName||bag.name,base:bag.capacity,perSlot:bag.maxCarry,max:Number(bag.maxCarry||0)*slots,missing:!Number(bag.capacity)
 }));
}
function carryAudit(player,systems){
 const findStamp=id=>(systems?.get?.('stamps')||[]).flat().find(stamp=>stamp.raw_name===id);
 const value=(fn,fallback=0)=>{try{const result=fn?.();return Number.isFinite(Number(result))?Number(result):fallback;}catch{return fallback;}};
 const activePrayers=player?.activePrayers||[],prayers=systems?.get?.('prayers')||[];
 const starSigns=(player?.starSigns||[]).map(star=>({name:star.name||'Carry Cap star sign',value:value(()=>star.getBonus('Carry Cap'))})).filter(star=>star.value);
 const bribe=(systems?.get?.('bribes')||[]).find(row=>row.name==='Bottomless Bags');
 const gem=systems?.get?.('gems')?.purchases?.[58],gemBuys=Number(gem?.pucrhased)||0;
 const source=(scope,name,current,status,detail)=>({scope,name,current,status,detail});
 const isActive=current=>current?'active':'missing';
 const allCarryStamp=findStamp('StampC2'),allStamp=value(()=>allCarryStamp?.getBonus());
 const guild=value(()=>systems?.get?.('guild')?.guildBonuses?.[2]?.getBonus()),telekinetic=value(()=>player?.getTalentBonus?.(634)),shrine=value(()=>systems?.get?.('shrines')?.[3]?.getBonus?.(player?.currentMapId)),vault=value(()=>systems?.get?.('upgradeVault')?.getBonusForId?.(17)),extraBags=value(()=>player?.getTalentBonus?.(78));
 const rows=[
  source('All bags','Guild Rucksack',guild,isActive(guild),'Guild bonus'),
  source('All bags','Telekinetic Storage',telekinetic,isActive(telekinetic),'Character talent'),
  source('All bags','Carry Shrine',shrine,isActive(shrine),'Map-dependent shrine bonus'),
  source('All bags','Ruck Sack prayer',value(()=>prayers[12]?.getBonus?.()),activePrayers.includes(12)?'active':'inactive','Only applies while this prayer is active'),
  source('All bags','Bottomless Bags bribe',bribe?.status===1?Number(bribe.value)||5:0,bribe?.status===1?'active':'missing','Account bribe'),
  source('All bags','Carry Cap star signs',starSigns.reduce((sum,star)=>sum+star.value,0),starSigns.length?'active':'missing',starSigns.length?starSigns.map(star=>`${star.name} +${fmt(star.value)}%`).join(', '):'No equipped carry-cap star sign'),
  source('All bags',allCarryStamp?.name||'Mason Jar Stamp',allStamp,allStamp?'active':'missing','All carry-capacity stamp'),
  source('All bags','Gem Shop capacity',gemBuys,gemBuys?'active':'missing',`${fmt(gemBuys)}/${fmt(gem?.maxPurchases)} purchases · +${fmt(gemBuys*25)}%`),
  source('All bags','Upgrade Vault capacity',vault,isActive(vault),'Flat capacity before multipliers'),
  source('Materials only','Extra Bags',extraBags,isActive(extraBags),'Character talent'),
  source('All bags','Inventory slots',Number(player?.capacity?.totalInventorySlots)||0,'active','Multiplies each per-slot capacity into the total'),
  source('All bags','Zerg Rushogen',activePrayers.includes(4)?-value(()=>prayers[4]?.getCurse?.()):0,activePrayers.includes(4)?'penalty':'inactive',activePrayers.includes(4)?'Active prayer reduces all capacity':'No carry-capacity penalty')
 ];
 for(const bag of player?.capacity?.bags||[]){if(!bag.stampName)continue;const stamp=findStamp(bag.stampName),level=player?.skills?.get?.(bag.skill)?.level||0,bonus=value(()=>stamp?.getBonus?.(level));rows.push(source(`${bag.displayName||bag.name} only`,stamp?.name||`${bag.displayName||bag.name} carry-capacity stamp`,bonus,bonus?'active':'missing',`Scales with ${bag.displayName||bag.name.toLowerCase()} skill level: ${fmt(level)}`));}
 return rows;
}
function carryAdvice(player,systems){
 const rows=carryRows(player),seen=new Set(),advice=[];
 rows.filter(row=>row.missing).forEach(row=>{const id='bag:'+row.type;if(!seen.has(id)){seen.add(id);advice.push({title:`${row.type} bag is missing`,detail:`${player.playerName||'This character'} has no recognized ${row.type.toLowerCase()} bag. Craft, buy, or earn the next bag tier, then equip it.`});}});
 carryAudit(player,systems).filter(source=>source.status==='missing'||source.status==='inactive').forEach(source=>advice.push({title:`${source.name}: ${source.status}`,detail:source.detail}));
 if(!advice.length)advice.push({title:'No missing decoded carry-capacity source',detail:'All audited sources have a current bonus. Raise bag tiers or inventory slots for further capacity.'});
 return advice;
}
function renderDrop(host,raw){
 return root.DropRate.render(host,raw,tab=>{activeTab=tab;render(host,raw);});
}
function renderCarry(host,raw){
 const m=carryModel(raw),players=m.players;
 if(!players.length){host.innerHTML=`<section class="loadouts-page"><div class="section-head compact loadout-heading"><div><p class="eyebrow">Optimizers</p><h2>Carry Capacity</h2><p>Load a complete IdleOn export to calculate each character’s bags, slot capacity, and missing upgrades.</p></div></div><nav class="skill-tabs loadout-groups" aria-label="Loadout sections"><button type="button" class="skill-tab" data-loadout-tab="builds">Build loadouts</button><button type="button" class="skill-tab active" data-loadout-tab="carry" aria-current="page">Carry Capacity</button><button type="button" class="skill-tab" data-loadout-tab="drop">Drop Rate</button><button type="button" class="skill-tab" data-loadout-tab="damage">Damage</button><button type="button" class="skill-tab" data-loadout-tab="classExp">Class EXP</button></nav><section class="carry-empty"><h3>No character capacity data yet</h3><p>${m.error?'The save could not be decoded. Try importing a fresh full export.':'Import your save from Home, then return here.'}</p></section></section>`;host.querySelectorAll('[data-loadout-tab]').forEach(button=>button.onclick=()=>{activeTab=button.dataset.loadoutTab;render(host,raw);});return;
 }
 const selected=carryCharacter==='all'?null:players.find(player=>String(player.playerID)===carryCharacter)||players[0];
 const display=selected?[selected]:players;
 const table=player=>{const rows=carryRows(player),slots=player?.capacity?.totalInventorySlots,audit=selected?carryAudit(player,m.systems):[];return `<details class="carry-character"><summary><div><h3>${esc(player.playerName||player.name||`Character ${Number(player.playerID)+1}`)}</h3><small>${esc(player.class||'Character')} · ${fmt(slots)} inventory slots</small></div><div class="carry-summary"><strong>${fmt(Math.max(0,...rows.map(row=>Number(row.max)||0)))}</strong><span>largest total · expand</span></div></summary><div class="carry-table-wrap"><table class="carry-table"><thead><tr><th>Bag type</th><th>Bag</th><th>Base</th><th>Per slot</th><th>Total capacity</th><th>Status</th></tr></thead><tbody>${rows.map(row=>`<tr class="${row.missing?'carry-missing':''}"><td>${esc(row.type)}</td><td>${esc(row.name)}</td><td>${fmt(row.base)}</td><td>${fmt(row.perSlot)}</td><td>${fmt(row.max)}</td><td>${row.missing?'Missing bag':'Equipped'}</td></tr>`).join('')||'<tr><td colspan="6">No carry bags were decoded for this character.</td></tr>'}</tbody></table></div>${selected?`<section class="carry-audit"><h4>Carry-capacity source audit</h4><div class="carry-table-wrap"><table class="carry-table"><thead><tr><th>Scope</th><th>Source</th><th>Current</th><th>Status</th><th>Notes</th></tr></thead><tbody>${audit.map(source=>`<tr class="carry-source-${esc(source.status)}"><td>${esc(source.scope)}</td><td>${esc(source.name)}</td><td>${fmt(source.current)}${source.name==='Gem Shop capacity'?' purchases':source.name==='Upgrade Vault capacity'?' base':source.name==='Inventory slots'?' slots':'%'}</td><td>${esc(source.status)}</td><td>${esc(source.detail)}</td></tr>`).join('')}</tbody></table></div></section><div class="carry-advice"><h4>Missing &amp; upgrade opportunities</h4><ul>${carryAdvice(player,m.systems).map(item=>`<li><strong>${esc(item.title)}</strong><span>${esc(item.detail)}</span></li>`).join('')}</ul></div>`:''}</details>`;};
 host.innerHTML=`<section class="loadouts-page"><div class="section-head compact loadout-heading"><div><p class="eyebrow">Optimizers · saved account</p><h2>Carry Capacity</h2><p>Actual carry capacity per inventory slot and total capacity, calculated from your bags and active account bonuses.</p></div></div><nav class="skill-tabs loadout-groups" aria-label="Loadout sections"><button type="button" class="skill-tab" data-loadout-tab="builds">Build loadouts</button><button type="button" class="skill-tab active" data-loadout-tab="carry" aria-current="page">Carry Capacity</button><button type="button" class="skill-tab" data-loadout-tab="drop">Drop Rate</button><button type="button" class="skill-tab" data-loadout-tab="damage">Damage</button><button type="button" class="skill-tab" data-loadout-tab="classExp">Class EXP</button></nav><div class="loadout-controls carry-controls"><label>Character<select id="carryCharacter"><option value="all">All characters — capacity overview</option>${players.map(player=>`<option value="${esc(player.playerID)}" ${selected===player?'selected':''}>${esc(player.playerName||player.name||`Character ${Number(player.playerID)+1}`)}</option>`).join('')}</select></label></div>${selected?'<p class="loadout-note">Expand the character to see every decoded carry-capacity source. “Missing” is a zero bonus; “inactive” is unlocked but not currently active; “penalty” lowers capacity. Total capacity is per-slot capacity × inventory slots.</p>':'<p class="loadout-note">Each character starts collapsed for quick comparison. Choose one to audit every carry-capacity source and upgrade opportunity.</p>'}<div class="carry-characters">${display.map(table).join('')}</div></section>`;
 host.querySelectorAll('[data-loadout-tab]').forEach(button=>button.onclick=()=>{activeTab=button.dataset.loadoutTab;render(host,raw);});
 host.querySelector('#carryCharacter').onchange=e=>{carryCharacter=e.target.value;renderCarry(host,raw);};
}
function render(host,raw={}){
 if(activeTab==='damage'||activeTab==='classExp'){return root.CombatStatTabs.render(host,raw,activeTab,tab=>{activeTab=tab;render(host,raw);});}if(activeTab==='carry'){renderCarry(host,raw);return;}if(activeTab==='drop'){renderDrop(host,raw);return;}
 const m=model();
 const paint=()=>{
  const choices=m.builds.filter(b=>group==='All builds'||b.group===group);
  const build=choices.find(b=>b.id===activeId)||choices[0];if(!build)return;
  activeId=build.id;
  const categories=ORDER.filter(c=>build.sections[c]?.length);
  if(category!=='All slots'&&!categories.includes(category))category='All slots';
  const count=Object.values(build.sections).reduce((sum,ids)=>sum+ids.length,0);
  host.innerHTML=`<section class="loadouts-page"><div class="section-head compact loadout-heading"><div><p class="eyebrow">Optimizers</p><h2>Loadouts</h2><p>Choose a setup. Hover for names; click any item for details.</p></div><a class="loadout-source" href="${SHEET_URL}" target="_blank" rel="noopener noreferrer">AlmostPsycho’s sheet ↗<small>Updated from Herus’ sheet</small></a></div><nav class="skill-tabs loadout-groups" aria-label="Loadout activities">${['All builds','Combat','Skills','Snapshots'].map(g=>`<button type="button" class="skill-tab ${g===group?'active':''}" data-loadout-group="${g}" aria-pressed="${g===group}">${g}</button>`).join('')}<button type="button" class="skill-tab" data-loadout-tab="carry">Carry Capacity</button><button type="button" class="skill-tab" data-loadout-tab="drop">Drop Rate</button><button type="button" class="skill-tab" data-loadout-tab="damage">Damage</button><button type="button" class="skill-tab" data-loadout-tab="classExp">Class EXP</button></nav><div class="loadout-controls"><label>Loadout<select id="loadoutBuild">${choices.map(b=>`<option value="${b.id}" ${b.id===activeId?'selected':''}>${esc(b.title)}</option>`).join('')}</select></label><label>Show<select id="loadoutCategory">${['All slots',...categories].map(c=>`<option ${c===category?'selected':''}>${esc(c)}</option>`).join('')}</select></label><label class="loadout-search">Find an item<input id="loadoutSearch" type="search" placeholder="Item, card or bonus…" value="${esc(query)}"></label></div><div class="loadout-build-banner"><img src="assets/${esc(build.sections.Equipment?.[1]||build.sections.Equipment?.[0])}.png" alt=""><div><p class="eyebrow">${esc(build.group)}</p><h3>${esc(build.title)}</h3></div><span>${count} listed slots</span></div>${build.note?'<p class="loadout-note">'+esc(build.note)+'</p>':''}<div id="loadoutSections" class="loadout-sections"></div>${build.fishingGuide?fishTable(build.fishingGuide,m.items):''}<section id="loadoutDetail" class="upgrade-detail detail-dismissed" role="dialog" aria-label="Loadout item details"></section></section>`;
  const drawItems=()=>{
   const sections=categories.filter(c=>category==='All slots'||c===category).map(c=>({name:c,rows:grouped(build.sections[c],m.items,c).filter(item=>!query||[item.name,item.description,...(item.bonuses||[])].join(' ').toLowerCase().includes(query.toLowerCase()))})).filter(s=>s.rows.length);
   const target=host.querySelector('#loadoutSections');
   target.innerHTML=sections.map(section=>`<section class="loadout-section"><header><h4>${esc(section.name)}</h4><small>${esc(hints[section.name])}</small></header><div class="arcade-grid loadout-items">${section.rows.map(item=>tile(item,section.name)).join('')}</div></section>`).join('')||'<p class="loadout-empty">No items match this search.</p>';
   target.querySelectorAll('[data-loadout-item]').forEach(button=>button.onclick=()=>showDetail(host,button,m.items[button.dataset.loadoutItem],button.dataset.loadoutItem,button.dataset.slot));
  };
  host.querySelectorAll('[data-loadout-group]').forEach(button=>button.onclick=()=>{group=button.dataset.loadoutGroup;query='';paint();});
  host.querySelectorAll('[data-loadout-tab]').forEach(button=>button.onclick=()=>{activeTab=button.dataset.loadoutTab;render(host,raw);});
  host.querySelector('#loadoutBuild').onchange=e=>{activeId=e.target.value;query='';paint();};
  host.querySelector('#loadoutCategory').onchange=e=>{category=e.target.value;paint();};
  host.querySelector('#loadoutSearch').oninput=e=>{query=e.target.value;host.querySelector('#loadoutDetail').classList.add('detail-dismissed');drawItems();};
  drawItems();
  host.querySelectorAll('[data-fishing-item]').forEach(button=>button.onclick=()=>showDetail(host,button,m.items[button.dataset.fishingItem],button.dataset.fishingItem,'Fishing guide'));
 };
 paint();
}
function tile(item,slot){
 return `<button type="button" class="arcade-tile loadout-item" data-loadout-item="${esc(item.id)}" data-slot="${esc(slot)}" title="${esc(item.name)}"><img class="arcade-icon" src="assets/${esc(item.id)}.png" alt="" loading="lazy"><span class="arcade-name">${esc(item.name)}</span>${item.quantity>1?'<b class="loadout-quantity">×'+item.quantity+'</b>':''}</button>`;
}
function showDetail(host,button,item,id,slot){
 if(!item)return;
 const detail=host.querySelector('#loadoutDetail');
 detail.innerHTML=`<button type="button" class="secondary upgrade-close" aria-label="Close item details">Close</button><p class="eyebrow">${esc(slot)}</p><div class="loadout-detail-title"><img src="assets/${esc(id)}.png" alt=""><h3>${esc(item.name)}</h3></div>${item.description?'<p>'+esc(item.description)+'</p>':''}${(item.bonuses||[]).map(b=>'<p class="loadout-bonus">'+esc(b)+'</p>').join('')}${item.sources?.length?'<h4>Where to find it</h4><ul>'+item.sources.map(s=>'<li>'+esc(s)+'</li>').join('') : ''}<a href="https://idleon.wiki/wiki/${encodeURIComponent(item.name.replaceAll(' ','_'))}" target="_blank" rel="noopener noreferrer">Item reference ↗</a>`;
 detail.classList.remove('detail-dismissed');
 const close=()=>{detail.classList.add('detail-dismissed');button.focus();};
 detail.querySelector('button').onclick=close;
 detail.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();close();}};
 detail.querySelector('button').focus();
}
function fishTable(rows,items){
 const cell=id=>id&&items[id]?`<button type="button" class="loadout-fish-item" data-fishing-item="${esc(id)}"><img src="assets/${esc(id)}.png" alt=""><span>${esc(items[id].name)}</span></button>`:'—';
 return `<details class="loadout-fishing"><summary>Fishing spots, bait &amp; lines</summary><div class="loadout-table-scroll"><table><thead><tr><th>Fish</th><th>Bait</th><th>Line</th><th>Ring</th><th>Location</th></tr></thead><tbody>${rows.map(row=>'<tr>'+row.items.map(cell).map(html=>'<td>'+html+'</td>').join('')+'<td>'+esc(row.location||'See reference sheet')+'</td></tr>').join('')}</tbody></table></div><p>Equinox Valley: sample multiple times. The reference notes that Zeus can outperform Platinum for Bloach, Kraken and Caulifish near an efficiency breakpoint.</p></details>`;
}
const api={SHEET_URL,model,grouped,render};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Loadouts=api;
})(typeof window!=='undefined'?window:globalThis);
