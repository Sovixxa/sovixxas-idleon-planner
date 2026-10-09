(function(root){
'use strict';
const S=()=>root.DropTargetSources,clean=v=>String(v??'').replaceAll('_',' '),num=v=>!Number.isFinite(Number(v))?'unknown':Math.abs(Number(v))>=1e9?Number(v).toExponential(3):Number(v).toLocaleString('en-US',{maximumFractionDigits:2});
// Enumerate mechanics, not matching words in their descriptions. A full native
// reparse decides which of these direct AND indirect upgrades helps a metric.
function build(p,save,id,M=root.PrayerMath,metric='damage'){
 const {get}=S(),a=p.account,ch=p.characters.find(c=>String(c.playerId)===String(id)),out=[],families=new Map();
 const opt=save.OptLacc!==undefined?'OptLacc':'OptionsListAccount';
 const excludedStamps=[];
 const stampQuests=metric==='unlock:stamps'?Object.values(a.quests||{}).flat().flatMap(n=>(n.npcQuests||[]).map(q=>({npc:n.name,name:q.Name||q.QuestName,description:q.DialogueText,states:(q.progress||[]).map(p=>p.status),rewards:(q.Rewards||[]).map(r=>`${r.quantity} × ${r.item}`)}))):[];
 function family(name,page,detail){if(!families.has(name))families.set(name,{name,page,detail,candidates:0});}
 function add(path,to,name,system,page,requirements,extra={}){
  family(system,page,'Saved effects are included. The listed milestones are conditional progression scenarios, not verified affordable purchases.');
  const raw=get(save,path),missing=raw==null&&extra.unit==='collection'&&get(save,path.slice(0,-1))!=null,from=missing?0:Number(raw);
  if(raw==null&&!missing||raw===''||!Number.isFinite(from)||!Number.isFinite(to)||to<=from||!Number.isSafeInteger(to))return;
  out.push({id:path.join(':'),path,from,to,missing,name:clean(name),system,page,unit:'level',requirements:[requirements].flat(),...extra});families.get(system).candidates++;
 }
 const stampKey=save.StampLv!==undefined?'StampLv':'StampLevel',capKey=save.StampLvM!==undefined?'StampLvM':'StampLevelMAX';
 for(const [category,stamps] of Object.entries(a.stamps||{}))for(const [i,s] of stamps.entries()){
  const g={combat:0,skills:1,misc:2}[category],cap=Number(get(save,[capKey,g,i])),step=Number(s.reqItemMultiplicationLevel);
  if(s.level>0&&Number.isFinite(cap)&&step>0){const to=cap>s.level?cap:cap+step;
   add([stampKey,g,i],to,s.displayName,'Stamps','stamps',[`Buy levels at the stamp pig. Saved next coin price: ${num(s.goldCost)}; this is not the batch cost.`,...(to>cap?[`Raise the material limit ${cap} → ${to}: next hand-in ${num(s.materialCost)} ${clean(s.itemReq?.name)}; saved stock ${num(s.ownedMats)}. Check carry capacity and discounts before paying.`]:[])],{capPath:[capKey,g,i],capTo:to,searchText:s.effect+' '+s.stat});
  }else if(metric==='unlock:stamps'&&s.level===0){
   const acquisition=root.AccountReview.stampAcquisition({id:s.rawName},save,{charNames:p.characters.map(c=>c.name)},stampQuests);
   if(['ready','quest'].includes(acquisition.status))add([stampKey,g,i],1,s.displayName,'Stamp collection','stamps',acquisition.detail,{unit:'collection',capPath:[capKey,g,i],capTo:Math.max(1,cap||0)});
   else excludedStamps.push(clean(s.displayName)+' ('+acquisition.label+')');
  }
 }
 for(const [i,s] of (a.upgradeVault?.upgrades||[]).entries())if(s.unlocked)add(['UpgVault',i],Math.min(s.maxLevel,s.level+Math.max(1,Math.ceil(s.level*.1))),s.name,'Upgrade Vault','upgradeVault','Buy these levels with coins. Recheck increasing prices; other purchases share the same balance.');
 for(const [i,s] of (a.arcade?.shop||[]).entries())if(s.active)add(['ArcadeUpg',i],Math.min(101,s.level+1),'Arcade: '+s.effect,'Arcade','arcade','Buy one level in the active rotation. Level 101 needs Royal Balls; earlier levels use Gold Balls. Weekly bonuses retain the saved selection.');
 for(const b of Object.values(a.alchemy?.bubbles||{}).flat()){
  const key=b.rawName?.replace(/^aUpgrades/,''),m=root.StatTodoModel.bubbleMilestone(b);
  if(b.level>0&&/^[OGPY]\d+$/.test(key)&&!m?.maintenance)add(['CauldronInfo','OGPY'.indexOf(key[0]),Number(key.slice(1))],m?.target,b.bubbleName,'Alchemy bubbles','alchemy','Reach this practical base-effect milestone using materials/liquids or automatic levels. Existing active bubbles and Prisma assignments stay fixed; class and shared amplification are recalculated.');
 }
 for(const [i,v] of Object.values(M.dropVialCatalog||{}).entries()){
  const s=a.alchemy?.vials?.find(x=>x.name===v.name);if(!s)continue;
  if(s.level>0)add(['CauldronInfo',4,i],Math.min(13,s.level+1),s.name+' vial','Vials','vials','Collect the next material and liquid requirements. Level 13 also contributes to unlocked Vial Mastery, including indirect bonuses.');
  else if(metric==='unlock:vials')add(['CauldronInfo',4,i],1,s.name+' vial','Vial collection','vials',`Obtain ${clean(s.mainItem)} and successfully discover this vial at Alchemy (required roll ${s.discoveryScore}). Attempts and material access are not guaranteed.`,{unit:'collection'});
 }
 for(const [i,s] of (a.alchemy?.p2w?.sigils||[]).entries())if(s.unlocked>=0)add(['CauldronP2W',4,2*i+1],Math.min(4,s.unlocked+1),s.name+' sigil','Sigils','sigils','Meet the next tier unlock, assign characters and complete the required research time. Saved artifact amplification applies.',{unit:'tier'});
 for(const m of a.cooking?.meals||[]){
  if(m.level>0){add(['Meals',0,m.index],Math.min(a.cooking.mealMaxLevel,m.level+5),m.name,'Meals','cooking',`Cook and buy these meal levels. Next level needs ${num(m.levelCost)}; saved stock ${num(m.amount)}. Later levels require more food. Total meal levels and all shared amplifiers are recalculated.`);
   const r=Number(get(save,['Ribbon',28+m.index]));if(r>=0)add(['Ribbon',28+m.index],Math.min(25,Math.floor(r/5)*5+5),m.name+' ribbon','Meal ribbons','cooking','Obtain and assign a ribbon of this rank. This assumes a newly earned ribbon, not reusing one already assigned to another meal.',{unit:'rank'});
   if(a.cooking.cookingMastery&&Number.isFinite(m.cookingMasteryNode?.level))add(['CookMaster',0,m.index],[5,20,45,95].find(t=>t>m.cookingMasteryNode.level),m.name+' mastery','Cooking Mastery','cooking','Earn and allocate additional yellow mastery points. Existing meal allocations are not removed.',{unit:'points'});
  }else if(metric==='unlock:meals')add(['Meals',0,m.index],1,m.name,'Meal collection','cooking','Unlock the required spices and recipe combination, successfully discover this meal, then cook enough for its first level. Recipe access and discovery are conditional.',{unit:'collection'});
 }
 for(const [i,k] of (a.cooking?.kitchens||[]).entries())if(k?.status>0)for(const [field,offset,label] of [['speedLv',6,'cooking speed'],['fireLv',7,'recipe speed'],['luckLv',8,'luck']])add(['Cooking',i,offset],k[field]+1,`Kitchen ${i+1} ${label}`,'Kitchen upgrades','cooking','Spend the required spice on this unlocked kitchen. Includes total-kitchen-level amplification.');
 for(const [i,s] of (a.saltLick||[]).entries())add(['SaltLick',i],Math.min(s.maxLevel,s.level+1),'Salt Lick '+(i+1),'Salt Lick','saltLick',`Deposit the required material for this level (${clean(s.rawName)}).`);
 if(a.towers?.data?.[8]?.level>0)for(const [i,s] of (a.atoms?.atoms||[]).entries())add(['Atoms',i],Math.min(s.maxLevel,s.level+1),s.name,'Atoms','atomCollider','Unlock this atom and spend its particles. This keeps the native level cap and existing exalted stamps.');
 for(const [i,s] of (a.prayers||[]).entries())if(s.level>0)add([save.PrayersUnlocked!==undefined?'PrayersUnlocked':'PrayOwned',i],Math.min(s.maxLevel,s.level+1),s.name,'Prayers','prayers','Spend souls on the next level. Saved prayer activation, Superbits and both bonus and curse are included; check other affected stats before buying.');
 for(const [i,s] of (ch.postOffice?.boxes||[]).entries()){
  const key=save['POu_'+id]!==undefined?'POu_'+id:'PostOfficeInfo_'+id,path=Array.isArray(get(save,[key,i]))?[key,i,0]:[key,i];
  add(path,Math.min(s.maxLevel,s.level+25),s.name,'Post Office','postOffice','Earn and allocate additional boxes without taking levels from another box. Bonuses and thresholds are recalculated.',{unit:'points'});
 }
 for(const c of p.characters){
  // Every provider matters to family, highest-talent and Maestro hand formulas.
  const levelSnapshotPath=get(save,['PVStatList_'+c.playerId,4])!==undefined?['PVStatList_'+c.playerId,4]:get(save,['PersonalValuesMap_'+c.playerId,'StatList',4])!==undefined?['PersonalValuesMap_'+c.playerId,'StatList',4]:null;
  add(['Lv0_'+c.playerId,0],Math.floor(c.level/25)*25+25,c.name+' class level','Character & family levels','familyBonuses','Earn the required class EXP. Family providers are recalculated; this does not allocate the newly earned talent points.',{levelSnapshotPath});
  for(const [skill,s] of Object.entries(c.skillsInfo||{}))if(s.index>0&&s.level>0&&Number(get(save,['Lv0_'+c.playerId,s.index]))===s.level)add(['Lv0_'+c.playerId,s.index],Math.floor(s.level/10)*10+10,c.name+': '+skill+' level','Skill levels & mastery','characters','Train this character to the next ten-level milestone. Skill mastery, level-based bonuses, highest-skill providers and Maestro hand effects are recalculated; new talent points remain unallocated.');
  for(const t of [...(c.flatTalents||[]),...(c.flatStarTalents||[])]){
   const key=save['SL_'+c.playerId]!==undefined?'SL_'+c.playerId:'SkillLevels_'+c.playerId,level=Number(get(save,[key,t.skillIndex]));
   if(level!==t.baseLevel&&level!==t.level)continue;
   // Do not invent a locked talent or library book. Allocated talent only, saved cap.
   if(level>0)add([key,t.skillIndex],Math.min(t.maxLevel,level+25),c.name+': '+t.name,'Talents','characters','Earn and allocate additional talent points within the saved book cap. Existing allocations are preserved; shared highest-talent providers are compared again.',{unit:'points',sharedProvider:['BLOOD_MARROW','ENHANCEMENT_ECLIPSE'].includes(t.name)});
  }
 }
 for(const s of a.legendTalents?.talents||[])if(s.level>0)add(['Spelunk',18,s.originalIndex],Math.min(s.maxLevel,s.level+1),s.name,'Legend talents','legendTalents','Earn and spend another Legend point within the current cap. No points are removed from another talent.');
 for(const [field,list,key,page] of [['Grimoire',a.grimoire?.upgrades,'Grimoire','grimoire'],['Arcane',a.tesseract?.upgrades,'Tesseract','tesseract']])for(const s of list||[])if(s.unlocked)add([field,s.index],Math.min(s.x4,s.level+1),s.name,key,page,'Farm the required upgrade currency and purchase the next unlocked level within its native cap.');
 for(const s of a.compass?.upgrades||[])if(s.level>0)add(['Compass',0,s.index],Math.min(s.x4,s.level+1),s.name,'Compass','compass','Earn dust and buy the next level. Existing path unlocks and exalted stamps are preserved.');
 for(const [i,s] of (a.spelunking?.upgrades||[]).entries())if(s.level>0)add(['Spelunk',5,i],Math.min(s.x3,s.level+Math.max(1,Math.ceil(s.level*.1))),s.name,'Spelunking shop','spelunking','Spend Amber on these shop levels. Later prices may be higher; the native cap still applies.');
 for(const [chapter,list] of (a.spelunking?.chapters||[]).entries())for(const [i,s] of list.entries())if(s.level>0&&!(s.progression>=99))add(['Spelunk',8,4*chapter+i],s.level+Math.max(1,Math.ceil(s.level*.1)),s.name||`Chapter ${chapter+1}, bonus ${i+1}`,'Spelunking chapters','spelunking',`Collect and spend the required chapter pages (${s.requiredPages} page requirement per purchase). Artifact amplification is recalculated. This is a bounded milestone, not a maximum.`);
 for(const [i,s] of (a.research?.gridSquares||[]).entries())if(s.canSelect||s.level>0)add(['Research',0,i],Math.min(s.maxLv,s.level+1),s.name,'Research grid','research','Reach this square and earn its next Research point. Saved observation placements are unchanged.');
 for(const [i,s] of (a.equinox?.upgrades||[]).entries())if(s.unlocked)add(['Dream',2+i],Math.min(s.maxLvl,s.lvl+1),s.name,'Equinox','equinox','Accumulate charge and buy the next unlocked level. Further cap increases may need cloud completions.');
 for(const [i,s] of (a.farming?.ranks||[]).entries())if(a.farming.hasLandRank&&a.farming.totalRanks>=s.unlockAt)add(['FarmRank',2,i],Math.min(s.maxLevel,s.upgradeLevel+1),s.name||'Land Rank '+(i+1),'Land ranks','farming','Earn an additional Land Rank point and spend it here. Existing allocations stay fixed.');
 for(const s of a.farming?.exoticMarket||[])if(s.level>0||s.isAvailableThisWeek)add(['FarmUpg',20+s.index],Math.min(s.thresholdLevel||Infinity,s.level+Math.max(1,Math.ceil(s.level*.1))),s.name,'Exotic Market','farming','Earn beans and buy these levels when available in the weekly rotation. Weekly purchase limits and increasing costs still apply.');
 for(const [i,s] of (a.farming?.market||[]).entries())if(s.level>0)add(['FarmUpg',i+2],Math.min(s.maxLvl,s.level+1),s.name,'Farming Market','farming','Farm and spend the required crops for the next market level.');
 for(const [w,pets] of (a.breeding?.pets||[]).entries())for(const [i,s] of pets.entries())if(s.unlocked&&s.shinyLevel>0&&s.shinyLevel<20)add(['Breeding',22+w,i],Math.floor((1+Math.pow(s.shinyLevel,1.6))*Math.pow(1.7,s.shinyLevel))+1,(s.name||s.rawName||`World ${w+1} pet ${i+1}`)+' shiny','Shiny pets','shinyPets','Fence this shiny pet until its next level. Meal, infinite-star-sign and other indirect amplification is included. Time is not estimated.',{unit:'progress',displayFrom:'Shiny Lv '+s.shinyLevel,displayTo:'Shiny Lv '+(s.shinyLevel+1)});
 const gates=[true,true,Number(get(save,['Rift',0]))>29,!!a.sneaking?.jadeEmporium?.find(s=>s.name==='Sovereign_Artifacts')?.unlocked,(a.spelunking?.cavesUnlocked||0)>=1,(a.research?.gridSquares?.[109]?.level||0)>0];
 for(const [i,s] of (a.sailing?.artifacts||[]).entries())if(s.acquired>0&&s.acquired<6&&gates[s.acquired])add(['Sailing',3,i],s.acquired+1,s.name,'Sailing artifacts','sailing','Find the next artifact tier through Sailing. Tier access is unlocked, but discovery is random. Raising a cap still requires buying the newly available levels.',{unit:'tier'});
 for(const [i,s] of (a.shrines||[]).entries())if(s.shrineLevel>0)add([save.ShrineInfo!==undefined?'ShrineInfo':'Shrine',i,3],s.shrineLevel+1,s.name,'Shrines','shrines','Accumulate charge for the next shrine level. Saved placement and map applicability are preserved.');
 for(const [i,s] of (a.bribes||[]).entries())if(!s.done&&get(save,['BribeStatus',i])===0)add(['BribeStatus',i],1,s.name,'Bribes','bribes','Meet the bribe prerequisites and pay its coin price at the bribe NPC. This is conditional acquisition, not a claim that it is ready now.',{unit:'unlock'});
 const cardsPath=save.Cards?.[0]!==undefined?['Cards',0]:['Cards0'],stars=4+(Number(get(save,['Rift',0]))>=45?1:0)+(a.spelunking?.loreBosses?.[2]?.defeated?1:0);
 for(const s of Object.values(a.cards||{})){
  if(s.amount>0&&s.stars<stars)add([...cardsPath,s.rawName],s.rawName==='Boss3B'?Math.floor(1.5*Math.pow(s.stars+1+Math.floor(s.stars/3),2))+1:s.nextLevelReq,(s.displayName||s.rawName)+' card','Cards','cards','Farm copies to the next naturally unlocked star tier. Existing card set, equipment and chips are preserved; no Cardifier is assumed. Seasonal sources need their event.',{unit:'cards',accountWide:/passive/i.test(s.effect||'')});
  else if(metric==='unlock:cards'&&s.amount===0)add([...cardsPath,s.rawName],1,s.displayName||s.rawName,'Card collection','cards','Reach this monster, boss, resource or event and obtain its first card. Access and random drops are conditional; no gem-pack acquisition is assumed.',{unit:'collection'});
 }
 for(const [i,rank] of Object.entries(get(save,['Spelunk',17])||{})){
  const item=M.stampItemCatalog?.[Number(i)===6?'EquipmentNametag6b':'EquipmentNametag'+i];
  if(item&&rank>0&&rank<5)add(['Spelunk',17,Number(i)],rank+1,item.displayName+' Gallery grade','Nametags','nametags','Obtain the required copies or grade upgrade from its original source. Gem-shop or event availability can delay this; excluded from the main route.',{group:'nametags',unit:'grade'});
 }
 for(const [i,s] of (a.royalGuardian?.royalStatues||[]).entries())if(a.royalGuardian.hasRoyalGuardian&&s.level>0)add(['RoyalG',0,i],s.level+1,'Royal statue '+(i+1),'Royal statues','royalArmory','Obtain the required enhancement material and achieve a successful enhancement. Attempts can fail.');
 for(const [i,s] of (a.hole?.measurements||[]).entries())if(s.level>0)add(['Holes',22,i],s.level+1,'Measurement: '+s.description,'Hole measurements','holeMeasurements',`Pay the next measurement cost (${num(s.cost)}). Saved measured progress is retained.`);
 for(const o of a.research?.observations||[])if(o.found&&o.canLevelUp)add(['Research',4,o.index],o.insightLevel+1,o.name+' insight','Observation insight','research','Keep the necessary lenses assigned and earn enough Insight for the next observation level. Existing observation/lens placements remain unchanged.');
 for(const [i,s] of (a.statues||[]).entries()){
  const provider=[...p.characters].sort((x,y)=>(y.statues?.[i]?.[0]||0)-(x.statues?.[i]?.[0]||0))[0];
  if(provider&&s.level>0)add(['StatueLevels_'+provider.playerId,i,0],s.level+1,s.name+' statue','Statue deposits','statues','Farm and deposit enough statues to reach the next level on '+provider.name+'. The current gold/onyx/zenith tier stays fixed; shared statue amplification is recalculated.');
 }
 const stalk=(M.dropBeanstalkOrder?.[29]||[]).filter(v=>isNaN(v));
 for(const [i,raw] of stalk.entries()){
  const rank=Number(get(save,['Ninja',104,i])),item=M.stampItemCatalog?.[raw];
  if(item&&rank>0&&rank<3)add(['Ninja',104,i],rank+1,(item.displayName||raw)+' Beanstalk','Beanstalk','beanstalk',`Meet the next Beanstalk unlock and deposit ${num([10000,100000,1000000][rank])} foods. Farm these separately from any equipped stack; existing food is not duplicated.`,{unit:'rank'});
 }
 const trophies=get(save,['Spelunk',16]),podiums=Number(a.gallery?.podiumsOwned)||0;
 if(Array.isArray(trophies)){
  const slot=Array.from({length:Math.max(0,Math.min(trophies.length-48,podiums))},(_,i)=>i+48).find(i=>Number(trophies[i])===0),seen=new Set();
  if(slot!==undefined)for(let i=0;i<Math.min(48,trophies.length);i++){
   const trophy=Number(trophies[i]),item=M.stampItemCatalog?.['Trophy'+trophy];
   if(!item||trophy<=0||seen.has(trophy))continue;seen.add(trophy);
   add(['Spelunk',16,slot],trophy,'Display '+item.displayName,'Gallery trophies','nametags','Move this owned stored trophy to the empty unlocked podium. Removes the storage bonus first; it does not duplicate the trophy.',{id:'trophy:'+trophy,unit:'placement',displayFrom:'Stored',displayTo:'Podium '+(slot-47),exactFrom:true,conflict:'podium:'+slot,extraPatches:[{path:['Spelunk',16,i],from:trophy,value:0}]});
  }
 }
 if(root.SummoningOptimizer){const s=root.SummoningOptimizer.snapshot({data:save});for(const u of s.upgrades)if(root.SummoningOptimizer.unlocked(s,u))add(['Summon',0,u.id],Math.min(u.max,s.levels[u.id]+1),u.name,'Summoning upgrades','summoning','Earn the required essence and buy the next unlocked upgrade. Summoning unit damage is separate from character damage.');}
 if(root.FountainOptimizer){const f=root.FountainOptimizer.decode({data:save});if(f)for(const u of root.FountainData||[])if(root.FountainOptimizer.unlocked(f,u))add(['Holes',31,u.water,u.index],f.levels[u.water][u.index]+1,u.name,'Fountain','holeFountain','Earn the required fountain currency and buy one unlocked level. Saved marble amplification is retained.');}
 // Reuse audited long-term counters and conditional chains, without carrying
 // DR's fixed-luck assumption into these primary-stat-reconstructed scenarios.
 const reused=root.DropTargetSources.build(p,save,id,M).candidates;
 const existing=new Set(out.map(c=>c.id));
 for(const c of reused)if(!existing.has(c.id)&&!c.foodFill&&c.mealIndex===undefined&& !['Stamps','Bubble'].some(x=>c.sources.includes(x))){family('Additional progression',c.page,'Additional audited farming and progression counters, including Endless rewards, Emperor, Jelly, map progress and Gallery amplification. Requirements remain conditional.');out.push({...c,system:'Additional progression',requirements:c.requirements.map(t=>t.replace(/Only its direct drop-rate effect is projected; Luck remains at the saved value\./g,'Primary stats are recalculated.'))});existing.add(c.id);}
 // Golden food refills are evaluated for EVERY equipped golden food, not just cake.
 const currentCap=M.getItemCapacity('cFood',ch,a,false).value,townCap=M.getItemCapacity('cFood',{...ch,mapIndex:0},a,false).value,cap=Math.floor(Math.max(currentCap,townCap));
 for(const [i,f] of (ch.food||[]).entries())if(f.Type==='GOLDEN_FOOD'&&get(save,['EquipOrder_'+id,2,i])===f.rawName)add(['EquipQTY_'+id,2,i],cap,'Fill '+(f.displayName||f.name),'Golden food','goldFood',`Farm enough ${clean(f.displayName||f.name)} to fill the existing food slot in ${townCap>currentCap?'World 1 town':'the saved map'}. This is additional food, not an assumed free transfer from another character.`,{unit:'items',foodSlot:i});
 for(const [name,page,detail] of [
  ['Equipment & tools','loadouts','Current gear, tools, upgrade stones, premium gear and set bonuses are included. Crafting, stone rolls and loadout swaps need manual comparison; this route preserves equipment.'],
  ['Cards, sets & Lab chips','cards','Owned/equipped cards, set selection and chips are included. Naturally available star upgrades are compared; card-set swaps, chips and new card access need review.'],
  ['Lab, Divinity & companions','lab','Saved connections, jewels, divinity links and owned companions apply. New connections, deity links, jewels and companions need a setup/acquisition review; no gem purchases are assumed.'],
  ['Star signs & obols','starSigns','Saved and infinite star signs, account/character obols and their amplifiers apply. Constellation unlocks, sign swaps and obol crafting/rerolls need manual comparison.'],
  ['Achievements, merits, guild & weekly bonuses','achievements','Saved achievements, merit points, guild bonuses, Ballot and Meritocracy are included. Completing requirements, guild spending and future weekly selections are not invented.'],
  ['Progression unlocks & collections','accountReview','Rift/mastery, Equinox clouds, Slab, Tome, Crop Depot, maps, deaths, kills, W6/W7 progression and event rewards can unlock or amplify bonuses. Their saved effects apply, but not every prerequisite chain has a simulated action.'],
  ['Temporary effects & active play','characters','Saved active buffs may affect native totals. Live uptime, damage rotations, crystal kills, snapshotting and event timers are not forecast.'],
  ['Statues & account upgrades','statues','Current statue levels, gold/onyx/zenith tiers and amplification apply. Statue deposits, tier unlocks, monuments, schematics, superbits and class-specific counters without a verified next-step mapping need manual review.']
 ])family(name,page,detail);
 // Counts are a different target type: no unrelated upgrade should masquerade
 // as an unlock. Do not mutate progression flags to infer missing prerequisites.
 const candidates=metric.startsWith('unlock:')?out.filter(c=>c.unit==='collection'):metric==='accountLevels'?out.filter(c=>c.system==='Character & family levels'):out.filter(c=>c.unit!=='collection');
 for(const c of candidates)c.icon=root.DropTargetSources.upgradeIcon(c,p,save,M);
 for(const f of families.values())f.candidates=candidates.filter(c=>c.system===f.name).length;
 const visibleFamilies=metric.startsWith('unlock:')||metric==='accountLevels'?[...families.values()].filter(f=>f.candidates>0):[...families.values()];
 return {candidates,families:visibleFamilies,notes:['One bounded milestone per source. A source can keep growing beyond that milestone; a short route does not mean the account is maxed.','Independent and combined gains are recalculated from a cloned save, including indirect amplification and primary stats. Costs, farming time and shared currency are not optimized or budgeted.','Nametags stay separate because their copies and grades can be gem-shop or time gated. All other conditional actions show their requirements.',...(excludedStamps.length?['Excluded stamp acquisition targets: '+excludedStamps.join('; ')+'. Only owned stamp items and verified active regular quest routes can enter this plan.']:[])]};
}
// A shared purchase must not mutate a character's levels, loadout or inventory.
function isAccountWide(c){
 if(c.system==='Talents'&&c.sharedProvider)return true;
 const paths=[c.path,...(c.extraPatches||[]).map(p=>p.path),...(c.levelSnapshotPath?[c.levelSnapshotPath]:[])];
 return c.foodSlot===undefined&&!(c.system==='Cards'&&!c.accountWide)&&!['Golden food','Post Office','Talents','Character & family levels','Skill levels & mastery'].includes(c.system)&&paths.every(p=>p&&!/_\d+$/.test(String(p[0])));
}
root.ReviewTargetSources={build,isAccountWide};
})(typeof self!=='undefined'?self:globalThis);
