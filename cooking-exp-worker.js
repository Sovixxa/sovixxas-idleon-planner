'use strict';
self.window=self;
importScripts('prayer-math-engine.js','cooking-exp-limits.js');
const fmt=n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:2});
function accountProgress(p){
 const a=p.account,cs=p.characters,out={};
 const put=(name,current,cap=null,maximum='',next='')=>out[name]={current,cap,maximum,next};
 const list=(items,field='level')=>items.map(x=>`${String(x.name||x.displayName||'').replaceAll('_',' ')} Lv ${fmt(x[field]||0)}`).join(' · ');
 const next=(level,steps)=>steps.find(x=>x>level);
 const efficiencyThreshold=10*PrayerMath.monsters.Cooking.Defence;
 put('Cooking efficiency and prowess','Saved roster efficiency base',1,'Hard cap: 1 base contribution',`Full EXP base at ${fmt(efficiencyThreshold)} Cooking efficiency; further efficiency does not raise this EXP term.`);
 const meals=a.cooking?.meals?.filter(m=>m.stat==='CookExp')||[],mealMax=a.cooking?.mealMaxLevel;
 if(Number.isFinite(mealMax)){
  const capped={...a,cooking:{...a.cooking,meals:a.cooking.meals.map(m=>m.stat==='CookExp'?{...m,level:mealMax}:m)}};
  put('Cooking EXP meals',list(meals),PrayerMath.getMealsBonusByEffectOrStat(capped,null,'CookExp')/100,`Lv ${mealMax} per meal; current meal amplifiers`,meals.some(m=>m.level<mealMax)?'Next meal level adds its base bonus × current amplifiers.':'Both meals at current cap; raise the meal cap or amplifiers.');
 }
 const vault=a.upgradeVault?.upgrades||[],v=vault[60];
 if(v){const cap=1+PrayerMath.calcUpgradeVaultBonus(vault.map((x,i)=>i===60?{...x,level:x.maxLevel}:x),60)/100;const target=Math.min(v.maxLevel,next(v.level,[25,50,100,200,300,400,450])||Infinity,25*(Math.floor(v.level/25)+1));put('Cooking Knowledge',`Lv ${v.level} / ${v.maxLevel}`,cap,`Lv ${v.maxLevel}; current Vault amplifiers`,v.level>=v.maxLevel?'At current cap; further cap unlocks can extend it.':`Next growth step: Lv ${target}.`);}
 const legend=a.legendTalents?.talents?.find(t=>t.originalIndex===20);
 if(legend)put('Skillium Fancyson',`Lv ${legend.level} / ${legend.maxLevel}`,1+.75*legend.maxLevel,`Current cap Lv ${legend.maxLevel}; absolute Lv 7 → 6.25×`,legend.level<legend.maxLevel?`Next: Lv ${legend.level+1} → ${fmt(1+.75*(legend.level+1))}×.`:'At current cap; Brown Fever can extend it up to Lv 7.');
 const cooking=a.totalSkillsLevels?.cooking?.level||0;
 put('Cooking Skill Mastery',`${fmt(cooking)} combined Cooking levels`,.25,'150 account Cooking levels + Rift Skill Mastery',cooking<150?`${150-cooking} combined levels to the +25% reward.`:'Cooking-level threshold met; Rift Skill Mastery must also be unlocked.');
 const salt=a.saltLick?.[3];if(salt)put('Salt Lick',`Lv ${salt.level||0} / ${salt.maxLevel}`,salt.baseBonus*salt.maxLevel/100,`Lv ${salt.maxLevel} → +${fmt(salt.baseBonus*salt.maxLevel)}%`,salt.level<salt.maxLevel?`Next: Lv ${salt.level+1} → +${fmt(salt.baseBonus*(salt.level+1))}%.`:'At hard cap.');
 const guild=a.guild?.guildBonuses?.[14];if(guild)put('Guild Skill EXP',a.guild?.unlocked?`Lv ${guild.level} / ${guild.maxLevel}`:'Guild data unavailable',PrayerMath.growth(guild.func,guild.maxLevel,guild.x1,guild.x2,false)/100,`Lv ${guild.maxLevel} → +18.75%`,guild.level<120?'Half-strength point: Lv 120.':guild.level<200?'Next hard cap: Lv 200.':'At hard cap.');
 const flurbo=a.dungeons?.upgrades?.find(x=>x.effect==='Class_Exp');if(flurbo)put('Dungeon Flurbo EXP',`Lv ${flurbo.level} / 50`,.15,'Lv 50 → +15%',flurbo.level<50?`Next: Lv ${flurbo.level+1}.`:'At hard cap.');
 for(const [name,key,idx] of [["Chef's Essentials",'Chefs_Essentials',1],['Myriad Crate','Myriad_Crate',2]]){
  const entries=cs.map(c=>({name:c.name,box:c.postOffice?.boxes?.find(b=>b.name===key)})).filter(x=>x.box),b=entries[0]?.box;
  if(b){const u=b.upgrades[idx],offset=Math.round(b.upgradeLevels[idx-1]),cap=PrayerMath.growth(u.func,b.maxLevel-offset,u.x1,u.x2,false)/100;put(name,entries.map(x=>`${x.name}: ${x.box.level}/${x.box.maxLevel}`).join(' · '),cap,`${fmt(b.maxLevel)} boxes → +${fmt(cap*100)}%`,`EXP unlock: ${offset} boxes; half of asymptote: ${fmt(offset+u.x2)} boxes.`);}
 }
 for(const [name,key,curse] of [['Unending Energy','Unending_Energy',false],['Balance of Proficiency','Balance_of_Proficiency',false],['Skilled Dimwit curse','Skilled_Dimwit',true],['Royal Sampler curse','The_Royal_Sampler',true]]){
  const pr=a.prayers?.find(x=>x.name===key);if(pr){const cap=curse?0:Math.round(pr.x1*(1+(pr.maxLevel-1)/10))/100;put(name,`Account prayer Lv ${pr.level} / ${pr.maxLevel}`,cap,curse?'0% with curse inactive':`Lv ${pr.maxLevel} → +${fmt(cap*100)}% equipped`,pr.level<pr.maxLevel?`Next prayer level: ${pr.level+1}.`:'Prayer level maxed; activation differs by character.');}
 }
 for(const [name,key] of [['Left Hand of Learning','LEFT_HAND_OF_LEARNING'],['Apocalypse Chow','APOCALYPSE_CHOW'],['Tempestuous Emotions','TEMPESTUOUS_EMOTIONS'],['Maestro Transfusion','MAESTRO_TRANSFUSION'],['Green Tube enhancement','GREEN_TUBE']]){
  const ts=cs.flatMap(c=>(c.flatTalents||[]).filter(t=>t.name===key).map(t=>({c,t})));if(ts.length)put(name,ts.map(({c,t})=>`${c.name}: ${t.level} effective; ${t.baseLevel}/${t.maxLevel} base`).join(' · '),null,'Saved base caps: '+ts.map(({c,t})=>`${c.name} ${t.maxLevel}`).join(' · '),ts.map(({c,t})=>{const step=t.funcX==='decay'?next(key==='LEFT_HAND_OF_LEARNING'?t.maxLevel:t.level,[100,300,900]):null;return step?`${c.name}: curve milestone Lv ${step}`:`${c.name}: further talent levels still improve the bonus`;}).join(' · '));
 }
 for(const [name,match] of [['Cooking EXP cards',c=>c.rawName==='mini4a'],['Passive Skill EXP cards',c=>/Skill_EXP_\(Passive\)/.test(c.effect)],['Chaotic Efaunt card',c=>c.cardIndex==='Z7']]){
  const cards=Object.values(a.cards||{}).filter(match);const base=cards.reduce((s,c)=>s+7*c.bonus,0)/100;put(name,cards.map(c=>`${c.displayName.replaceAll('_',' ')}: ${c.amount>0?c.stars+' stars':'not owned'}`).join(' · '),name==='Chaotic Efaunt card'?null:base,`6 stars each → +${fmt(base*100)}% ${name==='Chaotic Efaunt card'?'before equipped-card amplification':''}`,cards.some(c=>!c.amount||c.stars<6)?'Collect the missing card or raise the next star tier.':'All source cards at 6 stars.');
 }
 const arcade=a.arcade?.shop?.find(x=>x.effect.includes('Skill_EXP_gain'));if(arcade){const tier=arcade.level===102?6:arcade.level===101?2:1,base=PrayerMath.growth(arcade.func,arcade.level,arcade.x1,arcade.x2,false),boost=base?arcade.bonus/base/tier:1;put('Arcade Skill EXP',`Lv ${arcade.level}`,PrayerMath.growth(arcade.func,102,arcade.x1,arcade.x2,false)*6*boost/100,`Gold Lv 102; current arcade companion effect`,arcade.level<100?'Next tier: Lv 100.':arcade.level<101?'Next tier: silver Lv 101 (2×).':arcade.level<102?'Next tier: gold Lv 102 (6×).':'At gold cap.');}
 const pets=(a.breeding?.pets||[]).flat().filter(x=>x.rawPassive?.includes('Skill_EXP'));if(pets.length)put('Shiny pets',pets.map(x=>`${x.monsterName.replaceAll('_',' ')} Lv ${x.shinyLevel}/${x.maxShinyLevel}`).join(' · '),pets.reduce((s,x)=>s+x.baseValue*x.maxShinyLevel,0)/100,'Current saved shiny level caps','Raise non-maxed Skill EXP pets; cap upgrades allow additional levels.');
 put('Whale companion','Account companion',2.5,'Upgraded → 2.5×');put('Bloque companion','Account companion',.3,'Upgraded → +30%');put('Achievements','Four account unlocks',.6,'All four rewards → +60%');put('Lucky Charm enhancement','Maestro-class activation',1.5,'Formula clamp +150%');
 const friend=a.friendBonusStats?.bonuses?.[4],friendMulti=a.friendBonusStats?.multiplier;
 if(Number.isFinite(friendMulti))put('Friend bonus',friend?.friendName?`${friend.friendName}: level ${fmt(friend.level)}`:'No Skill EXP friend bonus selected',30*(.25+1.5*30000/42000)*friendMulti/100,`Friend Lv 30,000; current ${fmt(friendMulti)}× friend effect`,(friend?.level||0)<12000?'Next curve milestone: friend Lv 12,000 (base +30%).':(friend?.level||0)<30000?'Next hard cap: friend Lv 30,000.':'At friend-level input cap.');
 const set=a.armorSmithy?.sets?.find(x=>x.setName==='CHIZOAR_SET');if(set)put('Chizoar armor set',set.unlocked?'Unlocked':'Locked',set.bonusValue/100,'Fixed +40% account reward',set.unlocked?'Complete.':'Unlock the Chizoar set at Armor Smithy.');
 put('Card set','Selected set varies by character',.35,'Medium Resources: 6 stars → +35%');
 const waves=a.towers?.totalWaves,msa=a.gaming?.superbitsUpgrades?.find(x=>x.name==='MSA_Skill_EXP');
 if(Number.isFinite(waves))put('MSA Skill EXP superbit',`${fmt(waves)} total waves · ${msa?.unlocked?'Superbit unlocked':'Superbit locked'}`,null,'+1% per 10 total waves; no separate EXP clamp',`Next +1% at ${fmt(10*(Math.floor(waves/10)+1))} total waves.`);
 const owlLevel=Number(a.accountOptions?.[255]||0),owlNext=owlLevel<4?4:4+6*(Math.floor((owlLevel-4)/6)+1);
 put('Owl Skill XP',`Bonus upgrade Lv ${owlLevel}`,null,'No fixed bonus cap',`Next Skill XP step at bonus upgrade Lv ${owlNext}.`);
 for(const [name,threshold] of [['400-level Skill Mastery',400],['All Skill Mastery',1000]]){const skills=Object.entries(a.totalSkillsLevels||{}).filter(([,x])=>x.index>=0&&x.index<18);const remaining=skills.filter(([,x])=>x.level<threshold);put(name,`${skills.length-remaining.length}/${skills.length} listed skills reach ${threshold}`,null,`Each eligible skill at ${fmt(threshold)} account levels`,remaining.length?remaining.map(([k,x])=>`${k}: ${fmt(threshold-x.level)} levels left`).join(' · '):'All listed skills meet the threshold.');}
 return out;
}
self.onmessage=e=>{
 try{
  const raw=structuredClone(e.data||{}),data=typeof raw.data==='string'?JSON.parse(raw.data):(raw.data||raw);
  if(!Object.keys(data).some(k=>/^Lv0_\d+$/.test(k))){self.postMessage({missing:true});return;}
  data.OptLacc??=data.OptionsListAccount;
  const p=PrayerMath.parseData(data,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);
  const characters=p.characters.map(c=>({id:c.playerId,name:c.name,level:c.skillsInfo?.cooking?.level,...PrayerMath.getSkillExpMulti('cooking',c,p.characters,p.account,PrayerMath.getMaxDamage(c,p.characters,p.account))}));
  self.postMessage({characters,progress:accountProgress(p)});
 }catch(error){self.postMessage({error:error.message});}
};

