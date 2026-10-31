'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),G=require('./sneaking-gemstones'),{handler}=require('./client-source-utils');
const source=handler(fs.readFileSync('../audit/N.js','utf8'),'_customBlock_Ninja'),options=[],attrs={OptionsListAccount:options,CustomMaps:{h:{NjEQ:{h:Object.fromEntries(G.catalog.map((r,id)=>['NjGem'+id,[0,0,r[0],r[1],0,r[2]]]))}}}};
let talent=1;const m={},env={Math,c:{asNumber:Number},a:{engine:{getGameAttribute:k=>attrs[k]}},m,p:{_customBlock_getbonus2:()=>talent}};m._customBlock_Ninja=vm.runInNewContext('('+source+')',env);
for(talent of [1,2.7,5])for(const moi of [0,1,9000,99000])for(const level of [0,1,1000,9000,19000,99000,999000,1e7,2e7])for(let id=0;id<8;id++){options[238]=moi;options[233+id]=level;assert.equal(G.bonus(id,level,options[238],talent),m._customBlock_Ninja('GemstoneBonus',id,0));}
for(const m of G.milestones){assert(Math.abs(100*m.level/(1000+m.level)-m.percent)<1e-9);}
for(const moi of [0,99000])for(const t of [1,3.2])for(const level of [0,1,999,99000,1e7]){const next=G.nextCharm(level,moi,t);if(next!=null){const current=Math.ceil(G.bonus(7,level,moi,t));assert(Math.ceil(G.bonus(7,next,moi,t))>current);assert(Math.ceil(G.bonus(7,next-1,moi,t))<=current);}}
assert(G.snapshot({}).rows.every(x=>x.level===null));const opts=[];opts[233]=0;opts[231]=4;const ninja=[];ninja[103]=[];ninja[103][6]=100;ninja[103][3]=20;const men=[];men[7]=[];men[7][6]=5;const snap=G.snapshot({data:{OptionsListAccount:JSON.stringify(opts),Ninja:JSON.stringify(ninja),Menagerie:men}});assert.equal(snap.dropMax,205);assert.equal(snap.rows[0].level,0);assert.equal(snap.rows[1].level,null);
console.log('Gemstone client parity, milestones, Charm integer breakpoints, missing counters and drop limits pass.');


assert.equal(G.snapshot({OptLacc:opts}).rows[0].level,0);

// The last whole-number Charm contribution is attainable before 99% scaling.
assert.equal(G.charmMax(0,1),29001);
assert.equal(G.nextCharm(29000,0,1),29001);
assert.equal(G.nextCharm(29001,0,1),null);
assert.equal(G.progress({id:7,level:29001},99000,0,1).needs,false);
assert.equal(G.progress({id:7,level:29000},99000,0,1).needs,true);
assert.equal(G.progress({id:7,level:29001},99000,0,2).needs,true);
assert.equal(G.progress({id:7,level:null},99000,0,1).effectiveMax,false);
assert.equal(G.nextCharm(1,0,Infinity),null);
for(const value of [false,-1,'bad',1e99]){const o=[];o[233]=value;assert.equal(G.snapshot({OptLacc:o}).rows[0].level,null);}
for(const moi of [0,1,1000,99000,1e7])for(const t of [1,1.001,2.7,5,100]){const max=G.charmMax(moi,t),ceiling=Math.ceil(G.ceiling(7,moi,t));assert.equal(Math.ceil(G.bonus(7,max,moi,t)),ceiling);assert(Math.ceil(G.bonus(7,max-1,moi,t))<ceiling);}
console.log('Effective Firefrost caps, filters, multiplier changes, invalid counters and numeric guard pass.');

assert.equal(G.ceiling(7,1000,100),7843);
