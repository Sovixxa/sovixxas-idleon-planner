'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const catalog=require('./divinity-data'),D=require('./divinity');
const source=fs.readFileSync(process.env.IDLEON_CLIENT_PATH||'../audit/N.js','utf8');
const gods=require('./inspect-bonus-freshness').catalogs(source).values.get('GodsInfo');
const start=source.indexOf('_customBlock_Divinity=function('),end=source.indexOf('m._customBlock_Language=',start)-1;
assert(start>=0&&end>start,'Divinity handler boundary changed');
const expression=source.slice(start+'_customBlock_Divinity='.length,end);
const div=Array(40).fill(0),levels=Array(15).fill(0);
const attrs={Divinity:div,CustomLists:{h:{GodsInfo:gods}},GetPlayersUsernames:['Test'],UserInfo:['Test'],Lv0:levels,DNSM:{h:{AlchBubbles:{h:{Y2ACTIVE:1}}}}};
let coral=0,checks=0;
const m={_customBlock_Thingies:()=>coral,_customBlock_Ninja:()=>0};
const live=vm.runInNewContext('('+expression+')',{a:{engine:{getGameAttribute:key=>{assert(key in attrs,key);return attrs[key];}}},c:{asNumber:Number,getCurrentSceneName:()=> 'World5'},m});
// Actual game tooltip code also selects a separate row for the link description.
const tooltip=/this\._DL4=(a\.engine\.getGameAttribute\("CustomLists"\)\.h\.GodsInfo[^;]+?)[;,]\w+\.setFont/.exec(source);
assert(tooltip,'Missing mapped god tooltip expression');
const tooltipRow=vm.runInNewContext('(function(){return '+tooltip[1]+';})',{a:{engine:{getGameAttribute:()=>attrs.CustomLists}},c:{asNumber:Number}});
for(const god of catalog.gods){
 const row=gods[god.id],link=gods[Number(row[13])];
 assert.equal(tooltipRow.call({_GenINFO:{82:god.id}}),link);
 assert.equal(god.linkIndex,Number(row[13]));assert.equal(god.minorBase,Number(link[3]));
 assert.equal(god.name,row[0]);assert.equal(god.blessingPerLevel,Number(row[14]));
 for(const level of [0,1,20,60,100,250,1000])for(const bubble of [1,1.5,3])for(coral of [0,25,100]){
  levels[14]=level;attrs.DNSM.h.AlchBubbles.h.Y2ACTIVE=bubble;
  const expected=live('DivMinorBonus',0,god.id),actual=bubble*(1+coral/100)*level/(60+level)*god.minorBase;
  assert(Math.abs(expected-actual)<=1e-10*Math.max(1,Math.abs(expected)),god.name);checks++;
 }
 for(const level of [0,1,10,99,100,150]){
  div[28+god.id]=level;
  const decoded=D.decode({Divinity:div},{charNames:['Test']},catalog).gods[god.id];
  assert.equal(decoded.nextCost,Number(row[4])*Math.pow(Number(row[5]),level));
  if(god.id===2)assert.equal(decoded.baseBonus,null);else assert.equal(decoded.baseBonus,live('BlesssBonus',god.id,0));
  checks++;
 }
}
const effectFragments=['30% AFK','Lab Mainframe','All kills count 2x','3x more resources','Lab also counts','AFK claims','2x Divinity','Pearl','Alchemy bubbles','No link bonus'];
catalog.gods.forEach((god,id)=>assert(god.major.includes(effectFragments[id]),god.name+' link description'));
catalog.styles.forEach(style=>assert.equal(style.levelRequired,live('StyleLvReq',style.id,0)));
console.log(`Divinity client: ${checks} minor-bonus/blessing/cost checks, ten mapped link descriptions and eight style unlocks pass.`);
