'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={Date,structuredClone,console};vm.createContext(ctx);for(const f of ['dashboard-math.js','sailing-artifact-model.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),before=JSON.stringify(raw),M=ctx.SailingArtifactModel,result=M.calculate(raw);
assert.equal(JSON.stringify(raw),before);assert.equal(ctx.Date,Date);assert(M.calculate({}).missing);assert.equal(result.boats.length,20);
assert.equal(result.caps[1],null,'Uncapped must not become a zero maximum');assert.equal(result.caps[17],null,'Unknown event cap remains unknown');
assert.equal(result.boats[0].values[2],450);assert.equal(result.boats[0].values[31],1.3);assert.equal(result.boats[0].values[32],1.2);
assert.equal(result.caps[11],825.6,'Vault cap includes saved level cap and effect multipliers');assert.equal(result.boats[0].values[11],result.caps[11]);
for(const boat of result.boats){assert.equal(boat.values.length,34);assert(boat.values.every(Number.isFinite));const v=boat.values;const sum=v.slice(0,12).reduce((s,n)=>s+n,0);const factors=v.slice(12).filter((_,i)=>![7,8].includes(i));const expected=(1+sum/100)*(1+(v[19]+v[20])/100)*factors.reduce((s,n)=>s*n,1);assert(Math.abs(expected/boat.total-1)<1e-12);}
const unpack=r=>typeof r.data==='string'?JSON.parse(r.data):r.data||r;
const changed=structuredClone(raw),d=unpack(changed);d.Captains=typeof d.Captains==='string'?JSON.parse(d.Captains):d.Captains;d.Boats=typeof d.Boats==='string'?JSON.parse(d.Boats):d.Boats;
d.Captains[0]=[6,3,3,10,0,2,3];d.Boats[0][0]=0;d.Boats[1][0]=0;d.Boats[0][3]=200;d.Boats[0][5]=200;d.Boats[1][3]=199;d.Boats[1][5]=200;changed.data=d;
const modified=M.calculate(changed);assert.equal(modified.boats[0].values[1],50);assert.equal(modified.boats[0].values[21],3);assert.equal(modified.boats[1].values[21],1);assert(Math.abs(modified.boats[0].total/modified.boats[1].total-3)<1e-12,'Only qualifying boats get Undead');
const chance=ctx.DashboardMath.sailingChestChance,base={rift:[0],research:{gridSquares:[]},serverVars:{}},arts=Array.from({length:50},(_,i)=>({name:'Artifact_'+i,acquired:0,baseFindChance:100}));
const tiny=chance([0,0,1e-14],arts,base);assert(tiny.chance>0&&tiny.chance<.00001,'Tiny odds must not have a fake 0.01% floor');
assert.equal(chance([0,0,10000],arts,base).chance,100);assert.equal(chance([0,0,100],arts.map(a=>({...a,acquired:6})),base).chance,0);assert(chance([0,0,100],arts.map(a=>({...a,acquired:6})),base).done);
assert.equal(chance([0,10,100],arts.map(a=>({...a,acquired:1})),base).chance,null,'Missing server odds stay unknown');
console.log('Sailing artifact math: saved values, boosted caps, no mutation, boat-specific traits/Undead, total reconciliation and chest odds passed.');
