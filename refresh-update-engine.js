'use strict';
// Replace only catalog factories in the existing bundle, preserving local fixes.
const fs=require('node:fs'),vm=require('node:vm'),{catalogs}=require('./inspect-bonus-freshness'),{expressionEnd}=require('./client-source-utils');
const values=catalogs(fs.readFileSync('../audit/N.js','utf8')).values;
let source=fs.readFileSync('beanstalk-engine.js','utf8');
const clean=x=>typeof x==='string'?x.replaceAll('_',' '):x;
function factory(ctor,catalog,fields){
 const start=source.indexOf('[new '+ctor+'(0,');if(start<0)throw Error('Missing '+catalog+' factory');
 const end=expressionEnd(source,start),old=source.slice(start,end);
 if(!old.includes('new '+ctor+'(1,'))throw Error('Incomplete '+catalog);
 const rows=values.get(catalog).map((row,id)=>{
  const data={};fields.forEach((field,i)=>{if(!field)return;const numeric=field[0]==='+';data[numeric?field.slice(1):field]=numeric?Number(row[i]):clean(row[i]);});
  if(catalog==='ResGridSquares')data.index=id;
  return 'new '+ctor+'('+id+','+JSON.stringify(data)+')';
 });
 source=source.slice(0,start)+'['+rows.join(',')+']'+source.slice(end);
 console.log(catalog+': '+rows.length);
}
factory('le','ArcadeShopInfo',['effect','+x1','+x2','func','type','lvlUpText','+barType']);
factory('qt','AtomInfo',['name','+growthFactor','+baseExponent','+baseCost','+bonusPerLv','desc']);
factory('be','JadeUpg',['name','+costA','+costB','+imageId','filler1','filler2','bonus']);
factory('Xe','NinjaUpg',['+screenX','+screenY','+width','+height','name','+bonusPerLvl','bonus','+costBase','+costExponent','+unlockId','+iconX','+iconY']);
factory('Ie','LegendTalents',['name','+maxLevel','+bonusValue','x3','bonus','description']);
factory('I','ResGridSquares',['name','+maxLevel','+bonusPerLevel','+x3','+x4','description']);
factory('Wt','ZenithMarket',['name','+unlockCost','+costExponent','+maxLevel','+bonusPerLevel','+x1','description']);
factory('Vo','CoralReef',['desc',...Array.from({length:12},(_,i)=>'+x'+i)]);
factory('ke','ArtifactInfo',['name','+baseBonus','+baseFindChance','+qtyBonus','bonus','ancientBonus','+ancientBonusQty','eldritchBonus','+eldritchBonusQty','sovereignBonus','+sovereignBonusQty','omnipotentBonus','+omnipotentBonusQty','transcendentBonus','+transcendentBonusQty','verisimilitudeBonus','+verisimilitudeBonusQty']);
// Vials are nested in the cauldron catalog rather than a standalone factory.
const token='new Bo("Vials",',start=source.indexOf(token)+token.length;
if(start<token.length)throw Error('Vial factory missing');
const end=expressionEnd(source,start),current=vm.runInNewContext('('+source.slice(start,end)+')');
current.bubbles=values.get('AlchemyDescription')[4].map(r=>({cauldron:'Vials',name:clean(r[0]).toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()),x1:+r[1],x2:+r[2],func:r[3],description:clean(r[9]),requirements:[{item:r[5],quantity:-1},{liquidNo:r[6].replace('Liquid',''),quantity:-1}],bonusKey:r[11]}));
source=source.slice(0,start)+JSON.stringify(current)+source.slice(end);
fs.writeFileSync('beanstalk-engine.js',source);
