'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),M=require('./masterclass-model');
const b={console:{log(){},warn(){},error(){}},structuredClone};b.self=b;vm.createContext(b);
b.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8'),b));
let result;b.postMessage=x=>result=structuredClone(x);vm.runInContext(fs.readFileSync('bonus-worker.js','utf8'),b);
const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8'));b.onmessage({data:raw});assert(!result.error,result.error);
const rows=Object.fromEntries(Object.keys(M.configs).map(k=>[k,M.bonusRows(k,result.groups)]));
for(const [key,arcade,charm,exotic,epilogue] of [['grimoire','Deathbringer Bones','Glimmerchain','BONEMEAL SOIL','Epilogue 1'],['compass','Windwalker Dust','Twinkle Taffy','FORCE OF NAUTRE','Epilogue 3'],['tesseract','Arcane Tachyons','Mystery Fizz','PURPLE GRASS','Epilogue 7']]){
 for(const name of [arcade,charm,exotic,epilogue,'Paper Pint','Masterclass Drops'])assert(rows[key].some(r=>r.name===name),key+': '+name);
 assert(rows[key].some(r=>r.source.startsWith('Talents ·')));
 const emperor=rows[key].find(r=>r.source==='Emperor');assert(emperor.effect.startsWith('+'));assert.equal(M.bonusType(emperor),'additive');
 const vial=rows[key].find(r=>r.name==='Paper Pint');assert.match(vial.effect,/2.019×/);assert.equal(M.bonusType(vial),'multi');
 const jewel=rows[key].find(r=>r.source==='Lab Jewels');assert.equal(M.bonusType(jewel),'additive');
 const x=rows[key].find(r=>r.name===exotic);const data=typeof raw.data==='string'?JSON.parse(raw.data):raw.data||raw;const farm=typeof data.FarmUpg==='string'?JSON.parse(data.FarmUpg):data.FarmUpg;const id={grimoire:53,compass:54,tesseract:55}[key],level=Number(farm[20+id]);assert(Math.abs(Number(x.effect.match(/[\d.]+/)[0])-160*level/(1000+level))<.001);
}
assert(rows.royalArmory.some(r=>r.name==='Kingdom Resources'));
assert(rows.royalArmory.some(r=>r.name==='Marble Drop Rate'));
assert(rows.royalArmory.some(r=>r.source==='Orblet Market'));
assert(rows.royalArmory.some(r=>r.name==='Castle Convene'));
for(const name of ['Paper Pint','Masterclass Drops','Xtra Masterclass Drops','Turquoise Hardhat','Merit 25'])assert(!rows.royalArmory.some(r=>r.name===name),name);
for(const [key,list] of Object.entries(rows)){
 const ids=list.map(r=>r.source+'|'+r.name);assert.equal(new Set(ids).size,ids.length,'duplicate '+key);
 for(const r of list){if(r.icon)assert(fs.existsSync(r.icon),r.icon);assert(!/NaN|undefined/.test(r.effect),r.name);const c=M.bonusCaps(r);assert(c.maximum&&c.hard&&c.soft&&c.target);}
 assert(!list.some(r=>/DMG OF THE SOUL|Wraith Overlord|Dustwalker|Tachyon Truth/.test(r.name)));
}
// Explicit scope remains correct when the wording is generic.
assert.equal(M.bonusRows('royalArmory',{foo:[{name:'shared',effect:'2x All Masterclass Drops'}]}).length,0);
assert.equal(M.bonusRows('compass',{},[],[{name:'Elemental Destruction',effect:'All elemental damage is +100% higher',group:'Elemental'}]).length,1);
console.log('MC audit: verified source identities, exact exotic values, RG exclusions, pool classification, unique rows, icons and cap coverage passed');
