(function(root){'use strict';
const goals={evolution:'Crop evolution',cropValue:'Crop value',rankExp:'Rank EXP',overgrowth:'Overgrowth',farmingExp:'Farming EXP',character:'Character stats'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const name=v=>String(v??'').replaceAll('_',' ');
const number=v=>Number(v||0).toLocaleString('en',{maximumFractionDigits:2});
function rankBoard(f,grouped){return `<section class="land-game-board"><h3>Land Rank Database</h3><p class="land-game-legend">Saved → Target · Green = points to add</p><div class="land-game-grid">${f.ranks.map((r,i)=>{const step=grouped.get(i),level=r.upgradeLevel||0,locked=f.totalRanks<r.unlockAt;return `<button type="button" class="land-game-tile ${step?'planned':''}" data-land-tile="${i}" aria-label="${esc(name(r.name))}, saved level ${level}, target ${step?.newLevel??level}"><img src="assets/RankUpg${i}.png" alt=""><strong>Lv ${number(level)}</strong><span>${step?'→ '+number(step.newLevel):locked?'Locked':'—'}</span><b>${step?'+'+number(step.count):' '}</b></button>`;}).join('')}</div><div class="land-game-detail" data-land-detail aria-live="polite">Select an upgrade to view its bonus.</div></section>`;}
function mount(host,raw,f){
 let saved={};try{saved=JSON.parse(localStorage.getItem('land-rank-preferences')||'{}')||{};}catch{}
 const weights=Object.fromEntries(Object.keys(goals).map(k=>[k,Math.max(0,Math.min(100,Number(saved.weights?.[k]??(k==='rankExp'?1:0))||0))]));
 const excluded=new Set(Array.isArray(saved.excluded)?saved.excluded:[]),available=Math.max(0,Math.floor(f.availablePoints||0));
 host.innerHTML=`<div class="land-workspace"><div data-land-board>${rankBoard(f,new Map())}</div><aside class="land-settings"><div class="land-settings-heading"><span class="land-settings-kicker">YOUR PLAN</span><h4>Optimizer settings</h4></div><div class="land-controls"><label>Preset <select data-land-preset><option value="custom">Custom priorities</option><option value="balanced">Balanced</option>${Object.entries(goals).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><label>Points to spend <input data-land-budget type="number" min="0" max="${Math.min(available,10000)}" value="${Math.min(available,1000)}"></label></div><div class="land-priority-heading"><strong>Goal priorities</strong><span>0 = ignore · higher = favor</span></div><div class="land-weights">${Object.entries(goals).map(([k,v])=>`<label>${v}<input type="number" data-land-weight="${k}" min="0" max="100" step="1" value="${weights[k]}"></label>`).join('')}</div><p class="farm-extra-note">Uses your current levels and unspent points. Character stats combines all four character bonuses.</p><details><summary>Choose upgrades to include</summary><div class="land-weights">${f.ranks.map((r,i)=>`<label title="${esc(name(r.description))}"><input type="checkbox" data-land-include="${i}" ${excluded.has(i)?'':'checked'}>${esc(name(r.name))} · Lv ${r.upgradeLevel||0}</label>`).join('')}</div></details><div data-land-result aria-live="polite"></div></aside></div>`;
 const output=host.querySelector('[data-land-result]');let worker=null,id=0,timer;
 const stop=()=>{clearTimeout(timer);worker?.terminate();worker=null;};
 const observer=new MutationObserver(()=>{if(!host.isConnected){stop();observer.disconnect();}});observer.observe(document.body,{childList:true,subtree:true});
 function run(){
  try{localStorage.setItem('land-rank-preferences',JSON.stringify({weights,excluded:[...excluded]}));}catch{}
  const input=host.querySelector('[data-land-budget]'),budget=Math.max(0,Math.min(available,10000,Math.floor(Number(input.value)||0)));input.value=budget;
  stop();output.textContent='Calculating upgrade order…';
  worker=new Worker('land-rank-worker.js');const request=++id;
  timer=setTimeout(()=>{stop();output.textContent='Calculation timed out. Change a setting to retry.';},90000);
  worker.onerror=()=>{stop();output.textContent='Calculator could not load. Change a setting to retry.';};
  worker.onmessage=({data})=>{if(data.id!==id)return;stop();if(data.error){output.textContent=data.error;return;}
   const plan=data.plan,grouped=new Map();for(const step of plan){const row=grouped.get(step.index);if(row){row.newLevel=step.newLevel;row.count++;}else grouped.set(step.index,{...step,count:1});}
   output.innerHTML=`<div class="land-plan-summary"><span><strong>${plan.length}</strong> points planned</span><span><strong>${available-plan.length}</strong> unspent after plan</span></div>${plan.length?`<details><summary>Step-by-step spending order (${plan.length})</summary><ol class="land-steps">${plan.map(r=>`<li>${esc(name(r.name))} → Lv ${r.newLevel}</li>`).join('')}</ol></details>`:`<p class="farm-extra-note">${!budget?'No points selected or available.':Object.values(weights).every(v=>!v)?'Set at least one goal weight above 0.':'No beneficial upgrades within these priorities, exclusions, unlocks and caps.'}</p>`}<p class="farm-extra-note">Preferences saved automatically. Your imported save stays unchanged.</p>`;
   host.querySelector('[data-land-board]').innerHTML=rankBoard(f,grouped);
   let selected=null;
   const show=index=>{const r=f.ranks[index],step=grouped.get(index),level=step?.newLevel??r.upgradeLevel??0;
    const bonus=(i,l)=>Number(f.rankMulti??1)*(i%5===4?r.base*l:1.7*r.base*l/(l+80));
    const describe=value=>esc(name(r.description).replaceAll('{',number(value)).replaceAll('}',number(1+value/100)));
    host.querySelector('[data-land-detail]').innerHTML=`<strong>${esc(name(r.name))}</strong><p>${describe(r.bonus)}</p>${step?`<p class="land-target-bonus">Target: ${describe(bonus(index,level))}</p>`:''}<small>Row ${Math.floor(index/5)+1}, column ${index%5+1} · ${step?'Add '+step.count+' points':'No points added'}${excluded.has(index)?' · Excluded':''}</small>${selected!==null?'<button type="button" data-land-dismiss aria-label="Dismiss upgrade details">×</button>':''}`;
    host.querySelector('[data-land-dismiss]')?.addEventListener('click',()=>{selected=null;host.querySelector('[data-land-detail]').textContent='Select an upgrade to view its bonus.';});
   };
   host.querySelectorAll('[data-land-tile]').forEach(tile=>{const index=Number(tile.dataset.landTile);tile.addEventListener('mouseenter',()=>show(index));tile.addEventListener('focus',()=>show(index));tile.addEventListener('click',()=>{selected=index;show(index);});tile.addEventListener('mouseleave',()=>{if(selected!==null)show(selected);});});
  };worker.postMessage({id:request,raw,budget,weights,excluded:[...excluded]});
 }
 host.addEventListener('change',e=>{
  if(e.target.matches('[data-land-preset]')){if(e.target.value==='custom')return;for(const k of Object.keys(goals)){weights[k]=e.target.value==='balanced'||e.target.value===k?1:0;host.querySelector(`[data-land-weight="${k}"]`).value=weights[k];}if(e.target.value==='custom')return;}
  if(e.target.dataset.landWeight){const k=e.target.dataset.landWeight;weights[k]=Math.max(0,Math.min(100,Number(e.target.value)||0));e.target.value=weights[k];host.querySelector('[data-land-preset]').value='custom';}
  if(e.target.dataset.landInclude!==undefined){const i=Number(e.target.dataset.landInclude);e.target.checked?excluded.delete(i):excluded.add(i);}
  run();
 });run();
}
root.LandRankOptimizer={mount};
})(window);
