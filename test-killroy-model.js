'use strict';
const assert=require('node:assert/strict'),m=require('./killroy-model');
const d={options:Array(500).fill(0),dream:[0,0,0,0,3],prime:true};d.options[112]=200;d.options[466]=3;
let p=m.points(d,{budget:3,goal:'kills',spawn:false});assert.equal(p.steps.length,3);assert(p.steps.every(x=>x.index===0));assert.equal(d.options[106],0);
p=m.points(d,{budget:2,goal:'pearls'});assert.equal(p.steps[0].index,5);
const locked={...d,options:Array(500).fill(0),dream:[]};assert.equal(m.points(locked,{budget:2,goal:'pearls'}).steps.length,0);
let s=m.skulls(d,{budget:103,target:5,quantity:100,remainder:false});assert.equal(s.rows[0].count,25);assert.equal(s.left,3);
d.options[417]=49;s=m.skulls(d,{budget:100,target:5,quantity:20,remainder:false});assert.equal(s.rows[0].count,1);
d.options[227]=1;assert.equal(m.skulls(d,{budget:100,target:10,quantity:20,remainder:false}).rows.length,0);
d.options[227]=0;s=m.skulls(d,{budget:40,target:10,quantity:10,remainder:false});assert.equal(s.rows[0].count,10);assert(Math.abs(s.rows[0].chance-(1-.99**10))<1e-12);
s=m.skulls(d,{budget:300,target:15,quantity:2});assert.equal(s.rows.find(x=>x.id===15).count,2);assert.equal(s.rows.find(x=>x.id===15).after,undefined);
assert.equal(m.skulls({...d,prime:false},{budget:200}).spent,0);
for(let budget=0;budget<300;budget++){s=m.skulls(d,{budget});assert(s.spent<=budget);assert.equal(s.spent+s.left,budget);assert(s.rows.every(r=>r.id!==19&&r.cost===r.count*m.costs[r.id]));}
assert.equal(d.options[228],0);console.log('Killroy: point unlocks, budgets, weekly cap, chance purchases, Prime gate, immutable save pass.');

const catalog=require('./vendor/idleon-toolbox/data/website-data/shared-data.json').killRoySkullShop;
assert.deepEqual(m.costs,catalog.map(x=>x.x1),'prices match checked-in game catalog');
const fs=require('node:fs'),vm=require('node:vm'),errors=[],box={structuredClone,console:{error:(...args)=>errors.push(args.join(' ')),log(){},warn(){}}};vm.createContext(box);box.importScripts=(...files)=>files.forEach(file=>vm.runInContext(fs.readFileSync(file,'utf8'),box));let response;box.postMessage=r=>response=r;vm.runInContext(fs.readFileSync('killroy-worker.js','utf8'),box);box.onmessage({data:JSON.parse(fs.readFileSync('../example json.txt','utf8'))});assert(!response.error,response.error);assert.deepEqual(errors,[]);assert.equal(response.result.schedule.length,20);assert.equal(response.result.schedule[0].classes.length,response.result.killroy.rooms);assert(response.result.schedule.every(w=>w.monsters.every(Boolean)));box.onmessage({data:{}});assert(response.error);console.log('Killroy worker: complete save, 20 rotations, monsters and missing-save handling pass.');

// Applied factors differ from the misleading shop multiplier text.
assert.equal(m.value(16,0),1.01);assert(Math.abs(m.value(16,200)-1.0165)<1e-12);
assert(Math.abs(m.value(17,150)-1.014)<1e-12);
assert(m.value(16,1e12)<1.023);assert(m.value(17,1e12)<1.018);
assert(m.value(11,1e12)<2);assert(m.value(13,1e12)<10);assert(m.value(14,1e12)<3);
const noBillroy={...d,options:[...d.options]};noBillroy.options[466]=2;
assert(!m.shopUnlocked(noBillroy,15));assert(m.shopUnlocked(noBillroy,14));
assert.equal(m.skulls(noBillroy,{budget:300,target:16,quantity:20,remainder:false}).spent,0);
assert(m.skulls(noBillroy,{budget:300}).rows.every(r=>r.id<15));
const bal=m.points(d,{budget:8,goal:'balanced',spawn:true});assert.deepEqual(bal.levels.slice(0,3),[4,0,4]);assert(bal.steps.every(x=>x.index===0||x.index===2));
const early=m.points({...d,options:Array(500).fill(0)},{budget:18,goal:'balanced'});assert(early.steps.slice(0,16).every(x=>x.index===0));assert(early.steps.slice(16).every(x=>x.index===2));
assert.equal(m.points(d,{budget:8,goal:'balanced',spawn:false}).steps.map(x=>x.index).join(),bal.steps.map(x=>x.index).join());
const diluted={...d,otherPools:{15:9,18:100}};assert(m.value(18,1,diluted)/m.value(18,0,diluted)<m.value(18,1)/m.value(18,0));
console.log('Killroy audit: applied percent factors, asymptotes, Billroy gate, additive dilution and balanced points pass.');

