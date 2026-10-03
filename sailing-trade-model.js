(function(root){
'use strict';
const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v;}catch{return null;}};
function inputNumber(text){const m=String(text).trim().replaceAll(',','').match(/^(\d+(?:\.\d*)?|\.\d+)(?:e([+-]?\d+)|\s*([kmbtq]))?$/i);if(!m)return null;const n=Number(m[1])*10**(m[2]?Number(m[2]):({k:3,m:6,b:9,t:12,q:15}[m[3]?.toLowerCase()]||0));return Number.isFinite(n)&&n>=0?n:null;}
function prefix(gold){return gold>0&&Number.isFinite(gold)?Math.floor(gold/Math.max(1,10**Math.floor(Math.log(Math.max(gold,1))/2.30259))*100):null;}
function qualifies(gold){const p=prefix(gold);return p!==null&&p>=774&&p<=779;}
function plan(offer,floor,stock=offer.stock){
 if(!Number.isFinite(stock)||stock<0||!Number.isFinite(floor)||floor<=0||!Number.isFinite(offer.rate)||offer.rate<=0)return null;
 const cost=Math.max(stock*.2,floor),gold=cost*offer.rate,affordable=stock>=cost;
 if(affordable&&qualifies(gold))return {stock,cost,gold,ready:true,add:0,targetStock:stock,targetGold:gold,low:stock,high:stock,floorBound:cost===floor};
 // Aim at the middle of 777.xx; avoid advertised rounding and boundary errors.
 let scale=10**Math.floor(Math.log10(Math.max(gold,1))),targetGold=7.775*scale;
 if(targetGold<gold)targetGold*=10;
 const targetCost=targetGold/offer.rate;
 const lowGold=targetGold/7.775*7.77,highGold=targetGold/7.775*7.78;
 const floorQualifies=qualifies(floor*offer.rate);
 const targetStock=floorQualifies&&stock<floor?floor:Math.max(targetCost*5,targetCost);
 return {stock,cost,gold,affordable,ready:false,targetStock,targetGold:floorQualifies&&stock<floor?floor*offer.rate:targetGold,add:Math.max(0,targetStock-stock),low:floorQualifies&&stock<floor?floor:5*lowGold/offer.rate,high:floorQualifies&&stock<floor?5*floor:5*highGold/offer.rate,floorBound:cost===floor};
}
function trim(offer,floor){let stock=offer.stock;for(let n=1;n<=12;n++){const cost=Math.max(.2*stock,floor);if(stock<cost)break;stock-=cost;const p=plan(offer,floor,stock);if(p&&p.add<plan(offer,floor).add&&p.targetGold<=plan(offer,floor).gold)return {...p,trades:n,spent:offer.stock-stock};}return null;}
function calculate(raw,M=root.DashboardMath,now=Date.now()){
 raw=structuredClone(raw||{});const data=parse(raw.data)||raw;if(!data.Sailing)return {missing:true};if(!data.OptLacc)data.OptLacc=data.OptionsListAccount;
 const OriginalDate=root.Date,saved=Number(parse(data.TimeAway)?.GlobalTime||0)*1000;root.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[saved||now]));}static now(){return saved||now;}};
 try{const p=M.parseData(data,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);return M.getSailingTradeContext(p.account,p.characters,data,now);}finally{root.Date=OriginalDate;}
}
const api={inputNumber,prefix,qualifies,plan,trim,calculate};root.SailingTradeModel=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
