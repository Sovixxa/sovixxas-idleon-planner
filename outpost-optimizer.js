(function(root){'use strict';
const Model=typeof module!=='undefined'&&module.exports?require('./outpost-eta-model'):root.OutpostETAModel;
function analyze(rows,c,{mapId,seconds=null,di=c?.hasDI,sample,levels=1,targets={}}={}){
 const eligible=rows.filter(r=>!r.built&&!r.locked&&r.remaining>0&&c?.maps.some(m=>m.id===r.id&&m.supported));
 const row=eligible.find(r=>r.id===mapId)||eligible.find(r=>r.id===c?.currentMap)||eligible[0];
 if(!row)return {maps:[],actions:[],tips:[],row:null};
 const sampleRow=eligible.find(r=>r.id===sample?.map);
 const sampleFit=sampleRow?Model.inferWaveTime(sampleRow,c,sample,di):null;
 const timing=Model.automaticWave(row,c,di,sample,sampleFit);
 const fit=sampleFit?{seconds:timing.seconds,fast:timing.fast,slow:timing.slow}:null,wave=fit?.seconds??seconds??timing.seconds;
 const p=seconds==null?Model.estimateAutomatic(row,c,di,sample,sampleFit):Model.estimate(row,c,wave,di),cal=Model.calibrateOrb(row,c,p,sample),base=cal||p;
 const eta=rate=>rate>0?row.remaining/rate*3600:null;
 // Re-solve finite crystal boosts when an upgrade changes the completion horizon.
 const projectionWave=cal&&fit?fit.slow:wave;
 const finiteBoost=p.guaranteed>0&&(!cal||!!fit);
 const projectRate=(variant,targetRow=row,targetDi=di)=>finiteBoost
  ?Model.estimate(targetRow,variant,projectionWave,targetDi).creditPerHour
  :base.activeKills*variant.creditPerKill+targetRow.militia*variant.militiaPerHour;
 const actions=[],combinedOverrides={},editors={};
 const batch=Math.max(1,Math.min(1000,Math.floor(Number(levels)||1)));
 function targetLevel(id,current,max=100000){
  const entered=Number(targets[id]),value=Object.hasOwn(targets,id)&&Number.isFinite(entered)?entered:current+batch;
  const target=Math.max(current,Math.min(max,Math.floor(value)));
  editors[id]={current,target,max};return target;
 }
 function add(id,title,rate,note,kind){
  if(!Number.isFinite(rate)||rate<base.creditPerHour-1e-8||rate<=base.creditPerHour+1e-8&&!Object.hasOwn(targets,id))return;
  actions.push({id,title,editor:editors[id],rate,eta:eta(rate),gain:rate-base.creditPerHour,percent:base.creditPerHour>0?100*(rate/base.creditPerHour-1):null,saved:base.eta==null?null:base.eta-eta(rate),note,kind});
 }
 for(const u of c.upgrades||[]){
  if(!u.unlocked||!(u.level<u.maxLevel)||!(u.step>0))continue;
  const targetLv=targetLevel(u.key,u.level,u.maxLevel),added=targetLv-u.level,target=c[u.key]+u.step*added;
  const variant=Model.customize(c,{[u.key]:target});
  const rate=projectRate(variant);
  if(rate>base.creditPerHour+1e-8)combinedOverrides[u.key]=target;
  add(u.key,`${u.name}: level ${u.level} → ${u.level+added} (+${added})`,rate,`${u.where} · ${c[u.key].toFixed(1)}% → ${target.toFixed(1)}%. Same combat setup; finite crystal boosts are recalculated for the new completion time.`,"Clearing bonus");
 }
 const inputs=c.optimizerInputs||{};
 function creditTarget(key,title,target,note,kind='Clearing bonus'){
  const v=Model.customize(c,{[key]:target}),rate=projectRate(v);
  if(rate>base.creditPerHour+1e-8)combinedOverrides[key]=target;
  add(key,title,rate,note,kind);
 }
 if(inputs.warbound){
  const {x1,x2}=inputs.warbound,bonus=c.warbound-1;
  if(x1>bonus&&x2>0){const level=Math.round(bonus*x2/(x1-bonus)),next=targetLevel('warbound',level),added=next-level,target=1+x1*next/(next+x2);
   creditTarget('warbound',`Warbound Politics: ${level} → ${next} effective levels`,target,`Raise the account's strongest Warbound through talent points, books or added talent levels. ${c.warbound.toFixed(3)}× → ${target.toFixed(3)}× clearing. Includes any book-cap increase needed.`,'Talent target');}
 }
 if(inputs.fish){const f=inputs.fish,next=targetLevel('fish',f.level),target=f.scale*next/(100+next);
  creditTarget('fish',`Advice Fish clearing: level ${f.level} → ${next}`,target,`Spelunking → Advice Fish. ${c.fish.toFixed(2)}% → ${target.toFixed(2)}% clearing.`);}
 if(c.jelly<25)creditTarget('jelly','Unlock Jelly clearing reward',25,'Research → Jelly obstruction reward 2. Adds the 25% clearing multiplier.','Unlock');
 function combatTarget(id,title,variant,note,seconds=wave){
  if(!(p.activeKills>0)||cal&&!fit)return;
  const v=Model.estimate(row,variant,seconds,di);
  add(id,title,finiteBoost?projectRate(variant):base.activeKills*(v.activeKills/p.activeKills)*c.creditPerKill+base.militia,note,id==='chocolatey'?'Chip setup':'Talent upgrade');
 }
 function changeMap(change){return {...c,maps:c.maps.map(m=>m.id===row.id?change(structuredClone(m)):m)};}
 if(di&&inputs.regal){const t=inputs.regal,l=targetLevel('regal',t.level);
  const chance=Math.min(1,c.riChance+(t.x1*l/(l+t.x2)-t.x1*t.level/(t.level+t.x2))*(1+t.market/100)/100);
  const mobs=c.riMobs+Math.floor(l/t.y2)-Math.floor(t.level/t.y2);
  combatTarget('regal',`Regal Intervention: ${t.level} → ${l} effective levels`,{...c,riChance:chance,riMobs:mobs},`${(c.riChance*100).toFixed(2)}% × ${c.riMobs} mobs → ${(chance*100).toFixed(2)}% × ${mobs}. Spend talent points or raise its book cap. Extra mobs use twice normal HP.`);
 }
 if(di&&inputs.regal&&inputs.regalShop&&inputs.regalShop.level<inputs.regalShop.maxLevel){
  const t=inputs.regal,u=inputs.regalShop,next=targetLevel('regalShop',u.level,u.maxLevel);
  const extraMarket=Math.floor(next*u.step)-Math.floor(u.level*u.step),chance=Math.min(1,c.riChance+t.x1*t.level/(t.level+t.x2)*extraMarket/10000);
  combatTarget('regalShop',`Orblet Regal chance: level ${u.level} → ${next}`,{...c,riChance:chance},`Orblet Market. Regal Intervention chance: ${(c.riChance*100).toFixed(3)}% → ${(chance*100).toFixed(3)}%.`);
 }
 const targetMap=p.map,mode=di?'di':'normal',targetStats=targetMap?.[mode]||targetMap;
 if(targetMap){
  const crystal=targetMap.crystal,cs=crystal?.[mode];
  if(crystal&&(crystal.chance>0||crystal.guaranteed>0)){
   if(crystal.chainChance<.75)combatTarget('chocolatey','Equip Chocolatey Chip',changeMap(m=>{m.crystal.chainChance=.75;return m;}),'Lab → chips. Equip Chocolatey if owned, or obtain it from the chip rotation. Models 75% crystal chains, including time to kill them.');
  }
  if(crystal&&crystal.chance>0&&crystal.chance<.1){
   if(inputs.crystalTalent){const t=inputs.crystalTalent,l=targetLevel('crystalTalent',t.level),ratio=(1+t.x1*l/(l+t.x2)/100)/(1+t.x1*t.level/(t.level+t.x2)/100);
    combatTarget('crystalTalent',`Crystals 4 Dayys: ${t.level} → ${l} levels`,changeMap(m=>{const flat=(m.crystal.sources?.['Event Shop']||0)/2000;m.crystal.rawChance=flat+(m.crystal.rawChance-flat)*ratio;m.crystal.chance=Math.min(.1,m.crystal.rawChance);return m;}),'Spend star-talent points or raise its cap. The flat Event Shop term is not multiplied by this talent.');}
  }
 }

 const available=Math.max(0,(c.militiaByWorld?.[row.world-1]||0)-row.militia);
 if(available>0)add('militia','Reassign one militia (if in range)',projectRate(c,{...row,militia:row.militia+1}),`${available} militia in this world are assigned elsewhere. Check that a connected outpost and the unit’s assignment range allow this target. Moving one reduces clearing or work at its previous destination; this is not a free account-wide gain.`,'Conditional reassignment');
 if(!di&&c.knowsDI&&p.activeKills>0&&(!cal||fit)){
  const improved=Model.estimate(row,c,wave,true);
  add('di','Maintain Divine Intervention',finiteBoost?projectRate(c,row,true):base.activeKills*(improved.activeKills/p.activeKills)*c.creditPerKill+base.militia,'Equip DI and maintain mana/uptime. Modeled change at the same wave-clear assumption; take a new Orb sample after changing the setup.','Combat scenario');
 }
 // Keep upgrade cards in source order while their gains change.
 const combinedCharacter=Model.customize(c,combinedOverrides);
 const combinedRate=projectRate(combinedCharacter);
 const combined={count:Object.keys(combinedOverrides).length,rate:combinedRate,eta:eta(combinedRate),gain:combinedRate-base.creditPerHour};
 const tips=[];
 const map=p.map,stats=di?map?.di:map?.normal;
 if(p.hits>1)tips.push(`Normal mobs need about ${p.hits.toFixed(1)} expected basic hits. Improve damage or accuracy through talents, equipment and cards; the one-hit damage threshold is ${Math.ceil(map.hp).toLocaleString()} on this map. A stronger skill can already cross it.`);
 else tips.push('Normal mobs are already at the modeled one-hit threshold. Prioritize clearing credit, wave coverage and uptime before stacking more normal-hit damage.');
 if(stats?.hitChance<1)tips.push(`Hit chance is ${(stats.hitChance*100).toFixed(1)}%. Check accuracy cards, gear and account accuracy bonuses before adding more damage.`);
 const crystal=map?.crystal;
 if(crystal?.chance>=.1)tips.push('Crystal spawn chance is already at its 10% cap. More crystal chance increases Orb counter weight, not the base spawn rate; do not mistake a larger Orb counter for more clearing kills.');
 else for(const card of c.crystalCards||[])if(!card.equipped)tips.push(`${card.owned?'Try your owned':'Work toward the'} ${card.name} crystal card. Replacing a damage card has a tradeoff; compare outpost credit over equal timed runs before keeping the swap.`);
 if(crystal&&crystal.chainChance<.75)tips.push('Check Chocolatey Chip availability and equip it for a trial if owned. Its crystal chains can add physical kills, but tougher crystals also take time.');
 tips.push(`${c.guardianEquipped?'Your Guardian is equipped: test':'Equip a learned Guardian Disciple and test'} placement near respawns. Keep Knightly Disciple and attack coverage active; compare actual outpost credit over equal 5–10 minute runs. Placement is not recorded in the save.`);
 tips.push(`Warbound Politics affects active and militia credit together (saved multiplier ${c.warbound.toFixed(3)}×). Check talent points, book cap and added talent levels on your RGs. The calculator already uses the applicable account-wide best bonus.`);
 tips.push('Advice Fish and Jelly clearing rewards also improve credit. Review their progress in their own pages; no unlock time or purchase cost is assumed here. Paid damage, equipped cards, chips and saved buffs are already included in the baseline.');
 const maps=eligible.map(r=>{const prediction=seconds==null?Model.estimateAutomatic(r,c,di,sample,sampleFit):Model.estimate(r,c,r.id===row.id?wave:seconds,di);const result=r.id===row.id?base:(Model.calibrateOrb(r,c,prediction,sample)||prediction);return {id:r.id,name:r.name,eta:result.eta,rate:result.creditPerHour,sampled:r.id===row.id?!!cal:!!Model.calibrateOrb(r,c,prediction,sample)};}).filter(r=>r.eta!=null).sort((a,b)=>a.eta-b.eta||a.id-b.id);
 return {row,eligible,base,batch,combined,ownedCards:(c.ownedCombatCards||[]).filter(card=>!card.equipped&&((p.hits>1&&/damage|crit/i.test(card.effect))||(targetStats?.hitChance<1&&/accuracy/i.test(card.effect))||(!di&&targetMap?.respawn>4&&/respawn/i.test(card.effect))||(targetMap?.crystal?.chance<.1&&/crystal/i.test(card.effect)))).slice(0,12),calibrated:!!cal,actions,tips,maps};
}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:0});
const time=s=>s==null?'No clearing rate':s<3600?`${Math.ceil(s/60)} min`:s<86400?`${(s/3600).toFixed(1)} hr`:`${(s/86400).toFixed(1)} days`;
function html(result){
 if(!result.row)return '<p class="outpost-note">Load a Royal Guardian with unfinished combat maps in unlocked worlds to see recommendations.</p>';
 const {row,base,actions,tips,maps,combined,batch,ownedCards=[]}=result,best=actions.reduce((best,a)=>a.gain>0&&(!best||a.gain>best.gain)?a:best,null);
 return `<div class="outpost-controls"><label>Optimize this map<select id="outpostOptimizeMap">${result.eligible.map(r=>`<option value="${r.id}"${r.id===row.id?' selected':''}>${esc(r.name)}</option>`).join('')}</select></label><label>Default levels to add<input id="outpostOptimizeLevels" type="number" min="1" max="1000" step="1" value="${batch}"></label></div><p class="outpost-detail">Uses this character’s saved account values and the DI setting above. Calculator bonus overrides are excluded. A valid Orb sample calibrates its map and tunes automatic timing on other maps.</p><div class="outpost-optimizer-overview"><article><small>Current ${result.calibrated?'Orb-calibrated':'modeled'} pace</small><strong>${number(base.creditPerHour)} credit/hr</strong><span>${time(base.eta)} remaining</span></article><article><small>Largest gain among tested actions</small><strong>${best?esc(best.title):'No positive next-step gain found'}</strong><span>${best?`+${number(best.gain)} credit/hr · ${time(best.eta)} remaining`:'See the setup checks below.'}</span></article></div><div class="outpost-note"><h3>Combined upgrade plan</h3><p>${combined.count} direct clearing improvements combined. Uses your target level on each upgrade.</p><strong>${number(combined.rate)} credit/hr · ${time(combined.eta)} remaining</strong><p>+${number(combined.gain)} credit/hr. Includes the direct clearing bonuses listed below. Talent spawn effects, chips and militia transfers are separate.</p></div><h3>Upgrade options</h3><p class="outpost-detail">Cards stay in a fixed order. Gains update when you change a target level.</p><div class="outpost-improvements">${actions.map((a,i)=>`<article><div><small>${i+1} · ${esc(a.kind)}</small><h4>${esc(a.title)}</h4></div><div class="outpost-controls">${a.editor?`<label>Target level<input data-outpost-target="${esc(a.id)}" type="number" min="${a.editor.current}" max="${a.editor.max}" step="1" value="${a.editor.target}"></label><small>Current: ${a.editor.current}</small>`:""}</div><strong>+${number(a.gain)} credit/hr${a.percent==null?'':` (+${a.percent.toFixed(1)}%)`}</strong><p>${time(a.eta)} remaining${a.saved>0?` · save ${time(a.saved)}`:''}</p><details><summary>How to get this gain</summary><p>${esc(a.note)}</p></details></article>`).join('')||'<p>No available tested action increases clearing at this setup.</p>'}</div><h3>Owned cards for this map</h3><div class="outpost-improvements">${ownedCards.length?ownedCards.map(card=>`<article><h4>${esc(card.name.replaceAll("_"," "))}</h4><p>${esc(card.effect.replace("{",Number(card.bonus).toFixed(1)).replaceAll("_"," "))}</p><small>Owned · not equipped. Replaces a current card.</small></article>`).join(""):"<p>Your owned, unequipped cards do not match a current modeled damage, accuracy, crystal-spawn or respawn gap.</p>"}</div><details class="outpost-note"><summary>Cards, talents and combat setup checks</summary><ul>${tips.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></details><details class="outpost-note"><summary>Which map can I finish next?</summary><p>Fastest estimated completions from current progress. These are alternative destinations, not a route with shared daily crystals or transferred militia. Unsampled maps use automatic build timing, tuned by your Orb sample when available. Terrain can change the order.</p><ol>${maps.slice(0,10).map(m=>`<li>${esc(m.name)} — <strong>${time(m.eta)}</strong> · ${number(m.rate)} credit/hr${m.sampled?' · Orb sample':''}</li>`).join('')}</ol></details>`;
}
const api={analyze,html};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.OutpostOptimizer=api;
})(globalThis);
