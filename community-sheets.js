(function(root){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let creator='All',query='';
const matches=(sheet,text)=>text.toLocaleLowerCase().trim().split(/\s+/).every(word=>[sheet.title,sheet.creator,sheet.credit,sheet.date].join(' ').toLocaleLowerCase().includes(word));
function render(host){
 const sheets=root.CommunitySheetData||[],creators=['All',...new Set(sheets.map(s=>s.creator))];
 if(!creators.includes(creator))creator='All';
 function paint(){
  const visible=sheets.filter(s=>creator==='All'||s.creator===creator);
  host.innerHTML=`<section class="community-sheets"><div class="section-head compact"><div><p class="eyebrow">Misc</p><h2>Community Sheets</h2><p>Community guides and reference sheets. Select a creator, then open a sheet to read it at full size.</p></div><aside class="community-sheet-attribution" aria-label="Community sheet credits">These sheets were collected from community Discord servers and brought together here for reference, making them easier to find and use in one place. All credit goes to their original creators.</aside></div><nav class="skill-tabs community-sheet-tabs" aria-label="Sheet creators">${creators.map(c=>`<button type="button" class="skill-tab ${c===creator?'active':''}" aria-pressed="${c===creator}" data-sheet-creator="${esc(c)}">${esc(c)} <span>(${sheets.filter(s=>c==='All'||s.creator===c).length})</span></button>`).join('')}</nav><div class="community-sheet-search"><label for="communitySheetSearch">Search sheets</label><div><input id="communitySheetSearch" type="search" value="${esc(query)}" placeholder="Title, creator or credits…" aria-controls="communitySheetGrid"><button type="button" class="secondary" data-sheet-clear>Clear search</button></div><p data-sheet-count role="status" aria-live="polite"></p></div><p class="community-sheet-note">Dates and credits are taken from the supplied images. Different dated versions are kept separately; identical uploads appear once.</p><p data-sheet-empty hidden>No sheets match your search in this creator tab. Try another term or select All.</p><div id="communitySheetGrid" class="community-sheet-grid">${visible.map(s=>`<article class="community-sheet-card" data-sheet-id="${s.id}"><button type="button" class="community-sheet-preview" data-sheet-open="${s.id}" aria-label="Open ${esc(s.title)}"><img src="${s.src}" alt="${esc(s.title)} by ${esc(s.creator)}" loading="lazy" decoding="async"></button><div class="community-sheet-caption"><h3>${esc(s.title)}</h3><p>${esc(s.creator)}${s.date?' · '+esc(s.date):''}</p><p class="community-sheet-credit">${esc(s.credit)}</p><button type="button" class="secondary" data-sheet-open="${s.id}">View sheet</button></div></article>`).join('')}</div><dialog class="community-sheet-dialog" aria-labelledby="communitySheetTitle"><div class="community-sheet-toolbar"><h3 id="communitySheetTitle"></h3><button type="button" class="secondary" data-sheet-zoom>Actual size</button><a target="_blank" rel="noopener noreferrer" data-sheet-original>Open original</a><button type="button" class="secondary" data-sheet-close>Close</button></div><div class="community-sheet-scroll"><img alt=""></div><p class="community-sheet-dialog-credit"></p></dialog></section>`;
  host.querySelectorAll('[data-sheet-creator]').forEach(b=>b.onclick=()=>{creator=b.dataset.sheetCreator;paint();host.querySelector(`[data-sheet-creator="${creator}"]`)?.focus();});
  const search=host.querySelector('#communitySheetSearch'),clear=host.querySelector('[data-sheet-clear]');
  const filter=()=>{
   const ids=new Set(visible.filter(sheet=>matches(sheet,query)).map(sheet=>sheet.id));
   host.querySelectorAll('[data-sheet-id]').forEach(card=>{card.hidden=!ids.has(card.dataset.sheetId);});
   host.querySelector('[data-sheet-count]').textContent=`${ids.size} of ${visible.length} sheets shown`;
   host.querySelector('[data-sheet-empty]').hidden=ids.size>0;
   clear.disabled=!query;
  };
  search.oninput=()=>{query=search.value;filter();};
  clear.onclick=()=>{query='';search.value='';filter();search.focus();};
  filter();
  const dialog=host.querySelector('dialog'),photo=dialog.querySelector('img'),zoom=dialog.querySelector('[data-sheet-zoom]');let opener;
  host.querySelectorAll('[data-sheet-open]').forEach(b=>b.onclick=()=>{
   const sheet=sheets.find(s=>s.id===b.dataset.sheetOpen);opener=b;
   dialog.querySelector('h3').textContent=sheet.title;
   photo.src=sheet.src;photo.alt=sheet.title+' — '+sheet.creator;
   photo.classList.remove('actual-size');zoom.textContent='Actual size';zoom.setAttribute('aria-pressed','false');
   dialog.querySelector('[data-sheet-original]').href=sheet.src;
   dialog.querySelector('.community-sheet-dialog-credit').textContent=sheet.creator+(sheet.date?' · '+sheet.date:'')+' — '+sheet.credit;
   dialog.showModal();dialog.querySelector('.community-sheet-scroll').scrollTo(0,0);
  });
  zoom.onclick=()=>{const actual=photo.classList.toggle('actual-size');zoom.textContent=actual?'Fit to width':'Actual size';zoom.setAttribute('aria-pressed',String(actual));};
  dialog.querySelector('[data-sheet-close]').onclick=()=>dialog.close();
  dialog.onclose=()=>opener?.focus();
  dialog.onclick=e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}};
 }
 paint();
}
root.CommunitySheets={render};
})(window);
