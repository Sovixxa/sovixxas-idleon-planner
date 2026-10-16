'use strict';
const fs=require('node:fs');const edit=(file,fn)=>{const s=fs.readFileSync(file,'utf8');fs.writeFileSync(file,fn(s));};
edit('menagerie.js',s=>s.replace("tile('MenaIconO0',x.name","tile('MenaIconY'+x.id,x.name").replace("tile('MenaIconO1',x.name","tile('MenaIconO'+x.id,x.name").replace("tile('MenaIconO2',x.effect","tile('MenaIconP'+x.id,x.effect").replace("tile('MenaIconO1',name+' jellyfish'","tile('MenaJelly'+([3,5,7,10,12,23].indexOf(id)+1),name+' jellyfish'"));
edit('summoning-optimizer.js',s=>s.replace('return {available:Array.isArray(levels)',"return {menagerieDiscount:Number(parse(data.Menagerie)?.[3]?.[7])||0,available:Array.isArray(levels)"));
edit('test-summoning-optimizer.js',s=>s.replace('q:{_customBlock_JellyOperation:()=>0}',"q:{_customBlock_JellyOperation:()=>0,_customBlock_MenagerieStuff:action=>action==='SumCostReduxMena'?1:0}"));
edit('test-arcade-companion-client.js',s=>s.replace('length:73','length:ctx.ARCADE_CATALOG.length').replace('arcade.bonuses.length,73','arcade.bonuses.length,ctx.ARCADE_CATALOG.length').replace('all 73 records','all current records'));
edit('vendor/idleon-toolbox/parsers/index.ts',s=>s.replace('    ...staticAccountFields\n','    ...staticAccountFields,\n    menagerie: tryToParse((idleonData as any)?.Menagerie) || []\n'));
edit('sailing-artifact-math.ts',s=>s.replace('getTranscendentChances}', 'getTranscendentChances,getVerisimilitudeChances}').replace('getTranscendentChances(islandIndex,vars)]','getTranscendentChances(islandIndex,vars),getVerisimilitudeChances(islandIndex,vars)]').replace('(a.research?.gridSquares?.[109]?.level||0)>0]','(a.research?.gridSquares?.[109]?.level||0)>0,(a.menagerie?.[2]?.[0]||0)>=1]'));
edit('clamworks-optimizer.js',s=>{
 s=s.replace('function decode(raw){for',"function decode(raw){const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v;}catch{return null;}},data=parse(raw?.data)||raw,mena=parse(data?.Menagerie)||[];for");
 s=s.replace('return {pearls:num(o[454])','return {scurge:Array.from({length:9},(_,i)=>num(mena[5]?.[i])),scurgeLevel:num(mena[0]?.[8]),pearls:num(o[454])');
 s=s.replace('discount=(1+.12*s.levels[4])*(1+.16*s.levels[8])','discount=(1+.12*s.levels[4])*(1+.16*s.levels[8])*(1+.25*num(s.scurge?.[3]))*(1+.1*num(s.scurge?.[i])*num(s.scurge?.[5]))');
 s=s.replace('const l=s.levels;return (1+l[0])','const l=s.levels;return (1+.5*num(s.scurge?.[1]))*(1+.1*num(s.scurge?.[8])*num(s.scurgeLevel))*(1+l[0])');
 return s;
});
