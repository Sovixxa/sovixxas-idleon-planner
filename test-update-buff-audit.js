'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const esbuild=require('esbuild');
const vendor=path.resolve('vendor/idleon-toolbox');
const bundle=esbuild.buildSync({stdin:{contents:`export * from './vendor/idleon-toolbox/parsers/world-7/menagerie'; export * from './vendor/idleon-toolbox/parsers/world-6/farming'; export * from './vendor/idleon-toolbox/parsers/obols';`,resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'Audit',alias:{'@parsers':vendor+'/parsers','@utility':vendor+'/utility','@website-data':vendor+'/data/website-data/index.js'}});
const ctx={console:{log(){},warn(){},error(){}},structuredClone};ctx.window=ctx;ctx.self=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync('prayer-math-engine.js','utf8'),ctx);vm.runInContext(bundle.outputFiles[0].text,ctx);
const {getCrucibleBonus,getStickerBonus,getObolsBonus}=ctx.Audit;
const state=()=>Array.from({length:7},()=>Array(40).fill(0));
const a={menagerie:state(),accountOptions:[]};
for(const [i,wave] of [5,10,15,20,25,35,50,60,70,85,100,125,150,175,200,250].entries()){
 a.accountOptions[628]=wave;a.menagerie[2][8]=0;assert.equal(getCrucibleBonus(a,i),0);
 a.menagerie[2][8]=1;a.accountOptions[628]=wave-1;assert.equal(getCrucibleBonus(a,i),0);
 a.accountOptions[628]=wave;assert.equal(getCrucibleBonus(a,i),1);
}
const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),M=ctx.PrayerMath;
const parse=d=>M.parseData(structuredClone(d),raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);
const base=parse(raw.data),d=structuredClone(raw.data),m=state(),opts=typeof d.OptLacc==='string'?JSON.parse(d.OptLacc):d.OptLacc;
m[2][8]=1;opts[628]=250;d.OptLacc=JSON.stringify(opts);d.Menagerie=JSON.stringify(m);const next=parse(d);
const near=(x,y)=>assert(Number.isFinite(x)&&Math.abs(x-y)<Math.max(1,Math.abs(y))*1e-8,`${x} != ${y}`);
for(const [key,field,mult] of [['owl','featherRate',5],['kangaroo','fishRate',4],['bubba','meatsliceRate',3]])near(next.account[key][field],base.account[key][field]*mult);
near(M.getClassExpMulti(next.characters[1],next.account,next.characters).value,M.getClassExpMulti(base.characters[1],base.account,base.characters).value*21);
near(next.account.spelunking.power.value,base.account.spelunking.power.value*81);
const breakdown=base.account.research.researchEXPmultiBreakdown;
const pool=breakdown.categories.find(c=>c.name==='Additive %').sources.reduce((n,x)=>n+x.value,0);
near(next.account.research.researchEXPrateTOT/base.account.research.researchEXPrateTOT,(100+pool+60)/(100+pool));
const read=v=>typeof v==='string'?JSON.parse(v):v;
const speed=p=>M.parseKitchens(read(raw.data.Cooking),read(raw.data.Atoms),p.characters,p.account,{characterIndex:1})[0].mealSpeed;
near(speed(next),speed(base)*30);
const stickerAccount={...base.account};stickerAccount.menagerie=state();
for(const i of [1,2]){
 const value=getStickerBonus(stickerAccount,i);assert(value>0);
 near(getStickerBonus(stickerAccount,i,99),value);assert.equal(getStickerBonus(stickerAccount,i,100),0);
 stickerAccount.menagerie[2][22]=1;assert.equal(getStickerBonus(stickerAccount,i,99),0);near(getStickerBonus(stickerAccount,i,100),value);
 stickerAccount.menagerie[2][22]=0;
}
const obols={miscMultiplier:1.75,stats:{STR:{personalBonus:10,familyBonus:20},Drop_Rate:{personalBonus:8,familyBonus:12}}};
assert.equal(getObolsBonus(obols,'STR'),30);assert.equal(getObolsBonus(obols,'Drop_Rate'),35);
console.log('Update audit: 48 Crucible boundary checks, seven rate consumers, sticker pool switching and misc obol exclusions pass.');
