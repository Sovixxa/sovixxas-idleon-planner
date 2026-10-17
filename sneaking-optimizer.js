(function(root){
'use strict';
const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v;}catch{return null;}},finite=v=>v!=null&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const goals={jade:[8,28],stealth:[13,23],exp:[2,19],doors:[5,27],items:[14],recovery:[15]};
const labels={jade:'Jade yield',stealth:'Stealth',exp:'Sneaking EXP',doors:'Door damage',items:'Item find chance',recovery:'Knockout recovery speed'};
function snapshot(raw,catalog=root.WORLD6_CATALOG){
 const wrapper=parse(raw)||{},data=parse(wrapper.data)||wrapper,n=parse(data.Ninja),levels=parse(n?.[103]),omni=parse(parse(data.Menagerie)?.[7])||[];
 const characters=Object.keys(data).filter(k=>/^Lv0_\d+$/.test(k)).map(k=>({id:Number(k.slice(4)),level:finite(parse(data[k])?.[17])})).sort((a,b)=>a.id-b.id).filter(x=>x.level!=null).map(x=>({...x,name:wrapper.charNames?.[x.id]||'Ninja '+(x.id+1)}));
 return {available:Array.isArray(levels)&&levels.length>0,balance:finite(n?.[102]?.[1]),levels:(catalog?.NinjaUpg||[]).map((_,i)=>finite(levels?.[i])),omni,characters,lore:finite(parse(data.Spelunk)?.[13]?.[3])||0,upgrades:(catalog?.NinjaUpg||[]).map((r,id)=>({id,name:r[4].replaceAll('_',' '),modifier:Number(r[5]),base:Number(r[7]),growth:Number(r[8]),parent:Number(r[9])}))};
}
function bonus(s,id){return ((s.levels[id]||0)+(id<17?(Number(s.omni[id])||0):0))*(s.upgrades[id]?.modifier||0);}
function unlocked(s,id){const u=s.upgrades[id];if(!u||u.name==='Name'||s.levels[id]==null)return false;if(id>16)return s.lore>id-17;return id===0||id===13||(s.levels[id]||0)>0||(s.levels[u.parent]||0)>0;}
// Client JadeUpgCost, before external equipment/gemstone/talent and conduit bubble discounts.
function cost(s,id,options={}){
 const u=s.upgrades[id],level=s.levels[id];if(!u||level==null)return null;
 let growth=u.growth;if(id===13||id===1)growth=1+(growth-1)/(1+bonus(s,id===13?18:26)/1500);
 const exponent=id===0?45:id===31?55:id>16?2*(id-15):0;
 let log=Math.log(u.base)+exponent*Math.LN10+level*Math.log(growth)-Math.log1p(bonus(s,1)/100)-Math.floor(level/100)*Math.log1p(bonus(s,0)/100);
 if(id===3||id===4)log-=Math.log1p(bonus(s,id===3?24:25)/100);
 log+=Math.log(options.scale>0?options.scale:1);if(id===8)log-=Math.log(options.conduitDiscount>=1?options.conduitDiscount:1);
 const value=Math.exp(log);return Number.isFinite(value)&&value>0?value:null;
}
function metric(s,goal,level){if(goal==='exp')return (1+bonus(s,2)/100)*(1+bonus(s,19)/100);if(goal==='doors')return (1+bonus(s,5)/100)*(1+bonus(s,27)/100);if(goal==='items')return 1+bonus(s,14)/100;if(goal==='recovery')return 1+bonus(s,15)/100;return goal==='stealth'?(10+bonus(s,13)*level)*(1+bonus(s,23)/100):(1+bonus(s,8)*level/100)*(1+bonus(s,28)/100);}
function packageFor(s,id,path=new Set()){
 if(unlocked(s,id))return [id];const u=s.upgrades[id];if(!u||id>16||s.levels[id]==null||path.has(id)||u.parent===id)return null;
 const next=new Set(path);next.add(id);const required=packageFor(s,u.parent,next);return required?[...required,id]:null;
}
function optimize(initial,options={}){
 const s={...initial,levels:[...initial.levels]},goal=Object.hasOwn(goals,options.goal)?options.goal:'jade',level=['jade','stealth'].includes(goal)?finite(options.level):1,percent=Math.max(0,Math.min(100,finite(options.percent)??100)),limit=Math.max(0,Math.min(200,Math.floor(finite(options.count)??30))),future=options.mode==='future';
 const budget=initial.balance==null?null:initial.balance*percent/100,result={steps:[],spent:0,budget,remaining:budget,gain:0,levels:s.levels};
 if(!s.available||level==null||level<=0||(!future&&budget==null))return result;
 const baseline=metric(s,goal,level),discounts=goal==='stealth'?[0,1,18,26]:[0,1,26];
 while(result.steps.length<limit){
  const current=metric(s,goal,level);let best=null;
  for(const target of goals[goal])for(const discount of [null,...discounts]){
   const trial={...s,levels:[...s.levels]},steps=[];let total=0,valid=true;
   for(const id of discount==null?[target]:[discount,target]){
    const ids=packageFor(trial,id);if(!ids){valid=false;break;}
    for(const next of ids){const price=cost(trial,next,options);if(price==null){valid=false;break;}total+=price;steps.push({id:next,name:trial.upgrades[next].name,from:trial.levels[next],to:trial.levels[next]+1,cost:price,reason:next===target?'Gain':discount===next?'Discount':'Required unlock'});trial.levels[next]++;}
    if(!valid)break;
   }
   const gain=metric(trial,goal,level)/current-1;
   if(!valid||!Number.isFinite(total)||gain<=0||result.steps.length+steps.length>limit||(!future&&total>budget-result.spent))continue;
   const score=Math.log(gain)-Math.log(total);
   if(!best||score>best.score)best={score,steps,total,trial};
  }
  if(!best||!Number.isFinite(result.spent+best.total))break;
  for(const step of best.steps){result.spent+=step.cost;result.steps.push({...step,total:result.spent,shortfall:budget==null?null:Math.max(0,result.spent-budget)});}
  s.levels=best.trial.levels;
 }
 result.levels=s.levels;result.remaining=budget==null?null:Math.max(0,budget-result.spent);result.gain=metric(s,goal,level)/baseline-1;return result;
}
const api={snapshot,bonus,cost,unlocked,metric,optimize,goals,labels};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SneakingOptimizer=api;
})(typeof window!=='undefined'?window:globalThis);
