'use strict';
const assert=require('node:assert/strict'),{arenaSlots,assign,recommendArena,spiceRoles}=require('./breeding-teams');
for(const [wave,slots] of [[0,2],[1,2],[2,3],[14,3],[15,4],[49,4],[50,5],[124,5],[125,6],[200,6],[null,null]])assert.equal(arenaSlots(wave),slots);
const data={species:[{id:'a',gene:'Refiller',unlocked:true},{id:'b',gene:'Refiller',unlocked:true}],inventory:[{key:'1',id:'a',gene:'Refiller',power:100},{key:'2',id:'a',gene:'Refiller',power:90},{key:'3',id:'b',gene:'Refiller',power:80}]};
assert.deepEqual(assign(data,['Refiller','Refiller'],{uniqueSpecies:true}).map(x=>x.pet.key),['1','3']);
const used=new Set();assert.deepEqual(assign(data,['Refiller','Refiller'],{used}).map(x=>x.pet.key),['1','2']);assert.equal(assign(data,['Refiller'],{used})[0].pet.key,'3');assert.equal(assign(data,['Refiller'],{used})[0].state,'hatch');
assert.equal(assign({...data,inventory:[],species:data.species.map(s=>({...s,unlocked:false}))},['Refiller'])[0].state,'unlock');
const rows=spiceRoles(10,'balanced',9,true);assert.deepEqual(rows[0],['Alchemic','Alchemic','Alchemic','Converter']);for(let i=4;i<10;i++)assert(rows[i-1].includes('Forager'),'every Borger row has a Forager above');
const noConverter=spiceRoles(8,'balanced',7,false);assert.equal(new Set(noConverter[7]).size,4,'Miasma remains active without Converter');
const focus=spiceRoles(8,'focus',4,true);assert.deepEqual(focus[3],['Badumdum','Badumdum','Badumdum','Forager']);assert.equal(focus[4][0],'Borger');assert(focus[5].every(g=>g==='Badumdum'));
assert.equal(spiceRoles(1,'focus',0,true)[0][0],'Opticular');assert.equal(spiceRoles(1,'power',0,true)[0][0],'Forager');
for(const mode of ['focus','power'])for(let target=0;target<10;target++){const plan=spiceRoles(10,mode,target,true);for(let i=0;i<plan.length;i++)if(plan[i].includes('Borger'))assert(plan[i-1]?.includes('Forager'),'focused changes preserve downstream Borger support');}
assert.equal(recommendArena({inventory:[],species:['Mercenary','Cursory','Refiller','Defender'].map(gene=>({gene,unlocked:true}))},4).id,'four-early');
console.log('Breeding teams: slot thresholds, unique combat species, global inventory allocation, availability and neighboring spice synergies pass.');
