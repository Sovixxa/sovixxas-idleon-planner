'use strict';
const assert=require('node:assert/strict'),M=require('./cove-optimizer');
const fixture=()=>({levels:Array(24).fill(0),balances:Array(12).fill(100),kills:1e6,normalDR:1e4,purchases:0,study:2,studyKnown:true,ribbons:2,unlocked:true});
assert.equal(M.decode({}),null);
const options=Array(669).fill(0),holes=Array.from({length:27},()=>[]);holes[1][0]=18;holes[26][17]=10;options[654]=123;options[630]=4;
const raw={data:{OptLacc:JSON.stringify(options),Holes:JSON.stringify(holes),Ribbon:[0,15,0]}};
assert.equal(M.decode(raw).balances[0],123);assert.equal(M.decode(raw).levels[0],4);assert.equal(M.decode(raw).ribbons,2);
assert.equal(M.decode({OptionsListAccount:options,Holes:holes}).study,10);
for(const g of M.goals){const s=fixture(),snapshot=JSON.stringify(s),p=M.plan(s,{goal:g.id,mode:'now',steps:50});assert.equal(JSON.stringify(s),snapshot,'No save mutation');const replay=fixture();for(const step of p.steps){assert.equal(step.cost,M.cost(replay,step.id));assert.equal(step.shortfall,0);assert(replay.balances[step.shape]>=step.cost);assert(M.buy(replay,step.id,false));}assert.deepEqual(p.state,replay);assert(p.gain>=0);assert(!p.steps.some(x=>x.id===23));}
const locked=fixture();locked.unlocked=false;assert.equal(M.plan(locked).steps.length,0);
locked.unlocked=true;locked.balances.fill(0);assert.equal(M.plan(locked).steps.length,0,'Roadmaps do not invent discovered shapes');
const ribbon=fixture();assert.equal(M.plan(ribbon,{goal:'ribbon',steps:100}).steps.filter(x=>x.id===5).length,2);ribbon.ribbons=null;assert.equal(M.plan(ribbon,{goal:'ribbon'}).steps.length,0);
const discount=fixture();discount.levels[1]=10;const c1=M.cost(discount,1);discount.purchases=2;assert(M.cost(discount,1)>c1,'Study discount expires');
const exact=fixture();exact.balances[0]=1;assert(M.buy(exact,0,false));assert.equal(exact.balances[0],.1,'Game retains discovered-shape marker');
const roadmap=M.plan(fixture(),{goal:'drop',steps:100});assert.equal(roadmap.steps.length,100);assert(roadmap.funding.some(n=>n>0));
console.log('Cove optimizer: decoding, budgets, replay, locks, ribbons, study expiry and roadmap passed.');
