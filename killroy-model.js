(function(root){'use strict';
const num=v=>Math.max(0,Number(v)||0),int=v=>Math.floor(num(v));
const names=['Room timer','Talent drops','Bonus skulls','Faster respawn','Dungeon drops','Pearl drops'];
const shopNames=['Time candy','Black pearl','White pearl','Crystal spawn','Dungeon dice','Arcade balls','Library checkouts','Refinery cycle','Pet eggs','Kitchen ladles','Third fight chance','Artifact find','Gaming nugget','Crop evolution','Jade gain','Gallery grade','Masterclass drops','World 7 EXP','Daily coral','Future bonus'];
const costs=[5,9,10,3,6,4,8,1,8,5,4,9,5,6,7,15,7,6,10,12];
const curves={11:[228,1,1,300],13:[229,1,9,300],14:[230,1,2,300],15:[467,1,.1,200],16:[468,1.01,.013,200],17:[469,1.01,.008,150],18:[470,1,.25,250]};
const value=(id,level,data)=>{const [,base,scale,decay]=curves[id];return base+num(data?.otherPools?.[id])+scale*level/(decay+level);};
const effects={11:['Artifact find multiplier','Helps find missing artifact tiers in Sailing; actual chest chances can cap.'],13:['Crop evolution multiplier','Improves crop evolution chance while discovering crops; a capped chance cannot improve further.'],14:['Jade gain multiplier','More jade from Sneaking for upgrades and the Jade Emporium.'],15:['Gallery bonus multiplier','Strengthens Gallery bonuses. Podium grade stops benefiting from this source at Lv 50.'],16:['Masterclass drop factor','Improves Masterclass drops; the applied gain is much smaller than the shop multiplier label suggests.'],17:['Research EXP factor','More Research EXP. Spelunking shares an additive EXP pool, so its relative gain differs.'],18:['Daily coral multiplier','More daily coral for Coral Reef upgrades; includes dilution from your other additive bonuses.']};
function impact(id,before,after,data){
 const from=value(id,before,data),to=value(id,after,data);
 return {label:effects[id][0],description:effects[id][1],from,to,gainPercent:100*(to/from-1),shopBefore:100*(value(id,before)-1),shopAfter:100*(value(id,after)-1),inactive:data?.inactiveBonuses?.[id]||null};
}
const shopUnlocked=(data,id)=>id<10||!!data.prime&&(id<15||num(data.options[466])>=3);
const limits={11:'Approaches 2× artifact find',13:'Approaches 10× crop evolution',14:'Approaches 3× jade',15:'Approaches +0.10× Gallery multiplier; podium contribution capped at 2 by Lv 50',16:'Applied factor approaches 1.023×, not 2.3×',17:'Standalone applied factor approaches 1.018×, not 1.8×',18:'Approaches +25% in the daily-coral additive pool'};
function points(data,config={}){
 const levels=Array.from({length:6},(_,i)=>int(data.options[106+i])),before=[...levels],steps=[],count=Math.min(100,int(config.budget)),done=int(data.options[112]),slots=Math.min(6,3+int(data.dream[4]));
 const goal=config.goal||'kills',spawn=config.spawn!==false;
 const score=l=>{const kills=(100+l[0])*(spawn?1+l[3]/100:1);if(goal==='balanced')return (100+l[0])*(100+l[2]);if(goal==='kills')return kills;if(goal==='skulls')return kills*(1+l[2]/100);const i={talents:1,dungeon:4,pearls:5}[goal];return kills*(l[i]>0?1+l[i]*(i===1?.05:.01):0);};
 for(let step=0;step<count;step++){
  let best=-1,gain=0;const current=score(levels);
  for(let i=0;i<slots;i++){if(goal==='balanced'&&i!==0&&i!==2)continue;if(i&&done+step<Math.pow(2*i,Math.min(i,2)))continue;levels[i]++;const delta=score(levels)-current;levels[i]--;if(delta>gain){gain=delta;best=i;}}
  if(best<0)break;levels[best]++;steps.push({index:best,name:names[best],level:levels[best]});
 }
 return {before,levels,steps};
}
function skulls(data,config={}){
 let budget=Math.min(100000,int(config.budget));const initial=budget,counts={},levels=Object.fromEntries(Object.entries(curves).map(([id,c])=>[id,int(data.options[c[0]])])),start={...levels};
 const allowed=id=>shopUnlocked(data,id);
 const limit=id=>id===5?Math.max(0,50-int(data.options[417])):id===10&&num(data.options[227])?0:Infinity;
 const buy=id=>{budget-=costs[id];counts[id]=(counts[id]||0)+1;if(curves[id]&&!(id===15&&start[id]<2))levels[id]++;};
 const target=Number(config.target),requested=Math.min(10000,int(config.quantity));
 if(Number.isInteger(target)&&target>=0&&target<19&&allowed(target))for(let n=0;n<requested&&budget>=costs[target]&&n<limit(target);n++)buy(target);
 // Chance purchases stay attempts; they never simulate a guaranteed unlock.
 if(config.remainder!==false&&data.prime)while(true){let best=-1,score=0;for(const id of [11,13,14,15,16,17,18]){if(!allowed(id)||data.inactiveBonuses?.[id]||id===15&&levels[id]<2)continue;if(costs[id]>budget)continue;const weight=Number(config.weights?.[id]??1);const gain=weight*Math.log(value(id,levels[id]+1,data)/value(id,levels[id],data))/costs[id];if(gain>score){best=id;score=gain;}}if(best<0)break;buy(best);}
 return {spent:initial-budget,left:budget,rows:Object.entries(counts).map(([key,count])=>{const id=Number(key);return {id,name:shopNames[id],count,cost:count*costs[id],before:start[id],after:id===15&&start[id]<2?undefined:levels[id],chance:id===10?1-Math.pow(.99,count):id===15&&start[id]<2?1-Math.pow(.95,count):undefined};})};
}
const api={points,skulls,names,shopNames,costs,curves,value,impact,shopUnlocked,limits};if(typeof module==='object')module.exports=api;root.KillroyModel=api;
})(typeof window==='object'?window:globalThis);
