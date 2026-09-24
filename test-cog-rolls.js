const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('./cog-optimizer-engine'),{decode}=require('./cog-board');
const spelunk=[];spelunk[18]=[];spelunk[18][18]=5;const gaming=[];gaming[12]='G';const opts=[];opts[414]=7;
assert.deepEqual(E.jewelAllowance({Gaming:gaming,Spelunk:spelunk,OptLacc:opts}),{unlocked:true,points:5,daily:11,used:7,remaining:4});
assert.equal(E.jewelAllowance({Gaming:JSON.stringify(gaming),Spelunk:JSON.stringify(spelunk)}).daily,11);
assert.equal(E.jewelAllowance({Gaming:{h:{12:''}}}).daily,0);
assert.equal(E.jewelAllowance({}).daily,null);assert.equal(E.jewelAllowance({Gaming:gaming}).daily,null);
opts[414]=99;assert.equal(E.jewelAllowance({Gaming:gaming,Spelunk:spelunk,OptLacc:opts}).remaining,0);
// Compare complete sampled stats to the actual game function for every family.
if(fs.existsSync('../audit/cog-client-readable.js')){
 const source=fs.readFileSync('../audit/cog-client-readable.js','utf8'),start=source.indexOf('_customEvent_WorkbenchStuff2: function() {')+'_customEvent_WorkbenchStuff2: function() {'.length;
 const code=source.slice(start,source.indexOf('if (this._TRIGGEREDtext.indexOf("l")',start));
 const yangCode=source.split('\n').find(line=>line.includes('"around" ==')&&line.includes('this._dummynumber5 /'));
 for(const level of [1,100,4500,20000]){
  const map=[{h:{h:'around',e:40,g:40}}];
  vm.runInNewContext('(function(){var e,t2,i,s,r;'+yangCode+'}).call(ctx)',{ctx:{_dummynumber5:level},a:{engine:{getGameAttribute:()=>map}},Math,Object});
  assert.deepEqual({buildBoost:map[0].h.e,expBoost:map[0].h.f},E.cogSpecialStats(level).yang);assert.equal(map[0].h.g,undefined);
 }
 for(let tier=0;tier<=4;tier++)for(let seed=1;seed<=120;seed++){
  const rng=E.cogRandom(seed),actual=E.rollCog(4500,tier,E.cogRandom(seed)),attributes={Tasks:[0,0,0,0,0,[0,0,0]],CogMap:[{h:{a:0,c:0,d:0}}],CogOrder:[]};
  const ctx={_TRIGGEREDtext:'k'+tier,_dummynumber3:0,_GenINFO:Array(22).fill(0),_customEvent_WorkbenchStuff:()=>{}};ctx._GenINFO[21]=4500;
  vm.runInNewContext('(function(){'+code+'}).call(ctx)',{ctx,a:{engine:{getGameAttribute:key=>attributes[key]}},c:{asNumber:Number,randomInt:(a,b)=>a+Math.floor(rng()*(b-a+1)),randomFloat:rng,randomFloatBetween:(a,b)=>a+rng()*(b-a)},y:{replace:(s,a,b)=>s.replace(a,b)},D:{mapCount:v=>Object.keys(v.h).length},p:{_customBlock_WorkbenchStuff:()=>0},k:{_customBlock_getLOG:x=>Math.log(Math.max(x,1))/2.30259},Math});
  assert.deepEqual(actual.stats,attributes.CogMap[0].h,`Client sample tier ${tier}, seed ${seed}`);
  if(tier===4)assert.equal(actual.item,attributes.CogOrder[0]);
 }
}
assert.deepEqual(E.cogSpecialStats(4500).yang,{buildBoost:167,expBoost:207});
for(let tier=0;tier<=4;tier++){
 const caps=E.cogRollCaps(4500,tier),rng=E.cogRandom(49);
 for(let i=0;i<2000;i++){const c=E.rollCog(4500,tier,rng);assert(c.stats.a<=caps.build&&c.stats.c<=caps.flag&&c.stats.d<=caps.exp);}
 assert.equal(caps.exp,E.perfectRollExp(4500,tier));
}
const order=Array(252).fill('Blank'),maps=Array.from({length:252},()=>({}));order[13]='Player_Test';maps[13]={b:1e9,a:100};order[108]='CogCry4';maps[108]={d:120,h:'row',f:120};
const model=decode({CogO:order,CogM:maps,FlagU:Array(120).fill(-11),GemItemsPurchased:[]}),snapshot=JSON.stringify(model);
const plan=E.realisticBoard(model,{level:4500,days:2,dailyJewels:1,dailyLimit:1,ordinaryDaily:5});
assert.equal(plan.forecast.jewelRolls,2);assert.equal(plan.forecast.ordinaryRolls,10);assert(plan.forecast.newJewels<=2);assert(plan.forecast.newOrdinary<=10);
assert(plan.after.exp>=plan.before.exp);assert(plan.forecast.low<=plan.after.exp&&plan.after.exp<=plan.forecast.high);
assert.equal(JSON.stringify(model),snapshot);assert.equal(E.evaluate(model,plan.slots).totals.exp,plan.after.exp);
for(const s of plan.board.filter(s=>s.forecast))assert(s.index>=252);
const zero=E.realisticBoard(model,{level:4500,days:0,dailyJewels:0,ordinaryDaily:0});assert.equal(zero.shopping.length,0);
assert.throws(()=>E.realisticBoard(model,{level:100,dailyJewels:2,dailyLimit:1}),/allowance/);
assert.throws(()=>E.realisticBoard(model,{level:100,ordinaryTier:4}),/Ordinary/);
assert.throws(()=>E.realisticBoard(model,{level:100,days:365,ordinaryDaily:5000}),/200,000/);
console.log('Cog rolls: 600 client RNG comparisons, all-family maxima, daily allowance, bounded forecasts and immutable saves pass');
