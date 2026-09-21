'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../audit/N.js'),'utf8');
const names=['StatueInfo','PrayerInfo','RefineryInfo','ObolShapes','ObolRarities','ObolXYcoords','DungPassiveStats','DungPassiveStats2','DungFlurboShop','DungKEYCHAINS','AlchemyVialItems','AlchemyVialItemsPCT','AlchemyVialQTYreq','VialsLANG','SigilDesc','HoleFountUPG','HolesBuildings','HolesInfo','GamingBoxes','GamingPalette'];
function catalog(name){
  const marker='.'+name+'=function(){return',start=source.indexOf(marker);if(start<0)throw Error('Missing '+name);
  let i=start+marker.length,depth=0,quote='',escape=false;
  for(;i<source.length;i++){const ch=source[i];if(quote){if(escape)escape=false;else if(ch==='\\')escape=true;else if(ch===quote)quote='';continue;}if(ch==='"'||ch==="'"){quote=ch;continue;}if(ch==='['||ch==='('||ch==='{')depth++;else if(ch===']'||ch===')'||ch==='}')depth--;if(depth<0||depth===0&&source.slice(i,i+2)==='}}')break;}
  const expression=source.slice(start+marker.length,i);return vm.runInNewContext('('+expression+')');
}
const out={};for(const name of names)out[name]=catalog(name);
fs.writeFileSync(path.resolve(__dirname,'remaining-data.js'),`window.REMAINING_CATALOG=${JSON.stringify(out)};\n`);
console.log('Extracted',names.length,'remaining catalogs.');
