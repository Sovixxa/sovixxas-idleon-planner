'use strict';
const assert=require('node:assert/strict');
const B=require('./bonus-systems.js');
const previous=global.BeanValueEngine;
global.BeanValueEngine={systems:()=>new Map()};
try{
 const thresholds=[24,200,750,2500,10000,20000,40000,60000];
 const save=hours=>{const OptLacc=[];OptLacc[184]=hours;return {OptLacc};};
 for(const [index,threshold] of thresholds.entries()){
  for(const hours of [threshold-1,threshold,threshold+1]){
   const raw=save(hours);
   for(const input of [raw,{data:raw},{OptLacc:JSON.stringify(raw.OptLacc)},{OptionsListAccount:raw.OptLacc},{data:JSON.stringify({OptionsListAccount:JSON.stringify(raw.OptLacc)})}]){
    const rows=B.getRows(input).islandExpeditions;
    assert.equal(rows.length,8);
    assert.equal(rows.filter(x=>x.status==='active').length,hours<threshold?index:index+1);
    assert(rows[index].level.includes('Nothing AFK hours'));
   }
  }
 }
 for(const raw of [{},{OptLacc:'invalid'},save(-1),save('not a number')]){
  assert(B.getRows(raw).islandExpeditions.every(x=>x.status==='missing'));
 }
 const rows=B.getRows(save('100000')).islandExpeditions;
 assert.equal(rows.filter(x=>x.status==='active').length,8);
 assert.equal(new Set(rows.map(x=>x.name)).size,8);
 assert(rows[4].effect.includes('+25% more Gold Nuggets'));
 assert(rows[7].name.includes('placeholder'));
}finally{global.BeanValueEngine=previous;}
console.log('Fractal Island: all eight rewards, unlock boundaries, save formats, and labels pass.');
