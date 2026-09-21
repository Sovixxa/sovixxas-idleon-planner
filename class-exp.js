(function(root){
  'use strict';
  const parse=value=>{if(typeof value==='string'){try{return JSON.parse(value);}catch{return null;}}return value;};
  const number=value=>value!=null&&value!==''&&Number.isFinite(Number(value))&&Number(value)>=0?Number(value):null;
  const at=(data,key,group,index)=>number(parse(parse(data?.[key])?.[group])?.[index]);
  const grind=level=>level>0?9.7+.3*level:0;
  const stamp=level=>4*level/(level+200);
  const luck=level=>level<1000?(Math.pow(level+1,.37)-1)/30:(level-1000)/(level+2500)*.8+.3963;
  const gain=(pool,delta)=>100*delta/(100+pool);
  function inspect(state){
    const data=state?.rawData||{},names=state?.rawRoot?.charNames||[];
    const roster=Object.keys(data).filter(k=>/^Lv0_\d+$/.test(k)).map(key=>{
      const id=Number(key.slice(4)),level=number(parse(data[key])?.[0]);
      return {id,name:names[id]||`Character ${id+1}`,level,next:[10,30,50,120].find(n=>level!=null&&level<n)??null};
    }).sort((a,b)=>a.id-b.id);
    const vault=parse(data.UpgVault),vaultLevel=number(vault?.[3]),mastery=number(vault?.[32]);
    const dungeon=at(data,'DungUpg',5,2);
    return {grind:at(data,'CauldronInfo',3,8),stamp:at(data,'StampLv',0,43),obstruction:at(data,'Research',7,9),roster,vaultLevel,vaultBonus:vaultLevel!=null&&mastery!=null?2*vaultLevel*(1+mastery/100):null,activeLearning:number(vault?.[39]),dungeon,dungeonBonus:dungeon==null?null:45*dungeon/(dungeon+100),hole:{explorer:at(data,'Holes',1,0),engineer:at(data,'Holes',1,1),gloomieBuilt:at(data,'Holes',13,47),sanctumBuilt:at(data,'Holes',13,83),colonies:at(data,'Holes',11,26),sanctums:at(data,'Holes',11,55),justiceExp:at(data,'Holes',15,16),justiceMulti:at(data,'Holes',15,19),cosmo:at(data,'Holes',4,0)}};
  }
  const fmt=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:2});
  function recommend(state){
    const a=inspect(state),h=a.hole,actions=[],covered=[],unknown=[];
    const add=(id,title,current,target,benefit,action,effort,reason,priority)=>actions.push({id,title,current,target,benefit,action,effort,reason,priority});
    if(a.obstruction==null)unknown.push('Jelly rewards');
    else if(a.obstruction<31)add('jelly','Get the first Jelly Class EXP multiplier',`Obstruction ${fmt(a.obstruction)}`,'Reach obstruction 31','×1.20 total Class EXP',`Continue Jelly Operator from obstruction ${fmt(a.obstruction)} to 31. Use its upgrade optimizer for your next clear.`,'Progression project',`${31-a.obstruction} more obstruction advances. This is an independent multiplier, so its 20% gain is not diluted by your existing additive EXP. Clear feasibility is not estimated here.`,10);
    else if(a.obstruction<63)add('jelly','Get the second Jelly Class EXP multiplier',`Obstruction ${fmt(a.obstruction)}`,'Reach obstruction 63','×1.25 on top of current EXP','Continue Jelly Operator to obstruction 63.','Progression project',`${63-a.obstruction} more advances; a separate 25% gain once unlocked.`,12);
    else covered.push('Both Jelly Class EXP multipliers are active.');
    if(h.explorer==null)unknown.push('The Hole');
    else if(h.explorer>=10){
      if(h.justiceMulti==null)unknown.push('Justice multiplier reward');
      if(h.justiceExp!=null){
        const factor=h.cosmo!=null&&h.justiceMulti!=null?Math.max(1,1+Math.ceil(h.justiceMulti/(250+h.justiceMulti)*2500)/1000+h.cosmo*.25):null;
        const chunk=100;
        add('justice-exp',h.justiceMulti===0?'Build Justice EXP and unlock its missing multiplier':'Build your Justice Class EXP reward',`EXP reward Lv ${fmt(h.justiceExp)}${h.justiceMulti===0?' · multiplier reward Lv 0':''}`,`EXP reward Lv ${fmt(h.justiceExp+chunk)}${h.justiceMulti===0?' + first multiplier reward':''}`,factor==null?'+100 base reward levels':`+${fmt(chunk*factor)} additive points before Fountain bonuses`,`The Hole → Justice Monument. Take Class EXP rewards when offered (round 33+). ${h.justiceMulti===0?'Push toward round 77 to add the Justice multiplier reward to the reward pool.':''}`,'Repeated monument runs',`This +100-level target is a planning chunk, not a cap. ${factor!=null?`At your saved monument/Cosmo levels it is worth ${fmt(chunk*factor/.3)} unmodified Grind Time levels before Fountain scaling.`:'Monument amplifiers are missing, so the effective gain is unknown.'} Justice’s multiplier strengthens its rewards, not total account EXP independently. Reward offers are random; run count and cost are not estimated.`,h.justiceMulti===0?20:h.justiceExp===0?18:30);
      }else unknown.push('Justice Class EXP reward');
    }
    for(const [id,built,count,points,title,place] of [['gloomie',h.gloomieBuilt,h.colonies,25,'Gloomie Expie','Gloomie Grotto'],['sanctum',h.sanctumBuilt,h.sanctums,40,'Sanctum of EXP','Temple']]){
      if(built===0&&count>0)add(id,`Build ${title}`,`${fmt(count)} clears; upgrade not built`,'Buy the Engineer schematic',`Activates +${fmt(count*points)} additive EXP points`,`The Hole → Engineer → ${title}. Check its resource cost and unlock requirement.`,'Schematic purchase','You already have clears for this bonus, but its saved activation flag is off. Purchase availability and affordability are not yet checked.',5);
      else if(built>0&&count!=null)add(id,`Push one more ${id==='gloomie'?'Gloomie colony':'Ancient Golem sanctum'}`,`${fmt(count)} cleared`,`${fmt(count+1)} cleared`,`+${points} additive EXP points`,`The Hole → ${place}. ${id==='sanctum'?'Use torch points to summon and defeat the next Centurion.':'Finish the colony requirement and defeat the next Monarch.'} ${title} is already built.`,'One clear · difficulty unknown',`Equivalent to ${fmt(points/.3)} unmodified Grind Time levels. Do this before a liquid grind if the next clear is reachable; the save does not establish combat feasibility.`,id==='sanctum'?40:45);
    }
    if(a.vaultLevel==null)unknown.push('Wicked Smart');
    else if(a.vaultLevel<500){const target=Math.min(500,a.vaultLevel+10);add('vault','Buy the next Wicked Smart levels',`Lv ${fmt(a.vaultLevel)}`,`Lv ${fmt(target)}`,`+${fmt((target-a.vaultLevel)*2)} base additive points`,'Codex → Upgrade Vault → Wicked Smart. Buy this batch if the coin price is comfortable.','Coins · price unchecked','A shared EXP upgrade; Vault Mastery amplifies its base gain. Ten levels is a planning batch, not a breakpoint.',a.vaultLevel===0?15:50);}
    else covered.push(`Wicked Smart is already Lv ${fmt(a.vaultLevel)}; no normal paid levels remain.`);
    if(a.activeLearning>=100)covered.push(`Active Learning is already Lv ${fmt(a.activeLearning)}; no normal paid levels remain.`);
    else if(a.activeLearning!=null)add('active','Upgrade Active Learning for active leveling',`Lv ${fmt(a.activeLearning)}`,`Lv ${fmt(Math.min(100,a.activeLearning+10))}`,'Active kills only','Codex → Upgrade Vault → Active Learning. Skip this if your leveling is offline.','Conditional · coins','This is a mode-specific opportunity, not a shared offline EXP improvement. Unlock and affordability need an in-game check.',65);
    if(a.grind==null)unknown.push('Grind Time');
    else if(a.grind===0)add('grind','Unlock Grind Time','Lv 0','Lv 1','+10 base additive points','Alchemy → Yellow cauldron → Grind Time. Unlock it, then verify activation on leveling characters.','Bubble unlock','Zero saved level means this source has not been leveled. Unlock chance and character activation are not simulated.',25);
    else {add('grind','Use spare liquids for Grind Time',`Lv ${fmt(a.grind)}`,`Lv ${fmt(a.grind+100)}`,'+30 base additive points','Alchemy → Yellow cauldron → Grind Time. Buy another 100 levels only after comparing the Hole opportunities above.','Repeatable · liquids',`You already have +${fmt(grind(a.grind))} base points here. Another 100 levels adds 30 points, not 30% total EXP. There is no hard cap; this target is a batch. Bubble modifiers and activation are not simulated.`,70);}
    if(a.dungeon!=null){const target=a.dungeon+10,delta=45*target/(target+100)-a.dungeonBonus;add('dungeon','Spend spare Flurbos on Class EXP',`Lv ${fmt(a.dungeon)}`,`Lv ${fmt(target)}`,`+${fmt(delta)} additive EXP points`,'Dungeons → Flurbo shop → non-dungeon Class EXP. Use spare currency rather than starting a long dungeon farm.','Spare currency',`The next 10 levels give ${fmt(delta)} points. This curve has diminishing returns; that is only ${fmt(delta/.3)} unmodified Grind Time levels.`,85);}else unknown.push('Dungeon Class EXP');
    if(a.stamp==null)unknown.push('Gud EXP Stamp');
    else if(a.stamp===0)add('stamp','Collect Gud EXP Stamp while progressing W7','Stamp Lv 0','Complete Snootie’s third quest','Unlocks the Class EXP stamp','Follow Snootie’s quest chain to finding Mister Jazzie. Hand in the stamp, then buy affordable levels.','Side objective · W7 quest','This missing stamp is real, but its unamplified curve approaches only +4 additive points. Do not prioritize a long quest grind over a missing independent multiplier. Lab, exaltation and other stamp amplifiers are not modeled.',90);
    else {const target=a.stamp+10;add('stamp','Take cheap Gud EXP Stamp levels',`Lv ${fmt(a.stamp)}`,`Lv ${fmt(target)}`,`+${fmt(stamp(target)-stamp(a.stamp))} base additive points`,'Stamps → Combat → Gud EXP Stamp. Buy this batch only if coins and materials are spare.','Low priority · costs unchecked','Effective gains depend on stamp amplifiers. The base curve approaches +4 points; milestone levels are not hard caps.',90);}
    for(const item of actions){
      item.access='F2P · no purchase required';
      const gates={jelly:['Heavy time gate','Progress this in the background. Do not delay other EXP upgrades while waiting for Jelly progress. No completion-date estimate.'], 'justice-exp':['Repeat runs + random rewards','Take EXP rewards during normal Monument progress. The +100-level batch is not a one-session target; reward offers and round progression limit the pace.'], sanctum:['Torch resources + clear difficulty','Check whether the next summon and clear are reachable with current resources. Otherwise leave this running as a longer goal.'], gloomie:['Colony requirements + clear difficulty','Only push now if the next colony requirement and Monarch are within reach.'], grind:['Liquid supply','Use liquids already available; if short, wait for refill instead of making this a spending target.'], vault:['Coin cost + unlock','Buy only if already unlocked and affordable. Saved levels do not prove you can afford the batch.'], dungeon:['Flurbo supply','Spend spare Flurbos; do not start a long currency grind for this small gain.'], stamp:['Quest / material requirements','Collect during normal progression, or use spare coins and materials for levels.'], active:['Active play + coin cost','Only prioritize if actively leveling and the upgrade is affordable.']};
      [item.gate,item.gateAdvice]=gates[item.id]||['Requirements unknown','Check availability in game.'];
      const tier=item.id==='jelly'||item.id==='justice-exp'?'long':item.id==='active'?'conditional':item.priority===5?'S':item.id==='vault'||item.id==='grind'?'A':item.id==='stamp'||item.id==='dungeon'?'C':'B';
      item.tier=tier;
      if(item.priority===5){item.gate='Schematic cost + unlock';item.gateAdvice='Existing clears are ready to benefit. Check the schematic is unlocked and affordable before buying.';}
      item.tierReason=tier==='S'?'Check this first: activate bonuses from progress you already completed. Purchase availability and cost still need checking.':tier==='A'?'First spending check: use resources already on hand. If the price or resource supply blocks you, move to the next option.':tier==='B'?'Check the next clear while resources accumulate. Its benefit is useful, but combat feasibility and summon costs are not established.':tier==='C'?'Small base gain or diminishing returns. Use spare resources; avoid a dedicated grind.':tier==='long'?'High-value long-term goal, not your next immediate upgrade. Work on it alongside the tiers above.':'Only helps active leveling. Skip for offline leveling.';
    }
    const tierOrder={S:0,A:1,B:2,C:3,long:4,conditional:5};
    actions.sort((x,y)=>tierOrder[x.tier]-tierOrder[y.tier]||x.priority-y.priority);
    return {account:a,actions,covered,unknown};
  }
  const api={grind,stamp,luck,gain,inspect,recommend};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.ClassExp=api;
})(typeof window==='object'?window:globalThis);
