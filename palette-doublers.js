(function(root){
  'use strict';
  const parse=v=>{if(typeof v==='string'){try{return JSON.parse(v);}catch{return null;}}return v;};
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const fmt=v=>v.toLocaleString('en-US',{maximumFractionDigits:2});
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const superbits={25:49,13:51,31:52,18:54,3:58,12:61};
  function decode(rawRoot={},catalog=root.PALETTE_CATALOG){
    const data=rawRoot.data||rawRoot,sp=parse(data.Spelunk),gaming=parse(data.Gaming);
    if(!Array.isArray(sp?.[9]))return {available:false,rows:[]};
    const letters='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_',owned=String(gaming?.[12]||''),has=id=>owned.includes(letters[id]);
    const global=(1+num(sp?.[18]?.[10])*25/100)*(1+(num(sp?.[0]?.[8])>=1?.5:0));
    const rows=catalog.map((r,id)=>{
      const level=num(sp[9][id]),stars=num(sp?.[49]?.[id]),template=r[10].replaceAll('_',' '),implemented=!/nothing yet/i.test(template);
      let base=(Number(r[5])===1?level/(level+25):level)*Number(r[4])*global;
      if(superbits[id]!==undefined&&has(superbits[id]))base*=2+(has(59)?.5:0);
      const bonuses=[base,base*2,base*4];
      const describe=value=>template.replaceAll('}',fmt(1+value/100)).replace(/[\{#]/g,fmt(value));
      return {id,name:r[3].replaceAll('_',' '),level,stars,implemented,color:r.slice(0,3).map(Number),bonuses,
        effects:bonuses.map(describe),current:describe(base*Math.max(1,1+stars+Math.floor(stars/2))),
        status:!level?'Locked':stars>=2?'2 stars · Max':stars===1?'1 star applied':'No stars',
        note:!implemented?'This colour has no bonus yet.':!level?'Unlock this colour before spending stars.':
          stars>=2?'Both stars are already applied.':template.includes('}x')?'Stars multiply the bonus above 1×, not the entire multiplier.':
          /chance|cheaper/i.test(template)?'Shows the Palette bonus; the receiving system may cap its effect.':'Stars multiply this colour’s bonus; other bonuses keep their own scaling.'};
    });
    return {available:true,rows,applied:rows.reduce((sum,r)=>sum+r.stars,0)};
  }
  function render(host,rawRoot={}){
    const model=decode(rawRoot);let selected='colours';
    host.innerHTML='<div class="bonus-system-hero"><div><p class="eyebrow">World 5 · Gaming</p><h2>Gaming Palette</h2><p>Saved colour bonuses and black star comparisons.</p></div></div><nav class="skill-tabs" role="tablist" aria-label="Palette sections"><button class="skill-tab" id="paletteColoursTab" role="tab" aria-controls="paletteContent" data-palette-tab="colours">Colours</button><button class="skill-tab" id="paletteDoublersTab" role="tab" aria-controls="paletteContent" data-palette-tab="doublers">Doublers</button></nav><section id="paletteContent" role="tabpanel"></section>';
    const content=host.querySelector('#paletteContent');
    function paint(){
      host.querySelectorAll('[data-palette-tab]').forEach(b=>{const active=b.dataset.paletteTab===selected;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));});
      content.setAttribute('aria-labelledby',selected==='doublers'?'paletteDoublersTab':'paletteColoursTab');
      if(!model.available){content.innerHTML='<p>Load a save with Gaming Palette data to compare bonuses.</p>';return;}
      const doubling=selected==='doublers';
      content.innerHTML=`<p class="fountain-note">${doubling?`Black stars applied: ${model.applied}. One star gives 2× the colour bonus; two give 4×. Comparisons keep your saved level, Superbits, Picasso Gaming and lore bonus fixed.`:'All colour bonuses remain active when unequipped.'}</p><div class="bonus-system-controls"><input type="search" aria-label="Search Palette colours" placeholder="Search colours or bonuses"></div><div class="jelly-doubler-grid">${model.rows.map(r=>`<article class="jelly-doubler-card" data-palette-colour="${r.id}" data-search="${esc((r.name+' '+r.current).toLowerCase())}"><div class="jelly-doubler-heading"><span class="palette-doubler-swatch" style="background:rgb(${r.color.join(',')})" aria-hidden="true"></span><div><h3>${esc(r.name)}</h3><span>Level ${r.level} · ${esc(r.status)}</span></div></div>${doubling?`<dl>${r.effects.map((value,i)=>`<dt>${i===0?'No stars':i===1?'1 star · 2× bonus':'2 stars · 4× bonus'}${r.stars===i?' (current)':''}</dt><dd>${esc(value)}</dd>`).join('')}</dl><p class="fountain-note">${esc(r.note)}</p>`:`<p>${esc(r.current)}</p>`}</article>`).join('')}</div>`;
      content.querySelector('input').oninput=event=>{const q=event.target.value.toLowerCase().trim();content.querySelectorAll('[data-search]').forEach(card=>card.hidden=!card.dataset.search.includes(q));};
    }
    host.querySelectorAll('[data-palette-tab]').forEach(b=>b.onclick=()=>{selected=b.dataset.paletteTab;paint();});paint();
  }
  const api={decode,render};if(typeof module==='object'&&module.exports)module.exports=api;else root.PaletteDoublers=api;
})(typeof window!=='undefined'?window:globalThis);
