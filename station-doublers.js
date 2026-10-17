(function(root){
  'use strict';
  const parse=v=>{if(typeof v==='string'){try{return JSON.parse(v);}catch{return null;}}return v;};
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const fmt=v=>v.toLocaleString('en-US',{maximumFractionDigits:3});
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function decode(kind,raw={},catalog=root.WORLD7_CATALOG){
    const sushi=kind==='sushi',data=raw.data||raw,source=parse(data[sushi?'Sushi':'Research']),levels=source?.[sushi?2:8];
    const applied=parse(data.Spelunk)?.[sushi?52:51]||[],ids=catalog.Research[sushi?60:59].map(Number),upgrades=catalog[sushi?'SushiUPG':'MineheadUPG'];
    const describe=(id,q,level,template)=>{
      if(sushi){
        if(id>=1&&id<=5)return `+${fmt(q)}% fuel capacity${id>1?`; separate ${fmt(1+level/100)}× capacity multiplier (unchanged)`:''}`;
        if(id>=8&&id<=12)return `+${fmt(q)}% fuel generation${id>8?`; separate ${fmt(1+level/100)}× fuel multiplier (unchanged)`:''}`;
        if(id===22)return `${fmt(1+q)} hours of Bucks per Saffron Shaker`;
        if(id===37)return `${fmt(1+q/10)} base EXP per newly created sushi, before EXP multipliers`;
        if(id===36)return `${fmt(100*q/(100+q))}% cheaper upgrades`;
      }else{
        if(id===14)return `${fmt(1.5+q/100)}× damage when revealing 3 Blue Crowns`;
        if(id===23)return q?`${fmt(Math.min(100,1+q/100))}% Jackpot tile chance (1 in ${fmt(Math.max(1,100/(1+q/100)))})`:'Jackpot tiles locked';
        if(id===26)return `${fmt(100*q/(100+q))}% cheaper upgrades`;
      }
      return template.replaceAll('_',' ').replaceAll('@',' · ').replaceAll('{',fmt(q)).replaceAll('}',fmt(1+q/100));
    };
    return {available:Array.isArray(levels),rows:ids.map(id=>{
      const u=upgrades[id],level=num(levels?.[id]),base=level*num(u[3]),doubled=applied.includes(id);
      let note='Doubles this upgrade’s bonus at the same saved level; total output can also depend on other bonuses.';
      if(sushi&&[2,3,4,5,9,10,11,12].includes(id))note='The extra multiplier comes directly from the upgrade level and is not doubled.';
      if(sushi&&id===37)note='The base 1 EXP remains fixed. Only the EXP added by this upgrade doubles.';
      if(sushi&&id===22)note='The base 1 hour remains fixed; the additional hours double.';
      if((sushi&&id===36)||(!sushi&&id===26))note='Doubles the discount stat, not the final percentage discount.';
      if(!sushi&&id===14)note='The base 1.5× stays fixed; the added multiplier doubles.';
      if(!sushi&&id===23)note='The base 1% chance stays fixed; this upgrade’s chance bonus doubles.';
      return {id,level,doubled,name:u[0].replaceAll('_',' '),icon:`assets/${sushi?'SushiUpg':'MineUpg'}${id}.png`,
        without:describe(id,base,level,u[5]),withDoubler:describe(id,base*2,level,u[5]),note,
        status:doubled?'Applied':level?'Not applied':'Not purchased'};
    })};
  }
  function content(kind,raw,catalog){
    const model=decode(kind,raw,catalog);
    if(!model.available)return '<p>Load a save with this system’s upgrade levels to compare doubler effects.</p>';
    return `<section data-station-doublers="${kind}"><h3>${kind==='sushi'?'Sushi':'Minehead'} doublers</h3><p class="fountain-note">${model.rows.length} eligible upgrades · ${model.rows.filter(r=>r.doubled).length} applied. Compare the same saved level without and with one doubler. Each upgrade can be doubled once. Unpurchased upgrades are marked below.</p><div class="bonus-system-controls"><input type="search" data-doubler-search aria-label="Search doubler upgrades" placeholder="Search upgrades or effects"></div><div class="jelly-doubler-grid">${model.rows.map(r=>`<article class="jelly-doubler-card" data-station-perk="${r.id}" data-doubler-text="${esc((r.name+' '+r.without).toLowerCase())}"><div class="jelly-doubler-heading"><img src="${r.icon}" width="32" height="32" alt=""><div><h3>${esc(r.name)}</h3><span>Level ${r.level} · ${r.status}</span></div></div><dl><dt>Without doubler${!r.doubled?' (current)':''}</dt><dd>${esc(r.without)}</dd><dt>With doubler${r.doubled?' (current)':''}</dt><dd>${esc(r.withDoubler)}</dd></dl><p class="fountain-note">${esc(r.note)}</p></article>`).join('')}</div></section>`;
  }
  function bind(host){host.querySelector('[data-doubler-search]')?.addEventListener('input',event=>{const q=event.target.value.toLowerCase().trim();host.querySelectorAll('[data-doubler-text]').forEach(card=>card.hidden=!card.dataset.doublerText.includes(q));});}
  const api={decode,content,bind};if(typeof module==='object'&&module.exports)module.exports=api;else root.StationDoublers=api;
})(typeof window!=='undefined'?window:globalThis);
