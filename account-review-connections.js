(function(root){
'use strict';
const read=v=>typeof v==='string'?JSON.parse(v):v,clean=v=>String(v??'').replaceAll('_',' ');
function build(raw,parsed){
 const d=read(raw.data)||raw,a=parsed.account,M=root.PrayerMath,fmt=root.AccountReviewActions.formatNumber,out=[];
 const add=(id,page,system,name,effect,before,after,reason,facts,blocker)=>out.push({id,sectionId:page,page,system,name,sourceName:name,effect,current:before,target:after,changeLabel:'modeled result',state:'Do now',ready:true,score:96,reason,facts,benefit:`${fmt(before)} → ${fmt(after)}`,blocker,upgradeGain:{before,after,delta:after-before,unit:'',scope:effect}});
 if(d.Research){const r=read(d.Research),evaluate=x=>M.getResearchPlanningState(x,a,parsed.characters),state=evaluate(r);
  if(state.gridPTSavailable>=1){const result=root.ResearchOptimizerModel.gridPlan(r,evaluate,{budget:1,goal:'exp'}),step=result.plan[0];if(step&&result.after>result.before)add('research-grid|'+step.id,'research','Research',`Spend 1 grid point on ${clean(step.name)} (${root.ResearchOptimizerModel.coord(step.id)})`,'Research EXP per hour',result.before,result.after,'The existing Research optimizer found an immediately reachable one-point improvement.',[{label:'Available grid points',text:fmt(state.gridPTSavailable)},{label:'Upgrade',text:`Lv ${step.from} → ${step.to}`}],'Research EXP is separate from character EXP. Re-run the Research optimizer after spending.');}
 }
 if(a.farming?.availablePoints>0){const steps=M.getOptimizedLandRankUpgrades(a,1,{onlyAffordable:true,goal:'evolution'}),s=steps[0];if(s)add('land-rank|'+s.index,'farming','Land ranks',`Spend 1 land-rank point on ${clean(s.name)}`,'Crop evolution',s.bonusBefore,s.bonusAfter,'The existing land-rank optimizer chose this next point for crop evolution.',[{label:'Unspent points',text:fmt(a.farming.availablePoints)},{label:'Upgrade',text:`Lv ${s.level} → ${s.newLevel}`}],'Ranked for crop evolution; choose a different objective on Farming if that is not your current priority.');}
 if(d.PrayersUnlocked||d.PrayOwned){const ctx=root.PrayerModel.context(raw);for(const ch of ctx.characters){if(ch.missing.length||!/fighting/i.test(ch.afkType))continue;
  const ids=ch.activePrayers.map(p=>p.prayerIndex),before=root.PrayerModel.evaluate(ctx,ch.playerId,ids);let best=null;
  for(const prayer of ctx.prayers){const active=ids.includes(prayer.prayerIndex);if(!active&&(ctx.slots.total===null||ids.length>=ctx.slots.total))continue;
   const next=active?ids.filter(id=>id!==prayer.prayerIndex):[...ids,prayer.prayerIndex],after=root.PrayerModel.evaluate(ctx,ch.playerId,next);
   if(Number.isFinite(after.kills)&&after.kills>before.kills&&(!best||after.kills>best.after.kills))best={prayer,active,after};
  }
  if(best)add('prayer-swap|'+ch.playerId,'prayerOptimizer','Prayers',`${best.active?'Remove':'Equip'} ${clean(best.prayer.name)} on ${ch.name}`,'AFK kills per hour',before.kills,best.after.kills,`A one-prayer comparison improves modeled kills on ${clean(ch.currentMap)} with the saved setup.`,[{label:'Character',text:ch.name},{label:'Damage before / after',text:`${fmt(before.damage)} / ${fmt(best.after.damage)}`},{label:'Survival before / after',text:`${fmt(before.stats.survival)}% / ${fmt(best.after.stats.survival)}%`}],'This optimizes combat AFK kills only. Prayer curses can reduce EXP, capacity or other stats; the Prayer Optimizer shows those tradeoffs.');
 }}
 if(Object.keys(d).some(k=>/^PldTraps_/.test(k))){const data=M.getShinyLoadoutData(parsed),saved=root.ShinyOptimizerModel.savedTraps({...raw,data:d});
  const ready=saved.rows.filter(t=>t.ready&&t.snapshot!==null);if(ready.length&&data.candidates.length){
   const best=data.candidates.filter(c=>!c.food).map(c=>({c,value:ready.reduce((n,t)=>n+(root.ShinyOptimizerModel.evaluate(t.snapshot,c,t.duration,1)?.expected||0),0)})).sort((x,y)=>y.value-x.value)[0];
   if(best?.value>0)out.push({id:'shiny-collection|ready',sectionId:'trapping',page:'trapping',system:'Shiny trapping',name:`Collect ${ready.length} ready traps with ${best.c.name}'s shiny setup`,sourceName:best.c.name,effect:'Shiny critter collection',state:'Do now',ready:true,score:110,reason:'The shiny calculator compared collection setups against the actual saved trap chances.',facts:[{label:'Expected shinies',text:fmt(best.value)+' per collection (random outcome)'},{label:'Setup',text:(best.c.actions||[]).join('; ')}],benefit:`About ${fmt(best.value)} expected shinies across these ready traps.`,blocker:'Use the listed collection setup. This is an expected value, not a guaranteed drop or a new trap-placement estimate.'});
  }
 }
 if(d.PetsStored&&d.Pets&&d.Breeding){
  const groups=root.ProgressionModels.build(root.BeanValueEngine.systems(raw),raw).shinyPets||[],queue=root.ShinyPlanner.plan(groups),stored=read(d.PetsStored),fence=a.breeding?.rawFencePets||[];
  const owned=new Set((stored||[]).filter(p=>p[1]===5).map(p=>p[0]));
  const target=queue.pets.find(p=>p.ready&&owned.has(p.id)&&!(a.breeding.fencePetsObject?.[p.id]?.shiny>0));
  const free=fence.some(p=>!p[0]||['Blank','none','_'].includes(p[0])),finished=fence.find(p=>p[1]===5&&(a.breeding.pets.flat().find(x=>x.monsterRawName===p[0])?.shinyLevel>=20));
  if(target&&(free||finished))out.push({id:'shiny-pet|'+target.id,sectionId:'shinyPets',page:'shinyPets',system:'Shiny pets',sourceName:target.id,name:`${free?'Place':'Swap a completed shiny for'} ${clean(target.id)} in the Fenceyard`,effect:target.perLevel,state:'Do now',ready:true,score:97,reason:'The existing shiny-pet planner selected this milestone, and a shiny copy is present in pet storage.',facts:[{label:'Current / target',text:`Lv ${target.level} / ${target.target}`},{label:'Fence slot',text:free?'Saved empty slot':`Replace completed ${clean(finished[0])}`},{label:'Per level',text:target.perLevel}],benefit:target.bonus,blocker:'This is the existing tier-based shiny progression plan, not a measured gain-per-hour optimum. Active Wind Walker kills can change leveling time.'});
 }
 return out;
}
root.ReviewConnections={build};
})(globalThis);
