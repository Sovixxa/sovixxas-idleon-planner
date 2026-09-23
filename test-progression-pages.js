'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
for(const file of ['progression-models.js','progression-pages.js','arcade-pages.js','world4.js','world5.js','world6.js','cooking.js','beanstalk.js'])new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});
const b={console:{log(){},warn(){},error(){}},structuredClone};b.self=b;vm.createContext(b);b.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8'),b));let result;b.postMessage=x=>{result=structuredClone(x);};vm.runInContext(fs.readFileSync('bonus-worker.js','utf8'),b);const save=JSON.parse(fs.readFileSync('../example json.txt','utf8'));b.onmessage({data:save});assert(!result.error,result.error);const g=result.groups;
assert.equal(g.petArena.length,16);assert(g.petArena.every(x=>x.status==='maxed'));
for(const key of ['petArena','shinyPets','upgradeVault','emperorBonuses'])for(const r of g[key]){assert(r.name&&r.effect);assert(!/undefined|NaN|[{}$]/.test(r.effect),key+': '+r.effect);assert(fs.existsSync(r.icon),r.icon);}
assert(g.emperorBonuses.some(x=>x.next&&x.projection.includes('Next kill')));assert(g.emperorBonuses.some(x=>!x.next));
assert.equal(g.tome.length,121);assert(g.tome.some(x=>x.status==='maxed'));assert(g.tome.filter(x=>x.status==='maxed').every(x=>x.bounded));assert(g.tome.every(x=>x.progress>=0&&x.progress<=1));
assert(g.slab.length>1900);assert(g.slab.some(x=>x.status==='missing'));assert(g.slab.some(x=>x.name==='Copper Ore'&&x.status==='maxed'));
assert.equal(b.ProgressionModels.fmt(9e83),'9.00e83');assert.equal(b.ProgressionModels.fmt(100000000),'100M');assert.equal(b.ProgressionModels.fmt(25000),'25K');
assert.equal(Object.keys(b.ProgressionModels.build(new Map())).length,0);
const models=b.BonusSystems.systems(save),emp=models.get('emperor');for(let kill=0;kill<96;kill++){const clone={...emp,emperorKills:kill};const rows=b.ProgressionModels.build(new Map([['emperor',clone]])).emperorBonuses;assert.equal(rows.filter(x=>x.next).length,1,'exactly one next-kill reward at '+kill);assert.equal(rows.filter(x=>x.second).length,1,'exactly one second-kill reward at '+kill);for(const r of rows){assert.equal(r.levelTwo,r.levelOne+(r.second?1:0));assert(!/undefined|NaN|[{}$]/.test(r.afterTwo));if(!r.second)assert.equal(r.afterTwo,r.afterOne);}}
const shell=fs.readFileSync('index.html','utf8');assert(shell.includes('progression-pages.js'));assert(!shell.includes('id="navRefinery"'));assert(shell.indexOf('id="navUpgradeVault"')>shell.indexOf('<span>Misc</span>'));assert(shell.indexOf('id="navUpgradeVault"')<shell.indexOf('<span>World 1</span>'));
console.log('Progression pages: syntax, worker rows, Tome caps, Slab discovery, 96 Emperor projections, sprites and navigation pass.');
