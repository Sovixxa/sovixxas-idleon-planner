'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),M=require('./sushi-model');
const box={window:{}};vm.runInNewContext(fs.readFileSync('world7-data.js','utf8'),box);const catalog=box.window.WORLD7_CATALOG;
const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),snapshot=JSON.stringify(raw);
const context={superbit:100,factors:[{name:'test external bonus',value:1.2}]},s=M.decode(raw,catalog,context),base=M.calculate(s);
assert.equal(base.knowledge[0].perfectChance,Math.min(1,.6*(1+base.totals[10]/100)));
assert.equal(base.knowledge[63].perfectChance,Math.min(1,.6*.81**63/(1+63/8)*(1+base.totals[10]/100)));
assert.equal(M.decode({},catalog,context),null);assert.equal(base.knowledge.length,64);assert.equal(base.unique,64);
assert(base.knowledge.filter(x=>x.discovered&&!x.perfecto).length>0);assert(Number.isFinite(base.bucksPerHour)&&base.bucksPerHour>0);
assert(base.knowledge[63].effect&&!base.knowledge[63].effect.includes('{'));
assert.equal(M.decode({data:JSON.stringify(raw.data)},catalog,context).tiers[2],s.tiers[2]);
for(const goal of ['bucks','knowledge','fuel']){
  const proposed=M.optimize(s,goal),after=M.calculate(proposed),metric=goal==='bucks'?'bucksPerHour':goal==='knowledge'?'totalXpDaily':'fuel';
  assert.deepEqual([...proposed.tiers].sort((a,b)=>a-b),[...s.tiers].sort((a,b)=>a-b));assert.deepEqual(proposed.plates,s.plates);assert(after[metric]>=base[metric]);
  for(let i=0;i<120;i++)if(s.plates[i]<0)assert.equal(proposed.tiers[i],s.tiers[i]);
}
const poor={...s,misc:s.misc.slice()};poor.misc[3]=0;assert(M.upgrades(poor).filter(x=>x.available&&!x.maxed).every(x=>!x.affordable&&x.wait>0));
const locked={...s,levels:s.levels.map(()=>0)};assert.equal(M.upgrades(locked).filter(x=>x.available&&!x.maxed).length,1);
assert.equal(M.calculate(locked).totalXpDaily,0);
const cold={...s,tiers:s.tiers.map(()=>-1),plates:s.plates.map(()=>0),fires:s.fires.map(()=>-1)};cold.tiers[0]=5;cold.plates[0]=2;
const coldModel=M.calculate(cold);assert(coldModel.xpDaily.slice(0,5).every(x=>x>0));assert(coldModel.xpDaily.slice(5).every(x=>x===0));
const pink={...cold,fires:[3,...cold.fires.slice(1)]};assert(M.calculate(pink).xpDaily[0]>coldModel.xpDaily[0]);
assert.equal(JSON.stringify(raw),snapshot,'Plans must never mutate the imported save');
console.log('Sushi model: full knowledge coverage, inventory-preserving plans, unlocks, funding, cold/pink EXP, and save immutability passed.');

// Compare formulas against the locally supplied game client, when available.
const clientPath=process.env.IDLEON_CLIENT_PATH||'../audit/N.js';
if(fs.existsSync(clientPath)){
 const source=fs.readFileSync(clientPath,'utf8'),marker='_customBlock_SushiStuff=',start=source.indexOf(marker)+marker.length;assert(start>=marker.length);
 let depth=0,quote='',escape=false,handler;
 for(let i=start;i<source.length;i++){const ch=source[i];if(quote){if(escape)escape=false;else if(ch==='\\')escape=true;else if(ch===quote)quote='';continue;}if(ch==='"'||ch==="'")quote=ch;else if(ch==='{')depth++;else if(ch==='}'&&--depth===0){handler=source.slice(start,i+1);break;}}
 let checks=0;
 for(const scale of [0,1,5])for(const fire of [0,1,3,4]){
   const state=structuredClone(s);state.levels=state.levels.map(x=>Math.floor(x*scale));state.fires=state.fires.map(()=>fire);
   const su=[state.tiers,state.plates,state.levels,state.fires,state.misc,state.tracking,state.xp,state.knowledge];
   const attrs={Sushi:su,CustomLists:{h:{Research:catalog.Research,SushiUPG:catalog.SushiUPG}},DNSM:{h:{}},BundlesReceived:{h:{bon_v:state.bundle-1}},Sailing:[[],[],[],Array(40).fill(0)]};
   const m={_customBlock_AtomCollider:()=>0,_customBlock_Summoning:()=>0,_customBlock_GamingStatType:()=>1,_customBlock_Minehead:()=>0,_customBlock_Thingies:()=>state.jellyBundle-1,_customBlock_ResearchStuff:()=>0};
   const env={Math,Object,m,a:{engine:{getGameAttribute:key=>attrs[key]}},c:{asNumber:Number},k:{_customBlock_Log2:x=>Math.log2(Math.max(1,x)),_customBlock_getLOG:x=>Math.log(Math.max(1,x))/2.302585},p:{_customBlock_ArcadeBonus:()=>20,_customBlock_AtomCollider:()=>0},q:{_customBlock_JellyOperation:()=>state.jellyDiscount}};
   m._customBlock_SushiStuff=vm.runInNewContext('('+handler+')',env);const game=(name,t=0,i=0)=>m._customBlock_SushiStuff(name,t,i),actual=M.calculate(state);
   game('OrangeFireSum',-1);
   const near=(a,b,label)=>{assert(Math.abs(a-b)<=1e-10*Math.max(1,Math.abs(b)),label+': '+a+' vs '+b);checks++;};
   near(actual.fuel,game('FuelGen'),'fuel');near(actual.cap,game('FuelCap'),'capacity');near(actual.currencyMulti,game('CurrencyMulti'),'currency multiplier');near(actual.bucksPerHour,game('CurrencyperHR',-1),'income');near(actual.combo,game('ComboMulti'),'combo');
   for(let i=0;i<46;i++)near(M.cost(state,i,actual),game('UpgCost',i),'cost '+i);
   for(let i=0;i<64;i++){near(actual.knowledge[i].perfectChance,Math.min(1,game('PerfectOdds',i)),'Perfecto chance');near(actual.knowledge[i].required,game('KnowledgeXP_req',state.knowledge[i]),'xp requirement');near(actual.knowledge[i].bonus,game('KnowledgeBonusSpecific',i),'knowledge bonus');}
 }
 console.log('Sushi real-client formula comparisons passed:',checks);
}

