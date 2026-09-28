'use strict';
// Preserve other bundled fixes; patch only the audited companion/Arcade paths.
// Reapply after replacing or rebuilding beanstalk-engine.js.
const fs=require('node:fs');
function companionLevels(raw,data){
 const parse=value=>{if(typeof value!=='string')return value;try{return JSON.parse(value);}catch{return null;}};
 data=parse(data)||parse(raw?.data)||raw||{};
 const levels=new Map(),sources=[raw,parse(raw?.data),data].filter(Boolean);
 let rows=[];
 for(const source of sources){const companion=parse(source.companion??source.Companion),list=parse(companion?.l??(Array.isArray(companion)?companion:null));if(Array.isArray(list)){rows=list;break;}}
 for(const row of rows){const parts=Array.isArray(row)?row:String(row).split(','),id=Number(parts[0]),level=Number(parts[4]);if(!String(parts[0]??'').trim()||!Number.isInteger(id)||id<0)continue;levels.set(id,Math.max(levels.get(id)??0,Number.isFinite(level)?level:0));}
 let options;
 for(const source of [data,raw].filter(Boolean)){options=parse(source.OptionsListAccount??source.OptLacc);if(options&&typeof options==='object')break;}
 for(const token of String(options?.[606]??options?.h?.[606]??'').split(',')){if(!token.trim())continue;const id=Number(token);if(Number.isInteger(id)&&id>=0)levels.set(id,0);}
 return levels;
}
function normalizeCompanionData(raw){
 const parse=value=>{if(typeof value!=='string')return value;try{return JSON.parse(value);}catch{return null;}};
 const data=parse(raw?.data)||raw||{},options=parse(data.OptionsListAccount??data.OptLacc);
 return options&&typeof options==='object'?{...data,OptionsListAccount:options,OptLacc:options}:data;
}
function build(){
 const file='beanstalk-engine.js';let source=fs.readFileSync(file,'utf8');
 function replace(before,after,count=1){if(source.includes(after))return;assertCount(before,count);source=source.replaceAll(before,after);}
 function assertCount(text,count){if(source.split(text).length-1!==count)throw Error('Bundle signature changed; review: '+text.slice(0,100));}
 const start=source.indexOf('var XM='),end=source.indexOf(',hu=',start);if(start<0||end<0)throw Error('Companion input adapter not found');
 source=source.slice(0,start)+'var XM='+companionLevels.toString()+source.slice(end);
 if(!source.includes('var XMD='))source=source.replace('var XM=','var XMD='+normalizeCompanionData.toString()+';var XM=');
 replace('let t=l?.data||l||{},e=XM(l,t)','let t=XMD(l),e=XM(l,t)',2);
 const call='by(s,n,l?.charNames||n.fakePlayerNames(),r,l?.serverVars||{},!0)';
 replace(call,'(s.set("arcadeCompanionMultiplier",hu(e,27,1,1.5)===1?2:1),'+call+')',2);
 replace('t.find(d=>d.id===27)?.owned&&s.bonuses.forEach(d=>{d.hasCompanion27=!0})','s.bonuses.forEach(d=>{d.hasCompanion27=l.get("arcadeCompanionMultiplier")===2})');
 replace('e>=101&&(r*=2),this.hasCompanion27','e===101&&(r*=2),this.hasCompanion27');
 replace('String(s?.[606]??s?.h?.[606]??"").split(",").map(Number)','String(s?.[606]??s?.h?.[606]??"").split(",").filter(v=>v.trim()!=="").map(Number)');
 replace('let p=String(c).split(","),M=Number(p[0]);if(!Number.isFinite(M))continue;','let p=String(c).split(","),M=Number(p[0]);if(!p[0].trim()||!Number.isInteger(M)||M<0)continue;');
 replace('y.copies++,y.upgraded||(y.upgraded=Number(p[4])===1),m.set(M,y)','y.copies++,y.level=Math.max(y.level??0,Number(p[4])||0),y.upgraded=y.level===1,m.set(M,y)');
 const {catalogs}=require('./inspect-bonus-freshness');
 const rows=catalogs(fs.readFileSync(process.argv[2]||'../audit/N.js','utf8')).values.get('ArcadeShopInfo');
 if(!Array.isArray(rows)||rows.length<73)throw Error('Current Arcade catalog unavailable');
 const factory=/\[new ([\w$]+)\(0,\{\s*"?effect"?:\s*"\+\{ Base Damage"/.exec(source);
 if(!factory)throw Error('Arcade catalog factory changed');
 let depth=0,quote='',escape=false,last=-1;
 for(let i=factory.index;i<source.length;i++){const ch=source[i];if(quote){if(escape)escape=false;else if(ch==='\\')escape=true;else if(ch===quote)quote='';continue;}if(ch==='"'||ch==="'")quote=ch;else if(ch==='[')depth++;else if(ch===']'&&--depth===0){last=i+1;break;}}
 if(last<0)throw Error('Unclosed Arcade catalog');
 const clean=s=>String(s).replaceAll('_',' ').trim();
 const updated='['+rows.map((r,id)=>`new ${factory[1]}(${id},${JSON.stringify({effect:clean(r[0]),x1:Number(r[1]),x2:Number(r[2]),func:r[3],type:clean(r[4]),lvlUpText:clean(r[5]),barType:Number(r[6])})})`).join(',')+']';
 source=source.slice(0,factory.index)+updated+source.slice(last);
 fs.writeFileSync(file,source);console.log('Companion decoding and Arcade rules refreshed in the shared calculation bundle.');
}
module.exports={companionLevels,build};
if(require.main===module)build();
