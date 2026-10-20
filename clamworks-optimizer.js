(function(root){'use strict';
// Client: Thingies Clam_* and SceneEvents_143; Spelunky[28,29].
const names=['Pearl Value','Clam Comrades','Lucky Day','Multi-Scalping','Frugality','Pure Pearls','Encystation Up','Shinier Pearls','Anti Inflation'];
const bases=[1.2,5,1.5,1.4,1.15,1.5,1.35,1.25,1.22];
const num=v=>Number.isFinite(Number(v))?Math.max(0,Number(v)):0;
const copy=s=>({...s,levels:s.levels.slice()});
function decode(raw){const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v;}catch{return null;}},data=parse(raw?.data)||raw,mena=parse(data?.Menagerie)||[];for(const r of [data,raw])for(const key of ['OptLacc','OptionsListAccount']){let o=r?.[key];if(typeof o==='string'){try{o=JSON.parse(o);}catch{continue;}}if(Array.isArray(o)&&o.length>465)return {scurgeKnown:Array.isArray(mena[5]),scurgeExp:num(mena[0]?.[7]),scurgeUnlocked:num(mena[2]?.[4])>0,scurge:Array.from({length:9},(_,i)=>num(mena[5]?.[i])),scurgeLevel:num(mena[0]?.[8]),pearls:num(o[454]),levels:Array.from({length:9},(_,i)=>Math.floor(num(o[455+i]))),promotion:Math.floor(num(o[464])),unlocked:Math.min(8,Math.floor(num(o[465])))};}return null;}
const requirement=(s,i)=>i===0?0:20*Math.pow(10+3*s.promotion,i-1);
function unlock(s){for(let i=s.unlocked+1;i<9&&s.pearls>=requirement(s,i);i++)s.unlocked=i;}
function cost(s,i){const l=s.levels[i],discount=(1+.12*s.levels[4])*(1+.16*s.levels[8])*(1+.25*num(s.scurge?.[3]))*(1+.1*num(s.scurge?.[i])*num(s.scurge?.[5]));return (i===0?Math.pow(bases[i],l)+3*l+Math.pow(l,2.5):requirement(s,i)/5*Math.pow(bases[i],l)+2*l+Math.pow(l,1.5))/discount;}
function production(s,opts={}){const l=s.levels;return (1+.5*num(s.scurge?.[1]))*(1+.1*num(s.scurge?.[8])*num(s.scurgeLevel))*(1+l[0])*(1+9*(1-1/(1+.03*l[2])))*(1+num(opts.multikill)/100000*l[3])*(1+.1*l[6])*(1+.1*l[7])*(l[5]>0?1+.005*(50+50*l[5]):1)*(opts.population?Math.min(25,2+l[1]):1);}
function buy(s,i,roadmap){if(i===1&&s.levels[1]>=23)return null;unlock(s);const price=cost(s,i),need=Math.max(price,i>s.unlocked?requirement(s,i):0),shortfall=Math.max(0,need-s.pearls);if(!Number.isFinite(need)||(!roadmap&&shortfall>0))return null;s.pearls+=shortfall;unlock(s);if(i>s.unlocked)return null;const from=s.levels[i];s.pearls-=price;s.levels[i]++;return {id:i,name:names[i],from,to:from+1,cost:price,shortfall,balance:s.pearls};}
// Greedy marginal growth with up to three discount purchases before a
// production purchase. This is a bounded heuristic, not a global optimum.
function plan(input,opts={}){const s=copy(input),steps=[],initial=production(s,opts),limit=Math.min(100,Math.max(1,Math.floor(num(opts.steps)||30))),roadmap=opts.mode!=='now';let spent=0,funding=0;
while(steps.length<limit){let best=null;const before=production(s,opts);
for(const id of [0,1,2,3,5,6,7])for(const discount of [-1,4,8])for(let count=discount<0?0:1;count<=(discount<0?0:3);count++){
if(steps.length+count+1>limit)continue;const next=copy(s),actions=[];let valid=true;
for(let n=0;n<count;n++){const a=buy(next,discount,roadmap);if(!a){valid=false;break;}actions.push(a);}if(!valid)continue;const a=buy(next,id,roadmap);if(!a)continue;actions.push(a);
const gain=production(next,opts)/before-1,total=actions.reduce((v,x)=>v+x.cost,0),extra=actions.reduce((v,x)=>v+x.shortfall,0),score=Math.log1p(gain)/Math.max(total,extra,Number.MIN_VALUE);
if(gain>0&&Number.isFinite(score)&&(!best||score>best.score))best={next,actions,score};
}if(!best)break;for(const action of best.actions){steps.push(action);spent+=action.cost;funding+=action.shortfall;}Object.assign(s,best.next);
}return {steps,state:s,spent,funding,gain:production(s,opts)/initial-1};}
// Beam search in units of current pearl income. Every state can stop buying
// and save for one promotion attempt; discount-only intermediate states survive.
function promotionPlan(input,opts={}){
 const initial=production(input,opts),target=1e5*Math.pow(10,input.promotion),rate=num(opts.rate),limit=Math.min(100,Math.max(1,Math.floor(num(opts.steps)||30)));
 const finish=n=>n.time+Math.max(0,target-n.state.pearls)/(production(n.state,opts)/initial);
 const start={state:copy(input),steps:[],time:0,spent:0,funding:0};let best=start,bestTime=finish(start),beam=[start];
 for(let depth=0;depth<limit&&beam.length&&bestTime>0;depth++){
  const candidates=[];
  for(const node of beam)for(let id=0;id<9;id++){
   if(id===1&&!opts.population||id===3&&!num(opts.multikill))continue;
   const state=copy(node.state),action=buy(state,id,true);if(!action)continue;
   const time=node.time+action.shortfall/(production(node.state,opts)/initial);
   if(!Number.isFinite(time)||time>=bestTime)continue;
   const next={state,steps:node.steps.concat({...action,elapsed:time}),time,spent:node.spent+action.cost,funding:node.funding+action.shortfall};
   const eta=finish(next);if(eta<bestTime){best=next;bestTime=eta;}
   candidates.push({...next,eta});
  }
  candidates.sort((a,b)=>a.eta-b.eta);beam=candidates.slice(0,48);
 }
 const baseline=finish(start),save=Math.max(0,target-best.state.pearls);
 return {...best,target,baseline,time:bestTime,hours:rate>0?bestTime/rate:null,baselineHours:rate>0?baseline/rate:null,save,gain:production(best.state,opts)/initial-1,savedFraction:baseline>0?1-bestTime/baseline:0};
}
function farmerMultikill(character,promotion){
 const loot=character?.loot;if(character?.error||character?.missing?.length||!Number.isFinite(loot?.damage)||!Number.isFinite(loot?.base)||!Number.isFinite(loot?.perTier?.[6]))return null;
 const diminish=v=>v>=250?98.14+(v-250)/50:v>=200?95.6+(v-200)/20:v>=150?90.6+(v-150)/10:v>=100?80.6+(v-100)/5:v>=50?47.3+(v-50)/1.5:v>=20?20+(v-20)/1.1:v;
 const hp=1e16*Math.pow(30,promotion);let tiers=1;for(let i=0;i<50&&loot.damage>=hp*5*Math.pow(5,i+1);i++)tiers=i+2;
 return Math.floor(diminish(loot.base)+tiers*diminish(loot.perTier[6]));
}
function purchaseRows(steps,done=[],compress=false){
 const rows=[],groups=new Map();steps.forEach((a,i)=>{const key=a.id+':'+a.to;if(done.includes(key))return;const order=i+1,last=compress?groups.get(a.id):null;
 if(last){last.to=a.to;last.cost+=a.cost;last.shortfall+=a.shortfall;last.balance=a.balance;last.end=order;last.keys.push(key);last.orders.push(order);last.count++;}
 else{const row={...a,order,end:order,keys:[key],orders:[order],count:1};rows.push(row);groups.set(a.id,row);}
 });return rows;
}
function scurgeSummary(s){const l=s.scurge||Array(9).fill(0),level=num(s.scurgeLevel);return {level,exp:num(s.scurgeExp),required:(50+15*level)*Math.pow(1.08,level),pearls:Math.max(0,level-l.reduce((a,b)=>a+num(b),0)),pearlMulti:(1+.5*num(l[1]))*(1+.1*num(l[8])*level),discount:1+.25*num(l[3]),expMulti:(1+num(l[0]))*(1+1.5*num(l[4]))*(1+2*num(l[2])),carry:100*Math.min(.8,num(l[6])/(num(l[6])+25)*.75)};}

