'use strict';const assert=require('node:assert'),T=require('./character-talents.js');const c={TalentIconNames:['Health_Booster','Mana_Booster'],TalentOrder:[0,1]};const d={Lv0_0:[50],CharacterClass_0:1,PlayerStuff_0:[0,1],SL_0:{0:120},SLpre_0:{1:40},SM_0:{0:150,1:100}};const m=T.model(d,{charNames:['Hero']},c)[0];assert.equal(m.active,1);assert.equal(m.loadouts[1][0].name,'Health Booster');assert.equal(m.loadouts[1][0].supered,false);assert.equal(m.loadouts[0][1].name,'Mana Booster');console.log('Character talents tests passed.');

global.window={};require('./talents-data');const catalog=window.TALENT_CATALOG;
for(const classId of [4,14,16,29,40]){const char=T.model({Lv0_0:[100],CharacterClass_0:classId,SL_0:{0:5,1:0,615:10},SLpre_0:{1:30},SM_0:{}},{},catalog)[0];assert.deepEqual(char.loadouts[0].map(x=>[x.id,x.page,x.slot]),char.loadouts[1].map(x=>[x.id,x.page,x.slot]));assert.equal(char.loadouts[0][1].level,0);assert.equal(char.loadouts[0][1].slot,1);assert.deepEqual(char.loadouts[0].filter(x=>x.page===0).map(x=>x.id),catalog.TalentPages[catalog.ClassTalentPages[classId][0]]);}
const dk=T.model({Lv0_0:[100],CharacterClass_0:12,SL_0:{},SM_0:{}},{},catalog)[0];assert.deepEqual(dk.loadouts[0].filter(x=>x.page===3).map(x=>x.id),[165,166,167,168,169,170,141,142,143,144,175,176,177,178,149]);assert.deepEqual(dk.loadouts[0].filter(x=>x.page===4).map(x=>x.id),[657,658,617,618,619,620,621,622,623,624,616,626,627]);console.log('Fixed class pages, shared talent slots, zero-level talents, presets and star pages passed.');
// Talent tooltip values use the game's growth formulas at the selected level.
assert.equal(T.descriptionAt(270,409,catalog),'Shoots an arrow that deals 943% damage to up to 13 monsters');
assert.equal(T.descriptionAt(270,0,catalog),'Shoots an arrow that deals 0% damage to up to 0 monsters');
assert.equal(T.growth('add',100,1,.15),857.5);
assert.equal(T.growth('decay',100,50,50),100/3);
assert.equal(T.growth('decayMulti',100,50,50),1+100/3);
assert.equal(T.growth('reduce',100,200,.5),150);
for(let id=0;id<catalog.TalentDescriptions.length;id++){const raw=catalog.TalentDescriptions[id]?.[0]?.[0]||'';if(/[{}]/.test(raw))assert(!/[{}]|NaN|Infinity/.test(T.descriptionAt(id,409,catalog)),`Invalid talent values: ${id}`);}
console.log('Talent tooltip formulas and Piercing Arrow 409 values passed.');

const superSave={Lv0_0:[100],Lv0_1:[100],CharacterClass_0:7,CharacterClass_1:7,PlayerStuff_0:[0,1],SL_0:{0:409,1:409},SLpre_0:{0:409,1:409},SM_0:{0:409,1:409},Spelunk:Array.from({length:44},()=>[])};
superSave.Spelunk[20]=[0,-1,null,'',0];superSave.Spelunk[32]=[1];superSave.Spelunk[21]=[8];
for(const asText of [false,true]){const saved=structuredClone(superSave);if(asText)saved.Spelunk=JSON.stringify(saved.Spelunk);const chars=T.model(saved,{},catalog);assert.deepEqual(chars[0].loadouts[0].filter(t=>t.supered).map(t=>t.id),[0]);assert.deepEqual(chars[0].loadouts[1].filter(t=>t.supered).map(t=>t.id),[1]);assert.deepEqual(chars[1].loadouts[0].filter(t=>t.supered).map(t=>t.id),[8]);assert.equal(chars[1].loadouts[1].filter(t=>t.supered).length,0);}
console.log('SUPER assignments: character isolation, both presets, sentinel values and high normal levels passed.');
// Independent oracle: execute the original game functions, not a second hand-written mapping.
const fs=require('node:fs'),vm=require('node:vm');const game=fs.readFileSync('../audit/N.js','utf8');
const start=game.indexOf('_customBlock_ReturnClasses=function')+'_customBlock_ReturnClasses='.length,end=game.indexOf('},x._customBlock_TotalStats=',start)+1,scratch={h:{}};
const gameClasses=vm.runInNewContext('('+game.slice(start,end)+')',{a:{engine:{getGameAttribute:()=>scratch}},c:{asNumber:Number}});
for(let id=1;id<=41;id++){const pages=Array.from(gameClasses(id));assert.deepEqual(catalog.ClassTalentPages[id],pages.map(p=>p+':'+catalog.ClassNames[p]));for(const p of pages)assert.deepEqual(catalog.TalentPages[p+':'+catalog.ClassNames[p]],catalog.TalentOrder.slice(15*(p-1),15*p));}
assert(game.includes('s+615+13*(0-a.engine.getGameAttribute("SkillTabSelected"))'));
for(let page=0;page<5;page++){const actual=catalog.TalentPages['Special Talent '+(page+1)];assert.equal(actual.length,13);assert.deepEqual(actual,catalog.TalentOrder.slice(615+13*page,628+13*page));}
const bannedStart=game.indexOf('if("TalentBannedforAllLV"==e)return')+'if("TalentBannedforAllLV"==e)return'.length,bannedEnd=game.indexOf(';',bannedStart),gameBanned=vm.runInNewContext('(t)=>'+game.slice(bannedStart,bannedEnd),{c:{asNumber:Number}});
for(let id=0;id<680;id++)assert.equal(T.superBanned(id),Boolean(gameBanned(String(id))));
console.log('Original game oracle: all class pages, all five 13-slot star pages, and all 680 SUPER eligibility rules match.');
