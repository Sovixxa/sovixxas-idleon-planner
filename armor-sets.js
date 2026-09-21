(function(root){
'use strict';
const SETS=[
 ['COPPER_SET','Copper Set','+60% Mining and Chopping Efficiency',['Copper Helmet','Copper Platebody','Copper Platelegs'],['Copper Pickaxe','Copper Chopper','Copper Fish Rod','Copper Netted Net','Silkskin Traps','Ceramic Skull'],[],1,0],
 ['IRON_SET','Iron Set','+25% Class EXP Gain',['Iron Helmet','Iron Platebody','Iron Platelegs'],['Iron Pickaxe','Iron Hatchet','Iron Fishing Rod','Reinforced Net','Ceramic Skull'],[],1,0],
 ['AMAROK_SET','Amarok Set','+40% Accuracy and Defence',['Amarok Helmet','Amarok Bodyplate','Amarok Hinds','Amarok Paws'],[],[],0,0],
 ['GOLD_SET','Gold Set','1.50x Coins Dropped by Monsters',['Gold Helmet','Gold Platebody','Gold Platelegs','Gold Boots'],['Gold Pickaxe','Golden Axe','Gold Fishing Rod','Golden Net','Ceramic Skull'],['Bandage Wraps','Royal Bayonet','Spiked Menace','Starlight'],1,1],
 ['PLATINUM_SET','Platinum Set','+60% Fishing and Catching Efficiency',['Platinum Helmet','Platinum Platebody','Platinum Shins','Platinum Boots'],['Platinum Pickaxe','Platinum Hatchet','Platinum Fishing Rod','Platinum Net','Wooden Traps','Horned Skull'],['Enforced Slasher','Pharaoh Bow','Crows Nest'],1,1],
 ['EFAUNT_SET','Efaunt Set','+25% Drop Rate',['Efaunt Helmet','Efaunt Ribcage','Efaunt Hipilium','Efaunts Broken Ankles'],[],[],0,0],
 ['DEMENTIA_SET','Dementia Set','+50% Critters and Souls gained',['Dementia Helmet','Dementia Body','Dementia Shins','Dementia Boots'],['Dementia Pickaxe','Dementia Dicer','Dementia Fishing Rod','Dementia Net','Natural Traps','Prickle Skull'],['Uninflated Glove','The Ice Breaker','Blizzard Bow','Spriggly Storm'],2,1],
 ['VOID_SET','Void Set','+10% AFK Gains',['Void Imperium Helmet','Void Imperium Platebody','Void Imperium Shardshins','Void Imperium Kicks'],['Void Imperium Pickaxe','Void Imperium Axe','Void Imperium Rod','Void Imperium Net','Steel Traps','Manifested Skull'],['Eclectic Ordeal','Deuscythe','Blackhole Bow','Grey Gatsby'],2,1],
 ['CHIZOAR_SET','Chizoar Set','+40% All Skill EXP Gain',['Chizoar Helmet','Chizoar Bodyplate','Chizoar Scaled Leggings','Chizoar Walkers'],[],[],0,0],
 ['LUSTRE_SET','Lustre Set','+75% Total Damage',['Lustre Veil','Lustre Chestplate','Lustre Scales','Lustre Shieldshoe'],['Lustre Pickaxe','Lustre Logger','Lustre Rod','Lustre Netting','Meaty Traps','Glauss Skull'],['Knuckle Sabers','Slimsharp Fin','Shardsure Leif','Skullslip Hallow'],2,1],
 ['DIABOLICAL_SET','Diabolical Set','+20% Faster Monster Respawning',['Diabolical Headcase','Diabolical Abdomen','Diabolical Trimmed Leg Guards','Diabolical Toe Tips'],['Starfire Pickaxe','Starfire Hatchet','Starfire Rod','Starfire Netting','Royal Traps','Luciferian Skull'],['Diabolical Gauntlet','Diabolical Flesh Ripper','Diabolical Continuit','Diabolical Opticule'],2,1],
 ['TROLL_SET','Troll Set','1.25x Higher Bonuses from Tome',['Thin Veil of the Troll','Trollish Garb','Twisted Scales','Soles of the Troll'],[],[],0,0],
 ['MAGMA_SET','Magma Set','+100% Lab and Divinity EXP Gain',['Magma Core Headdress','Magma Core Wavemaille','Magma Core Battleskirt','Magma Core Lavarunners'],['Dreadlo Pickaxe','Dreadlo Hatchet','Dreadlo Rod','Dreadlo Netting','Egalitarian Traps','Dreadnaught Skull'],['Molten Core Knucklers','Magma Maul','Sediment Core Grunkler','Cattle Core Soothsayer Staff'],3,1],
 ['KATTLEKRUK_SET','Kattlekruk Set','+5 Levels for all Talents',['Skulled Helmet of the Divine','Serrated Chest of the Divine','Spiked Leggings of the Divine','Devious Slippers of the Divine','Eternal Flames of the Divine'],[],['Crackled Skull Destroyer','Skull Lance','Spine Tingler Sniper','Staff of the Undead Plague'],0,1],
 ['MARBIGLASS_SET','Marbiglass Set','+10% All Stats',['Marbiglass Headdress','Marbiglass Tunic','Marbiglass Legplates','Marbiglass Soles'],['Marbiglass Pickaxe','Marbiglass Hatchet','Marbiglass Rod','Marbiglass Netting','Forbidden Traps','Cultist Skull'],['Pentastud Slapper','Elegant Spear','Pristine Longbow','Sparky Marble Staff'],4,1],
 ['GODSHARD_SET','Godshard Set','1.15x Higher Winner Bonuses from Summoning',['Crown of the Gods','Robe of the Gods','Tatters of the Gods','Drip of the Gods'],['Destroyer of the Mollo Gomme','Annihilator of the Yggdrasil','Angler of the Iliunne','Wrangler of the Qoxzul','Containment of the Zrgyios','Crystal Skull of Esquire Vnoze'],['Mittens of the Gods','Massive Godbreaker','Doublestring Godshooter','Magnifique Godcaster'],6,1],
 ['EMPEROR_SET','Emperor Set','Ribbons and Exalted Stamps give 1.20x more multiplier',['Emperor Kabuto','Emperor Sokutai Ho','Emperor Zubon','Emperor Geta','Demented Emperor Opal','Bramble of the Emperor','Gilded Emperor Wings'],[],[],0,0],
 ['PREHISTORIC_SET','Prehistoric Set','2.00x EXP Gain in all World 7 Skills',['Prehistoric Battlehair','Prehistoric Parka','Prehistoric Pantaloons','Prehistoric Bracers'],['Prehistoric Pickaxe','Prehistoric Choppah','Prehistoric Rod','Prehistoric Netting','Prehistoric Traps','Prehistoric Skull'],['Talon of the Hawk','Sabertoothed Gorehacker','Raptor Shardslinger','Beastly Orblauncher'],6,1],
 ['SECRET_SET','Secret Set','1.25x Golden Food Effect',['Mark of Member','Mittens of the Gods','Member Hoodie','Club Member','Vman Nametag'],[],[],0,0]
].map((x,id)=>({id,key:x[0],name:x[1],bonus:x[2],armor:x[3],tools:x[4],weapons:x[5],requiredTools:x[6],requiredWeapon:x[7]}));
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function model(data={}){
 const raw=String(data.OptionsListAccount??data.OptLacc??'');
 const available=raw.length>0;
 const unlocked=new Set(SETS.filter(set=>new RegExp(`(?:^|,)${set.key}(?:,|$)`).test(raw)).map(set=>set.key));
 const rows=SETS.map(set=>({...set,unlocked:unlocked.has(set.key)}));
 return {available,rows,unlocked:rows.filter(set=>set.unlocked)};
}
function pills(items){return items.map(item=>`<span>${esc(item)}</span>`).join('');}
function render(host,data){
 const m=model(data),locked=m.rows.length-m.unlocked.length;
 host.innerHTML=`<div class="section-head compact armor-heading"><div><p class="eyebrow">World 3 · Armor Smithy</p><h2>Armor Sets</h2><p>Permanent account bonuses unlocked by completing equipment sets.</p></div><div class="armor-summary"><strong>${m.available?m.unlocked.length:'—'} / ${m.rows.length}</strong><span>${m.available?`${locked} locked`:'set data unavailable'}</span></div></div>${!m.available?'<p class="collection-note">Armor Smithy data was not found in this export.</p>':''}<div class="armor-set-grid">${m.rows.map(set=>`<article class="armor-set-card ${set.unlocked?'unlocked':'locked'}"><header><div><small>Set ${set.id+1}</small><h3>${esc(set.name)}</h3></div><b>${set.unlocked?'Unlocked':'Locked'}</b></header><p class="armor-set-bonus">${esc(set.bonus)}</p><details><summary>Required equipment</summary><h4>Armor and accessories</h4><div class="armor-piece-list">${pills(set.armor)}</div>${set.tools.length?`<h4>Tools <small>Equip ${set.requiredTools}</small></h4><div class="armor-piece-list">${pills(set.tools)}</div>`:''}${set.weapons.length?`<h4>Weapons <small>Equip ${set.requiredWeapon}</small></h4><div class="armor-piece-list">${pills(set.weapons)}</div>`:''}</details></article>`).join('')}</div>`;
}
root.ArmorSets={SETS,model,render};
})(typeof window!=='undefined'?window:globalThis);
