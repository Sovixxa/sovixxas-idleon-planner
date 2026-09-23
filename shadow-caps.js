(function(root){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PAGE_SIZE=8;
let world='All',query='',page=0;
function filter(caps,world,query){
 const words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
 return caps.filter(c=>(world==='All'||c.world===world)&&words.every(w=>[c.name,c.system,c.world,c.limit,c.note].join(' ').toLocaleLowerCase().includes(w)));
}
function render(host){
 const data=root.ShadowCapsData,caps=data.caps,worlds=['All','Account',...Array.from({length:7},(_,i)=>'World '+(i+1)),'Masterclasses'];
 host.innerHTML=`<section class="shadow-caps"><div class="section-head compact"><div><p class="eyebrow">Misc</p><h2>Shadow Caps</h2><p>Effective limits on bonuses, chances and speed—even when the displayed bonus keeps growing.</p></div><span class="shadow-caps-total">${caps.length} verified limits</span></div><nav class="skill-tabs shadow-caps-tabs" aria-label="Filter caps by world">${worlds.map(w=>`<button type="button" class="skill-tab${w===world?' active':''}" data-cap-world="${esc(w)}" aria-pressed="${w===world}">${esc(w)}</button>`).join('')}</nav><div class="shadow-caps-tools"><label for="shadowCapsSearch">Search caps<input id="shadowCapsSearch" type="search" placeholder="Bubble, bonus, system…" value="${esc(query)}" aria-controls="shadowCapsList"></label><button type="button" class="secondary" data-cap-clear>Clear</button><span data-cap-count role="status" aria-live="polite"></span></div><p class="shadow-caps-note">Checked against your installed game on ${esc(data.checked)}. Limits apply to the named effect; separate bonuses may still help. Select a row for conditions.</p><div class="shadow-caps-table-wrap"><table class="shadow-caps-table"><thead><tr><th scope="col">Bonus / effect</th><th scope="col">System</th><th scope="col">Effective limit</th></tr></thead><tbody id="shadowCapsList"></tbody></table><p data-cap-empty hidden>No caps match. Try another search or select All.</p></div><div class="shadow-caps-pager"><button type="button" class="secondary" data-cap-prev>Previous</button><span data-cap-page></span><button type="button" class="secondary" data-cap-next>Next</button></div><dialog class="shadow-caps-detail" aria-labelledby="shadowCapTitle"><div class="shadow-caps-detail-head"><span data-cap-system></span><button type="button" class="secondary" data-cap-close>Close</button></div><h3 id="shadowCapTitle"></h3><strong data-cap-limit></strong><p data-cap-note></p><small>Verified from the installed game’s effective calculation · ${esc(data.checked)}</small></dialog></section>`;
 const search=host.querySelector('#shadowCapsSearch'),list=host.querySelector('#shadowCapsList'),clear=host.querySelector('[data-cap-clear]'),prev=host.querySelector('[data-cap-prev]'),next=host.querySelector('[data-cap-next]'),dialog=host.querySelector('dialog');
 let opener;
 function paint(){
  const rows=filter(caps,world,query),pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));page=Math.max(0,Math.min(page,pages-1));
  list.innerHTML=rows.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE).map(c=>`<tr><td><button type="button" class="shadow-cap-open" data-cap-open="${c.id}" title="${esc(c.note)}" aria-haspopup="dialog">${esc(c.name)}<span aria-hidden="true">›</span></button></td><td><span>${esc(c.system)}</span><small>${esc(c.world)}</small></td><td><strong>${esc(c.limit)}</strong></td></tr>`).join('');
  host.querySelector('[data-cap-count]').textContent=`${rows.length} of ${caps.length} limits`;
  host.querySelector('[data-cap-empty]').hidden=rows.length>0;
  host.querySelector('[data-cap-page]').textContent=rows.length?`${page*PAGE_SIZE+1}–${Math.min((page+1)*PAGE_SIZE,rows.length)} of ${rows.length}`:'0 results';
  prev.disabled=page===0;next.disabled=page===pages-1;clear.disabled=!query&&world==='All';
  host.querySelectorAll('[data-cap-world]').forEach(b=>{const active=b.dataset.capWorld===world;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
 }
 host.querySelectorAll('[data-cap-world]').forEach(b=>b.onclick=()=>{world=b.dataset.capWorld;page=0;paint();});
 search.oninput=()=>{query=search.value;page=0;paint();};
 clear.onclick=()=>{query='';world='All';page=0;search.value='';paint();search.focus();};
 prev.onclick=()=>{page--;paint();};next.onclick=()=>{page++;paint();};
 list.onclick=e=>{const button=e.target.closest('[data-cap-open]');if(!button)return;const cap=caps.find(c=>c.id===button.dataset.capOpen);if(!cap)return;opener=button;dialog.querySelector('[data-cap-system]').textContent=cap.world+' · '+cap.system;dialog.querySelector('h3').textContent=cap.name;dialog.querySelector('[data-cap-limit]').textContent=cap.limit;dialog.querySelector('[data-cap-note]').textContent=cap.note;dialog.showModal();};
 host.querySelector('[data-cap-close]').onclick=()=>dialog.close();dialog.onclose=()=>opener?.focus();
 dialog.onclick=e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();};
 paint();
}
const api={render,filter,PAGE_SIZE};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ShadowCaps=api;
})(typeof window!=='undefined'?window:globalThis);
