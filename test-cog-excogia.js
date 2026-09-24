'use strict';
const assert=require('node:assert/strict');
const {decode,optimize}=require('./cog-board');
const {evaluate}=require('./cog-optimizer-engine');
function fixture(groups=[[3,20,38,70]],unlocks=Array(120).fill(-11)){
 const order=Array(252).fill('Blank'),maps={};
 for(let i=0;i<96;i++){order[i]='Cog3A0';maps[i]={a:1,c:1,d:1};}
 order[95]='Player_Test';maps[95]={a:1e9,c:1e6,b:1e9};
 for(const group of groups)group.forEach((index,piece)=>{if(index==null)return;order[index]='CogZA0'+piece;maps[index]={a:1,c:1,d:1,h:'everything',e:999,f:999};});
 return decode({CogO:order,CogM:maps,FlagU:unlocks,GemItemsPurchased:Array(119).fill(0)});
}
function squares(board){const result=[];for(let i=0;i<84;i++)if(i%12<11&&[0,1,12,13].every((off,k)=>board[i+off].item==='CogZA0'+k))result.push(i);return result;}
function verify(model,mode,count){
 const snapshot=JSON.stringify(model),plan=optimize(model,mode,80),slots=model.slots.slice();
 assert.equal(squares(plan.board).length,count,mode+' assembled set count');
 for(const move of plan.moves){assert(move.from<96||move.from>=108&&move.from<228);assert(move.to<96);if(move.from<96)assert.equal(model.board[move.from].locked,false);assert.equal(model.board[move.to].locked,false);[slots[move.from],slots[move.to]]=[slots[move.to],slots[move.from]];}
 assert.deepEqual(slots.slice(0,96).map(s=>s.index),plan.board.map(s=>s.index));
 assert.equal(new Set([...plan.board,...plan.shelf].map(s=>s.index)).size,216);
 assert.equal(plan.excogiaAfter.sets.length,count);
 const player=plan.board.findIndex(s=>s.isPlayer);assert(player>=0,'retain productive player');
 assert.equal(plan.ratesAfter[player].boosts.exp,80*count);assert.equal(plan.ratesAfter[player].boosts.build,5*count);
 assert.equal(JSON.stringify(model),snapshot);assert(plan.after>=plan.before-1e-5);
 const replayed=evaluate(model,slots);assert.deepEqual(replayed.totals,plan.totalsAfter);
 return plan;
}
for(const mode of ['exp','build','flag']){
 verify(fixture(),mode,1);
 verify(fixture([[108,109,110,111]]),mode,1);
 verify(fixture([[0,1,108,109]]),mode,1);
 verify(fixture([[1,0,13,12]]),mode,1); // Correct pieces in the wrong order.
 verify(fixture([[3,20,38,70],[5,25,55,75]]),mode,2);
 verify(fixture([[0,1,12,13],[108,109,110,111]]),mode,2);
 verify(fixture([[0,1,12,13],[48,49,60,61]]),mode,2); // Never break existing sets.
 verify(fixture([[108,109,110,null]]),mode,0); // No fabricated fourth piece.
}
const locked=Array(120).fill(0);for(const i of [0,1,12,13,95])locked[i]=-11;
assert.deepEqual(squares(verify(fixture([[108,109,110,111]],locked),'exp',1).board),[0]);
const impossible=Array(120).fill(0);for(const i of [0,1,2,95])impossible[i]=-11;
verify(fixture([[108,109,110,111]],impossible),'exp',0);
const edge=fixture([[11,12,23,24]]);assert.equal(evaluate(edge).excogia.sets.length,0,'No wrapping at right edge');verify(edge,'exp',1);
for(let run=0;run<5;run++)verify(fixture(),'exp',1); // Must not rely on a lucky random permutation.
console.log('Excogia: separated, shelf, partial, mirrored, multiple, preassembled, missing, locked and edge cases; all objectives, replay, active bonuses and repeated searches pass');
