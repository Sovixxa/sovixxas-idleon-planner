// Each helper keeps one imported baseline and discards every parsed scenario.
importScripts('review-target-worker.js');
let comparisonSession,comparisonContext;
self.onmessage=({data:q})=>{
 try{
  if(q.init){comparisonSession=ReviewTargetModel.session(q.raw);comparisonContext=q.context;postMessage({ready:true});return;}
  if(!comparisonSession)throw Error('Comparison worker is not initialized.');
  if(q.route){postMessage({index:q.index,result:comparisonSession.routeCandidate(q.route,q.candidate)});return;}
  postMessage({index:q.index,result:comparisonSession.compareCandidate(comparisonContext,q.candidate)});
 }catch(e){postMessage({error:e.message});}
};
