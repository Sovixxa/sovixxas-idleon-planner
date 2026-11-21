'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {catalogs}=require('./inspect-bonus-freshness'),C=require('./cooking');
const source=fs.readFileSync(process.env.IDLEON_CLIENT_PATH||'../audit/purity-live-N-nov06.js','utf8');
function extract(name){
 const match=new RegExp('\\.'+name+'\\s*=\\s*(function\\s*\\()').exec(source);assert(match,name);
 const start=match.index+match[0].length-match[1].length;let depth=0,quote='',escape=false;
 for(let i=source.indexOf('{',start);i<source.length;i++){
  const ch=source[i];if(quote){if(escape)escape=false;else if(ch==='\\')escape=true;else if(ch===quote)quote='';continue;}
  if(ch==='"'||ch==="'")quote=ch;else if(ch==='{')depth++;else if(ch==='}'&&--depth===0)return source.slice(start,i+1);
 }throw Error('Unclosed '+name);
}
const records=catalogs(source).values.get('ArcadeShopInfo');
assert(records[28][0].includes('Cooking'));
const attrs={DNSM:{h:{}},CustomLists:{h:{ArcadeShopInfo:records}},ArcadeUpg:[]};let strength=0;
const x={},env={a:{engine:{getGameAttribute:k=>attrs[k]}},c:{asNumber:Number},h:{string:String},m:{_customBlock_Companions:()=>strength},x};
x._customBlock_ArbitraryCode5Inputs=vm.runInNewContext('('+extract('_customBlock_ArbitraryCode5Inputs')+')',env);
const arcade=vm.runInNewContext('('+extract('_customBlock_ArcadeBonus')+')',env);
const ctx={console:{log(){},warn(){},error(){}},structuredClone};ctx.window=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync('prayer-math-engine.js','utf8'),ctx);const M=ctx.PrayerMath;
const original=JSON.parse(fs.readFileSync('../example json.txt','utf8')),read=v=>typeof v==='string'?JSON.parse(v):v;
const near=(a,b)=>assert(Math.abs(a-b)<=1e-10*Math.max(1,Math.abs(b)),`${a} != ${b}`);
let checks=0;
for(const pet of [{strength:0,rows:[],loan:''},{strength:1,rows:['27,0,0,0,0'],loan:''},{strength:1.5,rows:['27,0,0,0,1'],loan:''},{strength:1,rows:['27,0,0,0,1'],loan:'27'}]){
 for(const level of [0,1,100,101,102]){
  const raw=structuredClone(original),d=raw.data,opts=read(d.OptionsListAccount??d.OptLacc);
  opts[606]=pet.loan;d.OptionsListAccount=opts;d.OptLacc=opts;raw.companion={l:pet.rows};
  d.ArcadeUpg=read(d.ArcadeUpg);d.ArcadeUpg[28]=level;
  const parsed=M.parseData(structuredClone(d),raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);
  attrs.ArcadeUpg[28]=level;strength=pet.strength;const expected=arcade(28);
  const row=parsed.account.arcade.shop.find(r=>r.effect.includes('Cooking_Speed'));assert(row);near(row.bonus,expected);
  const kitchens=()=>M.parseKitchens(read(d.Cooking),read(d.Atoms),parsed.characters,parsed.account,{characterIndex:0}).filter(Boolean);
  const before=kitchens();
  for(const k of before){const factor=k.mealSpeedBreakdown.categories[0].sources.find(s=>s.name==='Arcade');near(factor.value,1+expected/100);near((factor.value-1)*100,expected);}
  row.bonus=0;const after=kitchens();
  before.forEach((k,i)=>near(k.mealSpeed/after[i].mealSpeed,1+expected/100));
  const factors=before[0].mealSpeedBreakdown.categories[0].sources,shares=C.bonusShares(factors),share=shares.find(s=>s.name==='Arcade');
  const exact=100*Math.log1p(expected/100)/Math.log(before[0].mealSpeed/10);
  assert(Math.abs(share.share-exact)<=.10000001);
  assert.equal(shares.reduce((sum,s)=>sum+Math.round(s.share*10),0),1000);
  checks++;
 }
}
const sample=M.parseData(structuredClone(original.data),original.charNames,original.companion,original.guildData,original.serverVars||{},original.accountCreateTime,original.tournament);
const kitchen=()=>M.parseKitchens(read(original.data.Cooking),read(original.data.Atoms),sample.characters,sample.account,{characterIndex:0})[0];
const factor=(k,name)=>k.mealSpeedBreakdown.categories[0].sources.find(s=>s.name===name).value;
const beforePrisma=kitchen(),prismaRow=sample.account.arcade.shop.find(r=>r.effect.includes('Prisma_Bonuses'));
assert(prismaRow.bonus>0);prismaRow.bonus=0;const afterPrisma=kitchen();
near(factor(beforePrisma,'Arcade'),factor(afterPrisma,'Arcade'));
assert(factor(beforePrisma,'Diamond Chef (Bubble)')>factor(afterPrisma,'Diamond Chef (Bubble)'));
near(beforePrisma.mealSpeed/afterPrisma.mealSpeed,factor(beforePrisma,'Diamond Chef (Bubble)')/factor(afterPrisma,'Diamond Chef (Bubble)'));
console.log(`Cooking Arcade: ${checks} independent client comparisons; upgrade levels, companions/loan, all kitchen speed ratios, bonus percentages, normalized shares and separate Prisma/Diamond Chef path pass.`);
