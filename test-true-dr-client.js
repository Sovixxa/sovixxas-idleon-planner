'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const tables=require('./true-dr-tables'),math=require('./true-dr-math'),ui=require('./true-dr');
const rows=ui.rowsFrom(require('./vendor/idleon-toolbox/data/website-data/monsterDrops.json'),require('./vendor/idleon-toolbox/data/website-data/monsters.json'),require('./vendor/idleon-toolbox/data/website-data/shared-data.json').mapEnemiesArray);
const source=fs.readFileSync('../audit/N.js','utf8');
function fn(name){const start=source.indexOf(name+'=function');let i=source.indexOf('{',start),depth=1,quote=null,escape=false;for(let j=i+1;j<source.length;j++){const c=source[j];if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote=null;continue;}if(c==='"'||c==="'")quote=c;else if(c==='{')depth++;else if(c==='}'&&!--depth)return source.slice(start+name.length+1,j+1);}throw Error(name);}
let seed=1337;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};let dr=1,rare=0;
const attrs={DummyNumbersStatManager:{h:{}},DNSM:{h:{}},CustomMaps:{h:{MonsterDrops:{h:tables.monsters},DropTables:{h:tables.tables}}},QuestComplete:{h:new Proxy({},{get:()=>0})},PrinterXtra:[]};
const ctx={a:{engine:{getGameAttribute:k=>attrs[k]}},c:{asNumber:Number,randomFloat:rand,randomFloatBetween:(lo,hi)=>lo+(hi-lo)*rand()},h:{string:String},n:{__cast:x=>x},m:{_customBlock_Thingies:()=>0},x:{_customBlock_TotalStats:()=>dr,_customBlock_ArbitraryCode:()=>1},k:{_customBlock_GetTalentNumber:()=>rare}};vm.createContext(ctx);
ctx.k._customBlock_DropOdds=vm.runInContext('('+fn('k._customBlock_DropOdds')+')',ctx);
const generate=vm.runInContext('('+fn('x._customBlock_GenerateMonsterDrops')+')',ctx);
// Direct comparison of every branch of the client random-roll function.
let branchChecks=0;
for(const n of [1,2,3,10,100,10000])for(const p of [1e-9,.001,.01,.1,.5,1,1.1,1.9,2,2.01]){
 dr=1;const dist=math.roll(n,p);for(const u of [0,.0001,.1,.25,.5,.75,.999999]){ctx.c.randomFloat=()=>u;const native=ctx.k._customBlock_DropOdds(n,p);let cumulative=0,expected=dist.at(-1)[0];for(const [q,w] of dist){cumulative+=w;if(u<cumulative){expected=q;break;}}assert.equal(expected,native,`roll n=${n}, p=${p}, u=${u}`);branchChecks++;}}
ctx.c.randomFloat=rand;
let checked=0;
// Deterministic branches across every supported source, ordinary item, and rare table.
for(const rate of [1000,250833.33333333334]){
 dr=rate;rare=30;
 for(const monster of new Set(rows.filter(r=>!r.unsupported).map(r=>r.source))){
  const actual=new Map(generate(1,monster).map(([id,q])=>[id,q]));
  for(const row of rows.filter(r=>r.source===monster&&!r.unsupported&&!r.special&&!r.candy)){
   const result=math.evaluate(row.routes,dr,{rareMultiplier:1.3});
   if(result.min===result.max){assert.equal(actual.get(row.icon)||0,result.mean,`${monster}/${row.icon} @ ${dr}`);checked++;}
  }
 }
}
// Stochastic paths: compare means and receipt chances, not just rounded expected counts.
for(const rate of [1,10,100]){
 dr=rate;rare=30;const selected=rows.filter(r=>r.source==='Crystal0'&&!r.special&&!r.candy),sums=new Map();const n=16000;
 for(let i=0;i<n;i++)for(const [id,q] of generate(1,'Crystal0')){const prev=sums.get(id)||[0,0,0];prev[0]+=q;prev[1]+=q*q;prev[2]++;sums.set(id,prev);}
 for(const row of selected){const expected=math.evaluate(row.routes,dr,{rareMultiplier:1.3}),[sum,sq,count]=sums.get(row.icon)||[0,0,0],mean=sum/n,variance=Math.max(0,sq/n-mean*mean);assert(Math.abs(mean-expected.mean)<7*Math.sqrt(variance/n)+.003,`${row.icon} mean @ ${rate}: ${mean} vs ${expected.mean}`);assert(Math.abs(count/n-expected.chance)<7*Math.sqrt(expected.chance*(1-expected.chance)/n)+.002,`${row.icon} chance @ ${rate}`);}
}
console.log(`Native client parity: ${branchChecks} roll boundaries, ${checked} deterministic item/source cases, 48,000 Crystal Carrot simulations passed.`);

