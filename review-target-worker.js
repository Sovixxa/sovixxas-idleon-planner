'use strict';
self.window=self;self.localStorage={getItem:()=>null};
importScripts('connected-trace-runtime.js','connected-trace-engine.js','connected-primary-stats.js','combat-stat-model.js','stat-todo-model.js','world6-data.js','summoning-optimizer.js','fountain-data.js','fountain-optimizer.js','drop-target-sources.js','account-review.js','review-target-metrics.js','review-target-sources.js','review-target-model.js');
let session,route;
function advanceRoute(id,results){const next=route.next(results);if(next.done){route=null;postMessage({id,result:next.value});}else postMessage({id,routeBatch:next.value});}
self.onmessage=({data:q})=>{
 try{
  if(q.action==='routeResults'){if(!route)throw Error('No active combined route.');advanceRoute(q.id,q.results);return;}
  if(q.raw)session=ReviewTargetModel.session(q.raw);
  if(!session)throw Error('Reload the calculator with your current export.');
  if(q.action==='init'){postMessage({id:q.id,result:{characters:session.characters}});return;}
  const progress=p=>postMessage({id:q.id,progress:p});
  if(q.action==='prepareFull'){postMessage({id:q.id,result:session.prepareFull(q.character,q.metric,q.target,q.settings)});return;}
  if(q.action==='finishFull'){
   session.acceptFull(q.context,q.comparisons);
   if(q.workers>1){route=session.fullRoute(q.character,q.metric,q.target,q.settings,progress,q.workers);advanceRoute(q.id);return;}
   q.action='plan';q.mode='full';
  }
  const result=q.action==='plan'&&q.mode!=='full'?session.quickPlan(q.character,q.metric,q.target,q.settings,progress):q.character==='all'?session.accountWide(q.action,q.metric,q.target,q.settings,progress):q.action==='plan'?session.plan(q.character,q.metric,q.target,q.settings,progress):session.describe(q.character,q.metric,q.settings);
  postMessage({id:q.id,result});
 }catch(e){route=null;postMessage({id:q.id,error:e.message});}
};
