(function(root){'use strict';
// Client: Thingies Clam_* and SceneEvents_143; Spelunky[28,29].
const names=['Pearl Value','Clam Comrades','Lucky Day','Multi-Scalping','Frugality','Pure Pearls','Encystation Up','Shinier Pearls','Anti Inflation'];
const bases=[1.2,5,1.5,1.4,1.15,1.5,1.35,1.25,1.22];
const num=v=>Number.isFinite(Number(v))?Math.max(0,Number(v)):0;
const copy=s=>({...s,levels:s.levels.slice()});
function decode(raw){const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v;}catch{return null;}},data=parse(raw?.data)||raw,mena=parse(data?.Menagerie)||[];for(const r of [raw?.data,raw])for(const key of ['OptLacc','OptionsListAccount']){let o=r?.[key];if(typeof o==='string'){try{o=JSON.parse(o);}catch{continue;}}if(Array.isArray(o)&&o.length>465)return {scurge:Array.from({length:9},(_,i)=>num(mena[5]?.[i])),scurgeLevel:num(mena[0]?.[8]),pearls:num(o[454]),levels:Array.from({length:9},(_,i)=>Math.floor(num(o[455+i]))),promotion:Math.floor(num(o[464])),unlocked:Math.min(8,Math.floor(num(o[465])))};}return null;}
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
const api={purchaseRows,farmerMultikill,names,bases,decode,requirement,cost,production,buy,plan};if(typeof module==='object'&&module.exports)module.exports=api;else root.ClamworksOptimizer=api;
})(typeof window==='undefined'?globalThis:window);