const {wraithStats}=require('./drop-rate-model');
for(const level of [0,10,1000]){
 const bonuses=Array.from({length:60},(_,i)=>(i+1)*level),options=Array.from({length:400},(_,i)=>(i+1)*level),total=1234,form=275,marauder=42;
 const actual=wraithStats(bonuses,options,total,form,marauder);
 for(const [name,field] of [['Grimoire_DMG','damage'],['Grimoire_ACC','accuracy']]){
  const start=source.indexOf('"'+name+'"==e)return')+name.length+12,end=source.indexOf(';if(',start);
  const expression=source.slice(start,end);
  const native=vm.runInNewContext(expression,{a:{engine:{getGameAttribute:()=>options}},c:{asNumber:Number},m:{_customBlock_Summoning:(key,i)=>key==='GrimoireUpgTotal'?total:bonuses[i]},k:{_customBlock_GetTalentNumber:(_,i)=>i===195?form:marauder,_customBlock_getLOG:v=>Math.log(Math.max(v,1))/2.30259}});
  assert(Math.abs(actual[field]-native)<=Math.max(1,native)*1e-12,name+' parity');
 }
}
console.log('Death Bringer Wraith damage / accuracy native parity passed.');
// Test the item actor stage that runs AFTER GenerateMonsterDrops.
const actorStart=source.indexOf('0==this._PlayerDroppedItem&&('),actorEnd=source.indexOf(',"DungCredits1"',actorStart);
assert(actorStart>0&&actorEnd>actorStart);
const actorContext={a:{engine:{getGameAttribute:()=>({h:{bon_k:0}})}},c:{randomFloat:()=>0},m:{}};
vm.createContext(actorContext);
const initializeStack=vm.runInContext('(function(){'+source.slice(actorStart,actorEnd)+';return this._DropAmount;})',actorContext);
let stackChecks=0;
for(const pack of [1,2])for(const chance of [0,25,50,100,150])for(const legend of [0,49,50,600])for(const upgrade of [0,200])for(const item of ['FoodG4','EquipmentStatues1','Grasslands1']){
 actorContext.a.engine.getGameAttribute=()=>({h:{bon_k:pack===2?1:0}});
 actorContext.m._customBlock_ArcaneType=()=>chance;
 actorContext.m._customBlock_Thingies=()=>legend;
 actorContext.m._customBlock_Spelunk=()=>upgrade;
 let total=0;
 for(let i=0;i<100;i++){actorContext.c.randomFloat=()=>(i+.5)/100;total+=initializeStack.call({_PlayerDroppedItem:0,_DropType:item,_DropAmount:574});}
 const bonus=math.stackBonus(item,{stackBonuses:{pack,goldenChance:{value:chance},statueChance:{value:chance},legend,statueUpgrade:upgrade}});
 assert(Math.abs(total/100-574*bonus.factor)<1e-8,`${item} stack ${pack}/${chance}/${legend}/${upgrade}`);stackChecks++;
}
console.log(`Native post-drop actor: ${stackChecks} pack/proc/rounding/item combinations passed.`);
const orbStart=source.indexOf('e=Math.round((1+Math.floor(c.randomFloat()+c.asNumber(n.__cast');
const orbEnd=source.indexOf(',r._DummyList=x._customBlock_GenerateMonsterDrops(e',orbStart);
assert(orbStart>0&&orbEnd>orbStart);
const liveInfo=[];const orbContext={e:0,ma:{},r:{_MonsterType:'Crystal0'},a:{engine:{getGameAttribute:()=>Array.from({length:9},()=>({behaviors:{getBehavior:()=>({_GenINFO:liveInfo})}}))}},n:{__cast:x=>x},c:{asNumber:Number,randomFloat:()=>0},p:{_customBlock_Breeding:()=>1}};
vm.createContext(orbContext);
const nativeOrb=vm.runInContext('(function(){'+source.slice(orbStart,orbEnd)+';return e;})',orbContext);
for(const score of [0,50,100,150,1000])for(const crystal of [1,1.5,2.25]){
 liveInfo[77]=score;orbContext.p._customBlock_Breeding=()=>crystal;
 let avg=0;for(let i=0;i<100;i++){orbContext.c.randomFloat=()=>(i+.5)/100;avg+=nativeOrb()/100;}
 const expected=math.iterations('Crystal0',{orbScore:score,crystalRolls:crystal}).reduce((s,[n,p])=>s+n*p,0);
 assert(Math.abs(avg-expected)<1e-10);
}
console.log('Native Orb roll count and Crystal Embiggener rounding: 15 combinations passed.');
