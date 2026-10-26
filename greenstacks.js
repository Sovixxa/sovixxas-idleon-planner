(function(root){
  'use strict';
  const target=10000000;
  const parse=value=>{try{return typeof value==='string'?JSON.parse(value):value;}catch{return null;}};
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=value=>value.toLocaleString(undefined,{maximumFractionDigits:0});
  const compact=value=>{const unit=[[1e12,'t'],[1e9,'b'],[1e6,'m'],[1e3,'k']].find(([size])=>value>=size);return unit?Number((Math.floor(value/unit[0]*100)/100).toFixed(2))+unit[1]:fmt(value);};
  const validItem=id=>typeof id==='string'&&id&&id!=='Blank'&&id!=='LockedInvSpace'&&!!root.GREENSTACK_ITEMS?.[id];
  const icon=id=>{const mapped=root.GREENSTACK_ICONS?.[id];return mapped===null?'assets/greenstack-item-placeholder.svg':'assets/'+encodeURIComponent(mapped||id)+'.png';};
  const wikiUrl=name=>'https://idleon.wiki/wiki/'+encodeURIComponent(name.replace(/[| ]/g,'_'));
  function decode(data){
    const ids=parse(data.ChestOrder),quantities=parse(data.ChestQuantity),history=parse(data.GreenStacks);
    const hasStorage=Array.isArray(ids)&&Array.isArray(quantities);
    if(!hasStorage&&!Array.isArray(history))return null;
    const recorded=new Set((Array.isArray(history)?history:[]).filter(validItem));
    const items=new Map();
    (hasStorage?ids:[]).forEach((id,i)=>{
      const quantity=Number(quantities[i]);
      if(!validItem(id)||!Number.isFinite(quantity)||quantity<=0)return;
      // Banking counts unique items with a qualifying individual storage stack.
      items.set(id,Math.max(items.get(id)||0,quantity));
    });
    // Build the complete catalog checklist; view filters choose practical targets.
    for(const id of Object.keys(root.GREENSTACK_ITEMS||{}))if(!items.has(id))items.set(id,hasStorage?0:null);
    for(const id of recorded)if(!items.has(id))items.set(id,hasStorage?0:null);
    return [...items].map(([id,quantity])=>({id,name:root.ITEM_NAMES?.[id]||id,quantity,realistic:root.GREENSTACK_ITEMS[id].realistic,reason:root.GREENSTACK_ITEMS[id].reason,recorded:recorded.has(id),complete:recorded.has(id)})).sort((a,b)=>Number(a.complete)-Number(b.complete)||b.quantity-a.quantity||a.name.localeCompare(b.name));
  }
  function render(host,data){
    const rows=decode(data);
    const savedHistory=parse(data.GreenStacks);
    const historyAvailable=Array.isArray(savedHistory);
    const savedTotal=historyAvailable?new Set(savedHistory.filter(id=>typeof id==='string'&&id&&id!=='Blank'&&id!=='LockedInvSpace')).size:null;
    if(!rows){host.innerHTML='<section class="exp-card"><h2>Greenstacks</h2><p>Import your account save to track storage stacks toward 10m items.</p></section>';return;}
    host.innerHTML=`<section class="greenstacks-page"><div class="gs-summary"><div><strong id="gsCompleteCount">${rows.filter(r=>r.complete).length}</strong><span>Total done</span></div><div><strong id="gsProgressCount">${rows.filter(r=>!r.complete).length}</strong><span>Total remaining</span></div></div><p class="gs-note">Total done comes from your saved Slab greenstack record. Remaining counts unrecorded targets in the selected view. Storage amounts show progress only. Realistic hides premium, limited and impractical targets, and includes farmable items not yet stored. Quest drops may require an unfinished quest.</p><div class="gs-toolbar"><label>View<select id="greenstackScope"><option value="all">All</option><option value="realistic">Realistic</option></select></label><label>Search items<input type="search" id="greenstackSearch" placeholder="Search by item name…"></label><label>Show<select id="greenstackFilter"><option value="all">All statuses</option><option value="incomplete">In progress</option><option value="complete">Complete</option></select></label></div><div id="greenstackResults" class="gs-grid"></div><section class="gs-source-popup" role="dialog" aria-modal="false" aria-labelledby="gsSourceTitle" hidden></section></section>`;
    const search=host.querySelector('#greenstackSearch'),filter=host.querySelector('#greenstackFilter'),results=host.querySelector('#greenstackResults');
    const scope=host.querySelector('#greenstackScope');
    const popup=host.querySelector('.gs-source-popup');let trigger=null;
    function close(){popup.hidden=true;trigger?.setAttribute('aria-expanded','false');if(trigger?.isConnected)trigger.focus();}
    results.addEventListener('click',event=>{
      const button=event.target.closest('[data-gs-item]');if(!button)return;
      const row=rows.find(r=>r.id===button.dataset.gsItem);if(!row)return;
      trigger?.setAttribute('aria-expanded','false');trigger=button;button.setAttribute('aria-expanded','true');
      const sources=root.GREENSTACK_SOURCES?.[row.id]||[];
      popup.innerHTML=`<button type="button" class="gs-source-close" aria-label="Close item sources">×</button><div class="gs-source-heading"><img src="${icon(row.id)}" width="40" height="40" alt="" data-image-fallback-src="assets/greenstack-item-placeholder.svg"><div><span>WHERE TO GET</span><h3 id="gsSourceTitle">${esc(row.name)}</h3></div></div>${sources.length?'<ul>'+sources.map(source=>'<li>'+esc(source)+'</li>').join('')+'</ul>':'<p>No acquisition source is listed in the local catalog for this item.</p>'}${row.reason?'<p class="gs-practicality-note">Not a realistic target: '+esc(row.reason)+'.</p>':''}<a class="gs-popup-wiki" href="${wikiUrl(row.name)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(row.name)} on the IdleOn Wiki (opens in a new tab)">View on Wiki ↗</a><small>Catalog sources; event and shop availability can vary.</small>`;
      popup.hidden=false;popup.querySelector('.gs-source-close').onclick=close;popup.querySelector('.gs-source-close').focus();
    });
    popup.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}});
    function paint(){
      popup.hidden=true;trigger=null;
      const eligible=rows.filter(r=>scope.value==='all'||r.realistic);
      host.querySelector('#gsCompleteCount').textContent=savedTotal===null?'Unavailable':fmt(savedTotal);
      host.querySelector('#gsProgressCount').textContent=historyAvailable?eligible.filter(r=>!r.recorded).length:'Unavailable';
      const shown=eligible.filter(r=>(filter.value==='all'||r.complete===(filter.value==='complete'))&&(r.name+' '+r.id).toLowerCase().includes(search.value.toLowerCase().trim()));
      results.innerHTML=shown.map(r=>`<button type="button" data-gs-item="${esc(r.id)}" aria-haspopup="dialog" class="gs-card ${r.complete?'is-complete':''}"><div class="gs-item"><img src="${icon(r.id)}" width="40" height="40" loading="lazy" alt="" data-image-fallback-src="assets/greenstack-item-placeholder.svg"><strong>${esc(r.name)}</strong></div><span class="gs-amount" title="${r.quantity===null?'Storage unavailable':fmt(r.quantity)+' in storage'}">${r.quantity===null?'Storage unavailable':compact(r.quantity)+' <span>/ 10m</span>'}</span><progress max="10000000" value="${Math.min(target,r.quantity)}" aria-label="${esc(r.name)} storage progress"></progress><small>${r.recorded?'✓ Previously greenstacked':!historyAvailable?'Saved greenstack record unavailable':r.quantity>=target?'Not yet recorded in Slab':compact(target-r.quantity)+' remaining'}</small></button>`).join('')||'<p class="gs-empty">No matching items.</p>';

    }
    scope.addEventListener('change',paint);search.addEventListener('input',paint);filter.addEventListener('change',paint);paint();
  }
  root.Greenstacks={decode,render};
})(typeof window!=='undefined'?window:globalThis);
