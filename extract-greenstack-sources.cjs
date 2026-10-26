const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {expressionEnd}=require('./client-source-utils');
const source=fs.readFileSync(path.join(__dirname,'../audit/N.js'),'utf8');
const base='./vendor/idleon-toolbox/data/website-data/';
const monsters=require(base+'monsters.json'),shared=require(base+'shared-data.json'),items=require(base+'items.json');
const tables={},records={};const clean=s=>String(s||'').replaceAll('_',' ');
for(const match of source.matchAll(/\b\w+\.h\.(\w+)=(\[\[")/g)){
 const start=match.index+match[0].indexOf('=[[')+1;
 let rows;try{rows=JSON.parse(source.slice(start,expressionEnd(source,start)));}catch{continue;}
 if(Array.isArray(rows)&&rows.length&&rows.every(r=>Array.isArray(r)&&r.length===4&&typeof r[0]==='string'&&Number.isFinite(Number(r[1]))&&Number.isFinite(Number(r[2]))))tables[match[1]]=rows;
}
function expand(id,seen=new Set()){
 if(seen.has(id))return [];const next=new Set([...seen,id]);
 return (tables[id]||[]).flatMap(r=>/^DropTable/.test(r[0])?expand(r[0],next):[r[0]]);
}
for(const id of Object.keys(tables)){
 const mob=monsters[id],chest=id.match(/^Chest[A-Z](\d+)$/);if(!mob&&!chest)continue;
 const maps=shared.mapEnemiesArray.flatMap((enemy,i)=>enemy===id&&shared.mapNames[i]?[clean(shared.mapNames[i])]:[]);
 const label=chest?'W'+chest[1]+' Colo':'Drop: '+clean(mob.Name)+(maps.length?' — '+maps.join(', '):'');
 for(const item of expand(id))if(items[item])(records[item]||=[]).push(label);
}
for(const id of Object.keys(records))records[id]=[...new Set(records[id])];
if(!records.Coral6?.some(s=>s.includes('Magni Pufferfin')))throw Error('Native drop extraction missed Gilded Coral');
fs.writeFileSync('greenstack-source-supplements.json',JSON.stringify({source:'Native client monster and recursive rare-drop tables',sha256:crypto.createHash('sha256').update(source).digest('hex'),records},null,2)+'\n');
console.log('Native tables:',Object.keys(tables).length,'; item sources:',Object.keys(records).length);
