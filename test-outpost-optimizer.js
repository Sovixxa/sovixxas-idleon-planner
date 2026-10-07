'use strict';
const assert=require('node:assert/strict'),O=require('./outpost-optimizer');
const map={id:1,supported:true,count:20,respawn:8,hp:100,damage:1000,skillDamage:1000,hitChance:1};
const c={index:3,currentMap:1,name:'RG',hasDI:false,knowsDI:true,warbound:2,armory:100,orblet:10,fish:10,jelly:25,militiaArmory:100,creditPerKill:6,militiaPerHour:24000,riChance:.05,riMobs:10,orb:{learned:true,regalExtra:1},cards:[],guardianEquipped:true,guardianDuration:60,maps:[map,{...map,id:2}],militiaByWorld:[3],upgrades:[{key:'armory',name:'Active clearing',level:25,maxLevel:1000,step:4,unlocked:true,where:'Royal Armory'},{key:'militiaArmory',name:'Militia clearing',level:4,maxLevel:1000,step:25,unlocked:true,where:'Royal Armory'},{key:'orblet',name:'Orblet',level:10,maxLevel:10,step:1,unlocked:true,where:'Orblet Market'}]};
const rows=[{id:1,name:'A',world:1,remaining:1e6,militia:1},{id:2,name:'B',world:1,remaining:1e3,militia:0},{id:3,name:'Locked',world:2,remaining:1,militia:0,locked:true}];
const original=JSON.stringify([rows,c]);
const r=O.analyze(rows,c,{mapId:1});
assert.equal(r.row.id,1);assert(r.actions.some(a=>a.id==='di'));assert(r.actions.some(a=>a.id==='armory'));assert(!r.actions.some(a=>a.id==='orblet'),'Capped upgrades excluded');
assert.equal(r.actions.find(a=>a.id==='militia').gain,24000);
assert.equal(r.maps[0].id,2);assert(!r.maps.some(m=>m.id===3));
assert.deepEqual(r.actions.map(a=>a.id),O.analyze(rows,c,{mapId:1,targets:{armory:300,militiaArmory:200}}).actions.map(a=>a.id),'Editing gains must not reorder cards');
assert.equal(JSON.stringify([rows,c]),original,'Optimizer must not mutate save or calculator');
const noUnits=O.analyze(rows,{...c,militiaByWorld:[1]},{mapId:1,di:true});assert(!noUnits.actions.some(a=>a.id==='militia'||a.id==='di'));
const noMilitia=O.analyze(rows,c,{mapId:2});assert(!noMilitia.actions.some(a=>a.id==='militiaArmory'),'Militia-only bonus cannot improve a map with no militia');
const sample={enabled:true,character:3,map:1,count:1000,seconds:374};const measured=O.analyze(rows,c,{mapId:1,sample});assert(measured.calibrated);
const upgrade=measured.actions.find(a=>a.id==='armory');assert(Math.abs(upgrade.gain-measured.base.activeKills*.12)<1e-8,'Upgrade applies credit bonus once to measured physical kills');
assert(!O.analyze(rows,c,{mapId:2,sample}).calibrated,'Orb sample stays on its own map');
assert.equal(O.analyze(rows.filter(r=>r.locked),c).row,null);
assert.equal(O.analyze(rows,null).row,null);
assert(!O.html({...r,row:{...r.row,name:'<script>'},eligible:[{...r.row,name:'<script>'}]}).includes('<script>'));
console.log('Outpost optimizer: ranked marginal gains, caps, militia availability, DI, map scope, sample isolation, empty states and immutability passed.');

assert.equal(r.batch,1);assert.match(r.actions.find(a=>a.id==='armory').title,/25 → 26/);
const capped=O.analyze(rows,{...c,upgrades:[{...c.upgrades[0],level:998}]},{mapId:1,levels:25});assert.match(capped.actions.find(a=>a.id==='armory').title,/998 → 1000/);
assert(r.combined.count===2);assert(r.combined.rate>r.actions.find(a=>a.id==='armory').rate);
assert(!O.html(r).includes('Check the in-game cost'));

const expanded={...c,optimizerInputs:{warbound:{x1:5,x2:400},fish:{level:200,scale:15},regal:{level:200,x1:5,x2:150,y2:20,market:0}},fish:10};
const expandedResult=O.analyze(rows,expanded,{mapId:1,di:true,levels:25});
assert(expandedResult.actions.some(a=>a.id==='warbound'));assert(expandedResult.actions.some(a=>a.id==='fish'));assert(!expandedResult.actions.some(a=>a.id==='wave'));
assert(expandedResult.combined.count===4);
const warboundTarget=1+5*(100+25)/(400+100+25);
const warboundAction=expandedResult.actions.find(a=>a.id==='warbound');
assert(Math.abs(warboundAction.rate/expandedResult.base.creditPerHour-warboundTarget/2)<1e-10);
const richMap={...map,damage:60,skillDamage:60,hitChance:.5,crystal:{chance:.03,rawChance:.03,chainChance:0,guaranteed:0,hp:150,normal:{damage:300,skillDamage:300,hitChance:1},di:{damage:300,skillDamage:300,hitChance:1}}};
const gaps={...expanded,maps:[richMap],ownedCombatCards:[{name:'Accuracy card',effect:'{% Accuracy',bonus:10,equipped:false},{name:'Equipped card',effect:'{% Accuracy',bonus:10,equipped:true}]};
const gapsResult=O.analyze(rows,gaps,{mapId:1,di:false});
assert(gapsResult.actions.some(a=>a.id==='chocolatey'));
for(const id of ['wave','normalDamage','accuracy','crystalDamage','crystalAccuracy','crystalCap','respawn'])assert(!gapsResult.actions.some(a=>a.id===id),'No hypothetical performance target: '+id);
assert.equal(gapsResult.ownedCards.length,1);
assert(!O.analyze(rows,{...expanded,maps:[{...map,respawn:4}]},{mapId:1,di:true}).actions.some(a=>a.id==='normalDamage'||a.id==='accuracy'||a.id==='respawn'),'Do not suggest already-satisfied targets');
console.log('Expanded optimizer: Warbound and Advice Fish formulas, combined gains, combat gaps, chip/spawn targets and owned-card filtering passed.');

