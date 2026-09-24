const assert=require('node:assert/strict');
const {decode}=require('./cog-board'),{idealBoard,evaluate,perfectRollExp}=require('./cog-optimizer-engine');
const order=Array(252).fill('Blank'),maps=Array.from({length:252},()=>({})),flags=Array(120).fill(-11);
order[26]='Player_Test';maps[26]={a:100,b:1000,c:10};
order[27]='Player_Second';maps[27]={a:50,b:500,c:5};
for(const [index,piece] of [[80,0],[81,1],[92,2],[93,3]]){order[index]='CogZA0'+piece;maps[index]={d:10};}
order[228]='CogSmb9';order[96]='Player_Production';maps[96]={a:50,b:200};
flags[0]=10;
const model=decode({CogO:order,CogM:maps,FlagU:flags,GemItemsPurchased:[]});
const snapshot=JSON.stringify(model),near=(a,b)=>assert(Math.abs(a-b)<Math.max(1,Math.abs(b))*1e-10);
assert.equal(perfectRollExp(4500,3),504);assert.equal(perfectRollExp(4500,4),560);
// Execute the actual client roll loop with maximum RNG, independent of our implementation.
const fs=require('node:fs'),vm=require('node:vm');
if(fs.existsSync('../audit/cog-client-readable.js')){
 const source=fs.readFileSync('../audit/cog-client-readable.js','utf8'),start=source.indexOf('for (var e = 0, t2 = 0 | this._dummynumber2;');
 const loop=source.slice(start,source.indexOf('if (0 == this._dummynumber)',start));
 for(const level of [1,100,4500,10000])for(const tier of [2,3,4]){
  const map=[{h:{a:0,c:0,d:0}}],ctx={_dummynumber2:4,_dummynumber3:0,_dummynumber4:0,_TRIGGEREDtext:String(tier),_GenINFO:Array(22).fill(0)};ctx._GenINFO[21]=level;
  vm.runInNewContext('(function(){'+loop+'}).call(ctx)',{ctx,a:{engine:{getGameAttribute:()=>map}},c:{asNumber:Number,randomInt:(lo,hi)=>hi,randomFloatBetween:(lo,hi)=>hi-1e-12},k:{_customBlock_getLOG:x=>Math.log(Math.max(x,1))/2.30259},Math});
  assert.equal(perfectRollExp(level,tier),map[0].h.d);
 }
}
assert(perfectRollExp(5000,4)>perfectRollExp(4500,4));
for(const jewels of [false,true])for(const fullBoard of [false,true]){
 const plan=idealBoard(model,{level:4500,jewels,fullBoard});
 assert.equal(plan.board.length,96);assert.equal(plan.characters.length,2);
 near(plan.score,plan.after.exp);near(evaluate(model,plan.slots).totals.exp,plan.after.exp);
 assert.equal(JSON.stringify(model),snapshot);assert.equal(plan.slots[96],model.slots[96]);assert.equal(plan.slots[228],model.slots[228]);
 assert.equal(evaluate(model,plan.slots).excogia.sets.length,1);
 if(!fullBoard)assert.equal(plan.slots[0],model.slots[0]);else assert.equal(plan.slots[0].locked,false);
 for(const target of plan.shopping){
  assert(jewels||target.tier!==4);assert.equal(target.d,perfectRollExp(4500,target.tier));
  assert.equal(target.boost,target.shape?target.tier===4?155:target.tier===3?65:40:0);
  for(const index of target.positions){assert(plan.board[index].ideal);assert.equal(plan.board[index].stats.d,target.d);}
 }
 for(const character of plan.characters)assert.equal(plan.board[character.to].name,character.name);
}
assert.throws(()=>idealBoard(model,{level:NaN}),/roll level/);
assert.throws(()=>idealBoard(decode({CogO:[]}),{level:100}),/usable EXP/);
// A three-tile column fixture checks the UP/DOWN orientation against independent geometry.
const narrow=decode({CogO:['Blank',...Array(11).fill('Blank'),'Player_One'],CogM:{12:{b:100,a:1}},FlagU:[-11,...Array(11).fill(1),-11,...Array(11).fill(1),-11]});
const plan=idealBoard(narrow,{level:100,jewels:false});assert.equal(Math.floor(plan.score),plan.after.exp);
assert.equal(plan.board[0].stats.h,'down');assert.equal(plan.board[24].stats.h,'up');
console.log('God board: perfect rolls, replay scoring, coverage, protected slots, options, characters and immutable saves pass');
