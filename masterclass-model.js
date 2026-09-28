(function(root){'use strict';
const configs={grimoire:{title:'Grimoire',className:'Death Bringer',save:'Grimoire',art:'Grimoire',prefix:'Bone',currencies:['Femur','Ribcage','Cranium','Bovinae']},compass:{title:'Compass',className:'Wind Walker',save:'Compass',art:'Compass',prefix:'Dust',currencies:['Stardust','Moondust','Solardust','Cooldust','Novadust']},tesseract:{title:'Tesseract',className:'Arcane Cultist',save:'Arcane',art:'Tesseract',prefix:'Tach',currencies:['Purple','Brown','Green','Red','Silver','Gold']},royalArmory:{title:'Royal Armory',className:'Royal Guardian',save:'RoyalG',art:'RoyalArmory',prefix:'RGres',currencies:[]}};
const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v;}catch{return null;}};
const valid=v=>v!=null&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=0;
function snapshot(key,raw,systems){const cfg=configs[key],data=parse(raw?.data)||raw||{};
 if(!Array.isArray(parse(data[cfg.save])))return {available:false,upgrades:[],balances:{}};
 if(key==='royalArmory'){const m=root.RoyalArmory.model(raw),r=parse(data.RoyalG),stored=parse(r[1])||[];return {available:true,balances:Object.fromEntries(stored.map((v,i)=>[i,valid(v)?Number(v):null])),upgrades:m.upgrades.filter(x=>x.slot>=0).sort((a,b)=>a.slot-b.slot).map(x=>{const c=root.ROYAL_ARMORY_CATALOG.upgrades.find(c=>c.index===x.id);return {...x,effect:x.description,currency:c.costResourceIndex,costModel:{kind:'royal',base:c.baseCost,growth:c.costScaling},cost:x.level==null?null:x.id===46&&x.level<3?2:x.id===58&&x.level<1?3:25*Math.pow(1.24,x.slot)*(3+5*x.slot)*c.baseCost*Math.pow(c.costScaling,x.level),icon:`assets/RAupg${x.id}.png`,group:`Shelf ${Math.floor(x.slot/10)+1}`};})};}
 const s=systems.get(key),balances=s?.resources||s?.availableDust||{};
 return {available:true,balances,upgrades:(s?.upgrades||[]).map(x=>({id:x.id,name:x.data.name,level:x.level,max:x.data.maxLevel??x.data.max_level,unlocked:x.unlocked,cost:x.cost,currency:x.data.dustType??x.data.x1,costModel:{kind:key==='compass'?'exponential':'scaled',base:x.data.base_cost,growth:key==='compass'?x.data.costMult:x.data.scaling_factor+.01},effect:x.getDescription(s.upgrades),icon:`assets/${x.getImageData().location}.png`,group:x.data.upgradeType||cfg.title}))};
}
// Goals identify relevant descriptions, not simulated total stat gains.
const goals=[
 {id:'all',label:'All upgrades'},
 {id:'damage',label:'Damage & critical hits',pattern:/damage|critical|crit\b/i},
 {id:'accuracy',label:'Accuracy',pattern:/accuracy/i},
 {id:'defence',label:'Defence & survivability',pattern:/defen[cs]e|health|\bhp\b|surviv/i},
 {id:'speed',label:'Attack speed',pattern:/attack speed|attack rate/i},
 {id:'resources',label:'Masterclass resource gains',pattern:/bone|dust|tachyon|resource|collection|drop/i},
 {id:'drops',label:'Drop rate & drop chance',pattern:/drop rate|drop chance|chance.*drop|extra.*drop/i},
 {id:'experience',label:'Experience gains',pattern:/\bexp\b|experience|\bxp\b/i},
 {id:'talents',label:'Talent points & levels',pattern:/talent/i},
 {id:'collection',label:'Resource collection & replenishment',pattern:/collection|replenish|refill/i},
 {id:'trading',label:'Trading rank & Trader units',pattern:/trad(er|ers|e|ing)/i},
 {id:'outposts',label:'Outpost points & ranks',pattern:/outpost|\bpts\b/i},
 {id:'statues',label:'Statues & enchantments',pattern:/statue|enchantment|parchment/i},
 {id:'costs',label:'Cheaper upgrades',pattern:/cheaper|cost.*reduc|reduc.*cost|discount/i},
 {id:'account',label:'Account-wide bonuses',pattern:/account|all characters|all players/i}
];
const matchesGoal=(x,id)=>id==='all'||!!goals.find(g=>g.id===id)?.pattern?.test(x.name+' '+x.effect);
const availableGoals=model=>goals.filter(g=>g.id==='all'||model.upgrades.some(x=>matchesGoal(x,g.id)));
// Cheapest first within each currency; each upgrade contributes one next level.
function optimize(model,{percent=100,goal='all',mode='now',count=0}={}){
 if(Number(count)>0)return repeatPlan(model,{percent,goal,mode,count});
 const future=mode==='future',fraction=Math.max(0,Math.min(100,Number(percent)||0))/100;
 const remaining=Object.fromEntries(Object.entries(model.balances).filter(([,v])=>valid(v)).map(([k,v])=>[k,Number(v)*fraction]));
 const candidates=model.upgrades.filter(x=>valid(x.level)&&x.level<x.max&&matchesGoal(x,goal));
 const locked=candidates.filter(x=>x.unlocked!==true);
 const eligible=candidates.filter(x=>x.unlocked===true&&(future||valid(x.cost)&&valid(remaining[x.currency]))).sort((a,b)=>a.currency-b.currency||(valid(a.cost)?a.cost:Infinity)-(valid(b.cost)?b.cost:Infinity)||a.id-b.id),steps=[];
 for(const x of eligible){const knownCost=valid(x.cost),knownBalance=valid(model.balances[x.currency]),before=remaining[x.currency];
  if(!future&&(!knownCost||!knownBalance||x.cost>before))continue;
  const shortfall=knownCost&&knownBalance?Math.max(0,x.cost-before):null;
  if(knownCost&&knownBalance)remaining[x.currency]-=x.cost;
  steps.push({...x,shortfall,affordable:shortfall===0});
 }
 return {steps,remaining,locked:future?locked:[],needed:Object.fromEntries(Object.entries(remaining).map(([k,v])=>[k,Math.max(0,-v)]))};
}
// Project level-dependent cost growth with account discounts held fixed.
function costAt(x,level){
 if(level===x.level)return x.cost;
 const c=x.costModel;if(!c||!valid(x.cost))return null;
 if(c.kind==='royal')return x.id===46&&level<3?2:x.id===58&&level<1?3:25*Math.pow(1.24,x.slot)*(3+5*x.slot)*c.base*Math.pow(c.growth,level);
 if(c.kind==='exponential')return x.cost*Math.pow(c.growth,level-x.level);
 if(c.kind==='scaled'){const raw=l=>l+(c.base+l)*Math.pow(c.growth,l);return x.cost*raw(level)/raw(x.level);}
 return null;
}
function repeatPlan(model,{percent,goal,mode,count}){
 const limit=Math.max(1,Math.min(1000,Math.floor(Number(count)||1))),future=mode==='future',fraction=Math.max(0,Math.min(100,Number(percent)||0))/100;
 const remaining=Object.fromEntries(Object.entries(model.balances).filter(([,v])=>valid(v)).map(([k,v])=>[k,Number(v)*fraction]));
 const candidates=model.upgrades.filter(x=>valid(x.level)&&x.level<x.max&&matchesGoal(x,goal)),locked=candidates.filter(x=>x.unlocked!==true),pool=candidates.filter(x=>x.unlocked===true).map(x=>({source:x,level:x.level}));
 const currencies=[...new Set(pool.map(x=>x.source.currency))].sort((a,b)=>a-b),steps=[];
 while(steps.length<limit){let added=false;
  for(const currency of currencies){const choices=pool.filter(x=>x.source.currency===currency&&x.level<x.source.max).map(x=>({x,cost:costAt(x.source,x.level)})).filter(v=>valid(v.cost)&&(future||remaining[currency]!=null&&v.cost<=remaining[currency])).sort((a,b)=>a.cost-b.cost||a.x.source.id-b.x.source.id);
   if(!choices.length)continue;
   const {x,cost}=choices[0],known=remaining[currency]!=null,shortfall=known?Math.max(0,cost-remaining[currency]):null;
   if(known)remaining[currency]-=cost;
   steps.push({...x.source,level:x.level,cost,shortfall,affordable:shortfall===0,position:steps.length+1});x.level++;added=true;
   if(steps.length>=limit)break;
  }
  if(!added)break;
 }
 return {steps,remaining,locked:future?locked:[],requested:limit,needed:Object.fromEntries(Object.entries(remaining).map(([k,v])=>[k,Math.max(0,-v)]))};
}
function collapseSteps(steps){const groups=new Map();for(const [i,x] of steps.entries()){const key=x.currency+':'+x.id;let row=groups.get(key);if(!row){row={...x,count:0,cost:0,endLevel:x.level,firstPosition:i+1};groups.set(key,row);}row.count++;row.cost+=x.cost;row.endLevel=x.level+1;row.shortfall=x.shortfall;row.affordable=row.affordable&&x.affordable;}return [...groups.values()];}
const api={configs,snapshot,optimize,availableGoals,costAt,collapseSteps};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MasterclassModel=api;
})(typeof self!=='undefined'?self:globalThis);
