(function(root){'use strict';
const catalog=typeof module!=='undefined'&&module.exports?require('./fountain-data.js'):root.FountainData;
const currencies=['Bronze','Silver','Gold','Dollar','Credit','Treasury','Moolah','Shilling','Greane','Marble'];
const waters=['Blue','Yellow','Green'];
const outsideGoals=[
 ['bravery','Bravery Monument',0,13],['cosmo','Cosmo EXP',0,14],['buckets','Golden bucket fill',0,15],
 ['classExp','Class EXP',0,16],['sailing','Sailing treasure',0,17],['orion','Orion feathers',0,18],
 ['justice','Justice Monument',1,13],['study','Bolaia study rate',1,14],['harp','Harp string EXP',1,15],
 ['damage','Damage',1,16],['summoning','Summoning essence',1,17],['poppy','Poppy fish',1,18],
 ['wisdom','Wisdom Monument',2,13],['measurement','Minau cost efficiency',2,14],['jars','Jar enchant multiplier',2,15],
 ['research','Research EXP',2,16],['cooking','Cooking Mastery EXP',2,17],['bubba','Bubba meat',2,18]
].map(([id,label,water,index])=>({id,label,water,index}));
const goals=[{id:'income',label:'Fountain currency income'},{id:'outside',label:'Outside bonuses · balanced'},...outsideGoals,{id:'marbleIncome',label:'Marble production'}];
const number=v=>Number.isFinite(Number(v))?Math.max(0,Number(v)):0;
const parse=v=>typeof v==='string'?JSON.parse(v):v;
function decode(raw={}){
 const data=parse(raw.data||raw),holes=parse(data.Holes);
 if(!Array.isArray(holes)||!Array.isArray(holes[31])||!Array.isArray(holes[9]))return null;
 const matrix=i=>Array.from({length:3},(_,w)=>Array.from({length:20},(_,u)=>Math.floor(number(holes[i]?.[w]?.[u]))));
 const extra=holes[11]||[],options=parse(data.OptionsListAccount||[]);
 return {levels:matrix(31),marbles:matrix(32),balances:[...Array.from({length:9},(_,i)=>number(holes[9][30+i])),number(extra[81])],sediment:[number(holes[9][3]),number(holes[9][16]),number(holes[9][20])],lucky:Array.from({length:9},(_,i)=>number(holes[30]?.[i])),ducks:number(options[601]),desired:Number(extra[82]??-1),ignored:String(extra[83]??'')};
}
const clone=s=>JSON.parse(JSON.stringify(s));
const bonus=(s,w,i)=>Math.round(s.levels[w][i]*catalog[w*20+i].bonusPerLevel*(s.marbles[w][i]?1.5+0.5*s.marbles[w][i]:1));
const waterOpen=(s,w)=>w===0||(s.levels[0][0]>0&&(w===1||s.levels[1][0]>0));
function unlocked(s,u){return waterOpen(s,u.water)&&(u.prerequisite<0||s.levels[u.water][u.prerequisite]>=(u.water===0&&[2,14].includes(u.index)?1:10));}
function cost(s,u,kind='level'){
 const level=s.levels[u.water][u.index],m=s.marbles[u.water][u.index];
 if(kind==='marble')return u.water===2?250000*Math.pow(2*(5+m),m):u.index===13?1500*Math.pow(10+5*m,m):500*Math.pow(5+m,m);
 return (u.baseCost===1?level+1:u.baseCost)*Math.pow(u.costMultiplier,level);
}
// Currency value and fill-rate factors from N.js. Constant external account
// multipliers cancel in before/after ratios. This is NOT an absolute hourly rate.
function incomeFactor(s,c,settings={}){
 const f=(w,i)=>bonus(s,w,i),w=Math.floor(c/3),i=c%3;
 const log=Math.log(Math.max(1,s.sediment[w]))/2.30259;
 const boosters=[[0,2],[0,5],[0,6],[0,7],[1,5],[1,6],[1,7],[2,5],[2,6]];
 const b=boosters[c];
 const base=1+f(w,2+i)*(1+f(...b)/100)*(1+log*f(w,19)/100);
 const all=(1+f(0,0)/100)*(1+f(1,0)/100)*(1+f(2,0)/100)*(1+(f(0,1)+f(1,1)+f(2,1)+f(1,12))/100);
 const desire=c===s.desired||c>=6?1+f(1,11)/100:1;
 const value=Math.pow(base*all*desire,c>=6?0.5:1)*(1+s.lucky[c]*(25+f(2,9))/100)*Math.pow(1+f(2,11)/100,s.ducks);
 const active=settings.active?1+Math.min(4,4*f(0,12))+f(0,12)/100:1;
 const keep=settings.overflow?0.1+f(0,8)/(100+f(0,8))*0.5:1;
 return value*(1+f(0,9)/100)*active*keep;
}
function targetOpen(s,c){return c===0||unlocked(s,catalog[Math.floor(c/3)*20+2+c%3]);}
function activeCurrencies(s){
 // Fount_GenerateCoin uses unlocked branches, then Number2Letter filters.
 const available=Array.from({length:9},(_,c)=>c).filter(c=>targetOpen(s,c)&&!String(s.ignored||'').includes('0abcdefgh'[c]));
 return available.length?available:[0];
}
function prepare(initial,settings){
 const goal=goals.some(g=>g.id===settings.goal)?settings.goal:'income';
 const target=settings.target==='all'?'all':Math.max(0,Math.min(8,Math.floor(number(settings.target))));
 return {...settings,goal,target,incomeTargets:settings.incomeTargets|| (target==='all'?activeCurrencies(initial):[target])};
}
function metric(s,settings={}){
 const opts=prepare(s,settings),source=outsideGoals.find(g=>g.id===opts.goal);
 if(source)return 1+bonus(s,source.water,source.index)/100;
 if(opts.goal==='outside')return Math.exp(outsideGoals.reduce((sum,g)=>sum+Math.log1p(bonus(s,g.water,g.index)/100),0)/outsideGoals.length);
 if(opts.goal==='marbleIncome')return (1+bonus(s,1,10)/100)*(opts.active?1+Math.min(4,4*bonus(s,0,12))+bonus(s,0,12)/100:1);
 return Math.exp(opts.incomeTargets.reduce((sum,c)=>sum+Math.log(incomeFactor(s,c,opts)),0)/opts.incomeTargets.length);
}
function goalLabel(settings={}){
 const goal=goals.find(g=>g.id===settings.goal)||goals[0];
 return goal.id==='income'?(settings.target==='all'?'Balanced currency income':currencies[Number(settings.target)||0]+' income'):goal.label;
}
function effects(before,after,settings={}){
 const opts=prepare(before,settings);
 const sources=opts.goal==='outside'?outsideGoals:outsideGoals.filter(g=>g.id===opts.goal);
 return sources.map(g=>{const a=1+bonus(before,g.water,g.index)/100,b=1+bonus(after,g.water,g.index)/100;return {label:g.label,before:a,after:b,gain:b/a-1,lower:g.id==='measurement'};}).filter(x=>x.gain>1e-12);
}
function apply(s,a){s.balances[a.currency]=Math.max(0,s.balances[a.currency]-a.cost);s[a.kind==='marble'?'marbles':'levels'][a.water][a.index]++;}
function candidates(s,settings={}){
 const opts=prepare(s,settings),before=metric(s,opts);
 return catalog.flatMap(u=>{
  if(!unlocked(s,u))return [];
  return (settings.marble===false?['level']:['level','marble']).flatMap(kind=>{
   if(kind==='marble'&&(!u.marbleEligible||s.levels[u.water][u.index]===0||s.levels[1][10]===0))return [];
   const currency=kind==='marble'?9:u.currency,price=cost(s,u,kind);
   if(!Number.isFinite(price)||price<=0)return [];
   const next=clone(s),a={...u,kind,currency,cost:price,from:s[kind==='marble'?'marbles':'levels'][u.water][u.index]};
   apply(next,a);a.gain=metric(next,opts)/before-1;
   a.effects=effects(s,next,opts);
   a.affordable=price<=s.balances[currency];
   // Marginal greedy heuristic: gain per fraction of the remaining wallet.
   // Unlike adding raw Bronze and Gold, the score preserves separate budgets.
   const budget=opts.referenceBalances?.[currency]??s.balances[currency];
   // Log scores preserve ordering even for very expensive future purchases.
   a.score=a.gain>0?Math.log(a.gain)+Math.log(Math.max(1,budget))-Math.log(price):-Infinity;
   return [a];
  });
 }).sort((a,b)=>b.score-a.score||b.gain-a.gain||a.water-b.water||a.index-b.index);
}
function plan(initial,settings={}){
 const state=clone(initial),opts=prepare(initial,settings),start=metric(state,opts),steps=[],funding=Array(10).fill(0),spent=Array(10).fill(0);
 const result=reason=>({steps,state,gain:metric(state,opts)/start-1,reason,funding,spent,effects:effects(initial,state,opts),label:goalLabel(opts)});
 if(opts.goal==='income'&&opts.target!=='all'&&!targetOpen(state,opts.target))return result('Unlock this currency first. Use the upgrade catalogue to see its prerequisites.');
 if(opts.goal==='income'&&opts.target!=='all'&&!activeCurrencies(state).includes(opts.target))return result('This currency is ignored in your save. Enable it in the Fountain before using its income plan.');
 if(opts.goal==='marbleIncome'&&state.levels[1][10]===0)return result('Unlock Marble Filling first to start marble production.');
 const limit=Math.max(1,Math.min(500,Math.floor(number(settings.steps)||100)));
 let future=false;
 for(let i=0;i<limit;i++){
  const choices=candidates(state,{...opts,referenceBalances:future?initial.balances:undefined}).filter(a=>a.gain>1e-12&&Number.isFinite(a.gain)&&Number.isFinite(spent[a.currency]+a.cost)&&Number.isFinite(funding[a.currency]+Math.max(0,a.cost-state.balances[a.currency])));
  const next=choices.find(a=>a.affordable)||(opts.mode==='roadmap'?choices[0]:null);
  if(!next)break;
  const shortfall=Math.max(0,next.cost-state.balances[next.currency]);
  if(shortfall>0){future=true;funding[next.currency]+=shortfall;state.balances[next.currency]+=shortfall;}
  spent[next.currency]+=next.cost;
  apply(state,next);steps.push({...next,shortfall,future,totalGain:metric(state,opts)/start-1});
 }
 return result(steps.length?'':opts.mode==='roadmap'?'No available upgrade directly improves this goal. Check the catalogue for prerequisites.':'No affordable upgrade directly improves this goal. Switch to the long-term roadmap to see what to save for.');
}
const api={catalog,currencies,waters,goals,outsideGoals,decode,bonus,unlocked,waterOpen,targetOpen,activeCurrencies,cost,incomeFactor,metric,goalLabel,effects,candidates,plan};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FountainOptimizer=api;
})(typeof window!=='undefined'?window:globalThis);
