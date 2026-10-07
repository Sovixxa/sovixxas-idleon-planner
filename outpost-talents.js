(function(root){'use strict';
const Model=typeof module!=='undefined'&&module.exports?require('./outpost-eta-model'):root.OutpostETAModel;
const order=[225,226,227,229,228,230,231,232,203,234,235,236,237,238,239];
const talent=(c,id)=>c.talentPlan.talents.find(t=>t.id===id);
const empty=()=>Object.fromEntries(order.map(id=>[id,0]));
const spent=a=>Object.values(a).reduce((s,v)=>s+v,0);
const effective=(t,points)=>points>0?points+t.added:0;
function reserved(c,active){
 if(!active)return Object.fromEntries(order.map(id=>[id,talent(c,id).current]));
 const a=empty();
 a[225]=1;a[226]=1;
 for(const id of [228,234])a[id]=Math.max(1,talent(c,id).current);
 if(active)for(const id of [203,227])a[id]=talent(c,id).current;
 for(const t of c.talentPlan.talents)if(t.superActive&&t.id!==231&&(!active||t.id!==229))a[t.id]=Math.max(1,a[t.id]);
 return a;
}
function warbound(active,owner,points){
 const t=talent(owner,231),level=points>0?points+(active.talentPlan.sharedWarboundAdded[owner.index]||0):0;
 return 1+t.x1*level/(level+t.x2);
}
function variant(active,characters,allocations){
 const shared=Math.max(1,...characters.map(c=>warbound(active,c,allocations[c.index][231])));
 const t=talent(active,229),level=effective(t,allocations[active.index][229]),p=active.talentPlan;
 return Model.customize(active,{warbound:shared,
  riChance:level>0?Math.min(1,t.x1*level/(level+t.x2)/100*(1+p.regalMarket/100)+p.regalJelly):0,
  riMobs:level>0?Math.floor(t.y1+Math.floor(level/t.y2)+p.regalMobBonus):0});
}
function analyzeBase(rows,characters,{mapId}={}){
 const cs=(characters||[]).filter(c=>c.talentPlan),eligible=rows.filter(r=>!r.built&&!r.locked&&r.remaining>0&&cs.some(c=>c.maps.some(m=>m.id===r.id&&m.supported)));
 const row=eligible.find(r=>r.id===mapId)||eligible.find(r=>cs.some(c=>c.currentMap===r.id))||eligible[0];
 if(cs.length<2)return {error:'Load a complete save with both Royal Guardians to build a joint talent plan.',eligible,row};
 for(const c of cs){const p=c.talentPlan;
  if(!Number.isSafeInteger(p.budget)||p.budget<0||order.some(id=>!talent(c,id)||!Number.isSafeInteger(talent(c,id).cap)||talent(c,id).current>talent(c,id).cap)||p.talents.reduce((s,t)=>s+t.current,0)>p.budget)
   return {error:'The saved points or caps do not reconcile for '+c.name+'. Import a fresh complete save before reallocating.',eligible,row};
 }
 if(!row)return {error:'No unfinished combat map is available in an unlocked world.',eligible,row};
 const scenarios=[];
 for(const active of cs.slice(0,1)){
  if(!active.maps.some(m=>m.id===row.id&&m.supported))continue;
  const di=!!active.knowsDI,allocations=Object.fromEntries(cs.map(c=>[c.index,reserved(c,c===active)]));
  if(cs.some(c=>spent(allocations[c.index])>c.talentPlan.budget||order.some(id=>allocations[c.index][id]>talent(c,id).cap)))continue;
  const reserve=spent(allocations[active.index]),available=active.talentPlan.budget-reserve;
  let best=null;
  const minRI=talent(active,229).superActive?1:0,minWar=talent(active,231).superActive?1:0;
  const maxRI=di?Math.min(talent(active,229).cap,available-minWar):Math.min(minRI,available-minWar);
  for(let ri=minRI;ri<=maxRI;ri++){
   const a=allocations[active.index];a[229]=ri;a[231]=Math.min(talent(active,231).cap,available-ri);
   const otherBest=Math.max(1,...cs.filter(c=>c!==active).map(c=>warbound(active,c,allocations[c.index][231])));
   if(warbound(active,active,a[231])<=otherBest)a[231]=minWar;
   const c=variant(active,cs,allocations),prediction=Model.estimateAutomatic(row,c,di);
   if(prediction.eta==null)continue;
   const used=spent(a);
   if(!best||prediction.eta<best.prediction.eta-1e-7||Math.abs(prediction.eta-best.prediction.eta)<1e-7&&used<best.used)
    best={active,di,character:c,prediction,used,allocations:structuredClone(allocations)};
  }
  if(best){
   best.baseline=Model.estimateAutomatic(row,active,di);scenarios.push(best);
  }
 }
 scenarios.sort((a,b)=>a.prediction.eta-b.prediction.eta||a.active.index-b.active.index);
 return {row,eligible,characters:cs,scenarios,best:scenarios[0],error:scenarios.length?null:'No feasible clearing plan: check that the active RG can afford and unlock Castle, Armory, Orb of Verisimilitude and Lil’ Orblets while retaining the reserved combat points.'};
}
function analyze(rows,characters,options={}){
 const baseline=analyzeBase(rows,characters,options);
 if(baseline.error)return baseline;
 const cs=baseline.characters,variants=[];
 function visit(i,added){
  if(i===cs.length){variants.push(added);return;}
  const c=cs[i],p=c.talentPlan,left=Math.max(0,(p.superSlots||0)-(p.savedSupers?.length||0));
  const eligible=(i===0?[229,231]:[]).filter(id=>talent(c,id).cap>0&&!talent(c,id).superActive);
  for(let mask=0;mask<(1<<eligible.length);mask++){
   const ids=eligible.filter((id,k)=>mask&(1<<k));
   if(ids.length<=left)visit(i+1,{...added,[c.index]:ids});
  }
 }
 visit(0,{});
 const winners=new Map();
 for(const additions of variants){
  const trial=structuredClone(cs);
  for(const c of trial){const p=c.talentPlan;
   p.newSupers=additions[c.index];
   for(const id of p.newSupers){const t=talent(c,id);t.superActive=true;t.superBonus=p.superBonus;t.added+=p.superBonus;
    if(id===231&&!p.otherSupers?.includes(231))for(const active of trial)active.talentPlan.sharedWarboundAdded[c.index]+=p.superBonus;
   }
  }
  const result=analyzeBase(rows,trial,options);if(result.error)continue;
  const slots=Object.values(additions).reduce((n,ids)=>n+ids.length,0);
  for(const scenario of result.scenarios){const old=winners.get(scenario.active.index);
   if(!old||scenario.prediction.eta<old.prediction.eta-1e-7||Math.abs(scenario.prediction.eta-old.prediction.eta)<1e-7&&slots<old.slots)
    winners.set(scenario.active.index,{...scenario,characters:trial,slots});
  }
 }
 const scenarios=[...winners.values()].sort((a,b)=>a.prediction.eta-b.prediction.eta||a.slots-b.slots),best=scenarios[0];
 return best?{...baseline,scenarios,best,characters:best.characters}:baseline;
}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const name=v=>v.replaceAll('_',' '),num=v=>Number(v).toLocaleString(undefined,{maximumFractionDigits:2});
const duration=s=>s==null?'No clearing rate':s<3600?Math.ceil(s/60)+' min':s<86400?(s/3600).toFixed(1)+' hr':(s/86400).toFixed(1)+' days';
function capNote(c,id,points,active){
 const t=talent(c,id),level=effective(t,points),p=c.talentPlan;
 if(id===229){
  if(!points)return 'No Regal Intervention effect at zero base points.';
  const chance=Math.min(1,t.x1*level/(level+t.x2)/100*(1+p.regalMarket/100)+p.regalJelly);
  const mobs=Math.floor(t.y1+Math.floor(level/t.y2)+p.regalMobBonus),next=(Math.floor(level/t.y2)+1)*t.y2-level;
  return `${num(chance*100)}% spawn chance${chance>=1?' (capped at 100%)':''} · ${mobs} extra mobs. `+(points+next<=t.cap?`Next mob breakpoint: +${num(next)} base points.`:'Next mob breakpoint exceeds the saved base-point cap.');
 }
 if(id===231){
  const current=warbound(active,c,points),gain=warbound(active,c,points+1)-current;
  return `${num(current)}× from this RG. Diminishing returns; `+(points<t.cap?`next point adds ${gain.toFixed(5)}× before the highest-RG comparison.`:'saved base-point cap reached.');
 }
 if(id===228)return `+${num(level>0?t.x1*level/(level+t.x2):0)} seconds of Orb duration, with diminishing returns. The +2 Regal counter benefit unlocks with one point; more points extend duration.`;
 if(id===234)return `+${num(level>0?t.x1*level/(level+t.x2):0)}% Orblet multi-drop from this talent, with diminishing returns. Above 100% can produce additional drops; the client caps the combined result at five drops. Saved progression investment is protected rather than optimized for immediate clearing.`;
 return '';
}
function html(result){
 const {row,eligible=[],characters=[],best,scenarios=[]}=result;
 const selector=eligible.length?`<label>Target outpost<select id="outpostTalentMap">${eligible.map(r=>`<option value="${r.id}" ${r.id===row?.id?'selected':''}>${esc(r.name)}</option>`).join('')}</select></label>`:'';
 if(result.error||!best)return `<div class="outpost-controls">${selector}</div><p>${esc(result.error||'No modeled clearing rate is available for these builds.')}</p>`;
 const reason=(id,active)=>id===225?'One point reserved for Castle access.':id===226?'One point reserved for Royal Armory access.':id===228?'Keep saved Orb investment (at least one point) for longer Orb runs and Regal counter benefits.':id===234?'Keep saved investment (at least one point) for orblet drops and future upgrades.':id===231?'Shared clearing bonus; highest RG wins.':id===229?(active?'Extra physical mobs while DI is maintained.':'Only benefits the character actively fighting.'):id===227||id===203?(active?'Kept at saved investment to preserve combat coverage and damage.':'Not needed for the off-screen Warbound role.'):'No direct physical clearing benefit in this fixed-account comparison.';
 return `<div class="outpost-controls">${selector}</div><h3>Joint RG talent plan · clearing + progression</h3><p>Play <strong>${esc(best.active.name)}</strong> on ${esc(row.name)}. Your second RG keeps its saved Spelunking build and contributes its existing Warbound bonus. Only one character fights actively; militia is counted once.</p><div class="outpost-optimizer-overview"><article><small>Recommended clearing pace</small><strong>${num(best.prediction.creditPerHour)} credit/hr</strong><span>${duration(best.prediction.eta)} remaining</span></article><article><small>Shared Warbound</small><strong>${num(best.character.warbound)}×</strong><span>${best.di?'Maintain Divine Intervention':'DI unavailable in this saved build'}</span></article></div><p>Allocate the <strong>base points</strong> shown for the active RG after a talent reset. The second RG is read-only: keep its saved points and super assignments. Bonus and super levels are free additions, not points to spend. Orb’s Regal counts support Orb/orblet progression; they are not applied again as outpost kill credit. Keep the second RG on its saved preset so the displayed shared bonus remains valid. Other talent pages stay as saved.</p><p class="outpost-note">Search covers every affordable Regal Intervention level and its best Warbound allocation on the first RG, after reserving Castle and Armory access, plus at least the saved Orb of Verisimilitude and Lil’ Orblets points on both RGs. Warbound uses its diminishing-return formula and only the highest RG bonus; the second RG’s allocation is held fixed, including all Spelunking talents. Regal spawn chance caps at 100%, but extra-mob breakpoints can still justify more points. There is no arbitrary level-100 or level-200 cutoff. Guardian Disciple and Built Different stay at the active RG’s saved investment. This is the best plan within those combat constraints, not a proof of a globally perfect build. Existing super assignments across all pages are retained. Only the first RG’s unspent super slots are tested on Regal Intervention and Warbound. The second RG is never selected as the active clearer or given a respec recommendation. Saved attack setup and automatic timing are held constant; take a new Orb sample after changing talents.</p><div class="outpost-talent-plans">${characters.map(c=>{
 const a=best.allocations[c.index],active=c.index===best.active.index,total=spent(a),p=c.talentPlan;
 return `<section><h3>${esc(c.name)} · ${active?'Active clearer':'Spelunking · keep saved build'}</h3><p>Preset ${p.preset+1} · <strong>${total} / ${p.budget} points</strong> · ${p.budget-total} unspent</p><p class="outpost-super-summary"><strong>Super talents:</strong> ${(p.savedSupers?.length||0)+(p.newSupers?.length||0)} / ${p.superSlots??'unknown'} slots used across all pages · +${p.superBonus||0} levels each. ${p.newSupers?.length?'Add: '+p.newSupers.map(id=>esc(name(talent(c,id).name))).join(', ')+'.':'Keep your saved supers.'} ${(p.savedSupers||[]).filter(id=>!order.includes(id)).length} saved supers are on other pages.</p><div class="outpost-talent-grid">${order.map(id=>{const t=talent(c,id),points=a[id];return `<article class="${t.superActive?'outpost-super-talent':''}" title="${esc(active?reason(id,true):'Keep saved points for your Spelunking build.')}"><img src="assets/UISkillIcon${id}.png" alt=""><strong>${esc(name(t.name))}</strong>${t.superActive?'<span class="outpost-super-badge">'+(p.newSupers?.includes(id)?'ADD SUPER':'KEEP SUPER')+'</span>':''}<b>${points} points</b><small>Now ${t.current} → ${points} / cap ${t.cap}</small><small>Effective LV ${effective(t,points)}</small><small>${points} base + ${points>0?(t.normalAdded??t.added):0} bonus + ${points>0?(t.superBonus||0):0} super</small>${id===231?'<small>Shared Warbound LV '+(points>0?points+(best.active.talentPlan.sharedWarboundAdded[c.index]||0):0)+' while '+esc(best.active.name)+' is active</small>':''}${t.superOther&&!t.superActive?'<small>Super in the other preset; shared Warbound checks both presets.</small>':''}<p>${esc(active?reason(id,true):'Keep saved points for your Spelunking build.')}</p>${capNote(c,id,points,best.active)?'<p>'+esc(capNote(c,id,points,best.active))+'</p>':''}</article>`;}).join('')}</div><details><summary>Point budget sources</summary><ul>${Object.entries(p.sources).filter(([,v])=>v).map(([k,v])=>`<li>${esc(k)}: ${num(v)}</li>`).join('')}</ul></details></section>`;
 }).join('')}</div><details><summary>Saved versus planned clearing</summary><ul>${scenarios.map(s=>`<li>${esc(s.active.name)} active: ${duration(s.prediction.eta)} planned vs ${duration(s.baseline.eta)} with saved talents, using the same DI setting.</li>`).join('')}</ul></details><p>Orb duration and orblet farming investments are protected. The active RG’s remaining unspent points can go toward resource collection or other utility without reducing this clearing allocation. On the active RG, resource collection and Spelunking investments beyond the stated reserves are not protected. All second-RG points are preserved. Recommendations do not change your game save.</p>`;
}
const api={analyze,html,variant,warbound,order};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.OutpostTalents=api;
})(globalThis);
