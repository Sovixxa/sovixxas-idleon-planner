(function(root){
  'use strict';
  const parse=v=>{if(typeof v==='string'){try{return JSON.parse(v);}catch{return null;}}return v;};
  const num=v=>v!=null&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
  const pretty=v=>String(v??'').replaceAll('_',' ').replaceAll('@','\n');
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function decode(data={},account={},catalog={}){
    const lab=parse(data.Lab),names=account.charNames||[];
    const ids=names.length?names.map((_,i)=>i):Object.keys(data).filter(k=>/^Lv0_\d+$/.test(k)).map(k=>Number(k.slice(4))).sort((a,b)=>a-b);
    const characters=ids.map(id=>({id,name:names[id]||`Character ${id+1}`,level:num(parse(data['Lv0_'+id])?.[12]),chips:Array.from({length:7},(_,slot)=>num(parse(lab?.[id+1])?.[slot]))}));
    const chips=(catalog.ChipDesc||[]).map((r,id)=>{const total=num(lab?.[15]?.[id]),used=characters.reduce((n,c)=>n+c.chips.filter(v=>v===id).length,0);return {id,name:pretty(r[0]),description:pretty(r[1]).replaceAll('{',r[11]),total,used,available:total===null?null:Math.max(0,total-used),image:`ConsoleChip${id}.png`};});
    const jewels=(catalog.JewelDesc||[]).map((r,id)=>({id,name:pretty(r[11]),description:pretty(r[3]).replaceAll('}',r[12]),owned:lab?.[14]?.[id]==null?null:Number(lab[14][id])===1,image:`ConsoleJwl${id}.png`}));
    const mainframe=(catalog.LabMainBonus||[]).map((r,id)=>({id,name:pretty(r[6]),description:pretty(r[7]).split('Total Bonus:')[0].trim(),image:`LabBonus${id}.png`}));
    return {characters,chips,jewels,mainframe,totalLevel:characters.length&&characters.every(c=>c.level!==null)?characters.reduce((n,c)=>n+c.level,0):null};
  }
  function render(host,data,account){
    const m=decode(data,account,root.LAB_CATALOG),tabs=['Characters','Chips','Jewels','Mainframe'];let current='Characters';
    const chipIcon=id=>id===null?'<span class="lab-empty" title="Slot data unavailable">?</span>':id<0?'<span class="lab-empty" title="Empty slot">—</span>':m.chips[id]?`<button data-lab-item="chips:${id}" title="${esc(m.chips[id].name)}"><img src="assets/ConsoleChip${id}.png" alt="${esc(m.chips[id].name)}"></button>`:'<span class="lab-empty">?</span>';
    function paint(){
      host.innerHTML=`<div class="section-head compact"><div><p class="eyebrow">World 4</p><h2>Lab</h2></div><span class="muted">${m.totalLevel??'?'} total Lab levels · ${m.jewels.filter(j=>j.owned).length}/${m.jewels.length} jewels owned</span></div><nav class="skill-tabs" aria-label="Lab sections">${tabs.map(t=>`<button class="skill-tab ${current===t?'active':''}" data-lab-tab="${t}">${t}</button>`).join('')}</nav><div class="lab-content">${current==='Characters'?`<div class="lab-characters">${m.characters.map(c=>`<article><div><strong>${esc(c.name)}</strong><small>Lab Lv ${c.level??'?'} · ${c.chips.filter(v=>v!==null&&v>=0).length}/7 chips equipped</small></div><div class="lab-chip-slots">${c.chips.map(chipIcon).join('')}</div></article>`).join('')||'<p>Load an account export to see character loadouts.</p>'}</div>`:`<p class="muted">${current==='Chips'?'Owned counts include equipped copies.':current==='Jewels'?'Ownership is read from your save. Active connections are not calculated yet.':'Base effects. Active connections and boosted effect totals are not calculated yet.'}</p><div class="lab-catalog">${m[current.toLowerCase()].map(item=>`<button data-lab-item="${current.toLowerCase()}:${item.id}" class="${current==='Jewels'&&!item.owned?'lab-unowned':''}" title="${esc(item.name)}"><img src="assets/${item.image}" alt=""><span>${esc(item.name)}</span><strong>${current==='Chips'?`${item.total??'?'} owned · ${item.used} equipped`:current==='Jewels'?(item.owned===null?'Unknown':item.owned?'Owned':'Not owned'):'View bonus'}</strong></button>`).join('')}</div>`}</div><section id="labDetail" class="exp-card lab-detail" hidden></section>`;
      host.querySelectorAll('[data-lab-tab]').forEach(b=>b.onclick=()=>{current=b.dataset.labTab;paint();});
      host.querySelectorAll('[data-lab-item]').forEach(b=>b.onclick=()=>{const [kind,id]=b.dataset.labItem.split(':'),item=m[kind][Number(id)],panel=host.querySelector('#labDetail');panel.hidden=false;panel.innerHTML=`<button id="labClose" class="secondary" aria-label="Close lab details">Close</button><img src="assets/${item.image}" alt=""><h3>${esc(item.name)}</h3><p style="white-space:pre-line">${esc(item.description)}</p>${kind==='chips'?`<p>${item.total??'?'} owned · ${item.used} equipped · ${item.available??'?'} spare</p><small>Equipped by: ${esc(m.characters.filter(c=>c.chips.includes(item.id)).map(c=>c.name).join(', ')||'Nobody')}</small>`:kind==='jewels'?'<p class="muted">Owned does not mean connected. This is the base jewel effect.</p>':'<p class="muted">Base mainframe effect; connection status not evaluated.</p>'}`;host.querySelector('#labClose').onclick=()=>{panel.hidden=true;};});
    }
    paint();
  }
  const api={decode,render};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Lab=api;
})(typeof window!=='undefined'?window:globalThis);
