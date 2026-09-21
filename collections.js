(function(root){
  'use strict';
  const parse=v=>{if(typeof v==='string'){try{return JSON.parse(v);}catch{return v;}}return v;};
  const num=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>v===null?'Unknown':Number(v).toLocaleString(undefined,{maximumFractionDigits:2});
  const first=(...values)=>values.map(parse).find(v=>v!==null&&v!==undefined);
  function decodeTome(data,c=root.COLLECTION_CATALOG){
    const raw=parse(first(data.TomeStats,data.TomeProgress,data.TomeValues,data.Tome))||[];
    const values=Array.isArray(raw)?raw:[];
    const score=num(first(data.TomeScore,data.TomePoints,data.TomeCompletion,raw?.score,raw?.[0]?.score));
    const accountLevel=num(first(data.AccountLv,data.AccountLevel,data.TotalAccountLv));
    return{available:values.length>0||score!==null,score,accountLevel,metrics:c.tomeMetrics.map((m,id)=>({...m,value:num(values[id]),unlocked:accountLevel===null?null:accountLevel>=m.levelReq})),bonuses:c.tomeBonuses};
  }
  function decodeSlab(data,c=root.COLLECTION_CATALOG){
    const candidates=[data.SlabItems,data.ItemsSeen,data.Slab,data.ItemOrder,data.ItemFound].map(parse).filter(Array.isArray),items=candidates.sort((a,b)=>b.length-a.length)[0]||[];
    const found=num(first(data.SlabCount,data.ItemsFound,data.SlabItemsFound))??(items.length?items.filter(v=>v!==0&&v!==''&&v!==null&&v!==false).length:null);
    return{available:items.length>0||found!==null,found,total:items.length||null,items,bonuses:c.slabBonuses};
  }
  const pages={tome:'rankings',slab:'bonuses'};let metricPage=0,slabPage=0;
  function render(host,kind,data){const c=root.COLLECTION_CATALOG,model=kind==='tome'?decodeTome(data,c):decodeSlab(data,c);function paint(){const tab=pages[kind],tabs=kind==='tome'?[['rankings','Rankings'],['bonuses','Bonuses']]:[['bonuses','Bonuses'],['collection','Collection']];let body='';
    if(kind==='tome'&&tab==='rankings'){const size=16,start=metricPage*size,shown=model.metrics.slice(start,start+size),pagesCount=Math.ceil(model.metrics.length/size);body=`<div class="collection-grid tome-grid">${shown.map(m=>`<button class="collection-card ${m.unlocked===false?'locked':''}" data-collection="metric" data-id="${m.id}"><span class="collection-index">${m.id+1}</span><strong>${esc(m.name)}</strong><small>${m.value===null?'Saved value unavailable':fmt(m.value)}</small><em>Account Lv ${m.levelReq}</em></button>`).join('')}</div><div class="collection-pager"><button class="secondary" data-metric-page="prev" ${metricPage===0?'disabled':''}>Previous</button><span>${metricPage+1} / ${pagesCount}</span><button class="secondary" data-metric-page="next" ${metricPage>=pagesCount-1?'disabled':''}>Next</button></div>`;}
    else if(kind==='tome')body=bonusGrid(model.bonuses,'tome-bonus');
    else if(tab==='bonuses')body=bonusGrid(model.bonuses,'slab-bonus');
    else if(model.items.length){const size=60,start=slabPage*size,shown=model.items.slice(start,start+size),pagesCount=Math.ceil(model.items.length/size);body=`<div class="slab-items">${shown.map((v,i)=>`<div class="slab-item ${v?'found':'missing'}"><b>${start+i+1}</b><span>${v?'Found':'Missing'}</span></div>`).join('')}</div><div class="collection-pager"><button class="secondary" data-slab-page="prev" ${slabPage===0?'disabled':''}>Previous</button><span>${slabPage+1} / ${pagesCount}</span><button class="secondary" data-slab-page="next" ${slabPage>=pagesCount-1?'disabled':''}>Next</button></div>`;}else body='<section class="exp-card"><h3>Collection list unavailable</h3><p>This export does not expose individual Slab entries. The bonus catalog is still complete.</p></section>';
    const summary=kind==='tome'?`Score ${fmt(model.score)} · ${model.metrics.length} metrics`:`${fmt(model.found)} items found${model.total?` · ${model.total} tracked`:''}`;
    host.innerHTML=`<div class="collection-hero ${kind}"><img src="assets/${kind==='tome'?'TomeClaim':'Slab5'}.png" alt=""><div><p class="eyebrow">World ${kind==='tome'?4:5} · account-wide</p><h2>${kind==='tome'?'The Tome':'The Slab'}</h2><p>${kind==='tome'?'Account rankings, completion score, and every Tome bonus.':'Lifetime item discovery and every bonus powered by Slab progress.'}</p></div><strong>${esc(summary)}</strong></div><nav class="skill-tabs" role="tablist">${tabs.map(([id,label])=>`<button class="skill-tab${tab===id?' active':''}" data-collection-tab="${id}">${label}</button>`).join('')}</nav>${!model.available?'<p class="collection-note">This save does not expose the main progress value; catalog requirements and bonuses are still shown.</p>':''}${body}<section id="collectionDetail" class="exp-card w5-detail detail-dismissed"></section>`;
    host.querySelectorAll('[data-collection-tab]').forEach(b=>b.onclick=()=>{pages[kind]=b.dataset.collectionTab;paint();});host.querySelectorAll('[data-metric-page]').forEach(b=>b.onclick=()=>{metricPage+=b.dataset.metricPage==='next'?1:-1;paint();});host.querySelectorAll('[data-slab-page]').forEach(b=>b.onclick=()=>{slabPage+=b.dataset.slabPage==='next'?1:-1;paint();});host.querySelectorAll('[data-collection]').forEach(b=>b.onclick=()=>show(b.dataset.collection,Number(b.dataset.id)));
  }
  function bonusGrid(items,type){return`<div class="collection-grid bonus-grid">${items.map(x=>`<button class="collection-card bonus" data-collection="${type}" data-id="${x.id}"><strong>${esc(x.name)}</strong><small>${esc(x.effect)}</small><em>${esc(x.source)}</em></button>`).join('')}</div>`;}
  function show(type,id){const panel=host.querySelector('#collectionDetail');let x,title,html;if(type==='metric'){x=model.metrics[id];title=x.name;html=`<p>Saved value: <strong>${fmt(x.value)}</strong></p><p>Unlocks at total Account Level ${x.levelReq}.</p>`;}else{x=type==='tome-bonus'?model.bonuses[id]:model.bonuses[id];title=x.name;html=`<p>${esc(x.effect)}</p><p class="muted">Source: ${esc(x.source)}</p>`;}panel.innerHTML=`<button class="secondary w5-close">Close</button><h3>${esc(title)}</h3>${html}`;panel.classList.remove('detail-dismissed');panel.querySelector('.w5-close').onclick=()=>panel.classList.add('detail-dismissed');}
  paint();}
  const api={decodeTome,decodeSlab,render};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Collections=api;
})(typeof window!=='undefined'?window:globalThis);
