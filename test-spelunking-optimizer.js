'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),M=require('./spelunking-optimizer');
const box={window:{}};vm.runInNewContext(fs.readFileSync('world7-data.js','utf8'),box);const catalog=box.window.WORLD7_CATALOG.SpelunkUpg,raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),s=M.decode(raw,catalog),original=JSON.stringify(s);
assert(s&&s.skill>0);for(const goal of ['power','amber']){const p=M.plan(s,{goal,steps:100});assert.equal(p.steps.length,100);assert(p.gain>0);assert(Math.abs(p.steps.reduce((a,b)=>a+b.cost,0)-p.spent)<1);let state={...s,levels:[...s.levels]};for(const a of p.steps){assert.equal(a.from,state.levels[a.i]);assert.equal(a.cost,M.cost(state,a.i));state.levels[a.i]++;assert(a.to<=Number(catalog[a.i][3]));}assert.equal(JSON.stringify(s),original);}
const poor={...s,amber:0};assert.equal(M.plan(poor,{mode:'now'}).steps.length,0);const road=M.plan(poor,{steps:20});assert.equal(road.funding,road.spent);assert(road.steps.every(a=>a.future));const locked={...s,levels:catalog.map(()=>-1)};assert.equal(M.plan(locked).steps.length,0);const capped={...s,levels:catalog.map(x=>Number(x[3]))};assert.equal(M.plan(capped).steps.length,0);
const i=0,price=M.cost(s,i,.25);assert(Math.abs(M.calibration(s,i,price)-.25)<1e-10);const now=M.plan(s,{mode:'now',steps:500});assert(now.spent<=s.amber*(1+1e-12));assert.equal(now.funding,0);assert.equal(M.decode({},catalog),null);
console.log('Spelunking planner: sequential costs, goals, caps, locks, budgets, calibration and save immutability pass.');
// Combined scoring must measure proportional improvements to both goals.
const balanced=M.plan(s,{goal:'balanced',steps:1000});assert.equal(balanced.steps.length,1000);assert(balanced.powerGain>0&&balanced.amberGain>0);assert(balanced.steps.some(a=>a.powerGain>0));assert(balanced.steps.some(a=>a.amberGain>0));assert(Math.abs((1+balanced.gain)**2-(1+balanced.powerGain)*(1+balanced.amberGain))<1e-6);
let projected={...s,levels:[...s.levels]};for(const a of balanced.steps){const p=M.metric(projected,'power'),b=M.metric(projected,'amber');projected.levels[a.i]++;assert(Math.abs(M.metric(projected,'power')/p-1-a.powerGain)<1e-12);assert(Math.abs(M.metric(projected,'amber')/b-1-a.amberGain)<1e-12);}
const outside=M.plan(s,{goal:'outside',scope:'account',steps:100});assert(outside.steps.length);assert(outside.steps.every(a=>[47,48,49,50,62,63,64,65].includes(a.i)));assert.equal(outside.powerGain,0);assert.equal(outside.amberGain,0);assert(outside.effects.every(e=>e.after>e.before));assert(outside.steps.every(a=>a.effects.length===1));const utility=M.plan(s,{goal:'outside',scope:'utility',steps:100});assert(utility.steps.length);assert(utility.steps.every(a=>![47,48,49,50,62,63,64,65].includes(a.i)));
for(const [i,name,divisor] of [[-1,'Orange',1],[20,'Blue',1e3],[41,'Green',1e9],[51,'Red',1e21],[66,'Pink',1e36]]){const fixture={...s,levels:catalog.map(()=>0)};if(i>=0)fixture.levels[i]=1;assert.equal(M.amberTier(fixture).name,name);assert.equal(M.amberTier(fixture).divisor,divisor);}
const long=M.plan(s,{goal:'balanced',steps:5000});assert.equal(long.steps.length,5000);assert.equal(JSON.stringify(s),original);
console.log('Combined gains, 5,000-step plans, outside/utility filters and client Amber denominations pass.');
// Amber yield includes the primary capped roll and the expected extra-drop roll.
const rocks={...s,levels:catalog.map(()=>0),delveDepth:1,clearedDepths:0};
assert.equal(M.amberChances(rocks).drop,.15);assert.equal(M.amberChances(rocks).extra,.05);
rocks.levels[7]=10;const rawBonus=25*10;assert.equal(M.amberChances(rocks).drop,(15+45*rawBonus/(250+rawBonus))/100);
const noSwap=M.metric(rocks,'amber');rocks.levels[67]=1;const expectedSwapRatio=15/10*((1+.05/20)/(1+.05));assert(Math.abs(M.metric(rocks,'amber')/noSwap-expectedSwapRatio)<1e-12);
rocks.levels[52]=10000;assert.equal(M.amberChances(rocks).drop,.8,'80% cap applies after Supply Swap division');
rocks.levels[42]=10;assert.equal(M.amberChances(rocks).extra,.15/20);
const capState={...s,levels:[...s.levels],elixirPreservation:20};capState.levels[26]=40;const refill=M.misc.find(x=>x.i===26),atCap=M.source(capState,refill);capState.levels[26]++;assert.equal(atCap,60);assert.equal(M.source(capState,refill),60);
const tutorial={...s,tutorialStep:7};assert.equal(M.metric(tutorial,'power'),2);assert.equal(M.plan(tutorial,{goal:'power'}).steps.length,0);
const deeper={...s,delveDepth:20,clearedDepths:10};assert(M.metric(deeper,'amber')>M.metric({...s,delveDepth:1,clearedDepths:0},'amber'));
// An otherwise eligible Supply Swap must be evaluated as an Amber purchase.
const swapOnly={...rocks,levels:catalog.map(x=>Number(x[3])),amber:1e250};swapOnly.levels[67]=0;assert(M.plan(swapOnly,{goal:'amber',steps:1}).steps.some(x=>x.i===67));
console.log('Expected Amber rolls, Supply Swap, shared preservation cap, run depth and tutorial lock pass.');
// Plateau upgrades rank the full cost of reaching the next useful breakpoint.
const milestones={...s,statueDoubleBonus:0,levels:catalog.map(x=>Number(x[3])),amber:0};milestones.levels[48]=140;
const milestonePlan=M.plan(milestones,{goal:'outside',scope:'account',steps:20});assert.equal(milestonePlan.steps.length,10);assert(milestonePlan.steps.every(x=>x.i===48));assert(milestonePlan.steps.slice(0,-1).every(x=>x.effects.length===0));assert.equal(milestonePlan.steps.at(-1).effects[0].after,4);assert.equal(milestonePlan.spent,milestonePlan.funding);
assert.equal(M.plan(milestones,{goal:'outside',scope:'account',steps:9}).steps.length,0,'Do not spend on a partial breakpoint');assert.equal(M.plan(milestones,{goal:'outside',scope:'account',mode:'now',steps:20}).steps.length,0);
const memory={...milestones,levels:catalog.map(x=>Number(x[3]))};memory.levels[58]=90;const memories=M.plan(memory,{goal:'outside',scope:'utility',steps:20});assert.equal(memories.steps.length,10);assert.equal(memories.steps.at(-1).effects[0].after,2);
console.log('Rounded statue and memorized-elixir breakpoint batches preserve budget and purchase limits.');
