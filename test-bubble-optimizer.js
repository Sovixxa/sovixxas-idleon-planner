const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),B=require('./bubble-optimizer');
const c={window:{}};vm.runInNewContext(fs.readFileSync('alchemy-data.js','utf8'),c);const catalog=c.window.ALCHEMY_CATALOG;
const opts=[];opts[384]='';const raw={CauldronInfo:catalog.map(g=>g.bubbles.map(()=>1)),OptLacc:opts};
const row=(m,id)=>m.rows.find(r=>r.id===id);
assert.equal(B.model({},catalog).rows.every(r=>r.state==='Missing data'),true);
let m=B.model(raw,catalog,{prismaMulti:2});assert.equal(m.rows.length,133);assert(m.todo.length>50);
assert.equal(row(m,'Y23').capLevel,420);assert.equal(row(m,'Y23').target,420);
raw.CauldronInfo[3][23]=420;m=B.model(raw,catalog,{prismaMulti:2});assert.equal(row(m,'Y23').state,'Capped');assert.equal(row(m,'Y23').gain,0);assert(!m.todo.some(r=>r.id==='Y23'));
opts[384]='c23,c28,c32,';m=B.model(raw,catalog,{prismaMulti:4});assert.equal(row(m,'Y23').capLevel,17);assert.equal(row(m,'Y28').state,'Capped');assert.equal(row(m,'Y32').capLevel,null,'20% is an asymptote at 4x, never a finite cap');
assert.equal(row(m,'Y11').state,'Check shared cap');assert(!m.todo.some(r=>r.id==='Y11'));
raw.CauldronInfo[0][0]=50000;m=B.model(raw,catalog,{prismaMulti:2});assert.equal(row(m,'O0').state,'Soft target met');assert(B.value(catalog[0].bubbles[0],50001)>B.value(catalog[0].bubbles[0],50000));
assert.equal(B.value(catalog[0].bubbles[0],200000),75000);
assert.equal(row(m,'Y17').softLevel,247,'95% concerns variable part, not baseline 1');
const missing=B.model({...raw,OptLacc:[]},catalog);assert.equal(row(missing,'Y23').state,'Check multipliers');assert.equal(row(missing,'Y23').capLevel,null);
raw.CauldronInfo[3][23]=null;assert.equal(row(B.model(raw,catalog,{prismaMulti:2}),'Y23').state,'Missing data');raw.CauldronInfo[3][23]=0;assert.equal(row(B.model(raw,catalog,{prismaMulti:2}),'Y23').state,'Locked');
const before=JSON.stringify(raw);B.model(raw,catalog,{prismaMulti:2},{matching:true});assert.equal(JSON.stringify(raw),before);
const plain=B.model(raw,catalog,{prismaMulti:2}),matched=B.model(raw,catalog,{prismaMulti:2},{matching:true});assert.equal(row(plain,'O12').multi,row(matched,'O12').multi,'Carpenter ignores class multiplier');assert(row(matched,'G4').multi>row(plain,'G4').multi);
for(const goal of [.9,.95,.99]){const x=B.model(raw,catalog,{prismaMulti:2},{goal});for(const r of x.todo)assert(r.target>r.level);}
for(const b of catalog.flatMap(g=>g.bubbles).filter(b=>b.name!=='BUBBLE'))for(const level of [1,10,100,50000,50001,100000])assert(B.value(b,level+1)>=B.value(b,level));
console.log('Bubble optimizer: cap boundaries, asymptotes, Prisma, shared pools, missing/locked data, addDECAY, class exemption and purity pass.');

// Compare every supported curve against the actual installed client's expression.
if(fs.existsSync('../audit/N.js')){
 const source=fs.readFileSync('../audit/N.js','utf8'),start=source.indexOf('"addDECAY"==e?'),end=source.indexOf('},x._customBlock_AnvilNumbers',start),expression=source.slice(start,end);
 for(const b of catalog.flatMap(g=>g.bubbles).filter(b=>b.name!=='BUBBLE'))for(const level of [1,60,420,50000,50001,200000]){
  const expected=vm.runInNewContext(expression,{e:b.formula,t:b.base,i:b.scale,n:level});assert(Math.abs(B.value(b,level)-expected)<1e-9,`${b.name} level ${level}`);
 }
 console.log('All bubble curves match the installed game formula at six boundary/sample levels.');
}
const worker={console:{log(){},warn(){},error(){}},structuredClone};worker.self=worker;worker.window=worker;vm.createContext(worker);worker.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8'),worker,{filename:f}));let result;worker.postMessage=x=>result=structuredClone(x);worker.importScripts('bubble-optimizer-worker.js');
const sample=JSON.parse(fs.readFileSync('../example json.txt','utf8'));worker.onmessage({data:sample});assert(result.prismaMulti>=2&&result.prismaMulti<=4,result.warning);const real=B.model(sample,catalog,result);assert(real.rows.every(r=>r.level===null||Number.isFinite(r.level)));assert(real.todo.every(r=>r.state==='Underleveled'));console.log('Real-save worker: Prisma decoded and cap report generated.');

assert.equal(row(B.model(raw,catalog,{prismaMulti:2,shared:{Y6:100}}),'Y6').state,'Capped');
assert.equal(row(B.model(raw,catalog,{prismaMulti:2,shared:{Y6:100}}),'Y6').gain,0);

assert.equal(row(B.model(raw,catalog,{prismaMulti:2},{goal:.9}),'Y9').softLevel,900);
assert.equal(row(B.model(raw,catalog,{prismaMulti:2}),'Y11').gain,null);
