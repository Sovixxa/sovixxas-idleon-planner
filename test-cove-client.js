'use strict';
// Independent oracle: execute the installed game's handler, not a second copy
// of optimizer formulas. N.js remains local and is never shipped in the app.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto'),M=require('./cove-optimizer');
const source=fs.readFileSync('../audit/N.js','utf8');
function extract(marker){const start=source.indexOf(marker)+marker.length;assert(start>=marker.length,'Missing '+marker);let depth=0,quote='',escape=false;for(let i=start;i<source.length;i++){const ch=source[i];if(quote){if(escape)escape=false;else if(ch==='\\')escape=true;else if(ch===quote)quote='';continue;}if(ch==='"'||ch==="'")quote=ch;else if(ch==='{')depth++;else if(ch==='}'&&--depth===0)return source.slice(start,i+1);}throw Error('Unclosed handler');}

const handler=extract('_customBlock_Holes2='),lists=vm.runInNewContext('('+extract('RandoListo2=')+')()');
let checks=0;
for(let trial=0;trial<30;trial++){
 const state={levels:Array.from({length:24},(_,i)=>(trial*7+i*3)%60),balances:Array.from({length:12},(_,i)=>trial===0?0.1:10**((trial+i)%14)),purchases:trial,study:15,kills:1e8,normalDR:1e5,ribbons:5,unlocked:true};
 const options=Array(700).fill(0);state.levels.forEach((n,i)=>options[630+i]=n);state.balances.forEach((n,i)=>options[654+i]=n);options[604]=state.purchases;options[668]=state.kills;options[200]=state.normalDR;
 const attributes={OptionsListAccount:options,DNSM:{h:{}},CustomLists:{h:{RandoListo2:lists}}},m={_customBlock_Holes:()=>state.study};
 const call=vm.runInNewContext('('+handler+')',{Math,c:{asNumber:Number},m,a:{engine:{getGameAttribute:k=>attributes[k]}},k:{_customBlock_getLOG:x=>Math.log(Math.max(x,1))/2.30259}});m._customBlock_Holes2=call;
 const near=(a,b)=>assert(Math.abs(a-b)<=1e-10*Math.max(1,Math.abs(a),Math.abs(b)),a+' != '+b);
 for(let id=0;id<24;id++){near(M.cost(state,id),call('Cglunko_upgCost',id,0));near(M.bonus(state,id),call('Cglunko_upgBon',id,0));checks+=2;}
 near(M.dropRate(state),call('Cglunko_DR',0,0));checks++;
 near(M.metric(state,'afk'),call('Cglunko_DR',0,0)*call('Cglunko_AFKgains',0,0));checks++;
}
console.log('Cove client audit: '+checks+' direct handler comparisons passed.');
