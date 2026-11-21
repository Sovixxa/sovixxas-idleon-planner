'use strict';
// Independent oracle: execute the installed game's handler, not a second copy
// of optimizer formulas. N.js remains local and is never shipped in the app.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto'),M=require('./fountain-optimizer');
const source=fs.readFileSync(process.env.IDLEON_CLIENT_PATH||'../audit/N.js','utf8');
function extract(marker){const start=source.indexOf(marker)+marker.length;assert(start>=marker.length,'Missing '+marker);let depth=0,quote='',escape=false;for(let i=start;i<source.length;i++){const ch=source[i];if(quote){if(escape)escape=false;else if(ch==='\\')escape=true;else if(ch===quote)quote='';continue;}if(ch==='"'||ch==="'")quote=ch;else if(ch==='{')depth++;else if(ch==='}'&&--depth===0)return source.slice(start,i+1);}throw Error('Unclosed handler');}
const handler=extract('_customBlock_Holes2='),catalog=vm.runInNewContext('('+extract('HoleFountUPG=')+')()'),info=vm.runInNewContext('('+extract('HolesInfo=')+')()');
const near=(a,b)=>assert(Math.abs(a-b)<=1e-10*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
function client(state){const holes=Array.from({length:34},()=>[]);holes[31]=state.levels;holes[32]=state.marbles;holes[30]=state.lucky;holes[9]=Array(40).fill(0);[3,16,20].forEach((slot,i)=>holes[9][slot]=state.sediment[i]);holes[11]=Array(90).fill(0);holes[11][7]=3;holes[11][82]=state.desired;holes[11][83]=state.ignored||'';
 const attributes={Holes:holes,DNSM:{h:{}},CustomLists:{h:{HoleFountUPG:catalog,HolesInfo:info}},OptionsListAccount:[],Number2Letter:['0',...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ']};attributes.OptionsListAccount[601]=state.ducks;
 const c={asNumber:Number,randomInt:(lo)=>lo},m={},env={Math,c,m,a:{engine:{getGameAttribute:key=>attributes[key]}},k:{_customBlock_getLOG:x=>Math.log(Math.max(x,1))/2.30259},p:{_customBlock_ArcadeBonus:()=>47},D:{contains:(a,x)=>a.includes(x)},h:{string:String},ba:{remove:(a,x)=>{const i=a.indexOf(x);if(i>=0)a.splice(i,1);}}};
 m._customBlock_Holes=(name,t)=>name==='B_UPG'?1:name==='CosmoBonusQTY'?4:37+t;
 const run=vm.runInNewContext('('+handler+')',env);m._customBlock_Holes2=(name,t,i)=>name==='Cglunko_upgBon'?73:run(name,t,i);
 return {call:m._customBlock_Holes2,attributes};
}
let comparisons=0;
for(let trial=0;trial<12;trial++){
 const s={levels:Array.from({length:3},(_,w)=>Array.from({length:20},(_,i)=>(trial*17+w*9+i*3)%151)),marbles:Array.from({length:3},(_,w)=>Array.from({length:20},(_,i)=>(trial+w+i)%5)),balances:Array(10).fill(1e40),sediment:[1e30,1e60,1e90],lucky:Array.from({length:9},(_,i)=>(i+trial)%6),ducks:trial%6,desired:trial%10-1,ignored:''};
 const oracle=client(s);
 for(const u of M.catalog){assert.equal(u.name,catalog[u.water][u.index][0].replaceAll('_',' '));near(M.cost(s,u),oracle.call('Cost_FountainUPG',u.water,u.index));near(M.cost(s,u,'marble'),oracle.call('Fount_MarbleizeCost',u.water,u.index));near(M.bonus(s,u.water,u.index),oracle.call('Fountain_BonTOT',u.water,u.index));assert.equal(u.marbleEligible,!!oracle.call('CanWeBUY_Marbleize',u.water,u.index));comparisons+=4;}
 for(const u of M.catalog){const next=JSON.parse(JSON.stringify(s));next.levels[u.water][u.index]++;const after=client(next);
  for(let currency=0;currency<9;currency++)for(const active of [false,true])for(const overflow of [false,true]){
   const actual=o=>o.call('Fount_CurrencyTotValue',currency,0)*o.call('FountainBar_Speed',0,0)*(active?o.call('FountainBar_ActiveSpdMulti',0,0):1)*(overflow?o.call('Fount_CurrencyKEEP',0,0):1);
   near(M.incomeFactor(next,currency,{active,overflow})/M.incomeFactor(s,currency,{active,overflow}),actual(after)/actual(oracle));comparisons++;
  }
  for(const active of [false,true]){const marble=o=>o.call('Fount_MarblePerFill',0,0)*(active?o.call('FountainBar_ActiveSpdMulti',0,0):1);near(M.metric(next,{goal:'marbleIncome',active})/M.metric(s,{goal:'marbleIncome',active}),marble(after)/marble(oracle));comparisons++;}
 }
 // Branch eligibility is tested separately from the UI water selector gate.
 for(const u of M.catalog){assert.equal(M.unlocked(s,u),M.waterOpen(s,u.water)&&!!oracle.call('Fountain_UpgUnlocked',u.water,u.index));comparisons++;}
}
// Outside factors are present in actual game consumers, not inferred from names.
for(const g of M.outsideGoals){const call=`("Fountain_BonTOT",${g.water},${g.index})/100`;assert(source.includes(call),g.label);}
console.log(`Fountain client audit: ${comparisons} direct handler comparisons passed. N.js SHA256 ${crypto.createHash('sha256').update(source).digest('hex')}`);

const notation=vm.runInNewContext('('+extract('_customBlock_NotateNumber=')+')',{Math,k:{_customBlock_getLOG:x=>Math.log(Math.max(1,x))/2.30259}});
for(const value of [0,1.9,999,1000,9999,10000,99999,1.60e19,1.63e19,1.83e19,...Array.from({length:24},(_,i)=>10**i),...Array.from({length:200},(_,i)=>1.23456789*10**(i/8))])assert.equal(M.formatCurrency(value),notation(value,'TinyE'),`Fountain notation ${value}`);
console.log('Fountain currency formatting matches client TinyE, including Q/QQ and scientific thresholds.');
if(process.env.FOUNTAIN_SAVE_PATH){
 const raw=JSON.parse(fs.readFileSync(process.env.FOUNTAIN_SAVE_PATH,'utf8')),parse=v=>typeof v==='string'?JSON.parse(v):v,state=M.decode(raw);
 const attrs=Object.fromEntries(Object.entries(raw.data).map(([k,v])=>{try{return [k,parse(v)];}catch{return [k,v];}}));
 attrs.OptionsListAccount=attrs.OptionsListAccount||attrs.OptLacc;
 attrs.Cards=[attrs.Cards0,attrs.Cards1];
 attrs.DNSM={h:{}};attrs.CustomLists={h:{HoleFountUPG:catalog,HolesInfo:info}};
 for(const key of ['CosmoUpgrades','ZenithMarket','RandoListo2'])attrs.CustomLists.h[key]=vm.runInNewContext('('+extract(key+'=')+')()');
 const m={},A=require('./arcade-model'),arcade=A.bonus({formula:'decay',base:30,scale:100},attrs.ArcadeUpg[68],A.companion(raw)).total;
 const env={Math,m,c:{asNumber:Number,getCurrentSceneName:()=>'',randomInt:lo=>lo},a:{engine:{getGameAttribute:k=>{assert(k in attrs,'Unexpected attribute '+k);return attrs[k];}}},k:{_customBlock_getLOG:x=>Math.log(Math.max(x,1))/2.30259},h:{string:String},y:{replace:(s,a,b)=>s.split(a).join(b)},D:{contains:(a,v)=>a.includes(v)},p:{_customBlock_ArcadeBonus:i=>{assert.equal(i,68);return arcade;}}};
 for(const name of ['Holes','Holes2','Thingies'])m['_customBlock_'+name]=vm.runInNewContext('('+extract('_customBlock_'+name+'=')+')',env);
 assert.equal(state.ducks,Number(attrs.OptionsListAccount[601]));
 for(const active of [false,true])for(const overflow of [false,true])for(let c=0;c<9;c++){
  attrs.Holes[11][82]=c;attrs.DNSM.h={};
  const expected=m._customBlock_Holes2('Fount_CurrencyTotValue',c,0)*m._customBlock_Holes2('FountainBar_Speed',0,0)/7200*(active?m._customBlock_Holes2('FountainBar_ActiveSpdMulti',0,0):1)*(overflow?m._customBlock_Holes2('Fount_CurrencyKEEP',0,0):1);
  near(M.earningRates(state,{goal:'all',active,overflow})[c],expected);
 }
 for(const active of [false,true])near(M.earningRates(state,{active})[9],m._customBlock_Holes2('Fount_MarblePerFill',0,0)/36000*(active?m._customBlock_Holes2('FountainBar_ActiveSpdMulti',0,0):1));
 console.log('Current save: absolute coin and marble formula rates match actual client handlers.');
 console.log(JSON.stringify({ducks:state.ducks,external:state.external,rates:M.earningRates(state,{goal:'all',active:true}),first:M.plan(state,{goal:'all',active:true,mode:'roadmap',steps:10}).steps.map(a=>({name:a.name,currency:M.currencies[a.currency],cost:a.cost,saveSeconds:a.savingEffort}))},null,2));
}
