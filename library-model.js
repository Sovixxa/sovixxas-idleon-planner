(function(root){
'use strict';
const parse=x=>{try{return typeof x==='string'?JSON.parse(x):x;}catch{return null;}};
// Matches the Library exclusions in the bundled talent parser.
const bookExcluded=new Set([10,11,12,23,75,79,86,87,266,267,446,447]);
function characterBooks(characters,data,target){
 const pretty=s=>String(s||'').replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
 return characters.map((ch,index)=>{
  const id=ch.playerId??index, caps=parse(data[`SM_${id}`]), current=parse(data[`SL_${id}`]), other=parse(data[`SLpre_${id}`]),active=Number(ch.selectedTalentPreset)||0;
  const talents=(ch.flatTalents||[]).filter(t=>t.skillIndex>=0&&t.skillIndex<615&&!bookExcluded.has(t.skillIndex)).map(t=>{
   const tid=t.skillIndex,cap=Number(caps?.[tid]),known=Number.isFinite(cap)&&cap>0;
   const levels=active===1?[other?.[tid],current?.[tid]]:[current?.[tid],other?.[tid]];
   return {id:tid,name:pretty(t.name),cap:known?cap:null,needsBook:known&&cap<target,levels:levels.map(v=>v==null?null:Number(v))};
  });
  return {id,name:ch.name||`Character ${index+1}`,className:pretty(ch.class),active,talents};
 });
}
function build(account,characters,data,M,at){
 const range=M.getBookLvRange(account),atom=account.atoms?.atoms?.[7]?.level||0;
 const summoning=account.summoning?.winnerBonuses?.find(x=>x.bonus==='+{ Library Max')?.value||0;
 const owned=!!account.bundles?.find(x=>x.name==='ban_i'&&x.owned),purchases=account.gemShopPurchases||[];
 const noPack={...account,bundles:(account.bundles||[]).filter(x=>x.name!=='ban_i')};
 const rawBonuses=(account.summoning?.winnerBonuses||[]).map(x=>x.baseValue||0);
 const winner=a=>M.getLocalWinnerBonus?M.getLocalWinnerBonus(rawBonuses,a,19):summoning;
 const packPotential=winner({...noPack,bundles:[...noPack.bundles,{name:'ban_i',owned:true}]})-winner(noPack);
 const packValue=owned?packPotential:0;
 const sources=[
  {name:'Base Library',value:125,where:'Build the Talent Book Library at the W3 Construction table.',page:'construction'},
  {name:'W3 merit shop',value:2*(account.tasks?.[2]?.[2]?.[2]||0),where:'Spend W3 task merits on maximum talent book level: +2 per purchase.',page:'tasks'},
  {name:'Salt Lick',value:(account.saltLick?.[4]?.baseBonus||0)*(account.saltLick?.[4]?.level||0),where:'Upgrade the Spontaneity Salts bonus at the W3 Salt Lick.',page:'saltLick'},
  {name:'Checkout Takeout',value:account.achievements?.[145]?.completed?5:0,where:'Complete the achievement for 1,000 Library checkouts to gain +5 book levels.',page:'tasks'},
  {name:'Oxygen — Library Booker',value:10*Math.min(atom,1),where:'Unlock Oxygen in the Atom Collider for +10 maximum levels. Further levels improve speed and the minimum roll.',page:'atomCollider'},
  {name:'Fury Relic',value:account.sailing?.artifacts?.find(x=>x.name==='Fury_Relic'&&x.acquired)?.bonus||0,where:'Find and upgrade the Fury Relic through W5 Sailing.',page:'sailing'},
  {name:'Summoning victories',value:summoning,where:'Includes The Winz Lantern, Crystal Comb, merits, achievements, Godshard, King of All Winners, and the Daydreamer Pack. Full breakdown below.',page:'summoning'}
 ];
 // Maximum bonus contributions, not upgrade levels. Summoning includes the paid pack.
 const maxima=[125,10,20,5,10,150,14*1.3*1.5*(1+(150+10+1+1+15+50)/100)];
 sources.forEach((source,index)=>{source.max=maxima[index];});
 const count=Number(account.accountOptions?.[55]),progress=Number(account.timeAway?.BookLib);
 const timerKnown=Number.isFinite(count)&&count>=0&&Number.isFinite(progress)&&progress>=0&&Number.isFinite(at);
 const speed=M.getTimeToNextBooks(timerKnown?count:0,account,characters,data);
 const targets=timerKnown?[count+1,...[5,20,40,60].filter(n=>n!==count+1)]:[];
 const timers=targets.map(target=>{let seconds=target<=count?0:-progress;for(let n=count;n<target;n++)seconds+=M.getTimeToNextBooks(n,account,characters,data).value;return {target,label:target===count+1?'Next checkout':`${target} checkouts`,ready:target<=count,at:at+Math.max(0,seconds)*1000};});
 const subtotal=sources.reduce((n,s)=>n+s.value,0);
 const paid={owned,packValue,packPotential,withoutPack:Math.round(subtotal-packValue),withPack:Math.round(subtotal-packValue+packPotential),burningPurchases:purchases[113]||0};
 return {...range,characters:characterBooks(characters,data,range.maxBookLv),sources,paid,breakdown:M.getLibraryBreakdown?.(account),count:timerKnown?count:null,at,unlocked:Number(parse(data.Tower)?.[1])>0,automation:Number(parse(data.Tower)?.[8])>=5,timers,speed:speed.breakdown?.categories?.flatMap(c=>c.sources)||[]};
}
function calculate(raw,M=root.DashboardMath){
 raw=structuredClone(raw||{});const data=parse(raw.data)||raw;
 if(!data.Tower)return {missing:true};
 if(!data.OptLacc)data.OptLacc=data.OptionsListAccount;
 const time=parse(data.TimeAway),saved=Number(time?.GlobalTime),at=saved>0?saved*1000:null;
 // Decode at the snapshot time: avoid silently advancing old saves during parsing.
 const OriginalDate=root.Date;root.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[at||OriginalDate.now()]));}static now(){return at||OriginalDate.now();}};
 try{const parsed=M.parseData(data,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);return build(parsed.account,parsed.characters,data,M,at);}finally{root.Date=OriginalDate;}
}
root.LibraryModel={build,calculate,characterBooks};
if(typeof module!=='undefined')module.exports=root.LibraryModel;
})(globalThis);
