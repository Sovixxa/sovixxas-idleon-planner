(function(root){
'use strict';
// Formula order transcribed from the installed game's TotalStats and AllStatPCT.
// Saved totals are never used as an input or as a fitted multiplier.
function calculate(ch,a,characters,M){
 const pretty=s=>String(s).replace(/_/g,' '),all=[...(ch.flatTalents||[]),...(ch.flatStarTalents||[])];
 const talent=(id,y=false)=>{const t=all.find(t=>t.skillIndex===id);return t?M.getTalentBonus(all,t.name,y):0;};
 const tname=id=>pretty(all.find(t=>t.skillIndex===id)?.name||('Talent '+id));
 const bubble=(stat)=>{const b=a.alchemy.bubblesFlat.find(b=>b.stat===stat);const classes={power:'Warrior',quicc:'Archer','high-iq':'Mage'};return b?M.getBubbleBonus(a,b.bubbleName,false,!!classes[b.cauldron]&&M.checkCharClass(ch.class,classes[b.cauldron])):0;};
 const bname=stat=>pretty(a.alchemy.bubblesFlat.find(b=>b.stat===stat)?.bubbleName||stat);
 const gear=stat=>M.getStatsFromGear(ch,stat,a).value;
 const family=(name,cls)=>{const providers=characters.filter(c=>M.checkCharClass(c.class,cls));const level=Math.max(0,...providers.map(c=>c.level));const bonus=M.getFamilyBonusBonus(M.classFamilyBonuses,name,level);return bonus*(providers.some(c=>c.playerId===ch.playerId&&c.level===level)?1+talent(144)/100:1);};
 const post=stat=>{for(const box of ch.postOffice.boxes)for(let i=0;i<box.upgrades.length;i++)if(box.upgrades[i].stat===stat)return M.getPostOfficeBonus(ch.postOffice,box.name,i);return 0;};
 const artifact=i=>{const x=a.sailing.artifacts.find(x=>x.rawName==='Arti'+i);return x?.acquired?x.bonus:0;};
 const star=(stat,pct)=>{const exact=(pct?'+{%_':'+{_')+stat;const select=list=>(list||[]).map(s=>({...s,bonuses:(s.bonuses||[]).filter(b=>b.rawName===exact)}));return M.getStarSignBonus({...ch,starSigns:select(ch.starSigns)},{...a,starSigns:select(a.starSigns)},stat);};
 const stamp=stat=>M.getStampsBonusByStat(a,stat,ch)||0;
 const shiny=stat=>M.getShinyBonus(a.breeding.pets,stat)||0;
 const arc=stat=>a.arcade?.shop?.find(x=>x.effect?.includes(stat))?.bonus||0;
 return ['STR','AGI','WIS','LUK'].map((stat,i)=>{
  const rows=[],unknown=[];
  const add=(name,value,stage,detail='')=>{if(!Number.isFinite(value)){unknown.push(name);return 0;}rows.push({name,value,stage,operation:stage==='Post-multiplier additions'?'add':undefined,display:stage.includes('%')?value.toLocaleString(undefined,{maximumFractionDigits:4})+'%':null,detail});return value;};
  const groupSum=stage=>rows.filter(r=>r.stage===stage).reduce((n,r)=>n+r.value,0);
  const ge=M.getStatsFromGear(ch,stat,a);for(const r of ge.newBreakdown.sources)add(r.name,r.value,'Equipment base');
  const eqTalent=[96,276,456,21][i];add(tname(eqTalent),talent(eqTalent),'Equipment amplification %');add('Equipment stat stamps',stamp('Pct'+stat),'Equipment amplification %');
  const equipment=ge.value*(1+groupSum('Equipment amplification %')/100);
  const ob=M.getObolsBonus(ch.obols,stat);add('Personal obols',ch.obols.stats?.[stat]?.personalBonus||0,'Obol base');add('Family obols',ch.obols.stats?.[stat]?.familyBonus||0,'Obol base');
  const obTalent=[111,291,486,36][i];add(tname(obTalent),talent(obTalent),'Obol amplification %');add('Gaming · Obol Stat Booster',a.gaming.superbitsUpgrades[2]?.unlocked?40:0,'Obol amplification %');
  const obols=ob*(1+groupSum('Obol amplification %')/100);
  const base='Base additions';
  for(const id of [[10,98,203],[11,278,428],[12,459,593],[13,23]][i])add(tname(id),talent(id),base);
  const special=51+i,accountTalent=Math.max(0,...characters.map(c=>{const t=c.flatTalents.find(t=>t.skillIndex===special);return t?M.growth(t.funcX,t.baseLevel||0,t.x1,t.x2):0;}));add('Account talent · '+pretty(characters.flatMap(c=>c.flatTalents).find(t=>t.skillIndex===special)?.name||special),accountTalent,base);
  add(stat+' stamp',stamp('Base'+stat),base);add('All-stat stamp',stamp('BaseAllStat'),base);add('Equipment flat bonus',gear(51+i),base);
  add('Shimmer Island × Shim Lantern',(Number(a.accountOptions[174+i])||0)*Math.max(1,Math.min(4,1+artifact(31))),base);
  add('Family · '+stat,family('TOTAL_'+stat,['Warrior','Archer','Mage','Beginner'][i]),base);
  add('Star signs · '+stat,star(stat,false),base);
  add('Post office · '+stat,post(['23b','21b','22b','LUK'][i])+(i===3?post('15c'):0),base);
  add('Will of the Eldest',Math.min(talent(620),Math.floor(Math.max(...characters.map(c=>c.level))/10)),base);
  add('Cards · Base '+stat,M.getCardBonusByEffect(ch.cards,'Base_'+stat),base);
  const shared='Shared all-stat base';add('Post office · Myriad Crate',post('20a'),shared);add('Cooking · all-stat meals',M.getMealsBonusByEffectOrStat(a,null,'Stat'),shared);add('Guild · all stats',M.getGuildBonusBonus(a.guild?.guildBonuses,1),shared);add('Shared all-stat pool (rounded)',Math.floor(groupSum(shared)),base,'Sum of Myriad Crate, cooking and guild, rounded down.');
  add('Sigil · '+pretty(a.alchemy.p2w.sigils[i]?.name||stat),M.getSigilBonus(a.alchemy.p2w.sigils,a.alchemy.p2w.sigils[i]?.name),base);
  const slab=['W4','A4','M4','A4'][i];add('Alchemy · '+bname(slab),bubble(slab)*Math.floor(a.looty.totalItems/100),base);
  add('Breeding · '+stat,shiny('Base_'+stat),base);add('Arcade · '+stat,arc('Base_'+stat),base);add('Orion · All Stats',a.owl.bonuses.find(x=>x.name==='All Stats')?.bonus||0,base);
  if(i<3)add(tname([142,367,532][i])+' (second effect)',talent([142,367,532][i],true),base);
  if(i===3)add('Quest Chungus',Math.min(Number(ch.questCompleted)||0,talent(618)),base);
  if(i===0)add('Active buff · Firmly Grasp It',M.getTalentBonusIfActive(ch.activeBuffs,'FIRMLY_GRASP_IT'),base);
  const pct='Additive stat %';
  if(i<3)add(tname([143,368,533][i]),talent([143,368,533][i]),pct);
  add('Equipment · '+stat+' %',gear([57,25,58,17][i]),pct);add('Equipment · All Stat %',gear(46),pct);
  add('Pristine charm · '+pretty(a.sneaking.pristineCharms[[4,1,10,5][i]]?.name),M.getCharmBonus(a,a.sneaking.pristineCharms[[4,1,10,5][i]]?.name),pct);
  add('Star signs · '+stat+' %',star(stat,true)+star('All_Stat',true),pct);
  if(i<3){const b=['W8','A9','M9'][i];add('Alchemy · '+bname(b),bubble(b)*Math.max(0,Math.floor((a.tome.totalPoints-5000)/2000)),pct);}
  const ap='All-stat % pool';
  add('Alchemy vials · All Stat %',M.getVialsBonusByStat(a.alchemy.vials,'AllStatPCT'),ap);
  add('Companion · King Doot × Cosmo',15*(M.isCompanionBonusActive(a,0)?1:0)*M.getCosmoBonus({majik:a.hole.holesObject.idleonMajiks,t:2,i:0}),ap);
  add('Lab · Sapphire Navette',M.getJewelBonus(a.lab.jewels,4),ap);add('All-stat % stamp',stamp('AllStatPct'),ap);add('Cards · All Stat',M.getCardBonusByEffect(ch.cards,'All_Stat'),ap);
  add('Summoning win bonus',a.summoning.winnerBonuses.find(x=>x.bonusId===18)?.value||0,ap);add('Family · All Stat',family('ALL_STAT','Bubonic_Conjuror'),ap);add('Sailing · Socrates',artifact(28),ap);
  const food=ch.food.filter(f=>f.Effect==='AllStatz').at(-1),foodMulti=M.getGoldenFoodMulti(ch,a,characters).value;
  add('Golden food · Golden Grilled Cheese Nomwich',M.getGoldenFoodBonus('Golden_Grilled_Cheese_Nomwich',ch,a,characters),ap,`Equipped stack: ${Number(food?.amount||0).toLocaleString()}. Golden-food effect: ${foodMulti.toLocaleString(undefined,{maximumFractionDigits:4})}×. Includes the matching Beanstalk bonus when unlocked. Each stack uses food base × food effect × 0.05 × log10(1 + quantity) × (1 + log10(1 + quantity) / 2.14), using the game’s logarithm.`);rows.at(-1).linkedStat='goldFood';
  for(const id of [309,362])add('Achievement · '+pretty(a.achievements?.[id]?.name||id),M.getAchievementStatus(a.achievements,id)?1:0,ap);
  add('Star talent · Dummy Thicc Stats',Math.min(15,Math.log10(Math.max(1,Number(a.accountOptions[172])||1))*talent(653)),ap);
  add('Event stat bonuses',10*Math.floor((98+(Number(a.accountOptions[232])||0))/100),ap);
  add('Farming · Seed of Stats',a.farming.ranks[19]?.bonus||0,ap);
  add('Voting · All Stat',M.getVoteBonus(a,2),ap);add('Armor set · Marbiglass',a.armorSmithy.sets.find(s=>s.setName==='MARBIGLASS_SET'&&s.unlocked)?.bonusValue||0,ap);
  const allPct=Math.floor(groupSum(ap)*10)/10;
  const baseTotal=equipment+obols+groupSum(base),multiplier=1+(groupSum(pct)+allPct)/100;
  const outside='Post-multiplier additions';
  add('Alchemy · '+bname('Total'+stat),bubble('Total'+stat),outside);add(tname(652),talent(652),outside);add('Companion · Sandy Pot',M.isCompanionBonusActive(a,8)?a.companions.list[8].bonus:0,outside);
  const computed=Math.floor(baseTotal*multiplier+groupSum(outside)),saved=ch.stats[['strength','agility','wisdom','luck'][i]];
  return {stat,saved,computed,snapshotLevel:ch.stats.level,currentLevel:ch.level,difference:saved-computed,rows,unknown,baseTotal,equipment,obols,multiplier,outside:groupSum(outside)};
 });
}
root.ConnectedPrimaryStats={calculate};
})(typeof self!=='undefined'?self:globalThis);
