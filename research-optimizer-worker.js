'use strict';

importScripts('prayer-math-engine.js','research-optimizer-model.js');

let parsed,researchRaw,saveData,metadata;

const parseResearch=r=>{const save=structuredClone(saveData);save.Research=r;return PrayerMath.parseData(save,metadata.charNames,metadata.companion,metadata.guildData,metadata.serverVars||{},metadata.accountCreateTime,metadata.tournament);};

onmessage=({data})=>{try{

 if(data.raw){const raw=structuredClone(data.raw),decode=v=>typeof v==='string'?JSON.parse(v):v,save=decode(raw.data)||raw;if(!save.Research)throw Error('Load a full account export containing Research.');parsed=PrayerMath.parseData(save,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);researchRaw=decode(save.Research);saveData=structuredClone(save);metadata=raw;}

 const evaluate=r=>PrayerMath.getResearchPlanningState(r,parsed.account,parsed.characters),state=evaluate(researchRaw);

 if(data.action==='shapes')postMessage({id:data.id,result:shapePlan(researchRaw,data.config,message=>postMessage({id:data.id,progress:message}))});

 else if(data.action==='notes'){

  if(!globalThis.ResearchNotesModel)importScripts('research-notes-model.js');

  const progress=message=>postMessage({id:data.id,progress:message}),config=data.config||{},goal=config.goal==='exp'?'exp':'insight';

  const observation=Number.isInteger(config.observation)?config.observation:null;

  if(observation!==null&&!state.observations.some(o=>o.index===observation&&ResearchNotesModel.canLevel(state,o)))throw Error('Choose a found observation with Insight leveling unlocked.');

  const lensConfig={goal,...(observation!==null?{observation}: {})},notesModel=ResearchNotesModel;

  let current=researchRaw,currentState=state,best=null;

  for(let pass=0;pass<2;pass++){

   progress(`Optimizing lenses and shapes (${pass+1}/2)…`);

   const lens=ResearchOptimizerModel.lensPlan(currentState,current,lensConfig);

   // Always plan shape moves from the imported layout, with the candidate lenses.

   const withLenses=notesModel.applyLenses(researchRaw,lens.assignments),shapes=shapePlan(withLenses,{goal,...(observation!==null?{observation}:{})},progress);

   const proposed=structuredClone(withLenses);proposed[1]=shapes.owners;shapes.layout.forEach((p,i)=>{proposed[6][4*i]=p.x;proposed[6][4*i+1]=p.y;proposed[6][4*i+2]=p.angle;});

   const account=parseResearch(proposed),checked=PrayerMath.getResearchPlanningState(proposed,account.account,account.characters),rates=ResearchOptimizerModel.lensRates(checked,lens.assignments);

   const value=observation!==null?(rates.per.find(o=>o.id===observation)?.insight||0):rates[goal];

   if(!best||value>best.value*(1+1e-10))best={value,lens,shapes,state:checked,raw:proposed,rates};

   current=proposed;currentState=checked;

  }

  // Give every observation its own focused cost, rather than showing only the
  // few observations receiving monocles in the shared layout. Equal adjacent
  // kaleidoscope counts have the same shape objective for Insight.
  const focusEstimates={},shapeCache=new Map();state.shapeRateExtras=best.shapes.rateExtras;
  const definitions=ResearchShapesModel.definitions(WORLD7_CATALOG.Research);
  for(const o of state.observations.filter(o=>notesModel.canLevel(state,o))){
   progress(`Estimating Notes for ${Math.floor(o.index/8)+1}:${o.index%8+1}…`);
   const lenses=ResearchOptimizerModel.lensPlan(state,researchRaw,{goal:'insight',observation:o.index}),withLenses=notesModel.applyLenses(researchRaw,lenses.assignments);
   const counts=Array.from({length:80},()=>[0,0,0]);for(const a of lenses.assignments)if(a.obs>=0)counts[a.obs][a.type]++;
   const adjacent=ResearchOptimizerModel.neighbors(o.index,8,80).reduce((s,i)=>s+counts[i][2],0),key=`${counts[o.index][1]}:${adjacent}`;
   let shapes=shapeCache.get(key);if(!shapes){shapes=ResearchShapesModel.plan(state,withLenses,WORLD7_CATALOG.Research,{goal:'insight',observation:o.index});shapeCache.set(key,shapes);}
   const rate=ResearchShapesModel.rates(state,withLenses,definitions,o.index)(shapes.owners).target;
   focusEstimates[o.index]={...notesModel.timing({...o,canLevelUp:notesModel.canLevel(state,o)},rate),rate};
  }
  const originalAssignments=Array.from({length:state.magnifiersOwned},(_,i)=>({type:Number(researchRaw[5]?.[4*i+3])||0,obs:Number(researchRaw[5]?.[4*i+2]??-1)}));

  postMessage({id:data.id,result:{goal,observation,noteHours:notesModel.NOTE_HOURS,assignments:best.lens.assignments,cap:best.state.magnifiersPerSlot,unplaced:best.lens.unplaced,focusEstimates,shapes:best.shapes,rows:notesModel.rows(best.state,best.lens.assignments,ResearchOptimizerModel),before:ResearchOptimizerModel.lensRates(state,originalAssignments),after:best.rates}});

 }

 else if(data.action==='grid'){const result=ResearchOptimizerModel.gridPlan(researchRaw,evaluate,data.config);delete result.raw;delete result.state;postMessage({id:data.id,result});}

 else if(data.action==='lenses')postMessage({id:data.id,result:ResearchOptimizerModel.lensPlan(state,researchRaw,data.config)});

 else postMessage({id:data.id,result:state});

}catch(e){postMessage({id:data.id,error:e.message});}};



