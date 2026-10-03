(function(root){
'use strict';
const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v;}catch{return null;}},number=v=>v!=null&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const colors=['White','Green','Yellow','Blue','Purple','Red','Cyan','Teal'];
const goals=[['all','All upgrades'],['essence','Essence generation'],['damage','Unit damage'],['health','Unit health'],['mana','Mana'],['discount','Cheaper upgrades'],['cards','Cards & special units'],['familiars','Familiars & Summoning EXP'],['player','Player damage']];
const groups={essence:[0,4,11,13,18,23,27,30,33,38,40,44,46,52,53,54,58,62,65,66,67,73,80],damage:[3,12,15,21,31,43,47,51,56,60,64,68,74,76,77],health:[1,10,20,35,37,50,59,61,63,81],mana:[5,14,16,17,29,41,42],discount:[49,57,72,75],cards:[7,8,9,17,19,22,24,25,26,28,32,34,36,45,48,55,69,70,71,78],familiars:[2,6,39],player:[79]};
function snapshot(raw,catalog=root.WORLD6_CATALOG){
 const wrapper=parse(raw)||{},data=parse(wrapper.data)||wrapper,s=parse(data.Summon),levels=parse(s?.[0]),wallet=parse(s?.[2]),holes=parse(data.Holes)||[],kills=parse(data.KRbest)||{};
 const upgrades=(catalog?.SummonUPG||[]).map((r,id)=>({id,color:+r[2],name:r[3].replaceAll('_',' '),template:r[11],base:+r[4],growth:+r[5],quantity:+r[6],requiredLevel:+r[7],max:+r[8],parent:+r[9],stone:+r[10]===1}));
 const lv=Object.entries(data).filter(([k])=>/^Lv0(?:_\d+)?$/.test(k)).map(([,v])=>number(parse(v)?.[18])).filter(v=>v!=null);
 return {available:Array.isArray(levels)&&levels.length>0,upgrades,levels:upgrades.map(x=>number(levels?.[x.id])==null?null:Math.max(0,Math.floor(number(levels[x.id])))),balances:colors.map((_,i)=>number(wallet?.[i])),doubled:(parse(holes[28])||[]).filter(x=>Number.isInteger(x)&&x!==78),stones:colors.map((_,i)=>Math.max(0,number(kills['SummzTrz'+i])||0)),tealUnlocked:Number(parse(parse(data.Spelunk)?.[0])?.[4])>=1,summoningLevel:lv.length?Math.max(...lv):null};
}
function bonus(s,id){const u=s.upgrades[id];if(!u)return 0;const double=s.doubled.includes(id)?2+(s.levels[78]||0)*(s.upgrades[78]?.quantity||0)/100:1;return (s.levels[id]||0)*u.quantity*double*(u.stone&&s.stones[u.color]>0?1+s.stones[u.color]:1);}
function cost(s,u,multiplier=1){if(s.levels[u.id]==null)return null;const total=s.levels.reduce((sum,v)=>sum+(v||0),0);const value=u.base*Math.pow(u.growth,s.levels[u.id])*multiplier/((1+bonus(s,49)/100)*(1+bonus(s,57)/100)*(1+bonus(s,72)/100)*(1+bonus(s,75)*Math.floor(total/100)/100));return Number.isFinite(value)&&value>0?value:null;}
function unlocked(s,u){if(s.levels[u.id]==null)return false;if(s.levels[u.id]>0)return true;if(u.requiredLevel>0&&(s.summoningLevel==null||s.summoningLevel<u.requiredLevel))return false;return u.id===71&&s.tealUnlocked||u.parent<0||u.parent!==u.id&&(s.levels[u.parent]||0)>0;}
function effect(s,u){if(s.levels[u.id]==null)return 'Saved level unavailable';let text=u.template.split('_@_')[0];const value=bonus(s,u.id);text=text.replaceAll('{',format(value)).replaceAll('>',format(1+value/100)).replaceAll('}',format(100-100/(1+value/100))).replaceAll('|','daily reset').replaceAll('_',' ');return text;}
function format(v){return v==null?'Unknown':v>=1e15?v.toExponential(2):v.toLocaleString(undefined,{maximumFractionDigits:2,notation:v>=1e6?'compact':'standard'});}
function optimize(initial,options={}){
 const s={...initial,levels:[...initial.levels]},percent=Math.max(0,Math.min(100,number(options.percent)??100)),multiplier=number(options.multiplier)>0?Number(options.multiplier):1;
 const remaining=initial.balances.map(v=>v==null?null:v*percent/100),budget=[...remaining],needed=colors.map(()=>0),steps=[],once=new Set(),goal=groups[options.goal]?options.goal:'all',future=options.mode==='future',limit=Math.max(0,Math.min(1000,Math.floor(number(options.count)??100))),target=options.color==null||options.color==='all'?null:Number(options.color);
 if(!s.available)return{steps,remaining,needed,locked:[]};
 const matches=u=>goal==='all'||groups[goal].includes(u.id);
 // Include unowned prerequisites of matching goals, but never invent a self-linked unlock.
 const prerequisites=new Set();for(const u of s.upgrades.filter(matches)){let id=u.parent,visited=new Set([u.id]);while(id>=0&&s.upgrades[id]&&!visited.has(id)){visited.add(id);if((s.levels[id]||0)===0)prerequisites.add(id);id=s.upgrades[id].parent;}}
 let cursor=0;
 for(let i=0;i<(limit||s.upgrades.length);i++){
  let chosen=null;
  for(let c=0;c<colors.length;c++){
   const color=(cursor+c)%colors.length;if(target!=null&&color!==target)continue;
   const candidates=s.upgrades.filter(u=>u.color===color&&(matches(u)||prerequisites.has(u.id)&&s.levels[u.id]===0)&&unlocked(s,u)&&s.levels[u.id]<u.max&&(limit||!once.has(u.id))).map(u=>({u,cost:cost(s,u,multiplier)})).filter(x=>x.cost!=null&&(future||remaining[color]!=null&&x.cost<=remaining[color])).sort((a,b)=>a.cost-b.cost||a.u.id-b.u.id);
   if(candidates.length){chosen=candidates[0];cursor=(color+1)%colors.length;break;}
  }
  if(!chosen)break;const {u,cost:price}=chosen,level=s.levels[u.id],before=effect(s,u);needed[u.color]+=price;if(!Number.isFinite(needed[u.color]))break;if(remaining[u.color]!=null)remaining[u.color]-=price;s.levels[u.id]++;once.add(u.id);
  steps.push({id:u.id,name:u.name,color:u.color,level,endLevel:level+1,cost:price,before,after:effect(s,u),prerequisite:!matches(u),shortfall:budget[u.color]==null?null:Math.max(0,needed[u.color]-budget[u.color])});
 }
 return{steps,remaining,needed,levels:s.levels,locked:s.upgrades.filter(u=>matches(u)&&!unlocked(initial,u))};
}
function collapse(steps){const grouped=new Map();for(const step of steps){const old=grouped.get(step.id);if(old){old.endLevel=step.endLevel;old.cost+=step.cost;old.after=step.after;old.shortfall=step.shortfall;old.count++;}else grouped.set(step.id,{...step,count:1});}return [...grouped.values()];}
const api={colors,goals,snapshot,bonus,cost,unlocked,effect,optimize,collapse,format};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SummoningOptimizer=api;
})(typeof window!=='undefined'?window:globalThis);
