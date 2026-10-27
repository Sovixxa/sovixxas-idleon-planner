'use strict';
const fs=require('node:fs'),vm=require('node:vm'),{expressionEnd}=require('./client-source-utils'),{catalogs}=require('./inspect-bonus-freshness');
const source=fs.readFileSync('../audit/N.js','utf8'),slab=catalogs(source).values.get('SlabItemSort'),ids=process.argv.slice(2).length?process.argv.slice(2):['Spelunking6','EquipmentNametagReplica43','EquipmentGown9','Crystal6','CKsing'];
const box={window:{}};vm.runInNewContext(fs.readFileSync('item-name-data.js','utf8'),box);
const file='vendor/idleon-toolbox/data/website-data/items.json',items=JSON.parse(fs.readFileSync(file,'utf8'));
let bundle=fs.readFileSync('beanstalk-engine.js','utf8');
for(const id of ids){
 const match=new RegExp('([A-Za-z]+)\\.(addNew\\w+)\\("'+id+'",e\\)').exec(source);if(!match)throw Error('Missing definition '+id);
 const start=source.lastIndexOf('e=new l,',match.index);if(start<0||match.index-start>12000)throw Error('Definition boundary '+id);
 let record;const context={l:function(){this.h={};},[match[1]]:{[match[2]]:(name,value)=>{record=value.h;}}};
 vm.runInNewContext(source.slice(start,match.index+match[0].length),context,{timeout:1000});
 const raw=Object.assign({},...Object.values(record).map(x=>x.h)),name=String(raw.displayName).replaceAll('_',' ');
 items[id]={...raw,itemType:match[2].replace('addNew',''),rawName:id};box.window.ITEM_NAMES[id]=name;
 const item={internalName:id,...raw,displayName:name,Type:String(raw.Type).replaceAll('_',' '),description:Array.from({length:8},(_,i)=>raw['desc_line'+(i+1)]).filter(x=>x&&x!=='Filler').join(' ').replaceAll('_',' ')};
 if(raw.UQ1txt)item.miscUp1=raw.UQ1val+String(raw.UQ1txt).replaceAll('_',' ');if(raw.UQ2txt)item.miscUp2=raw.UQ2val+String(raw.UQ2txt).replaceAll('_',' ');
 const value={item,slabSort:{item:{item:id},order:slab.indexOf(id)}},token='new i('+JSON.stringify(id)+',',pos=bundle.indexOf(token),replacement='new i('+JSON.stringify(id)+','+JSON.stringify(value)+')';
 if(pos>=0){const end=expressionEnd(bundle,bundle.indexOf('(',pos));bundle=bundle.slice(0,pos)+replacement+bundle.slice(end);}
 else{const insertion=bundle.indexOf('new i("Spelunking6",');if(insertion<0)throw Error('Item factory not found');bundle=bundle.slice(0,insertion)+replacement+','+bundle.slice(insertion);}
 console.log(id+': '+name);
}
fs.writeFileSync(file,JSON.stringify(items,null,2)+'\n');fs.writeFileSync('item-name-data.js','window.ITEM_NAMES='+JSON.stringify(box.window.ITEM_NAMES)+';\n');fs.writeFileSync('beanstalk-engine.js',bundle);