function shapePlan(baseRaw,config,progress){const account=parseResearch(baseRaw),state=PrayerMath.getResearchPlanningState(baseRaw,account.account,account.characters);

  if(!globalThis.ResearchShapesModel){globalThis.window=globalThis;importScripts('world7-data.js','research-shapes-model.js');}

  const sources=r=>r.researchEXPmultiBreakdown.categories.flatMap(x=>x.sources),value=(r,name)=>Number(sources(r).find(x=>x.name===name)?.value)||0;

  state.shapeRateExtras={stickerAddSlope:0,stickerMultiSlope:0};

  if(state.gridSquares[68]?.level>0){

   const variant=structuredClone(baseRaw);variant[1][68]=variant[1][68]===0?-1:0;

   const other=parseResearch(variant),sample=PrayerMath.getResearchPlanningState(variant,other.account,other.characters),diff=sample.gridSquares[68].bonus-state.gridSquares[68].bonus;

   if(diff){state.shapeRateExtras.stickerAddSlope=(value(sample,'Sticker')-value(state,'Sticker'))/diff;state.shapeRateExtras.stickerMultiSlope=(value(sample,'Sticker multiplier')-value(state,'Sticker multiplier'))/diff;}

  }

  const result=ResearchShapesModel.plan(state,baseRaw,WORLD7_CATALOG.Research,config,progress);

  const candidate=structuredClone(baseRaw);candidate[1]=result.owners;result.layout.forEach((p,i)=>{candidate[6][4*i]=p.x;candidate[6][4*i+1]=p.y;candidate[6][4*i+2]=p.angle;});

  const candidateAccount=parseResearch(candidate),checked=PrayerMath.getResearchPlanningState(candidate,candidateAccount.account,candidateAccount.characters),insight=r=>r.observations.filter(o=>o.found&&o.unlocked).reduce((s,o)=>s+o.realInsightExpRate/Math.max(1,o.insightExpREQ),0);

  const close=(a,b)=>Math.abs(a-b)<=1e-7*Math.max(1,Math.abs(a),Math.abs(b));

  if(!close(result.before.exp,state.researchEXPrateTOT)||!close(result.after.exp,checked.researchEXPrateTOT)||!close(result.before.insight,insight(state))||!close(result.after.insight,insight(checked)))throw Error('The shape estimate did not match the full Research calculation. No unverified layout will be shown.');

  result.before={exp:state.researchEXPrateTOT,insight:insight(state)};result.after={exp:checked.researchEXPrateTOT,insight:insight(checked)};

  result.rateExtras=state.shapeRateExtras;

  return result;

}
