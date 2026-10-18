'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {expressionEnd}=require('./client-source-utils');
const engine=fs.readFileSync('beanstalk-engine.js','utf8');
const start=engine.lastIndexOf('class ',engine.indexOf('getBonusText(){switch(this.index){case 0:'));
assert(start>=0,'Reef upgrade class exists');
const Upgrade=vm.runInNewContext('('+engine.slice(start,expressionEnd(engine,engine.indexOf('{',start)))+')');
const box={window:{}};
vm.runInNewContext(fs.readFileSync('world7-data.js','utf8'),box);
global.WORLD7_CATALOG=box.window.WORLD7_CATALOG;
const W=require('./world7');
// Boundaries from the client Gallery PodiumsOwned formula: ceil(reef level / 4).
for(const [level,slots] of [[0,0],[1,1],[4,1],[5,2],[8,2],[9,3],[10,3]]){
 const reef=new Upgrade(4,{desc:WORLD7_CATALOG.CoralReef[4][0]});reef.level=level;
 assert.match(reef.getBonusText(),new RegExp('\\+'+slots+'_more_slots'));
 assert.match(reef.getBonusText(),new RegExp('\\+'+(3*level)+'%'));
 const Spelunk=Array.from({length:14},()=>[]);Spelunk[13][4]=level;
 assert.match(W.coral({Spelunk}).reefs[4].description,new RegExp('\\+'+slots+' more slots'));
}
for(const level of [0,1,13]){
 const reef=new Upgrade(1,{desc:WORLD7_CATALOG.CoralReef[1][0]});reef.level=level;
 assert.match(reef.getBonusText(),new RegExp('\\+'+level+'_Shells'));
 assert(!reef.getBonusText().includes('{'));
}
// Names transcribed from the game's ReefBG0..5 card artwork.
const names=['Brain Coral','Carnation Coral','Anemone Coral','Pillar Coral','Paragorgia Coral','Staghorn Coral'];
for(const file of ['endgame-models.js','coral-reef-page.js','coral-reef-arcade.js']){
 const source=fs.readFileSync(file,'utf8');
 const list=source.match(/\['Brain Coral'[^\]]+\]/)[0];
 assert.equal(JSON.stringify(vm.runInNewContext(list)),JSON.stringify(names),file);
}
console.log('Coral reef: name mappings, trophy slot boundaries, and Shell rewards pass.');
