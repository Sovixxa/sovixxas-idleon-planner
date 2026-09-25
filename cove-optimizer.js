(function(root){'use strict';
const catalog=typeof module==='object'&&module.exports?require('./cove-data'):root.COVE_CATALOG;
const shapes=['Gooey Triangle','Gooey Square','Gooey Pentagon','Gooey Hexagon','Gooey Heptagon','Gooey Nonagon','Quartz Prismagon','Quartz Cubigon','Quartz Pointagon','Quartz Octagogon','Quartz Noragon','Quartz Brillagon'];
const goals=[['drop','Cove drop rate'],['afk','Drop rate × AFK gains'],['blue','Selected blue shape value'],['purple','Selected purple shape value'],['respawn','Respawn bonus'],['tier','Multikill per damage tier'],['multikill','Base multikill'],['research','Research EXP'],['caverns','Cavern resources'],['damage','Total damage'],['discovery','Grand Discovery chance'],['discount','Cheaper Cove upgrades'],['opal','Opals'],['ribbon','Rank 15 ribbons']].map(([id,label])=>({id,label}));
const number=x=>Number.isFinite(Number(x))?Math.max(0,Number(x)):0;
function field(raw,names){for(const source of [raw?.data,raw])for(const name of names){let v=source?.[name];if(typeof v==='string'){try{v=JSON.parse(v);}catch{continue;}}if(Array.isArray(v))return v;}return null;}
function decode(raw){const o=field(raw,['OptionsListAccount','OptLacc']),h=field(raw,['Holes']),r=field(raw,['Ribbon']);if(!o||o.length<666)return null;return {levels:Array.from({length:24},(_,i)=>Math.floor(number(o[630+i]))),balances:Array.from({length:12},(_,i)=>number(o[654+i])),kills:number(o[668]),normalDR:number(o[200]),purchases:Math.round(number(o[604])),study:number(h?.[26]?.[17]),studyKnown:!!h?.[26],unlocked:h?.[1]?.[0]!=null?number(h[1][0])>=18:null,ribbons:r?r.slice(0,28).filter(x=>Number(x)===0).length:null};}
const copy=s=>({...s,levels:s.levels.slice(),balances:s.balances.slice()});
const bonus=(s,id)=>s.levels[id]*catalog[id].bonus;
const digits=x=>Math.ceil(Math.log(Math.max(x,1))/2.30259);
function dropRate(s){const b=id=>bonus(s,id),blue=s.balances.slice(0,6).reduce((a,x)=>a+digits(x),0),purple=s.balances.slice(6).reduce((a,x)=>a+digits(x),0);return (1+(b(1)+b(17)+b(21))/100)*(1+b(3)/100)*(1+b(12)/100)*(1+b(10)*blue/100)*(1+b(22)*purple/100)*(1+b(4)*digits(s.kills)/100)*(1+b(18)*digits(s.normalDR)/100);}
function cost(s,id){const u=catalog[id];let v=(Math.pow(u.base,s.levels[id])+s.levels[id])/(1+bonus(s,7)/100)*(id%2?5:1)*(s.purchases<s.study?0.85:1);return v<1e6?Math.floor(Math.max(1,v)):v;}
function metric(s,goal){const ids={blue:9,purple:16,respawn:2,tier:6,multikill:15,research:11,caverns:14,damage:19,discovery:20,discount:7};if(goal==='drop')return dropRate(s);if(goal==='afk')return dropRate(s)*(10+bonus(s,8)+bonus(s,13))/100;if(goal==='opal')return s.levels[0];if(goal==='ribbon')return s.levels[5];return 1+bonus(s,ids[goal]??7)/100;}
function eligible(s,id){return s.unlocked!==false&&s.balances[catalog[id].shape]>0&&(id!==5||(s.ribbons!==null&&s.ribbons>0));}
function buy(s,id,roadmap){const u=catalog[id],price=cost(s,id);if(!eligible(s,id)||!Number.isFinite(price))return null;const shortfall=Math.max(0,price-s.balances[u.shape]);if(shortfall&&!roadmap)return null;const from=s.levels[id];s.balances[u.shape]=s.balances[u.shape]+shortfall-price;if(s.balances[u.shape]<=0)s.balances[u.shape]=.1;s.levels[id]++;if(id===5)s.ribbons--;else s.purchases++;return {id,name:u.name,shape:u.shape,from,to:from+1,cost:price,shortfall};}
// Compare marginal goal gain per fraction of the imported shape balance.
// A two-purchase lookahead lets Active Drops precede a goal upgrade when cheaper.
function plan(saved,options={}){const goal=goals.some(g=>g.id===options.goal)?options.goal:'drop',roadmap=options.mode!=='now',limit=Math.max(1,Math.min(500,Math.floor(number(options.steps)||100))),s=copy(saved),steps=[],funding=Array(12).fill(0),spent=Array(12).fill(0),weights=saved.balances.map(x=>Math.max(1,x));
 const evaluate=state=>metric({...state,balances:saved.balances},goal),start=evaluate(s);
 while(steps.length<limit){let best=null;const before=evaluate(s);
  for(const u of catalog){if(u.id===23)continue;for(const ids of [[u.id],...(u.id!==7&&steps.length+1<limit?[[7,u.id]]:[])]){const next=copy(s),actions=[];let expense=0,valid=true;for(const id of ids){const action=buy(next,id,roadmap);if(!action){valid=false;break;}actions.push(action);expense+=action.cost/weights[action.shape];}if(!valid)continue;const after=evaluate(next),gain=(goal==='opal'||goal==='ribbon')?after-before:after/before-1;if(!(gain>0)||!Number.isFinite(gain))continue;const score=gain/expense;if(!best||score>best.score)best={next,actions,score};}}
  if(!best)break;for(const action of best.actions){const beforeAction=evaluate(s);buy(s,action.id,true);action.gain=(goal==='opal'||goal==='ribbon')?1:evaluate(s)/beforeAction-1;funding[action.shape]+=action.shortfall;spent[action.shape]+=action.cost;action.future=funding[action.shape]>0;action.order=steps.length+1;steps.push(action);}
 }
 return {steps,funding,spent,state:s,gain:(goal==='opal'||goal==='ribbon')?evaluate(s)-start:evaluate(s)/start-1,goal};}
function description(s,id){const b=bonus(s,id);return catalog[id].description.replaceAll('{',String(b)).replaceAll('}',String(1+b/100)).replaceAll('$',String(100-100/(1+b/100)));}
const api={catalog,shapes,goals,decode,bonus,cost,dropRate,metric,plan,description,eligible,buy};if(typeof module==='object'&&module.exports)module.exports=api;root.CoveOptimizer=api;
})(typeof globalThis!=='undefined'?globalThis:this);
