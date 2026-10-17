'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),M=require('./sneaking-optimizer');
const box={window:{}};vm.runInNewContext(fs.readFileSync('world6-data.js','utf8'),box);const catalog=box.window.WORLD6_CATALOG;
const near=(a,b)=>assert(Math.abs(a-b)<=Math.max(1,Math.abs(b))*1e-10,`${a} != ${b}`);
const raw={data:{Ninja:Array.from({length:108},()=>[]),Lv0_0:Array(18).fill(100),Spelunk:Array.from({length:14},()=>[])},charNames:['Test Ninja']};
raw.data.Ninja[103]=Array(32).fill(1);raw.data.Ninja[102][1]=1e50;raw.data.Spelunk[13][3]=15;
let s=M.snapshot(raw,catalog);assert.equal(s.characters[0].level,100);assert.equal(s.characters[0].name,'Test Ninja');
// Independent client branch examples, including late lore and every 100th level discounts.
near(M.cost(s,13),50*(1+.08/(1+1/1500))/1.01);
near(M.cost(s,31),1e55*1e20*1e15/1.01);
near(M.cost(s,4),48000*1.35/1.01/1.15);
s.levels[8]=100;near(M.cost(s,8,{scale:.5,conduitDiscount:2}),1250*1.1**100/1.01/1.05*.25);
s.levels[8]=1;near(M.metric(s,'jade',100),2*1.03);near(M.metric(s,'stealth',100),110*1.05);
s.omni[13]=10;near(M.metric(s,'stealth',100),1110*1.05);near(M.cost(s,13),50*(1+.08/(1+1/1500))/1.01);s.omni=[];
const original=JSON.stringify(s);for(const goal of Object.keys(M.goals)){const p=M.optimize(s,{goal,level:100,count:30});assert(p.steps.length>0);assert(p.spent<=p.budget);assert(p.gain>0);const replay={...s,levels:[...s.levels]};for(const step of p.steps){assert(M.unlocked(replay,step.id));near(step.cost,M.cost(replay,step.id));assert.equal(step.from,replay.levels[step.id]);replay.levels[step.id]++;}assert.deepEqual(p.levels,replay.levels);near(p.gain,M.metric(replay,goal,100)/M.metric(s,goal,100)-1);}
assert.equal(JSON.stringify(s),original);assert.equal(M.optimize(s,{level:100,percent:0}).steps.length,0);assert(M.optimize(s,{level:100,percent:0,mode:'future'}).steps.length>0);
assert.equal(M.optimize(s,{level:0}).steps.length,0);assert.equal(M.optimize(M.snapshot({},catalog),{level:100}).steps.length,0);
const early=M.snapshot(raw,catalog);early.levels.fill(0);early.lore=0;early.balance=1e9;
assert(!M.unlocked(early,23));const p=M.optimize(early,{goal:'jade',level:100,count:10});assert(p.steps.length>0);assert.equal(p.steps[0].id,13);assert(p.steps.some(x=>x.id===14));assert(p.steps.some(x=>x.id===8));assert(!p.steps.some(x=>x.id>16));
const example=JSON.parse(fs.readFileSync('../example json.txt','utf8')),real=M.snapshot(example,catalog);assert(real.characters.length>0);assert(real.available);for(const goal of Object.keys(M.goals)){const p=M.optimize(real,{goal,level:real.characters[0].level,mode:'future',count:200});assert(p.steps.length>0);assert(Number.isFinite(p.spent));}
console.log('Sneaking optimizer: client costs, unlocks, Omnijade, both goals, budget, replay, missing data and immutable saves pass.');

near(M.metric(s,'exp',100),1.03*1.05);near(M.metric(s,'doors',100),1.04*1.02);near(M.metric(s,'items',100),1.01);near(M.metric(s,'recovery',100),1.02);assert(M.optimize(s,{goal:'exp',mode:'future'}).steps.length>0);
