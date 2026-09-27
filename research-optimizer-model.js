(function(root){'use strict';
const n=v=>Math.max(0,Number(v)||0),coord=id=>`${String.fromCharCode(65+Math.floor(id/20))}${id%20+1}`;
function neighbors(i,width,size){return [i%width?i-1:-1,i%width<width-1?i+1:-1,i-width,i+width].filter(j=>j>=0&&j<size);}
function pathTo(nodes,target){
 const paths=new Map(),queue=[];
 for(const node of nodes)if(node.name!=='Name'&&(node.level>0||node.canSelect)){paths.set(node.index,node.level>0?[]:[node.index]);queue.push(node.index);}
 // Existing nodes are all zero-cost roots. Unbought selectable nodes cost one point.
 queue.sort((a,b)=>paths.get(a).length-paths.get(b).length);
 for(let at=0;at<queue.length;at++){const i=queue[at];if(i===target)return nodes[i].level>0?[i]:paths.get(i);for(const j of neighbors(i,20,nodes.length)){if(nodes[j]?.name==='Name'||!nodes[j]||paths.has(j))continue;paths.set(j,[...paths.get(i),j]);queue.push(j);}}
 return null;
}
function gridPlan(initialRaw,evaluate,config={}){
 const raw=structuredClone(initialRaw),initial=evaluate(raw);let current=initial,spent=0,plan=[];
 const budget=Math.min(Math.max(0,Math.floor(n(initial.gridPTSavailable))),Math.floor(n(config.budget))),goal=config.goal||'balanced';
 const baseExp=Math.max(1,initial.researchEXPrateTOT),baseInsight=Math.max(1e-12,initial.observations.reduce((s,o)=>s+n(o.realInsightExpRate)/Math.max(1,o.insightExpREQ),0));
 const score=r=>{const exp=n(r.researchEXPrateTOT)/baseExp,insight=r.observations.reduce((s,o)=>s+n(o.realInsightExpRate)/Math.max(1,o.insightExpREQ),0)/baseInsight;return goal==='exp'?Math.log1p(exp):goal==='insight'?Math.log1p(insight):Math.log1p(exp)+Math.log1p(insight);};
 const remaining=r=>budget-spent+r.gridPTSearned-initial.gridPTSearned;
 const targets=[50,52,70,72,90,91,92,93,110,112,173];
 for(let iteration=0;iteration<240&&initial.canUpgradeGrid!==false&&remaining(current)>0;iteration++){
  let best=null;
  for(const target of goal==='target'?[Number(config.target)]:targets){const node=current.gridSquares[target];if(!node||node.name==='Name'||node.level>=node.maxLv)continue;const path=pathTo(current.gridSquares,target);if(!path?.length)continue;
   const candidate=structuredClone(raw);let result=current,steps=[],legal=true;
   for(const id of path){const x=result.gridSquares[id];if(!x.canSelect||x.level>=x.maxLv||budget-spent-steps.length+result.gridPTSearned-initial.gridPTSearned<1){legal=false;break;}candidate[0][id]=n(candidate[0][id])+1;steps.push({id,name:x.name,from:x.level,to:x.level+1});result=evaluate(candidate);}
   if(!legal)continue;const gain=(score(result)-score(current))/steps.length;
   if(goal==='target'||gain>1e-12&&(!best||gain>best.gain))best={candidate,result,steps,gain};
  }
  if(!best)break;raw[0]=best.candidate[0];current=best.result;spent+=best.steps.length;plan.push(...best.steps);if(goal==='target')break;
 }
 return {plan,spent,initialBudget:budget,earned:current.gridPTSearned-initial.gridPTSearned,left:remaining(current),before:initial.researchEXPrateTOT,after:current.researchEXPrateTOT,raw,state:current};
}
function lensRates(state,assignments){const count=Array.from({length:80},()=>[0,0,0]);for(const a of assignments)if(a.obs>=0&&a.obs<80)count[a.obs][a.type]++;
 let exp=0,insight=0;const per=[];
 for(const o of state.observations){if(!o.found||!o.unlocked)continue;const factor=1+neighbors(o.index,8,80).reduce((sum,i)=>sum+count[i][2],0)*state.kaleiBase;const e=count[o.index][0]*o.unitExp*factor,s=count[o.index][1]*o.unitInsight*factor;exp+=e;insight+=s/Math.max(1,o.insightExpREQ);per.push({id:o.index,exp:e,insight:s,count:count[o.index]});}
 return {exp,insight,per};
}
function lensPlan(state,raw,config={}){
 const eligible=state.observations.filter(o=>o.found&&o.unlocked).map(o=>o.index),cap=state.magnifiersPerSlot;
 const types=[...Array(state.magnifyingGlassOwned).fill(0),...Array(state.opticalMonocleOwned).fill(1),...Array(state.kaleidoscopeOwned).fill(2)].slice(0,state.magnifiersOwned);
 const saved=Array.from({length:state.magnifiersOwned},(_,i)=>({type:Number(raw[5]?.[4*i+3])||0,obs:Number(raw[5]?.[4*i+2]??-1)}));
 const before=lensRates(state,saved),expBase=Math.max(1,before.exp),insightBase=Math.max(1e-9,before.insight),goal=config.goal||'balanced';
 const score=a=>{const r=lensRates(state,a);return goal==='exp'?[r.exp/expBase,r.insight/insightBase]:goal==='insight'?[r.insight/insightBase,r.exp/expBase]:[Math.log1p(r.exp/expBase)+Math.log1p(r.insight/insightBase),r.exp/expBase+r.insight/insightBase];};
 const better=(a,b)=>a[0]>b[0]+1e-10||Math.abs(a[0]-b[0])<=1e-10&&a[1]>b[1]+1e-10;
 function improve(start){const a=start.map(x=>({...x}));let value=score(a);
  for(let pass=0;pass<8;pass++){let changed=false;
   for(let i=0;i<a.length;i++){const old=a[i].obs;let best=old,bestScore=value;for(const obs of eligible){if(obs===old||a.filter((x,j)=>j!==i&&x.obs===obs).length>=cap)continue;a[i].obs=obs;const s=score(a);if(better(s,bestScore)){bestScore=s;best=obs;}}a[i].obs=best;if(best!==old){value=bestScore;changed=true;}}
   // Swaps can escape a full observation where a move alone is illegal.
   for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++){if(a[i].obs===a[j].obs||a[i].type===a[j].type)continue;[a[i].obs,a[j].obs]=[a[j].obs,a[i].obs];const s=score(a);if(better(s,value)){value=s;changed=true;}else [a[i].obs,a[j].obs]=[a[j].obs,a[i].obs];}
   if(!changed)break;
  }return {a,value};
 }
 let candidates=[improve(types.map(type=>({type,obs:-1})))];
 const valid=saved.every(x=>x.obs===-1||eligible.includes(x.obs))&&eligible.every(i=>saved.filter(x=>x.obs===i).length<=cap)&&[0,1,2].every(t=>saved.filter(x=>x.type===t).length===types.filter(x=>x===t).length);
 if(valid)candidates.push(improve(saved));const best=candidates.sort((a,b)=>better(a.value,b.value)?-1:better(b.value,a.value)?1:0)[0];
 return {assignments:best.a,before,after:lensRates(state,best.a),unplaced:best.a.filter(x=>x.obs<0).length,cap};
}
const api={neighbors,coord,pathTo,gridPlan,lensRates,lensPlan};if(typeof module==='object')module.exports=api;root.ResearchOptimizerModel=api;
})(typeof window==='object'?window:globalThis);
