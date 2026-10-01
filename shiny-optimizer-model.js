(function(root){'use strict';
const num=v=>Number.isFinite(Number(v))?Number(v):null;
function savedTraps(raw){
 const data=raw.data||raw,rows=[];let unknown=0;
 for(const key of Object.keys(data).filter(k=>/^PldTraps_\d+$/.test(k))){
  let traps;try{traps=typeof data[key]==='string'?JSON.parse(data[key]):data[key];}catch{unknown++;continue;}
  if(!Array.isArray(traps)){unknown++;continue;}
  for(const [index,t] of traps.entries()){
   if(!Array.isArray(t)||t[0]===-1)continue;
   if(!t[3]||t[3]==='Blank')continue;
   const chance=t[8]==null?null:num(t[8]);
   rows.push({owner:Number(key.split('_')[1]),slot:index+1,critter:t[3],snapshot:chance,duration:num(t[6])});
   if(chance===null)unknown++;
  }
 }
 return {rows,unknown};
}
function evaluate(snapshot,collector,duration,visits){
 if(!Number.isFinite(snapshot)||snapshot<0||!(duration>0)||!(visits>0))return null;
 const rawChance=snapshot*collector.open/collector.divisor,chance=Math.min(100,Math.max(0,rawChance));
 const cycle=Math.ceil(duration/(86400/visits)-1e-10)*(86400/visits);
 const rounds=86400/cycle,expected=chance/100*collector.bundle;
 return {rawChance,chance,bundle:collector.bundle,rounds,expected,daily:expected*rounds};
}
function compare(data,catalog,settings={}){
 const critter=catalog.critters.find(c=>c.critterName===settings.critter)||catalog.critters[0];
 const visits=Number(settings.visits??3),allowFood=!!settings.food;
 if(!Number.isFinite(visits)||visits<1||visits>72)return {error:'Enter between 1 and 72 collection visits per day.'};
 const slots=data.roster.reduce((sum,c)=>sum+Math.max(0,c.slots),0);
 let chanceBest=null,realistic=null;
 for(const placer of data.roster){
  if(!placer.tool)continue;
  for(let tier=0;tier<=placer.tool.tier;tier++)for(const trap of catalog.traps[tier]||[]){
   const shinyMulti=trap.trapType===1?Math.max(1,Math.floor(trap.exp)):1;
   const snapshot=Math.max(.001,critter.shinyChance*shinyMulti*placer.placement);
   for(const collector of data.candidates){
    const result=evaluate(snapshot,collector,trap.trapTime,visits);if(!result)continue;
    const candidate={...result,placer:placer.name,placerId:placer.id,tool:placer.tool.name,collector:collector.name,collectorId:collector.id,prayer:collector.prayer,food:collector.food,tier,duration:trap.trapTime,shinyMulti,snapshot,actions:collector.actions,sources:collector.sources};
    // Maximum raw single-roll chance is deliberately separate from the farming-yield objective.
    if(!chanceBest||candidate.rawChance>chanceBest.rawChance)chanceBest=candidate;
    const rank=c=>[c.daily,Number(!c.food),Number(c.placerId===c.collectorId),-c.duration,c.rawChance];
    const better=(a,b)=>{const x=rank(a),y=rank(b);for(let i=0;i<x.length;i++){if(Math.abs(x[i]-y[i])>1e-9)return x[i]>y[i];}return false;};
    if((allowFood||!collector.food)&&(!realistic||better(candidate,realistic)))realistic=candidate;
   }
  }
 }
 const collector=data.roster.find(c=>String(c.id)===String(settings.collector))||data.roster.find(c=>c.id===realistic?.collectorId)||data.roster[0];
 const existing=data.saved.rows.filter(t=>t.critter===critter.critterName);
 const current=existing.map(t=>({...t,result:t.snapshot===null?null:evaluate(t.snapshot,collector.current,t.duration,visits)}));
 const known=current.filter(t=>t.result),currentDaily=known.reduce((s,t)=>s+t.result.daily,0);
 const stale=realistic?existing.filter(t=>t.snapshot!==null&&t.snapshot<realistic.snapshot*(1-1e-9)).length:0;
 return {critter,visits,slots,collector,existing:current,currentDaily,currentKnown:known.length,currentUnknown:current.length-known.length,stale,chanceBest,realistic,missing:missing(data,realistic,stale)};
}
function missing(data,best,stale){
 const rows=[];const add=(name,status,detail)=>rows.push({name,status,detail});
 if(stale)add('Saved trap chance','Re-place',`${stale} target traps have a lower snapshot than the recommended placement. Collect-all will not refresh it.`);
 if(!best){add('Trap box','Missing','Equip a usable trap box on a character before planning placements.');return rows;}
 const saturated=best.chance>=100;
 for(const card of data.cards){
  if(!card.owned)add(card.name+' card','Missing',card.id==='loveEvent2'?'Boost-food effect; helps only when using Critter Numnums.':saturated?'Optional for this target: the recommended roll is already capped.':'Acquire this card for more collection chance.');
  else if(card.stars<6)add(card.name+' card','Upgrade',`${card.stars}★ owned${card.passive?' (passive)':''}; 6★ is the catalog target and may require later unlocks. ${saturated?'Optional: this target is already capped.':'Higher tiers improve the relevant bonus.'}`);
  else add(card.name+' card','Ready',`6★ owned${card.passive?' and passive; no card slot needed':'; available for the collection loadout'}.`);
 }
 if(!data.foodStock)add('Critter Numnums','Missing','No stock found in storage, inventories or equipped food. Excluded from both owned-setup projections.');
 else add('Critter Numnums','Owned',`${data.foodStock.toLocaleString('en-US')} in the save. Realistic mode uses no food unless enabled; using food assumes continued restocking.`);
 if(!data.star.owned)add('Mount Eaterest','Missing','Unlock its food-effect bonus; helps with Critter Numnums.');
 if(!data.setBonus)add('Yum Yum Desert set','Missing','Collect enough set stars to unlock its food-effect bonus.');
 if(!data.prayer?.level)add('Shiny Snitch','Missing','Unlock at Goblin Gorefest wave 81; then compare active versus passive yield.');
 else if(data.prayer.level<data.prayer.max)add('Shiny Snitch','Upgrade',`Level ${data.prayer.level}/${data.prayer.max}. Upgrading increases both bundle and curse; recheck yield afterward.`);
 for(const [id,name] of [[15,'Silkrode Nanochip'],[16,'Silkrode Motherboard'],[20,'Omega Nanochip'],[21,'Omega Motherboard']])if(!data.chips.some(c=>c.id===id))add(name,'Missing','Not owned in this save. Not included in the projected loadout; its benefit depends on active bonuses and available slots.');
 const src=best.sources,placer=data.roster.find(c=>c.id===best.placerId);
 for(const [key,name] of [['stampBonus','Shiny stamps'],['taskBonus','Come ’ere Critters task'],['vialsBonus','Fur Refresher / Orange Malt'],['minigameBonus','Pen Pals shiny milestones'],['arcadeBonus','Shiny Arcade upgrade']])if(!(src[key]>0))add(name,'Missing','No applied bonus decoded. Improve this source if the target is below 100%.');
 if(placer?.sources.bubbleMulti<=1)add('Cuz I Catch Em All','Upgrade','No multiplier above ×1 decoded. Improve the bubble, then replace traps.');
 if(placer?.sources.talentBonus<=1)add('Reflective Eyesight','Missing','No active multiplier above ×1 on the recommended placer. Spend talent points or switch to a prepared Hunter-line preset, then re-import.');
 if(placer?.tool?.tier<6)add('Royal trap selection','Missing','A usable Royal-or-higher trap box was not found for the placer. Higher boxes are excluded until owned and usable.');
 if(!src.meritocracyBonus)add('Shiny Meritocracy ballot','Unavailable','No shiny ballot multiplier is active. It is excluded from projected bundles.');
 if(!saturated)add('Remaining chance gap','Upgrade',`Need ×${(100/best.rawChance).toPrecision(3)} more chance to cap this setup. Improve Reflective Eyesight, reach another 10 Trapping levels, or improve placement multipliers and replace traps.`);
 return rows;
}
root.ShinyOptimizerModel={savedTraps,evaluate,compare};
})(typeof window==='undefined'?globalThis:window);
