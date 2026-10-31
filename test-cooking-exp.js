'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c={console,structuredClone};c.self=c;c.window=c;vm.createContext(c);
c.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f}));
let result;c.postMessage=r=>result=structuredClone(r);c.importScripts('cooking-exp-worker.js','cooking-exp.js');
const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),before=JSON.stringify(raw);
c.onmessage({data:raw});assert(!result.error,result.error);assert(result.characters.length>0);
for(const name of Object.keys(c.CookingExp.guides)){
 assert.equal(c.CookingExpLimits.limits[name]?.length,3,name+' must have a maximum, breakpoint and soft-cap explanation');
}
assert.equal(result.progress["Chef's Essentials"].cap,60*375/575/100);
assert(result.characters.some(ch=>ch.breakdown.find(x=>x.name==="Chef's Essentials").value>0),'Read Chef’s Essentials by box name');
assert(result.progress['Cooking Knowledge'].maximum.includes('510'));
assert.equal(result.progress['Cooking Knowledge'].cap,596.095);
assert.equal(result.progress['Skillium Fancyson'].cap,5.5);
assert.equal(result.progress['Salt Lick'].cap,.2);
assert.equal(result.progress['Chizoar armor set'].cap,.4);
assert(result.progress['Friend bonus'].maximum.includes('30,000'));
const chow=c.CookingExp.summarize(result,'Apocalypse Chow');
assert.equal(chow.values.length,result.characters.length,'Account source must include the whole roster');
assert(chow.min<chow.max,'Preserve character activation differences instead of picking one');
assert.equal(chow.maxed,false,'An unknown cap cannot be called maxed');
const fake={characters:[{name:'A',breakdown:[{name:'x',value:0}]},{name:'B',breakdown:[{name:'x',value:1}]}],progress:{x:{cap:1}}};
assert.equal(c.CookingExp.summarize(fake,'x').maxed,false,'One maxed character must not hide an account source');
for(const ch of result.characters){
 assert(Number.isFinite(ch.value)&&ch.value>=.1,ch.name+' total');
 assert.equal(ch.breakdown.length,Object.keys(c.CookingExp.guides).length);
 let sum=0,product=1;
 for(const row of ch.breakdown){assert(c.CookingExp.guides[row.name],row.name);assert(Number.isFinite(row.value),row.name);if(row.kind==='multi')product*=row.value;else sum+=row.value;}
 assert(Math.abs(Math.max(.1,sum*product)/ch.value-1)<1e-12,'Displayed sources must reproduce total');
 assert(ch.breakdown.find(r=>r.name==='Cooking efficiency and prowess').value<=1);
}
assert.equal(JSON.stringify(raw),before,'Do not mutate imported save');
c.onmessage({data:{}});assert(result.missing);
console.log('Cooking EXP: account-wide coverage, 46 cap/breakpoint/soft-cap guides, saved caps, Chef box contribution, roster ranges, maxed filtering, reconciliation and immutability passed.');
