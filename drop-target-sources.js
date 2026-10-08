(function(root){
'use strict';
const read=v=>{if(typeof v==='string'){try{return JSON.parse(v);}catch{}}return v;};
const clean=v=>String(v??'').replaceAll('_',' ');
const number=v=>!Number.isFinite(Number(v))?'unknown':Math.abs(Number(v))>=1e15?Number(v).toExponential(3):Number(v).toLocaleString('en-US',{maximumFractionDigits:2});
function get(data,path){let v=data;for(const k of path){v=read(v);v=v?.[k];}return read(v);}
function set(data,path,value){let v=data;for(const k of path.slice(0,-1)){const next=read(v[k]);if(next==null||typeof next!=='object')throw Error('Missing saved upgrade data: '+path.join('.'));v[k]=next;v=next;}v[path.at(-1)]=value;}
function foodState(parsed,id,save,M){
 const ch=parsed.characters.find(c=>String(c.playerId)===String(id));
 const matches=(ch.food||[]).map((food,index)=>({food,index})).filter(({food})=>food.Type==='GOLDEN_FOOD'&&food.Effect==='DropRatez');
 const last=matches.at(-1); // The native formula uses the LAST matching food slot.
 const currentCap=M.getItemCapacity('cFood',ch,parsed.account,false),townCap=M.getItemCapacity('cFood',{...ch,mapIndex:0},parsed.account,false);
 const capacitySource=townCap.value>currentCap.value?townCap:currentCap,cap=capacitySource.value,loadAt=townCap.value>currentCap.value?'World 1 town':'your saved map';
 if(!Number.isFinite(cap))return {missing:true};
 if(!last)return {capacity:cap,missing:true};
 const path=['EquipQTY_'+id,2,last.index],order=get(save,['EquipOrder_'+id,2,last.index]);
 if(order!==last.food.rawName||Number(get(save,path))!==Number(last.food.amount))return {capacity:cap,missing:true};
 const chest=get(save,['ChestOrder']),qty=get(save,['ChestQuantity']);
 let bank=0;const bankSlots=[];for(const [i,item] of Object.entries(chest||{}))if(item===last.food.rawName){const amount=Math.max(0,Number(qty?.[i])||0);bank+=amount;bankSlots.push({path:['ChestQuantity',i],amount});}
 return {path,rawName:last.food.rawName,name:clean(last.food.displayName||last.food.name),amount:Number(last.food.amount),capacity:cap,capacityBreakdown:capacitySource.breakdown,loadAt,bank,bankSlots,duplicates:matches.length};
}
function build(parsed,save,id,M=root.PrayerMath){
 const optionKey=save.OptLacc!==undefined?'OptLacc':'OptionsListAccount';
 const a=parsed.account,ch=parsed.characters.find(c=>String(c.playerId)===String(id)),candidates=[],notes=['Luck is held at its saved value. Changes to primary stats from golden-food effect or Gallery items are not recomputed; their direct DR effects are included.'];
 const food=foodState(parsed,id,save,M);
 function add(path,to,meta){
  const raw=get(save,path),from=Number(raw);
  if(raw==null||raw===''||!Number.isFinite(from)||!Number.isFinite(to)||to<=from)return;
  candidates.push({id:path.join(':'),path,from,to,name:meta.name||path.join(' '),page:meta.page||'buffs',unit:'level',sources:[],requirements:[],...meta});
 }
 if(!food.missing){
  add(food.path,Math.floor(food.capacity),{id:'food-fill',name:'Fill '+food.name+' to current food capacity',page:'goldFood',unit:'items',sources:['Golden Food'],foodFill:true,requirements:['Farm or move additional '+food.name+' into the existing food slot at '+food.loadAt+'. Current bank stock: '+number(food.bank)+'. Food is shared across characters; the planner does not move it.']});
  if(food.duplicates>1)notes.push('Multiple equipped foods have the DropRatez effect. Only the last matching slot contributes; this planner changes that slot only.');
 }else notes.push('No verifiable equipped drop-rate golden food was found. Equip Golden Cake (or inspect the existing food slots) and re-import to calculate stack and capacity routes. Empty exported slots are not assumed unlocked.');
 const stampKey=save.StampLv!==undefined?'StampLv':'StampLevel',capKey=save.StampLvM!==undefined?'StampLvM':'StampLevelMAX';
 for(const [category,stamps] of Object.entries(a.stamps||{}))for(const [index,s] of stamps.entries()){
  const carry=s.stat==='AllCarryCap',gold=s.stat==='GFood',drop=s.stat==='DropRate';
  if(!(carry||gold||drop)||Number(s.level)<1)continue;
  const group={combat:0,skills:1,misc:2}[category],path=[stampKey,group,index],capPath=[capKey,group,index],cap=Number(get(save,capPath)),step=Number(s.reqItemMultiplicationLevel);
  if(!Number.isFinite(cap)||!step)continue;
  if(carry&&food.missing)continue;
  const to=cap>s.level?cap:cap+step;
  const requirements=[`Buy ${clean(s.displayName)} levels at the stamp pig. Next coin price: ${number(s.goldCost)} coins; this is not the total batch cost.`];
  if(to>cap)requirements.push(`Raise the material limit from ${cap} to ${to}: the saved next hand-in is ${number(s.materialCost)} ${clean(s.itemReq?.name||s.itemReq?.rawName)}; saved stock ${number(s.ownedMats)}. ${s.enoughPlayerStorage===false?'Improve carry capacity or stamp discounts first. ':''}Recheck the hand-in with your current discounts; later limits are not assumed affordable.`);
  if(carry)requirements.push('Then farm and equip the larger golden-food stack. Capacity alone gives no drop-rate gain. Uses your saved equipment/prayers, checking the saved map and town.');
  add(path,to,{name:clean(s.displayName)+(carry?' + refill '+food.name:''),page:'stamps',sources:carry||gold?['Golden Food']:['Stamps'],capPath,capTo:Math.max(cap,to),oldCap:cap,foodFill:carry,requirements});
 }
 for(const i of [11,18,42,79,86]){
  const s=a.upgradeVault?.upgrades?.[i];if(!s?.unlocked||(i===11&&food.missing))continue;
  add(['UpgVault',i],Math.min(Number(s.maxLevel),Number(s.level)+Math.max(1,Math.ceil(Number(s.level)*.1))),{name:clean(s.name)+(i===11?' + refill '+food.name:''),page:'upgradeVault',foodFill:i===11,sources:i===18?['Upgrade Vault']:i===42?['DR Vial','Golden Food']:i===79?['Crop Depot']:['Golden Food'],requirements:['Buy the displayed levels with coins. Recheck the changing costs in the Vault.'+(i===11?' Farm and equip the additional food; capacity alone adds no DR.':'')]});
 }
 const voteSources=['Vote','Golden Food','Shrine','Crop Depot'];
 const meritSources=[...voteSources,'DR Vial','Sigil','Starsign','Stamps','Owl','Equipment, Gallery & Hat Rack','BONUS DROP RATE equipment pool','DROP RATE MULTI equipment pool'];
 const voteRequirement='Only the saved active weekly bonuses apply. This does not change the server-selected Ballot or Meritocracy result; a different week can change the gain.';
 for(const [i,s] of (a.arcade?.shop||[]).entries())if(s.active&&s.effect?.includes('Meritocracy_Bonus'))add(['ArcadeUpg',i],Math.min(101,Number(s.level)+1),{name:'Arcade Meritocracy Bonus',page:'arcade',sources:meritSources,requirements:['Buy the next level in the active shop; level 101 requires Royal Balls.',voteRequirement]});
 const arcade=a.arcade?.shop?.[27];if(arcade?.active)add(['ArcadeUpg',27],Math.min(101,Number(arcade.level)+1),{name:'Arcade Drop Rate',page:'arcade',sources:['Arcade'],requirements:['Buy the next level in the active shop. Level 101 requires Royal Balls; earlier levels use Gold Balls.']});
 for(const s of Object.values(a.alchemy?.bubbles||{}).flat()){
  if(!['DROPPIN_LOADS','SHIMMERON','CODFREY_RULZ_OK'].includes(s.bubbleName)||s.level<1)continue;
  const key=s.rawName?.replace(/^aUpgrades/,''),milestone=root.StatTodoModel.bubbleMilestone(s);
  if(!/^[OGPY]\d+$/.test(key))continue;
  if(milestone?.maintenance){notes.push(clean(s.bubbleName)+' is past its 99% base-effect planning cutoff; automatic growth can continue. This only describes this bubble, not your account or other DR sources.');continue;}
  add(['CauldronInfo','OGPY'.indexOf(key[0]),Number(key.slice(1))],milestone?.target,{name:clean(s.bubbleName),page:'alchemy',sources:s.bubbleName==='DROPPIN_LOADS'?['Bubble']:s.bubbleName==='SHIMMERON'?['Golden Food']:['Equipment, Gallery & Hat Rack','BONUS DROP RATE equipment pool','DROP RATE MULTI equipment pool'],requirements:['Work toward this base-effect milestone with materials/liquids or automatic levels. Effective class, Prisma and account scaling are recalculated; this is not a cost estimate.']});
 }
 for(const meal of a.cooking?.meals||[]){
  if(meal.stat!=='zGoldFood'||meal.level<1)continue;
  const label=clean(meal.name),sources=['Golden Food'];
  add(['Meals',0,meal.index],Math.min(a.cooking.mealMaxLevel,meal.level+5),{name:label,page:'cooking',sources,requirements:[`Cook enough ${label} for these levels. Saved next-level requirement: ${number(meal.levelCost)}; available meal stock: ${number(meal.amount)}. The remaining batch may require more cooking.`]});
  const ribbon=Number(get(save,['Ribbon',28+meal.index]));
  if(ribbon>=0)add(['Ribbon',28+meal.index],Math.min(25,Math.floor(ribbon/5)*5+5),{name:label+' ribbon',page:'cooking',sources,unit:'rank',requirements:['Unlock ribbons, then obtain and assign a ribbon of this rank to this meal. Ribbon availability is not guaranteed; the projection assumes the stated rank is obtained.']});
  const mastery=meal.cookingMasteryNode?.level;
  if(a.cooking.cookingMastery&&Number.isFinite(mastery))add(['CookMaster',0,meal.index],[5,20,45,95].find(t=>t>mastery),{name:label+' Cooking Mastery',page:'cooking',sources,unit:'points',requirements:['Allocate this many yellow points to this meal in Cooking Mastery. Earn additional points or review a respec; this scenario does not take points from another meal.']});
 }
 // The first matching Beanstalk food is the one the native calculation reads.
 const stalk=(M.dropBeanstalkOrder?.[29]||[]).filter(v=>isNaN(v));
 const stalkIndex=stalk.findIndex(raw=>M.stampItemCatalog?.[raw]?.Effect==='DropRatez');
 if(stalkIndex>=0){
  const rank=Number(get(save,['Ninja',104,stalkIndex]));
  if(rank>0&&rank<3)add(['Ninja',104,stalkIndex],rank+1,{name:'Golden Cake Beanstalk',page:'beanstalk',sources:['Golden Food'],unit:'rank',requirements:[`Meet the next Beanstalk unlock and deposit requirement: ${number([10000,100000,1000000][rank])} foods for rank ${rank+1}. Farm this separately from the equipped stack; no inventory is consumed in this preview.`]});
  else if(rank===0)notes.push('Golden Cake has no active Beanstalk rank. Check the Sneaking emporium unlock and first 10,000-food deposit; the planner does not assume Beanstalk access.');
 }
 for(const [i,v] of Object.values(M.dropVialCatalog||{}).entries()){
  const current=a.alchemy?.vials?.find(s=>s.name===v.name);
  const mastery=!!M.isRiftBonusUnlocked(a.rift,'Vial_Mastery')&&current?.level===12;
  if(!current||(!['7drMulto','GFood'].includes(current.stat)&&!mastery)||current.level<1)continue;
  add(['CauldronInfo',4,i],Math.min(13,current.level+1),{name:clean(current.name)+' vial'+(mastery?' + Vial Mastery':''),page:'vials',sources:mastery?['DR Vial','Golden Food']:current.stat==='7drMulto'?['DR Vial']:['Golden Food'],requirements:['Collect the next vial materials and liquids; all saved vial amplification is included.'+(mastery?' Completing level 13 also increases the number of maxed vials, amplifying DR and golden-food vials through unlocked Vial Mastery.':'')]});
 }
 for(const [i,s] of (a.alchemy?.p2w?.sigils||[]).entries())if(['TROVE','EMOJI_VEGGIE'].includes(s.name)&&s.unlocked>=0&&s.unlocked<4){
  add(['CauldronP2W',4,2*i+1],s.unlocked+1,{name:clean(s.name)+' sigil',page:'sigils',unit:'tier',sources:s.name==='TROVE'?['Sigil']:['Golden Food'],requirements:['Unlock access to this sigil tier and complete its research time. Saved artifact and sigil amplification are included.']});
 }
 const coral=a.coralReef?.reefUpgrades?.[4]||a.spelunking?.reefUpgrades?.[4];
 const coralLevel=Number(get(save,['Spelunk',13,4]));
 if(coralLevel>0&&coral&&coralLevel<Number(coral.x1))add(['Spelunk',13,4],coralLevel+1,{name:'Grey Coral / Gallery amplification',page:'coral',sources:['Equipment, Gallery & Hat Rack','BONUS DROP RATE equipment pool','DROP RATE MULTI equipment pool'],requirements:['Buy the next Grey Coral level using coral currency. Recalculate Gallery trophies and nametags in all three DR pools.',...(coral?.cost?['Saved next cost: '+number(coral.cost)+'.']:[])]});
 const gearSources=['Equipment, Gallery & Hat Rack','BONUS DROP RATE equipment pool','DROP RATE MULTI equipment pool'];
 const relevant=item=>[item?.UQ1txt,item?.UQ2txt].some(v=>/DROP_RATE|DROP_CHANCE|GOLD_FOOD/.test(v||''));
 for(const [index,rank] of Object.entries(get(save,['Spelunk',17])||{})){
  if(!/^\d+$/.test(index))continue;const i=Number(index);
  const item=M.stampItemCatalog?.[i===6?'EquipmentNametag6b':'EquipmentNametag'+i];
  if(rank>0&&rank<5&&relevant(item))add(['Spelunk',17,i],rank+1,{name:clean(item.displayName)+' Gallery grade',page:'nametags',group:'nametags',unit:'grade',sources:[...gearSources,'Golden Food'],requirements:['Raise this owned nametag by one Gallery grade. Obtain the required copies or upgrade from its original source; availability and costs need checking. All affected equipment pools are recalculated.']});
 }
 const trophies=get(save,['Spelunk',16]),podiums=Number(a.gallery?.podiumsOwned)||0;
 if(Array.isArray(trophies)){
  const end=Math.min(trophies.length,48+podiums),empty=Array.from({length:Math.max(0,end-48)},(_,i)=>48+i).find(i=>Number(trophies[i])===0);
  if(empty!==undefined){const seen=new Set();for(let i=0;i<Math.min(48,trophies.length);i++){
   const trophy=Number(trophies[i]),item=M.stampItemCatalog?.['Trophy'+trophy];
   if(trophy<=0||seen.has(trophy)||!relevant(item))continue;seen.add(trophy);
   add(['Spelunk',16,empty],trophy,{name:'Display '+clean(item.displayName)+' on an empty Gallery podium',page:'nametags',unit:'placement',displayFrom:'Stored in Gallery',displayTo:'Podium '+(empty-47),sources:[...gearSources,'Golden Food'],exactFrom:true,conflict:'podium:'+empty,extraPatches:[{path:['Spelunk',16,i],from:trophy,value:0}],requirements:['Move this existing stored trophy onto the empty unlocked podium. The preview removes its stored-copy bonus before adding the podium bonus; it does not create a duplicate trophy.']});
  }}
 }
 const endless=Number(get(save,[optionKey,319]));
 if(endless>0){
  const cycle=M.dropEndlessCatalog?.bonusIds||[];
  for(const [reward,label] of [[26,'meal-bonus'],[31,'winner-bonus amplification']]){
   let to=endless+1;while(to<=endless+40&&Number(cycle[(to-1)%40])-1!==reward)to++;
   if(to<=endless+40)add([optionKey,319],to,{id:'endless:'+reward,conflict:'endless',name:'Endless Summoning: next '+label+' reward',page:'summoning',unit:'wins',sources:['Golden Food','Summoning'],requirements:[`Win the next ${to-endless} Endless Summoning battles, ending at win ${to}. Includes intervening rewards and winner-bonus amplification. These are alternative milestones, not additional independent wins; damage, HP and time requirements must be met.`]});
  }
 }
 for(const [i,p] of (a.prayers||[]).entries()){
  if(!['Midas_Minded','Ruck_Sack'].includes(p.name)||p.level<1)continue;
  if(p.name==='Ruck_Sack'&&food.missing)continue;
  add([save.PrayersUnlocked!==undefined?'PrayersUnlocked':'PrayOwned',i],Math.min(Number(p.maxLevel),p.level+1),{name:clean(p.name)+(p.name==='Ruck_Sack'?' + refill '+food.name:''),page:'prayers',foodFill:p.name==='Ruck_Sack',sources:p.name==='Ruck_Sack'?['Golden Food']:['Prayers'],requirements:['Spend the required souls to buy the next prayer level. Uses your current active-prayer or no-prayer Superbits setup. Review the prayer curse before changing the loadout.']});
 }
 for(const s of a.legendTalents?.talents||[])if([1,9,22,24,25,26,36].includes(s.originalIndex))add(['Spelunk',18,s.originalIndex],Math.min(s.maxLevel,s.level+1),{name:clean(s.name),page:'legendTalents',foodFill:s.originalIndex===36&&!food.missing,sources:s.originalIndex===9?[...gearSources,'Golden Food']:s.originalIndex===36?['Stamps','Bubble','Golden Food',...gearSources]:s.originalIndex===22?voteSources:s.originalIndex===24?meritSources:s.originalIndex===25?['Golden Food']:s.originalIndex===26?['Owl']:['Legend Talent'],requirements:['Earn and spend an additional Legend point without removing a point from another talent. Respect the saved talent cap.',...([22,24].includes(s.originalIndex)?[voteRequirement]:[])]});
 for(const i of [22,44]){const grimoire=a.grimoire?.upgrades?.find(s=>s.index===i);if(grimoire?.unlocked)add(['Grimoire',i],Math.min(Number(grimoire.x4),grimoire.level+1),{name:clean(grimoire.name),page:'grimoire',sources:i===22?['Crop Depot']:['Grimoire'],requirements:['Farm the required bones and buy the next Grimoire upgrade within its native level cap.']});}
 const statue=a.royalGuardian?.royalStatues?.[1];
 if(a.royalGuardian?.hasRoyalGuardian&&statue?.level>0)add(['RoyalG',0,1],statue.level+1,{name:'Royal DROP RATE statue',page:'royalArmory',sources:['Royal Statue'],requirements:[`Get one successful statue enhancement using ${statue.costItem||'the required enhancement item'}. Attempts can fail; this projects a successful level, not guaranteed progress per item.`]});
 for(const i of [168,173,131]){const s=a.research?.gridSquares?.[i];if(s?.canSelect||s?.level>0)add(['Research',0,i],Math.min(s.maxLv,s.level+1),{name:clean(s.name||('Research square '+i)),page:'research',sources:i===168?['Glimbo DR']:i===131?['Legend Talent']:['Research'],requirements:['Reach this Research square and earn the point needed for its next level. A cap increase may also need a follow-up talent purchase.']});}
 for(const [w,pets] of (a.breeding?.pets||[]).entries())for(const [i,p] of pets.entries()){
  if(!p.unlocked||p.shinyLevel<1||p.shinyLevel>=20||!/(Drop_Rate|Bonuses_from_All_Meals|Infinite_Star_Signs)/.test(p.rawPassive||''))continue;
  add(['Breeding',22+w,i],Math.floor((1+Math.pow(p.shinyLevel,1.6))*Math.pow(1.7,p.shinyLevel))+1,{name:clean(p.name||p.rawName||`World ${w+1} pet ${i+1}`)+' shiny',page:'shinyPets',foodFill:/Infinite_Star_Signs/.test(p.rawPassive)&&!food.missing,sources:/Drop_Rate/.test(p.rawPassive)?['Shiny']:/Infinite_Star_Signs/.test(p.rawPassive)?['Starsign','Golden Food']:['Golden Food'],unit:'progress',displayFrom:'Shiny Lv '+p.shinyLevel,displayTo:'Shiny Lv '+(p.shinyLevel+1),requirements:['Place this shiny pet in the fence until it reaches the next level. Meal-bonus shinies scale Peachring; Infinite Star Signs require the Rift unlock and an owned sign within the new range. Refill food if capacity increases. Time is not estimated.']});
 }
 const kills=Number(get(save,[optionKey,139]));
 if(kills>0&&parsed.characters.some(c=>(c.flatTalents||[]).some(t=>t.name==='ARCHLORD_OF_THE_PIRATES'&&t.level>0)))add([optionKey,139],Math.ceil(kills*2),{name:'Archlord plundered kills',page:'characters',unit:'kills',sources:['Archlord of the Pirates'],requirements:['Earn these additional plundered kills on Siege Breaker. This is a long-term farming milestone, not ordinary monster kills or an instant purchase.']});
 // Indirect effects are re-parsed too: these are native save milestones, not
 // percentages added to the existing result.
 for(const [i,box] of (ch.postOffice?.boxes||[]).entries())if(box.name==='Non_Predatory_Loot_Box'){
  const key=save['POu_'+id]!==undefined?'POu_'+id:'PostOfficeInfo_'+id,slot=get(save,[key,i]),path=Array.isArray(slot)?[key,i,0]:[key,i];
  add(path,Math.min(box.maxLevel,box.level+25),{name:'Non Predatory Loot Box',page:'postOffice',sources:['Post Office'],requirements:['Earn and allocate these additional Post Office boxes without removing points from another box. Only its direct drop-rate effect is projected; Luck remains at the saved value.']});
 }
 for(const provider of parsed.characters){
  const royal=provider.class==='Royal_Guardian',shaman=['Shaman','Bubonic_Conjuror'].includes(provider.class);
  if(!royal&&!shaman)continue;
  add(['Lv0_'+provider.playerId,0],Math.floor(provider.level/25)*25+25,{name:(provider.name||'Character '+provider.playerId)+': '+(royal?'Royal Guardian':'Shaman')+' family level',page:'familyBonuses',sources:royal?['Royal Guardian family']:['Golden Food'],requirements:['Farm class EXP to this level milestone. All family providers are compared again in roster order; this does not assume the leveled character becomes the provider. New talent points and primary-stat changes are not allocated or projected.']});
 }
 for(const [i,s] of (a.equinox?.upgrades||[]).entries())if(['Faux_Jewels','Voter_Rights'].includes(s.name)&&s.unlocked)add(['Dream',2+i],Math.min(s.maxLvl,s.lvl+1),{name:clean(s.name),page:'equinox',sources:s.name==='Voter_Rights'?voteSources:['Equinox'],requirements:['Spend Equinox charge on the next unlocked '+clean(s.name)+' level. Further levels may require cloud rewards that raise its cap.',...(s.name==='Voter_Rights'?[voteRequirement]:[])]});
 const land=a.farming?.ranks?.[9];
 if(a.farming?.hasLandRank&&a.farming.totalRanks>=land?.unlockAt)add(['FarmRank',2,9],Math.min(land.maxLevel,land.upgradeLevel+1),{name:'Seed of Loot land rank',page:'farming',sources:['Land Rank'],requirements:['Earn and spend an additional Land Rank point; existing allocated points are not removed. Respect the current fifth-column cap.']});
 for(const s of a.farming?.exoticMarket||[])if([14,40,48,49,59].includes(s.index)&&(s.level>0||s.isAvailableThisWeek))add(['FarmUpg',20+s.index],Math.min(s.thresholdLevel||Infinity,s.level+Math.max(1,Math.ceil(s.level*.1))),{name:clean(s.name),page:'farming',foodFill:s.index===49&&!food.missing,sources:s.index===48?['Bubble','Golden Food',...gearSources]:s.index===49?['Stamps','Golden Food']:s.index===14?['Land Rank']:s.index===40?['Crop Depot']:['Exotic Market'],requirements:[`Buy these Exotic Market levels with beans${s.isAvailableThisWeek?'':' when this upgrade returns to the weekly rotation'}. Respect weekly purchase limits; this is a progression milestone, not a single available purchase.`]});
 const hardhat=a.spelunking?.upgrades?.[50];
 if(hardhat?.level>0)add(['Spelunk',5,50],Math.min(hardhat.x3,hardhat.level+Math.max(1,Math.ceil(hardhat.level*.1))),{name:'Golden Hardhat',page:'spelunking',sources:['Spelunking'],requirements:['Buy the displayed Spelunking shop levels using Amber. Saved next price: '+number(hardhat.cost)+'; later levels cost more.']});
 const shrine=a.shrines?.[4],shrineKey=save.ShrineInfo!==undefined?'ShrineInfo':'Shrine';
 if(shrine?.shrineLevel>0)add([shrineKey,4,3],shrine.shrineLevel+1,{name:clean(shrine.name),page:'shrines',sources:['Shrine'],requirements:['Accumulate shrine charge until the next level. The projection keeps your saved shrine placement and checks whether it applies at your farming map.']});
 if(!food.missing){
  const carryShrine=a.shrines?.[3];
  if(carryShrine?.shrineLevel>0)add([shrineKey,3,3],carryShrine.shrineLevel+1,{name:clean(carryShrine.name)+' + refill '+food.name,page:'shrines',sources:['Golden Food'],foodFill:true,requirements:['Accumulate the next carry-capacity shrine level, then farm and equip the larger food stack. Saved-map and town applicability are recalculated; capacity alone adds no DR.']});
  const bag=Object.values(M.dropCarryBags?.Foods||{}).filter(b=>b.capacity>ch.maxCarryCap?.Foods).sort((a,b)=>a.capacity-b.capacity)[0];
  if(bag)add(['MaxCarryCap_'+id,'Foods'],bag.capacity,{name:clean(bag.displayName)+' + refill '+food.name,page:'loadouts',unit:'capacity',foodFill:true,sources:['Golden Food'],requirements:['Obtain and use this food pouch on the selected character, then farm and equip the additional food. Meet its crafting/unlock requirements; the preview does not assume you own it or its materials.']});
 }
 for(const [i,bribe] of (a.bribes||[]).entries())if(!bribe.done&&(bribe.name==='Gold_from_Lead'||i===23&&!food.missing)&&Number(get(save,['BribeStatus',i]))===0)add(['BribeStatus',i],1,{name:clean(bribe.name)+(i===23?' + refill '+food.name:''),page:'bribes',unit:'unlock',sources:['Golden Food'],foodFill:i===23,requirements:['Unlock and buy this bribe from the bribe NPC, meeting preceding requirements and coin costs.'+(i===23?' Then equip the larger golden-food stack.':'')]});
 const artifactGates=[true,true,Number(get(save,['Rift',0]))>29,!!a.sneaking?.jadeEmporium?.find(s=>s.name==='Sovereign_Artifacts')?.unlocked,(a.spelunking?.cavesUnlocked||0)>=1,(a.research?.gridSquares?.[109]?.level||0)>0];
 for(const [i,artifact] of (a.sailing?.artifacts||[]).entries()){
  if(!['Chilled_Yarn','The_Winz_Lantern','Causticolumn','Deathskull'].includes(artifact.name)||artifact.acquired<1||artifact.acquired>=6||!artifactGates[artifact.acquired])continue;
  const meal=(a.cooking?.meals||[]).find(m=>m.stat==='zGoldFood'&&m.level>=a.cooking.mealMaxLevel);
  if(artifact.name==='Causticolumn'&&!meal)continue;
  add(['Sailing',3,i],artifact.acquired+1,{name:clean(artifact.name)+(meal&&artifact.name==='Causticolumn'?' + raise '+clean(meal.name):''),page:'sailing',unit:'tier',sources:artifact.name==='Deathskull'?[...gearSources,'Golden Food']:artifact.name==='Chilled_Yarn'?['Sigil','Golden Food']:artifact.name==='The_Winz_Lantern'?['Summoning','Golden Food']:['Golden Food'],...(artifact.name==='Causticolumn'?{mealIndex:meal.index}:{}),requirements:['Find this artifact\'s next tier through Sailing. Its tier access is unlocked in the saved account, but finding it is random and can take time. No gems or guaranteed acquisition are assumed.',...(artifact.name==='Causticolumn'?['After raising the meal cap, cook and buy up to five additional golden-food meal levels. Raising the cap alone adds no DR.']:[])]});
 }
 // Dependency audit: shared amplifiers are real upgrade paths even when their
 // descriptions do not mention drop rate. Every scenario is fully re-parsed.
 const prismaSources=['Bubble','Golden Food',...gearSources];
 for(const [i,u] of (a.arcade?.shop||[]).entries())if(u.active&&/Emperor_Bonuses|Prisma_Bonuses/.test(u.effect||''))add(['ArcadeUpg',i],Math.min(101,u.level+1),{name:'Arcade: '+clean(u.effect.replace(/^.*?_/,'')),page:'arcade',sources:/Emperor/.test(u.effect)?['Emperor','Summoning','Golden Food']:prismaSources,requirements:['Buy the next level in the active Arcade rotation. Level 101 requires Royal Balls. Existing rewards and Prisma assignments are preserved; their native caps and rounding still apply.']});
 for(const index of [40,45,58]){
  const u=a.tesseract?.upgrades?.find(s=>s.index===index);
  if(u?.unlocked)add(['Arcane',index],Math.min(u.x4,u.level+1),{name:clean(u.name),page:'tesseract',sources:index===40?['Starsign','Golden Food']:index===45?prismaSources:['Tesseract Map'],foodFill:index===40&&!food.missing,requirements:['Buy the next Tesseract level with the required Tachyons. Uses owned Seraph Cosmos, existing Prisma bubbles, or saved-map progress as applicable; no new unlock is assumed. Star-sign and Prisma caps are recalculated.'+(index===40?' If capacity grows, farm and equip the larger food stack.':'')]});
 }
 const summoningLevel=Number(get(save,['Lv0_'+id,18]));
 if(summoningLevel>0&&a.starSigns?.some(s=>s.starName==='Seraph_Cosmos'&&s.unlocked))add(['Lv0_'+id,18],Math.floor(summoningLevel/20)*20+20,{name:'Summoning level: next Seraph Cosmos milestone',page:'summoning',sources:['Starsign','Golden Food'],foodFill:!food.missing,requirements:['Earn Summoning EXP on this character to the next 20-level star-sign scaling boundary. Keeps owned and aligned signs; the native 5x star-sign cap applies. Farm and load additional food if capacity rises.']});
 const compass=a.compass?.upgrades?.find(s=>s.index===76);
 if(compass?.level>0)add(['Compass',0,76],Math.min(compass.x4,compass.level+1),{name:clean(compass.name)+' (Exalted Stamps)',page:'compass',sources:['Stamps','Golden Food'],foodFill:!food.missing,requirements:['Buy the next unlocked Compass level with dust. Only already-exalted stamps are amplified. Farm and load additional food if Mason Jar capacity increases.']});
 for(const [i,atom] of (a.atoms?.atoms||[]).entries())if(atom.name==='Aluminium_-_Stamp_Supercharger'&&atom.level>0)add(['Atoms',i],Math.min(atom.maxLevel,atom.level+1),{name:clean(atom.name),page:'atomCollider',sources:['Stamps','Golden Food'],foodFill:!food.missing,requirements:['Spend particles on the next Aluminium level within the saved cap. Only already-exalted stamps are amplified. Farm and load additional food if capacity increases.']});
 const workerClass=Number(get(save,[optionKey,464]));
 if(workerClass>0&&workerClass<8)add([optionKey,464],[4,8].find(t=>t>workerClass),{name:'Clam Work: next Meritocracy or Gallery compensation',page:'clamWork',unit:'promotions',sources:[...meritSources,...gearSources],requirements:['Earn every intervening Clam Work promotion. Promotions require pearls and can fail; this is successful progression, not a guaranteed single attempt. Gallery compensation amplifies current items; weekly rewards retain their saved selection.']});
 const owl=a.owl?.upgrades?.[1],owlLevel=Number(get(save,[optionKey,255]));
 if(owl?.unlocked){const to=5+6*Math.max(0,Math.floor((owlLevel-5)/6)+1);add([optionKey,255],to,{name:'Orion: next Drop Rate bonus',page:'orion',sources:['Owl'],requirements:['Spend feathers on Bonus upgrades through this level. Every sixth upgrade increases Drop Rate; the intermediate bonuses are included. Feather resets are not simulated.']});}
 const obstruction=Number(get(save,['Research',7,9]));
 if(obstruction>0)add(['Research',7,9],[11,15,52].find(t=>t>obstruction),{name:'Jelly Operator: next drop-rate or golden-food reward',page:'jelly',unit:'obstructions',sources:['Golden Food','Sushi + Jelly Operator'],requirements:['Clear every intervening Jelly obstruction and pay its required resources. This projects the permanent reward milestone; it does not assume resources or board completion are available now.']});
 const sushi=a.sushiStation;
 // The DR reward is a fixed discovery unlock. Knowledge and Perfecto do NOT
 // multiply it. Only offer the immediately next type; never skip missing sushi.
 if(sushi?.uniqueSushi===48)add(['Sushi',5,48],0,{name:'Discover Unagi Nigiri',page:'sushi',unit:'discovery',displayFrom:'Undiscovered',displayTo:'Discovered',sources:['Sushi + Jelly Operator'],requirements:['Combine sushi to discover Unagi Nigiri. Its rest-of-game Drop Rate reward is fixed; Knowledge and Perfecto do not increase that reward.']});
 const emperorWins=Number(get(save,[optionKey,369]));
 if(emperorWins>0){
  const next=(a.emperor?.bonuses||[]).filter(s=>[8,11].includes(s.rawIndex)).flatMap(s=>s.indexes||[]).filter(i=>i>=emperorWins).sort((a,b)=>a-b)[0];
  add([optionKey,369],next+1,{name:'Emperor: next drop-rate or winner-bonus reward',page:'emperorBonuses',unit:'wins',sources:['Emperor','Golden Food','Summoning'],requirements:[`Clear every showdown through win ${next+1}. Includes intervening rewards; daily attempts and escalating boss HP can delay this milestone.`]});
 }
 const vicar=a.tesseract?.upgrades?.find(s=>s.index===48);
 if(vicar?.unlocked)add(['Arcane',48],Math.min(vicar.x4,vicar.level+1),{name:'Vicar of the Emperor',page:'tesseract',sources:['Emperor','Golden Food','Summoning'],requirements:['Buy the next Tesseract level using its required Tachyons. Both direct Emperor DR and its Summoning winner amplification are recalculated.']});
 const measurement=a.hole?.measurements?.[15];
 if(measurement?.level>0)add(['Holes',22,15],measurement.level+1,{name:'Hole: Drop Rate measurement',page:'holeMeasurements',sources:['Measurement'],requirements:['Pay the next measurement resource cost: '+number(measurement.cost)+'. Saved resource stock: '+number(measurement.owned)+'. Golem-kill scaling and measurement amplification use the saved progress.']});
 const golems=Number(get(save,['Holes',11,63]));
 if(measurement?.level>0&&golems>0)add(['Holes',11,63],Math.ceil(golems*2),{name:'Temple Golem kills: measurement scaling',page:'holeMeasurements',unit:'kills',sources:['Measurement'],requirements:['Farm this additional recorded Temple Golem kill progress. The saved DR measurement scales logarithmically with this count; other monster kills do not count.']});
 for(const [counter,schematic,label] of [[26,46,'Grotto: next Monarch layer'],[55,82,'Temple: next Centurion layer']]){
  const cleared=Number(get(save,['Holes',11,counter]));
  if(cleared>0&&Number(get(save,['Holes',13,schematic]))>0)add(['Holes',11,counter],cleared+1,{name:label,page:'holeSchematics',unit:'layers',sources:['Schematics'],requirements:['Clear the next cavern boss layer to improve the already-owned DR schematic. Complete the encounter prerequisites and boss fight; this is a progression goal, not a purchase of another schematic level.']});
 }
 const mapKills=Number(get(save,['MapBon',ch.mapIndex,0]));
 if(mapKills>0)add(['MapBon',ch.mapIndex,0],Math.ceil(mapKills*2),{name:'Tesseract: saved-map DR progress',page:'tesseract',unit:'kills',sources:['Tesseract Map'],requirements:['Earn this additional Tesseract map-bonus progress on the selected character\'s saved map. The current talent/upgrade cap is enforced by the full formula; ordinary kills elsewhere do not increase this map counter.']});
 for(const [i,label] of [[26,'Wisdom monument: Drop Rate reward'],[29,'Wisdom monument: reward amplification']]){
  const level=Number(get(save,['Holes',15,i]));
  if(level>0)add(['Holes',15,i],level+1,{name:label,page:'holeMonuments',sources:['Monument'],requirements:['Earn and select one additional level of this Wisdom monument reward. It depends on monument attempts and reward availability; existing reward levels are not reassigned.']});
 }
 const glimbo=a.minehead,tradeRows=(glimbo?.glimbo||[]).filter(s=>s.trades>0&&Number(get(save,['Research',12,s.index]))===s.trades);
 if(a.research?.gridSquares?.[168]?.level>0&&tradeRows.length){
  const total=Number(glimbo.glimboTotalTrades),target=(Math.floor(total/100)+1)*100,allocations=tradeRows.map(s=>({...s,extra:0}));
  for(let i=0;i<target-total;i++)allocations[i%allocations.length].extra++;
  const used=allocations.filter(s=>s.extra>0),first=used[0];
  add(['Research',12,first.index],first.trades+first.extra,{name:'Glimbo: next 100-trade DR milestone',page:'minehead',unit:'milestone',displayFrom:number(total)+' total trades',displayTo:number(target)+' total trades',sources:['Glimbo DR'],extraPatches:used.slice(1).map(s=>({path:['Research',12,s.index],from:s.trades,value:s.trades+s.extra})),requirements:['Complete these additional trades across resources you have already traded. This distributes the remaining trades evenly; it is not a cheapest-resource plan, and prices increase after each trade.',...used.map(s=>clean(s.itemName||s.rawItemName)+': '+s.extra+' more trades (current next cost '+number(s.cost)+'; not the batch total).')]});
 }
 const passiveDrop=new Set(['mini5a','caveC','caveD','anni4Event1','luckEvent1']);
 const equipped=new Set((ch.cards?.equippedCards||[]).map(c=>c.rawName));
 const maxStars=4+(Number(get(save,['Rift',0]))>=45?1:0)+(a.spelunking?.loreBosses?.[2]?.defeated?1:0);
 const cardsPath=save.Cards?.[0]!==undefined?['Cards',0]:['Cards0'];
 for(const card of Object.values(a.cards||{})){
  const galleryCard=card.rawName==='w7a11',shrineCard=/Shrine_Effects_\(Passive\)/.test(card.effect||''),gold=/Gold_Food_Effect/.test(card.effect||''),drop=passiveDrop.has(card.rawName)||equipped.has(card.rawName)&&/Total_Drop_Rate|Drop_Rate_Multi/.test(card.effect||'');
  if(!(gold||drop||shrineCard||galleryCard)||card.amount<=0||card.stars>=maxStars)continue;
  // Boss3B has a special threshold in calculateStars, not the generic card curve.
  const to=card.rawName==='Boss3B'?Math.floor(1.5*Math.pow(card.stars+1+Math.floor(card.stars/3),2))+1:card.nextLevelReq;
  add([...cardsPath,card.rawName],to,{name:clean(card.displayName||card.rawName)+' card: next star'+(shrineCard&&!food.missing?' + refill '+food.name:''),page:'cards',unit:'cards',foodFill:shrineCard&&!food.missing,sources:galleryCard?[...gearSources,'Golden Food']:shrineCard?['Shrine','Golden Food']:gold?['Golden Food']:['Cards','Card Multi'],requirements:['Farm enough copies for the next naturally unlocked star tier. Seasonal cards require their event or an available card source. Keeps your equipped cards, card set and chips; no Cardifier purchase is assumed. If shrine amplification increases food capacity, farm and load the larger stack shown.']});
 }
 notes.push('Setup review: temporary food-loading gear and Ruck Sack/Zerg Rushogen changes can increase the stack you load. This planner checks your saved setup and town only; it does not optimize a separate loading preset.');
 notes.push('Acquisition and amplification checks still matter: Secret and Godshard armor sets, Pristine Charms, Lab jewels/chips, Vial Mastery, Sailing artifacts, star signs, card sets, obols, talent books, family levels, Royal resource grades, Apocalypse, Hole measurements/monuments/schematics, Crop Depot, Tesseract maps, Minehead opponents, Tome and companions. Current effects are included; not every prerequisite chain has a numerical upgrade route.');
 return {candidates,notes,food};
}
root.DropTargetSources={get,set,foodState,build};
})(typeof window!=='undefined'?window:globalThis);
