'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),M=require('./spelunking-optimizer');
const source=fs.readFileSync('../audit/N.js','utf8');
function extract(marker){const start=source.indexOf(marker)+marker.length;assert(start>=marker.length,'Missing '+marker);let depth=0,quote='',escape=false;for(let i=start;i<source.length;i++){const ch=source[i];if(quote){if(escape)escape=false;else if(ch==='\\')escape=true;else if(ch===quote)quote='';continue;}if(ch==='"'||ch==="'")quote=ch;else if(ch==='{')depth++;else if(ch==='}'&&--depth===0)return source.slice(start,i+1);}throw Error('Unclosed handler');}
const box={window:{}};vm.runInNewContext(fs.readFileSync('world7-data.js','utf8'),box);const catalog=box.window.WORLD7_CATALOG.SpelunkUpg,handler=extract('_customBlock_Spelunk=');
let checks=0;
for(const skill of [0,49,50,508])for(const level of [-1,0,1,30])for(const sushi of [0,30,50]){
 const s={catalog,levels:catalog.map(()=>level),amber:1e100};const attrs={Spelunk:[[],[],[],[],[s.amber],s.levels],DNSM:{h:{CalcTalentMAP:{h:{235:8}},MealBonusesS:{h:{SplkUpg:376.72}}}},CustomLists:{h:{SpelunkUpg:catalog}},GetPlayersUsernames:['test'],PlayerDATABASE:{h:{test:{h:{Lv0:Array.from({length:20},(_,i)=>i===19?skill:0)}}}}};
 const m={_customBlock_SushiStuff:(n,i)=>i===6?Math.min(30,sushi):sushi},env={Math,m,c:{asNumber:Number},h:{string:String},a:{engine:{getGameAttribute:k=>attrs[k]}},p:{_customBlock_getbonus2:()=>17},q:{_customBlock_JellyOperation:()=>10}};
 m._customBlock_Spelunk=vm.runInNewContext('('+handler+')',env);
 const discount=1/(1+17*8/100)/(1+376.72*(skill>=50?2:1)/100)*(1-(sushi+10)/100);
 for(let i=0;i<catalog.length;i++){const expected=m._customBlock_Spelunk('ShopUpgCost',i,0),actual=M.cost(s,i,discount);assert(Math.abs(actual-expected)<=1e-12*Math.max(1,expected));assert.equal(m._customBlock_Spelunk('ShopUpgVisible',i,0),i===0||level>=0?1:0);checks+=2;}
}
console.log('Spelunking real-client cost and visibility comparisons passed:',checks);
