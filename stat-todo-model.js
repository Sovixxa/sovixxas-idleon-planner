(function(root){
'use strict';
const pretty=v=>String(v??'').replaceAll('_',' '),n=v=>Number.isFinite(Number(v))?Number(v):null;
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
  add({id:'stamp:'+s.rawName,title:`${atCap?'Raise the level limit for':'Upgrade'} ${name}`,current:`Lv ${level} · unlocked limit ${cap??'unknown'}`,target:atCap?`Unlock the next limit, then buy Lv ${level+1}`:`Lv ${level+1}`,section:ready?'Ready to check':'Resource upgrades',priority:ready?10:30,page:'stamps',location:'World 1 → Stamp pig → '+(/^StampC/.test(s.rawName)?'Misc stamps':'Combat stamps'),reason:atCap?'This stamp has reached its saved material-unlock limit.':cap===null?'Check the current material-unlock limit before buying another level.':'A further level fits below the saved material-unlock limit.',steps:atCap?[`Bring ${fmt(s.materialCost)} ${material} to the stamp pig.`,s.bestCharacter?.character?`Use ${pretty(s.bestCharacter.character)} for the material hand-in; compare its carry capacity with the requirement.`:'Use a character with enough carry capacity for the material hand-in.',`Raise the limit, then buy the next level of ${name}.`]:[`Select ${name} at the stamp pig.`,`Buy one level, from ${level} to ${level+1}.`,'Re-import to update the next material breakpoint.'],gate:`Saved next coin cost: ${fmt(s.goldCost)} coins.${atCap?` Material requirement: ${fmt(s.materialCost)} ${material}; saved amount: ${fmt(s.ownedMats)}. ${s.hasMaterials===false?'Materials are short. ':''}${s.enoughPlayerStorage===false?'Carry capacity is short. ':''}`:''}${s.hasMoney===false?' Saved coins are short.':''} Recheck discounts and costs in game.`});
 }
 if(!has('UpgVault'))unknown.push('Upgrade Vault levels');
 else for(const index of cfg.vault){
  const u=a.upgradeVault?.upgrades?.[index];if(!u||n(u.level)===null||n(u.maxLevel)===null)continue;
  if(u.level>=u.maxLevel){covered.push(pretty(u.name));continue;}
  const unlocked=u.unlocked===true,name=pretty(u.name);
  add({id:'vault:'+index,title:`${unlocked?'Upgrade':'Unlock'} ${name}`,current:`Lv ${u.level} / ${u.maxLevel}`,target:unlocked?`Lv ${u.level+1}`:`${u.unlockLevel} total Vault levels`,section:unlocked?'Resource upgrades':'Unlocks',priority:unlocked?20:45,page:'upgradeVault',location:'Codex → Upgrade Vault',reason:unlocked?'This relevant upgrade is unlocked and below its saved cap.':`Saved total Vault levels: ${a.upgradeVault.totalUpgradeLevels}; this upgrade is still locked.`,steps:unlocked?[`Select ${name} in the Vault.`,`Check the next price (${fmt(u.cost)} coins in this export).`,`Buy one level if it fits your budget; stop before a more important upgrade is delayed.`]:[`Raise total Vault levels from ${a.upgradeVault.totalUpgradeLevels} toward ${u.unlockLevel}.`,`Return to ${name} when unlocked and check the first-level price.`],gate:'Coin affordability is not established. Level targets are one-step plans, not an efficiency ranking.'});
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
 tasks.sort((x,y)=>x.priority-y.priority||x.title.localeCompare(y.title));
 return {tasks,unknown,covered,characters:chars.map(ch=>({id:ch.playerId,name:ch.name}))};
}
root.StatTodoModel={build,bubbleMilestone};
})(typeof window!=='undefined'?window:globalThis);
