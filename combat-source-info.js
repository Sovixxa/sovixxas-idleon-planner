(function(root){
'use strict';
const routes=[
 [/soft cap|softcap|^base$|reliquarium/i,null,'','This is a calculation rule, not a separately purchasable bonus.'],
 [/stamp/i,'stamps','Stamps','No universal practical level. Upgrade while coin and material costs are affordable; carry capacity and discounts affect the next milestone.'],
 [/post office/i,'postOffice','Post Office','Work toward the relevant box limit. Effective bonuses can depend on account boosts and the box formula.'],
 [/bubble|trione/i,'alchemy','Alchemy','Depends on bubble levels and amplification. Prioritize affordable levels; diminishing returns can limit practical gains.'],
 [/vial/i,'vials','Vials','Finish the relevant vial levels, then improve vial-effect amplification.'],
 [/sigil/i,'sigils','Sigils','Complete the sigil tiers and available effect amplification.'],
 [/companion/i,'pets','Pets','Obtain or activate the companion and check its upgraded bonus. The bonus depends on the companion tier.'],
 [/golden|gold food/i,'goldFood','Gold Food Bonuses','Depends on equipped quantity, Beanstalk milestones and Gold Food Bonus. There is no universal final value.'],
 [/obol/i,'obols','Obols','Limited by unlocked family and personal slots, obol tiers and rerolls.'],
 [/equipment|equip|gallery|hat rack/i,'nametags','Nametags & Trophies','Depends on gear slots, item bonuses, collection progress and Gallery/Hat Rack amplification.'],
 [/card/i,'cards','Cards','Limited by card tiers, available slots and card amplification; passive cards may have their own caps.'],
 [/royal statue|graded/i,'royalArmory','Royal Armory','Improve the relevant Royal Armory upgrade toward its available limit.'],
 [/statue/i,'statues','Statues','Depends on deposited statues, statue levels and statue-effect boosts.'],
 [/star sign/i,'starSigns','Star Signs','Use applicable signs and available sign amplification; alignment slots can limit a setup.'],
 [/prayer/i,'prayers','Prayers','Upgrade toward the prayer cap and consider its curse. Only active or applicable passive bonuses count.'],
 [/shrine/i,'shrines','Shrines','Raise the relevant shrine and meet its location or activation rules.'],
 [/salt lick/i,'saltLick','Salt Lick','Reach the relevant Salt Lick upgrade limit.'],
 [/arcade/i,'arcade','Arcade','Reach the relevant Arcade upgrade cap; account amplification affects the final value.'],
 [/achievement|merit \(tasks\)/i,'tasks','Tasks / Achievements','Complete the applicable achievements or merit upgrades.'],
 [/vault/i,'upgradeVault','Upgrade Vault','Improve the relevant Vault upgrade and any kill/progress counter it scales from.'],
 [/grimoire|wraith|apocalypse/i,'grimoire','Grimoire','Depends on Grimoire upgrades, talent levels and the associated kill milestones.'],
 [/compass|medallion|abominator/i,'compass','Compass','Depends on unlocked Compass upgrades, medallions, abomination kills and relevant talent levels.'],
 [/arcane|tesseract/i,'tesseract','Tesseract','Map bonuses depend on the saved location and its Tesseract progress.'],
 [/family/i,'familyBonuses','Family Bonuses','Depends on the class providing the family bonus, its level and applicable personal talent amplification.'],
 [/shiny/i,'shinyPets','Shiny Pets','Progression-dependent; target the next relevant shiny pet level.'],
 [/superbit|classy discoveries/i,'gaming','Gaming','Unlock the required Superbit; effects that scale with discoveries or other progress can continue growing.'],
 [/^MSA$/i,'gaming','Gaming','Progress the relevant MSA Totalizer milestone and its available boosts.'],
 [/research/i,'research','Research','Improve the relevant research nodes and their amplification within available research limits.'],
 [/tome/i,'tome','Tome','Progress unfinished Tome score categories; the bonus depends on score and the applicable Tome formula.'],
 [/eclipse/i,'deathNote','Death Note','Complete the relevant Eclipse Skull milestones.'],
 [/palette/i,'gamingPalette','Gaming Palette','Increase the relevant palette color and its amplification.'],
 [/dream|equinox/i,'equinox','Equinox','Depends on completed challenges, upgrades and the specific reward counter.'],
 [/pristine/i,'sneaking','Sneaking','Obtain the relevant Pristine Charm; its effect is determined by the charm reward.'],
 [/summon|winner/i,'summoning','Summoning','Complete relevant battles and upgrade reward amplification or the named Summoning upgrade.'],
 [/monument/i,'holeMonuments','Monuments','Depends on monument progress and reward amplification.'],
 [/fountain/i,'holeFountain','Fountain','Upgrade the relevant Fountain bonus within available resources and limits.'],
 [/schematic/i,'holeSchematics','Engineer','Complete the relevant schematic and any progress it scales from.'],
 [/cosmo/i,'holeMajik','Hole Bonuses','Improve the relevant Cosmo bonus.'],
 [/crystal glunko cove/i,'holeCove','Crystal Cove','Upgrade the relevant Cove bonus.'],
 [/minehead/i,'minehead','Minehead','Depends on Minehead upgrade levels and, for weapon-power scaling, the equipped weapon.'],
 [/big fish/i,'bigFish','Big Fish','Improve the relevant Big Fish advice level.'],
 [/spelunk/i,'spelunking','Spelunking','Upgrade the relevant shop entry toward its available cap.'],
 [/coral kid/i,'coralKid','Coral Kid','Depends on Coral Kid upgrade levels and God Rank.'],
 [/dancing coral/i,'dancingCoral','Dancing Coral','Purchase the applicable coral dance upgrades.'],
 [/god|divinity/i,'divinity','Divinity','Depends on deity links, blessing/minor-bonus progress and applicable unlocks.'],
 [/zenith/i,'zenithMarket','Zenith Market','Upgrade the relevant Zenith Market entry toward its limit.'],
 [/meritocracy/i,'meritocracy','Meritocracy','Upgrade the applicable ballot reward.'],
 [/sushi/i,'sushi','Sushi','Unlock the relevant Sushi bonus and its available upgrades.'],
 [/button/i,'button','The Button','Progress the relevant Button bonus.'],
 [/bubba/i,'bubba','Bubba','Progress the clicker and the relevant account bonus.'],
 [/owl/i,'orion','Orion','Improve the relevant Orion clicker bonus.'],
 [/kangaroo/i,'poppy','Poppy','Improve the relevant Poppy clicker bonus.'],
 [/vote/i,'votes','Weekly Votes','Depends on the active vote and its strength; it cannot be freely leveled here.'],
 [/weekly boss/i,'guilds','Guilds','Depends on the saved weekly boss reward and the applicable cap.'],
 [/friend/i,'friendBonuses','Friend Bonuses','Depends on the supplied friend bonus, rather than a directly purchased upgrade.'],
 [/set/i,'armorSets','Armor Sets','Unlock the relevant armor set reward and its available amplification.'],
 [/land rank|exotic|crop|sticker/i,'farming','Farming','Depends on Farming progression and the relevant rank, market, depot or sticker bonus.'],
 [/shimmer|island/i,'islandExpeditions','Island Expeditions','Progress the relevant island reward and its saved counter.'],
 [/bribe/i,'bribes','Bribes','Purchase the relevant bribe to activate its fixed reward.'],
 [/flurbo|dungeon/i,'dungeons','Dungeons','Improve the relevant dungeon upgrade or credit milestone.'],
 [/refinery/i,'refinery','Refinery','Depends on refinery progression and the associated character talent.'],
 [/construction/i,'construction','Construction','Progress construction mastery and related milestones.'],
 [/atom/i,'atomCollider','Atom Collider','Raise the applicable Atom upgrade toward its current limit.'],
 [/crystal steak|ruble|hippo|opera mask|lantern/i,'sailing','Sailing','Obtain or improve the relevant artifact tier.'],
 [/lab|chip/i,'lab','Lab','Activate the relevant Lab bonus or equip the appropriate chip.'],
 [/arena/i,'petArena','Pet Arena','Unlock the applicable Pet Arena reward.'],
 [/meal/i,'cooking','Cooking','Improve relevant meal levels and meal-effect amplification.'],
 [/killroy/i,'killroy','Killroy Prime','Progress the relevant Killroy reward; the damage multiplier is capped at ×3.'],
 [/bundle/i,'gemShop','Gem Shop','A fixed unlock; availability depends on the specific bundle.'],
 [/quest/i,'quests','Quests','Complete more quests up to the applicable talent limit.'],
 [/skill mastery/i,'rift','Rift','Progress Rift Skill Mastery milestones.'],
 [/account (option|bonus)/i,'buffs','All Bonuses','This saved account bonus has no verified practical maximum exposed by this calculation.'],
 [/./,'characters','Characters & Talents','Depends on class, talent levels, equipped setup and saved progression. No universal practical maximum is assumed.']
];
function get(row,kind){
 const [,page,label,max]=routes.find(([pattern])=>pattern.test(row.name));
 let effect=row.operation==='rule'?row.detail:kind==='classExp'
  ?`${row.name} ${row.operation==='multiply'?'multiplies the Class EXP total':'contributes to the additive Class EXP multiplier'}.`
  :`${row.name} contributes to the ${row.stage} stage. ${row.group==='multi'?'It is a multiplier in that stage.':'Its value belongs to that stage’s bonus pool.'}`;
 if(row.name==='Luck + Lucky Charms')effect='Luck supplies a diminishing-return EXP bonus. Lucky Charms boosts that Luck contribution before it enters the additive pool.';
 if(row.name==='Golden Food')effect=kind==='classExp'?'Golden Nigiri adds Class EXP from equipped food and Beanstalk deposits, scaled by golden-food effects.':'Golden Nomwich adds base damage before the base-damage soft caps.';
 if(row.name==='Golden Kebabs')effect='Golden Kebabs multiply the Per-X damage stage before that stage’s soft caps.';
 if(row.name==='Base')effect='The Class EXP multiplier starts at 1× before other bonuses.';
 return {page,label,max,effect};
}
root.CombatSourceInfo={get};
})(typeof window!=='undefined'?window:globalThis);
