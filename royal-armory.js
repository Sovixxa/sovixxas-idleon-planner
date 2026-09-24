(function(root){'use strict';
const parse=v=>{if(typeof v==='string')try{return JSON.parse(v);}catch{return null;}return v;};
const known=v=>v==null||v===''||typeof v==='boolean'||!Number.isFinite(Number(v))||Number(v)<0?null:Number(v);
const fmt=v=>v==null?'Unknown':Number(v).toLocaleString(undefined,{maximumFractionDigits:2,notation:Math.abs(v)>=1e6?'compact':'standard'});
const clean=v=>String(v??'').replaceAll('_',' ').replaceAll('千','x').replaceAll('製','').replaceAll('@',' ').replace(/\s+/g,' ').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Client tokens: { = amount, } = 1 + amount/100; $ has a bespoke formula for each upgrade.
const apply=(text,bonus,dollar=null)=>clean(String(text??'').replaceAll('{',bonus==null?'—':fmt(bonus)).replaceAll('}',bonus==null?'—':fmt(1+bonus/100)).replaceAll('$',dollar==null?'—':String(dollar)));
function model(rawRoot={}){
 const data=parse(rawRoot?.data)||rawRoot||{},catalog=root.ROYAL_ARMORY_CATALOG||{},royal=parse(data.RoyalG)||[],maps=parse(data.RoyalMaps)||[],levels=parse(royal[2])||[],entries=catalog.upgrades||[],slotMap=(catalog.slotToId||[]).map(Number);
 const values=entries.map(x=>known(levels[x.index])),total=values.every(x=>x!=null)?values.reduce((a,b)=>a+b,0):null;
 const thresholds=entries.map(x=>Number(x.unlockTotalLevels)).sort((a,b)=>a-b);
 const bonusAt=id=>{const value=known(levels[id]),entry=entries.find(x=>x.index===id);return value==null||!entry?null:value*Number(entry.bonusPerLevel);};
 function dollar(id){
  const value=bonusAt(id);
  if(id===0)return '25';
  if(id===1)return value==null?null:fmt(3+value/100);
  if(id===19||id===21)return value==null?null:fmt((id===19?50:25)+value);
  if(id===39)return value==null?null:fmt(value);
  if(id===40)return value==null?null:fmt(Math.min(75,value));
  if(id===42){const b=bonusAt(43);return b==null?null:`${fmt(1+2*(1+b/100))}x EXP & ${fmt(1+2*(1+b/100))}x Collection Rate!`;}
  if(id===44){const b=bonusAt(69);return b==null?null:fmt(5*(1+b/100));}
  if(id===71)return value==null?null:value>=1?`You now get +1 additional PTS every ${Math.round(11-value)} Ranks`:'';
  return null;
 }
 const upgrades=entries.map(x=>{
  const level=known(levels[x.index]),bonus=bonusAt(x.index),slot=slotMap.indexOf(x.index),required=slot<0?null:thresholds[slot],unlocked=slot<0?false:total==null?null:total>=required,dollarValue=dollar(x.index),contextMissing=String(x.description).includes('$')&&dollarValue==null;
  return{id:x.index,slot,level,max:Number(x.maxLevel),bonus,name:clean(x.name),required,unlocked,contextMissing,description:apply(x.description,bonus,dollarValue)+(contextMissing?' Context-dependent value unavailable.':'')};
 });
 const outposts=Array.isArray(maps)?maps.map((x,id)=>({id,data:parse(x)})).filter(x=>Array.isArray(x.data)&&x.data.length>=3).map(x=>({id:x.id,barracks:known(x.data[0]),logistics:known(x.data[1]),education:known(x.data[2]),tradeExp:known(x.data[3]),intelExp:known(x.data[4]),commandExp:known(x.data[5]),militaryExp:known(x.data[6]),purityExp:known(x.data[7]),connection1:known(x.data[8]),connection2:known(x.data[9]),mode:known(x.data[10]),units:x.data[11]==null?null:String(x.data[11]),boosted:known(x.data[12])==null?null:Number(x.data[12])>0})):[];
 const resourceStorage=parse(royal[1])||[],nodeLevels=parse(royal[5])||[];
 const resources=(catalog.royalResources||[]).map(x=>({id:x.index,world:Math.floor(x.index/20)+1,grade:known(nodeLevels[x.index]),stored:known(resourceStorage[x.resourceIndex]),resourceIndex:Number(x.resourceIndex),baseMax:Number(x.baseMaxQuantity)}));
 const statueLevels=parse(royal[0])||[],reverence=bonusAt(45);
 const statues=(catalog.royalStatueNames||[]).map((name,id)=>{
  const level=known(statueLevels[id]),named=typeof name==='string'&&name.length>2,base=Number(catalog.royalStatueBase?.[id]),per=Number(catalog.royalStatuePerLevel?.[id]);
  const bonus=level===0?0:level==null||reverence==null||!named?null:(1+reverence/100)*(base+Math.max(0,level-1)*per);
  return{id,name:named?clean(name).replace(/[{}x]/g,'').trim():`Royal Statue ${id+1}`,named,level,bonus,description:!named?'Unreleased catalog entry':level===0?'Inactive — no bonus':apply(name,bonus)};
 });
 const orbletLevels=parse(royal[23])||[];
 const orblets=(catalog.orbletMarket||[]).map(x=>{const level=known(orbletLevels[x.index]),bonus=level==null?null:Math.floor(level*Number(x.bonusPerLevel));return{id:x.index,name:clean(x.name),level,max:Number(x.maxLevel),bonus,description:apply(x.description,bonus)};});
 return{available:Array.isArray(royal)&&royal.length>0,total,upgrades,outposts,resources,statues,orblets};
}
const status=x=>x.level==null?'unknown':x.level>0?'active':'missing';
const levelText=x=>x.level==null?'Saved level unknown':`Lv ${fmt(x.level)}${x.max!=null?' / '+fmt(x.max):''}`;
const shelfText=(x,total)=>x.slot<0?'Not on a released shelf':x.unlocked==null?`Unlock status unknown · needs ${fmt(x.required)} total levels`:x.unlocked?`Shelf ${x.slot+1} · ${levelText(x)}`:`Locked · needs ${fmt(x.required)} total levels (${fmt(total)} saved) · ${levelText(x)}`;
function bonusRows(rawRoot={}){const m=model(rawRoot),row=(source,name,effect,level,status)=>({source,name,effect,level,status});return[
 ...m.upgrades.map(x=>row('Royal Armory',x.name,x.description,shelfText(x,m.total),x.unlocked==null||x.level==null?'unknown':x.unlocked&&x.level?'active':'missing')),
 ...m.statues.map(x=>row('Royal Statues',x.name,x.description,levelText(x),!x.named||x.bonus==null?'unknown':status(x))),
 ...m.orblets.map(x=>row('Orblet Market',x.name,x.description,levelText(x),status(x)))
];}
let selected='armory';
function render(host,rawRoot={}){
 const m=model(rawRoot),tabs=[['armory','Armory'],['outposts','Outposts'],['resources','Resources'],['statues','Royal Statues'],['orblets','Orblet Market']];
 const card=(name,effect,level,missing=false)=>`<article class="${missing?'is-missing':''}"><span>${esc(level)}</span><h3>${esc(name)}</h3><p>${esc(effect)}</p></article>`;let body='';
 if(selected==='armory')body=m.upgrades.filter(x=>x.slot>=0).sort((a,b)=>a.slot-b.slot).map(x=>card(x.name,x.description,shelfText(x,m.total),x.unlocked===false||x.level===0)).join('');
 if(selected==='outposts')body=m.outposts.map(x=>card(`Map ${x.id}`,`Barracks ${fmt(x.barracks)} · Logistics ${fmt(x.logistics)} · Education ${fmt(x.education)} · ${x.mode==null?'Mode unknown':['Resource Depot','Support Camp','Savage Stronghold'][x.mode]||'Unknown mode'}`,`${x.boosted?'Boosted · ':''}Rank EXP (Trade / Intel / Command / Military / Purity): ${[x.tradeExp,x.intelExp,x.commandExp,x.militaryExp,x.purityExp].map(fmt).join(' / ')}`)).join('');
 if(selected==='resources')body=m.resources.map(x=>card(`World ${x.world} · Node ${x.id%20+1}`,`Grade ${fmt(x.grade)} · base capacity ${fmt(x.baseMax)}`,`${fmt(x.stored)} stored`,x.grade===0)).join('');
 if(selected==='statues')body=m.statues.filter(x=>x.named).map(x=>card(x.name,x.description,levelText(x),x.level===0)).join('');
 if(selected==='orblets')body=m.orblets.map(x=>card(x.name,x.description,levelText(x),x.level===0)).join('');
 host.innerHTML=`<div class="bonus-system-hero"><div><p class="eyebrow">Masterclasses · Royal Guardian</p><h2>Royal Armory</h2><p>Saved upgrades, outposts, resources, Royal Statues and Orblet Market. Unknown means this export is missing the required values.</p></div><strong>${m.total==null?'Total Armory levels unknown':fmt(m.total)+' total Armory levels'}</strong></div><nav class="skill-tabs">${tabs.map(([id,label])=>`<button class="skill-tab${selected===id?' active':''}" data-royal-tab="${id}">${label}</button>`).join('')}</nav>${!m.available?'<p>No Royal Guardian data was found in this export.</p>':`<div class="bonus-system-grid">${body||'<p>No saved entries were found for this section.</p>'}</div>`}`;
 host.querySelectorAll('[data-royal-tab]').forEach(b=>b.onclick=()=>{selected=b.dataset.royalTab;render(host,rawRoot);});
}
const api={model,bonusRows,render};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RoyalArmory=api;
})(typeof window!=='undefined'?window:globalThis);
