'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {catalogs}=require('./inspect-bonus-freshness');
const filename=process.env.IDLEON_CLIENT_PATH||'../audit/N.js';
if(!fs.existsSync(filename)){
 if(process.env.IDLEON_CLIENT_PATH)throw Error('Requested client is unavailable: '+filename);
 console.log('Catalog/client coverage skipped: local game client unavailable.');process.exit(0);
}
const {values:client}=catalogs(fs.readFileSync(filename,'utf8'));
const c={console:{log(){},warn(){},error(){}},structuredClone,localStorage:{getItem(){return null;}},fetch:()=>new Promise(()=>{})};c.window=c;vm.createContext(c);
for(const [,src] of fs.readFileSync('index.html','utf8').matchAll(/<script src="([^"]+)"/g)){
 const file=src.split('?')[0];if(file==='app.js')break;
 vm.runInContext(fs.readFileSync(file,'utf8'),c,{filename:file});
}
let count=0;
function same(actual,expected,label){assert.equal(JSON.stringify(actual),JSON.stringify(expected),label+' diverged from client');count++;}
for(const [global,catalog] of Object.entries(c).filter(([key,value])=>/CATALOG$/.test(key)&&value&&typeof value==='object'&&!Array.isArray(value)))
 for(const [name,rows] of Object.entries(catalog))if(client.has(name))same(rows,client.get(name),global+'.'+name);
assert(count>=69,'Direct catalog coverage unexpectedly decreased');
same(c.CARDS_CATALOG.groups,client.get('CardStuff'),'Card groups');
same(c.CARDS_CATALOG.sets,client.get('CardSets'),'Card sets');
same(c.DIVINITY_CATALOG.gods.map(g=>[g.name,g.minorBase,g.costBase,g.costScale,g.blessingPerLevel]),client.get('GodsInfo').map(g=>[g[0],Number(client.get('GodsInfo')[Number(g[13])][3]),...g.slice(4,6).map(Number),Number(g[14])]),'Divinity names and mapped numeric bonuses');
same(c.DIVINITY_CATALOG.styles.map(s=>s.name),client.get('DivStyle').map(s=>s[0]),'Divinity styles');
same(c.ROYAL_ARMORY_CATALOG.upgrades.map(u=>[u.name,u.baseCost,u.costScaling,u.costResourceIndex,u.maxLevel,u.bonusPerLevel,u.unlockTotalLevels,u.x7,u.x8,u.description]),client.get('ArmoryUpg').map(u=>[u[0],...u.slice(1,9).map(Number),u[9]]),'Royal Armory');
same(c.TOME_CURRENT_DATA.Tome,client.get('Tome'),'Tome metrics');
same(c.TOME_CURRENT_DATA.order,client.get('NinjaInfo')[32].map(Number),'Tome display order');
const companionExpected=client.get('CompanionDB').map(r=>[r[0].replaceAll('_',' '),r[1].replaceAll('_',' '),Number(r[2]),r[10].replaceAll('_',' '),Number(r[11])]);
for(const [name,rows] of [['Pet catalog',c.PETS_CATALOG],['Bundled companion catalog',c.BeanValueEngine.pets({}).items]])same(rows.map(r=>[r.code,r.description,r.baseBonus,r.upgradedDescription,r.upgradedBonus]),companionExpected,name);
assert(c.WORLD7_CATALOG.SushiUPG.some(row=>row[0]==='Combo_Meter'));
console.log(`Catalog coverage: ${count} direct/transformed comparisons match ${filename}. Formula equivalence is checked separately.`);