assert(!O.html(expandedResult).includes('20% faster'));

const personal=O.analyze(rows,expanded,{mapId:1,di:true,targets:{armory:27,fish:201,warbound:101}});
assert.equal(personal.actions.find(a=>a.id==='armory').editor.target,27);
assert.equal(personal.actions.find(a=>a.id==='fish').editor.target,201);
assert.equal(personal.actions.find(a=>a.id==='warbound').editor.target,101);
const unchanged=O.analyze(rows,c,{mapId:1,targets:{armory:25}});assert.equal(unchanged.actions.find(a=>a.id==='armory').gain,0);
assert(O.html(personal).includes('data-outpost-target="armory"'));

// An upgraded outpost finishes sooner and consumes a different share of the
// finite daily crystal allowance. Scaling the old average gives 792s vs 472s.
const Model=require('./outpost-eta-model');
const finiteRow={id:1,world:1,name:'Finite crystals',remaining:10000,militia:0};
const finiteCharacter=Model.customize({...c,warbound:1,armory:100,orblet:0,fish:0,jelly:25,militiaArmory:0,riChance:0,riMobs:0,maps:[{...map,count:10,respawn:12,damage:100,skillDamage:100,crystal:{chance:0,chainChance:.75,guaranteed:100,hp:100,normal:{damage:100,skillDamage:100,hitChance:1},di:{damage:100,skillDamage:100,hitChance:1}}}]});
const finiteResult=O.analyze([finiteRow],finiteCharacter,{targets:{armory:500}});
const exact=Model.estimate(finiteRow,Model.customize(finiteCharacter,{armory:2000}));
assert(Math.abs(finiteResult.actions.find(a=>a.id==='armory').eta-exact.eta)<1e-8);
assert(Math.abs(exact.eta-472.3809523809524)<1e-8);
const combinedBuild=Model.customize(finiteCharacter,{armory:2000,militiaArmory:25});
assert(Math.abs(finiteResult.combined.eta-Model.estimate(finiteRow,combinedBuild).eta)<1e-8);
const militiaAction=finiteResult.actions.find(a=>a.id==='militia');
assert(Math.abs(militiaAction.eta-Model.estimate({...finiteRow,militia:1},finiteCharacter).eta)<1e-8);
const finiteSample={enabled:true,character:3,map:1,count:500,seconds:374};
const fit=Model.inferWaveTime(finiteRow,finiteCharacter,finiteSample,false);
assert(fit);
const sampledFinite=O.analyze([finiteRow],finiteCharacter,{sample:finiteSample,targets:{armory:500}});
assert(sampledFinite.calibrated);
assert(Math.abs(sampledFinite.actions.find(a=>a.id==='armory').eta-Model.estimate(finiteRow,Model.customize(finiteCharacter,{armory:2000}),fit.slow,false).eta)<1e-8);
console.log('Finite-crystal upgrade, combined, militia and Orb-calibrated horizon projections passed.');

// Switching optimizer selection must not change the source sample's fit or
// make destination predictions disagree with calculator automatic timing.
const transferBuild={...c,maps:[{...map,autoWaveSeconds:8,autoAttackFraction:.3},{...map,id:2,autoWaveSeconds:24,autoAttackFraction:.6}]};
const transferSource=rows[0],transferTarget=rows[1];
const transferPrediction=Model.estimate(transferSource,transferBuild,10,false);
const transferSample={enabled:true,character:3,map:1,count:transferPrediction.activeKills/3600*374*1.5,seconds:374};
const transferFit=Model.inferWaveTime(transferSource,transferBuild,transferSample,false);
assert(transferFit);
const autoResult=O.analyze(rows,transferBuild,{mapId:2,sample:transferSample});
const calculatorResult=Model.estimateAutomatic(transferTarget,transferBuild,false,transferSample,transferFit);
assert.equal(autoResult.base.eta,calculatorResult.eta);
assert.equal(autoResult.base.fast,calculatorResult.fast);
assert.equal(autoResult.base.slow,calculatorResult.slow);
const sourceSelected=O.analyze(rows,transferBuild,{mapId:1,sample:transferSample});
assert.equal(sourceSelected.maps.find(m=>m.id===2).eta,calculatorResult.eta);
assert.equal(autoResult.calibrated,false,'Transferred estimates must not claim direct calibration');
assert.equal(O.analyze(rows,transferBuild,{mapId:2,sample:{...transferSample,enabled:false}}).base.eta,Model.estimate(transferTarget,transferBuild).eta);
console.log('Calculator/optimizer agree across selections, transferred samples and disabled calibration.');
