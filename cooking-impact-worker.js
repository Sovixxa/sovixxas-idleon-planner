/* Full-account mastery previews. Runs off the UI thread; never edits the imported save. */
'use strict';
self.window=self;
importScripts('prayer-math-engine.js','cooking-impact-model.js');
let raw,baseSave,baseline,scenarioKey,cache=new Map();
const read=v=>typeof v==='string'?JSON.parse(v):v;
function parse(save){return PrayerMath.parseData(structuredClone(save),raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);}
function setup(input,scenario){
 raw=input; baseSave=structuredClone(raw.data||raw);baseline=parse(baseSave);
 if(scenario==='secondary'){
  for(const c of baseline.characters){const active=c.flatTalents.find(t=>t.name==='BLOOD_MARROW'),other=read(baseSave['SLpre_'+c.playerId]);if(!active||!other||!(Number(other[59])>active.baseLevel))continue;const stuff=read(baseSave['PlayerStuff_'+c.playerId]);baseSave['SLpre_'+c.playerId]=read(baseSave['SL_'+c.playerId]);baseSave['SL_'+c.playerId]=other;stuff[1]=c.selectedTalentPreset===0?1:0;baseSave['PlayerStuff_'+c.playerId]=stuff;}
  baseline=parse(baseSave);
 }
 scenarioKey=scenario;cache.clear();
}
function calculate(points){
 const key=JSON.stringify(points);if(cache.has(key))return cache.get(key);
 const save=structuredClone(baseSave),cm=read(save.CookMaster);
 if(!Array.isArray(cm?.[0]))throw Error('Mastery allocation is missing.');
 for(const [id,p] of Object.entries(points)){if(!Number.isInteger(p)||p<0||p>2000)throw Error('Invalid mastery points.');cm[0][Number(id)]=p;}
 save.CookMaster=cm;const data=parse(save);cache.set(key,data);if(cache.size>10)cache.delete(cache.keys().next().value);return data;
}
self.onmessage=event=>{
 const q=event.data;
 try{
  if(q.raw||scenarioKey!==q.scenario)setup(q.raw||raw,q.scenario);
  const test=calculate(q.points),impacts={};
  for(const id of q.ids){
   const node=baseline.account.cooking.meals[id];if(!node)continue;
   try{
    const p=q.points[id]??node.cookingMasteryNode.level;
    const before=CookingImpactModel.metric(baseline,q.character,node.stat,baseSave),after=CookingImpactModel.metric(test,q.character,node.stat,baseSave);
    const next=p<2000?CookingImpactModel.metric(calculate({...q.points,[id]:p+1}),q.character,node.stat,baseSave):null;
    impacts[id]=CookingImpactModel.compare(before,after,next);
   }catch(error){impacts[id]={unavailable:true,reason:error.message};}
  }
  self.postMessage({key:q.key,impacts});
 }catch(error){self.postMessage({key:q.key,error:error.message});}
};
