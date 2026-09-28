'use strict';
// Refresh only the CompanionRepo data in the existing calculation bundle.
// This preserves the planner's other local calculation fixes.
const fs=require('node:fs'),{catalogs}=require('./inspect-bonus-freshness');
const rows=catalogs(fs.readFileSync(process.argv[2]||'../audit/N.js','utf8')).values.get('CompanionDB');
if(!Array.isArray(rows)||rows.length<178)throw Error('Current companion catalog unavailable');
const clean=s=>String(s).replaceAll('_',' ');
const entries=rows.map(r=>({id:clean(r[0]),desc:clean(r[1]),bonus:Number(r[2]),x1:Number(r[3]),x2:Number(r[4]),x3:Number(r[5]),x4:Number(r[6]),x5:Number(r[7]),x6:Number(r[8]),x7:Number(r[9]),desc2:clean(r[10]),bonus2:Number(r[11])}));
const file='beanstalk-engine.js',source=fs.readFileSync(file,'utf8'),match=/\[new ([\w$]+)\(0,\{\s*"?id"?:\s*"babaMummy"/.exec(source);
if(!match)throw Error('CompanionRepo factory signature changed; inspect before rebuilding');
let depth=0,quote='',escape=false,end=-1;
for(let i=match.index;i<source.length;i++){const ch=source[i];if(quote){if(escape)escape=false;else if(ch==='\\')escape=true;else if(ch===quote)quote='';continue;}if(ch==='"'||ch==="'")quote=ch;else if(ch==='[')depth++;else if(ch===']'&&--depth===0){end=i+1;break;}}
if(end<0||!source.slice(match.index,end).includes('fm rat'))throw Error('Incomplete CompanionRepo factory');
const replacement='['+entries.map((entry,id)=>`new ${match[1]}(${id},${JSON.stringify(entry)})`).join(',')+']';
fs.writeFileSync(file,source.slice(0,match.index)+replacement+source.slice(end));
const pets=entries.map((e,id)=>({id,code:e.id,name:clean(e.id),description:e.desc,upgradedDescription:e.desc2,baseBonus:e.bonus,upgradedBonus:e.bonus2}));
fs.writeFileSync('pets-data.js','// Companion bonuses extracted from the audited live game client.\nwindow.PETS_CATALOG='+JSON.stringify(pets)+';\n');
console.log(`Refreshed ${entries.length} companions in the calculation bundle and pet catalog.`);
