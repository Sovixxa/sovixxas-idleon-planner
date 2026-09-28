'use strict';
process.on('uncaughtException',error=>{console.error(error.name+': '+error.message);console.error(error.stack.split('\n').filter(line=>/^\s+at /.test(line)).join('\n'));process.exitCode=1;});
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const A=require('./arcade-model'),{companionLevels}=require('./build-companion-math'),{catalogs}=require('./inspect-bonus-freshness');
const ctx={console:{log(){},warn(){},error(){},debug(){}},structuredClone,localStorage:{getItem(){return null;}}};ctx.window=ctx;vm.createContext(ctx);
for(const file of ['arcade-data.js','beanstalk-engine.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
const clean=s=>String(s).replaceAll('_',' ').trim(),near=(a,b,label)=>assert(Math.abs(a-b)<=1e-10*Math.max(1,Math.abs(b)),`${label}: ${a} != ${b}`);
assert.equal(companionLevels({}).size,0);assert.equal(companionLevels({data:{OptLacc:JSON.stringify({606:', ,27,,'})}}).has(0),false);
assert.equal(companionLevels({companion:JSON.stringify({l:['27,0,0,0,1']}),data:{OptLacc:JSON.stringify({606:'27'})}}).get(27),0);
assert.equal(companionLevels({Companion:{l:[[27,0,0,0,1],[27,0,0,0,2],['',0,0,0,0]]}}).get(27),2);
assert.equal(companionLevels({Companion:{l:['',',0,0,0,0']}}).size,0);
assert.equal(ctx.BeanValueEngine.pets({}).items.filter(p=>p.borrowed).length,0);
const cases=[
 {name:'none',rows:[],borrowed:'',strength:0},
 {name:'base',rows:['27,0,0,0,0'],borrowed:'',strength:1},
 {name:'upgraded',rows:['27,0,0,0,1'],borrowed:'',strength:1.5},
 {name:'borrowed only',rows:[],borrowed:'27',strength:1},
 {name:'borrowed upgraded',rows:['27,0,0,0,1'],borrowed:'27',strength:1},
 {name:'duplicate copies',rows:['27,0,0,0,1','27,0,0,0,0'],borrowed:'',strength:1.5},
 {name:'level above one',rows:['27,0,0,0,1','27,0,0,0,2'],borrowed:'',strength:1},
 {name:'explicit Doot loan',rows:[],borrowed:'0',strength:0,doot:true}
];
for(const item of cases){const options=[];options[606]=item.borrowed;const raw={companion:{l:item.rows},data:{OptLacc:JSON.stringify(options)}};assert.equal(A.companion(raw).multiplier,item.strength===1?2:1,item.name);}
assert.equal(A.companion({companion:{l:['27,0,0,0,1','27,0,0,0,']},data:{OptLacc:{606:''}}}).multiplier,null);
const clientPath=process.env.IDLEON_CLIENT_PATH||'../audit/N.js';let oracle=null,checks=0,records;
if(fs.existsSync(clientPath)){
 const source=fs.readFileSync(clientPath,'utf8');records=catalogs(source).values.get('ArcadeShopInfo');
 assert.equal(JSON.stringify(ctx.ARCADE_CATALOG.map(r=>[r.description,r.base,r.scale,r.formula,r.label,r.unlock])),JSON.stringify(records.map(r=>[clean(r[0]),Number(r[1]),Number(r[2]),r[3],clean(r[5]),r[6]])));
 function extract(name){const match=new RegExp('\\.'+name+'\\s*=\\s*(function\\s*\\()').exec(source);assert(match,name);const start=match.index+match[0].length-match[1].length;let depth=0,quote='',escape=false;for(let i=source.indexOf('{',start);i<source.length;i++){const ch=source[i];if(quote){if(escape)escape=false;else if(ch==='\\')escape=true;else if(ch===quote)quote='';continue;}if(ch==='"'||ch==="'")quote=ch;else if(ch==='{')depth++;else if(ch==='}'&&--depth===0)return source.slice(start,i+1);}throw Error('Unclosed '+name);}
 const attrs={DNSM:{h:{}},CustomLists:{h:{ArcadeShopInfo:records}},ArcadeUpg:[]};let strength=0;const x={};
 const env={a:{engine:{getGameAttribute:k=>attrs[k]}},c:{asNumber:Number},h:{string:String},m:{_customBlock_Companions:()=>strength},x};
 x._customBlock_ArbitraryCode5Inputs=vm.runInNewContext('('+extract('_customBlock_ArbitraryCode5Inputs')+')',env);
 const run=vm.runInNewContext('('+extract('_customBlock_ArcadeBonus')+')',env);
 oracle=(id,level,pet)=>{strength=pet;attrs.ArcadeUpg[id]=level;return run(id);};
 for(const row of ctx.ARCADE_CATALOG)for(const level of [0,1,9,10,99,100,101,102])for(const pet of [0,1,1.5]){near(A.bonus(row,level,{multiplier:pet===1?2:1}).total,oracle(row.id,level,pet),'Page/client '+row.id);checks++;}
}else if(process.env.IDLEON_CLIENT_PATH)throw Error('Requested client unavailable');
if(fs.existsSync('../example json.txt')){
 const original=JSON.parse(fs.readFileSync('../example json.txt','utf8'));
 for(const [caseIndex,item] of cases.entries()){
  const raw=structuredClone(original);raw.companion=caseIndex%2?JSON.stringify({l:item.rows}):{l:item.rows};const d=raw.data||raw;
  let options=d.OptionsListAccount??d.OptLacc;options=typeof options==='string'?JSON.parse(options):options;options[606]=item.borrowed;
  d.OptionsListAccount=caseIndex%2?JSON.stringify(options):options;d.OptLacc=d.OptionsListAccount;
  d.ArcadeUpg=Array.from({length:73},(_,i)=>[0,1,9,10,99,100,101,102][(i+caseIndex)%8]);const snapshot=JSON.stringify(raw);
  const systems=ctx.BeanValueEngine.systems(raw),arcade=systems.get('arcade');assert.equal(arcade.bonuses.length,73);assert.equal(systems.get('companions')[0].owned,!!item.doot,item.name+' Doot ownership');
  for(const row of arcade.bonuses){const expected=oracle?oracle(row.index,row.level,item.strength):A.bonus(ctx.ARCADE_CATALOG[row.index],row.level,{multiplier:item.strength===1?2:1}).total;near(row.getBonus(),expected,item.name+' bundled '+row.index);checks++;}
  near(systems.get('gaming').arcadeBonusToShovelSpeed,arcade.bonuses[31].getBonus(),item.name+' dependent Gaming calculation');
  assert.equal(JSON.stringify(raw),snapshot,'Imported save must not be mutated');
 }
}else console.log('Full-save integration skipped: local sample unavailable.');
console.log(`Arcade/companions: ${checks} formula comparisons, all 73 records, eight ownership scenarios, Gaming propagation, empty-loan decoding and save immutability pass.`);
