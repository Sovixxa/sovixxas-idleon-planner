'use strict';
importScripts('prayer-math-engine.js','research-optimizer-model.js');
let parsed,researchRaw;
onmessage=({data})=>{try{
 if(data.raw){const raw=structuredClone(data.raw),decode=v=>typeof v==='string'?JSON.parse(v):v,save=decode(raw.data)||raw;if(!save.Research)throw Error('Load a full account export containing Research.');parsed=PrayerMath.parseData(save,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);researchRaw=decode(save.Research);}
 const evaluate=r=>PrayerMath.getResearchPlanningState(r,parsed.account,parsed.characters),state=evaluate(researchRaw);
 if(data.action==='grid'){const result=ResearchOptimizerModel.gridPlan(researchRaw,evaluate,data.config);delete result.raw;delete result.state;postMessage({id:data.id,result});}
 else if(data.action==='lenses')postMessage({id:data.id,result:ResearchOptimizerModel.lensPlan(state,researchRaw,data.config)});
 else postMessage({id:data.id,result:state});
}catch(e){postMessage({id:data.id,error:e.message});}};
