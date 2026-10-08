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
 let bank=0;for(const [i,item] of Object.entries(chest||{}))if(item===last.food.rawName)bank+=Number(qty?.[i])||0;
 return {path,rawName:last.food.rawName,name:clean(last.food.displayName||last.food.name),amount:Number(last.food.amount),capacity:cap,capacityBreakdown:capacitySource.breakdown,loadAt,bank,duplicates:matches.length};
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
 for(const i of [11,18,86]){
  const s=a.upgradeVault?.upgrades?.[i];if(!s?.unlocked||(i===11&&food.missing))continue;
  add(['UpgVault',i],Math.min(Number(s.maxLevel),Number(s.level)+Math.max(1,Math.ceil(Number(s.level)*.1))),{name:clean(s.name)+(i===11?' + refill '+food.name:''),page:'upgradeVault',foodFill:i===11,sources:i===18?['Upgrade Vault']:['Golden Food'],requirements:['Buy the displayed levels with coins. Recheck the changing costs in the Vault.'+(i===11?' Farm and equip the additional food; capacity alone adds no DR.':'')]});
 }
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
  if(ribbon>0)add(['Ribbon',28+meal.index],Math.min(25,Math.floor(ribbon/5)*5+5),{name:label+' ribbon',page:'cooking',sources,unit:'rank',requirements:['Obtain and assign a ribbon of this rank to this meal. Ribbon availability is not guaranteed; the projection assumes the stated rank is obtained.']});
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
  if(!current||!['7drMulto','GFood'].includes(current.stat)||current.level<1)continue;
  add(['CauldronInfo',4,i],Math.min(13,current.level+1),{name:clean(current.name)+' vial',page:'vials',sources:current.stat==='7drMulto'?['DR Vial']:['Golden Food'],requirements:['Collect the next vial materials and liquids; all saved vial amplification is included.']});
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
  if(rank>0&&rank<5&&relevant(item))add(['Spelunk',17,i],rank+1,{name:clean(item.displayName)+' Gallery grade',page:'nametags',unit:'grade',sources:[...gearSources,'Golden Food'],requirements:['Raise this owned nametag by one Gallery grade. Obtain the required copies or upgrade from its original source; availability and costs need checking. All affected equipment pools are recalculated.']});
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
  let to=endless+1;while(to<=endless+40&&Number(cycle[(to-1)%40])-1!==26)to++;
  if(to<=endless+40)add([optionKey,319],to,{name:'Endless Summoning: next meal-bonus reward',page:'summoning',unit:'wins',sources:['Golden Food','Summoning'],requirements:[`Win the next ${to-endless} Endless Summoning battles, ending at win ${to}. The projection includes every intervening reward and winner-bonus amplification. Check your Summoning damage and HP; completion and time are not guaranteed.`]});
 }
 for(const [i,p] of (a.prayers||[]).entries()){
  if(!['Midas_Minded','Ruck_Sack'].includes(p.name)||p.level<1)continue;
  if(p.name==='Ruck_Sack'&&food.missing)continue;
  add([save.PrayersUnlocked!==undefined?'PrayersUnlocked':'PrayOwned',i],Math.min(Number(p.maxLevel),p.level+1),{name:clean(p.name)+(p.name==='Ruck_Sack'?' + refill '+food.name:''),page:'prayers',foodFill:p.name==='Ruck_Sack',sources:p.name==='Ruck_Sack'?['Golden Food']:['Prayers'],requirements:['Spend the required souls to buy the next prayer level. Uses your current active-prayer or no-prayer Superbits setup. Review the prayer curse before changing the loadout.']});
 }
 for(const s of a.legendTalents?.talents||[])if([1,25].includes(s.originalIndex))add(['Spelunk',18,s.originalIndex],Math.min(s.maxLevel,s.level+1),{name:clean(s.name),page:'legendTalents',sources:s.originalIndex===25?['Golden Food']:['Legend Talent'],requirements:['Earn and spend an additional Legend point without removing a point from another talent. Respect the saved talent cap.']});
 const grimoire=a.grimoire?.upgrades?.[44];if(grimoire?.unlocked&&grimoire.level>0)add(['Grimoire',44],Math.min(Number(grimoire.maxLevel)||grimoire.level+1,grimoire.level+1),{name:clean(grimoire.name||'Grimoire drop rate'),page:'grimoire',sources:['Grimoire'],requirements:['Farm the required bones and buy the next Grimoire upgrade.']});
 const statue=a.royalGuardian?.royalStatues?.[1];
 if(a.royalGuardian?.hasRoyalGuardian&&statue?.level>0)add(['RoyalG',0,1],statue.level+1,{name:'Royal DROP RATE statue',page:'royalArmory',sources:['Royal Statue'],requirements:[`Get one successful statue enhancement using ${statue.costItem||'the required enhancement item'}. Attempts can fail; this projects a successful level, not guaranteed progress per item.`]});
 for(const i of [168,173,131]){const s=a.research?.gridSquares?.[i];if(s?.canSelect||s?.level>0)add(['Research',0,i],Math.min(s.maxLv,s.level+1),{name:clean(s.name||('Research square '+i)),page:'research',sources:i===168?['Glimbo DR']:i===131?['Legend Talent']:['Research'],requirements:['Reach this Research square and earn the point needed for its next level. A cap increase may also need a follow-up talent purchase.']});}
 for(const [w,pets] of (a.breeding?.pets||[]).entries())for(const [i,p] of pets.entries()){
  if(!p.unlocked||p.shinyLevel<1||p.shinyLevel>=20||!/(Drop_Rate|Bonuses_from_All_Meals)/.test(p.rawPassive||''))continue;
  add(['Breeding',22+w,i],Math.floor((1+Math.pow(p.shinyLevel,1.6))*Math.pow(1.7,p.shinyLevel))+1,{name:clean(p.name||p.rawName||`World ${w+1} pet ${i+1}`)+' shiny',page:'shinyPets',sources:/Drop_Rate/.test(p.rawPassive)?['Shiny']:['Golden Food'],unit:'progress',displayFrom:'Shiny Lv '+p.shinyLevel,displayTo:'Shiny Lv '+(p.shinyLevel+1),requirements:['Place this shiny pet in the fence until it reaches the next level. Meal-bonus shinies also raise golden-food effect through the Peachring meal. Time is not estimated.']});
 }
 const kills=Number(get(save,[optionKey,139]));
 if(kills>0&&parsed.characters.some(c=>(c.flatTalents||[]).some(t=>t.name==='ARCHLORD_OF_THE_PIRATES'&&t.level>0)))add([optionKey,139],Math.ceil(kills*2),{name:'Archlord plundered kills',page:'characters',unit:'kills',sources:['Archlord of the Pirates'],requirements:['Earn these additional plundered kills on Siege Breaker. This is a long-term farming milestone, not ordinary monster kills or an instant purchase.']});
 return {candidates,notes,food};
}
root.DropTargetSources={get,set,foodState,build};
})(typeof window!=='undefined'?window:globalThis);
