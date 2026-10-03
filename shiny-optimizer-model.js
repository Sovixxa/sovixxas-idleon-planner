(function(root){'use strict';
const num=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const positive=v=>{const n=num(v);return n!==null&&n>=0?n:null;};
function savedTraps(raw){
 const data=raw.data||raw,rows=[],owners=[];let unknown=0;
 for(const key of Object.keys(data).filter(k=>/^PldTraps_\d+$/.test(k))){
  const owner={id:Number(key.split('_')[1]),available:true,empty:0,invalid:0};owners.push(owner);
  let traps;try{traps=typeof data[key]==='string'?JSON.parse(data[key]):data[key];}catch{unknown++;owner.available=false;owner.invalid++;continue;}
  if(!Array.isArray(traps)){unknown++;owner.available=false;owner.invalid++;continue;}
  for(const [index,t] of traps.entries()){
   if(!Array.isArray(t)){unknown++;owner.invalid++;continue;}
   if(Number(t[0])===-1){owner.empty++;continue;}
   if(!t[3]||t[3]==='Blank'){unknown++;owner.invalid++;continue;}
   const chance=positive(t[8]),duration=positive(t[6]),elapsed=positive(t[2]);
   const remaining=duration>0&&elapsed!==null?Math.max(0,duration-elapsed):null;
   rows.push({owner:owner.id,slot:index+1,critter:t[3],snapshot:chance,duration,elapsed,remaining,ready:remaining===null?null:remaining===0,quantity:positive(t[4]),xp:positive(t[7]),tier:positive(t[5]),map:num(t[0])});
   if(chance===null)unknown++;
  }
 }
 return {rows,unknown,owners};
}
function evaluate(snapshot,collector,duration,visits){
 if(!Number.isFinite(snapshot)||snapshot<0||!(duration>0)||!(visits>0))return null;
 if(!collector||!(collector.divisor>0)||!Number.isFinite(collector.open)||!Number.isFinite(collector.bundle))return null;
 const rawChance=snapshot*collector.open/collector.divisor,chance=Math.min(100,Math.max(0,rawChance));
 const cycle=Math.max(1,Math.ceil(duration/(86400/visits)-1e-10))*(86400/visits);
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
 const collector=data.roster.find(c=>String(c.id)===String(settings.collector))||data.roster[0];
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
function overview(data,catalog,settings={}){
 const collector=data.roster.find(c=>String(c.id)===String(settings.collector))||data.roster[0];
 const visits=Number(settings.visits)||3;
 const rows=data.saved.rows.map(t=>({...t,info:catalog.critters.find(c=>c.critterName===t.critter),result:t.snapshot===null?null:evaluate(t.snapshot,collector?.current,t.duration,visits)}));
 const ids=[...new Set([...data.roster.map(c=>c.id),...(data.saved.owners||[]).map(c=>c.id)])].sort((a,b)=>a-b);
 const roster=ids.map(id=>{
  const ch=data.roster.find(c=>c.id===id)||{id,name:`Character ${id+1}`,slots:null};
  const saved=data.saved.owners?.find(c=>c.id===id),traps=rows.filter(t=>t.owner===id);
  return {...ch,traps,available:!!saved?.available,invalid:saved?.invalid||0,empty:saved?.empty??null,free:saved?.available&&!saved.invalid&&ch.slots!==null?Math.max(0,ch.slots-traps.length):null};
 });
 const totals=catalog.critters.map(c=>{
  const traps=rows.filter(t=>t.critter===c.critterName),stock=data.stock?.[c.critterName]||{storage:0,inventory:0},shinyStock=data.stock?.[c.critterName+'A']||{storage:0,inventory:0};
  return {...c,count:traps.length,ready:traps.filter(t=>t.ready===true).length,savedCatch:traps.reduce((s,t)=>s+(t.quantity??0),0),unknownCatch:traps.filter(t=>t.quantity===null).length,daily:traps.reduce((s,t)=>s+(t.result?.daily||0),0),unknownYield:traps.filter(t=>!t.result).length,stock,shinyStock};
 });
 const filtered=roster.filter(c=>!settings.accountCharacter||settings.accountCharacter==='all'||String(c.id)===String(settings.accountCharacter)).map(c=>({...c,visible:c.traps.filter(t=>(!settings.accountCritter||settings.accountCritter==='all'||t.critter===settings.accountCritter)&&(!settings.status||settings.status==='all'||(settings.status==='ready'?t.ready===true:settings.status==='waiting'?t.ready===false:t.ready===null)))}));
 return {collector,roster:filtered,totals,placed:rows.length,ready:rows.filter(t=>t.ready===true).length,unknownTimers:rows.filter(t=>t.ready===null).length,free:roster.reduce((s,c)=>s+(c.free||0),0),missingOwners:roster.filter(c=>!c.available).length,daily:rows.reduce((s,t)=>s+(t.result?.daily||0),0),unknownYield:rows.filter(t=>!t.result).length};
}
root.ShinyOptimizerModel={savedTraps,evaluate,compare,overview};
})(typeof window==='undefined'?globalThis:window);