const scurgeNames=['Reckoning','Pearl Infection','Self Affliction','Cost Dissolving','Even Better','Cross Culting','Gravestart','Swarming','True Scurge'];
const scurgeUnlocks=[0,5,10,25,50,100,250,500,1000];
function scurgeGain(levels,players=0){return (1+levels[0])*(1+1.5*levels[4])*(1+2*levels[2])*(1+.1*levels[7]*num(players));}
function scurgeScore(levels,level,goal,players=0){
 if(goal==='overall')return Math.exp((Math.log(scurgeGain(levels,players))+Math.log(scurgeScore(levels,level,'pearls',players))+Math.log(scurgeScore(levels,level,'discount',players)))/3);
 if(goal==='pearls')return (1+.5*levels[1])*(1+.1*levels[8]*level);
 if(goal==='discount')return (1+.25*levels[3])*Math.exp(levels.reduce((sum,v)=>sum+Math.log(1+.1*v*levels[5]),0)/9);
 return scurgeGain(levels,players);
}
function scurgePlan(input,opts={}){
 if(!input.scurgeKnown||!input.scurgeUnlocked)return {steps:[],unavailable:true};
 const levels=input.scurge.slice(),steps=[],limit=Math.min(100,Math.max(1,Math.floor(num(opts.steps)||20))),players=Math.floor(num(opts.players)),affliction=levels[2]+Math.floor(num(opts.affliction)),kills=num(opts.kills);
 let level=Math.floor(num(input.scurgeLevel)),exp=num(input.scurgeExp),pearls=Math.floor(scurgeSummary(input).pearls),totalKills=0;
 const goal=['overall','pearls','discount'].includes(opts.goal)?opts.goal:'leveling',initial=scurgeScore(levels,level,goal,players);
 for(let n=0;n<limit;n++){
  let waitKills=0;
  if(pearls<1){if(opts.mode==='now')break;const req=(50+15*level)*Math.pow(1.08,level);waitKills=Math.ceil(Math.max(0,req-exp)/scurgeGain(levels,players));if(!Number.isFinite(waitKills))break;exp=Math.max(0,exp+waitKills*scurgeGain(levels,players)-req);level++;pearls++;totalKills+=waitKills;}
  let best=null;const before=scurgeScore(levels,level,goal,players);
  for(const id of (goal==='leveling'?[0,2,4,7]:goal==='pearls'?[1,8]:[0,1,2,3,4,5,6,7,8])){if(level<scurgeUnlocks[id]||id===2&&levels[2]>=affliction)continue;const next=levels.slice();next[id]++;const gain=scurgeScore(next,level,goal,players)/before-1;if(gain>0&&(!best||gain>best.gain))best={id,gain};}
  if(!best&&opts.mode!=='now'&&goal!=='leveling')best={id:0,gain:0};
  if(!best)break;
  const beforeLevels=levels.slice(),from=levels[best.id]++;pearls--;
  const effects={exp:scurgeGain(levels,players)/scurgeGain(beforeLevels,players)-1,pearls:scurgeScore(levels,level,'pearls',players)/scurgeScore(beforeLevels,level,'pearls',players)-1,costReduction:1-scurgeScore(beforeLevels,level,'discount',players)/scurgeScore(levels,level,'discount',players)};
  steps.push({id:best.id,name:scurgeNames[best.id],from,to:from+1,level,waitKills,totalKills,gain:best.gain,effects,expPerKill:scurgeGain(levels,players)});
 }
 return {steps,levels,level,pearls,totalKills,hours:kills>0?totalKills/kills:null,goal,gain:scurgeScore(levels,level,goal,players)/initial-1,expPerKill:scurgeGain(levels,players),unavailable:false};
}

const api={scurgePlan,scurgeGain,scurgeNames,scurgeUnlocks,promotionPlan,scurgeSummary,purchaseRows,farmerMultikill,names,bases,decode,requirement,cost,production,buy,plan};if(typeof module==='object'&&module.exports)module.exports=api;else root.ClamworksOptimizer=api;
})(typeof window==='undefined'?globalThis:window);
