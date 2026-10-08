(function(root){'use strict';
const clean=s=>String(s||'').replaceAll('_',' '),fmt=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:3});
// Explicit indices are cross-checked against the catalog identities in tests.
const defs=[['grimoire','Bones',40,18,53,'bestDeathBringer',[195,196,198,200,201,202]],['compass','Dust',47,19,54,'bestWindWalker',[420,421,423,425,426,427]],['tesseract','Tachyons',50,22,55,'bestArcaneCultist',[585,586,587,588,590,591,592,594,599]]];
function enrich(groups,systems,raw){
 const parse=v=>typeof v==='string'?JSON.parse(v):v,data=parse(raw?.data)||raw||{},farm=parse(data.FarmUpg);
 const rows=[];
 const add=(mcKey,source,name,effect,level,status,icon,extra={})=>rows.push({mcKey,source,name,effect,level,status,icon,...extra});
 const fixed={maximum:'One unlock; base reward shown',hard:'Unlock once. Account amplification is not included in this base value.',soft:'No upgrade levels for this charm.',target:'Unlock the charm; the displayed value is its base bonus.'};
 for(const [key,resource,arcadeId,charmId,exoticId,playerField,talents] of defs){
  const system=systems.get(key),player=system?.[playerField];
  const arcade=systems.get('arcade')?.bonuses?.find(x=>x.index===arcadeId);
  if(arcade)add(key,'Arcade',clean(arcade.effect).replace(/[+{%}]/g,'').trim(),'+'+fmt(arcade.getBonus())+'% '+resource,'Lv '+arcade.level,arcade.level>0?'active':'missing','assets/'+arcade.getImageData().location+'.png',{calculationType:'additive',note:'Adds inside the '+resource+' percentage pool; includes the decoder’s level-101 and companion boosts.',caps:{maximum:'Arcade level 101',hard:'Level 101 unlocks the doubling milestone; account boosts can increase the effect further.',soft:'Linear levels before the level-101 milestone.',target:arcade.level>=101?'Level milestone reached.':(101-arcade.level)+' levels to the doubling milestone.'}});
  const charm=systems.get('sneaking')?.pristineCharms?.find(x=>x.data.itemId===charmId);
  if(charm)add(key,'Pristine Charms',charm.data.name,fmt(1+charm.data.x1/100)+'× '+resource+' (base reward)',charm.unlocked?'Unlocked':'Locked',charm.unlocked?'active':'missing','assets/nav-Sneaking.png',{calculationType:'multi',caps:fixed,note:'Base charm value; any additional charm amplification must be checked separately.'});
  const entry=root.WORLD6_CATALOG?.MarketExoticInfo?.[exoticId],level=farm?.[20+exoticId];
  if(entry){const known=level!=null,base=Number(entry[3]),decay=Number(entry[4])===1,value=known?(decay?base*Number(level)/(1000+Number(level)):base*Number(level)):null;
   add(key,'Farming Exotic Market',clean(entry[0]),value==null?'Unknown '+resource+' bonus':'+'+fmt(value)+'% '+resource,known?'Lv '+level:'Level unknown',known?(level>0?'active':'missing'):'unknown','assets/FarmCrop'+entry[2]+'.png',{calculationType:'additive',caps:{maximum:decay?fmt(base)+'% theoretical ceiling':'No finite formula ceiling',hard:decay?'No finite level reaches the ceiling.':'No effect cap in the decoded formula.',soft:decay?'L / (L + 1,000): Lv 1,000 / 4,000 / 9,000 give 50% / 80% / 90%.':'Linear per level.',target:'Compare the next affordable purchase with other Exotic Market upgrades; checkpoints are optional.'}});
  }
  for(const t of player?.talents||[])if(talents.includes(t.skillIndex))add(key,'Talents · '+player.playerName,t.name,t.getBonusText(), 'Lv '+t.level,t.level>0?'active':'missing','assets/UISkillIcon'+t.skillIndex+'.png',{note:[198,423].includes(t.skillIndex)?'Per-kill coefficient only. Live Horde / Reindeer stacks are not recorded in this export.':'Saved talent preset for this character. Per-level or resource coefficients still require their stated scaling.'});
 }
 for(const index of [70,71]){const x=systems.get('arcade')?.bonuses?.find(x=>x.index===index);if(!x)continue;add('royalArmory','Arcade',index===70?'Kingdom Resources':'Marble Drop Rate',x.getBonusText(),'Lv '+x.level,x.level?'active':'missing','assets/'+x.getImageData().location+'.png',{calculationType:'additive',caps:{maximum:'Arcade level 101',hard:'Level 101; companion amplification can increase the effect.',soft:'Diminishing returns between ordinary levels; level 101 doubles the bonus.',target:x.level>=101?'Arcade milestone reached.':'Compare purchase costs on the way to the level-101 milestone.'}});}
 for(const player of systems.get('players')||[])if(player.class==='Royal Guardian')for(const t of player.talents||[])if([225,226,227,228,229,230,231,232,234].includes(t.skillIndex))add('royalArmory','Talents · '+player.playerName,t.name,t.getBonusText(),'Lv '+t.level,t.level?'active':'missing','assets/UISkillIcon'+t.skillIndex+'.png',{note:'Saved character preset. Shared RG effects use the applicable highest talent; do not add duplicate characters together. See Outpost ETA / Talent plan for combined calculations.'});
 const royal=root.RoyalArmory?.model(raw);for(const x of royal?.orblets||[])if([1,2,3,5,6,8,9].includes(x.id))add('royalArmory','Orblet Market',x.name,x.description,x.level==null?'Level unknown':'Lv '+x.level,x.level==null?'unknown':x.level?'active':'missing','assets/nav-RoyalArmory.png',{max:x.max,savedLevel:x.level});
 // Existing power-of-10 catalogue duplicates the same talent/preset rows above.
 const identities=new Set(rows.map(r=>r.source+'|'+r.name));
 groups.power10Talents=(groups.power10Talents||[]).filter(r=>!identities.has(r.source+'|'+r.name));
 groups.masterclassVerifiedSources=rows;
 // Emperor and bubbles add within the same resource pool; they are not independent factors.
 for(const r of groups.emperorBonuses||[]){const match=defs.find(([key])=>root.MasterclassModel.bonusRows(key,{emperorBonuses:[r]}).length);if(!match)continue;const x=systems.get('emperor')?.emperorBonuses?.find(x=>clean(x.data.bonusName).replace(/^[+{\}%x ]+/,'').trim()===r.name);if(!x)continue;r.effect='+'+fmt(x.getBonus())+'% '+r.name;r.calculationType='additive';const contribution=text=>String(text||'').replace(/^([\d,.]+)x/,(_,v)=>'+'+fmt((Number(v.replaceAll(',',''))-1)*100)+'%');for(const step of r.killProjections||[])step.effect=contribution(step.effect);r.afterOne=contribution(r.afterOne);r.afterTwo=contribution(r.afterTwo);r.note='Adds with this class’s resource bubble, then the combined pool multiplies resource gain.';}
 for(const r of groups.labJewels||[])if(/(?:Deathbringer Bones|Windwalker Dust|Arcane Cultist Tachyons)/i.test(r.effect)){r.calculationType='additive';r.note='The jewel amplification is already included in the displayed percentage.';}
 // Paper Pint is its own factor in the shared W6 drop formula.
 for(const r of groups.vials||[])if(r.name==='Paper Pint'){const x=systems.get('alchemy')?.vials?.find(x=>x.name===r.name);if(x){r.effect=fmt(1+x.getBonus()/100)+'× Bones, Dust and Tachyons';r.calculationType='multi';r.note='Independent W6 masterclass resource factor. Does not apply to Royal Guardian.';r.mcKeys=['grimoire','compass','tesseract'];}}
 // Epilogue labels identify their output directly; generic word matching missed them.
 for(const r of groups.tomeBonuses||[]){const key=/\bBones\b/i.test(r.effect)?'grimoire':/\bDust\b/i.test(r.effect)?'compass':/\bTachyons?\b/i.test(r.effect)?'tesseract':null;if(key)r.mcKey=key;}
 for(const r of groups.holeGambit||[])if(/Extra Bones/i.test(r.name)){r.mcKey='grimoire';r.effect=r.name.replace(/^(\d+(?:\.\d+)?)/,'$1×');r.calculationType='multi';r.caps={maximum:'2× Bones',hard:'Bone multiplier capped at 2×.',soft:'No separate soft cap verified.',target:'Reach the 2× Gambit reward; further Gambit progress does not increase this bone factor.'};}
 return groups;
}
root.MasterclassAuditSources={enrich};
})(typeof self!=='undefined'?self:globalThis);
