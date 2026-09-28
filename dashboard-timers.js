(function(root){
'use strict';
const valid=n=>n!==null&&n!==undefined&&n!==''&&Number.isFinite(Number(n));
const minimum=values=>{const finite=values.filter(valid).map(Number);return finite.length?Math.min(...finite):null;};
const SOURCES={companions:'TimeAway',syphonCharge:'PVStatList_0',closestFullWorship:'PVStatList_0',dungeonHappyHour:'TimeAway',randomEvents:'TimeAway',sailingTrades:'Sailing',library:'TimeAway',minibosses:'OptLacc|OptionsListAccount',featherRestart:'OptLacc|OptionsListAccount',megaFeatherRestart:'OptLacc|OptionsListAccount',fisherooReset:'OptLacc|OptionsListAccount',greatestCatch:'OptLacc|OptionsListAccount',megaFleshRestart:'Bubba',printer:'Print',closestTrap:'PldTraps_0',closestFlag:'FlagP',closestBuilding:'Tower',closestSalt:'Refinery',equinox:'Dream',bravery:'Holes',justice:'Holes',wisdom:'Holes',villagers:'Holes',coinFill:'Holes',marbleFill:'Holes',cropsReady:'FarmPlot',researchLevelUp:'Research',sushiFuelFull:'Sushi',observationInsight:'Research',royalNodeCap:'RoyalG',overstim:'Spelunk'};
const PAGES={companions:'pets',syphonCharge:'worship',closestFullWorship:'worship',dungeonHappyHour:'dungeons',randomEvents:'events',sailingTrades:'sailing',library:'construction',minibosses:'deathNote',bonusTimeLeft:'votes',meritocracyTimeLeft:'meritocracy',featherRestart:'orion',megaFeatherRestart:'orion',fisherooReset:'poppy',greatestCatch:'poppy',megaFleshRestart:'bubba',printer:'printer',closestTrap:'trapping',closestFlag:'construction',closestBuilding:'construction',closestSalt:'refinery',equinox:'equinox',bravery:'holeBravery',justice:'holeJustice',wisdom:'holeWisdom',villagers:'hole',coinFill:'holeFountain',marbleFill:'holeFountain',cropsReady:'farming',researchLevelUp:'research',sushiFuelFull:'sushi',observationInsight:'research',royalNodeCap:'royalArmory',overstim:'spelunking'};
function calculate(entry,a,c,M,now,raw){
 const key=entry.key,source=SOURCES[key]||'TimeAway',base={page:PAGES[key]||null};
 if(!source.split('|').some(k=>raw[k]!=null))return {...base,status:'unknown',message:'Save is missing '+source};
 const world=Number(entry.group.replace('World ',''));if(world>1&&!a.finishedWorlds?.['World'+(world-1)])return {...base,status:'clear',message:'World not unlocked in this save'};
 const inactive=message=>({...base,status:'clear',message,details:null});
 const unknown=message=>({...base,status:'unknown',message});
 const due=(value,message='Estimated completion',details=null)=>{
  const at=value instanceof Date?value.getTime():value;
  if(!valid(at))return unknown('A finite completion time is not available.');
  if(Number(at)>8640000000000000)return {...base,status:'waiting',message:'More than 270,000 years at the current rate',details};
  return {...base,status:Number(at)<=now?'ready':'waiting',dueAt:Math.max(now,Number(at)),message:Number(at)<=now?'Ready at save time':message,details};
 };
 const seconds=(value,message,details)=>valid(value)?due(now+Math.max(0,Number(value))*1000,message,details):unknown('Required timing data is missing.');
 const rateTime=(target,current,rate,scale=3600)=>valid(target)&&valid(current)?Number(current)>=Number(target)?seconds(0):valid(rate)&&rate>0?seconds((target-current)/rate*scale):inactive('Not producing at a positive rate'):unknown('Progress or target is missing.');
 const t=a.timeAway||{},opt=a.accountOptions||[];
 const handlers={
  daily:()=>seconds(t.ShopRestock,'Account daily reset'),
  weekly:()=>valid(t.ShopRestock)&&valid(opt[39])?seconds(t.ShopRestock+86400*opt[39],'Account weekly reset'):unknown('Weekly reset counters are missing.'),
  serverWeekly:()=>valid(t.GlobalTime)?seconds(604800-((t.GlobalTime%604800)+604800)%604800,'Server weekly reset'):unknown('Server clock is missing.'),
  bonusTimeLeft:()=>valid(t.GlobalTime)?seconds(604800-(((t.GlobalTime+197860)%604800)+604800)%604800,'Bonus ballot rotation'):unknown('Server clock is missing.'),
  meritocracyTimeLeft:()=>valid(t.GlobalTime)?seconds(604800-(((t.GlobalTime+543460)%604800)+604800)%604800,'Meritocracy rotation'):unknown('Server clock is missing.'),
  companions:()=>a.companions?.list?due(M.getNextCompanionClaim(a),'Next free companion claim'):unknown('Companion claim data is missing.'),
  syphonCharge:()=>{const v=M.getChargeWithSyphon(c);return v.bestWizard?due(v.timeToOverCharge,'Charge Syphon overflow',{character:v.bestWizard.name,charge:v.totalCharge,capacity:v.bestWizard.worship.maxCharge+v.bestChargeSyphon}):inactive('No Charge Syphon character available');},
  closestFullWorship:()=>{const v=M.getClosestWorshiper(c);return valid(v.timeLeft)?due(now+v.timeLeft,'Next full charge',{character:v.character}):inactive('No character is gaining worship charge');},
  dungeonHappyHour:()=>{if(!a.serverVars?.HappyHours)return unknown('Server Happy Hour schedule is missing.');const list=M.calcHappyHours(a.serverVars.HappyHours)||[];return list.length?due(new Date(list[0]).getTime(),'Next Dungeon Happy Hour'):inactive('No upcoming Happy Hour in the server schedule');},
  randomEvents:()=>{const events=M.getRandomEvents(a)||[],next=events.find(x=>x.date>now);return next?due(next.date,'Next random event',{event:next.eventName}):unknown('No next event is available in the server schedule.');},
  sailingTrades:()=>{const trade=a.sailing?.trades?.[0];return trade?due(new Date(trade.date).getTime(),'Next sailing trade',{item:trade.rawName}):inactive('No sailing trade scheduled');},
  library:()=>a.libraryTimes?seconds(a.libraryTimes.next,'Next library book',{booksStored:a.libraryTimes.bookCount,breakpoints:a.libraryTimes.breakpoints?.map(b=>({books:b.label||b.breakpoint,seconds:b.time}))}):unknown('Library data is missing.'),
  minibosses:()=>{const bosses=M.getMiniBossesData(a).filter(x=>x.unlocked);return {...base,status:bosses.some(x=>x.current>=2)?'ready':'waiting',message:'Spawn counters advance on logged-in daily resets',details:bosses.map(x=>({name:x.name,spawns:x.current,dailyResetsToNext:x.maxed?0:x.daysTillNext,maxed:x.maxed}))};},
  featherRestart:()=>a.accountOptions?.[253]>0?rateTime(a.owl?.upgrades?.[4]?.cost,a.owl?.feathers,a.owl?.featherRate,1):inactive('Orion is not unlocked'),
  megaFeatherRestart:()=>a.accountOptions?.[253]>0?rateTime(a.owl?.upgrades?.[8]?.cost,a.owl?.feathers,a.owl?.featherRate,1):inactive('Orion is not unlocked'),
  fisherooReset:()=>rateTime(a.kangaroo?.upgrades?.[6]?.cost,a.kangaroo?.totalFish,a.kangaroo?.fishRate,60),
  greatestCatch:()=>rateTime(a.kangaroo?.upgrades?.[11]?.cost,a.kangaroo?.totalFish,a.kangaroo?.fishRate,60),
  megaFleshRestart:()=>rateTime(a.bubba?.upgrades?.[8]?.cost,a.bubba?.meatSlices,a.bubba?.meatsliceRate,60),
  printer:()=>valid(t.GlobalTime)&&valid(t.Printer)?seconds(3600-(t.GlobalTime-t.Printer),'Next printer cycle'):unknown('Printer timing fields are missing.'),
  closestTrap:()=>{const next=minimum((a.traps||[]).flat().map(x=>x.timeLeft));return next===null?inactive('No traps placed'):due(next,'Next trap collection');},
  closestFlag:()=>{const flags=[...(a.construction?.board||[]),...(a.construction?.leftColumn||[]),...(a.construction?.rightColumn||[])].filter(x=>x.flagPlaced);const next=minimum(flags.map(x=>{const rate=x.flagSpeed||a.construction?.totalFlaggyRate;return rate>0?(x.requiredAmount-x.currentAmount)/rate*3600:null;}));return next===null?inactive('No placed flag is progressing'):seconds(next,'Next construction flag');},
  closestBuilding:()=>{
   const atom=M.getAtomBonus(a,'Nitrogen_-_Construction_Trimmer'),blue=a.lab?.jewels?.slice(3,7).every(x=>x.active)?1:0;
   const trimmed=(a.lab?.jewels?.[3]?.active?1+blue:0)+(atom?1:0)+Math.min(1,M.getLegendTalentBonus(a,33))+M.getGambitBonus(a,9)+M.getEventShopBonus(a,14);
   const times=(a.towers?.data||[]).filter(b=>b.inProgress).map(b=>{const cost=M.getBuildCost(a.towers,b.level,b.bonusInc,b.index),speed=a.construction?.totalBuildRate*(b.slot!==-1&&b.slot<trimmed?M.getGildedBoostioBonus(a):1);return speed>0?(cost-b.progress)/speed*3600:null;});
   const next=minimum(times);return next===null?inactive('No building is progressing'):seconds(next,'Next completed building');
  },
  closestSalt:()=>{const selection=entry.config.options?.find(x=>x.name==='salts')?.props?.value,cycles=M.getRefineryCycles(a,c,now);const dates=(a.refinery?.salts||[]).map((s,i)=>{if(!s.active||s.autoRefinePercentage!==0||selection&&!selection[s.rawName])return null;if(!s.cost?.every(m=>m.totalAmount>=M.calcCost(a.refinery,s.rank,m.quantity,m.rawName,i)))return null;return M.calcTimeToRankUp(a,c,now,cycles,false,s.rank,s.powerCap,s.refined,i).timeLeft;});const next=minimum(dates);return next===null?inactive('No selected manual-refine salt can progress with current materials'):due(next,'Next refinery rank-up');},
  equinox:()=>a.equinox?due(a.equinox.timeToFull,'Equinox bar full'):unknown('Equinox data is missing.'),
  villagers:()=>{const selection=entry.config.options?.find(x=>x.name==='villagers')?.props?.value,keys=['explore','engineer','bonuses','measure','studies'];const values=(a.hole?.villagers||[]).filter((v,i)=>v&&(!selection||selection[keys[i]])).map(v=>({name:v.name,dueAt:v.readyToLevel?now:valid(v.timeLeft)?now+v.timeLeft:null}));const next=minimum(values.map(v=>v.dueAt));return next===null?inactive('No selected villager is progressing'):due(next,'Next villager level',values);},
  coinFill:()=>fountain(0),marbleFill:()=>fountain(1),
  cropsReady:()=>{const plots=(a.farming?.plot||[]).filter(p=>!p.isLocked&&p.seedType>=0);const next=minimum(plots.map(p=>p.progress>=p.growthReq?0:p.timeLeft));return next===null?inactive('No planted crops are growing'):seconds(next,'Next ready crop',{plots:plots.length,ready:plots.filter(p=>p.progress>=p.growthReq).length});},
  researchLevelUp:()=>{const best=c.reduce((b,x)=>(x.skillsInfo?.research?.level||0)>(b?.skillsInfo?.research?.level||0)?x:b,null),s=best?.skillsInfo?.research;return s?{...rateTime(s.expReq,s.exp,a.research?.researchEXPrateTOT),details:{character:best.name,nextLevel:s.level+1}}:inactive('No research character available');},
  sushiFuelFull:()=>rateTime(a.sushiStation?.fuel?.cap,a.sushiStation?.fuel?.current,a.sushiStation?.fuel?.generation),
  observationInsight:()=>{const values=(a.research?.observations||[]).filter(o=>o.found&&o.lensTypes?.includes(1)&&o.realInsightExpRate>0).map(o=>({name:o.name,nextLevel:o.insightLevel+1,dueAt:now+Math.max(0,(o.insightExpREQ-o.insightExp)/o.realInsightExpRate)*3600000}));const next=minimum(values.map(o=>o.dueAt));return next===null?inactive('No observation is actively gaining insight'):due(next,'Next observation insight level',values);},
  royalNodeCap:()=>{const outposts=(a.royalGuardian?.outposts||[]).filter(o=>o.mode!==1&&o.connectedNodes?.length);if(!outposts.length)return inactive('No collection outposts are connected');const next=minimum(outposts.map(o=>o.hoursToNodeCap));return next===null?seconds(0,'All connected resources are empty'):seconds(next*3600,'Next outpost resource reaches its cap');},
  overstim:()=>rateTime(a.spelunking?.overstimEffectiveReq,a.spelunking?.overstimEffectiveCurrent,a.spelunking?.overstimRate)
 };
 function fountain(tier){const bar=a.hole?.caverns?.theFountain?.fountainBars?.find(b=>b.tier===tier);return bar?bar.progress>=bar.req?seconds(0):valid(bar.timeToFullMs)?due(now+bar.timeToFullMs,'Fountain bar full'):inactive('Fountain bar has no production rate'):inactive('Fountain bar not unlocked');}
 for(const [name,index] of [['bravery',0],['justice',1],['wisdom',2]])handlers[name]=()=>{const holes=a.hole?.holesObject;if(!holes)return inactive('Monument is not unlocked');return seconds(M.getMonumentMaxLinearTime(holes,index,a)-holes.extraCalculations?.[11+index],'Monument linear multiplier reaches its cap');};
 if(!handlers[key])throw Error('Unimplemented timer: '+key);
 return handlers[key]();
}
const api={calculate,SOURCES,PAGES};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DashboardTimers=api;
})(typeof self!=='undefined'?self:globalThis);
