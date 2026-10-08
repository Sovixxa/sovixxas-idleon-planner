'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),B=require('./bubble-bonuses');
const box={window:{}};vm.runInNewContext(fs.readFileSync('alchemy-data.js','utf8'),box);const catalog=box.window.ALCHEMY_CATALOG;
const options=[];options[384]='';const raw={CauldronInfo:catalog.map(g=>g.bubbles.map(()=>10)),OptLacc:options};
let report=B.model(raw,catalog,{prismaMulti:2});const ids=Object.values(B.CATEGORIES).flatMap(s=>s.split(' '));
assert.equal(report.entries.length,133);assert.equal(new Set(ids).size,133);assert.equal(ids.length,133);
assert(report.entries.every(e=>ids.includes(e.id)&&e.label&&fs.existsSync(e.icon)));
assert.equal(report.groups.reduce((n,g)=>n+g.entries.length,0),133);
const row=id=>report.entries.find(e=>e.id===id);
assert.equal(row('O5').value,'Character-dependent');assert.equal(row('Y7').value,'Character-dependent');
assert.match(row('O24').qualifier,/250 STR/);assert.match(row('G2').badges.join(' '),/activation/);
assert.equal(row('O10').category,'combat');assert.equal(row('Y17').category,'production');assert.match(row('Y17').value,/×/);
const plain=row('O0').effective;report=B.model(raw,catalog,{prismaMulti:2},true);assert(report.entries.find(e=>e.id==='O0').effective>plain);
raw.CauldronInfo[0][0]=0;assert.equal(B.model(raw,catalog).entries.find(e=>e.id==='O0').value,'Locked');
assert(B.model({},catalog).entries.every(e=>e.value==='Unknown'));
const snapshot=JSON.stringify(raw);B.model(raw,catalog);assert.equal(JSON.stringify(raw),snapshot);
console.log('Bubble bonuses: all 133 sources categorized once, units, scaling qualifiers, activation, class context, unknown/locked values and purity pass.');
for(const target of [80,90,95,99,99.9]){
 const entries=B.model(raw,catalog,{prismaMulti:2},false,target).entries;
 const damage=entries.find(e=>e.id==='O10');
 assert(Math.abs(damage.target-damage.ceiling*target/100)<1e-9);
 assert.equal(damage.targetLabel,target+'% target');
 assert.match(damage.summary.target.text,new RegExp(String(target).replace('.','\\.')+'% checkpoint'));
}
console.log('Bubble bonus dropdown targets: 80, 90, 95, 99 and 99.9 percent pass.');

const mc=require('./masterclass-model');
const actual=B.model(JSON.parse(fs.readFileSync('../example json.txt','utf8')),catalog,{prismaMulti:2}).entries;
const soul=actual.find(r=>r.name==='DMG OF THE SOUL');
const tachyon=actual.find(r=>r.name==='TACHYON BUBBLE');
assert(soul&&tachyon);
assert.equal(soul.label,'Total damage');
assert.equal(tachyon.label,'Arcane Cultist tachyon gain');
const mcBubbles=actual.map(r=>({source:'Alchemy Bubbles',name:r.name,effect:r.summary.effect,scopeEffect:r.description,benefitText:r.label}));
assert.deepEqual(mc.bonusRows('tesseract',{},mcBubbles).map(r=>r.name),['TACHYON BUBBLE']);
assert.equal(mc.bonusRows('tesseract',{},[{source:'Alchemy Bubbles',name:'DMG OF THE SOUL',effect:'+3800% Total Damage',benefitText:'Arcane Cultist tachyon gain'}]).length,0);
console.log('Actual save/catalog: soul damage excluded, tachyon bubble retained, labels aligned');

for(const [key,name] of [['grimoire','BONE BUBBLE'],['compass','DUST BUBBLE'],['tesseract','TACHYON BUBBLE'],['royalArmory','ROYAL RICHES']])assert.deepEqual(mc.bonusRows(key,{},mcBubbles).map(r=>r.name),[name]);
