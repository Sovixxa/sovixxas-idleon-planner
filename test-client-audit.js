'use strict';
// Optional audit against the user's locally extracted client. Never load the full game.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const E=require('./engine');
const sourcePath=path.resolve(__dirname,'../audit/N.js');
if(!fs.existsSync(sourcePath)){console.log('SKIP client audit: extract local N.js first');process.exit(0);}
const source=fs.readFileSync(sourcePath,'utf8');
const start=source.indexOf('q._customBlock_JellyOperation=function')+'q._customBlock_JellyOperation='.length;
const end=source.indexOf(',q.__super__=ta',start);
const rowStart=source.indexOf('db.JellyUPG=function(){return')+'db.JellyUPG=function(){return'.length;
const rowEnd=source.indexOf('},',rowStart);
const rows=vm.runInNewContext(source.slice(rowStart,rowEnd),{}, {timeout:1000});
for(let i=0;i<40;i++){const m=E.UPGRADE_META[i];assert.deepEqual([m.max,m.growth,m.perLevel,m.baseCost],Array.from(rows[i].slice(1,5),Number),'Upgrade '+i);}
const research=Array.from({length:19},()=>[]);research[7]=Array(20).fill(0);research[14]=Array(180).fill(-1);research[15]=Array(9).fill(0);research[16]=Array(9).fill(25);research[17]=Array(100).fill(0);research[18]=[];
const state=E.makeState(research);state.upgrades.fill(1,0,8);state.upgrades[14]=1;state.upgrades[16]=6;state.upgrades[17]=3;state.upgrades[18]=114;state.upgrades[19]=57;state.upgrades[32]=3;
state.research[16]=state.cellLevels;state.research[17]=state.upgrades;
// Give the model the same explicit external inputs as the mocked client hooks.
state.research[0][185]=2;state.research[1][185]=2;state.rawRoot={companion:{l:[]}};
state.rawData={WeeklyBoss:{},Spelunk:Array.from({length:19},()=>[])};state.rawData.Spelunk[9][1]=25;
const arr=[{type:0,anchor:19,cells:[19]},{type:1,anchor:20,cells:[20,21]},{type:3,anchor:38,cells:E.footprint(3,38)},{type:4,anchor:72,cells:E.footprint(4,72)},{type:6,anchor:108,cells:E.footprint(6,108)}];
const info=[];info[233]=E.effectiveCounts(state,E.rawCounts(arr));info[234]=Array.from(E.organelleBoosted(arr));info[235]=Array.from(E.infectedSlots(arr));info[240]=0;info[241]=0;
const attrs={Research:state.research,DNSM:{h:{}},CustomLists:{h:{JellyUPG:rows}},PixelHelperActor:Array(28)};
attrs.PixelHelperActor[27]={behaviors:{getBehavior:()=>({_GenINFO:info})}};
const context={a:{engine:{getGameAttribute:k=>attrs[k]}},c:{asNumber:Number},n:{__cast:x=>x},md:{},D:{contains:(a,x)=>a.includes(x)},q:{},m:{
 _customBlock_GamingStatType:()=>E.paletteCellDamageBonus(state),
 _customBlock_ResearchStuff:()=>E.gridCellDamageBonus(state).value,
 _customBlock_SushiStuff:()=>E.sushiRogBonus(state,63)
}};
context.q._customBlock_JellyOperation=vm.runInNewContext('('+source.slice(start,end)+')',context,{timeout:1000});
const game=context.q._customBlock_JellyOperation;
function close(a,b,label){assert.ok(Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(a)),label+': '+a+' / '+b);}
for(let n=0;n<72;n++){close(game('BossHP',n,0),E.bossHP(n),'HP '+n);close(game('BossTime',n,0),E.bossTime(n),'time '+n);close(game('BossAtkCD',n,0),E.bossAtkCD(n),'CD '+n);}
for(const fever of [0,1,2,3,4,5]){
 state.fever=fever;state.research[7][13]=fever;const model=E.combatModel(state,arr);
 for(const u of model.units){close(game('MainAtkCD',u.type,0),u.cd,'cell CD');close(game('MainAtkDMG',u.type,0),u.baseDamage/u.prox*E.jellyDamageMultiplier(state,0),'cell damage, fever '+fever);}
 close(game('EXPMulti',0,0),E.cellExpMultiplier(state),'EXP');
}
console.log('Client audit OK: 40 upgrade records, 72 bosses, damage/cooldowns across all six Fevers');


// Compare every playable cell against the executable client formula with nonzero
// mixed passive counts (external hooks remain mocked; see BONUS-AUDIT.md).
info[233]=[3,4,2,3,1,2,2,2];info[234]=[];info[235]=[];
for(let t=0;t<8;t++){
 const one=[{type:t,anchor:90,cells:E.footprint(t,90)||[90]}];
 info[233]=E.effectiveCounts(state,E.rawCounts(one));info[234]=Array.from(E.organelleBoosted(one));info[235]=Array.from(E.infectedSlots(one));
 const u=E.combatModel(state,one).units[0];
 close(game('MainAtkCD',t,0),u.cd,'all-cell cooldown '+t);
 close(game('MainAtkDMG',t,0),u.baseDamage/u.prox*E.jellyDamageMultiplier(state,0),'all-cell damage '+t);
}
for(const counts of [[3,4,2,3,1,2,2,2],[1,0,4,0,0,0,3,5]]){
 info[233]=counts;
 close(game('UnitSumAtk',0,0),(1+2*counts[7])*(1+.5*counts[2]+.1*counts[0]),'mixed damage stacking');
 close(game('UnitSumAtkCD',0,0),1/((1+.5*counts[6])*(1+.25*counts[3]+.15*counts[1])),'mixed speed stacking');
}
console.log('Client audit OK: all eight cell formulas and mixed passive stacking');
