'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict'),esbuild=require('esbuild'),{spawnSync}=require('child_process'),{handler}=require('./client-source-utils'),{catalogs}=require('./inspect-bonus-freshness');
const source=fs.readFileSync('../audit/N.js','utf8'),table=catalogs(source).values.get('NinjaUpg');
const parser=fs.readFileSync('vendor/idleon-toolbox/parsers/world-6/sneaking.ts','utf8');
const body=parser.slice(parser.indexOf('export const getLocalNinjaUpgradeBonus'),parser.indexOf('const getItemsMaxLevel')).replace('export const','globalThis.getBonus =');
// Strip the variable name after converting the export to an assignment.
const js=esbuild.transformSync(body.replace('globalThis.getBonus = getLocalNinjaUpgradeBonus =','globalThis.getBonus ='),{loader:'ts'}).code;
const ctx={getInventoryNinjaItem:()=>0,getPaletteBonus:()=>0,getUpgradeVaultBonus:()=>0,getCloudBonus:()=>0};vm.runInNewContext(js,ctx);
let checks=0;
for(const id of [6,7,10,11,12])for(const omni of [0,1,17])for(const mastery of [0,1,9]){
 const levels=Array(32).fill(5),men=Array.from({length:8},()=>Array(32).fill(0));men[7][id]=omni;
 const opts=[];opts[231]=mastery;const attrs={Ninja:Array.from({length:104},(_,i)=>i===103?levels:[]),Menagerie:men,OptionsListAccount:opts,CustomLists:{h:{NinjaUpg:table}}};
 const env={Math,a:{engine:{getGameAttribute:k=>attrs[k]}},c:{asNumber:Number},m:{_customBlock_Ninja:()=>0,_customBlock_GamingStatType:()=>0,_customBlock_Summoning:()=>0,_customBlock_Dreamstuff:()=>0}};
 const native=vm.runInNewContext('('+handler(source,'_customBlock_Ninja')+')',env);
 const upgrades=table.map((row,i)=>({level:levels[i],modifier:Number(row[5])}));
 assert.equal(ctx.getBonus(upgrades,id,[],[],{menagerie:men,accountOptions:opts}),native('NLbonuses',id,0),`upgrade ${id}, omni ${omni}, mastery ${mastery}`);checks++;
}
const script=fs.readFileSync('apply-v124-math.cjs','utf8'),files=[...new Set([...script.matchAll(/replace\('([^']+)'/g)].map(m=>m[1]))];
const tmp=fs.mkdtempSync(path.resolve('../audit/v124-replay-'));
for(const file of [...files,'apply-v124-math.cjs'])fs.copyFileSync(file,path.join(tmp,file));
const before=files.map(file=>fs.readFileSync(path.join(tmp,file),'utf8'));
const result=spawnSync(process.execPath,['apply-v124-math.cjs'],{cwd:tmp,encoding:'utf8'});assert.equal(result.status,0,result.stderr);
files.forEach((file,i)=>assert.equal(fs.readFileSync(path.join(tmp,file),'utf8'),before[i],file+' changed on replay'));
const legacy={console:{log(){},warn(){},error(){}},structuredClone,localStorage:{getItem(){return null}}};legacy.window=legacy;
vm.runInNewContext(fs.readFileSync('beanstalk-engine.js','utf8'),legacy);
const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),beforeRaw=JSON.stringify(raw),read=v=>typeof v==='string'?JSON.parse(v):v;
const off=structuredClone(raw),on=structuredClone(raw);
for(const [save,owned] of [[off,false],[on,true]]){const opts=read(save.data.OptionsListAccount??save.data.OptLacc);opts[311]=owned?'策':'';save.data.OptLacc=opts;save.data.OptionsListAccount=opts;save.data.Menagerie=Array.from({length:8},()=>Array(40).fill(0));if(owned)save.data.Menagerie[7][6]=13;}
const a=legacy.BeanValueEngine.systems(off),caps=a.get('upgradeVault').bonuses.map(x=>x.data.max_level),baseNinja=a.get('sneaking').sneakingUpgrades[6].getBonus();
const b=legacy.BeanValueEngine.systems(on),eligible=catalogs(source).values.get('Research')[63];
for(const up of b.get('upgradeVault').bonuses)assert.equal(up.data.max_level-caps[up.id],eligible.includes(String(up.id))?25:0,'Legacy vault '+up.id);
assert.equal(b.get('sneaking').sneakingUpgrades[6].getBonus()-baseNinja,13*Number(table[6][5]));
const reset=legacy.BeanValueEngine.systems(off);assert.deepEqual(reset.get('upgradeVault').bonuses.map(x=>x.data.max_level),caps,'Changing accounts resets event caps');assert.equal(reset.get('sneaking').sneakingUpgrades[6].getBonus(),baseNinja);
assert.equal(JSON.stringify(raw),beforeRaw);
console.log(`v1.24 audit: ${checks} native Omnijade/item-cap comparisons, all legacy Vault caps, saved Omnijade bonuses and migration replay pass.`);
