'use strict';
importScripts('prayer-math-engine.js','research-optimizer-model.js');
let parsed,researchRaw,saveData,metadata;
const parseResearch=r=>{const save=structuredClone(saveData);save.Research=r;return PrayerMath.parseData(save,metadata.charNames,metadata.companion,metadata.guildData,metadata.serverVars||{},metadata.accountCreateTime,metadata.tournament);};
onmessage=({data})=>{try{
 if(data.raw){const raw=structuredClone(data.raw),decode=v=>typeof v==='string'?JSON.parse(v):v,save=decode(raw.data)||raw;if(!save.Research)throw Error('Load a full account export containing Research.');parsed=PrayerMath.parseData(save,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);researchRaw=decode(save.Research);saveData=structuredClone(save);metadata=raw;}
 const evaluate=r=>PrayerMath.getResearchPlanningState(r,parsed.account,parsed.characters),state=evaluate(researchRaw);
 if(data.action==='shapes'){
  if(!globalThis.ResearchShapesModel){globalThis.window=globalThis;importScripts('world7-data.js','research-shapes-model.js');}
  const sources=r=>r.researchEXPmultiBreakdown.categories.flatMap(x=>x.sources),value=(r,name)=>Number(sources(r).find(x=>x.name===name)?.value)||0;
  state.shapeRateExtras={stickerAddSlope:0,stickerMultiSlope:0};
  if(state.gridSquares[68]?.level>0){
   const variant=structuredClone(researchRaw);variant[1][68]=variant[1][68]===0?-1:0;
   const other=parseResearch(variant),sample=PrayerMath.getResearchPlanningState(variant,other.account,other.characters),diff=sample.gridSquares[68].bonus-state.gridSquares[68].bonus;
   if(diff){state.shapeRateExtras.stickerAddSlope=(value(sample,'Sticker')-value(state,'Sticker'))/diff;state.shapeRateExtras.stickerMultiSlope=(value(sample,'Sticker multiplier')-value(state,'Sticker multiplier'))/diff;}
  }
  const result=ResearchShapesModel.plan(state,researchRaw,WORLD7_CATALOG.Research,data.config,message=>postMessage({id:data.id,progress:message}));
  const candidate=structuredClone(researchRaw);candidate[1]=result.owners;result.layout.forEach((p,i)=>{candidate[6][4*i]=p.x;candidate[6][4*i+1]=p.y;candidate[6][4*i+2]=p.angle;});
  const candidateAccount=parseResearch(candidate),checked=PrayerMath.getResearchPlanningState(candidate,candidateAccount.account,candidateAccount.characters),insight=r=>r.observations.filter(o=>o.found&&o.unlocked).reduce((s,o)=>s+o.realInsightExpRate/Math.max(1,o.insightExpREQ),0);
  const close=(a,b)=>Math.abs(a-b)<=1e-7*Math.max(1,Math.abs(a),Math.abs(b));
  if(!close(result.before.exp,state.researchEXPrateTOT)||!close(result.after.exp,checked.researchEXPrateTOT)||!close(result.before.insight,insight(state))||!close(result.after.insight,insight(checked)))throw Error('The shape estimate did not match the full Research calculation. No unverified layout will be shown.');
  result.before={exp:state.researchEXPrateTOT,insight:insight(state)};result.after={exp:checked.researchEXPrateTOT,insight:insight(checked)};
  result.rateExtras=state.shapeRateExtras;
  postMessage({id:data.id,result});
 }
 else if(data.action==='grid'){const result=ResearchOptimizerModel.gridPlan(researchRaw,evaluate,data.config);delete result.raw;delete result.state;postMessage({id:data.id,result});}
 else if(data.action==='lenses')postMessage({id:data.id,result:ResearchOptimizerModel.lensPlan(state,researchRaw,data.config)});
 else postMessage({id:data.id,result:state});
}catch(e){postMessage({id:data.id,error:e.message});}};
