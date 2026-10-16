'use strict';
const fs=require('node:fs'),{catalogs}=require('./inspect-bonus-freshness');
const v=catalogs(fs.readFileSync('../audit/N.js','utf8')).values,base='vendor/idleon-toolbox/data/website-data/';
const read=n=>JSON.parse(fs.readFileSync(base+n+'.json','utf8')),write=(n,d)=>fs.writeFileSync(base+n+'.json',JSON.stringify(d,null,2)+'\n');
const shared=read('shared-data');
shared.superbitsUpgrades=v.get('GamingUpg').map((r,index)=>({description:r[0],index,x1:+r[1],x2:+r[2],name:r[3].replaceAll('|','_')}));
write('shared-data',shared);write('randomList',v.get('RANDOlist'));
const cards=read('cards');for(const r of v.get('CardStuff').flat())if(cards[r[0]])Object.assign(cards[r[0]],{effect:r[3],bonus:+r[4],perTier:+r[2]});write('cards',cards);
console.log('Refreshed older-engine Gaming, card and shared rule catalogs.');
