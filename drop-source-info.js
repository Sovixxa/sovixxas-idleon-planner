(function(root){
'use strict';
// Effects and fixed limits follow the bundled character.ts Drop_Rarity calculation.
// Progression targets are deliberately not presented as universal numeric caps.
const entries={};
function add(names,page,label,effect,max){for(const name of names.split('|'))entries[name.toLowerCase()]={page,label,effect,max};}
add('Base',null,'','Every character starts with a 1× drop-rate multiplier.','Fixed at 1×.');
add('Luck','characters','Characters & Talents','Luck adds to base drop rate with strong diminishing returns.','Approaches +1.1158× from Luck; this is a formula ceiling, not a reachable target.');
add('Talents','characters','Characters & Talents','Combines Robbinghood, Curse of Mr Looty Booty and Boss Battle Spillover where applicable.','Depends on class, talent book limits and saved boss progress. Compare available talent levels on the character page.');
add('Post Office','postOffice','Post Office','Non Predatory Loot Box adds drop rate from invested Post Office points.','Finish the box upgrades; the effective bonus depends on the box formula and account boosts.');
add('Obols','obols','Obols','Adds the drop-rate bonuses from personal and family obols, including their upgrades.','Limited by unlocked slots, obol types and rerolls. Fill both layouts with drop-rate obols for a dedicated setup.');
add('Bubble','alchemy','Alchemy','Droppin Loads adds drop rate through Alchemy.','No single practical level for every account. Use affordable upgrades; later levels give diminishing returns.');
add('Cards','cards','Cards','Combines equipped drop-rate cards, the active card set and passive drop-rate cards.','Depends on card tiers, slots and card boosts. Passive card formula caps sum to +155%; this is not a cap on the whole row.');
add('Card Multi','cards','Cards','Equipped Drop Rate Multi cards multiply the total instead of joining the additive card pool.','Limited by owned card tiers, equipped slots and active card boosts.');
add('Shrine','shrines','Shrines','The drop-rate shrine adds its bonus when its location rules are satisfied.','Progression-dependent; raise the shrine and keep its bonus active at your farming location.');
add('Prayers','prayers','Prayers','Midas Minded adds drop rate when its prayer bonus is active. Its curse affects other stats.','Upgrade the prayer to its available cap and evaluate its curse before equipping it.');
add('Sigil','sigils','Sigils','Trove adds account-wide drop rate through its sigil bonus.','Finish Trove tiers and available sigil amplification; no universal final percentage is assumed.');
add('Shiny','shinyPets','Shiny Pets','Shiny pet levels add account-wide drop rate.','Progression-dependent; prioritize pets that supply Drop Rate and their next level milestones.');
add('Arcade','arcade','Arcade','The Arcade Drop Rate upgrade adds to the base multiplier.','Reach the shop upgrade cap; the effective bonus also depends on Arcade amplification.');
add('Starsign','starSigns','Star Signs','Combines active Drop Rate and Drop Rarity star-sign effects.','Limited by available signs, alignment slots and sign amplification.');
add('Guild','guilds','Guilds','The guild drop-rate bonus adds to your base multiplier.','Limited by the guild upgrade cap; check the guild page for saved progress.');
add('Graded Rate (Royal Guardian)','characters','Characters & Talents','Graded Rate converts Royal Guardian total grade into additive drop rate.','Depends on both talent levels and Royal Armory grade; increase either to improve this source.');
add('Equinox','equinox','Equinox','Faux Jewels adds drop rate through Equinox upgrades.','Complete available Faux Jewels levels; further headroom depends on unlocked upgrade limits.');
add('Stamps','stamps','Stamps','Adds the account-wide Drop Rate stamp bonus to every character.','No universal practical level. Push affordable coin and material upgrades, then revisit when carry capacity and discounts improve.');
add('Tome|Tome Multi','tome','Tome','Tome progress supplies separate additive drop-rate and multiplier bonuses.','Progression-dependent; use the Tome page to identify unfinished score categories and bonus limits.');
add('Owl','orion','Orion','Orion feather-clicker upgrades add account-wide drop rate.','Progression-dependent; improve the Drop Rate bonus through the clicker upgrades.');
add('Summoning','summoning','Summoning','Summoning win rewards add drop rate, including applicable reward boosts.','Complete the available drop-rate reward battles and improve winner-bonus amplification.');
add('Golden Food','goldFood','Gold Food Bonuses','Golden Cake supplies additive drop rate from equipped food and Beanstalk deposits, scaled by Gold Food Bonus.','No fixed final bonus. Improve cake quantity, Beanstalk deposit milestones and golden-food effect boosts.');
add('Achievements','tasks','Tasks / Achievements','Two achievement rewards add +6% and +4% drop rate.','+10% additive drop rate (+0.10×) when both are complete.');
add('Land Rank','farming','Farming','Farming land-rank upgrade 9 adds drop rate.','Depends on land-rank progression and its amplifiers; check available rank upgrades.');
add('Vote','votes','Weekly Votes','The active drop-rate vote adds an account-wide bonus.','Limited to the active vote and its strength; it cannot be freely leveled on this page.');
add('Schematics','holeSchematics','Engineer','Combines the Hole schematic bonuses that add drop rate.','Complete relevant schematic upgrades; effective values may scale with Hole progress.');
add('Grimoire','grimoire','Grimoire','Grimoire upgrade 44 adds account-wide drop rate.','Raise the relevant upgrade toward its current cap, subject to available Grimoire resources.');
add('Upgrade Vault','upgradeVault','Upgrade Vault','Vault upgrade 18 adds drop rate.','Raise the drop-rate upgrade toward the cap shown in the Vault.');
add('Crop Depot','farming','Farming','Crop Depot progression adds account-wide drop rate.','Progression-dependent; unlock and improve the depot drop-rate reward.');
add('Monument','holeMonuments','Monuments','The Hole monument reward adds drop rate.','Depends on monument progress and reward scaling; improve the relevant monument reward.');
add('Measurement','holeMeasurements','Measure','Measurement 15 converts Hole progress into additive drop rate.','Progression-dependent; improve the measured stat and measurement boosts.');
add('Emperor','emperorBonuses','Emperor Bonuses','Emperor reward 11 adds account-wide drop rate.','Complete the remaining reward milestones shown on the Emperor page.');
add('Efaunt Set','armorSets','Armor Sets','The Efaunt armor-set reward adds drop rate.','Unlock the set reward and its available amplification; use the set page for requirements.');
add('Exotic Market','farming','Farming','Exotic Market upgrade 59 adds drop rate.','Depends on its saved upgrade limit and Farming progression.');
add('Friend','friendBonuses','Friend Bonuses','An active friend bonus adds drop rate.','Depends on the supplied friend bonus; not a directly spendable upgrade.');
add('Legend Talent','legendTalents','Legend Talents','Legend talent 1 adds account-wide drop rate.','Use available Legend points and the talent cap shown on its page.');
add('Spelunking','spelunking','Spelunking','Spelunking shop upgrade 50 adds drop rate.','Upgrade toward the shop limit using available Spelunking currency.');
add('Research','research','Research','Research grid bonus 173 adds drop rate.','Improve the relevant research level and its boosts within available research limits.');
add('Equipment, Gallery & Hat Rack|BONUS DROP RATE equipment pool|DROP RATE MULTI equipment pool','nametags','Nametags & Trophies','Combines equipment, Gallery and Hat Rack bonuses for this stat label. Each pool is applied separately by the game.','Setup-dependent: item rolls, equipped slots, collection progress and amplification all matter. There is no single gear-pool cap.');
add('Drop-rate chip (base capped at 5×)','lab','Lab','Adds chip drop rate only while the additive base is below 5×.','Can raise that stage to 5×, never beyond it. Gives no extra drop rate when the base is already at least 5×.');
add('Drop-rate bundle (+2)','gemShop','Gem Shop','Adds a flat 2× before Archlord of the Pirates.','Fixed +2× when owned.');
add('Gem Bundle','gemShop','Gem Shop','The drop-rate bundle multiplies the running total.','Fixed ×1.20 when owned.');
add('Archlord of the Pirates','characters','Characters & Talents','Combines the applicable Archlord talent level with plundered-kill progress to multiply drop rate.','Progression-dependent; both talent levels and plundered kills affect it.');
add('Ninja Mastery','sneaking','Sneaking','Adds a flat 0.30× after Archlord and before the remaining multipliers.','Fixed +0.30× when unlocked.');
add('Tesseract Map','tesseract','Tesseract','Applies the Tesseract multiplier for the character’s saved map.','Map-dependent; improve Tesseract progression for the location you actually farm.');
add('Royal Statue','royalArmory','Royal Armory','The Royal Guardian drop-rate statue multiplies account drop rate.','Improve the statue toward its available upgrade limit in the Royal Armory.');
add('Royal Guardian family','familyBonuses','Family Bonuses','Royal Guardian levels supply a family drop-rate multiplier. The Family Guy boosts it for the supplying character.','Depends on Royal Guardian level and the provider’s talent level, rather than a fixed final multiplier.');
add('Sushi + Jelly Operator','sushi','Sushi','Unagi Nigiri and Jelly Operator share one additive percentage inside this multiplier.','Jelly contributes +5% after obstruction 14. The combined maximum also depends on the Sushi bonus.');
add('Glimbo DR|Minehead','minehead','Minehead','Minehead progression supplies this drop-rate multiplier.','Progression-dependent; improve the relevant Minehead upgrade or Glimbo bonus.');
add('Equinox Multi','equinox','Equinox','The relevant completed Equinox cloud adds 5% to this multiplier.','Fixed ×1.05 when the cloud reward is active.');
add('Pristine Charm','sneaking','Sneaking','The drop-rate Pristine Charm multiplies the running total.','Obtain the relevant charm; its saved charm bonus determines the multiplier.');
add('DR Vial','vials','Vials','The drop-rate multiplier vial supplies a separate multiplier.','Finish the vial levels and improve vial-effect amplification; the final percentage is account-dependent.');
add('Crystal Custard|Quenchie|Santa Snake|Clammie|Lucky Slug|Mama Troll|Crystal Glunko|Mallay|Glunko The Massive','pets','Pets','An active owned or borrowed companion supplies this drop-rate bonus. Some companions contribute to both additive and multiplier stages.','Obtain the companion and check its upgraded bonus on the Pets page. Availability and upgrade tier determine the practical limit.');
function get(row){
 const info={...(entries[row.name.toLowerCase()]||{page:'buffs',label:'All Bonuses',effect:'Contributes to the saved character’s drop-rate calculation.',max:'A verified practical maximum is not available for this source.'})};
 if(row.operation==='multiply'){
  if(row.name==='Mallay')info.max='Capped at ×1.30.';
  if(row.name==='Santa Snake')info.max='Capped at ×1.01 for this multiplier; its additive bonus is separate.';
  if(row.name==='Mama Troll')info.max='×1.50 normally; ×1.70 with its level-two upgrade.';
  if(row.name==='Glunko The Massive')info.max='×1.50 at bonus tier 1; ×2.00 at bonus tier 2.';
 }
 return info;
}
root.DropSourceInfo={get};
})(typeof window!=='undefined'?window:globalThis);
