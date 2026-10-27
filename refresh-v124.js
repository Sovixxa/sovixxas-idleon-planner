'use strict';
// Refresh v1.24 catalogs without replacing unrelated local calculation changes.
const fs=require('fs'),vm=require('vm'),{catalogs}=require('./inspect-bonus-freshness'),{expressionEnd}=require('./client-source-utils');
const source=fs.readFileSync('../audit/N.js','utf8'),values=catalogs(source).values;
const clean=s=>String(s).replaceAll('_',' ');
let bundle=fs.readFileSync('beanstalk-engine.js','utf8');
const alphabet='_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ肥肢肖肋肉職耐者箱管算箔策答筒筍白発癒痛痕病疾';
bundle=bundle.replace(/var gu=\[[^\]]+\],fi=/,'var gu='+JSON.stringify([...alphabet])+',fi=');
const match=/\[new (\w+)\(0,\{"?name"?:[^}]*"?desc"?:[^}]*"?price"?:/.exec(bundle);
if(!match)throw Error('Event shop factory not found');
const rows=values.get('NinjaInfo')[39],shop=[];
for(let i=0;i<rows.length;i+=2){const [name,desc]=clean(rows[i]).split(' @ ');shop.push({name,desc,price:Number(rows[i+1])});}
const end=expressionEnd(bundle,match.index);
bundle=bundle.slice(0,match.index)+'['+shop.map((x,i)=>`new ${match[1]}(${i},${JSON.stringify(x)})`).join(',')+']'+bundle.slice(end);
fs.writeFileSync('beanstalk-engine.js',bundle);
const base='vendor/idleon-toolbox/data/website-data/',shared=JSON.parse(fs.readFileSync(base+'shared-data.json'));
shared.research=values.get('Research');shared.ninjaExtraInfo=values.get('NinjaInfo');shared.sushiUpgrades=values.get('SushiUPG');
fs.writeFileSync(base+'shared-data.json',JSON.stringify(shared,null,2)+'\n');
fs.writeFileSync(base+'slab.json',JSON.stringify(values.get('SlabItemSort'),null,2)+'\n');
const oldPets=JSON.parse(fs.readFileSync(base+'companions.json'));
const pets=values.get('CompanionDB').map((r,i)=>({...oldPets[i],name:oldPets[i]?.name||r[0],rawName:r[0],effect:r[1],bonus:Number(r[2]),x:r[3],y:r[4],z:r[5],filler:r[6],tourPower:Number(r[7]),upgradeCost:Number(r[8]),upgradedTourPower:Number(r[9]),upgradedEffect:r[10],upgradedBonus:Number(r[11])}));
fs.writeFileSync(base+'companions.json',JSON.stringify(pets,null,2)+'\n');
const equipment=require('./equipment-data'),items=JSON.parse(fs.readFileSync(base+'items.json'));
for(const id of ['EquipmentHats145','EquipmentHats146','EquipmentHats147','EquipmentNametag44']){
 if(!items[id])throw Error('Refresh item first: '+id);
 const item={id,...items[id]},index=equipment.findIndex(x=>x.id===id);if(index<0)equipment.push(item);else equipment[index]=item;
}
fs.writeFileSync('equipment-data.js','(function(r){const data='+JSON.stringify(equipment)+';if(typeof module!=="undefined")module.exports=data;else r.ExpEquipment=data;})(typeof window!=="undefined"?window:globalThis);\n');
const box={window:{}};vm.runInNewContext(fs.readFileSync('gallery-data.js','utf8'),box);
const item=items.EquipmentNametag44,bonus=(name,value)=>name!=='0'&&Number(value)?{name:clean(name.replace(/^%_/,'' )).toLowerCase(),value:Number(value)}:null;
box.window.GALLERY_CATALOG.nametags=box.window.GALLERY_CATALOG.nametags.filter(x=>x.id!==44).concat({id:44,itemId:'EquipmentNametag44',name:clean(item.displayName).replaceAll('|',' '),bonuses:[bonus(item.UQ1txt,item.UQ1val),bonus(item.UQ2txt,item.UQ2val)].filter(Boolean)});
fs.writeFileSync('gallery-data.js','window.GALLERY_CATALOG='+JSON.stringify(box.window.GALLERY_CATALOG)+';\n');
console.log('Updated Event Shop to '+shop.length+' entries and refreshed Research/Ninja data.');
