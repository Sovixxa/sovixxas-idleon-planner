(function(root){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const titles={drop:'Drop Rate',damage:'Damage',classExp:'Class EXP'},states={};
function filterRows(catalog,kind,state){return catalog.rows.filter(row=>row.benefits[kind]?.some(b=>state.mode==='all'||b.mode===state.mode)&&(state.category==='all'||row.category===state.category)&&(!state.query||`${row.name} ${row.id} ${row.type} ${row.benefits[kind].map(b=>b.text).join(' ')}`.toLowerCase().includes(state.query)));}
function resultHtml(rows,kind,state){
 return `<div class="carry-table-wrap"><table class="carry-table stat-items-table"><thead><tr><th>Item</th><th>Category</th><th>Relevant base bonus / effect</th></tr></thead><tbody>${rows.map(row=>`<tr class="drop-clickable" data-stat-item="${esc(row.id)}"><th scope="row"><button type="button" class="stat-item-name drop-source-button" aria-haspopup="dialog">${row.icon?`<img src="${esc(row.icon)}" alt="" loading="lazy">`:''}<span>${esc(row.name)}</span></button></th><td>${esc(row.category)}<small>${esc(row.type)}</small></td><td>${row.benefits[kind].filter(b=>state.mode==='all'||b.mode===state.mode).map(b=>`<div class="stat-item-benefit"><span class="stat-item-badge">${esc(b.mode)}</span> ${esc(b.text)}</div>`).join('')}</td></tr>`).join('')||'<tr><td colspan="3">No items match these filters.</td></tr>'}</tbody></table></div>`;
}
function mount(host,kind){
 const catalog=root.STAT_ITEM_DATA;if(!catalog||!titles[kind]){host.innerHTML='<p class="carry-empty">Item catalog unavailable. Reload the planner to load the latest files.</p>';return;}
 const state=states[kind]||(states[kind]={query:'',category:'all',mode:'all',page:0});
 const all=catalog.rows.filter(r=>r.benefits[kind].length),categories=[...new Set(all.map(r=>r.category))].sort();
 host.innerHTML=`<section class="stat-items"><p class="loadout-note"><strong>${all.length} catalog entries for ${titles[kind]}</strong> — includes items you may not own. Base values exclude your upgrade stones, rolls, chips and account amplification. Direct bonuses affect this stat; indirect and conditional effects depend on your setup. Cards, chips and upgrade stones are included. This is an item catalog, not an ownership or best-in-slot list.</p><div class="loadout-controls"><label>Category<select id="statItemCategory"><option value="all">All equipment & items</option>${categories.map(cat=>`<option value="${esc(cat)}" ${state.category===cat?'selected':''}>${esc(cat)} (${all.filter(r=>r.category===cat).length})</option>`).join('')}</select></label><label>Bonus type<select id="statItemMode">${[['all','All relevant effects'],['direct','Direct bonuses'],['indirect','Indirect bonuses'],['conditional','Conditional effects']].map(([key,label])=>`<option value="${key}" ${state.mode===key?'selected':''}>${label}</option>`).join('')}</select></label><label class="loadout-search">Find an item<input id="statItemSearch" type="search" value="${esc(state.query)}" placeholder="Armor, Golden Cake, drop rate…"></label></div><div id="statItemResults"></div><div id="statItemPager" class="collection-pager"></div><section class="stat-item-detail upgrade-detail detail-dismissed" role="dialog" aria-modal="false" aria-labelledby="statItemTitle"></section></section>`;
 const panel=host.querySelector('.stat-item-detail');
 function paint(){
  panel.classList.add('detail-dismissed');const matches=filterRows(catalog,kind,state),pages=Math.max(1,Math.ceil(matches.length/50));state.page=Math.min(state.page,pages-1);
  host.querySelector('#statItemResults').innerHTML=resultHtml(matches.slice(state.page*50,(state.page+1)*50),kind,state);
  host.querySelector('#statItemPager').innerHTML=`<button type="button" class="secondary" data-item-page="-1" ${state.page===0?'disabled':''}>Previous</button><span>${matches.length} items · Page ${state.page+1} / ${pages}</span><button type="button" class="secondary" data-item-page="1" ${state.page>=pages-1?'disabled':''}>Next</button>`;
  host.querySelectorAll('[data-item-page]').forEach(b=>b.onclick=()=>{state.page+=Number(b.dataset.itemPage);paint();});
 }
 host.querySelector('#statItemCategory').onchange=e=>{state.category=e.target.value;state.page=0;paint();};
 host.querySelector('#statItemMode').onchange=e=>{state.mode=e.target.value;state.page=0;paint();};
 host.querySelector('#statItemSearch').oninput=e=>{state.query=e.target.value.toLowerCase();state.page=0;paint();};
 host.querySelector('#statItemResults').onclick=e=>{
  const clicked=e.target.closest('[data-stat-item]');if(!clicked)return;
  const item=all.find(r=>r.id===clicked.dataset.statItem);if(!item)return;
  const trigger=clicked.querySelector('button');
  panel.innerHTML=`<button type="button" class="secondary upgrade-close" aria-label="Close item details">Close</button><p class="eyebrow">${titles[kind]} · ${esc(item.category)}</p><h3 id="statItemTitle">${esc(item.name)}</h3>${item.icon?`<img class="stat-item-art" src="${esc(item.icon)}" alt="">`:''}<p>${esc(item.type)}${item.level?' · Equip level '+item.level:''}${item.className?' · '+esc(item.className):''}</p><h4>What it gives</h4><ul>${item.benefits[kind].map(b=>`<li><strong>${esc(b.mode)}:</strong> ${esc(b.text)}</li>`).join('')}</ul>${item.slots?`<p>${item.slots} base upgrade slots.</p>`:''}${item.notes.map(note=>`<p>${esc(note)}</p>`).join('')}<p>These are catalog effects. The final gain depends on your character and saved setup; bonuses from separate pools are not interchangeable.</p><button type="button" class="secondary" data-item-destination="${esc(item.page)}">Open ${esc(({characters:'Characters & Talents',nametags:'Nametags & Trophies',obols:'Obols',cards:'Cards',lab:'Lab',goldFood:'Gold Food Bonuses'})[item.page]||'source page')}</button>`;
  panel.classList.remove('detail-dismissed');const close=()=>{panel.classList.add('detail-dismissed');if(trigger?.isConnected)trigger.focus();};
  panel.querySelector('.upgrade-close').onclick=close;panel.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();close();}};
  panel.querySelector('[data-item-destination]').onclick=()=>{panel.classList.add('detail-dismissed');root.dispatchEvent(new CustomEvent('idleon:navigate',{detail:item.page}));};
  panel.querySelector('.upgrade-close').focus();
 };
 paint();
}
root.StatItems={mount,filterRows,resultHtml};
})(typeof window!=='undefined'?window:globalThis);
