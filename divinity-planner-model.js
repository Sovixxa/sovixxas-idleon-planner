(function(root){
'use strict';
const parse=v=>{if(typeof v==='string'){try{return JSON.parse(v);}catch{return null;}}return v;};
const num=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const log=v=>Math.log(Math.max(v,1))/2.30259;
const names=['Volcano Link','Higher Blessings','God Rank EXP','Minor Link Power','Reef Devotion','Daily Coral','Singularity Transmutation','Transmute Base','Divinity EXP','Time from All AFK','Lumi Gain','God Rank Damage'];
const requirements=[0,600,900,1200,1500,1750,0,3000,5000,8000,10000,12000];
function bonus(id,level){if(level===null)return null;return [()=>10*level,()=>Math.round(2*level),()=>20*level/(25+level),()=>Math.round(level),()=>Math.round(2*level),()=>100*level/(40+level),()=>Math.round(100*level),()=>Math.round(10*level),()=>Math.round(50*level),()=>Math.round(125*level/(level+100)),()=>Math.round(5*level),()=>Math.round(level)][id]();}
function cost(id,level){if(level===null)return null;return id<6?1e7*6**id*(id===1?1.25:1.1)**level:(id>=10?(5+2*(id-6))**(id-6)*1.85**level:(7+2*(id-6))**(id-6)*1.13**level);}
function transmute(points,kills,hours,level){if([points,kills,hours,level].some(v=>v===null))return null;const base=(log(points)+Math.max(0,5*(log(points)-12)))*(1+bonus(7,level)/100),killMulti=1+(5*Math.max(0,Math.log2(Math.max(kills,1))-16)+Math.max(0,25*Math.floor(log(kills)-5)))/100,timeMulti=.1+(5*Math.min(120,hours)+5*Math.sqrt(Math.max(0,hours-120)))/100;return {base,killMulti,timeMulti,raw:Math.min(1e9,base*killMulti*timeMulti),spirals:Math.floor(Math.min(1e9,base*killMulti*timeMulti))};}
function decode(raw={}){
 const d=parse(raw.data)||raw,options=parse(d.OptionsListAccount??d.OptLacc),div=parse(d.Divinity),spelunk=parse(d.Spelunk),menagerie=parse(d.Menagerie);
 const levels=Object.keys(d).filter(k=>/^Lv0_\d+$/.test(k)).map(k=>num(parse(d[k])?.[14]));
 const totalLevel=levels.length&&levels.every(v=>v!==null)?levels.reduce((a,b)=>a+b,0):null;
 const points=num(div?.[24]),rank=num(div?.[25])===null?null:Math.max(0,Number(div[25])-10),reefLevels=Array.isArray(spelunk?.[13])?spelunk[13].slice(0,6).reduce((a,b)=>a+(Number(b)||0),0):null;
 const unlocked=num(menagerie?.[2]?.[2])===null?null:Number(menagerie[2][2])>=1;
 const chosen=num(options?.[425]),kills=num(options?.[623]),hours=num(options?.[624]);
 const upgrades=names.map((name,id)=>{const level=num(options?.[id<6?427+id:610+id]),value=bonus(id,level),next=level===null?null:bonus(id,level+1);return {id,name,level,value,next,cost:cost(id,level),requirement:requirements[id],eligible:id>=6&&unlocked!==true?unlocked===false?false:null:totalLevel===null?null:totalLevel>=requirements[id],currency:id<6?'Divinity points':'Singularity Spirals'};});
 const stock=(items,qty)=>{items=parse(items);qty=parse(qty);if(!Array.isArray(items)||!Array.isArray(qty))return null;return items.reduce((sum,item,i)=>sum+(item==='CKsing'?(num(qty[i])||0):0),0);};
 const inventoryIds=Object.keys(d).filter(k=>/^InventoryOrder_\d+$/.test(k));
 const stored=stock(d.ChestOrder,d.ChestQuantity),inventory=inventoryIds.map(k=>stock(d[k],d[k.replace('InventoryOrder_','ItemQTY_')]??d[k.replace('InventoryOrder_','ItemQuantity_')]));
 const spirals=stored!==null&&inventory.every(n=>n!==null)?stored+inventory.reduce((a,b)=>a+b,0):null;
 return {available:!!options&&typeof options==='object',points,rank,reefLevels,totalLevel,unlocked,chosen,kills,hours,spirals,upgrades,conversion:transmute(points,kills,hours,upgrades[7].level)};
}
function effect(id,value,m){if(value===null)return 'Unavailable in this export';const f=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:3});switch(id){case 0:return `${f(1+value/100)}× Divinity EXP; unlocks an account-wide god link`;case 1:return `+${f(value)} maximum blessing levels`;case 2:return `${f(1+value/100)}× Class EXP per God Rank${m.rank===null?'':` · ${f((1+value/100)**m.rank)}× total`}`;case 3:return `+${f(value)}% to the Divinity-level minor-link factor`;case 4:return `+${f(value)}% Divinity points per reef upgrade${m.reefLevels===null?'':` · ${f(1+value*m.reefLevels/100)}× total`}`;case 5:return `+${f(value)}% Daily Coral`;case 6:return `${f(1+value/100)}× Divinity points; enables transmutation`;case 7:return `${f(1+value/100)}× transmutation base value`;case 8:return `${f(1+value/100)}× Divinity EXP`;case 9:return `${f(Math.min(100,value))}% of non-Divinity AFK hours count toward Time Elapsed`;case 10:return `${f(1+value/100)}× Lumi gain`;case 11:return `${f(1+value/100)}× damage per God Rank above 25${m.rank===null?'':` · ${f((1+value/100)**Math.max(0,m.rank-25))}× total`}`;}}
function combine(base,additive,multipliers){const values=[base,...additive.map(x=>x.value),...multipliers.map(x=>x.value)];if(values.some(v=>v===null||!Number.isFinite(v)))return {base,additive,multipliers,pool:null,multiplier:null,rate:null};const pool=1+additive.reduce((a,b)=>a+b.value,0)/100,multiplier=pool*multipliers.reduce((a,b)=>a*b.value,1);return {base,additive,multipliers,pool,multiplier,rate:base*multiplier};}
const api={decode,bonus,cost,transmute,effect,combine};root.DivinityPlannerModel=api;if(typeof module!=='undefined')module.exports=api;
})(typeof self!=='undefined'?self:globalThis);
