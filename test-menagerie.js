'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),M=require('./menagerie'),{handler}=require('./client-source-utils');
const box={window:{}};for(const f of ['world7-data.js','update-catalog-data.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),box);
const catalog=box.window.WORLD7_CATALOG,extra=box.window.UPDATE_CATALOG;
const state=Array.from({length:7},()=>Array(40).fill(0)),attrs={Menagerie:state,CustomLists:{h:{Research:catalog.Research}},DNSM:{h:{}}};
const q={},env={a:{engine:{getGameAttribute:k=>attrs[k]}},c:{asNumber:Number},D:{contains:(a,x)=>a.includes(x)},q};
q._customBlock_MenagerieStuff=vm.runInNewContext('('+handler(fs.readFileSync('../audit/N.js','utf8'),'_customBlock_MenagerieStuff')+')',env);
let checks=0;for(let id=0;id<25;id++)for(const level of [0,1,5,20,50]){state[3][id]=level;const game=q._customBlock_MenagerieStuff('Cost',2,id),actual=M.boostCost(id,level);assert(Math.abs(actual-game)<=1e-12*Math.max(1,game));checks++;}
for(let id=0;id<25;id++){assert.equal(M.unlockCost(id),q._customBlock_MenagerieStuff('Cost',1,id));checks++;}
for(const rank of [0,1,3,7,8,15,22,44,100]){state[0][2]=rank;const raw={data:{Menagerie:JSON.stringify(state),OptLacc:JSON.stringify({616:3,617:4,618:5,619:6,620:7,621:8}),Research:[]}},before=JSON.stringify(raw),m=M.decode(raw,catalog,extra);assert.equal(m.shellsRequired,q._customBlock_MenagerieStuff('ShellEXPreq',0,0));assert.equal(m.singularity[0].level,3);assert.equal(JSON.stringify(raw),before);checks++;}
const missing=M.decode({},catalog,extra);assert.equal(missing.rank,null);assert.equal(missing.lumi,null);assert(missing.missions.every(m=>m.ready===null));assert.equal(missing.unlocks.length,25);assert.equal(missing.boosts.length,25);assert.equal(missing.missions.length,33);
for(const level of [0,1,5,20]){
 for(const i of [3,4,8,11,12,13,14])state[0][i]=level;
 const model=M.decode({Menagerie:state},catalog,extra);
 assert.equal(model.pinkCosts[0],q._customBlock_MenagerieStuff('PinkJellyCosts',0,0));
 assert.equal(model.pinkCosts[1],q._customBlock_MenagerieStuff('PinkJellyCosts',1,0));
 assert.equal(model.yellowCost,q._customBlock_MenagerieStuff('ConstBuildREQ',0,0));
 assert.equal(model.scurgeExpRequired,q._customBlock_MenagerieStuff('ScurgeEXP_Req',0,0));checks+=4;
}
const progress=M.decode({Menagerie:state,TotemInfo:[[10,20]],Sushi:[[],[],[],[],[],[1,2,0,-1,5]],Research:Array.from({length:10},(_,i)=>i===9?[2,3]:[])},catalog,extra);
assert.equal(progress.missions[5].value,30);assert.equal(progress.missions[10].value,3);assert.equal(progress.missions[15].value,5);
console.log('Menagerie: '+checks+' client formula comparisons, missing data, wrapped JSON and immutable save decoding pass.');
