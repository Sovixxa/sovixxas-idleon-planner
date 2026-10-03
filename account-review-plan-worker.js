'use strict';
importScripts('account-review-worker.js','account-review-impact-worker.js','account-review-budget.js');
self.onmessage=async({data:q})=>{
 try{
  const raw=q.raw,warnings=[];
  const parse=save=>{const errors=[],original=console.error;let result;try{console.error=(...x)=>errors.push(String(x[0]));result=PrayerMath.parseData(structuredClone(save),raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);}finally{console.error=original;}if(errors.length)throw Error('Incomplete account decode');return result;};
  const engine={parse,apply:(s,p,a)=>ReviewSimulation.apply(s,p,a,false),metric:(p,s)=>{const copy={...p,characters:p.characters.map(c=>({...c,stats:{...c.stats}}))};ReviewSimulation.primary(copy);return ReviewSimulation.metric(copy,q.character,q.goal,s);},actions:(s,p)=>{
   const wrapper={...raw,data:s,__planning:true},e=AccountReviewActions.build(wrapper,p);
   return AccountReview.rankForGoal({priorities:e.actions},q.goal,{readyOnly:false}).actions;
  },warn:(id,error)=>{if(!warnings.some(w=>w.id===id))warnings.push({id,error});}};
  const result=await ReviewBudget.plan(raw,q,engine,p=>postMessage({progress:p}));postMessage({result:{...result,warnings}});
 }catch(error){postMessage({error:error.message});}
};
