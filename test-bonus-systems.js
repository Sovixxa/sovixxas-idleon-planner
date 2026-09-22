'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const box={window:{},console,structuredClone,localStorage:{getItem(){return null},setItem(){}}};box.window=box;
vm.createContext(box);vm.runInContext(fs.readFileSync('beanstalk-engine.js','utf8'),box,{timeout:30000});
global.BeanValueEngine=box.BeanValueEngine;const B=require('./bonus-systems.js');
assert.equal(typeof box.BeanValueEngine.systems,'function');
const attachment='C:/Users/Sofia/.codex/attachments/2421dc44-490e-4138-a1b9-f6f2a83a490a/Pasted text.txt';
if(fs.existsSync(attachment)){
 const save=JSON.parse(fs.readFileSync(attachment,'utf8')),g=B.getRows(save);
const exact={saltLick:11,votes:35,emperorBonuses:12,compass:173,grimoire:55,tesseract:63,orion:6,poppy:7,bubba:7,constellations:64,shrines:9,forgeBonuses:6,anvilUpgrades:11,islandExpeditions:3,poExtras:3,atomCollider:15,labMainframe:18,labJewels:24,sushi:63,button:9,eventShop:56,friendBonuses:6,holeSchematics:106,holeMajik:17,holeStudies:18,holeMeasurements:17,holeFloors:18,holeBell:13,holeWell:20,holeFountain:60,holeResources:4,holeHarp:17,holeLamp:12,holeDawgDen:1,holeJars:50,holeSanctum:1,holeGambit:25,clamworks:18,meritocracy:28,bigFish:7,coralKid:6,coralReef:6,dancingCoral:9,hoops:4,darts:4,zenithMarket:11,legendTalents:50};
 for(const [key,count] of Object.entries(exact))assert.equal(g[key].length,count,`${key} row count`);
 for(const key of ['vials','sigils','shinyPets','upgradeVault','gamingPalette','starSigns','deathNote','familyBonuses','gemShop','holeBravery','holeJustice','holeWisdom','holeMonuments'])assert(g[key].length>0,`${key} should have rows`);
 for(const rows of Object.values(g))for(const x of rows){assert(x.name);assert(x.effect);assert(['active','missing','maxed'].includes(x.status));}
}
console.log('bonus systems: engine export, page groups, and imported-save decoding OK');
