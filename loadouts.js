(function(root){
'use strict';
const SHEET_URL='https://docs.google.com/spreadsheets/d/1at-y9t5ohYky33nOLoSxHYeyRX-3T91paj-nTSHrB3c/edit?gid=1826222324#gid=1826222324';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const data=()=>root.LOADOUT_DATA||(typeof require==='function'?require('./loadouts-data'):null);
const ORDER=['Equipment','Specials','Food','Chips','Cards','Card set','Prayers','Obols','Trophy','Tools & extras'];
const hints={Equipment:'Gear slots',Specials:'Keychains, gown, cape & ring',Food:'Food slots',Chips:'Chip slots',Cards:'Eight-card layout','Card set':'Set bonus',Prayers:'Prayer choices',Obols:'Obol layout',Trophy:'Trophy options','Tools & extras':'Tools, trap & skull'};
let activeId='crystal-dk',group='All builds',category='All slots',query='';
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
function render(host){
 const m=model();
 const paint=()=>{
  const choices=m.builds.filter(b=>group==='All builds'||b.group===group);
  const build=choices.find(b=>b.id===activeId)||choices[0];if(!build)return;
  activeId=build.id;
  const categories=ORDER.filter(c=>build.sections[c]?.length);
  if(category!=='All slots'&&!categories.includes(category))category='All slots';
  const count=Object.values(build.sections).reduce((sum,ids)=>sum+ids.length,0);
  host.innerHTML=`<section class="loadouts-page"><div class="section-head compact loadout-heading"><div><p class="eyebrow">Optimizers</p><h2>Loadouts</h2><p>Choose a setup. Hover for names; click any item for details.</p></div><a class="loadout-source" href="${SHEET_URL}" target="_blank" rel="noopener noreferrer">AlmostPsycho’s sheet ↗<small>Updated from Herus’ sheet</small></a></div><nav class="skill-tabs loadout-groups" aria-label="Loadout activities">${['All builds','Combat','Skills','Snapshots'].map(g=>`<button type="button" class="skill-tab ${g===group?'active':''}" data-loadout-group="${g}" aria-pressed="${g===group}">${g}</button>`).join('')}</nav><div class="loadout-controls"><label>Loadout<select id="loadoutBuild">${choices.map(b=>`<option value="${b.id}" ${b.id===activeId?'selected':''}>${esc(b.title)}</option>`).join('')}</select></label><label>Show<select id="loadoutCategory">${['All slots',...categories].map(c=>`<option ${c===category?'selected':''}>${esc(c)}</option>`).join('')}</select></label><label class="loadout-search">Find an item<input id="loadoutSearch" type="search" placeholder="Item, card or bonus…" value="${esc(query)}"></label></div><div class="loadout-build-banner"><img src="assets/${esc(build.sections.Equipment?.[1]||build.sections.Equipment?.[0])}.png" alt=""><div><p class="eyebrow">${esc(build.group)}</p><h3>${esc(build.title)}</h3></div><span>${count} listed slots</span></div>${build.note?'<p class="loadout-note">'+esc(build.note)+'</p>':''}<div id="loadoutSections" class="loadout-sections"></div>${build.fishingGuide?fishTable(build.fishingGuide,m.items):''}<section id="loadoutDetail" class="upgrade-detail detail-dismissed" role="dialog" aria-label="Loadout item details"></section></section>`;
  const drawItems=()=>{
   const sections=categories.filter(c=>category==='All slots'||c===category).map(c=>({name:c,rows:grouped(build.sections[c],m.items,c).filter(item=>!query||[item.name,item.description,...(item.bonuses||[])].join(' ').toLowerCase().includes(query.toLowerCase()))})).filter(s=>s.rows.length);
   const target=host.querySelector('#loadoutSections');
   target.innerHTML=sections.map(section=>`<section class="loadout-section"><header><h4>${esc(section.name)}</h4><small>${esc(hints[section.name])}</small></header><div class="arcade-grid loadout-items">${section.rows.map(item=>tile(item,section.name)).join('')}</div></section>`).join('')||'<p class="loadout-empty">No items match this search.</p>';
   target.querySelectorAll('[data-loadout-item]').forEach(button=>button.onclick=()=>showDetail(host,button,m.items[button.dataset.loadoutItem],button.dataset.loadoutItem,button.dataset.slot));
  };
  host.querySelectorAll('[data-loadout-group]').forEach(button=>button.onclick=()=>{group=button.dataset.loadoutGroup;query='';paint();});
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
