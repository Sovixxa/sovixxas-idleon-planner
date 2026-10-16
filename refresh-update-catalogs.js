'use strict';
// Refresh static catalogs from a supplied local client; never execute the game.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {catalogs}=require('./inspect-bonus-freshness');
const source=fs.readFileSync(process.argv[2]||path.join(__dirname,'../audit/N.js'),'utf8');
const {values}=catalogs(source),updated=[];
const write=(file,key,value)=>{fs.writeFileSync(path.join(__dirname,file),'// Generated from the supplied game client by refresh-update-catalogs.js.\nwindow.'+key+'='+JSON.stringify(value)+';\n');updated.push(file);};
for(const file of fs.readdirSync(__dirname).filter(f=>f.endsWith('-data.js')&&!/^(build|extract|refresh)-/.test(f))){
 const box={window:{}};try{vm.runInNewContext(fs.readFileSync(path.join(__dirname,file),'utf8'),box,{timeout:1000});}catch{continue;}
 for(const [key,data] of Object.entries(box.window)){
  if(!/CATALOG$/.test(key)||Array.isArray(data)||!data)continue;
  let changed=false;
  for(const name of Object.keys(data))if(values.has(name)&&JSON.stringify(data[name])!==JSON.stringify(values.get(name))){data[name]=values.get(name);changed=true;}
  if(key==='LAB_CATALOG'){data.LabMainBonusDESC=values.get('LabMainBonusDESC');changed=true;}
  if(changed)write(file,key,data);
 }
}
const clean=s=>String(s).replaceAll('_',' ').trim();
write('arcade-data.js','ARCADE_CATALOG',values.get('ArcadeShopInfo').map((r,id)=>({id,description:clean(r[0]),base:Number(r[1]),scale:Number(r[2]),formula:r[3],label:clean(r[5]),unlock:r[6]})));
const box={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'cards-data.js'),'utf8'),box);
box.window.CARDS_CATALOG.groups=values.get('CardStuff');write('cards-data.js','CARDS_CATALOG',box.window.CARDS_CATALOG);
const arm={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'royal-armory-data.js'),'utf8'),arm);
arm.window.ROYAL_ARMORY_CATALOG.upgrades=values.get('ArmoryUpg').map((r,id)=>({...arm.window.ROYAL_ARMORY_CATALOG.upgrades[id],name:r[0],baseCost:+r[1],costScaling:+r[2],costResourceIndex:+r[3],maxLevel:+r[4],bonusPerLevel:+r[5],unlockTotalLevels:+r[6],x7:+r[7],x8:+r[8],description:r[9]}));
write('royal-armory-data.js','ROYAL_ARMORY_CATALOG',arm.window.ROYAL_ARMORY_CATALOG);
write('update-catalog-data.js','UPDATE_CATALOG',Object.fromEntries(['Research','AtomInfo','JadeUpg','LegendTalents','ZenithMarket','LabMainBonusDESC','AlchemyDescription','SlabItemSort','MapDispName'].map(n=>[n,values.get(n)])));
console.log('Refreshed '+updated.join(', '));
