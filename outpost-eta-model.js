(function(root){'use strict';
// A transparent wave model, not the AFK kills/hr formula. Clear-time scenarios
// absorb geometry, pathfinding, cast rotation and disciple placement.
function estimate(row,character,seconds=10,di=character?.hasDI,horizon=null){
 const sourceMap=character?.maps?.find(m=>m.id===row.id);
 const map=sourceMap?{...sourceMap,...(di?sourceMap.di:sourceMap.normal)}:null,militia=character?row.militia*character.militiaPerHour:null;
 if(row.built||row.remaining===0)return {eta:0,fast:0,slow:0,creditPerHour:0,activeKills:0,militia};
 if(row.locked||row.remaining==null||!character)return {eta:null,fast:null,slow:null,creditPerHour:null,activeKills:null,militia};
 let activeKills=0,fastKills=0,slowKills=0,wait=null,extra=0,hits=null,crystalKills=0,guaranteed=0,solve=null;
 if(map?.supported&&[map.respawn,map.damage,map.skillDamage,map.hitChance,map.hp,map.count].every(Number.isFinite)&&map.count>0&&map.respawn>0&&map.damage>0&&map.skillDamage>0&&map.hitChance>0){
  const clear=Math.max(.25,Math.min(300,Number(seconds)||10));
  // DI's client callback waits 2400ms after the screen-clear condition.
  wait=di?Math.min(map.respawn,2.4):map.respawn;
  extra=di?character.riChance*character.riMobs:0;
  hits=Math.max(1,Math.ceil(map.hp/map.damage))/map.hitChance;
  const bestHits=Math.max(1,Math.ceil(map.hp/map.skillDamage))/map.hitChance;
  const count=map.count+extra,crystal=map.crystal;
  const stats=crystal&&(di?crystal.di:crystal.normal);
  const chance=Math.max(0,Math.min(.1,crystal?.chance||0));
  const chain=Math.max(0,Math.min(.99,crystal?.chainChance||0));
  guaranteed=Math.max(0,crystal?.guaranteed||0);
  // Regal Intervention creates temporary monsters: they do not roll crystals.
  // Chocolatey chains are geometric; each physical death earns credit once.
  const phase=(p,scale,strong)=>{
   const normalHits=strong?bestHits:hits;
   const regalHits=Math.max(1,Math.ceil(2*map.hp/(strong?map.skillDamage:map.damage)))/map.hitChance;
   const baseCycle=clear*scale*(normalHits*map.count+regalHits*extra)/map.count+wait;
   // At most five base crystal seeds per second. Chain replacements are separate.
   const seeds=Math.min(map.count*p,5*baseCycle);
   const crystals=seeds/(1-chain);
   const crystalHits=crystals>0?(stats?.hitChance>0&&stats?.damage>0
    ?Math.max(1,Math.ceil(crystal.hp/(strong?stats.skillDamage:stats.damage)))/stats.hitChance:Infinity):0;
   const cycle=clear*scale*(normalHits*map.count+regalHits*extra+crystals*crystalHits)/map.count+wait;
   return {kills:3600*(count+crystals)/cycle,crystals:3600*crystals/cycle,natural:3600*map.count/cycle,seeds:3600*seeds/cycle};
  };
  solve=(scale,strong)=>{
   const regular=phase(chance,scale,strong),initial=guaranteed>0?phase(1,scale,strong):regular;
   const initialRate=initial.kills*character.creditPerKill+militia;
   const initialSeconds=guaranteed>0?(initial.seeds>0?3600*guaranteed/initial.seeds:Infinity):0;
   if(horizon!=null){const first=Math.min(horizon,initialSeconds),tail=horizon-first;
    return {time:horizon,kills:(initial.kills*first+regular.kills*tail)/horizon,crystals:(initial.crystals*first+regular.crystals*tail)/horizon};}
   // A stalled guaranteed-crystal phase cannot be skipped: no seeds are
   // being consumed to end it. Militia can still finish the outpost.
   if(initialSeconds===Infinity&&initialRate<=0)return {time:null,kills:0,crystals:0};
   const initialTime=initialRate>0?Math.min(initialSeconds,row.remaining/initialRate*3600):initialSeconds;
   const remaining=Math.max(0,row.remaining-initialTime*initialRate/3600);
   const regularRate=regular.kills*character.creditPerKill+militia;
   const tail=remaining>0?(regularRate>0?remaining/regularRate*3600:null):0;
   if(tail===null)return {time:null,kills:0,crystals:0};
   const time=initialTime+tail;
   return {time,kills:time>0?(initial.kills*initialTime+regular.kills*tail)/time:0,
    crystals:time>0?(initial.crystals*initialTime+regular.crystals*tail)/time:0};
  };
  const main=solve(1,false);activeKills=main.kills;crystalKills=main.crystals;
  fastKills=solve(.5,true).kills;slowKills=solve(2,false).kills;
 }
 const rate=(kills)=>kills*character.creditPerKill+militia;
 const time=(kills)=>rate(kills)>0?row.remaining/rate(kills)*3600:null;
 return {eta:solve?solve(1,false).time:time(activeKills),fast:solve?solve(.5,true).time:time(fastKills),slow:solve?solve(2,false).time:time(slowKills),creditPerHour:rate(activeKills),activeKills,crystalKills,guaranteed,militia,wait,extra,hits,map,seconds,di,supported:!!map?.supported};
}
// An Orb counter is weighted: crystals use Embiggener, Regal mobs add
// extra counts. A sample only applies to its own character and map.
function calibrateOrb(row,character,prediction,sample,project=true){
 if(!sample?.enabled||sample.character!==character?.index||sample.map!==row.id||row.built||row.locked||row.remaining==null||!character?.orb?.learned)return null;
 const count=Number(sample.count),seconds=Number(sample.seconds);
 if(sample.count===''||sample.seconds===''||![count,seconds].every(Number.isFinite)||count<0||seconds<=0)return null;
 // Counter conversion uses the observation window, never the completion horizon.
 const windowPrediction=prediction.seconds!=null?estimate({...row,remaining:1},character,prediction.seconds,prediction.di,seconds):prediction;
 const embiggener=Math.max(1,(prediction.map?.crystal?.rawChance||0)/.1);
 const fraction=windowPrediction.activeKills>0?Math.min(1,Math.max(0,windowPrediction.crystalKills/windowPrediction.activeKills)):0;
 const extra=character.orb.regalExtra||1;
 // RI adds known modeled Regal spawns. Guardian coverage depends on placement,
 // which saves do not record: bound it rather than invent a 50% share.
 // Guardian marking is inside the non-temporary respawn handler. Crystals
 // and their Chocolatey replacements cannot also receive that Regal bonus.
 const natural=prediction.map?.count||0,spawned=Math.max(0,prediction.extra||0);
 const regalMin=natural+spawned>0?(1-fraction)*spawned/(natural+spawned):0;
 const regalMax=character.guardianEquipped&&character.guardianDuration>0?1-fraction:regalMin;
 const baseWeight=1+fraction*(embiggener-1);
 const minWeight=baseWeight+regalMin*extra,maxWeight=baseWeight+regalMax*extra;
 const multiplier=maxWeight;
 const countsPerHour=count/seconds*3600,activeKills=countsPerHour/multiplier;
 const militia=row.militia*character.militiaPerHour,rate=activeKills*character.creditPerKill+militia;
 const eta=rate>0?row.remaining/rate*3600:null;
 // Range isolates unknown Guardian placement; crystal share remains modeled.
 const time=(weight)=>{const rate=countsPerHour/weight*character.creditPerKill+militia;return rate>0?row.remaining/rate*3600:null;};
 let projected={eta,fast:time(minWeight),slow:time(maxWeight),creditPerHour:rate,activeKills};
 // A finite daily crystal boost must not be extrapolated for the whole outpost.
 if(project&&prediction.guaranteed>0&&count>0){
  const fitted=inferWaveTime(row,character,sample,prediction.di);
  // Reject this calibration when its temporary boost cannot be projected safely.
  // The caller retains the sample and displays the finite automatic estimate.
  if(!fitted)return null;
  if(fitted){const a=estimate(row,character,fitted.fast,prediction.di),b=estimate(row,character,fitted.slow,prediction.di);
   projected={eta:b.eta,fast:a.eta,slow:b.eta,creditPerHour:b.creditPerHour,activeKills:b.activeKills};}
 }
 return {...projected,militia,
  countsPerHour,optimisticFloor:time(1),multiplier,crystalFraction:fraction,embiggener,regalMin,regalMax,killsLow:countsPerHour/maxWeight,killsHigh:countsPerHour/minWeight};
}
// Solve against the Orb rate, independently of the manual wave-time default.
function inferWaveTime(row,character,sample,di=character?.hasDI){
 if(!(Number(sample?.count)>0))return null;
 const target=Number(sample.count)/Number(sample.seconds)*3600;
 const rate=(seconds,upper)=>{const p=estimate(row,character,seconds,di),cal=calibrateOrb(row,character,p,sample,false);
  if(!cal||!p.supported||!(p.activeKills>0))return null;
  const weight=upper?cal.multiplier:cal.countsPerHour/cal.killsHigh;
  return estimate({...row,remaining:1},character,seconds,di,Number(sample.seconds)).activeKills*weight;
 };
 const solve=upper=>{let lo=.25,hi=300;const highRate=rate(lo,upper),lowRate=rate(hi,upper);
  if(highRate==null||lowRate==null||target>highRate||target<lowRate)return null;
  for(let i=0;i<45;i++){const mid=(lo+hi)/2;if(rate(mid,upper)>target)lo=mid;else hi=mid;}
  return (lo+hi)/2;
 };
 const fast=solve(false),slow=solve(true);
 if(fast==null||slow==null)return null;
 return {fast,slow,seconds:(fast+slow)/2};
}
function customize(character,overrides={}){
 if(!character)return character;
 const c={...character};
 const keys=['warbound','armory','orblet','fish','jelly','militiaArmory','riChance','riMobs'];
 for(const key of keys){const v=overrides[key];if(typeof v==='number'&&Number.isFinite(v)&&v>=0)c[key]=key==='riChance'?Math.min(1,v):key==='riMobs'?Math.floor(v):v;}
 const multiplier=c.warbound*(1+(c.orblet+c.fish)/100)*(1+c.jelly/100);
 c.creditPerKill=c.armory>=1?(1+c.armory/100)*multiplier:0;
 c.militiaPerHour=4000*(1+c.militiaArmory/100)*multiplier;
 for(const key of ['creditPerKill','militiaPerHour']){const v=overrides[key];if(typeof v==='number'&&Number.isFinite(v)&&v>=0)c[key]=v;}
 c.customTotals={creditPerKill:Object.hasOwn(overrides,'creditPerKill'),militiaPerHour:Object.hasOwn(overrides,'militiaPerHour')};
 return c;
}
const api={estimate,calibrateOrb,inferWaveTime,customize};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.OutpostETAModel=api;
})(globalThis);
