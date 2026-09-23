(function(root){
'use strict';
const pretty=v=>String(v??'').replaceAll('_',' '),n=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const groups=[
 {id:'easy',name:'Easy wins',description:'Affordable next purchases and quick checks using what you already own.',open:true},
 {id:'time',name:'Time-gated / start now',description:'Start limited attempts and recurring growth early, then work on other upgrades.',open:true},
 {id:'resources',name:'Farm or save up',description:'Useful upgrades that need materials, coins, or a cost check.',open:false},
 {id:'unlock',name:'Unlock first',description:'Progression requirements or special upgrade items come before the bonus.',open:false},
 {id:'low',name:'Low return / maintenance',description:'Near-ceiling effects and completed practical targets; favor automatic growth.',open:false}
];
function taskSource(task,a,cards){
 const [type,key]=task.id.split(':');
 return type==='stamp'?Object.values(a.stamps||{}).flat().find(s=>s.rawName===key)
  :type==='vault'?a.upgradeVault?.upgrades?.[Number(key)]
  :type==='arcade'?a.arcade?.shop?.[Number(key)]
  :type==='bubble'?Object.values(a.alchemy?.bubbles||{}).flat().find(b=>b.rawName===key)
  :type==='vial'?a.alchemy?.vials?.find(v=>v.name===key)
  :type==='card'?cards.get(task.id)?.card:null;
}
function rankTask(task,a,cards,data){
 const type=task.id.split(':')[0],s=taskSource(task,a,cards),level=n(s?.level);
 let group='resources',order=50,why='Check the next cost before committing resources.',cap=null;
 const cost=n(type==='stamp'?s?.goldCost:s?.cost),money=n(a.currencies?.rawMoney);
 const coinReady=cost!==null&&cost>=0&&money!==null&&money>=cost;
 const budgetShare=coinReady&&money>0?cost/money:null;
 if(type==='stamp'){
  const capKnown=(data.StampLvM!=null||data.StampLevelMAX!=null)&&n(s?.maxLevel)!==null,atLimit=capKnown&&level>=Number(s.maxLevel);
  if(level===0){group='unlock';why='Obtain and hand in the stamp before buying levels.';}
  else if(capKnown&&s.hasMoney===true&&(!atLimit||(s.hasMaterials===true&&s.enoughPlayerStorage===true))){
   group='easy';order=20;why=atLimit?'Saved coins, materials and carry capacity cover the next limit check.':'Saved coins cover the next level within the unlocked limit.';
  }else {order=20;why=s?.enoughPlayerStorage===false&&atLimit?'Fix carry capacity before farming more stamp materials.':s?.hasMaterials===false&&atLimit?'Farm the missing stamp material, then raise the limit.':'Confirm coins and the material-unlock limit before buying.';}
 }else if(type==='vault'){
  if(!s?.unlocked){group='unlock';order=20;why='Reach the required total Vault levels first; access alone gives no stat gain.';}
  else if(coinReady){group='easy';order=20;why='Saved coins cover this one-level purchase.';}
  else {order=25;why=cost===null||money===null?'Coin balance or price is missing; check affordability.':'Save coins for the next Vault level.';}
 }else if(type==='food'){
  group='easy';order=40;why='Quick loadout check using banked food. Compare the replaced food and Beanstalk before moving it.';
 }else if(type==='arcade'){
  group='time';order=level===100?5:30;
  why=level===100?'One level reaches the Lv 101 doubling; prioritize this when you can pay the Gold Ball cost.':'Gold Balls accumulate through Arcade play; check the next price and use spare balls.';
 }else if(type==='bubble'){
  group='time';order=s?.bubbleName==='GRIND_TIME'?20:35;
  why=level===0?'Use available brewing attempts to unlock this bubble; success is not guaranteed.':'Keep automatic levels running and spend surplus liquids/materials in batches; the entire milestone is not assumed affordable.';
 }else if(type==='vial'){
  group=level===0?'time':'resources';order=level===0?10:35;
  why=level===0?'Use available daily discovery attempts, then continue other upgrades while attempts replenish.':'Collect the next vial requirement; this is a material purchase, not inherently a daily wait.';
 }else if(type==='card'){
  group=Number(s?.stars)>=4?'unlock':'resources';order=40;
  why=group==='unlock'?'Check the special item needed for this star tier before farming more ordinary copies.':'Farm copies alongside your other goals; ordinary card farming is not a fixed daily gate.';
 }
 // Saturation targets are practical advice, not hidden hard caps. The current
 // task families have no universal DR/EXP/damage ceiling in Shadow Caps.
 if(s?.func==='decay'&&level>0&&Number(s.x1)>0&&Number(s.x2)>0){
  const share=level/(level+Number(s.x2));
  cap={kind:'diminishing',text:`${fmt(share*100)}% of the base-effect ceiling. The 95%/99% thresholds are planning cutoffs, not hard caps.`};
  if(share>=.95){group='low';order=share>=.99?90:65;why='Very little of this base-effect ceiling remains. Favor unfinished targets and automatic levels.';}
  else if(share>=.90){order+=20;why+=' Already above 90% of its base-effect ceiling, so diminishing returns lower its priority.';}
 }else if(s?.func==='addDECAY'&&level>=50000){
  group='low';order=80;cap={kind:'breakpoint',text:'Lv 50,000 is the end of linear growth; later levels still help, with diminishing returns.'};why='The useful linear-growth milestone is complete; prefer automatic levels over manual spending.';
 }
 if(task.section==='Maintenance'){group='low';order=90;why='The practical target is met. Keep background growth running.';}
 if(task.bonus?.available&&task.bonus.delta<=0){group='low';order=100;why='This target adds no positive modeled source bonus.';}
 if(group==='easy'&&coinReady&&type!=='food'){
  if(budgetShare!==null&&budgetShare<=.01){order-=10;why+=' The next coin cost is at most 1% of saved coins.';}
  else if(budgetShare!==null&&budgetShare>.1){order+=10;why+=' This uses over 10% of saved coins; compare competing purchases first.';}
 }
 return {group,order,why,cap,budgetShare};
}
const fmt=v=>Number.isFinite(Number(v))?Number(v).toLocaleString('en-US',{maximumFractionDigits:2}):'unknown';
const config={
 drop:{stamps:/Drop_Rate|Gold.*Food/i,vault:[18,86],bubbles:['DROPPIN_LOADS','SHIMMERON'],vials:['7drMulto'],arcade:[27],sigils:['TROVE','EMOJI_VEGGIE'],food:['DropRatez'],cards:/Total_Drop_Rate|Drop_Rate_Multi|Gold_Food_Effect/},
 classExp:{stamps:/classxp|Class.*EXP|Gold.*Food/i,vault:[3,12,35,86],bubbles:['GRIND_TIME','SHIMMERON'],vials:['MonsterEXP','7classexp'],arcade:[12,60],sigils:['METAL_EXTERIOR','EMOJI_VEGGIE'],food:['ClassEXPz'],cards:/Class_EXP|EXP_from_monsters|Gold_Food_Effect/},
 damage:{stamps:/Base_Damage|Total_Damage|Gold.*Food/i,vault:[0,10,15,20,27,41,80,86],bubbles:['BIG_MEATY_CLAWS','QUICK_SLAP','NAME_I_GUESS','SHIMMERON'],vials:['7dmg'],arcade:[0,46],sigils:['PLUNGING_SWORD','EMOJI_VEGGIE'],food:['BaseDamage','Damage'],cards:/Base_Damage|Total_Damage|Damage_Multi|Weapon_Power|Gold_Food_Effect/}
};
// Same unrounded growth curves as the account parser. Targets are planning milestones,
// not game unlocks or predictions of the final character stat.
function bubbleMilestone(b){
 const level=Number(b.level),x1=Number(b.x1),x2=Number(b.x2);
 const value=l=>b.func==='decay'?x1*l/(l+x2):b.func==='bigBase'?x1+x2*l:b.func==='addDECAY'?l<=50000?x1*l:x1*50000+(l-50000)/(l+100000)*x1*50000:NaN;
 let target,label;
 if(b.func==='decay'&&x2>0){
  const share=level/(level+x2),fraction=[.90,.95,.99].find(p=>share<p-1e-12);
  if(!fraction)return {maintenance:true,reason:`Already at ${fmt(share*100)}% of this bubble's base-effect ceiling (${fmt(value(level))} / ${fmt(x1)}). The 99% practical target is met; favor automatic levels over manual spending.`};
  target=Math.ceil(x2*fraction/(1-fraction)-1e-8);label=`${fraction*100}% of the base-effect ceiling`;
 }else if(b.func==='addDECAY'){
  target=[100,250,500,1000,2500,5000,10000,15000,20000,30000,40000,50000].find(v=>v>level);
  if(!target)return {maintenance:true,reason:'The Lv 50,000 linear-growth breakpoint is met. Further levels use diminishing returns; review other upgrades before spending manually.'};
  label=target===50000?'linear-growth breakpoint':'staged goal toward the Lv 50,000 linear-growth breakpoint';
 }else if(b.func==='bigBase'&&x2>0){
  const needed=(value(level)*1.05-x1)/x2;
  const step=needed<100?10:needed<1000?100:1000;
  target=Math.ceil(needed/step)*step;label='rounded planning goal for at least 5% more base bubble effect (no hard cap)';
 }else return null;
 return {target,reason:`${label}. Base bubble effect: ${fmt(value(level))} → ${fmt(value(target))} (+${fmt(value(target)-value(level))}); this is before character/account multipliers, not a total-stat gain.`};
}
function build(parsed,kind,data){
 const cfg=config[kind],a=parsed.account,chars=parsed.characters,tasks=[],unknown=[],covered=[];
 const has=(...keys)=>keys.some(k=>data[k]!==undefined&&data[k]!==null);
 const add=task=>tasks.push({...task,characters:task.characters||[],scope:task.characters?.length?'Character setup':'Account upgrade'});
 if(!has('StampLv','StampLevel'))unknown.push('Stamp levels');
 else for(const s of Object.values(a.stamps||{}).flat().filter(s=>cfg.stamps.test(s.effect||'')&&!/Card_Drop_Rate/.test(s.effect||''))){
  const level=n(s.level),cap=has('StampLvM','StampLevelMAX')?n(s.maxLevel):null;if(level===null)continue;
  const name=pretty(s.displayName),material=pretty(s.itemReq?.name||s.itemReq?.rawName||'the requested material');
  if(level===0){add({id:'stamp:'+s.rawName,title:`Collect ${name}`,current:'Stamp level 0',target:'Hand in the stamp and buy its first level',section:'Unlocks',priority:40,page:'stamps',location:'World 1 → Stamp pig → '+(/^StampC/.test(s.rawName)?'Misc stamps':'Combat stamps'),reason:'This relevant stamp has no saved levels.',steps:[`Open the Stamps page and check the acquisition requirement for ${name}.`,'Obtain the stamp from its listed source and hand it in to the stamp pig.','Buy the first level when its cost is affordable.'],gate:'Drop/quest access and costs need checking.'});continue;}
  const atCap=cap!==null&&level>=cap;
  const ready=atCap?s.hasMaterials===true&&s.hasMoney===true&&s.enoughPlayerStorage===true:s.hasMoney===true;
  add({id:'stamp:'+s.rawName,title:`${atCap?'Raise the level limit for':'Upgrade'} ${name}`,current:`Lv ${level} · unlocked limit ${cap??'unknown'}`,target:atCap?`Unlock the next limit, then buy Lv ${level+1}`:`Lv ${level+1}`,section:ready?'Ready to check':'Resource upgrades',priority:ready?10:30,page:'stamps',location:'World 1 → Stamp pig → '+(/^StampC/.test(s.rawName)?'Misc stamps':'Combat stamps'),reason:atCap?'This stamp has reached its saved material-unlock limit.':cap===null?'Check the current material-unlock limit before buying another level.':'A further level fits below the saved material-unlock limit.',steps:atCap?[`Bring ${fmt(s.materialCost)} ${material} to the stamp pig.`,s.bestCharacter?.character?`Use ${pretty(s.bestCharacter.character)} for the material hand-in; compare its carry capacity with the requirement.`:'Use a character with enough carry capacity for the material hand-in.',`Raise the limit, then buy the next level of ${name}.`]:[`Select ${name} at the stamp pig.`,`Buy one level, from ${level} to ${level+1}.`,'Re-import to update the next material breakpoint.'],gate:`Saved next coin cost: [[nextCoinCost]].${atCap?` Material requirement: ${fmt(s.materialCost)} ${material}; saved amount: ${fmt(s.ownedMats)}. ${s.hasMaterials===false?'Materials are short. ':''}${s.enoughPlayerStorage===false?'Carry capacity is short. ':''}`:''}${s.hasMoney===false?' Saved coins are short.':''} Recheck discounts and costs in game.`});
 }
 if(!has('UpgVault'))unknown.push('Upgrade Vault levels');
 else for(const index of cfg.vault){
  const u=a.upgradeVault?.upgrades?.[index];if(!u||n(u.level)===null||n(u.maxLevel)===null)continue;
  if(u.level>=u.maxLevel){covered.push(pretty(u.name));continue;}
  const unlocked=u.unlocked===true,name=pretty(u.name);
  add({id:'vault:'+index,title:`${unlocked?'Upgrade':'Unlock'} ${name}`,current:`Lv ${u.level} / ${u.maxLevel}`,target:unlocked?`Lv ${u.level+1}`:`${u.unlockLevel} total Vault levels`,section:unlocked?'Resource upgrades':'Unlocks',priority:unlocked?20:45,page:'upgradeVault',location:'Codex → Upgrade Vault',reason:unlocked?'This relevant upgrade is unlocked and below its saved cap.':`Saved total Vault levels: ${a.upgradeVault.totalUpgradeLevels}; this upgrade is still locked.`,steps:unlocked?[`Select ${name} in the Vault.`,`Check the next price ([[nextCoinCost]] in this export).`,`Buy one level if it fits your budget; stop before a more important upgrade is delayed.`]:[`Raise total Vault levels from ${a.upgradeVault.totalUpgradeLevels} toward ${u.unlockLevel}.`,`Return to ${name} when unlocked and check the first-level price.`],gate:'Coin affordability is not established. Level targets are one-step plans, not an efficiency ranking.'});
 }
 if(!has('ArcadeUpg'))unknown.push('Arcade upgrades');
 else for(const index of cfg.arcade){const u=a.arcade?.shop?.[index];if(!u||n(u.level)===null)continue;if(u.level>=101){covered.push(`Arcade ${pretty(u.effect)} Lv 101`);continue;}
  add({id:'arcade:'+index,title:`Raise Arcade ${pretty(u.effect).replace(/[+{%}]/g,'').trim()}`,current:`Lv ${u.level}`,target:`Lv ${u.level+1} (long-term milestone: 101)`,section:'Resource upgrades',priority:25,page:'arcade',location:'World 2 → Arcade → Gold Ball Shop',reason:'The relevant shop entry is below the level-101 milestone.',steps:['Open the matching Arcade upgrade entry.',u.active?'Check its current purchase price.':'Check when this entry is available in the shop rotation.','Use spare Gold Balls for the next level; avoid treating all additive points as equal to total-stat percent gains.'],gate:'Shop rotation and Gold Ball affordability must be checked.'});}
 if(!has('CauldronInfo'))unknown.push('Alchemy bubble levels');
 else for(const b of Object.values(a.alchemy?.bubbles||{}).flat().filter(b=>cfg.bubbles.includes(b.bubbleName))){
  const level=n(b.level);if(level===null)continue;const name=pretty(b.bubbleName),grind=b.bubbleName==='GRIND_TIME';
  const milestone=bubbleMilestone(b);if(!milestone)continue;
  const maintenance=level>0&&milestone.maintenance;
  add({id:'bubble:'+b.rawName,title:`${!level?'Unlock':maintenance?'Maintain':'Build toward a milestone for'} ${name}`,current:`Lv ${fmt(level)}`,target:maintenance?'Practical target met — automatic growth':`Lv ${fmt(milestone.target||1)}`,section:!level?'Unlocks':maintenance?'Maintenance':'Background growth',priority:maintenance?90:level?60:35,page:'alchemy',location:`World 2 → Alchemy → ${pretty(b.cauldron)} cauldron`,reason:milestone.reason,steps:!level?[`Brew toward ${name} in the ${pretty(b.cauldron)} cauldron.`,`After unlocking, work toward the displayed milestone in affordable batches.`]:maintenance?['Keep available automatic bubble levels running.','Prioritize unfinished targets before manually spending on this bubble.']: [`Select ${name} and compare the next material/liquid costs with your available resources.`,`Work toward Lv ${fmt(milestone.target)} in affordable batches (${fmt(milestone.target-level)} levels from this export).`,grind?'Use available automatic levels and spare liquid; stop before compromising other liquid upgrades.':'Use available automatic levels and surplus materials; this milestone is not a claim that the whole batch is affordable.','Re-import to refresh progress toward the target.'],gate:'Milestones follow the base formula; costs, class scaling and total-stat gains are not simulated. Staged goals are planning targets, not additional game unlocks.'});
 }
 if(has('CauldronInfo'))for(const v of a.alchemy?.vials||[]){
  if(!cfg.vials.includes(v.stat)||n(v.level)===null)continue;
  if(v.level>=13){covered.push(pretty(v.name));continue;}
  add({id:'vial:'+v.name,title:`${v.level?'Upgrade':'Discover'} ${pretty(v.name)}`,current:`Lv ${v.level} / 13`,target:`Lv ${v.level+1}`,section:v.level?'Resource upgrades':'Unlocks',priority:35,page:'vials',location:'World 2 → Alchemy → Vials',reason:'This relevant vial is below its level-13 cap.',steps:v.level?[`Select ${pretty(v.name)} and check its next material requirement.`,'Collect the listed material, then purchase the next level.']:[`Check the discovery item for ${pretty(v.name)} on the Vials page.`,'Drop that item near the cauldron and use available discovery attempts.','Once discovered, check the first upgrade cost.'],gate:'Discovery rolls and material affordability are not guaranteed.'});
 }
 // Owned golden food provides a concrete setup check, not a claim that replacing a food is a net gain.
 if(!has('ChestOrder','ChestOrder0'))unknown.push('Storage food inventory');
 else for(const food of a.storage?.list||[]){
  if(!cfg.food.includes(food.Effect)||!(food.amount>0))continue;
  const affected=chars.filter(ch=>has('EquipOrder_'+ch.playerId)&&has('EquipQTY_'+ch.playerId)&&!(ch.food||[]).some(f=>f.Effect===food.Effect&&f.amount>0));if(!affected.length)continue;
  add({id:'food:'+food.rawName,title:`Review banked ${pretty(food.displayName||food.name)}`,current:`${fmt(food.amount)} in storage; ${affected.length} characters without this food effect equipped`,target:'Compare one food-slot change',section:'Setup checks',priority:15,page:'goldFood',characters:affected.map(ch=>ch.playerId),location:'Storage chest → character food slots',reason:'Your bank contains a relevant golden food that these characters are not currently using in a food slot. Beanstalk may already supply an account contribution.',steps:[`Inspect the current food loadout for ${affected.map(ch=>ch.name).join(', ')}.`,`If a suitable slot is free, move an appropriate portion of ${pretty(food.displayName||food.name)} from storage and equip it.`,'If all slots are occupied, compare the lost food bonus first. A replacement is not guaranteed to improve the whole setup.','Re-import after the change; this plan never moves items automatically.'],gate:'Storage is shared between characters. Split the stack appropriately; food-slot access and replacement tradeoffs need checking.'});
 }
 if(!has('Cards0'))unknown.push('Card collection');
 const decode=v=>{try{return typeof v==='string'?JSON.parse(v):v;}catch{return null;}};
 const options=a.accountOptions||decode(data.OptionsListAccount)||[];
 const cardified=new Set(String(options[603]||'').split(','));
 const rift=decode(data.Rift)||[];
 const cardCap=4+(Number(rift[0])>=45?1:0)+(a.spelunking?.loreBosses?.[2]?.defeated?1:0);
 const cardTasks=new Map();
 for(const ch of chars){if(!has('CardEquip_'+ch.playerId)||!has('Cards0'))continue;
  for(const card of Object.values(ch.cards?.equippedCards||{})){
   if(!card||!cfg.cards.test(card.effect||'')||!(card.amount>0)||n(card.stars)===null||cardified.has(card.rawName)||card.stars>=cardCap)continue;
   const id='card:'+card.rawName;if(!cardTasks.has(id))cardTasks.set(id,{card,characters:[]});cardTasks.get(id).characters.push(ch.playerId);
  }
 }
 for(const [id,{card,characters}] of cardTasks)add({id,title:`Improve ${pretty(card.displayName||card.rawName)} card`,current:`${card.stars}-star card · ${fmt(card.amount)} copies`,target:`${card.stars+1} stars`,section:'Background growth',priority:65,page:'cards',characters,location:'Cards → selected card → collection source',reason:'This relevant card is equipped on the listed characters and has not reached the currently unlocked star limit.',steps:['Open the card page and inspect its next-tier requirement and collection source.','Collect additional copies during normal farming; check whether the next tier needs an upgrade item instead of ordinary copies.','Keep the card in the relevant setup, or verify its passive status.'],gate:'Drop time and higher-tier upgrade-item availability are not estimated.'});
 for(const task of tasks){const source=taskSource(task,a,cardTasks);if(task.id.startsWith('stamp:')||task.id.startsWith('vault:'))task.money={nextCoinCost:source?.goldCost??source?.cost??null};task.bonus=upgradeBonus(task,a,cardTasks);task.recommendation=rankTask(task,a,cardTasks,data);}
 tasks.sort((x,y)=>groups.findIndex(g=>g.id===x.recommendation.group)-groups.findIndex(g=>g.id===y.recommendation.group)
  ||x.recommendation.order-y.recommendation.order
  ||(x.recommendation.budgetShare??Infinity)-(y.recommendation.budgetShare??Infinity)
  ||x.title.localeCompare(y.title));
 const capNames=kind==='drop'?['Drop rarity contribution']:kind==='classExp'?['AFK EXP doubling']:['Normal damage mastery','Tempest damage mastery'];
 const capNotes=(root.ShadowCapsData?.caps||[]).filter(c=>capNames.includes(c.name)).map(c=>({name:c.name,limit:c.limit,note:c.note}));
 return {tasks,groups,capNotes,unknown,covered,characters:chars.map(ch=>({id:ch.playerId,name:ch.name}))};
}
// Preview the source effect using the same arithmetic as the parser. These are
// deliberately not presented as final character-stat percentages.
function upgradeBonus(task,a,cardTasks){
 const M=root.PrayerMath,[type,key]=task.id.split(':');
 const unavailable=reason=>({available:false,text:reason});
 if(type==='food')return unavailable('Choose a stack size and food slot first; the net bonus depends on the food replaced and Beanstalk.');
 if(task.section==='Maintenance')return unavailable('No purchase target: practical milestone already met.');
 if(type==='vault'&&task.section==='Unlocks')return unavailable('Unlocking access alone gives no bonus; buy a level afterwards.');
 if(!M?.growth)return unavailable('Bonus calculator unavailable. Reload the page.');
 let source,from,to,effect,label='Base upgrade effect';
 const curve=(s,l)=>M.growth(s.func,l,Number(s.x1),Number(s.x2),false);
 if(type==='vault'){
  source=a.upgradeVault.upgrades[Number(key)];
  const next=a.upgradeVault.upgrades.map((u,i)=>i===Number(key)?{...u,level:Number(u.level)+1}:u);
  from=M.calcUpgradeVaultBonus(a.upgradeVault.upgrades,Number(key));to=M.calcUpgradeVaultBonus(next,Number(key));
  effect=source.description;label='Vault effect coefficient';
 }else if(type==='card'){
  source=cardTasks.get(task.id)?.card;
  // Character chip/legend boosts may differ; show the shared card's base effect.
  from=Number(source?.bonus)*(Number(source?.stars)+1);to=Number(source?.bonus)*(Number(source?.stars)+2);
  effect=source?.effect;label='Base card effect';
 }else{
  source=type==='stamp'?Object.values(a.stamps||{}).flat().find(s=>s.rawName===key)
   :type==='arcade'?a.arcade?.shop?.[Number(key)]
   :type==='bubble'?Object.values(a.alchemy?.bubbles||{}).flat().find(b=>b.rawName===key)
   :type==='vial'?a.alchemy?.vials?.find(v=>v.name===key):null;
  if(!source)return unavailable('Source formula unavailable.');
  const level=Number(source.level),target=type==='bubble'?bubbleMilestone(source)?.target:level+1;
  if(!Number.isFinite(target)||source.x1==null||source.x2==null)return unavailable('Source formula unavailable.');
  from=curve(source,level);to=curve(source,target);effect=source.effect||source.desc;
  if(type==='arcade'){
   // Includes the special doubling at level 101. Companion scaling is omitted
   // consistently on both sides, including upgrades currently at level zero.
   from*=level>100?2:1;to*=target>100?2:1;
  }
 }
 if(!Number.isFinite(from)||!Number.isFinite(to))return unavailable('Source formula unavailable.');
 const percent=/%/.test(effect||'');
 const number=v=>Number(v.toPrecision(6)).toLocaleString('en-US',{maximumSignificantDigits:6});
 const delta=to-from,unit=percent?'%':'';
 return {available:true,from,to,delta,text:`${label}: ${number(from)}${unit} → ${number(to)}${unit} (${delta>=0?'+':''}${number(delta)}${percent?' percentage points':' effect units'})`,
  note:`${pretty(effect||source.stat||'Upgrade bonus')}. ${type==='vault'?'Uses current Vault scaling; per-kill/card conditions still apply.':'Before character/account scaling; Arcade includes the Lv 101 doubling.'} This is the source bonus, not the percentage gain to final Class EXP, DR or damage.`};
}
root.StatTodoModel={build,bubbleMilestone};
})(typeof window!=='undefined'?window:globalThis);
