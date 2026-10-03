'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),M=require('./summoning-optimizer');
const box={window:{}};vm.runInNewContext(fs.readFileSync('world6-data.js','utf8'),box);const catalog=box.window.WORLD6_CATALOG;
const raw=(levels=Array(82).fill(1),balances=Array(8).fill(1e9))=>({Summon:[levels,[],balances],Holes:Array.from({length:29},()=>[]),KRbest:{},Spelunk:[[0,0,0,0,1]]});
const make=r=>M.snapshot(r,catalog),near=(a,b)=>assert(Math.abs(a-b)<1e-10*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
assert.equal(M.optimize(make({})).steps.length,0);
const r=raw(),model=make(r),copy=JSON.stringify(model);assert.equal(model.upgrades.length,82);assert.equal(M.colors[4],'Purple');
assert.equal(M.optimize(model,{percent:0}).steps.length,0);
let plan=M.optimize(model,{mode:'future',count:1000});assert.equal(plan.steps.length,1000);assert.equal(JSON.stringify(model),copy);
assert(M.collapse(plan.steps).length<plan.steps.length);near(M.collapse(plan.steps).reduce((n,x)=>n+x.cost,0),plan.steps.reduce((n,x)=>n+x.cost,0));
plan=M.optimize(model,{count:1000});assert(plan.remaining.every(n=>n>=0));for(let c=0;c<8;c++)near(model.balances[c]-plan.remaining[c],plan.needed[c]);
plan=M.optimize(model,{count:0,mode:'future'});assert.equal(new Set(plan.steps.map(x=>x.id)).size,plan.steps.length);
const beginner=make(raw(Array(82).fill(0)));plan=M.optimize(beginner,{goal:'damage',color:'0',mode:'future',count:5});assert.deepEqual(plan.steps.slice(0,3).map(x=>x.id),[0,1,3]);assert.equal(plan.steps[0].prerequisite,true);
assert(M.unlocked(beginner,beginner.upgrades[71]));beginner.tealUnlocked=false;assert(!M.unlocked(beginner,beginner.upgrades[71]));
const missing=make(raw(Array(82).fill(0),[null]));assert.equal(M.optimize(missing).steps.length,0);assert.equal(M.optimize(missing,{mode:'future'}).steps[0].shortfall,null);
const discounted=make(raw());const before=M.cost(discounted,discounted.upgrades[0]);discounted.levels[49]++;assert(M.cost(discounted,discounted.upgrades[0])<before);
const wrapped=make({data:JSON.stringify({...r,Summon:JSON.stringify(r.Summon)})});assert.deepEqual(wrapped.levels,model.levels);
// Execute the local game's actual handlers with outside discounts held at 1.
const clientPath=process.env.IDLEON_CLIENT_PATH||'../audit/N.js';
if(fs.existsSync(clientPath)){
 const source=fs.readFileSync(clientPath,'utf8'),marker='_customBlock_Summoning=',start=source.indexOf(marker)+marker.length;assert(start>=marker.length);let depth=0,quote='',escape=false,end;
 for(let i=start;i<source.length;i++){const ch=source[i];if(quote){if(escape)escape=false;else if(ch==='\\')escape=true;else if(ch===quote)quote='';continue;}if(ch==='"'||ch==="'")quote=ch;else if(ch==='{')depth++;else if(ch==='}'&&--depth===0){end=i+1;break;}}
 for(let trial=0;trial<5;trial++){
  const input=raw(Array.from({length:82},(_,i)=>(i*3+trial)%20));input.Holes[28]=[0,49,57,72,75];input.KRbest={SummzTrz0:2,SummzTrz5:3,SummzTrz6:1};const state=make(input),info=[];info[170]=Math.floor(state.levels.reduce((a,b)=>a+b,0)/100);
  const attrs={Summon:input.Summon,Holes:input.Holes,CustomLists:{h:{SummonUPG:catalog.SummonUPG}},DNSM:{h:{CalcTalentMAP:{h:{595:0}}}},OptionsListAccount:Array(400).fill(0),PixelHelperActor:Array.from({length:25},()=>({behaviors:{getBehavior:()=>({_GenINFO:info})}}))};
  const m={_customBlock_Thingies:(_,c)=>state.stones[c],_customBlock_SushiStuff:()=>0,_customBlock_ArcaneType:()=>0},env={a:{engine:{getGameAttribute:k=>attrs[k]}},c:{asNumber:Number},p:{_customBlock_getbonus2:()=>0},q:{_customBlock_JellyOperation:()=>0},D:{contains:(a,v)=>a.includes(v)},n:{__cast:x=>x},wa:{},m,Math};
  const call=vm.runInNewContext('('+source.slice(start,end)+')',env);m._customBlock_Summoning=call;
  for(const u of state.upgrades){near(M.bonus(state,u.id),call('SummUpgBonus',u.id,0));near(M.cost(state,u),call('UpgCost',u.id,0));}
 }
 console.log('Summoning: 820 direct game-handler comparisons passed');
}
console.log('Summoning optimizer tests passed');
