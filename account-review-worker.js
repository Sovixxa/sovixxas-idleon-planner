 'use strict';
self.window=self;
self.localStorage={getItem:()=>null};
importScripts('beanstalk-engine.js','decoder-cache.js','stamps-data.js','alchemy-data.js','construction-data.js','world4-data.js','armor-sets.js','quests.js','quests-v2.js','quests-v3.js','quests-v5.js','account-review.js','prayer-math-engine.js','stamp-calculator-data.js','stamp-optimizer-model.js','bubble-optimizer-context.js','bubble-optimizer.js','cooking.js','refinery-planner-model.js','account-review-actions.js','world6-data.js','summoning-optimizer.js','fountain-data.js','fountain-optimizer.js','account-review-extra-actions.js','review-vial-ids.js','account-review-permanent.js','research-optimizer-model.js','account-review-connections.js','prayer-model.js','shiny-optimizer-model.js','account-review-diagnostics.js','progression-models.js','shiny-planner.js');
self.onmessage=event=>{
 try{
  const raw=event.data,data=typeof raw.data==='string'?JSON.parse(raw.data):raw.data||raw;
  let evidence={actions:[],coverage:[]};
  if(Object.keys(data).some(key=>/^Lv0_\d+$/.test(key))){
   const errors=[],original=console.error;let parsed;
   try{console.error=(...args)=>errors.push(String(args[0]));parsed=PrayerMath.parseData(structuredClone(data),raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);}catch(error){errors.push(error.message);}finally{console.error=original;}
   if(parsed&&!errors.length){evidence=AccountReviewActions.build(raw,parsed);evidence.diagnostics=ReviewDiagnostics.analyze(parsed,evidence.actions);}
   else evidence.coverage=[{system:'Upgrade calculators',status:'unavailable',reason:'Complete character and account data could not be decoded. Import a fresh full export.'}];
  }else evidence.coverage=[{system:'Upgrade calculators',status:'unavailable',reason:'Character data is missing; prices and balances have not been verified.'}];
  self.postMessage({report:self.AccountReview.model(raw,self,evidence)});
 }catch(error){self.postMessage({error:error?.message||String(error)});}
};
