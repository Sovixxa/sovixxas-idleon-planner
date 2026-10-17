'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),X=require('./afk-tester');
const source=fs.readFileSync('../audit/N.js','utf8');
function extract(marker){const at=source.indexOf(marker);assert(at>=0,marker);const start=at+marker.length;let depth=0,quote='',escape=false;for(let i=start;i<source.length;i++){const ch=source[i];if(quote){if(escape)escape=false;else if(ch==='\\')escape=true;else if(ch===quote)quote='';continue;}if(ch==='"'||ch==="'")quote=ch;else if(ch==='{')depth++;else if(ch==='}'&&--depth===0)return source.slice(start,i+1);}throw Error('Unclosed handler');}
const attrs={Lv0:Array(21).fill(1),ExpReq0:Array(21).fill(0)};
const engine={gameAttributes:{h:attrs},getGameAttribute:key=>attrs[key]};
const env={Math,a:{engine},c:{asNumber:Number},v:{_customBlock_TaskProgress:()=>{}},q:{_customBlock_UnlockHint:()=>{}},k:{_customBlock_TalentCalc:()=>0},u:{getServerVarLoad:()=>1.01}};
const increase=vm.runInNewContext('('+extract('q._customBlock_IncreaseExpREQ=')+')',env);
let checks=0;
for(const skill of X.skills)for(const level of [1,4,5,10,20,21,70,71,100,200,500,1237,4558]){
 attrs.Lv0[skill.id]=level;increase(skill.id);const expected=attrs.ExpReq0[skill.id],actual=X.requirement(level,skill.id,1.01);
 assert(expected===actual||Math.abs(actual/expected-1)<1e-12,`${skill.name} ${level}: ${actual} != ${expected}`);checks++;
}
// Execute the actual balloon item-use handler with isolated game attributes.
let award=null;Object.assign(attrs,{CurrentMap:1,ExpType:0,ItemQuantity:[100],InventoryOrder:['balloon'],ItemDefinitionsGET:{h:{balloon:{h:{ID:50}}}}});
const balloonEnv={Math,a:{engine},p:{_customBlock_Dungon:()=>-1},h:{string:String},c:{asNumber:Number,createRecycledActor:()=>{},getActorType:()=>0,getMouseX:()=>0,getMouseY:()=>0,randomInt:()=>0},x:{_customBlock_ExpMulti:()=>2},v:{_customBlock_giveEXP:(skill,xp)=>{award={skill,xp};}}};
const use=vm.runInNewContext('('+extract('_customEvent_OpenEventBox:')+')',balloonEnv);
for(const skill of X.skills){
 attrs.CurrentMap=skill.id===8?100:1;attrs.ExpType=skill.id;attrs.Lv0[skill.id]=10;
 for(const type of X.balloonTypes){attrs.ItemDefinitionsGET.h.balloon.h.ID=type.base;award=null;use.call({_TRIGGERtext:'OpenEXPballoon',_ItemDragID:0});
  assert.equal(!!award,skill.balloons,skill.name);if(award){assert.equal(award.skill,skill.id);assert.equal(award.xp,type.base*11*2);}checks++;
 }
}
for(const [map,expected] of [[0,2],[50,5],[100,null]]){attrs.CurrentMap=map;attrs.ExpType=0;award=null;use.call({_TRIGGERtext:'OpenEXPballoon',_ItemDragID:0});assert.equal(award?.skill??null,expected);}
// Independently simulate individual item uses and actual client level-ups.
for(const skill of X.skills.filter(s=>s.balloons))for(const type of X.balloonTypes){
 let level=10,xp=3,used=0;attrs.CurrentMap=1;attrs.ExpType=skill.id;attrs.Lv0[skill.id]=level;attrs.ItemDefinitionsGET.h.balloon.h.ID=type.base;attrs.ItemQuantity[0]=1e6;increase(skill.id);
 while(level<14&&used<1e5){use.call({_TRIGGERtext:'OpenEXPballoon',_ItemDragID:0});xp+=award.xp;used++;while(xp>=attrs.ExpReq0[skill.id]){xp-=attrs.ExpReq0[skill.id];attrs.Lv0[skill.id]=++level;increase(skill.id);}}
 const actual=X.calculate({level:10,progress:3,multiplier:2},14,{skill:skill.id,mode:'balloons',balloon:type.id});assert.equal(actual.balloons,used,skill.name+' '+type.id);checks++;
}
assert(X.calculate({level:50,progress:0,multiplier:1},51,{skill:17,mode:'balloons',balloon:'small'}).error);
assert(X.calculate({level:50,progress:0,multiplier:1},51,{skill:19,mode:'balloons',balloon:'small'}).error);
assert(X.calculate({level:25,progress:0,rate:1},27,{skill:20}).error);
assert(!X.calculate({level:25,progress:0,rate:1},27,{skill:20,serverFactor:1.01}).error);
assert.equal(X.calculate({level:10,progress:20,rate:10,savedLevel:10,savedRequirement:50},11,{skill:1}).hours,3);
console.log('Skill requirements and balloon handling verified against actual client:',checks,'checks.');
