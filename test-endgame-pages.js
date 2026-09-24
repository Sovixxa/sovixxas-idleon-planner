'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
for(const f of ['endgame-models.js','research-page.js','gallery.js','app.js'])new vm.Script(fs.readFileSync(f,'utf8'),{filename:f});
const b={console:{log(){},warn(){},error(){}},structuredClone};b.self=b;vm.createContext(b);b.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8'),b));let result;b.postMessage=x=>result=structuredClone(x);vm.runInContext(fs.readFileSync('bonus-worker.js','utf8'),b);b.onmessage({data:JSON.parse(fs.readFileSync('../example json.txt','utf8'))});assert(!result.error,result.error);const g=result.groups;
for(const key of ['spelunking','research','researchObservations','sushi','button','clamworks','meritocracy','bigFish','coralKid','coralReef','dancingCoral','zenithMarket','legendTalents']){assert(g[key]?.length,key);for(const r of g[key]){assert(r.name&&r.effect,key);assert(!/undefined|NaN/.test(r.effect),r.effect);if(r.icon)assert(fs.existsSync(r.icon),r.icon);}}
for(const group of ['Floors & Discoveries','Upgrades','Daily Lore'])assert(g.spelunking.some(x=>x.group===group),group);
assert(g.spelunking.find(x=>x.floorKind==='tunnel').icon.includes('CaveDoor'));
assert(g.spelunking.some(x=>x.group==='Daily Lore'&&x.detail.includes('99% of scaling component')));
assert.equal(g.legendTalents.length,40);assert.equal(g.zenithMarket.length,11);assert(g.button.some(x=>x.group==='Tasks & next presses'));assert(g.sushi.length>100);
const nav=fs.readFileSync('index.html','utf8');assert(nav.includes('navMinigames'));for(const id of ['navCoralKid','navDarts','navHoops'])assert(!nav.includes('id="'+id+'"'));
console.log('Endgame: complete page groups, lore breakpoints, actual sprites, Button tasks, Sushi stations and navigation pass.');

for(const x of g.spelunking.filter(x=>x.floorKind==='discovery'))assert(g.spelunking.some(t=>t.floorKind==='tunnel'&&t.floor===x.floor));

