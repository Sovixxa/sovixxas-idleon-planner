'use strict';
// Optional local audit: compare against the actual installed client handler.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),M=require('./bubba-optimizer');
const source=fs.readFileSync('../audit/N.js','utf8');
function extract(marker){const at=source.indexOf(marker);assert(at>=0,marker);const start=at+marker.length;let depth=0,q='',escaped=false;for(let i=source.indexOf('{',start);i<source.length;i++){const ch=source[i];if(q){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch===q)q='';}else if(ch==='"'||ch==="'")q=ch;else if(ch==='{')depth++;else if(ch==='}'&&--depth===0)return source.slice(start,i+1);}throw Error(marker);}
const handler=extract('_customBlock_Bubbastuff='),catalog=name=>vm.runInNewContext('('+extract(name+'=')+')()');
// Catalog identifiers that also occur as save assignments need the function marker.
function catalogFunction(name){const body=extract(name+'=function()');return vm.runInNewContext('(function()'+body+')()');}
const upg=catalogFunction('BubbaUpg'),spelunky=catalogFunction('Spelunky');let count=0;
const near=(a,b)=>{assert(Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);count++;};
for(let trial=0;trial<18;trial++){
 const b=[Array(16).fill(0),Array.from({length:28},(_,i)=>(i*3+trial)%90),Array.from({length:28},(_,i)=>(i+trial)%8),Array.from({length:6},(_,i)=>(trial*7+i)%125),Array.from({length:8},(_,i)=>trial?1+(trial+i)%20:0),Array.from({length:5},(_,i)=>i*13+trial)];b[1][8]=trial;b[0][0]=1e30;b[0][1]=trial*71;b[0][2]=1;b[0][3]=1+trial%6;b[0][4]=1e40;b[0][15]=trial%7;for(let i=9;i<13;i++)b[0][i]=i*trial;
 const raw={Bubba:b,OptionsListAccount:[]};raw.OptionsListAccount[267]=1e30;const s=M.decode(raw);
 const attributes={Bubba:b,OptionsListAccount:raw.OptionsListAccount,CustomLists:{h:{BubbaUpg:upg,Spelunky:spelunky}},DNSM:{h:{}}};const m={_customBlock_Minehead:()=>0,_customBlock_SushiStuff:()=>0,_customBlock_Summoning:()=>0,_customBlock_Holes2:()=>0,_customBlock_Companions:()=>0},env={Math,m,q:{_customBlock_JellyOperation:()=>0},c:{asNumber:Number},a:{engine:{getGameAttribute:k=>attributes[k]}},k:{_customBlock_getLOG:x=>Math.log(Math.max(x,1))/2.30259,_customBlock_Log2:x=>Math.log2(Math.max(x,1))}};
 const fn=vm.runInNewContext('('+handler+')',env);m._customBlock_Bubbastuff=fn;
 near(M.rate(s),fn('MeatsliceRate',0,0));near(M.happiness(s.happiness),fn('HappinessBonus',0,0));near(M.diceMulti(s),fn('Dice_Multi',0,0));near(M.smokeMulti(s),fn('SmokeMeat_Multi',0,0));near(M.coinMulti(s),fn('SpareCoins_Multi',0,0));near(M.petGain(s),fn('DailyPet_HappinessQTY',0,0));near(M.purchaseHappy(s),fn('DailyPet_HappinessFromUpg',0,0));near(M.regularPats(s),fn('DailyPetting',0,0));near(M.trainingSeconds(s),fn('CharismaTraitREQ',0,0)/fn('CharismaTraitSPD',0,0));
 for(let i=0;i<28;i++){near(M.cost(s,i),fn('UpgCost',i,0));near(M.bonus(s,i),fn('TotUpgBonus',i,0));near(M.required(i),fn('MeatProdREQ',i,0));}
 for(let i=0;i<6;i++){near(M.trait(s,i),fn('CharismaBonus',i,0));near(M.gift(s,i),fn('GiftPassiveBonus',i,999));}
}
console.log(`Bubba client audit: ${count} comparisons against the game handler passed.`);
