'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto'),G=require('./sneaking-gemstones'),{handler,expressionEnd}=require('./client-source-utils');
const file=process.env.IDLEON_CLIENT_PATH||(fs.existsSync('../audit/gemstone-live-N-oct28.js')?'../audit/gemstone-live-N-oct28.js':'../audit/N.js'),source=fs.readFileSync(file,'utf8');
// Read constants independently; never seed the reference client with our own catalog.
const entries=Array.from({length:8},(_,id)=>{const match=source.match(new RegExp('\\.h\\.NjGem'+id+'="([^"]+)"\\.split'));assert(match,'Missing client gem '+id);return match[1].split(' ');});
entries.forEach((r,id)=>assert.deepEqual(G.catalog[id].slice(0,3),[r[2],Number(r[3]),Number(r[5])]));
const options=[],ninja=[],menagerie=[],upgrades=Array.from({length:7},()=>[0,0,0,0,0,1]);ninja[103]=[];menagerie[7]=[];
const attrs={OptionsListAccount:options,Ninja:ninja,Menagerie:menagerie,CustomLists:{h:{NinjaUpg:upgrades}},CustomMaps:{h:{NjEQ:{h:Object.fromEntries(entries.map((r,id)=>['NjGem'+id,r]))}}}};
let talent=1;const m={},env={Math,c:{asNumber:Number,randomFloat:()=>.25},h:{string:String},y:{replace:(s,a,b)=>s.replaceAll(a,b)},a:{engine:{getGameAttribute:k=>attrs[k]}},m,p:{_customBlock_getbonus2:()=>talent}};
m._customBlock_Ninja=vm.runInNewContext('('+handler(source,'_customBlock_Ninja')+')',env);let checks=0;
for(talent of [1,2.7,5])for(const moi of [0,1,9000,99000])for(const level of [0,1,1000,9000,19000,99000,999000,1e7,2e7])for(let id=0;id<8;id++){options[238]=moi;options[233+id]=level;assert.equal(G.bonus(id,level,options[238],talent),m._customBlock_Ninja('GemstoneBonus',id,0));checks++;}
for(const rank of [0,1,4,10])for(const pilfer of [0,100,500])for(const mastery of [0,20])for(const omni of [0,5]){ninja[103][6]=pilfer;ninja[103][3]=mastery;menagerie[7][6]=omni;options[231]=rank;assert.equal(G.snapshot(attrs).dropMax,m._customBlock_Ninja('NLbonuses',6,0));checks++;}
// Execute each original counter-write expression from the public client.
const marker='a.engine.getGameAttribute("OptionsListAccount")',writes=[];let pos=0;
while((pos=source.indexOf(marker+'[Math.round(233+',pos))>=0){const leftEnd=expressionEnd(source,pos+marker.length);if(source.slice(leftEnd,leftEnd+12)==='=Math.round('){const end=expressionEnd(source,leftEnd+11);writes.push(source.slice(pos,end));}pos+=marker.length;}
assert.equal(writes.length,2,'Expect both hover-use and hold-use gemstone paths');
const clientNinja=m._customBlock_Ninja;m._customBlock_Ninja=()=>0;
for(const write of writes)for(let id=0;id<8;id++)for(const current of [9999900,10000000,20000000]){options[233+id]=current;ninja[60]=['NjGem'+id,999];vm.runInNewContext('(function(){'+write+'}).call({_DN2:60})',env);assert.equal(options[233+id],current+1000);checks++;}
m._customBlock_Ninja=clientNinja;
// Inspect and execute the original null-cleanup/save path, proving no 10M clamp there.
const saveEnd=source.indexOf('u.addSaveEntryList("OptLacc",a.engine.getGameAttribute("OptionsListAccount"))'),saveStart=source.lastIndexOf('if(0!=a.engine.getGameAttribute("OptionsListAccount").length)',saveEnd);assert(saveStart>=0);const save=source.slice(saveStart,saveEnd)+'u.addSaveEntryList("OptLacc",a.engine.getGameAttribute("OptionsListAccount"));';let saved;env.u={addSaveEntryList:(key,value)=>{assert.equal(key,'OptLacc');saved=JSON.parse(JSON.stringify(value));}};for(let id=0;id<8;id++)options[233+id]=20001000;vm.runInNewContext('(function(){'+save+'})()',env);for(let id=0;id<8;id++)assert.equal(saved[233+id],20001000);
for(let id=0;id<8;id++)assert(G.base(id,20000000)>G.base(id,10000000));
const results={client:file,sha256:crypto.createHash('sha256').update(source).digest('hex'),checks,consumePaths:writes.length,counterBefore:10000000,counterAfter:10001000,savePreserves:20001000,conclusion:'No 10M cap in inspected client collection, bonus and save paths.'};
fs.writeFileSync('../audit/gemstone-client-audit-results.json',JSON.stringify(results,null,2));fs.writeFileSync('../audit/gemstone-consume-save-evidence.js',writes.join(';\n')+';\n'+save);console.log(JSON.stringify(results));
