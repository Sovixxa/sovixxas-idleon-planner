'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c={};c.window=c;vm.createContext(c);for(const file of ['tome-current-data.js','tome-current.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
const M=c.TomeCurrent,data=c.TOME_CURRENT_DATA;
const lines=data.Tome.slice(0,121).map((row,index)=>({index,currentValues:[0,0]}));
const research=Array.from({length:13},()=>[]);research[7][4]=21;research[7][9]=36;research[11]=[0,1];research[9]=[1,2,3];research[0]=[2,3];research[12]=[2,-1,3];
const options=[];options[498]=12;options[594]=42;
const spelunk=[];spelunk[46]=[1,2,3];const sushi=[];sushi[5]=[0,0,0,-1,0];
const royal=[];royal[0]=[1,2,-1];royal[5]=[3,4];
const raw={data:{Research:JSON.stringify(research),OptionsListAccount:options,Spelunk:spelunk,Sushi:sushi,RoyalG:royal,RoyalMaps:[[],[1,0,0],[0,0,0,5]]}};
const snapshot=JSON.stringify(raw),result=M.build({lines,totalAccountLevel:10000},raw);
assert.equal(result.rows.length,122);const jelly=result.rows.find(r=>r.id===121);assert.equal(jelly.score,400);assert.equal(jelly.target,800);assert.equal(jelly.value,36);assert.equal(jelly.unlock,6955);
assert.deepEqual(JSON.parse(JSON.stringify(M.lateValues(raw))),{109:3,110:21,111:2,112:6,113:12,114:5,115:5,116:3,117:42,118:3,119:2,120:7,121:36});
assert.equal(JSON.stringify(raw),snapshot,'Never mutate imported saves');
const locked=M.build({lines,totalAccountLevel:6954},raw).rows.find(r=>r.id===121);assert.equal(locked.score,0);assert.equal(locked.status,'missing');
research[7][9]=72;raw.data.Research=research;assert.equal(M.build({lines,totalAccountLevel:6955},raw).rows.find(r=>r.id===121).status,'maxed');
const missing=M.build({lines,totalAccountLevel:10000},{});assert.equal(missing.complete,false);assert.equal(missing.rows.find(r=>r.id===121).score,null);assert.equal(missing.rows.find(r=>r.id===121).value,'Unknown');
assert.equal(M.unlock(0),350);assert.equal(M.unlock(35),1750);
const sourcePath=process.env.IDLEON_CLIENT_PATH||'../audit/N.js';
if(fs.existsSync(sourcePath)){
 const source=fs.readFileSync(sourcePath,'utf8'),marker='_customBlock_Summoning=',start=source.indexOf(marker)+marker.length;assert(start>=marker.length);let depth=0,quote='',escape=false,end;
 for(let i=source.indexOf('{',start);i<source.length;i++){const ch=source[i];if(quote){if(escape)escape=false;else if(ch==='\\')escape=true;else if(ch===quote)quote='';continue;}if(ch==='"'||ch==="'")quote=ch;else if(ch==='{')depth++;else if(ch==='}'&&--depth===0){end=i+1;break;}}
 const {catalogs}=require('./inspect-bonus-freshness'),tables=catalogs(source).values;
 assert.equal(JSON.stringify(data.Tome),JSON.stringify(tables.get('Tome')));assert.equal(JSON.stringify(data.order),JSON.stringify(tables.get('NinjaInfo')[32].map(Number)));
 const attrs={DNSM:{h:{TomeQTY:[]}},CustomLists:{h:{Tome:tables.get('Tome')}}},hooks={},env={Math,a:{engine:{getGameAttribute:k=>attrs[k]}},c:{asNumber:Number},m:hooks,k:{_customBlock_getLOG:v=>Math.log(Math.max(1,v))/2.30259}};
 const run=vm.runInNewContext('('+source.slice(start,end)+')',env);let unlocked=true;hooks._customBlock_Summoning=(name,id,arg)=>name==='isTomeUnlocked'?Number(unlocked):run(name,id,arg);
 let comparisons=0;
 for(let id=0;id<data.Tome.length;id++){
  assert.equal(M.unlock(id),run('TomeLvReq',id,0));comparisons++;
  for(const value of [0,1,Number(data.Tome[id][1])/2,Number(data.Tome[id][1]),Number(data.Tome[id][1])*2])for(const active of [false,true]){unlocked=active;attrs.DNSM.h.TomeQTY[id]=value;assert.equal(M.score(value,data.Tome[id],active),run('TomePTS',id,0),`Metric ${id}, value ${value}`);comparisons++;}
 }
 console.log(`Tome: ${comparisons} client score/unlock comparisons; 122 metrics, 13 late-game save mappings, missing inputs and immutable saves pass.`);
}else{if(process.env.IDLEON_CLIENT_PATH)throw Error('Requested client is unavailable: '+sourcePath);console.log('Tome synthetic tests pass; optional client comparison skipped.');}
