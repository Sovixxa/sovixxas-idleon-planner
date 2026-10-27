'use strict';
window.QolRecommendations=(()=>{
const worlds=[
  {
    "world": 1,
    "blocks": [
      "Codex: Make everything in codex smaller, so you can fit more stuff.",
      "Storage:(if we cant go higher than 1050m size) \"create new stack\" toggle that will create new stacks of 1050m when depositing.",
      "Filter pages: unlimited filter pages.\n-alternative: let us filter entire worlds then UN-filter the items we do want.",
      "Forge: an independent storage that is refilled by your sample size/hr. \n-Make the amount of forge cards dropped scale with bars removed.",
      "Bosses: \"use 150 keys for 150x rewards\" toggle, killing the boss once gives our daily gems/other drops.\n-once the 150 kills are done, let us continue farming bosses normally with reduced gem rate.",
      "Dart/basketball trophy: buyable with points. \n-Adjust location of \"you have to wait X seconds to play again\". it currently gets blocked by buffs.",
      "Friend bonuses: Add a reward/buff for sending your bonuses that scales with the level difference between you.",
      "Dungeon: auto-trash feature for gear less powerful than equipped. \n-\"desired enhancer traits\" tool that will continue auto-rolling enhancers on your equipment until you get desired trait.\n-\"desired RNG traits\" tool that will auto-use RNG balls and select the traits you want when it has multiple options.",
      "Keychains: perfect keychain shop, spend a high amount of flurbos for: I.E. 6/6 mob respawn keychain.",
      "Guilds: remove limit on guild bonuses so GP doesn't become useless; add more bonuses related to endgame content.\n-(idea) Guilds dont have much comradery feeling, create a weekly guild-instanced dungeon/island to kill a high hp boss together for rewards/buff.",
      "Talent points: add a reward/buff for excess points while all talents maxed.",
      "Pet+ Shop: discount should be capped at 10-15%, or you're increasing community resentment. (IE paid 4k then its 2k a few days later)\n-When we buy the +version of a pet, it should change the pet from untradable to tradeable.\n-some way to grind green gems in game. I suggest a 10 regular gem>1 green gem conversion system."
    ]
  },
  {
    "world": 2,
    "blocks": [
      "Arcade: let us spend X gold balls to view all arcade bonuses, to max/super/omega things that aren't on rotation.\n-Update random rewards (obols/fragments/resource items/balloons/upgrade stones/cards) are all near useless. \n-Let us save up red dice instead of only having one on the screen at a time.\n-Increase the maximum ball launching speed.",
      "Alchemy: Rebalance liquid spread. The second liquid is almost useless bubble wise and shop wise. (my talent point suggestion above would be a good use for liquid 2 to push the talent point bubbles)",
      "Fish filter: let us filter fish for easier alchemy/stamp/anvil crafting.\n-Alternative: Make each of the fishing nodes only give one of the fish per group.",
      "Killroy: rotate monsters better for equinox challenge, \n-Alternative: let us spend gems/skulls to choose which monster to fight. \n-time squish/speedup.",
      "Minibosses: Fix not being able to craft biggie and doot eyes from storage.\n-Most ideal: Loot multiplier based on items used. I.E. drop stack of 10 biggie eyes, kill him once, get 10x drops.\n-Alternative: Drop a stack of 10 eyeballs and he will continuously respawn when killed 10 times.\nDoot- add a tool within the map that holds your dootophone (if possible also do 10 eyes used=10X drops)\n-Speed up the spawn ground-fire animation.",
      "Islands: daily auto collection for bottles and trash. \n-Uncap shimmer point max at 40 per week. \n-Let us trade X hours of time candy for the nothing trophy.",
      "Weekly town boss: Let us kill it once for 7X the rewards.\n-Rework the shop to permanently feature silver and gold stopwatches, add all hats into the shop rotation.",
      "Clickers: The same way equinox has \"Time to next full bar\", add \"time to next megafeather/megafish\".\n-Make a tiny UI bubba popup when his pats refresh, i suggest a sad looking bubba near the bottom left chat bubble.",
      "Dungeon: \"end wait time\" button for levels. \n-Fix the crashing issue when in large parties.",
      "Post Office: something to make clicking silver pens not tedious, also w6/w7 boxes when?\n-make colosseum tickets drop from all orders, ideally in higher amounts per order level."
    ]
  },
  {
    "world": 3,
    "blocks": [
      "Construction: add refinery tab to construction codex. \n-cog autotrash option: if your lowest EXP cog on the board gives 100% exp, any new cog less than 100% exp is autotrashed while you have exp selected view toggle. \n-if possible fix whitescreening.",
      "VIP library/automation arm: let us spend 100 books instead of 5 for a max level VIP talent. \n-Add more VIP talents, our star talents are still half empty and we have plenty of VIP %.",
      "Salt lick: more bonuses from the newer salts/critters/souls.\n-reduce salt costs, they got changed super high when you added cooking mastery.",
      "3D printer: we have more salts to manage and more things to spend atoms on, let us have a third printer slot.",
      "MSA/trapping drone: Trapper drone \"all quick\" button to match MSA. if you have \"create new stack\" toggle from w1 suggestions, you get as many stacks of critters/souls as your storage can hold, with excess being atomed/dropped at your feet.\n-menu for trap vacuum from rift to adjust how often it collects, IE it collects our traps every 20 minutes. (to prevent breaking storage, this would not create multiple stacks) \n-once glimbo unlocked: add a \"glimbo deposit\" toggle so all tuttles, applicable shinies, and deepsouls do a partial deposit towards your next trade.\n-Make the cards dropped scale with amount of critters/souls collected.",
      "TD: Fix the bug that leaves the wave with hp left even when all mobs are dead.\n-time speedup option past level 200.",
      "Prayers: we have world 5-7 souls and no prayers to buy with them.\n-many prayers are outdated/never used, rework them.",
      "Equinox: let us reset points."
    ]
  },
  {
    "world": 4,
    "blocks": [
      "Cooking: You added \"small mode\" for storage, do the same for the cooking UI.\n-Within that UI make the meals you're currently cooking be highlighted.\n-Make click-holding balloons speed up the same as item-crafting. \n-let us craft higher tier balloons out of lower tier balloons, same as time candy.",
      "Breeding: let us either click and hold a stack of eggs to level up rarity, or use larger stacks.\n-let us auto-trash eggs for exp/genes, the same as it was in idle skilling.\n-Make shiny/breeding pets show their shiny/breeding level at the bottom right instead of their power.\n-Add enough fenceyard slots that we can level all shiny mobs at the same time.",
      "Lab: trade in X amount of chips for 1 chip of our choice tool.\n-Increase the number of chip slots per character, the last slot gained is from lab level 75, endgamers are now in the 900+ level range. \n-rework the lesser chips to be more useful.",
      "Gem shop: Add elite class swap token to world 4 gem shop or dailies/resets. Many players would like to swap for masterclass purposes; and +1 slab."
    ]
  },
  {
    "world": 5,
    "blocks": [
      "Gaming: Needs a high performance mode or hide squirrel nuts/nuggets dug option.\n-Log: Rework to have game/charge mode toggle in import tab. In game mode, it functions like normal. In charge mode, it functions like the overstim meter in spelunking: it gains diminishing charge over time that gives a one time multiplier to bits gained from next harvest all.\n-Squirrel: Add a toggle for squirrel to have awake/asleep modes. Awake mode functions like normal. In asleep mode, the squirrel is now stationary and collects nuts passively at lowered rate. Clicking him opens the shop to spend nuts or to toggle into awake mode.\n-Snail: Add consecration for pre-25 snail. Uncap from 49 now that we have a menagerie mission for bits, as well as divinity blessings and hole to infinitely spend bits on.",
      "Hole: \"switch all buckets\" toggle. \n-Add measurements to spend the unused rupies/ores/harp notes on or schematics that scale off of them.\n-Gambit needs a difficulty squish to not be taking 30+ minutes."
    ]
  },
  {
    "world": 6,
    "blocks": [
      "Sneaking: \n-More inventory slots. \n-Make a separate inventory for gold charms, or let us lock inventory slots so we cannot accidentally trash our gold charms/best items.\n-the sneaking flower buff from coral only stacks at normal pace when sneaking is open. if intended, let us know for clarity. if not intended please fix so flowers stack normally when sneaking is closed. \n-Let us see our buffs when sneaking window is open, IE: we can see our RG's orb so we know when its about to end.\n-Make \"sneaking auto trash\" not trash symbols. \n-Let us attempt to tier up symbols like obols.\n-Adjust gems to coagulate into one slot to reduce inventory burden.\n-Add equipped item presets, so we can swap between jade farm/flower accumulation/door breaking builds instantly.",
      "Farming: \n-Add farming to codex so we can collect crops/purchase market from anywhere.\n-Add a filter for which crops we give for a bean trade in so we don't have to restack our nightmarket GMO's every trade.\n(People have told me this would be too strong for endgamers because we could spam bean trades with saved up tickets, my counterargument is newer players could also catch up much faster; QOL for everyone. I do agree it is very strong, should be a DB unlock.) (Maybe have it give a reward of 100 tickets to help new players)",
      "Summoning: the only platform that doesn't lag on endless summoning is web. fix if possible.\n-switching from different platforms to web nukes your spelunking stamina, fix if possible.\n-let newer steam accounts log into web.\n-add a \"dont claim exp\" toggle in summoning. the meta is holding summoning exp until a ballot/meritocracy boost, accidentally claiming it feels bad.",
      "Emperor: make reward from highest difficulty killed permanent, so we can farm cards/items/vman speedrun/AC-kill without losing bonuses.\n-Give the emperor a menu inside his room with 2 options: fight again/next difficulty",
      "Masterclasses: \n-need a damage boost to kill w7 mobs. I suggest a 4th sign at equinox broadbass \"all masterclass damage is increased by X in the shimmerfin deep\"\n-need prisma/exalt refund mechanic. I suggest the gold mystery cylinder from spelunking.",
      "DB: change tombstone so graveyard mobs spawn at the stone. If you can't do that, create toggle in grimoire that forces DB to prioritize graveyard mobs.",
      "WW: Same concept but for reindeer, spawn it at the cross or give focus toggle.\n-give us a toggle to change the compass UI to be like grimoire/tesseract UI.\n-class/account level is more important than ever (legend talents, menagerie mission) let WW into w7, create w7 abominations, so we can start farming medallions and kill abominations for more class exp from WW talents.",
      "AC: change yellow crystal to buff multikill/mob respawn. AC isn't even allowed in w7 (or is it? not sure because im not resetting my emperor to 0) which is where anyone could even use exp.\n-Make the crystal save color/location so that if we leave a map and return, its still in place.",
      "RG:\n-Rebalance nodes with how useful that resource is. I.E. we have 3 coconut nodes in w2, but only one coconut upgrade that is capped at 10 levels.\n-Change the orblet shop so we can choose to spend 320 orblets to guarantee a glorified outpost.\n-Change \"empty\" nodes so if they will be empty before your reset they will refill, even if you dont look at your map.\n-Change the peaceful militia bonus to an earlier shelf.\n-Rework Savage Strongholds to not delete resources, have normal/slightly-boosted collection rate, and be able to collect from 2 resource nodes at the same time. (or double collect the same node)\n-Fix Joe the equinox farmer.\n-Move all units toggle. The meta is to place all moveable units on one outpost and support camp it to powerlevel ranks. \n-Make priests unlock at earlier kingdom sovereignty level; ideally by removing knights and making guards level military rank.\n-Add a \"switch all outpost units\" toggle, so we can easily swap between setups.\n-Add a \"outpost preset\" button where we can set a desired outpost-node connection setup. Then add \"focus-collection\" toggle. When toggled, you click a resource node, every outpost that has enough range will instantly connect to it. Once you empty all the high capacity nodes, one click of outpost preset and your connections snap back to normal.",
      "Rework excess masterclass defense/accuracy bonuses to some of the following:\nAC-\n-Liquid rate/sigil rate/alchemy exp/daily particle upgrades/daily sigil syrup.\n-lab exp/lab chip expansion/chip trade-in unlocked.\n-summoning exp/essence multiplier/extra summoning lives/extra damage to stone bosses/gambit difficulty squish unlocked.\nWW-\n-higher chance/guarantee for stat on crafted item.\n-auto-deposit anvil items when at max capacity.\n-more base shinies per trap/trapping exp/adjustable trap vacuum unlocked.\n-gem coagulation/gold charm multiplier/increased sneaking inventory unlocked.\nDB-\n-cooking eff/cooking exp/cooking mastery exp.\n-farming exp/overgrowth chance/daily instagrows/market discount/magic bean %/land rank exp %/farming in codex/bean trade in rework unlocked.\nRG-\n-weekly skull stipend should scale better/cost less. \n-log/squirrel gaming reworks unlocked.\n-snail uncap unlocked."
    ]
  },
  {
    "world": 7,
    "blocks": [
      "Meritocracy: its been almost a year so we know what gets voted for and what doesn't, remove/rework/buff the options that always lose.\n-Do the same for w2 ballot.",
      "Legend talents: Add a display when a masterclass shop is open that shows remaining daily discounts.",
      "Spelunking: Fix no-hole spelunking bug.\n-Make Grand Discovery potions ineligible to drop from 5x depths.\n-Make yellow stamina refund potion load in with an amount equal to characters brought and be ineligible to drop from 5X depths. \n-Rework the potions that nobody uses: (hole highlight, 2 depth hammer aoe). \n-Now that we have manic mode, make a setting for auto-mode that we can set max hammer used so that manic mode can stamina-efficiently be done on auto.\n-New setting for auto mode to clear 5x depths until it finds a potion before descending.\n-Disable auto mode from being able to use the orange amber elixir, or let us adjust % total stamina level we want it to use them.\n-Rework auto using the green POW elixir too early. as soon as it detects one resist, it will use them. Change it to only start using them once heavy resistance is detected.\n-Add \"use next rope at X or less stamina\" setting for auto mode\n-Enable the 50 level-skip from menagerie to work for manic mode. manic gets stopped due to pow just like normal depth runs; so this wouldn't give some insane advantage, its just huge QOL due to manic mode being way more tedious than normal spelunking.",
      "Research: Add \"research minigames\" to codex, so that we can do Sushi, Minehead, and Jelly from anywhere.\n-Fix the insight UI to show us \"time to level up\" for observations we have monocles on.\n-Let us refund points from multi point tiles; I.E. if we have 4/4 points in something we can reduce to 1/4 as long as it wouldn't break something in the game.\n-let us save shape layouts to instantly swap between.\n-Fix I6 tile (damage from sigil levels doesnt work)",
      "Sushi: Now that we have a sushi mission in menagerie, let us combine sushi as high as we want even if it doesn't give us an ingame bonus.\n-Lock fireplace option, as well as \"change all fireplaces\" toggle (locked dont get changed)\n-Trash button so we can throw away unwanted sushi",
      "Minehead: Much improved from how it used to be,  now we just need more bonuses on the later difficulties.",
      "Jelly: Add a feature where we can do test operations that dont grant bloodcells so we can test damage builds without using a 3rd party optimizer.",
      "Zenith market: make a toggle to only zenith actively farmed statues, so we dont accidentally cluster a screens worth of dragon statues for example.\n-Nerf the cost to max zenith statue% and RG collection. These cost 1.2Q and 51QQ clusters to max, respectively. We will never achieve this without a zenith discount system, and its pointless to create a discount system for only 2 of the upgrades.",
      "Clamworks: Add an option to guarantee a promotion that scales relative to the gamble. IE if it costs 100T pearls for a 5% promotion chance, give a 2000T pearl guarantee promotion option.",
      "Glimbo: noted earlier, let us do partial trades, IE \"You have deposited 500B out of the 1T items for this trade\"",
      "Menagerie: I've heard it is extremely unfriendly to f2p, ease the entering curve so f2p endgamers aren't more behind than ever.\n-Give us the ability to refund doublers. If it can't be the golden cylinder from spelunking, make it cost lumi's.\n-on that note, remove shadowcaps on things that we can double or make it that we cannot apply doublers to shadowcapped upgrades.\n-Give exotic market a toggle for applying organic stickers so people don't accidentally apply them.\n-the orion and poppy menagerie upgrades wont realistically help us push those missions, need to be stronger/affect all upgrades.\n-fix the button for the singularity spirals on coral kid, it only transmutes half of the time, and make the spirals auto deposit to storage.\n-this transmute button issue is a \"click-through\" problem where you can click behind the current UI on the screen. fix this wherever it exists in the game."
    ]
  }
];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(host){
 host.innerHTML='<section class="qol-recommendations"><div class="section-head compact"><div><p class="eyebrow">Misc · Community wishlist</p><h2>QOL Recommendations</h2><p>Make the game more idle. Reduce chores. Reduce RNG.</p><p class="qol-author">Masterlist written by <strong>thespease</strong>.</p></div></div><label class="qol-search">Find a suggestion<input type="search" placeholder="Search topics or suggestions…" aria-label="Search QOL recommendations"></label><p class="muted">Proposed game changes, grouped by world.</p><aside class="qol-lava"><strong>LAVA, IF YOU’RE READING THIS…</strong><span>The idle part of IdleOn is doing a lot of heavy lifting. Help us out.</span></aside><div class="qol-worlds"></div><p class="qol-no-results" hidden>No matching suggestions.</p></section>';
 const list=host.querySelector('.qol-worlds');
 function draw(query=''){
 const needle=query.trim().toLowerCase();let count=0;
 list.innerHTML=worlds.map(({world,blocks})=>{const matches=blocks.filter(b=>!needle||b.toLowerCase().includes(needle)||('world '+world).includes(needle));count+=matches.length;if(!matches.length)return '';return '<details class="qol-world"'+(needle?' open':'')+'><summary><span>World '+world+'</span><small>'+matches.length+' topics</small></summary><div class="qol-topics">'+matches.map(block=>{const lines=block.split('\n');const first=lines.shift();const colon=first.indexOf(':');const heading=colon>0&&colon<90?first.slice(0,colon):'';const intro=heading?first.slice(colon+1).trim():first;return '<article class="qol-topic">'+(heading?'<h3>'+esc(heading)+'</h3>':'')+(intro?'<p>'+esc(intro)+'</p>':'')+(lines.length?'<ul>'+lines.map(line=>'<li>'+esc(line.replace(/^-\s*/,''))+'</li>').join('')+'</ul>':'')+'</article>';}).join('')+'</div></details>';}).join('');
 host.querySelector('.qol-no-results').hidden=count>0;
 }
 host.querySelector('input').addEventListener('input',e=>draw(e.target.value));draw();
}
return {render};
})();
