const assert=require('node:assert/strict');
const {decode}=require('./cog-board');
const order=Array(252).fill('Blank');order[0]='Cog3A1';order[11]='CogCry1';order[12]='Player_Test';order[96]='Player_Worker';order[108]='Cog0A0';order[228]='CogSma2';
const flags=Array(120).fill(-11);flags[95]=400;flags[108]=0;
const data={CogO:JSON.stringify(order),CogM:JSON.stringify({0:{d:123,h:'row',e:45},11:{h:{a:5}},12:{a:999}}),FlagU:flags,FlagP:[95,108,-1,-1],Lv0_0:[0,0,0,0,0,0,0,0,123],CharacterClass_0:36};
const result=decode(data,{charNames:['Test','Worker']});
assert.equal(result.board.length,96);assert.equal(result.board[0].stats.h,'row');assert.equal(result.board[0].stats.d,123);assert.equal(result.board[11].stats.a,5);assert.equal(result.board[12].level,123);assert.equal(result.board[12].classId,36);assert.equal(result.production[0].name,'Worker');assert.equal(result.shelf[0].item,'Cog0A0');assert.equal(result.left[0].stats.tinyBuild,700);assert.equal(result.right[0].flag,true);assert.equal(result.board[95].locked,true);assert.equal(result.placed,2);
assert.equal(decode({}).available,false);assert.equal(decode({CogOrder:order,CogMap:[]}).board[0].locked,null);
assert.equal(data.CogM,JSON.stringify({0:{d:123,h:'row',e:45},11:{h:{a:5}},12:{a:999}}));
console.log('Cog board: saved positions, sparse maps, spatial h key, character mapping, rails, shelf and flags OK');

const {optimize}=require('./cog-board');
const oo=Array(252).fill('Blank'),mm={},uu=Array(120).fill(0);
for(let i=0;i<4;i++)uu[i]=-11;
oo[0]='Player_Test';mm[0]={a:100,b:10,c:100};
oo[1]='Cog3A0';mm[1]={a:1,c:1,d:1};
oo[108]='CogCry1';mm[108]={a:1000,c:1000,d:100,h:'row',e:50,f:50,g:50};
oo[4]='Cog3A0';mm[4]={a:99999,c:99999,d:99999};
const fixture=decode({CogO:oo,CogM:mm,FlagU:uu});const snapshot=JSON.stringify(fixture);
for(const mode of ['exp','flag','build']){
 const plan=optimize(fixture,mode,150);
 assert(plan.after>plan.before,mode+' must improve');assert(plan.moves.length>0);
 assert.equal(plan.board[4].index,4,'locked tile stays put');
 const replay=fixture.slots.slice();for(const m of plan.moves)[replay[m.from],replay[m.to]]=[replay[m.to],replay[m.from]];
 assert.deepEqual(replay.slice(0,96).map(s=>s.index),plan.board.map(s=>s.index));
 assert.equal(new Set([...plan.board,...plan.shelf].map(s=>s.index)).size,216);
 assert.equal(JSON.stringify(fixture),snapshot);
}
const missing=decode({});assert.equal(optimize(missing,'exp',0).moves.length,0);
console.log('Cog optimizer: EXP, flaggy, build, special cogs, locked tiles, sequential swaps and immutable data OK');
