(()=>{
  'use strict';
  const E=window.JellyEngine;
  const $=id=>document.getElementById(id);
  let state=null,loadedExport=null,lastResult=null,currentArrangement=null,currentStats=null,calibration=null,lastNextMove=null,practice=null;
  let jellyReadyState=null,homeRosterSave=null,homeDecodedPlayers=[];
  let initialUpgradesPending=false,initialPracticePending=false;
  const SESSION_KEY='idleon-jelly-json-session-v3';
  const OBS_KEY='idleon-jelly-observed-clear-v1';
  const REVIVE_KEY='idleon-jelly-revive-delay-v1';
  const TRAINING_KEY='idleon-jelly-training-playbook-v1';
  const QUICK_NOTES_KEY='idleon-planner-quick-notes-v1';
  const QUICK_NOTES_COLLAPSED_KEY='idleon-planner-quick-notes-collapsed-v1';
  const QUICK_NOTES_POSITION_KEY='idleon-planner-quick-notes-position-v1';

  $('version').textContent='engine v'+E.VERSION;

  function initializeQuickNotes(){
    const panel=$('quickNotes'),input=$('quickNotesInput'),toggle=$('quickNotesToggle');
    if(!panel||!input||!toggle)return;
    const header=panel.querySelector('.quick-notes-head');
    const place=({x,y},save=false)=>{
      const maxX=Math.max(0,window.innerWidth-panel.offsetWidth),maxY=Math.max(0,window.innerHeight-panel.offsetHeight);
      const position={x:Math.round(Math.min(Math.max(0,x),maxX)),y:Math.round(Math.min(Math.max(0,y),maxY))};
      panel.style.left=position.x+'px';panel.style.top=position.y+'px';panel.style.right='auto';
      if(save)try{localStorage.setItem(QUICK_NOTES_POSITION_KEY,JSON.stringify(position));}catch(_){/* storage is optional */}
    };
    const setCollapsed=collapsed=>{
      panel.classList.toggle('collapsed',collapsed);
      toggle.setAttribute('aria-expanded',String(!collapsed));
      toggle.title=collapsed?'Expand notes':'Collapse notes';
      toggle.querySelector('[aria-hidden]').textContent=collapsed?'+':'−';
      toggle.querySelector('.sr-only').textContent=collapsed?'Expand notes':'Collapse notes';
      if(panel.style.left){const bounds=panel.getBoundingClientRect();place({x:bounds.left,y:bounds.top});}
      try{localStorage.setItem(QUICK_NOTES_COLLAPSED_KEY,String(collapsed));}catch(_){/* storage is optional */}
    };
    try{
      input.value=localStorage.getItem(QUICK_NOTES_KEY)||'';setCollapsed(localStorage.getItem(QUICK_NOTES_COLLAPSED_KEY)==='true');
      const position=JSON.parse(localStorage.getItem(QUICK_NOTES_POSITION_KEY)||'null');
      if(Number.isFinite(position?.x)&&Number.isFinite(position?.y))place(position);
    }catch(_){/* storage is optional */}
    input.addEventListener('input',()=>{try{localStorage.setItem(QUICK_NOTES_KEY,input.value);}catch(_){/* storage is optional */}});
    toggle.addEventListener('click',()=>setCollapsed(!panel.classList.contains('collapsed')));
    let drag=null;
    header?.addEventListener('pointerdown',event=>{
      if(event.button!==0||event.target.closest('button'))return;
      const bounds=panel.getBoundingClientRect();drag={pointerId:event.pointerId,offsetX:event.clientX-bounds.left,offsetY:event.clientY-bounds.top};
      header.setPointerCapture?.(event.pointerId);panel.classList.add('dragging');event.preventDefault();
    });
    header?.addEventListener('pointermove',event=>{if(drag?.pointerId===event.pointerId)place({x:event.clientX-drag.offsetX,y:event.clientY-drag.offsetY});});
    const stopDrag=event=>{
      if(!drag||event.pointerId!==drag.pointerId)return;
      const bounds=panel.getBoundingClientRect();place({x:bounds.left,y:bounds.top},true);drag=null;panel.classList.remove('dragging');
    };
    header?.addEventListener('pointerup',stopDrag);header?.addEventListener('pointercancel',stopDrag);
    window.addEventListener('resize',()=>{const bounds=panel.getBoundingClientRect();place({x:bounds.left,y:bounds.top});});
  }
  initializeQuickNotes();

  function selectWorkspaceTab(name){
    $('panelWorld').classList.add('hidden');
    const tabs={home:['tabHome','panelHome'],optimizer:['tabOptimizer','panelOptimizer'],practice:['tabPractice','panelPractice'],upgrades:['tabUpgrades','panelUpgrades'],bonuses:['tabBonuses','panelBonuses']};
    for(const [key,[button,panel]] of Object.entries(tabs)){
      const active=key===name;$(button).classList.toggle('active',active);$(button).setAttribute('aria-selected',String(active));$(panel).classList.toggle('hidden',!active);
    }
    if(name!=='practice'&&practice?.playing)stopPracticePlayback();
    if(name==='upgrades'&&initialUpgradesPending){initialUpgradesPending=false;renderUpgrades(currentArrangement,currentStats,calibration.scale);}
    if(name==='practice'&&initialPracticePending){initialPracticePending=false;refreshPracticeFevers();refreshPracticeCells();runPractice(true,true);}
  }
  const SKILL_PAGES={
    dailies:{title:'Dailies',world:'Home',copy:'Daily routine, saved availability, and your checklist.'},
    shadowCaps:{title:'Shadow Caps',world:'Misc',copy:''},
    communitySheets:{title:"Community Sheets",world:'Misc',copy:''},
    accountReview:{title:'Account Review',world:'Optimizers',copy:'Review saved progress and plan your next account milestones.'},
    bribes:{title:"Bribes",world:"World 1",copy:"Purchased bribes and account bonuses."},
    classExp:{title:'Class EXP Optimizer',world:'Optimizers',copy:'Find Class EXP upgrades and compare measured EXP per hour.'},
    mining:{title:'Mining',world:'World 1',copy:'Mining characters, ore targets, and gain planning will be modeled here.'},smithing:{title:'Smithing',world:'World 1',copy:'Smithing production and material targets will be planned here.',tabs:['forge','anvilUpgrades']},chopping:{title:'Chopping',world:'World 1',copy:'Chopping characters, log targets, and gain planning will be modeled here.'},forge:{title:'Forge & Anvil',world:'World 1',copy:'Forge bars, anvil production, and capacity planning will be modeled here.',parent:'smithing'},anvilUpgrades:{title:'Anvil Upgrades',world:'World 1',copy:'Per-character Anvil speed, XP, capacity, and point investment.',parent:'smithing'},forgeBonuses:{title:'Forge Bonuses',world:'World 1',copy:'Permanent Forge upgrade levels and effects.'},starSigns:{title:'Star Signs',world:'World 1',copy:'Unlocked, aligned, and infinite Star Sign bonuses.',tabs:['constellations']},constellations:{title:'Constellations',world:'World 1',copy:'Constellation completion and Star Chart points.',parent:'starSigns'},stamps:{title:'Stamps',world:'World 1',copy:'Stamp costs, material requirements, and account-wide priority planning will be modeled here.'},statues:{title:'Statues',world:'World 1',copy:'Statue levels, deposits, and account-wide statue bonuses will be modeled here.'},dungeons:{title:'Dungeons',world:'World 1',copy:'Dungeon runs, cards, and reward planning will be modeled here.'},
    alchemy:{title:'Alchemy',world:'World 2',copy:'Alchemy bubbles, vials, and material planning will be modeled here.',tabs:['vials','sigils']},vials:{title:'Vials',world:'World 2',copy:'Alchemy vial levels and permanent bonuses.',parent:'alchemy'},sigils:{title:'Sigils',world:'World 2',copy:'Alchemy sigil charge, boosts, and bonuses.',parent:'alchemy'},votes:{title:'Weekly Votes',world:'World 2',copy:'The currently active weekly vote bonus.'},killroy:{title:'Killroy Prime',world:'World 2',copy:'Permanent bonuses earned through Killroy Prime.'},fishing:{title:'Fishing',world:'World 2',copy:'Fishing characters, catches, and gain planning will be modeled here.'},catching:{title:'Catching',world:'World 2',copy:'Catching characters, cards, and material targets will be modeled here.'},postOffice:{title:'Post Office',world:'World 2',copy:'Post Office boxes, points, and priority planning will be modeled here.',tabs:['poExtras']},poExtras:{title:'Post Office Extras',world:'World 2',copy:'Post Office completion, streak, and miscellaneous saved progression.',parent:'postOffice'},islandExpeditions:{title:'Island Expeditions',world:'World 2',copy:'Permanent bonuses earned from the expedition islands.'},arcade:{title:'Arcade',world:'World 2',copy:'Arcade ball upgrades and account bonus planning will be modeled here.'},obols:{title:'Obols',world:'World 2',copy:'Obol inventory, family and character layouts, and bonuses will be modeled here.'},
    construction:{title:'Construction',world:'World 3',copy:'Construction buildings, cogs, and build priorities will be planned here.',tabs:['shrines','printer','refinery']},refinery:{parent:'construction',title:'Refinery',world:'World 3',copy:'Refinery salts and production priorities.'},printer:{title:'3D Printer',world:'World 3',copy:'3D Printer samples, slots, and output.',parent:'construction'},worship:{title:'Worship',world:'World 3',copy:'Worship waves and account bonuses.',tabs:['towerDefense']},prayers:{title:'Prayers',world:'World 3',copy:'Prayer loadouts, benefits, and tradeoffs.',tabs:['prayerOptimizer']},prayerOptimizer:{parent:'prayers',title:'Optimizer',world:'World 3',copy:'Rank prayer loadouts by their net effect for a chosen activity.'},saltLick:{title:'Salt Lick',world:'World 3',copy:'Salt Lick levels and permanent account bonuses.'},shrines:{title:'Shrines',world:'World 3',copy:'Shrine levels, placement, and active bonuses.',parent:'construction'},deathNote:{title:'Death Note',world:'World 3',copy:'Monster kills, skull ranks, and multikill progression.'},atomCollider:{title:'Atom Collider',world:'World 3',copy:'Atom upgrade levels and permanent effects.'},armorSets:{title:'Armor Sets',world:'World 3',copy:'Armor Smithy sets and their permanent account bonuses.'},trapping:{title:'Traps',world:'World 3',copy:'Trapping critters, traps, and collection timing will be modeled here.'},towerDefense:{title:'TD',world:'World 3',copy:'Worship tower-defense setups, waves, and soul rewards will be modeled here.',parent:'worship'},equinox:{title:'Equinox',world:'World 3',copy:'Equinox challenges and permanent account bonus planning will be modeled here.'},
    lab:{title:'Lab',world:'World 4',copy:'Lab chip, jewel, and connection planning will be modeled here.'},breeding:{title:'Breeding',world:'World 4',copy:'Breeding pets, spices, and arena planning will be modeled here.',tabs:['petArena','arenaTeams','spiceTeams','shinyPets']},shinyPets:{title:'Shiny Pets',world:'World 4',copy:'Account-wide bonuses from combined shiny pet levels.',parent:'breeding'},cooking:{title:'Cooking',world:'World 4',copy:'Cooking meals, kitchens, and recipe priorities will be modeled here.'},arenaTeams:{title:'Arena Setup',world:'World 4',parent:'breeding',copy:'Recommended pet arena teams and ability timing.'},spiceTeams:{title:'Best Spices',world:'World 4',parent:'breeding',copy:'Territory foraging teams and spice focus plans.'},petArena:{title:'Pet Arena',world:'World 4',copy:'Pet Arena teams, bonuses, and reward planning will be modeled here.',parent:'breeding'},rift:{title:'Rift',world:'World 4',copy:'Rift progression, rewards, and challenge planning will be modeled here.'},tome:{title:'Tome',world:'World 4',copy:'Tome rankings, completion score, and account bonuses.'},
    divinity:{tabs:['coralKid'],title:'Divinity',world:'World 5',copy:'Divinity gods, links, and style planning will be modeled here.'},sailing:{title:'Sailing',world:'World 5',copy:'Sailing boats, artifacts, and island routes will be modeled here.'},gaming:{title:'Gaming',world:'World 5',copy:'Gaming plants and upgrade planning will be modeled here.',tabs:['gamingPalette']},gamingPalette:{title:'Gaming Palette',world:'World 5',copy:'Gaming palette levels and their account-wide bonuses.',parent:'gaming'},upgradeVault:{title:'Upgrade Vault',world:'Misc',copy:'Upgrade Vault levels and permanent bonuses.'},hole:{title:'The Hole',world:'World 5',copy:'The Hole progression and every decoded cavern mechanic.',tabs:['holeSchematics','holeMajik','holeStudies','holeMeasurements','holeMonuments','holeBell','holeWell','holeFountain','holeResources','holeHarp','holeLamp','holeDawgDen','holeJars','holeGambit','holeTrench','holeCove']},holeSchematics:{title:'Engineer',world:'World 5',copy:'Engineer schematics and their permanent effects.',parent:'hole'},holeMajik:{title:'Bonuses',world:'World 5',copy:'Cosmo’s Conjuror bonuses.',parent:'hole'},holeStudies:{title:'Studies',world:'World 5',copy:'Bolaia’s study levels and bonuses.',parent:'hole'},holeMeasurements:{title:'Measure',world:'World 5',copy:'Minau’s measurements and account scaling.',parent:'hole'},holeMonuments:{title:'Monuments',world:'World 5',copy:'Bravery, Justice, and Wisdom bonuses.',parent:'hole'},holeBell:{title:'Bell',world:'World 5',copy:'Bell improvements and permanent bonuses.',parent:'hole'},holeWell:{title:'Well',world:'World 5',copy:'Sediment bars, expansions, and buckets.',parent:'hole'},holeFountain:{title:'Fountain',world:'World 5',copy:'Fountain upgrade levels and bonuses.',parent:'hole'},holeResources:{title:'Resources',world:'World 5',copy:'Motherload, Hive, and Evertree layers.',parent:'hole'},holeHarp:{title:'Harp',world:'World 5',copy:'Harp strings, levels, and note resources.',parent:'hole'},holeLamp:{title:'Lamp',world:'World 5',copy:'Lamp wishes and completed wish counts.',parent:'hole'},holeDawgDen:{title:'Dawg Den',world:'World 5',copy:'Dawg Den score progression.',parent:'hole'},holeJars:{title:'Jars',world:'World 5',copy:'Jar types and permanent bonuses when present in the save.',parent:'hole'},holeGambit:{title:'Gambit',world:'World 5',copy:'Gambit challenges, scores, and rewards.',parent:'hole'},holeTrench:{title:'Trench',world:'World 5',copy:'Bottomless Trench depth and casting progress.',parent:'hole'},holeCove:{title:'Crystal Cove',world:'World 5',copy:'Crystal Glunko Cove shapes and upgrades.',parent:'hole'},slab:{title:'Slab',world:'World 5',copy:'Slab collection progress and every account bonus.'},
    farming:{title:'Farming',world:'World 6',copy:'Farming crop, mutation, and growth planning will be modeled here.',tabs:['nightMarket']},sneaking:{title:'Sneaking',world:'World 6',copy:'Sneaking teams, floors, and loot planning will be modeled here.',tabs:['jadeEmporium']},summoning:{title:'Summoning',world:'World 6',copy:'Summoning team and essence planning will be modeled here.'},beanstalk:{title:'Beanstalk',world:'World 6',copy:'Golden Food deposits and permanent account-wide Beanstalk bonuses.'},emperorBonuses:{title:'Emperor Bonuses',world:'World 6',copy:'Permanent account bonuses earned from Emperor kills.'},jadeEmporium:{title:'Jade Emporium',world:'World 6',copy:'Jade Emporium purchases and permanent bonus priorities will be modeled here.',parent:'sneaking'},nightMarket:{title:'Night Market',world:'World 6',copy:'Night Market crop upgrades and permanent bonus priorities will be modeled here.',parent:'farming'},
    minehead:{title:'Minehead',world:'World 7',copy:'Minehead production and progression planning will be modeled here.'},spelunking:{title:'Spelunking',world:'World 7',copy:'Spelunking upgrades and route planning will be modeled here.'},research:{title:'Research',world:'World 7',copy:'Research nodes, observation layouts, and account bonus priorities will be modeled here.'},sushi:{title:'Sushi',world:'World 7',copy:'Unique Sushi unlocks and permanent effects.'},button:{title:'The Button',world:'World 7',copy:'Button press categories and their account bonuses.'},coral:{parent:'coralReef',title:'Coral',world:'World 7',copy:'Coral collection and upgrade planning will be modeled here.'},clamworks:{title:'Clamworks',world:'World 7',copy:'Clam work levels, promotions, and pearl bonuses.'},meritocracy:{title:'Meritocracy',world:'World 7',copy:'World 7 ballot bonuses and current selection.'},bigFish:{title:'Advice Fish',world:'World 7',copy:'Advice Fish levels and permanent bonuses.'},coralKid:{parent:'divinity',title:'Coral Kid',world:'World 7',copy:'Coral Kid upgrade levels and account bonuses.'},coralReef:{tabs:['dancingCoral'],title:'Coral Reef',world:'World 7',copy:'Daily coral progression and reef upgrades.'},dancingCoral:{parent:'coralReef',title:'Dancing Coral',world:'World 7',copy:'Purchased coral dances and permanent bonuses.'},minigames:{title:'Minigames',world:'Misc',tabs:['hoops','darts']},hoops:{parent:'minigames',title:'Hoops',world:'World 7',copy:'Hoops scores, levels, and permanent bonuses.'},darts:{parent:'minigames',title:'Darts',world:'World 7',copy:'Darts scores, levels, and permanent bonuses.'},zenithMarket:{title:'Zenith Market',world:'World 7',copy:'Zenith Cluster upgrades and permanent bonuses.'},nametags:{title:'Gallery',world:'World 7',copy:'Nametag and Trophy Gallery progress will be modeled here.'},legendTalents:{title:'Legend Talents',world:'World 7',copy:'Account-wide Legend Talent levels and bonuses.'},
    loadouts:{title:'Loadout Optimizer',world:'Optimizers',copy:'This cross-skill tool will compare gear, cards, talents, and gains for any selected character and skill.'},characters:{title:'Characters & Talents',world:'Account',copy:'Character classes, talent loadouts, and account-wide assignments will be modeled here.'},cards:{title:'Cards',world:'Account',copy:'Character card loadouts and the complete card collection.'},guilds:{title:'Guilds',world:'Account',copy:'Guild bonuses, tasks, and contribution planning.'},tasks:{title:'Tasks / Achievements / Merit Shop',world:'Account',copy:'World tasks, achievements, and merit purchases.'},events:{title:'Event Bonuses',world:'Account',copy:'Permanent bonuses earned from seasonal and limited events.'},eventShop:{title:'Event Shop',world:'Account',copy:'Permanent Event Shop purchases and missing rewards.'},familyBonuses:{title:'Family Bonuses',world:'Account',copy:'Class family bonuses calculated from the imported roster.'},gemShop:{title:'Gem Shop Upgrades',world:'Account',copy:'Permanent account upgrades purchased from the Gem Shop.'},friendBonuses:{title:'Friend Bonuses',world:'Account',copy:'Active bonuses received from other players.'},goldFood:{title:'Gold Food Bonuses',world:'Account',copy:'Golden foods, Beanstalk quantities, and their combined account bonuses.'},orion:{title:'Orion',world:'Clickers',copy:'Feather clicker progression and permanent account bonuses.'},poppy:{title:'Poppy',world:'Clickers',copy:'Fishing clicker progression and permanent account bonuses.'},bubba:{title:'Bubba',world:'Clickers',copy:'Bubba clicker progression and permanent account bonuses.'},masterclasses:{title:'Masterclasses',world:'Masterclasses',copy:'All four Masterclass progression systems and account bonuses.'},compass:{title:'Compass',world:'Masterclasses',copy:'Wind Walker Compass upgrades and bonuses.'},grimoire:{title:'Grimoire',world:'Masterclasses',copy:'Death Bringer Grimoire upgrades and bonuses.'},tesseract:{title:'Tesseract',world:'Masterclasses',copy:'Arcane Cultist Tesseract upgrades and bonuses.'},royalArmory:{title:'Royal Armory',world:'Masterclasses',copy:'Royal Guardian Armory, outposts, resources, statues, and Orblet Market.'},buffs:{title:'All Bonuses',world:'Misc',copy:'Search account bonuses across every decoded source.'},pets:{title:'Pets',world:'Misc',copy:'Owned, upgraded, and borrowed companions with their active bonuses.'},credits:{title:'Credits & Resources',world:'About',copy:'People, guides, and community resources that helped shape this planner.'}
  };
  SKILL_PAGES.weeklyBosses={title:'Weekly Bosses',world:'World 2',copy:'Weekly boss progress and rewards.'};
  SKILL_PAGES.hatRack={title:'Hat Rack',world:'World 3',copy:'Hat Rack collection and bonuses.'};
  SKILL_PAGES.quests={title:'Quests',world:'Misc',copy:'World-by-world quest progress across your imported characters.'};
  const BASELINES={
    mining:['Mine ore to raise efficiency and produce materials for tools, gear, stamps, and upgrades.','Efficiency, multi-ore chance, speed, tool tier, sample rate.','Compare ore targets, equipment, cards, star signs, and character assignment.'],
    smithing:['Spend produced materials at the Anvil to craft equipment and tools.','Anvil production, points, recipes, material stock, tool upgrades.','Track craft requirements and route materials from gathering skills.'],
    forge:['Smelt ore into bars through the Forge, then use bars for crafting and upgrades.','Ore input, bar queues, capacity, forge speed, output stock.','Flag bottleneck bars and calculate refill and collection timing.'],
    chopping:['Chop logs for crafting, alchemy, stamps, and construction-related demand.','Efficiency, chopping speed, multi-log chance, tool tier, sample rate.','Compare tree targets and the build that produces the best useful sample.'],
    stamps:['Collect and upgrade stamps for account-wide stat bonuses using coins and materials.','Unlocked stamps, current levels, upgrade costs, missing materials.','Rank affordable upgrades by their account-wide value per cost.'],
    statues:['Deposit statues for character and account-wide bonuses.','Statue levels, deposited progress, gold and onyx status, bonus values.','Show the next statue level and which statue upgrades are most useful.'],
    goldFood:['Golden foods provide bonuses based on their stored or equipped quantities, with permanent account progress through the Beanstalk.','Owned golden foods, inventory quantities, Beanstalk totals, tiers, and resulting bonuses.','Combine every account source and show which golden food gives the most useful next improvement.'],
    alchemy:['Discover bubbles and vials, brew liquids, and spend resources on permanent bonuses.','Cauldron progress, liquids, bubbles, vials, atom costs.','Show the next high-value bubble, vial, or liquid upgrade for the chosen goal.'],
    fishing:['Catch fish used by crafting, alchemy, cooking, and upgrade costs.','Fishing efficiency, speed, multi-catch chance, rod tier, sample rate.','Compare fishing spots and character loadouts for the required catch.'],
    catching:['Catch bugs and critters for crafting, alchemy, traps, and account upgrades.','Catching efficiency, speed, multi-catch chance, net tier, sample rate.','Match bug targets to current material demand and sample needs.'],
    postOffice:['Turn in daily boxes and spend points for permanent character and account bonuses.','Available boxes, streaks, points, box levels, turn-in requirements.','Surface unclaimed boxes and recommend point allocation by objective.'],
    arcade:['Use arcade balls for random rewards and permanent arcade upgrade progress.','Balls, upgrade levels, shop unlocks, accumulated bonuses.','List available purchases and their account-wide effect.'],
    construction:['Build structures, manage cogs, and produce resources that unlock World 3 systems.','Building levels, build rates, cog grid, construction EXP, resources.','Assign characters and cogs to the highest-impact construction target.'],
    refinery:['Convert base materials into salts used across advanced crafting and upgrades.','Salt ranks, production rates, input stock, auto-refine settings.','Detect salt shortages and recommend rank versus production priorities.'],
    printer:['Print resources from saved samples to supply crafting and upgrade demand.','Samples, printer slots, print multipliers, atom capacity, output rate.','Assign slots to the materials that remove the next account bottleneck.'],
    worship:['Charge skulls, collect souls, equip prayers, and progress through worship systems.','Skulls, charge, soul totals, prayer slots, worship level.','Plan charge collection, skull upgrades, and prayer tradeoffs.'],
    towerDefense:['Use Worship towers and waves to earn souls and unlock higher tower-defense progress.','Tower levels, maps, wave records, skull souls, reward thresholds.','Record setups and identify the next wave or tower upgrade target.'],
    trapping:['Place traps and collect critters for crafting, upgrades, and alchemy needs.','Trap slots, critter catches, trap duration, capacity, collection time.','Schedule collections and choose traps around the current material deficit.'],
    lab:['Place characters in the Mainframe to activate chips, jewels, and account bonuses.','Connections, active bonuses, chips, jewels, lab levels, link ranges.','Find a character layout that activates the most valuable bonuses.'],
    breeding:['Collect pets, unlock territories, and obtain spices for Cooking and pet systems.','Pets, genetic upgrades, territory progress, spice production, eggs.','Prioritize pet unlocks and spice sources required for the next meal.'],
    petArena:['Build pet teams for arena fights and rewards tied to the breeding system.','Available pets, team effects, arena progress, rewards, cooldowns.','Save teams by encounter and identify the missing pet synergy.'],
    cooking:['Use kitchens, recipes, and spices to level meals with account-wide bonuses.','Meal levels, kitchen progress, spices, ladles, recipe unlocks.','Rank meals and kitchen upgrades by the value of their next level.'],
    rift:['Complete Rift challenges to unlock permanent account mechanics and bonuses.','Current Rift, challenge progress, Rift rewards, active unlocks.','Show the next requirement and the account benefit it unlocks.'],
    divinity:['AFK at the altar to earn points, unlock gods, and link their blessings.','God unlocks, offerings, styles, links, blessings, Divinity level.','Recommend active links and the next offering or blessing to pursue.'],
    sailing:['Send boats to islands for chests, artifacts, loot, and permanent bonuses.','Boat levels, routes, chest progress, artifacts, travel speed.','Recommend routes, boat upgrades, and artifact targets.'],
    gaming:['Harvest plants and spend bits on upgrades that improve the gaming loop.','Plant growth, bits, sprinkler and chemical progress, upgrade levels.','Plan harvest timing and the next bit purchase.'],
    hole:['Progress through The Hole caverns and its related upgrades and bonuses.','Cavern progress, unlocks, currency, schemes, active bonuses.','Show blocked unlock requirements and the next useful cavern investment.'],
    farming:['Grow crops, advance mutations, and collect produce for World 6 progression.','Crop levels, growth, mutations, produce, depot bonuses.','Plan harvest timing, mutation goals, and crop investment.'],
    nightMarket:['Spend Farming crops on permanent upgrades and seed-related progression.','Available crops, Night Market purchases, seed upgrades, reset progress.','Rank crop purchases by their effect on farm growth and account gain.'],
    sneaking:['Send ninjas through floors for jade, loot, stealth progress, and upgrades.','Floor teams, stealth, detection, jade gain, loot, charms.','Place characters for the next floor, chest, or jade goal.'],
    jadeEmporium:['Spend jade from Sneaking on permanent World 6 and account upgrades.','Jade balance, Emporium levels, unlock costs, permanent effects.','Rank affordable Emporium upgrades against your selected account goal.'],
    summoning:['Build teams and use essence to progress through Summoning battles and bonuses.','Essence, unit levels, team layouts, wins, circle unlocks.','Record teams by opponent and recommend the next essence upgrade.'],
    minehead:['Minehead is tracked as its own World 7 progression system.','Production, unlocks, resources, milestones, permanent bonuses.','Map the next milestone and the resource path needed to reach it.'],
    spelunking:['Explore World 7 depths to collect resources and unlock deeper progression.','Depth, route progress, resources, upgrades, milestone rewards.','Compare routes and upgrades for the next depth checkpoint.'],
    research:['Spend Research progress on nodes and layouts that grant account bonuses.','Research nodes, levels, costs, layouts, unlocked effects.','Rank nodes by the gain they provide to your active objective.'],
    coral:['Rescue and upgrade coral reefs for permanent World 7 bonuses.','Fish rescued, reef levels, upgrade costs, unlocked reef effects.','Track missing fish and prioritize the next reef upgrade.'],
    nametags:['Manage Gallery nametags and trophies for account-wide bonuses.','Owned nametags, stacks, trophy selections, Gallery effects.','Show missing stacks and the highest-value Gallery bonus to pursue.'],
    loadouts:['Compare shared gear, cards, talents, foods, and star signs across skill goals.','Character equipment, card sets, talent loadouts, target skill.','Produce switchable loadouts for Mining, Chopping, Fishing, and future skills.'],
    characters:['Review character classes, levels, talents, AFK targets, and roles.','Classes, levels, talent points, current AFK target, activity time.','Assign each character to the task that helps the current account goal.'],
    cards:['Equip cards and card sets, then track Codex collection bonuses.','Owned cards, card levels, sets, Codex completion, equipped cards.','Build loadouts for damage, skilling, drop rate, and AFK progress.'],
    obols:['Arrange obols across family and character boards for account and character bonuses.','Obol inventory, equipped layouts, shapes, upgrades, fragments and rerolls.','Find legal layouts and the strongest available obol improvements.'],
    dungeons:['Run party dungeons for dungeon currency, cards, and account rewards.','Run resources, credits, dungeon cards, bonuses, reward shop.','Track priority purchases and preparation for the next run.'],
    equinox:['Complete Equinox challenges to earn permanent account upgrades.','Challenge state, completed tasks, reward levels, unlock requirements.','Show the nearest unfinished challenge and its reward.'],
    tome:['Track Tome and Slab collection milestones for account bonuses.','Tome progress, Slab entries, missing collection items, rewards.','Prioritize completion targets that unlock the next bonus.'],
    guilds:['Manage guild bonuses, tasks, contribution, and guild-linked progress.','Guild level, bonuses, task status, contribution, shop progress.','Surface available contributions and useful bonus upgrades.'],
    challenges:['Track limited-time events and challenge rewards separately from permanent systems.','Active events, challenge progress, deadlines, reward tiers.','List actionable tasks and time-sensitive reward goals.'],
    masterclasses:['Masterclasses add class-specific progression systems with bonuses that can affect the entire account.','Grimoire for Death Bringer, Compass for Wind Walker, Tesseract for Arcane Cultist, and their saved upgrade levels.','Use the pages here to inspect each masterclass system and feed its permanent bonuses into All Bonuses.'],
    compass:['The Compass is the Wind Walker masterclass progression system.','Compass upgrade levels, currencies, unlocks, and account-wide effects.','Decode the imported save and identify every active or missing Wind Walker bonus.'],
    grimoire:['The Grimoire is the Death Bringer masterclass progression system.','Grimoire upgrade levels, bones, unlocks, and account-wide effects.','Decode the imported save and identify every active or missing Death Bringer bonus.'],
    tesseract:['The Tesseract is the Arcane Cultist masterclass progression system.','Tesseract upgrade levels, tachyons, unlocks, and account-wide effects.','Decode the imported save and identify every active or missing Arcane Cultist bonus.']
  };
SKILL_PAGES.glimbo={title:'Glimbo',world:'World 7',copy:'Swap Meet trades, next costs, and the Upgrade Vault max levels they add.'};
SKILL_PAGES.holeFloors={title:'Floors',world:'World 5',copy:'All 18 Hole caverns in their in-game order.',parent:'hole'};
  SKILL_PAGES.holeBravery={title:'Bravery',world:'World 5',copy:'Bravery Monument rewards and progress.',parent:'hole'};
  SKILL_PAGES.holeJustice={title:'Justice',world:'World 5',copy:'Justice Monument rewards and progress.',parent:'hole'};
  SKILL_PAGES.holeWisdom={title:'Wisdom',world:'World 5',copy:'Wisdom Monument rewards and progress.',parent:'hole'};
  SKILL_PAGES.holeSanctum={title:'Ancient Golem Sanctum',world:'World 5',copy:'Ancient Golem Sanctum progression and rewards.',parent:'hole'};
  SKILL_PAGES.holeAllBonuses={title:'All Hole Bonuses',world:'World 5',copy:'Every decoded Hole bonus in one organized catalogue.',parent:'hole'};
  SKILL_PAGES.hole.tabs.splice(4,0,'holeFloors');
  const HOLE_TAB_GROUPS=[
    {label:'Villagers',keys:['hole','holeSchematics','holeMajik','holeMeasurements','holeStudies']},
    {label:'Hole',keys:['holeAllBonuses','holeFloors','holeWell','holeResources','holeDawgDen','holeBravery','holeBell','holeHarp','holeLamp','holeJustice','holeJars','holeWisdom','holeGambit','holeSanctum','holeFountain','holeCove']}
  ];
  const HOLE_VILLAGER_ICONS={hole:0,holeSchematics:1,holeMajik:2,holeMeasurements:3,holeStudies:4};
  function selectSideNav(name){
    if(name==='coral')name='coralReef';
    window.plannerQoL?.onNavigate(name);
    if(name!=='jelly'&&practice?.playing)stopPracticePlayback();
    if(name==='jelly'&&state?.hasJelly===false){selectSideNav('classExp');return;}
    if(!state)$('workspace').classList.toggle('hidden',!['dailies','classExp','accountReview','loadouts','shadowCaps','communitySheets','credits'].includes(name));
    if(!state)$('inputPanel').classList.toggle('hidden',['loadouts','shadowCaps','communitySheets','credits'].includes(name));
    const selected=SKILL_PAGES[name]?.parent||name;
    for(const id of ['navHome','navJelly',...Object.keys(SKILL_PAGES).map(key=>'nav'+key[0].toUpperCase()+key.slice(1))])$(id)?.classList.toggle('active',id===('nav'+selected[0].toUpperCase()+selected.slice(1)));
    const jelly=name==='jelly';$('operationStatePanel').classList.toggle('hidden',!jelly);$('jellyTabs').classList.toggle('hidden',!jelly);
    document.querySelector('.hero')?.classList.toggle('hidden',name!=='home'&&!jelly);
    if(name==='home'){selectWorkspaceTab('home');return;}
    if(jelly){if(state&&jellyReadyState!==state){renderInitial();jellyReadyState=state;}selectWorkspaceTab('optimizer');return;}
    document.querySelectorAll('.tab-panel').forEach(panel=>panel.classList.add('hidden'));$('panelWorld').classList.remove('hidden');renderWorldPage(name);
  }
  $('tabHome').addEventListener('click',()=>selectSideNav('home'));
  $('tabOptimizer').addEventListener('click',()=>selectSideNav('jelly'));
  $('tabPractice').addEventListener('click',()=>{selectSideNav('jelly');selectWorkspaceTab('practice');});
  $('tabUpgrades').addEventListener('click',()=>{selectSideNav('jelly');selectWorkspaceTab('upgrades');});
  $('tabBonuses').addEventListener('click',()=>{selectSideNav('jelly');selectWorkspaceTab('bonuses');});
  $('navHome').addEventListener('click',()=>selectSideNav('home'));
  $('navJelly').addEventListener('click',()=>selectSideNav('jelly'));
  for(const key of Object.keys(SKILL_PAGES))$('nav'+key[0].toUpperCase()+key.slice(1))?.addEventListener('click',()=>selectSideNav(window.plannerQoL?.resolvePage(key)||key));
  window.addEventListener('idleon:navigate',event=>{const reviewPages={questUnlocks:'quests',sushiReview:'sushi',vialsReview:'vials',constructionReady:'construction',sailingReview:'sailing',cookingReview:'cooking',starsReview:'starSigns',storageReview:'home',worldGates:'rift'};if(reviewPages[event.detail])selectSideNav(reviewPages[event.detail]);else if(SKILL_PAGES[event.detail]||['home','jelly'].includes(event.detail))selectSideNav(event.detail);});
  document.querySelectorAll('.side-group>span').forEach(label=>{
    label.parentElement.classList.add('collapsed');
    label.tabIndex=0;label.setAttribute('role','button');label.setAttribute('aria-expanded','false');
    const toggle=()=>{const collapsed=label.parentElement.classList.toggle('collapsed');label.setAttribute('aria-expanded',String(!collapsed));};
    label.addEventListener('click',toggle);label.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggle();}});
  });

  function fail(msg){$('error').textContent=msg;$('error').classList.remove('hidden');}
  function clearFail(){$('error').classList.add('hidden');$('error').textContent='';}
  function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function pct(x,d=0){return Number.isFinite(x)?(100*x).toFixed(d)+'%':'—';}
  function stat(k,v,sub=''){return `<div class="stat"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div>${sub?`<div class="m-sub">${esc(sub)}</div>`:''}</div>`;}
  function quality(){
    const q=$('searchQuality').value,objectiveMode=$('objectiveMode')?.value||'balanced';
    if(q==='quick')return {timeMs:1800,runs:32,mixLimit:190,shortlist:32,screenRuns:4,refineRuns:8,objectiveMode};
    if(q==='deep')return {timeMs:15000,runs:384,mixLimit:1050,shortlist:104,screenRuns:8,refineRuns:32,refineCount:24,finalists:12,objectiveMode};
    return {timeMs:5200,runs:128,mixLimit:480,shortlist:64,screenRuns:5,refineRuns:16,refineCount:16,objectiveMode};
  }
  function currentReviveDelay(){return Math.max(0,Number($('reviveDelay')?.value)||0);}
  function persistInput(){
    try{
      const text=$('jsonInput').value||(loadedExport?JSON.stringify(loadedExport):'');
      if($('rememberTab').checked&&text)sessionStorage.setItem(SESSION_KEY,text);
      else sessionStorage.removeItem(SESSION_KEY);
    }catch(_){/* local-only convenience; ignore unavailable storage */}
  }

  function chooseCalibration(){
    const observed=Number($('observedTime').value);
    if(Number.isFinite(observed)&&observed>0){
      try{return E.calibrateToObservedClearTime(state,currentArrangement,observed,{runs:10,useSteroid:true,reviveDelaySeconds:currentReviveDelay()});}
      catch(e){console.warn('Observed-time calibration failed; falling back to saved best DPS.',e);}
    }
    return E.autoDamageScale(state,currentArrangement);
  }

  function calibrationText(cal){
    if(cal?.source==='observedClear')return `Timed model anchored to your observed ${Number(cal.observedSeconds).toFixed(2)}s current-board clear (matched ${E.formatTime(cal.matchedTime)}; damage multiplier ×${cal.scale.toFixed(3)}).`;
    if(cal?.source==='exactJson'){
      const x=cal.external||{},g=x.gridDetails||{};
      const gridText=x.gridLevel>0?`, Cellular Warfare +${Number(x.grid||0).toFixed(2)}% (Grid ×${Number(x.gridAllMulti||1).toFixed(3)})`:`, Cellular Warfare +0%`;
      return `Damage inputs read directly from this JSON: Mossy Green +${Number(x.palette||0).toFixed(2)}%${gridText}. No historical best-DPS scaling is being used.`;
    }
    if(cal?.source==='savedBestDps')return `This paste is missing an account-wide input needed for an exact formula, so timing is estimated from saved best DPS (multiplier ×${cal.scale.toFixed(3)}). A full export or a fresh observed clear removes that fallback.`;
    return 'Using the Jelly-only formula because this paste is missing an account-wide damage input and no usable calibration was available.';
  }

  function renderStateStats(){
    const counts=E.rawCounts(currentArrangement), timer=E.bossTime(state.obstruction), hp=E.bossHP(state.obstruction);
    $('stats').innerHTML=[
      stat('Obstruction',Math.round(state.obstruction),E.formatNumber(hp)+' HP'),
      stat('Operation timer',E.formatTime(timer),'then Critical Condition'),
      stat('Bloodcells',E.formatNumber(state.bloodcells)),
      stat('Unlocked board',E.unlockedSlots(state).size+' squares'),
      stat('Cell levels',state.cellLevels.slice(0,E.unitsOwned(state)).join(' / ')),
      stat('Placed cells',counts.slice(0,E.unitsOwned(state)).reduce((a,b)=>a+b,0),counts.slice(0,E.unitsOwned(state)).join(' / '))
    ].join('');
    const tier=E.obstructionTier(state);
    $('obstructionIcon').src=`assets/JellyOp${Math.max(0,Math.min(71,Math.round(state.obstruction)))}.png`;
    $('obstructionIcon').alt=`Obstruction ${Math.round(state.obstruction)}`;
    $('stateLine').textContent=`Tier ${tier+1} · Fever ${E.FEVER_NAMES[Math.round(state.fever)]||'none'} · ${state.attemptsRemaining} attempts left · ${E.critUnlocked(state)?'Critical Status unlocked':'failure when timer expires'}${E.steroidUnlocked(state)?' · Steroid available':''}${E.reviveCount(state)?` · ${E.reviveCount(state)} revive(s)`:''}`;
  }

  function renderBoard(el,arr,boardState=state,highlightSlots=null,onSlotClick=null){
    const unlocked=E.unlockedSlots(boardState),tier=E.obstructionTier(boardState),highlight=highlightSlots?new Set(highlightSlots):null;
    el.innerHTML='';
    el.style.setProperty('--jelly-bg',`url("assets/JellyBG_${tier}.png")`);
    for(let i=0;i<E.BOARD_SIZE;i++){
      const slot=document.createElement('div');slot.className='board-slot';
      if(E.BLOCKED_CENTER.has(i))slot.classList.add('center-hole');if(highlight&&highlight.has(i))slot.classList.add('new-slot');
      const img=document.createElement('img');img.className='slot-art';img.alt='';img.draggable=false;
      img.src=`assets/JellySq${unlocked.has(i)?0:1}_${tier}.png`;
      slot.dataset.square=String(i);
      slot.appendChild(img);el.appendChild(slot);
    }
    el.onclick=onSlotClick?event=>{
      const rect=el.getBoundingClientRect(),col=Math.floor((event.clientX-rect.left)/rect.width*E.COLS),row=Math.floor((event.clientY-rect.top)/rect.height*E.ROWS);
      if(col>=0&&col<E.COLS&&row>=0&&row<E.ROWS)onSlotClick(row*E.COLS+col);
    }:null;
    const obs=document.createElement('img');obs.className='obstruction-center';obs.alt=`Obstruction ${Math.round(boardState.obstruction)}`;obs.draggable=false;
    obs.src=`assets/JellyOp${Math.max(0,Math.min(71,Math.round(boardState.obstruction)))}.png`;el.appendChild(obs);
    for(const p of arr){
      const type=p.type,dims=E.UNIT_IMG_DIMS[type]||[36,36],off=E.UNIT_VISUAL_OFFSET[type]||0;
      const row=Math.floor(p.anchor/E.COLS),col=p.anchor%E.COLS;
      const img=document.createElement('img');img.className='unit-sprite';img.alt=E.UNIT_NAMES[type];img.draggable=false;img.src=`assets/JellyUnit${type}.png`;
      img.style.left=`${((col+off)/E.COLS)*100}%`;img.style.top=`${((row+off)/E.ROWS)*100}%`;
      img.style.width=`${((dims[0]/36)/E.COLS)*100}%`;img.style.height=`${((dims[1]/36)/E.ROWS)*100}%`;
      img.title=`${E.UNIT_NAMES[type]} · anchor ${p.anchor}`;el.appendChild(img);
      const core=document.createElement('span');core.className='core-marker';
      core.style.left=`${(col+.5)/E.COLS*100}%`;core.style.top=`${(row+.5)/E.ROWS*100}%`;
      core.title=`${E.UNIT_NAMES[type]} core · square ${p.anchor}`;core.textContent='◆';el.appendChild(core);
    }
  }

  function resultMetrics(stats){
    const cr=stats?.clearRate??0, med=stats?.medianClearTime;
    return [
      ['Clear chance',pct(cr,0),`${stats?.runs||0} simulated runs`],
      ['Median clear',E.formatTime(med),med==null?'no successful sample':med>E.bossTime(state.obstruction)?'after timer / Critical':'inside normal timer'],
      ['Before timer',pct(stats?.normalClearRate??0,0),'clears without Critical'],
      ['Critical clears',pct(stats?.criticalClearRate??0,0),'clears after timer'],
      ['HP at timer',stats?.medianHpAtTimer==null?'—':pct(stats.medianHpAtTimer,1),'median remaining'],
      ['HP at end',pct(stats?.medianHpRemaining??0,1),'median remaining after full attempt']
    ];
  }
  function renderSummary(el,stats){
    el.innerHTML=resultMetrics(stats).map(([k,v,s])=>`<div class="metric"><div class="m-k">${esc(k)}</div><div class="m-v">${esc(v)}</div><div class="m-sub">${esc(s)}</div></div>`).join('');
  }
  function renderTimeline(el,stats){
    const timer=E.bossTime(state.obstruction),med=stats?.medianClearTime,p90=stats?.p90ClearTime,p10=stats?.p10ClearTime;
    const horizon=Math.max(timer+8,(p90||med||timer)+4,timer*1.22,(stats?.medianElapsed||0)+4);
    const x=v=>Math.max(0,Math.min(100,(v/horizon)*100));
    const marker=(cls,v,label)=>v==null?'':`<div class="tl-marker ${cls}" style="left:${x(v)}%"><i></i><span>${esc(label)}</span></div>`;
    el.innerHTML=`<div class="tl-title"><span>Operation timing</span><span>${pct(stats?.clearRate??0,0)} clear · ${pct(stats?.criticalEntryRate??0,0)} enter Critical</span></div>
      <div class="tl-track">
        <div class="tl-normal" style="width:${x(timer)}%"></div>
        <div class="tl-critical" style="left:${x(timer)}%;width:${100-x(timer)}%"></div>
        ${marker('timer',timer,`Timer ${timer}s`)}
        ${marker('p10',p10,p10==null?'':`fast ${p10.toFixed(1)}s`)}
        ${marker('median',med,med==null?'':`median ${med.toFixed(1)}s`)}
        ${marker('p90',p90,p90==null?'':`slow ${p90.toFixed(1)}s`)}
      </div>
      <div class="tl-axis"><span>0s</span><span>normal operation</span><span>Critical Condition</span><span>${horizon.toFixed(0)}s</span></div>`;
  }
  function verdict(stats){
    if(!stats)return '';
    if(stats.clearRate>=.999&&stats.medianClearTime!=null)return `<span class="good">${E.formatTime(stats.medianClearTime)}</span><br>${pct(stats.clearRate,0)} clear`;
    if(stats.clearRate>0)return `<span class="good">${pct(stats.clearRate,0)} clear</span><br>${E.formatTime(stats.medianClearTime)}`;
    return `<span class="bad">No simulated clear</span>`;
  }

  function moveSavings(base,st){return base?.medianClearTime!=null&&st?.medianClearTime!=null?base.medianClearTime-st.medianClearTime:null;}
  function renderNextMove(move,baseStats){
    lastNextMove=move;const box=$('nextMove');
    if(!move){box.innerHTML='<p class="subtitle">No timed-combat purchase could be scored from this state. Review the ranked upgrades below for damage, Bloodcell, and one-time unlock value.</p>';return;}
    const save=moveSavings(baseStats,move.stats),cost=move.cost||0,left=Math.max(0,state.bloodcells-cost);
    const icon=move.upgradeId!=null?`<img class="move-icon" src="assets/JellyUpg${move.upgradeId}.png" alt="">`:'';
    const saving=move.kind==='saving-target';
    const title=saving?'Save for this damage package':move.kind==='plot'?`Open ${esc(move.plot.label)}`:esc(move.name);
    const action=saving?move.purchases.map(p=>`${esc(p.name)} <strong>Lv ${p.from} → ${p.to}</strong>`).join('<span class="plan-separator">then</span>'):move.kind==='plot'?`${move.upgradeName?`Buy ${esc(move.upgradeName)} and `:''}open the new board area.`:`Level ${move.level} → ${move.targetLevel??move.level+1}`;
    const affordability=move.shortfall>0?`${E.formatNumber(move.shortfall)} to save`:`${E.formatNumber(left)} after buy`;
    const outcome=move.stats?.clearRate>0?`${pct(move.stats.clearRate,0)} clear`:'No clear yet';
    const speed=move.stats?.medianClearTime!=null?E.formatTime(move.stats.medianClearTime):'—';
    const reason=move.note|| (saving?'The lowest tested damage path that reaches a simulated clear.':'The highest-scoring tested action for the active timed-clear objective.');
    box.innerHTML=`<article class="purchase-plan">
      <div class="plan-head">${icon}<div class="move-copy"><div class="move-kicker">${saving?'SAVE NEXT':'RECOMMENDED NEXT BUY'}</div><div class="move-title">${title}</div><div class="plan-action">${action}</div></div></div>
      <div class="plan-stats">
        <div><span>Cost</span><strong>${cost>0?E.formatNumber(cost):'Plot ready'}</strong></div>
        <div><span>Your funds</span><strong>${E.formatNumber(state.bloodcells)}</strong><small>${affordability}</small></div>
        <div><span>After action</span><strong>${outcome}</strong><small>${speed}${save!=null?` · ${save>0?'−':''}${Math.abs(save).toFixed(2)}s`:''}</small></div>
      </div>
      <div class="plan-why"><strong>Why this:</strong> ${esc(reason)}</div>
    </article>`;
  }

  function humanTarget(value){
    const raw=String(value||'Unknown').trim();
    const names=window.CARD_NAMES||{},known=names[raw]||Object.entries(names).find(([key])=>key.toLowerCase()===raw.toLowerCase())?.[1];
    if(known&&known!=='_')return String(known).replaceAll('_',' ');
    if(/^w(\d+)a(\d+)$/i.test(raw)){const [,world,area]=raw.match(/^w(\d+)a(\d+)$/i);return `World ${world} · Area ${area}`;}
    if(/^Spelunking(\d+)$/i.test(raw))return `Spelunking · Depth ${raw.match(/\d+/)[0]}`;
    return raw.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,c=>c.toUpperCase());
  }
  function afkDuration(value){
    const seconds=Number(value);if(!Number.isFinite(seconds)||seconds<0)return 'Not available';
    if(seconds<60)return Math.round(seconds)+'s';if(seconds<3600)return Math.floor(seconds/60)+'m';if(seconds<86400)return (seconds/3600).toFixed(seconds<36000?1:0)+'h';return (seconds/86400).toFixed(1)+'d';
  }
  function classIcon(classId){
    const n=Number(classId)||0;
    if([4,7,10,13,16,19,22,25,28,31,34,37,40].includes(n))return '🏹';
    if([2,5,8,11,14,17,20,23,26,29,32,35,38].includes(n))return '✨';
    if([3,6,9,12,15,18,21,24,27,30,33,36,39].includes(n))return '⚔';
    return '🛡';
  }
  function activityFor(target,decodedPlayer){
    const rawType=String(decodedPlayer?.currentMonster?.details?.AFKtype||decodedPlayer?.getActivityType?.()||'').toLowerCase(),raw=String(target||'').toLowerCase();
    if(/mining/.test(rawType))return {label:'Mining',icon:'⛏',kind:'mining'};
    if(/choppin/.test(rawType))return {label:'Chopping',icon:'🪓',kind:'chopping'};
    if(/fishing/.test(rawType))return {label:'Fishing',icon:'🎣',kind:'fishing'};
    if(/catching/.test(rawType))return {label:'Catching',icon:'🕸',kind:'catching'};
    if(/cooking/.test(rawType))return {label:'Cooking',icon:'🍲',kind:'cooking'};
    if(/farm|crop|garden/.test(rawType+' '+raw))return {label:'Farming',icon:'🌱',kind:'farming'};
    if(/spelunk/.test(rawType+' '+raw))return {label:'Spelunking',icon:'⛏',kind:'spelunking'};
    if(/divinity/.test(rawType+' '+raw))return {label:'Divinity',icon:'✦',kind:'divinity'};
    if(/laboratory|\blab\b/.test(rawType+' '+raw))return {label:'Laboratory',icon:'⬡',kind:'laboratory'};
    if(/fighting/.test(rawType))return {label:'Fighting',icon:'⚔',kind:'fighting'};
    if(!raw||raw==='none'||/nothing/.test(rawType))return {label:'Idle',icon:'☾',kind:'idle'};
    return {label:'Unknown activity',icon:'?',kind:'idle'};
  }
  function characterRows(){
    const data=state?.rawData||{},names=Array.isArray(state?.rawRoot?.charNames)?state.rawRoot.charNames:[],parse=value=>{if(typeof value==='string')try{return JSON.parse(value);}catch{return null;}return value;},timeAway=parse(data.TimeAway)||{},savedAt=Number(timeAway.Player);let decodedPlayers=[];
    decodedPlayers=homeDecodedPlayers;
    const ids=Object.keys(data).map(k=>{const m=k.match(/^AFKtarget_(\d+)$/);return m?Number(m[1]):null;}).filter(x=>x!=null).sort((a,b)=>a-b);
    return ids.map(id=>{const lv=parse(data['Lv0_'+id]),level=Array.isArray(lv)?Math.round(Number(lv[0])||0):null,decodedPlayer=decodedPlayers.find(player=>Number(player?.playerID)===id)||decodedPlayers[id],rawTarget=data['AFKtarget_'+id],activity=activityFor(rawTarget,decodedPlayer),world=String(rawTarget||'').match(/^w(\d+)/i)?.[1],lastClaim=Number(data['PTimeAway_'+id]),seconds=Number.isFinite(savedAt)&&Number.isFinite(lastClaim)?Math.max(0,savedAt-lastClaim*1000):NaN,decodedTarget=decodedPlayer?.currentMonster,prettyTarget=decodedTarget?.details?.Name||decodedTarget?.details?.name||decodedTarget?.name||decodedTarget?.id;
      return {id,name:names[id]||`Character ${id+1}`,target:humanTarget(prettyTarget||rawTarget),afk:afkDuration(seconds),level,classId:data['CharacterClass_'+id],classIcon:classIcon(data['CharacterClass_'+id]),activity,world};
    });
  }
  function renderHome(){
    const raw=loadedExport||state?.rawRoot;
    if(raw&&homeRosterSave!==raw){homeRosterSave=raw;homeDecodedPlayers=[];window.BonusSystems.getRosterAsync(raw).then(players=>{if(homeRosterSave!==raw)return;homeDecodedPlayers=players;renderHome();}).catch(error=>console.warn('Could not decode roster activities.',error));}
    const rows=characterRows();
    const fighting=rows.filter(x=>x.activity.kind==='fighting').length,skills=rows.length-fighting;
    $('homeRosterSummary').innerHTML=rows.length?`<span><strong>${rows.length}</strong> characters</span><span><strong>${fighting}</strong> fighting</span><span><strong>${skills}</strong> elsewhere</span>`:'<span>No roster loaded</span>';
    $('characterDashboard').innerHTML=rows.map(row=>`<article class="character-card activity-${row.activity.kind}" style="--card-index:${row.id}"><header><div class="character-avatar" title="Class ${esc(row.classId??'—')}"><img src="assets/ClassIcons${esc(row.classId??0)}.png" alt="" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span hidden>${row.classIcon}</span></div><div class="character-identity"><h3>${esc(row.name)}</h3><strong>Lv. ${row.level??'—'}</strong></div>${row.world?`<span class="character-world">W${esc(row.world)}</span>`:''}</header><div class="character-timer"><span class="timer-icon">◷</span><strong>${esc(row.afk)}</strong><small>saved AFK</small></div><div class="character-assignment"><span class="assignment-icon">${row.activity.icon}</span><div><strong>${esc(row.activity.label)}</strong><small>${esc(row.target)}</small></div><span class="assignment-mark">${row.activity.kind==='fighting'?'⚔':row.activity.kind==='idle'?'—':'›'}</span></div></article>`).join('')||'<div class="home-empty"><strong>No character roster yet</strong><p>Load a full IdleOn save to populate this page.</p></div>';
  }
  function stampLevels(){
    const raw=state?.rawData?.StampLv;if(!Array.isArray(raw))return [[],[],[]];
    return raw.map(group=>Array.isArray(group)?group:Array.from({length:Number(group?.length)||0},(_,index)=>Number(group?.[index])||0));
  }
  let constructionTab='buildings',selectedConstructionBuilding=0;
  function renderConstruction(){
    const parse=v=>{if(typeof v==='string'){try{return JSON.parse(v);}catch{return null;}}return v;},data=state?.rawData||{};
    const {rows,total}=window.Construction.evaluate(data,window.CONSTRUCTION_CATALOG||[]);
    const tabs=[['buildings','Buildings'],['cogs','Cogs']];
    const capText=r=>r.capKnown?String(r.cap):`${r.cap}+ verified`;
    $('worldContent').innerHTML=`<div class="section-head compact"><div><p class="eyebrow">World 3</p><h2>Construction</h2><p>Click a building for bonuses and ways to raise its cap.</p></div></div><nav class="skill-tabs" aria-label="Construction sections" role="tablist">${tabs.map(([id,label])=>`<button role="tab" aria-selected="${constructionTab===id}" class="skill-tab ${constructionTab===id?'active':''}" data-construction="${id}">${label}</button>`).join('')}</nav><div id="constructionContent"></div>`;
    const host=$('constructionContent');
    if(constructionTab==='buildings'||constructionTab==='levels'){
      host.innerHTML=`<p class="muted">${rows.filter(r=>r.status==='Maxed').length} maxed · ${total??'?'} total building levels · Caps include unlocked account bonuses.</p>${constructionTab==='levels'?`<div class="construction-table"><table><thead><tr><th>Building</th><th>Level</th><th>Base</th><th>Your cap</th><th>Levels left</th></tr></thead><tbody>${rows.map(r=>`<tr><td><button class="construction-level-link" data-construction-building="${r.id}">${esc(r.name)}</button></td><td>${r.level??'?'}</td><td>${r.base}</td><td>${capText(r)}</td><td>${r.remaining===0?'Maxed':r.remaining??'Unverified'}</td></tr>`).join('')}</tbody></table></div>`:`<div class="construction-shelves">${[['Account buildings',rows.slice(0,9)],['Worship towers',rows.slice(9,18)],['Shrines',rows.slice(18,27)]].map(([title,group])=>`<section class="construction-shelf"><h3>${title}</h3><div class="construction-building-row">${group.map(r=>`<button type="button" class="construction-building ${r.status==='Maxed'?'is-maxed':''}" data-construction-building="${r.id}" title="${esc(r.name)} · Level ${r.level??'?'} / ${capText(r)} · ${esc(r.status)}"><span class="construction-ribbon">${r.status==='Maxed'?'MAX LV':r.level===0?'BUILD':`LV ${r.level??'?'}`}</span><img src="assets/ConTower${r.id}.png" alt="" loading="lazy"><small>${r.level??'?'} / ${r.capKnown?r.cap:'?'}</small><span>${esc(r.name)}</span></button>`).join('')}</div></section>`).join('')}</div>`}<section id="constructionBuildingDetail" class="exp-card construction-detail-dismissed" aria-live="polite"></section>`;
      const show=id=>{
        selectedConstructionBuilding=id;const r=rows[id];if(!r)return;
        host.querySelectorAll('[data-construction-building]').forEach(tile=>{const active=Number(tile.dataset.constructionBuilding)===id;tile.classList.toggle('selected',active);tile.setAttribute('aria-pressed',String(active));});
        const next=r.sources.filter(s=>s.value===0||s.value===null||s.repeatable);
        $('constructionBuildingDetail').innerHTML=`<button type="button" id="constructionDetailClose" class="secondary" aria-label="Close building details">Close</button><h3>${esc(r.name)}</h3><p><strong>Level ${r.level??'?'} / ${capText(r)}</strong> · ${esc(r.status)}</p><p class="muted">Base ${r.base} + ${r.cap-r.base} unlocked cap levels${r.capKnown?'':' · Some bonuses need verification'}</p>${r.level!==null&&r.level<r.base?`<p class="exp-benefit">You can build ${r.base-r.level} more levels before the base cap. Cap upgrades below can be unlocked ahead of time.</p>`:r.remaining>0?`<p class="exp-benefit">${r.remaining} more levels available with your current bonuses.</p>`:''}<h4>Cap bonuses</h4>${r.sources.length?`<div class="construction-cap-sources">${r.sources.map(s=>`<div><strong>${esc(s.name)}</strong><span>${s.value===null?'Unverified':s.value>0?`+${s.value} active`:`Locked · +${s.amount??2}`}</span><small>${esc(s.progress)}</small></div>`).join('')}</div>`:'<p>This building has a fixed cap. No cap increases exist in the audited game data.</p>'}${next.length?`<h4>How to raise the cap</h4><ul>${next.map(s=>`<li>${esc(s.action)}</li>`).join('')}</ul>`:r.sources.length?'<p>All available cap unlocks for this building are active.</p>':''}<details><summary>Current building bonus</summary><p style="white-space:pre-line">${esc(r.description)}</p>${r.id>=18?'<p class="muted">These are Construction levels and shrine leveling speed, separate from the shrine’s own AFK-earned level.</p>':''}</details>`;
        $('constructionBuildingDetail').classList.remove('construction-detail-dismissed');
        $('constructionDetailClose').onclick=()=>$('constructionBuildingDetail').classList.add('construction-detail-dismissed');
      };
      host.querySelectorAll('[data-construction-building]').forEach(tile=>tile.onclick=()=>show(Number(tile.dataset.constructionBuilding)));
    }else if(constructionTab==='cogs'){window.CogBoard.render(host,data,state?.rawRoot||{});}else{const key=constructionTab==='cogs'?'CogOrder':'FlagUnlock',value=parse(data[key]),entries=Object.entries(value||{}).filter(([k])=>/^\d+$/.test(k));host.innerHTML=`<section class="exp-card"><h3>${constructionTab==='cogs'?'Cog layout':'Flag unlocks'}</h3><p>${entries.length?'Saved '+entries.length+' entries.':'No saved entries found.'}</p><p>Layout positions and effective bonuses still need decoding. The Building Levels tab reads your saved progress.</p></section>`;}
    $('worldContent').querySelectorAll('[data-construction]').forEach(b=>b.onclick=()=>{constructionTab=b.dataset.construction;renderWorldPage('construction');});
  }
  let selectedBribe=0;
  function renderBribes(){
    const catalog=window.BRIBES_CATALOG||[],pretty=t=>String(t).replaceAll('_',' ');let status=state?.rawData?.BribeStatus;if(typeof status==='string'){try{status=JSON.parse(status);}catch{status=null;}}
    const purchased=id=>status?.[id]==null?null:Number(status[id])===1;
    $('worldContent').innerHTML=`<div class="section-head compact"><div><p class="eyebrow">World 1 · account-wide</p><h2>Bribes</h2><p>Select a bribe to see its effect, purchase status and listed cost.</p></div><strong class="stamp-count">${catalog.filter((r,id)=>r[4]!=='BribeExpansion'&&purchased(id)).length} / ${catalog.filter(r=>r[4]!=='BribeExpansion').length} bonus bribes purchased</strong></div><div class="bribes-compact-grid">${catalog.map((r,id)=>`<button type="button" class="arcade-tile bribe-tile" data-bribe="${id}" aria-pressed="false"><img class="arcade-icon" src="assets/BribeO${esc(r[3])}.png" alt="" loading="lazy"><span class="arcade-name">${esc(pretty(r[0]))}</span><strong>${purchased(id)==null?'Unknown':purchased(id)?'✓ Purchased':'Not purchased'}</strong><span class="bribe-tip"><strong>${esc(pretty(r[0]))}</strong><span>${esc(pretty(r[1]))}</span></span></button>`).join('')}</div><section class="exp-card bribe-detail-dismissed" id="bribeDetail" aria-live="polite"></section>`;
    const show=id=>{selectedBribe=id;const r=catalog[id],bought=purchased(id);$('worldContent').querySelectorAll('[data-bribe]').forEach(b=>{const active=Number(b.dataset.bribe)===id;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});$('bribeDetail').innerHTML=`<button id="bribeDetailClose" class="secondary" aria-label="Close bribe details">Close</button><h3>${esc(pretty(r[0]))}</h3><p><strong>${bought==null?'Purchase data unavailable':bought?'✓ Purchased':'Not purchased'}</strong></p><p class="exp-benefit">${esc(pretty(r[1]))}</p><p>Price: <span class="coin-price">${window.GameCurrency.html(r[2])}</span></p>${id===0?'<p class="muted">Client discrepancy: the description says 5% cheaper stamps, while its stored bonus parameter is 8. Displayed text above follows the game description.</p>':''}<p class="muted">${r[4]==='BribeExpansion'?'Progression entry; not a numeric stat bonus.':'Effect shown is the game description.'} Not purchased does not mean available or affordable. Quest prerequisites and current coins are not checked.</p>`;$('bribeDetailClose').onclick=()=>$('bribeDetail').classList.add('bribe-detail-dismissed');};$('worldContent').querySelectorAll('[data-bribe]').forEach(b=>b.onclick=()=>{show(Number(b.dataset.bribe));$('bribeDetail').classList.remove('bribe-detail-dismissed');});show(selectedBribe);
  }
  let postCharacter=0,postSelected=0;
  function renderPostOffice(){
    const catalog=window.POST_OFFICE_CATALOG||[],roster=window.ClassExp.inspect(state).roster,P=window.PostOffice;
    if(roster.length&&!roster.some(c=>c.id===postCharacter))postCharacter=roster[0].id;
    const points=id=>P.level(state?.rawData,postCharacter,id),pretty=t=>String(t).replaceAll('_',' ').trim(),fmt=n=>n.toLocaleString(undefined,{maximumFractionDigits:2});
    const effect=(row,id,slot)=>{const v=P.bonus(row,points(id),slot);return (v==null?'Unknown':`+${fmt(v)}`)+(String(row[4+slot*4]).startsWith('%')?'':' ')+pretty(row[4+slot*4]);};
    $('worldContent').innerHTML=`<div class="section-head compact"><div><p class="eyebrow">World 2 · character investments</p><h2>Post Office</h2><p>All ${catalog.length} boxes. Select a character to see their invested points and three bonuses per box.</p></div></div><label>Character <select id="postCharacter">${roster.map(c=>`<option value="${c.id}" ${c.id===postCharacter?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label>${!state?'<p>Load a complete export to see your Post Office investments.</p>':''}<p class="muted">Bonuses are calculated from saved box investments. Missing fields show Unknown; zero points do not establish whether a box is unlocked.</p><div class="post-grid compact-upgrades">${catalog.map((row,id)=>{const n=points(id);return `<button type="button" class="arcade-tile post-tile" data-post="${id}" aria-pressed="${id===postSelected}"><img class="arcade-icon" src="assets/UIboxUpg${id}.png" alt="" loading="lazy"><span class="arcade-name">${esc(pretty(row[0]))}</span><strong>${n==null?'Unknown':fmt(n)+' points'}</strong><span class="upgrade-tip"><strong>${esc(pretty(row[0]))}</strong>${[0,1,2].map(slot=>`<span class="post-effect">${esc(effect(row,id,slot))}</span>`).join('')}</span></button>`;}).join('')}</div><section id="postDetail" class="exp-card upgrade-detail detail-dismissed" aria-live="polite"></section>`;
    const show=id=>{postSelected=id;const row=catalog[id],n=points(id);$('worldContent').querySelectorAll('[data-post]').forEach(b=>{const active=Number(b.dataset.post)===id;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});$('postDetail').innerHTML=`<button type="button" class="secondary upgrade-close" id="postDetailClose" aria-label="Close post details">Close</button><h3>${esc(pretty(row[0]))}</h3><p>${n==null?'Investment data unavailable':fmt(n)+' points invested on this character'}</p>${[0,1,2].map(slot=>{const threshold=slot?Math.ceil(Number(row[12+slot])+.5):1;return `<p><strong>${esc(effect(row,id,slot))}</strong><br><span class="muted">${n==null?'Activation unknown':n>=threshold?'Active':'Starts at '+threshold+' invested points'}${slot?' · Uses points beyond '+Math.round(Number(row[12+slot])):''}</span></p>`;}).join('')}<p class="muted">Calculated using the installed client’s Post Office formulas. These are individual box contributions, not your final combined character stats.</p>`;};
    $('postCharacter').onchange=e=>{postCharacter=Number(e.target.value);renderPostOffice();};$('worldContent').querySelectorAll('[data-post]').forEach(b=>b.onclick=()=>{show(Number(b.dataset.post));$('postDetail').classList.remove('detail-dismissed');$('postDetailClose').onclick=()=>$('postDetail').classList.add('detail-dismissed');});show(postSelected);
  }
  let selectedArcade=0;
  function renderArcade(){
    const catalog=window.ARCADE_CATALOG||[];
    let levels=state?.rawData?.ArcadeUpg;if(typeof levels==='string'){try{levels=JSON.parse(levels);}catch{levels=null;}}
    const levelOf=id=>{const v=levels?.[id];return v!=null&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;};
    const companion=window.ArcadeModel.companion(loadedExport||state?.rawRoot||{});
    const arcadeBonus=(item,level)=>window.ArcadeModel.bonus(item,level,companion).total;
    const bonusLabel=(item,level)=>{const result=window.ArcadeModel.bonus(item,level,companion),value=result.total??result.base;return value==null?'Bonus unknown':(result.total==null?'Base only: ':'')+'+'+value.toLocaleString(undefined,{maximumFractionDigits:2})+(item.description.includes('{%')?'%':'');};
    const titleOf=item=>item.description.replace(/^\+\{%?\s*/,'');
    const known=catalog.filter(x=>levelOf(x.id)!=null),leveled=known.filter(x=>levelOf(x.id)>0);
    $('worldContent').innerHTML=`<div class="section-head compact"><div><p class="eyebrow">World 2 · account-wide</p><h2>Arcade</h2><p>All ${catalog.length} upgrades in game order. Bonuses include Cosmo and the companion multiplier when known. Base-only values exclude an unknown companion bonus. ${esc(companion.note)} Select a tile for details.</p></div><strong class="stamp-count">${leveled.length} / ${catalog.length} leveled</strong></div>${!state?'<p>Load your export to see current levels.</p>':''}<div class="arcade-grid compact-upgrades" aria-label="Arcade upgrades">${catalog.map(item=>{const level=levelOf(item.id);return `<button type="button" class="arcade-tile ${level===0?'arcade-zero':''} ${item.id===selectedArcade?'selected':''}" data-arcade="${item.id}" aria-pressed="${item.id===selectedArcade}" aria-label="${esc(titleOf(item))}, ${level==null?'level unavailable':'level '+level}"><span class="arcade-number">${item.id+1}</span><img class="arcade-icon" src="assets/PachiShopICON${item.id}.png" alt="" loading="lazy"><span class="arcade-name">${esc(titleOf(item))}</span><strong>${level==null?'Unknown':`Lv ${Math.min(level,100)}`}</strong><span class="arcade-bonus">${bonusLabel(item,level)}</span><span class="arcade-cosmo ${level===101?'done':''}">${level==null?'Cosmo unknown':level===101?'✦ Cosmo-balled':level===100?'Ready for Cosmo':'Not Cosmo-balled'}</span><span class="upgrade-tip"><strong>${esc(titleOf(item))}</strong><span>${bonusLabel(item,level)}</span><span>${level==null?'Cosmo unknown':level===101?'Cosmo-balled':level===100?'Ready for Cosmo':'Not Cosmo-balled'}</span></span></button>`;}).join('')}</div><section id="arcadeDetail" class="exp-card upgrade-detail detail-dismissed" aria-live="polite"></section><p class="muted">Lv 0 means no saved levels; it does not prove the upgrade is unlocked. Unknown means the field is missing. Unlock conditions and purchase costs are not yet decoded.</p>`;
    const show=id=>{selectedArcade=id;const item=catalog.find(x=>x.id===id);if(!item)return;const level=levelOf(id);const bonus=arcadeBonus(item,level);
      $('worldContent').querySelectorAll('[data-arcade]').forEach(b=>{const active=Number(b.dataset.arcade)===id;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
      $('arcadeDetail').innerHTML=`<button type="button" class="secondary upgrade-close" id="arcadeDetailClose" aria-label="Close arcade details">Close</button><p class="eyebrow">Arcade upgrade ${id+1}</p><h3>${esc(titleOf(item))}</h3><p><strong>${level==null?'Saved level unavailable':`Current level: ${Math.min(level,100)}${level===101?' · Cosmo-balled (saved as 101)':' · Not Cosmo-balled'}`}</strong></p><p class="exp-benefit">${bonus==null?esc(bonusLabel(item,level)):esc(item.description.replace('{',bonus.toLocaleString(undefined,{maximumFractionDigits:3}))) }</p><p>${esc(companion.note)} ${bonus==null?'A complete bonus cannot be calculated from this export.':'Calculated using the supplied client formula, including level-101 doubling.'}</p><details><summary>Formula and breakpoint</summary><p>${item.formula==='decay'?`${item.base} × level / (level + ${item.scale})`:item.formula==='add'?`${item.base} × level`:item.formula==='intervalAdd'?`${item.base} + floor(level / ${item.scale})`:'Formula not yet supported'}. At exactly level 101, the client doubles the result.</p></details>`;
    };
    $('worldContent').querySelectorAll('[data-arcade]').forEach(b=>b.onclick=()=>{show(Number(b.dataset.arcade));$('arcadeDetail').classList.remove('detail-dismissed');$('arcadeDetailClose').onclick=()=>$('arcadeDetail').classList.add('detail-dismissed');});show(selectedArcade);
  }
  let selectedStamp=[0,0];
  function renderStamps(collection=false){
    if(!collection){window.StampCalculator.render($('worldContent'),loadedExport||state?.rawRoot||{},()=>{renderStamps(true);const button=document.createElement('button');button.className='secondary';button.textContent='← Upgrade calculator';button.onclick=()=>renderStamps();$('worldContent').prepend(button);});return;}

    const catalog=window.STAMP_CATALOG||[];let saved=state?.rawData?.StampLv;
    const parse=v=>{if(typeof v==='string'){try{return JSON.parse(v);}catch{return null;}}return v;};saved=parse(saved);
    const levelOf=(g,i)=>{const v=parse(saved?.[g])?.[i];return v!=null&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;};
    const maxSaved=parse(state?.rawData?.StampLvM),exaltRaw=Object.entries(state?.rawData||{}).filter(([key])=>/exalt.*stamp|stamp.*exalt/i.test(key)).map(([,value])=>parse(value));
    const exalted=(g,i)=>exaltRaw.some(value=>Array.isArray(value?.[g])?Number(value[g][i])>0:Array.isArray(value)?Number(value[g*100+i])>0:Number(value?.[`${g}_${i}`]??value?.[`${g}-${i}`])>0);
    const stampValue=(stamp,level)=>{const data=window.STAMP_FORMULAS?.[stamp.id],n=Math.max(0,Number(level)||0);if(!data)return null;const base=data.x1,scale=data.x2;let value=0;switch(data.fn){case'add':value=scale?((base+scale)/scale+.5*(n-1))/(base/scale)*n*base:base*n;break;case'decay':value=base*n/(n+scale);break;case'decayMulti':value=1+base*n/(n+scale);break;case'bigBase':value=base+scale*n;break;case'intervalAdd':value=base+Math.floor(n/scale);break;default:value=base*n;}return Number.isFinite(value)?value:null;};
    const effectText=(stamp,level)=>{const value=stampValue(stamp,level);return value==null?'Calculating from game data…':`${Number(value).toLocaleString(undefined,{maximumFractionDigits:3})}${/Multi|multi|x /i.test(stamp.bonus)?'×':'%' } ${stamp.bonus}`;};
    const count=catalog.reduce((n,g,gi)=>n+g.stamps.filter((_,i)=>levelOf(gi,i)>0).length,0),total=catalog.reduce((n,g)=>n+g.stamps.length,0),exaltedCount=catalog.reduce((n,g,gi)=>n+g.stamps.filter((_,i)=>exalted(gi,i)).length,0),unusedExalts=exaltRaw.reduce((sum,value)=>sum+(Number(value?.unused??value?.available??0)||0),0);
    $('worldContent').innerHTML=`<div class="section-head compact"><div><p class="eyebrow">World 1 · account-wide</p><h2>Stamps</h2><p>Hover a stamp for its current calculated effect, or select it to keep the details open.</p></div><div class="alchemy-summary"><strong class="stamp-count">${count} / ${total} leveled</strong><span class="prisma-summary">${exaltedCount} exalted · ${unusedExalts} unused</span></div></div><div class="stamp-workspace"><div class="stamp-catalog">${catalog.map((group,gi)=>`<section class="stamp-group"><h3>${esc(group.name)}</h3><div class="stamp-grid">${group.stamps.map((stamp,i)=>{const level=levelOf(gi,i),isExalted=exalted(gi,i);return `<button type="button" class="stamp-tile stamp-select ${level===0?'locked':''} ${isExalted?'exalted':''}" data-stamp-group="${gi}" data-stamp-index="${i}" aria-pressed="false" aria-label="${esc(stamp.name)}. ${level==null?'Level unavailable':`Level ${level}`}.${isExalted?' Exalted.':''}"><div class="stamp-art">${stamp.image?`<img src="${esc(stamp.image)}" alt="" loading="lazy">`:`<span class="stamp-fallback">${esc(stamp.id)}</span>`}</div><span class="stamp-level">${level==null?'Unknown':level===0?'Lv 0':`Lv ${level.toLocaleString()}`}</span>${isExalted?'<em class="stamp-exalted">Exalted</em>':''}<div class="stamp-tip"><strong>${esc(stamp.name)}</strong><span class="stamp-tip-level">${level==null?'Saved level unavailable':`Lv ${level.toLocaleString()}`}</span><b>${esc(effectText(stamp,level))}</b></div></button>`;}).join('')}</div></section>`).join('')}<section id="stampDetail" class="exp-card" aria-live="polite"></section></div>`;
    const show=(g,i)=>{selectedStamp=[g,i];const stamp=catalog[g]?.stamps[i];if(!stamp)return;const level=levelOf(g,i),isExalted=exalted(g,i);$('worldContent').querySelectorAll('[data-stamp-group]').forEach(tile=>{const active=Number(tile.dataset.stampGroup)===g&&Number(tile.dataset.stampIndex)===i;tile.classList.toggle('selected',active);tile.setAttribute('aria-pressed',String(active));});$('stampDetail').innerHTML=`<button type="button" id="stampDetailClose" class="stamp-detail-close secondary" aria-label="Close stamp details">Close</button><p class="eyebrow">${esc(catalog[g].name)} · Stamp ${i+1}</p><h3>${esc(stamp.name)}${isExalted?' · Exalted':''}</h3><p><strong>${level==null?'Saved level unavailable':`Current level: ${level.toLocaleString()}`}</strong></p><p class="exp-benefit">${esc(effectText(stamp,level))}</p>${isExalted?'<p class="prisma-summary">Exalted stamp: permanent bonus multiplier applied.</p>':''}${level===0?'<p>No saved levels. Acquisition and hand-in status are not separately decoded.</p>':''}</section>`;$('stampDetailClose').onclick=()=>$('stampDetail').classList.add('stamp-detail-dismissed');};
    $('worldContent').querySelectorAll('[data-stamp-group]').forEach(tile=>tile.onclick=()=>{show(Number(tile.dataset.stampGroup),Number(tile.dataset.stampIndex));$('stampDetail').classList.remove('stamp-detail-dismissed');});show(...selectedStamp);$('stampDetail').classList.add('stamp-detail-dismissed');
  }
  function alchemyLevels(){
    const raw=state?.rawData?.CauldronInfo;
    if(!Array.isArray(raw))return [[],[],[],[]];
    return Array.from({length:4},(_,groupIndex)=>{
      const group=raw[groupIndex];
      const values=Array.isArray(group)?group:Array.from({length:Number(group?.length)||0},(_,index)=>group?.[index]);
      return values.map(value=>Math.max(0,Math.trunc(Number(value)||0)));
    });
  }
  function savedPrismaBubbles(){return window.AlchemySave.prisma(state);}
  function bubbleValue(bubble,level){
    const base=Number(bubble.base)||0,scale=Number(bubble.scale)||0,n=Math.max(0,Number(level)||0);
    switch(bubble.formula){
      case 'add':return scale?((base+scale)/scale+.5*(n-1))/(base/scale)*n*base:base*n;
      case 'addLower':return base+scale*(n+1);
      case 'addDECAY':return n<=50000?base*n:base*50000+(n-50000)/(n-50000+150000)*base*50000;
      case 'decay':return base*n/(n+scale);
      case 'decayLower':return base*(n+1)/(n+1+scale)-base*n/(n+scale);
      case 'decayMulti':return 1+base*n/(n+scale);
      case 'decayMultiLower':return base*(n+1)/(n+1+scale)-base*n/(n+scale);
      case 'bigBase':return base+scale*n;
      case 'bigBaseLower':return scale;
      case 'intervalAdd':return base+Math.floor(n/scale);
      case 'reduce':return base-scale*n;
      default:return 0;
    }
  }
  function bubbleBuff(bubble,level,prismad){
    const value=bubbleValue(bubble,level),number=Number.isFinite(value)?(Math.abs(value)>=1000?Math.round(value).toLocaleString():value.toFixed(value<10?2:1).replace(/\.0$/,'')):'—';
    const hasMultiplier=/Multi|bigBase/.test(bubble.formula||'');
    return `${hasMultiplier?'×':''}${number}${prismad?' · Prisma bonus active':''}`;
  }
  let selectedAlchemy=[0,0];
  function renderAlchemy(){
    const catalog=window.ALCHEMY_CATALOG||[],levels=alchemyLevels(),prisma=savedPrismaBubbles();
    const owned=catalog.reduce((sum,cauldron,groupIndex)=>sum+cauldron.bubbles.filter((_,index)=>(levels[groupIndex]?.[index]||0)>0).length,0);
    const total=catalog.reduce((sum,cauldron)=>sum+cauldron.bubbles.length,0);
    const prismaSummary=prisma.available?`${prisma.keys.size} Prisma'd`:'Prisma data unavailable';
    $('worldContent').innerHTML=`<div class="section-head compact"><div><p class="eyebrow">World 2 · account-wide</p><h2>Alchemy Bubbles</h2><p>Hover a bubble for a quick look, or select it to keep its bonus details open. Gold PRISMA labels identify the bubbles selected in your save.</p></div><div class="alchemy-summary"><strong class="stamp-count">${owned} / ${total} active</strong><span class="prisma-summary">${esc(prismaSummary)}</span></div></div><div class="alchemy-catalog">${catalog.map((cauldron,groupIndex)=>{const active=cauldron.bubbles.filter((_,index)=>(levels[groupIndex]?.[index]||0)>0).length,prismaLetter=String.fromCharCode(65+groupIndex);return `<section class="alchemy-cauldron ${esc(cauldron.tone)}"><h3><span>${esc(cauldron.name)} Cauldron</span><small>${active} / ${cauldron.bubbles.length}</small></h3><div class="alchemy-grid">${cauldron.bubbles.map((bubble,index)=>{const level=Number(levels[groupIndex]?.[index])||0,ownedBubble=level>0,prismad=prisma.keys.has(`${prismaLetter}${bubble.index}`),buff=ownedBubble?bubbleBuff(bubble,level,prismad):'Locked';return `<button type="button" data-bubble-group="${groupIndex}" data-bubble-index="${index}" aria-pressed="false" class="alchemy-bubble${ownedBubble?'':' locked'}${prismad?' prismad':''}" aria-label="${esc(bubble.name)}. ${ownedBubble?`Level ${level}, base bubble buff ${buff}, Prisma ${prismad?'Yes':'No'}`:'Locked'}."><img src="${esc(bubble.icon)}" alt="" loading="lazy"><span>${ownedBubble?`Lv ${esc(level)}`:'Locked'}</span>${prismad?'<i>PRISMA</i>':''}<div class="alchemy-tip"><strong>${esc(bubble.name)}</strong><span>${ownedBubble?`Lv ${esc(level)}`:'Locked'}</span><b>Base bubble buff: ${esc(buff)}</b><small>Prisma: ${prismad?'Yes':'No'}</small><em>Effect: ${esc(bubble.bonus)}</em></div></button>`;}).join('')}</div></section>`;}).join('')}</div>`;
    $('worldContent').insertAdjacentHTML('beforeend','<section id="alchemyDetail" class="exp-card alchemy-detail-dismissed" aria-live="polite"></section>');
    const show=(group,index)=>{selectedAlchemy=[group,index];const bubble=catalog[group]?.bubbles[index];if(!bubble)return;const level=Number(levels[group]?.[index])||0,prismad=prisma.keys.has(String.fromCharCode(65+group)+bubble.index),value=bubbleValue(bubble,level),formatted=Number.isFinite(value)?value.toLocaleString(undefined,{maximumFractionDigits:3}):'Unknown',effect=bubble.bonus.replaceAll('{',formatted).replaceAll('}',formatted);
      $('worldContent').querySelectorAll('.alchemy-bubble').forEach(tile=>{const active=Number(tile.dataset.bubbleGroup)===group&&Number(tile.dataset.bubbleIndex)===index;tile.classList.toggle('selected',active);tile.setAttribute('aria-pressed',String(active));});
      $('alchemyDetail').innerHTML=`<button type="button" id="alchemyDetailClose" class="secondary" aria-label="Close bubble details">Close</button><p class="eyebrow">${esc(catalog[group].name)} Cauldron · Bubble ${index+1}</p><h3>${esc(bubble.name)}</h3><p><strong>${level>0?`Current level: ${level.toLocaleString()}`:'No saved levels'}</strong> · ${prisma.available?(prismad?'✦ Prisma’d':'Not Prisma’d'):'Prisma status unavailable'}</p><p class="exp-benefit">${level>0?esc(effect):'Level this bubble to activate its bonus.'}</p><p class="muted">Base bubble bonus. Prisma and other account or character amplifiers are not included in this number.</p><p>${bubble.active?'Large bubble: activation depends on your equipped bubbles and account unlocks.':'Passive bubble.'}</p>`;
      $('alchemyDetailClose').onclick=()=>$('alchemyDetail').classList.add('alchemy-detail-dismissed');
    };
    $('worldContent').querySelectorAll('.alchemy-bubble').forEach(tile=>tile.onclick=()=>{show(Number(tile.dataset.bubbleGroup),Number(tile.dataset.bubbleIndex));$('alchemyDetail').classList.remove('alchemy-detail-dismissed');});
    show(...selectedAlchemy);
  }
  let expTab="optimizer";
  let expMode="both",expSession="all";
  function renderClassExp(){
    renderClassExpOptimizer();
    const host=$("worldContent"), content=document.createElement("div");
    content.id="expTabContent";
    while(host.children.length>1)content.appendChild(host.children[1]);
    const tabs=document.createElement("div");tabs.className="skill-tabs";tabs.setAttribute("role","tablist");tabs.setAttribute("aria-label","Class EXP sections");
    tabs.innerHTML=[["optimizer","Next Actions"],["buffs","Buff Upgrades"],["gear","Armor, Weapons & Food"],["sources","All EXP Sources"]].map(([id,label])=>`<button role="tab" aria-selected="${expTab===id}" class="skill-tab ${expTab===id?"active":""}" data-exp-tab="${id}">${label}</button>`).join("");
    host.append(tabs,content);
    tabs.querySelectorAll("button").forEach(b=>b.onclick=()=>{expTab=b.dataset.expTab;renderClassExp();});
    if(expTab!=="optimizer")window.ExpTabs.render(content,expTab,state);
  }
  function renderClassExpOptimizer(){
    return renderClassExpOptimizerV2();
    /* Legacy renderer retained below for comparison while the guided UI settles. */
    const model=window.ClassExp.recommend(state);
    const card=(item,index)=>`<article class="exp-priority"><div class="exp-priority-head"><span class="exp-step-number">${index+1}</span><div><p class="eyebrow">${esc(item.effort)}</p><h3>${esc(item.title)}</h3></div></div><div class="exp-target"><span>${esc(item.current)}</span><strong>→ ${esc(item.target)}</strong></div><p class="exp-benefit">${esc(item.benefit)}</p><p>${esc(item.action)}</p><details><summary>Why this is on your list</summary><p>${esc(item.reason)}</p></details></article>`;
    $('worldContent').innerHTML=`<div class="section-head compact"><div><p class="eyebrow">Your account · next upgrades</p><h2>Class EXP Optimizer</h2><p>${state?'Concrete targets from your loaded save.':'Load your account to find missing EXP upgrades.'}</p></div><button id="expChangeSave" class="secondary">${state?'Update save':'Load save'}</button></div>${!state?'<section class="exp-card"><h3>Your save decides the recommendations.</h3><p>Load the complete export to see which EXP sources are missing, what to upgrade next, and which upgrades can wait.</p></section>':`<p class="exp-priority-note"><strong>Work from S down.</strong> Use resources already on hand first. Time-gated projects have their own lane below. No paid-only upgrades are recommended; affordability and completion times are not inferred from saved levels.</p>${['S','A','B','C','long','conditional'].map(tier=>{const items=model.actions.filter(x=>x.tier===tier);if(!items.length)return '';const title={S:'Check first · activate existing progress',A:'Do now if affordable · use saved resources',B:'Next clear · check requirements',C:'Can wait · spare resources only',long:'Long-term goals · progress in parallel',conditional:'Active leveling only'}[tier];return `<section class="exp-tier exp-tier-${tier}"><div class="exp-tier-heading"><strong class="exp-tier-badge">${tier==='conditional'?'IF':tier==='long'?'L':tier}</strong><div><h3>${title}</h3><p>${items.length} upgrade${items.length===1?'':'s'}</p></div></div>${items.map((item,i)=>`<details class="exp-tier-item" ${tier==='S'?'open':''}><summary><span><strong>${i===0&&tier!=='long'&&tier!=='conditional'?'Check first: ':''}${esc(item.title)}</strong><small>${esc(item.current)} → ${esc(item.target)}</small><small>${esc(item.gate)} · ${esc(item.access)}</small></span><b>${esc(item.benefit)}</b></summary><div class="exp-tier-body"><p class="exp-benefit">${esc(item.tierReason)}</p><p><strong>What blocks it:</strong> ${esc(item.gateAdvice)}</p><p>${esc(item.action)}</p><p class="muted">${esc(item.effort)}</p><details><summary>Numbers and reasoning</summary><p>${esc(item.reason)}</p></details></div></details>`).join('')}</section>`;}).join('')}${model.covered.length?`<details class="exp-card"><summary>Already handled · ${model.covered.length}</summary><ul>${model.covered.map(text=>`<li>${esc(text)}</li>`).join('')}</ul></details>`:''}<details class="exp-card"><summary>What was checked</summary><p>Grind Time, Gud EXP Stamp, Wicked Smart, Active Learning, dungeon EXP, Jelly EXP rewards, Justice EXP and its multiplier, Gloomie Expie, and Sanctum of EXP.</p><p>${model.unknown.length?'Missing save fields: '+esc(model.unknown.join(', '))+'.':'All primary source fields are present.'} Other EXP systems are not yet assessed. Unmodeled sources are not assumed complete.</p><p>Numbers labeled “additive points” are bonus-pool changes, not total EXP percentages. Base gains exclude source amplifiers unless explicitly included. Suggested batches are planning targets, not caps.</p><p>Justice reward prerequisites: <a href="https://www.digitaltq.com/wiki/idleon/the-caverns" target="_blank" rel="noopener noreferrer">Caverns reference</a>. Bonus formulas and save fields were checked against the installed client.</p></details>`}`;
    $('expChangeSave').addEventListener('click',()=>{$('inputPanel').classList.remove('hidden');$('jsonInput').scrollIntoView({block:'center'});$('jsonInput').focus();});
  }
  function renderClassExpOptimizerV2(){
    const model=window.ClassExp.recommend(state);if(state)model.actions.push(...window.ExpTabs.advancedActions(state));model.actions.sort((a,b)=>({S:0,A:1,B:2,C:3,long:4,background:5,conditional:6}[a.tier]-({S:0,A:1,B:2,C:3,long:4,background:5,conditional:6}[b.tier])||a.priority-b.priority));const plan=window.ClassExp.plan(model,{mode:expMode,session:expSession}),next=plan.next;
    const itemHtml=item=>`<details class="exp-tier-item" ${item===next?'open':''}><summary><span><strong>${item===next?'Start here: ':''}${esc(item.title)}</strong><small>${esc(item.current)} → ${esc(item.target)}</small><small>${esc(item.gate)} · ${esc(item.access)}</small></span><b>${esc(item.benefit)}</b></summary><div class="exp-tier-body"><p><strong>Go to:</strong> ${esc(item.location)}</p><ol class="exp-mini-steps">${item.steps.map(step=>`<li>${esc(step)}</li>`).join('')}</ol><p class="exp-check"><strong>Done when:</strong> ${esc(item.verify)}</p><p><strong>What could block it:</strong> ${esc(item.gateAdvice)}</p><details><summary>Numbers and reasoning</summary><p>${esc(item.reason)}</p></details></div></details>`;
    const tierHtml=['S','A','B','C','long','background','conditional'].map(tier=>{const items=plan.actions.filter(x=>x.tier===tier);if(!items.length)return '';const title={S:'Check first · activate existing progress',A:'Best investments · finite and multiplicative',B:'Next clear · check requirements',C:'Can wait · spare resources only',long:'Long-term goals · progress in parallel',background:'Automatic growth · maintain, do not chase',conditional:'Active leveling only'}[tier];return `<section class="exp-tier exp-tier-${tier}"><div class="exp-tier-heading"><strong class="exp-tier-badge">${tier==='conditional'?'IF':tier==='background'?'BG':tier==='long'?'L':tier}</strong><div><h3>${title}</h3><p>${items.length} option${items.length===1?'':'s'}</p></div></div>${items.map(itemHtml).join('')}</section>`;}).join('');
    $('worldContent').innerHTML=`<div class="section-head compact"><div><p class="eyebrow">Your account · guided plan</p><h2>Class EXP Optimizer</h2><p>${state?'One clear next move, with the rest ranked behind it.':'Load your account to find missing EXP upgrades.'}</p></div><button id="expChangeSave" class="secondary">${state?'Update save':'Load save'}</button></div>${!state?'<section class="exp-card"><h3>Your save decides the recommendations.</h3><p>Load the complete export to see which EXP sources are missing, what to upgrade next, and which upgrades can wait.</p></section>':`<section class="exp-plan-controls" aria-label="Recommendation filters"><label>How you level<select id="expMode"><option value="both">Active + offline</option><option value="offline">Mostly offline</option><option value="active">Mostly active</option></select></label><label>What you want to do<select id="expSession"><option value="all">Show everything</option><option value="quick">Do something now</option><option value="project">Plan a progression goal</option></select></label></section>${next?`<section class="exp-next"><p class="eyebrow">Best next move for these filters</p><h3>${esc(next.title)}</h3><div class="exp-next-meta"><span>${esc(next.location)}</span><strong>${esc(next.benefit)}</strong></div><ol>${next.steps.map(step=>`<li>${esc(step)}</li>`).join('')}</ol><p class="exp-check"><strong>Done when:</strong> ${esc(next.verify)}</p><p class="exp-caveat"><strong>Before you commit:</strong> ${esc(next.gateAdvice)}</p></section>`:'<section class="exp-card"><h3>No recommendation matches these filters.</h3><p>Switch to “Show everything” to see the complete roadmap.</p></section>'}<p class="exp-priority-note"><strong>${plan.actions.length} matching recommendations.</strong> The highlighted move is the first practical action. Open any option for its exact route and stopping point. Affordability and combat feasibility still need an in-game check.</p>${tierHtml}${model.covered.length?`<details class="exp-card"><summary>Already handled · ${model.covered.length}</summary><ul>${model.covered.map(text=>`<li>${esc(text)}</li>`).join('')}</ul></details>`:''}<details class="exp-card"><summary>Coverage and calculation notes</summary><p>Checked: Grind Time, Gud EXP Stamp, Wicked Smart, Active Learning, dungeon EXP, Jelly EXP rewards, Justice EXP and its multiplier, Gloomie Expie, and Sanctum of EXP.</p><p>${model.unknown.length?'Missing save fields: '+esc(model.unknown.join(', '))+'.':'All primary source fields are present.'} Other EXP systems are not yet assessed.</p><p>“Additive points” change the bonus pool; they are not total EXP percentages. Suggested batches are planning targets, not caps.</p></details>`}`;
    $('expChangeSave').onclick=()=>{$('inputPanel').classList.remove('hidden');$('jsonInput').scrollIntoView({block:'center'});$('jsonInput').focus();};
    if(state){$('expMode').value=expMode;$('expSession').value=expSession;$('expMode').onchange=e=>{expMode=e.target.value;renderClassExp();};$('expSession').onchange=e=>{expSession=e.target.value;renderClassExp();};}
  }
  function renderWorldPage(name){
    if(name==='dailies'){$('worldContent').dataset.page=name;window.Dailies.render($('worldContent'),loadedExport||state?.rawRoot||{});return;}
    const page=SKILL_PAGES[name];if(!page)return;
    $('worldContent').dataset.page=name;
    const decodeRequest={};$('worldContent').decodeRequest=decodeRequest;
    const afterDecode=(draw,prepare=()=>window.BonusSystems.getRowsAsync(loadedExport||state.rawRoot))=>{
      if(!state){draw();return;}
      const host=$('worldContent');host.innerHTML='<p role="status">Preparing account data…</p>';
      prepare().then(()=>{if(host.decodeRequest===decodeRequest&&host.dataset.page===name)draw();}).catch(error=>{if(host.decodeRequest===decodeRequest&&host.dataset.page===name)host.innerHTML=`<p>Could not prepare account data: ${esc(error.message)}</p>`;});
    };
    $('worldContent').bonusAfterRender=null;
    if(name==='accountReview'){window.AccountReview.render($('worldContent'),loadedExport||state?.rawRoot||{});return;}
    if(name==='loadouts'){afterDecode(()=>window.Loadouts.render($('worldContent'),loadedExport||state?.rawRoot||{}),()=>Promise.resolve(window.BeanValueEngine.systems(loadedExport||state.rawRoot)));return;}
    $('worldContent').classList.toggle('jar-page',name==='holeJars');
    const addSubtabs=()=>{const parentKey=page.parent||name,parent=SKILL_PAGES[parentKey],keys=[parentKey,...(parent.tabs||[])];if(keys.length<2)return;const head=$('worldContent').querySelector('.section-head,.bonus-system-hero,.divinity-hero');if(parentKey==='hole'){if($('worldContent').querySelector('.hole-tab-stack'))return;const activeGroup=HOLE_TAB_GROUPS.find(group=>group.keys.includes(name))||HOLE_TAB_GROUPS[0],stack=document.createElement('div');stack.className='hole-tab-stack';stack.innerHTML=`<nav class="skill-tabs hole-group-tabs" role="tablist" aria-label="The Hole groups">${HOLE_TAB_GROUPS.map(group=>`<button class="skill-tab${group===activeGroup?' active':''}" data-hole-group="${esc(group.keys[0])}" role="tab" aria-selected="${group===activeGroup}">${esc(group.label)}</button>`).join('')}</nav><nav class="skill-tabs hole-section-tabs${activeGroup.label==='Villagers'?' hole-villager-tabs':''}" role="tablist" aria-label="${esc(activeGroup.label)} sections">${activeGroup.keys.map(key=>`<button class="skill-tab${key===name?' active':''}" data-skill-tab="${esc(key)}" role="tab" aria-selected="${key===name}">${HOLE_VILLAGER_ICONS[key]!=null?`<span class="hole-portrait"><img src="assets/HoleUIvillager${HOLE_VILLAGER_ICONS[key]}.png" alt=""></span>`:''}<span>${esc(key==='hole'?'Explore':SKILL_PAGES[key].title)}</span></button>`).join('')}</nav>`;head?.insertAdjacentElement('afterend',stack);stack.querySelectorAll('[data-hole-group]').forEach(button=>button.onclick=()=>selectSideNav(button.dataset.holeGroup));stack.querySelectorAll('[data-skill-tab]').forEach(button=>button.onclick=()=>selectSideNav(button.dataset.skillTab));return;}const nav=document.createElement('nav');nav.className='skill-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label',`${parent.title} sections`);nav.innerHTML=keys.map(key=>`<button class="skill-tab${key===name?' active':''}" data-skill-tab="${esc(key)}" role="tab" aria-selected="${key===name}">${esc(SKILL_PAGES[key].title)}</button>`).join('');if(parentKey==='coralReef')$('worldContent').prepend(nav);else head?.insertAdjacentElement('afterend',nav);nav.querySelectorAll('[data-skill-tab]').forEach(button=>button.onclick=()=>selectSideNav(button.dataset.skillTab));};
    $('worldContent').bonusAfterRender=addSubtabs;
    if(name==='research'){window.ResearchPage.render($('worldContent'),loadedExport||state?.rawRoot||{});return;}
    if(name==='minigames'){ $('worldContent').innerHTML='<div class="section-head compact"><div><h2>Minigames</h2><p>Select Hoops or Darts to see your saved scores and bonuses.</p></div></div>';addSubtabs();return;}
    if(['orion','poppy','bubba'].includes(name)){afterDecode(()=>{window.BonusSystems.render($('worldContent'),name,loadedExport||state?.rawRoot||{});addSubtabs();});return;}
    if(name==='classExp'){afterDecode(renderClassExp);return;}
    if(name==='royalArmory'){window.RoyalArmory.render($('worldContent'),loadedExport||state?.rawRoot||{});return;}
    if(name==='arcade'){renderArcade();return;}
    if(name==='prayerOptimizer'){window.PrayerOptimizer.render($('worldContent'),loadedExport||state?.rawRoot||{},addSubtabs);return;}
    if(['arenaTeams','spiceTeams'].includes(name)){window.BreedingTeams.render($('worldContent'),name,loadedExport||state?.rawRoot||{},addSubtabs);return;}
    if(['bribes','dungeons','vials','sigils','killroy','atomCollider','prayers','saltLick','deathNote','armorSets','petArena','shinyPets','upgradeVault','emperorBonuses','spelunking','sushi','button','clamworks','meritocracy','bigFish','coralKid','coralReef','dancingCoral','zenithMarket','legendTalents','hoops','darts'].includes(name)){window.ArcadePages.render($('worldContent'),name,loadedExport||state?.rawRoot||{},addSubtabs);return;}
    if(name==='refinery'){window.RefineryPlanner.render($('worldContent'),loadedExport||state?.rawRoot||{},addSubtabs);return;}
    if(name==='holeCove'&&window.CovePage){window.CovePage.render($('worldContent'),loadedExport||state?.rawRoot||state?.rawData||{},addSubtabs);return;}
    if(['statues','dungeons','obols','printer','prayers','hole','holeTrench','holeCove'].includes(name)){window.RemainingWorlds.render($('worldContent'),name,state?.rawData||{},loadedExport||state?.rawRoot||{});addSubtabs();return;}
    if(name==='construction'){renderConstruction();addSubtabs();return;}
    if(name==='worship'){window.Worship.render($('worldContent'),state?.rawData||{});addSubtabs();return;}
    if(name==='towerDefense'){window.Worship.renderTD($('worldContent'),state?.rawData||{});addSubtabs();return;}
    if(name==='armorSets'){window.ArmorSets.render($('worldContent'),state?.rawData||{});return;}
    if(['vials','sigils','votes','killroy','saltLick','shinyPets','upgradeVault','gamingPalette','emperorBonuses','compass','grimoire','tesseract','orion','poppy','bubba','starSigns','constellations','shrines','deathNote','forgeBonuses','anvilUpgrades','islandExpeditions','poExtras','atomCollider','eventShop','familyBonuses','gemShop','friendBonuses','holeAllBonuses','holeSchematics','holeMajik','holeStudies','holeMeasurements','holeFloors','holeBravery','holeJustice','holeWisdom','holeSanctum','holeBell','holeWell','holeFountain','holeResources','holeHarp','holeLamp','holeDawgDen','holeJars','holeGambit','clamworks','meritocracy','bigFish','coralKid','coralReef','dancingCoral','hoops','darts','zenithMarket','sushi','button','legendTalents'].includes(name)){window.BonusSystems.render($('worldContent'),name,loadedExport||state?.rawRoot||{});addSubtabs();return;}
    if(name==='lab'){window.Lab.render($('worldContent'),state?.rawData||{},state?.rawRoot||{});return;}
    if(['breeding','cooking','rift'].includes(name)){window.World4.render($('worldContent'),name,state?.rawData||{},state?.rawRoot||{});return;}
    if(name==='divinity'){window.Divinity.render($('worldContent'),state?.rawData||{},state?.rawRoot||{},addSubtabs);return;}
    if(name==='sailing'||name==='gaming'){window.World5.render($('worldContent'),name,state?.rawData||{});return;}
    if(name==='tome'||name==='slab'){window.ProgressionPages.render($('worldContent'),name,loadedExport||state?.rawRoot||{});return;}
    if(name==='equinox'){window.Equinox.render($('worldContent'),state?.rawData||{});return;}
    if(name==='farming'||name==='sneaking'||name==='summoning'){window.World6.render($('worldContent'),name,state?.rawData||{},loadedExport||state?.rawRoot||{});return;}
    if(name==='beanstalk'){afterDecode(()=>window.Beanstalk.render($('worldContent'),state?.rawData||{},state?.rawRoot||{}),()=>window.BeanValueEngine.calculateAsync(loadedExport||state.rawRoot));return;}
      if(name==='minehead'||name==='glimbo'||name==='spelunking'||name==='research'||name==='coral'){window.World7.render($('worldContent'),name,state?.rawData||{});addSubtabs();return;}
    if(name==='trapping'){window.TrapsPage.render($('worldContent'),loadedExport||state?.rawRoot||{});return;}
    if(name==='weeklyBosses'){$('worldContent').innerHTML=`<div class="section-head compact"><div><p class="eyebrow">${esc(page.world)}</p><h2>${esc(page.title)}</h2></div></div><section class="panel"><h3>Not yet implemented</h3><p>${name==='trapping'?'Trap placements, catches, and collection timing':'Weekly boss progress and rewards'} are not connected to your save yet.</p></section>`;return;}
    if(name==='hatRack'){window.HatRack.render($('worldContent'),loadedExport||state?.rawRoot||{});return;}
    if(name==='nametags'){window.Gallery.render($('worldContent'),state?.rawData||{});return;}
    if(name==='cards'){window.CardsPage.render($('worldContent'),state?.rawData||{},state?.rawRoot||{});return;}
    if(name==='characters'){window.CharacterTalents.render($('worldContent'),state?.rawData||{},state?.rawRoot||{});return;}
    if(name==='guilds'||name==='tasks'||name==='events'){window.AccountPages.render($('worldContent'),name,state?.rawData||{},state?.rawRoot||{});return;}
    if(name==='buffs'){const host=$('worldContent'),rawRoot=state?.rawRoot||{};host.innerHTML='<section class="bonus-system-empty"><h2>Loading account bonuses…</h2><p>The save is being decoded in the background.</p></section>';window.BonusSystems.getRowsAsync(rawRoot).then(()=>{if(host.dataset.page==='buffs')window.MiscBuffs.render(host,state?.rawData||{},rawRoot);}).catch(error=>{if(host.dataset.page==='buffs')host.innerHTML=`<section class="bonus-system-empty"><h2>Could not decode this save</h2><p>${esc(error?.message||String(error))}</p></section>`;});return;}
    if(name==='quests'){const host=$('worldContent'),rawRoot=loadedExport||state?.rawRoot||{},token={};host.questRequest=token;host.questRender=null;host.innerHTML='<section class="bonus-system-empty"><h2>Loading quests…</h2><p>Quest progress is being decoded in the background.</p></section>';window.QuestsPage.prepare(rawRoot).then(()=>{if(host.dataset.page==='quests'&&host.questRequest===token)window.QuestsPage.render(host,rawRoot);}).catch(error=>{if(host.dataset.page==='quests'&&host.questRequest===token)host.innerHTML=`<section class="bonus-system-empty"><h2>Could not decode quests</h2><p>${esc(error?.message||String(error))}</p></section>`;});return;}
    if(name==='pets'){window.PetsPage.render($('worldContent'),state?.rawData||{},loadedExport||state?.rawRoot||{});return;}
    if(name==='goldFood'){window.GoldFood.render($('worldContent'),state?.rawData||{},state?.rawRoot||{});return;}
    if(name==='shadowCaps'){
      window.ShadowCaps.render($('worldContent'));
      return;
    }
    if(name==='communitySheets'){
      window.CommunitySheets.render($('worldContent'));
      return;
    }
    if(name==='credits'){
      const resources=[['Legends of Idleon','Game, artwork, terminology, and the systems represented by this planner.','https://www.legendsofidleon.com/'],['IdleOn Wiki','Community-maintained reference for items, monsters, skills, maps, and mechanics.','https://idleon.wiki/wiki/Main_Page'],['DigitalTQ IdleOn Guides','Statue sources, crystal farming mechanics, respawn bonuses, and progression references.','https://www.digitaltq.com/wiki/idleon/statue-farming-guide'],['Games Finder IdleOn Guides','Cross-checking for statue farming locations and character setups.','https://gameslikefinder.com/article/idleon-statues-guide/'],['Idleon.guide','Active statue setups and direct-drop versus crystal-farming guidance.','https://idleon.guide/statue-farming/']];
      const sheets=[['Antho & Arkh’s IdleOn Spreadsheet','World-grouped statue farming, active locations, statue value, and statue drop multipliers.','https://docs.google.com/spreadsheets/d/1IcxwlHKPcw57PJxOWmtCJTP2Iv6ubdRSEwzMjbH476U/edit?gid=510141304#gid=510141304'],["AlmostPsycho's Sampling Sheet (Updated Version of Herus old sheet)",'Sampling setups and reference configurations.','https://docs.google.com/spreadsheets/d/1at-y9t5ohYky33nOLoSxHYeyRX-3T91paj-nTSHrB3c/edit?gid=1149427600#gid=1149427600'],['Weekly Boss Rotations','Weekly boss rotations and character planning reference.','https://docs.google.com/spreadsheets/d/1z1P2ouvYhe2pryWoF0kIQE7QichYpJt1GaPPos-e-aw/htmlview?ouid=100192538871121683136&usp=sheets_home&ths=true&pru=AAABnvRY65A*74Ik4AaZgon0T7BqbOmu6w#']];
      const discord=[['Official IdleOn Discord','Official community server for announcements, help, guild recruitment, party finding, and player discussion.','https://discord.gg/idleon'],['NaughtGawd Community Discord','Community Discord shared by NaughtGawd.','https://discord.gg/ZENGsZE7N'],['Bright Hollow | HOLO','IdleOn community server.','https://discord.gg/NDvmgya3M'],['Idleon Toolbox','Community server for the Idleon Toolbox.','https://discord.gg/NgGyEPtwD'],["Nephilheim's server",'IdleOn community server.','https://discord.gg/tCARbV9Rv'],['The Vault','IdleOn community server.','https://discord.gg/cdCsrmSWE'],['Discord','Open Discord to browse or manage servers.','https://discord.gg/']];
      const twitch=[['LavaFlame2 on Twitch','The developer’s Twitch channel for official streams and broadcasts.','https://www.twitch.tv/lava_flame2'],['NaughtGawd on Twitch','Community Twitch channel shared by NaughtGawd.','https://www.twitch.tv/naughtgawd'],['Packdup on Twitch','Community Twitch channel shared by the project owner.','https://www.twitch.tv/packdup'],['Will309 Productions on Twitch','IdleOn streams and community content.','https://www.twitch.tv/will309productions']];
      const youtubers=[['Pulse Idle','IdleOn guides and community resources.','https://www.youtube.com/@PulseIdle'],['GriffyBit','IdleOn progression, builds, livestreams, and account reviews.','https://www.youtube.com/@GriffyBitMain'],['Will309 Productions','IdleOn videos and community content.','https://www.youtube.com/@will309productions'],['IdleOn','Official developer videos, patch previews, and dev streams.','https://www.youtube.com/@IdleOn']];
      const optimizers=[['Idleon AutoReview','Account-progress review and prioritized advice.','https://ieautoreview-scoli.pythonanywhere.com/?player=&autoloot=on&doot=on&riftslug=on&sheepie=on&order_tiers=on&library_group_characters=on&hide_overwhelming=off&hide_optional=off&hide_completed=off&hide_informational=off&hide_unrated=off&progress_bars=off&tabbed_advice_groups=on&handedness=off&light=null'],['Idleon Efficiency','Account tracker, calculators, and planning tools.','https://www.idleonefficiency.com/'],['Idleon Optimizer — Poppy','Poppy optimizer.','https://idleon-optimizer.vercel.app/poppy'],['Idleon Justice','Justice planning tool.','https://idleon-justice.vercel.app'],['Research Optimizer v2','Research-grid optimizer.','https://corgan.github.io/idleon-research-optimizer/research-optimizer-v2.html'],['FO','FO optimizer.','https://egizz983.github.io/FO/'],['Jelly Operator Calculator','Jelly Operator calculator.','https://corgan.github.io/idleon-research-optimizer/jelly-operator-calc.html'],['Fountain Calculator','Fountain calculator.','https://corgan.github.io/idleon-research-optimizer/fountain-calc.html']];
      const creditCards=(rows,label,action)=>`<section class="credits-note"><strong>${esc(label)}</strong><span>Open these community links in a new tab.</span></section><div class="credits-grid">${rows.map(([title,description,url])=>`<a href="${url}" target="_blank" rel="noopener noreferrer"><span>${esc(label)}</span><strong>${esc(title)}</strong><p>${esc(description)}</p><b>${esc(action)} →</b></a>`).join('')}</div>`;
      $('worldContent').innerHTML=`<div class="section-head compact"><div><p class="eyebrow">About this planner</p><h2>Credits &amp; Resources</h2><p>Helpful work from the IdleOn community that informed parts of this planner.</p></div></div><nav class="skill-tabs credits-tabs"><button class="skill-tab active" data-credit-tab="resources">Credits &amp; Resources</button><button class="skill-tab" data-credit-tab="sheets">Spreadsheets</button><button class="skill-tab" data-credit-tab="discord">Discord</button><button class="skill-tab" data-credit-tab="twitch">Twitch</button><button class="skill-tab" data-credit-tab="youtubers">YouTubers</button><button class="skill-tab" data-credit-tab="optimizers">Optimizers</button></nav><div id="creditResources">${creditCards(resources,'Credits & resources','Visit source')}</div><div id="creditSheets" class="hidden">${creditCards(sheets,'Community spreadsheets','Open spreadsheet')}</div><div id="creditDiscord" class="hidden">${creditCards(discord,'IdleOn Discord','Join Discord')}</div><div id="creditTwitch" class="hidden">${creditCards(twitch,'IdleOn Twitch','Open Twitch')}</div><div id="creditYoutubers" class="hidden">${creditCards(youtubers,'IdleOn YouTubers','Open YouTube')}</div><div id="creditOptimizers" class="hidden">${creditCards(optimizers,'Community optimizers','Open optimizer')}</div><p class="credits-disclaimer">Legends of Idleon and its assets belong to LavaFlame2. This is an independent local planning tool and is not affiliated with or endorsed by the game or the linked guide authors.</p>`;
      $('worldContent').querySelectorAll('[data-credit-tab]').forEach(button=>button.onclick=()=>{const tab=button.dataset.creditTab;['resources','sheets','discord','twitch','youtubers','optimizers'].forEach(id=>$(`credit${id[0].toUpperCase()}${id.slice(1)}`).classList.toggle('hidden',id!==tab));$('worldContent').querySelectorAll('[data-credit-tab]').forEach(x=>x.classList.toggle('active',x===button));});
      return;
    }
    if(name==='bribes'){renderBribes();return;}
    if(name==='postOffice'){renderPostOffice();addSubtabs();return;}
    if(name==='stamps'){renderStamps();return;}
    if(name==='alchemy'){renderAlchemy();addSubtabs();return;}
    const parentKey=page.parent||name,parent=SKILL_PAGES[parentKey],tabKeys=[parentKey,...(parent.tabs||[])];
    const tabs=tabKeys.length>1?`<nav class="skill-tabs" role="tablist" aria-label="${esc(parent.title)} sections">${tabKeys.map(key=>`<button class="skill-tab${key===name?' active':''}" data-skill-tab="${esc(key)}" role="tab" aria-selected="${key===name}">${esc(SKILL_PAGES[key].title)}</button>`).join('')}</nav>`:'';
    const baseline=BASELINES[name]||[page.copy,'Save data mapping will be added here.','Planning tools will follow after the baseline data view.'];
    $('worldContent').innerHTML=`<div class="section-head compact"><div><p class="eyebrow">${esc(page.world)}</p><h2>${esc(parent.title)}</h2><p>${esc(parent.copy)}</p></div></div>${tabs}<section class="skill-baseline"><article><span class="baseline-kicker">How it works</span><p>${esc(baseline[0])}</p></article><article><span class="baseline-kicker">What this page will track</span><p>${esc(baseline[1])}</p></article><article><span class="baseline-kicker">Planner baseline</span><p>${esc(baseline[2])}</p></article></section>`;
    $('worldContent').insertAdjacentHTML('beforeend',window.ExpTabs.worldInfo(name,state));
    $('worldContent').querySelectorAll('[data-skill-tab]').forEach(button=>button.addEventListener('click',()=>selectSideNav(button.dataset.skillTab)));
  }

  function trainingContext(){
    if(!state)return null;
    return JSON.stringify({boss:state.obstruction,plots:(state.plots||[]).slice().sort((a,b)=>a-b),cells:E.unitsOwned(state),virus:E.virusLimit(state)});
  }
  function readPlaybook(){
    try{const value=JSON.parse(localStorage.getItem(TRAINING_KEY)||'[]');return Array.isArray(value)?value.filter(x=>x&&Array.isArray(x.arrangement)):[];}catch(_){return [];}
  }
  function writePlaybook(entries){
    try{localStorage.setItem(TRAINING_KEY,JSON.stringify(entries.slice(0,48)));}catch(_){/* browser storage is optional */}
  }
  function memoryForBoard(){const key=trainingContext();return key?readPlaybook().filter(x=>x.context===key&&E.isLegalLayout(state,x.arrangement)):[];}
  function saveTraining(value){
    if(!value?.best||!state)return;
    const context=trainingContext(),entry={context,arrangement:value.best.arrangement,fever:value.best.fever,steroidStart:value.best.steroidStart,stats:value.best.stats,objective:E.timedObjective(value.best.stats,$('objectiveMode').value),savedAt:Date.now(),generations:value.generations};
    const others=readPlaybook().filter(x=>x.context!==context&&Date.now()-Number(x.savedAt||0)<1000*60*60*24*90);
    const board=memoryForBoard().concat(entry).sort((a,b)=>Number(b.objective||-Infinity)-Number(a.objective||-Infinity));
    const unique=[],seen=new Set();for(const candidate of board){const key=E.arrangementKey(candidate.arrangement);if(!seen.has(key)){seen.add(key);unique.push(candidate);}}
    writePlaybook(others.concat(unique.slice(0,8)));
  }
  function renderTrainer(){
    const has=!!state,entries=has?memoryForBoard():[];
    $('trainBtn').disabled=!has;$('exportMemoryBtn').disabled=!has;$('clearMemoryBtn').disabled=!has||!entries.length;
    if(!has){$('trainerStatus').textContent='Load a save to start local self-play.';$('trainerMemory').innerHTML='';return;}
    $('trainerStatus').textContent=entries.length?`${entries.length} remembered layout${entries.length===1?'':'s'} for this boss and board. Training rechecks them before keeping a new best.`:'No saved layout for this boss and board yet. Train to create a local playbook.';
    $('trainerMemory').innerHTML=entries.slice(0,3).map((entry,i)=>`<div class="memory-row"><strong>#${i+1}</strong><span>${pct(entry.stats?.clearRate??0,0)} clear</span><span>${E.formatTime(entry.stats?.medianClearTime)}</span><span>${E.FEVER_NAMES[entry.fever]||'Current Fever'}</span><span>saved ${new Date(entry.savedAt).toLocaleDateString()}</span></div>`).join('');
  }
  function renderCellMix(bestArr,boardState=state){
    renderMechanics(boardState,bestArr||currentArrangement);
    const cur=E.rawCounts(currentArrangement),best=E.rawCounts(bestArr||currentArrangement),effective=E.effectiveCounts(boardState,best),n=E.unitsOwned(state),three=E.upgradeQty(boardState,14)>=1;
    $('cellMix').innerHTML=Array.from({length:n},(_,i)=>`<div class="cell-chip"><img src="assets/JellyUnit${i}.png" alt="${esc(E.UNIT_NAMES[i])}"><div><div class="name">${esc(E.UNIT_NAMES[i])}</div><div class="count">${best[i]}</div><div class="current-vs">current ${cur[i]} · level ${Math.round(state.cellLevels[i]||0)}${three&&i!==5?` · effective ${effective[i]}`:''}</div></div></div>`).join('');
  }

  function renderMechanics(boardState,arr){
    const a=E.bonusAudit(boardState),e=a.economy;
    const factor=n=>'x'+Number(n).toFixed(3);
    $('bonusAudit').innerHTML='<p>'+(a.combatKnown?'Combat account inputs decoded.':'Missing combat inputs: '+esc(a.missing.join(', '))+'.')+' Values use '+esc(E.FEVER_NAMES[boardState.fever]||'no')+' Fever.</p><div class="stats">'+[
      stat('Account damage',factor(a.damageMultiplier),'before cell levels, counts, infection and position'),
      stat('Gaming Palette','+'+Number(a.damage.palette).toFixed(2)+'%','shares the Destruction additive term'),
      stat('Cellular Warfare','+'+Number(a.damage.grid).toFixed(2)+'%','separate damage multiplier'),
      stat('Organelle adjacency',factor(a.organelle),a.sushiUnique+' Sushi rewards decoded'),
      stat('Cells of Three',E.upgradeQty(boardState,14)>=1?'active':'locked',E.upgradeQty(boardState,14)>=1?'each full three of a non-Virus type adds one effective passive count':''),
      stat('Cell EXP',factor(a.expMultiplier),'per landed shot when Biology is unlocked'),
      stat('Fever speed',factor(a.feverSpeed)),
      stat('Bloodcell multiplier',e.known?factor(e.multiplier):'Incomplete','at saved best DPS; does not increase combat damage'),
      stat('Daily attempts',e.dailyAttempts),stat('Daily transfusion',E.formatNumber(e.dailyTransfusion))
    ].join('')+'</div><details><summary>Bloodcell factor breakdown</summary><p>'+Object.entries(e.factors).map(([k,v])=>esc(k)+' '+factor(v)).join(' / ')+'</p><p>'+(e.known?'All listed economy inputs decoded. The DPS factor can change during an operation; this is not a forecast of the amount earned.':'Missing: '+esc(e.missing.join(', '))+'. Unknown factors above use neutral placeholders.')+'</p></details>';
    $('cellReference').innerHTML=E.cellDetails(boardState,arr).map(c=>'<article class="cell-reference"><h3>'+esc(c.name)+(c.unlocked?'':' - locked')+'</h3><p>'+c.area+' squares / '+c.count+' placed / '+c.effective+' effective / level '+c.level+'</p><p><strong>Passive:</strong> '+esc(c.passive)+'</p><p><strong>Ability:</strong> '+esc(c.ability)+'</p>'+(c.hitRange?'<p>Initial hit '+c.hitRange.map(v=>E.formatNumber(v)).join(' to ')+' / steady firing interval '+c.intervalRange.map(v=>v.toFixed(3)+'s').join(' to ')+' / '+c.boosted+' adjacency boosted. Excludes travel, initial random charge, Steroid and later weakening.</p>':'')+'</article>').join('');
  }

  function impactText(u){
    if(u.oneOff)return `<span class="neutral">${u.boardChanging?'One-off · re-optimize':'One-off unlock'}</span>`;
    if(!u.timed&&u.category==='economy')return '<span class="neutral">Economy / Bloodcells</span>';
    if(!u.timed&&u.category==='progression')return '<span class="neutral">EXP / progression</span>';
    if(!u.timed)return '<span class="neutral">Not simulated</span>';
    if(u.clearDelta>0.0005)return `<span class="good">+${(u.clearDelta*100).toFixed(0)}% clear chance</span>`;
    if(u.timeSaved!=null&&u.timeSaved>.02)return `<span class="good">−${u.timeSaved.toFixed(2)}s median</span>`;
    return '<span class="neutral">tiny/no timed gain here</span>';
  }
  function renderUpgrades(arr,stats,damageScale){
    let list=[];
    try{list=E.upgradeRoadmap(state,arr,{baseStats:stats,damageScale,reviveDelaySeconds:currentReviveDelay()}).slice(0,18);}catch(e){console.warn('Upgrade simulation failed',e);}
    $('upgrades').classList.add('jelly-roadmap-grid');
    $('upgrades').innerHTML=list.map(u=>`<details class="upgrade ${u.affordable?'':'unaffordable'}">
      <summary><img class="upgrade-icon" src="assets/JellyUpg${u.id}.png" alt=""><strong>${esc(u.name)}</strong><span>Lv ${u.level} · ${E.formatNumber(u.cost)} Bloodcells</span></summary>
      <div class="upgrade-main">
        <div class="upgrade-name">${esc(u.name)}${u.boardChanging?'<span class="tag">BOARD</span>':''}</div>
        <div class="upgrade-meta">Lv ${u.level} → ${u.level+1}${u.affordable?' · affordable':' · not enough Bloodcells'}</div>
        <div class="upgrade-desc">${esc(u.desc)}${u.note?` ${esc(u.note)}`:''}</div>
      </div>
      <div class="upgrade-impact">${impactText(u)}${u.damageRatio!==1?`<div class="good">${(u.damageRatio-1)*100>=0?'+':''}${((u.damageRatio-1)*100).toFixed(2)}% board DMG</div>`:''}${u.currencyRatio!==1?`<div class="good">${(u.currencyRatio-1)*100>=0?'+':''}${((u.currencyRatio-1)*100).toFixed(2)}% Bloodcells</div>`:''}<div class="cost">${E.formatNumber(u.cost)}</div></div>
    </details>`).join('')||'<p class="subtitle">No reachable upgrade candidates in the decoded tree.</p>';
  }

  function renderInitial(){
    if(state.hasJelly===false){currentArrangement=null;currentStats=null;lastResult=null;renderHome();return;}
    currentArrangement=E.arrangementFromBoard(state);
    calibration=chooseCalibration();
    const q=quality();
    currentStats=E.simulateMany(state,currentArrangement,{runs:Math.max(18,q.runs),damageScale:calibration.scale,seed:0xCAFE,useSteroid:true,reviveDelaySeconds:currentReviveDelay()});
    $('alternativesPanel').classList.add('hidden');$('layoutChanges').textContent='';$('replayPanel').classList.add('hidden');$('planBtn').disabled=true;lastResult=null;lastNextMove=null;$('nextMove').innerHTML='<p class="subtitle">Run Optimize timed clear to calculate the next purchase.</p>';
    renderStateStats();renderBoard($('currentBoard'),currentArrangement);renderBoard($('bestBoard'),currentArrangement);
    renderSummary($('currentSummary'),currentStats);renderSummary($('bestSummary'),currentStats);renderTimeline($('currentTimeline'),currentStats);renderTimeline($('bestTimeline'),currentStats);
    $('currentVerdict').innerHTML=verdict(currentStats);$('bestVerdict').innerHTML=verdict(currentStats);
    renderCellMix(currentArrangement);renderTrainer();renderHome();
    initialUpgradesPending=true;initialPracticePending=true;
    $('solverStatus').textContent='Loaded. Current layout has been timed. Hit Optimize timed clear to search legal arrangements.';
    $('calibrationNote').textContent=calibrationText(calibration);
  }

  function loadText(text){
    clearFail();
    try{
      const nextState=E.parseInput(text),nextExport=nextState.rawRoot;
      const returnPage=typeof window!=='undefined'?window.plannerQoL?.lastPage():null;
      state=nextState;loadedExport=nextExport;$('workspace').classList.remove('hidden');persistInput();$('jsonInput').value='';$('inputPanel').classList.add('hidden');$('changeJsonBtn').classList.remove('hidden');selectSideNav('home');renderHome();
      $('navJelly').disabled=state.hasJelly===false;$('navJelly').title=state.hasJelly===false?'Jelly Operator data is not available in this export. Other account pages still work.':'';
      $('workspace').scrollIntoView({behavior:'smooth',block:'start'});
      if(typeof window!=='undefined'){window.plannerQoL?.onImport(nextExport);if(returnPage&&returnPage!=='home')selectSideNav(returnPage);}
    }catch(e){fail(e?.message||String(e));}
  }

  $('parseBtn').addEventListener('click',()=>loadText($('jsonInput').value));
  $('clearBtn').addEventListener('click',()=>{state=null;loadedExport=null;lastResult=null;currentArrangement=null;$('jsonInput').value='';$('workspace').classList.add('hidden');$('inputPanel').classList.remove('hidden');$('changeJsonBtn').classList.add('hidden');clearFail();try{sessionStorage.removeItem(SESSION_KEY);}catch(_){}});
  $('changeJsonBtn').addEventListener('click',()=>{$('inputPanel').classList.remove('hidden');$('changeJsonBtn').classList.add('hidden');$('jsonInput').focus();});
  $('rememberTab').addEventListener('change',persistInput);
  $('jsonInput').addEventListener('input',()=>{if($('rememberTab').checked)persistInput();});
  $('fileInput').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{const text=await f.text();$('jsonInput').value=text;loadText(text);}catch(err){fail(err?.message||String(err));}});
  $('searchQuality').addEventListener('change',()=>{if(state){$('solverStatus').textContent='Search quality changed. Re-run Optimize for a new timed search.';}});
  $('objectiveMode').addEventListener('change',()=>{if(state){$('solverStatus').textContent='Optimization goal changed. Re-run Optimize timed clear.';}});
  $('observedTime').addEventListener('change',()=>{try{sessionStorage.setItem(OBS_KEY,$('observedTime').value||'');}catch(_){}if(state){$('solverStatus').textContent='Calibration changed. Re-run Optimize timed clear to apply it.';}});
  if($('reviveDelay'))$('reviveDelay').addEventListener('change',()=>{try{sessionStorage.setItem(REVIVE_KEY,$('reviveDelay').value||'0');}catch(_){}if(state){$('solverStatus').textContent='Revive reaction time changed. Re-run Optimize timed clear.';}});

  function renderReplay(){
    if(!lastResult?.replay)return;
    const index=Number($('replayFrame').value),sample=index?lastResult.replay.trace[index-1]:null;
    const board=$('bestBoard');board.querySelectorAll('.dead-overlay').forEach(x=>x.remove());
    if(sample)for(const square of sample.dead){const marker=document.createElement('span');marker.className='dead-overlay';marker.textContent='×';marker.style.left=`${square%E.COLS/E.COLS*100}%`;marker.style.top=`${Math.floor(square/E.COLS)/E.ROWS*100}%`;board.appendChild(marker);}
    const deadCores=sample?lastResult.arrangement.filter(p=>sample.dead.includes(p.anchor)).length:0;
    $('replayStatus').textContent=`${E.formatTime(sample?.time??0)} · ${pct(sample?.hpFraction??1,1)} boss HP · ${deadCores} dead cores${sample?.steroid?' · Stronkroid active':''}. One seeded sample; aggregate results above use all runs.`;
  }
  $('replayFrame').addEventListener('input',renderReplay);

  function availablePracticeFevers(){
    const n=E.feverUnlocked(state)?Math.min(6,Math.floor(E.upgradeQty(state,16))):0;
    return n?[...Array.from({length:n},(_,i)=>i)]:[Math.round(state.fever)||0];
  }
  function currentPracticeSample(){
    if(!practice?.run)return null;
    const index=Number($('practiceFrame').value)||0;
    return index?practice.run.trace[index-1]:null;
  }
  function practiceArrangement(){
    if($('practiceLayout').value==='custom'&&practice?.arrangement)return practice.arrangement;
    return $('practiceLayout').value==='recommended'&&lastResult?.arrangement?lastResult.arrangement:currentArrangement;
  }
  function refreshPracticeFevers(){
    if(!state)return;
    const wanted=Number($('practiceFever').value),fevers=availablePracticeFevers();
    $('practiceFever').innerHTML=fevers.map(f=>`<option value="${f}">${esc(E.FEVER_NAMES[f]||'None')}</option>`).join('');
    $('practiceFever').value=String(fevers.includes(wanted)?wanted:Math.round(state.fever));
  }
  function refreshPracticeCells(){
    if(!state)return;
    const n=E.unitsOwned(state),wanted=Number($('practiceCellType').value);
    $('practiceCellType').innerHTML=Array.from({length:n},(_,t)=>`<option value="${t}">${esc(E.UNIT_NAMES[t])}</option>`).join('');
    $('practiceCellType').value=String(wanted>=0&&wanted<n?wanted:0);
    $('practicePalette').innerHTML=Array.from({length:n},(_,t)=>`<div class="practice-cell ${t===Number($('practiceCellType').value)?'selected':''}" draggable="true" data-cell-type="${t}"><img src="assets/JellyUnit${t}.png" alt=""><span>${esc(E.UNIT_NAMES[t])}</span></div>`).join('');
    for(const cell of $('practicePalette').querySelectorAll('.practice-cell')){
      cell.addEventListener('click',()=>{$('practiceCellType').value=cell.dataset.cellType;refreshPracticeCells();});
      cell.addEventListener('dragstart',event=>{event.dataTransfer.effectAllowed='copy';event.dataTransfer.setData('text/plain',cell.dataset.cellType);});
    }
  }
  function boardSquareFromEvent(board,event){
    const rect=board.getBoundingClientRect(),col=Math.floor((event.clientX-rect.left)/rect.width*E.COLS),row=Math.floor((event.clientY-rect.top)/rect.height*E.ROWS);
    return col>=0&&col<E.COLS&&row>=0&&row<E.ROWS?row*E.COLS+col:null;
  }
  function bindPracticeDrag(board){
    board.ondragover=event=>{event.preventDefault();event.dataTransfer.dropEffect='copy';board.classList.add('drag-target');};
    board.ondragleave=()=>board.classList.remove('drag-target');
    board.ondrop=event=>{event.preventDefault();board.classList.remove('drag-target');const type=Number(event.dataTransfer.getData('text/plain')),square=boardSquareFromEvent(board,event);if(Number.isInteger(type)&&square!=null)practiceAddAt(type,square);};
  }
  function runPractice(reset=false,rebuildLayout=false){
    if(!state)return;
    if(!practice)practice={revives:[],steroidStart:null,selected:null,editMode:null,pendingMoveAnchor:null,notice:'',playing:false,playCarry:0};
    if(rebuildLayout||!practice.arrangement)practice.arrangement=practiceArrangement().map(p=>({type:p.type,anchor:p.anchor,cells:p.cells.slice()}));
    if(reset){stopPracticePlayback();practice.revives=[];practice.steroidStart=null;practice.selected=null;practice.pendingMoveAnchor=null;}
    const arr=practice.arrangement;if(!arr?.length){$('practiceStatus').textContent='This layout has no placed cells to simulate.';return;}
    const simState=E.cloneState(state);simState.fever=Number($('practiceFever').value);
    practice.state=simState;
    practice.run=E.simulateOne(simState,arr,{damageScale:calibration?.scale||1,seed:0xFACADE,useSteroid:practice.steroidStart!=null,steroidStartSeconds:practice.steroidStart??0,autoRevive:false,manualRevives:practice.revives,trace:true});
    const previous=Math.min(Number($('practiceFrame').value)||0,practice.run.trace.length);
    $('practiceFrame').max=String(practice.run.trace.length);$('practiceFrame').value=String(reset?0:previous);
    renderPractice();
  }
  function renderPractice(){
    if(!practice?.run)return;
    const sample=currentPracticeSample(),board=$('practiceBoard'),dead=new Set(sample?.dead||[]);
    renderBoard(board,practice.arrangement,practice.state,null,practiceBoardClick);bindPracticeDrag(board);
    for(const square of dead){const marker=document.createElement('span');marker.className='dead-overlay';marker.textContent='×';marker.style.left=`${square%E.COLS/E.COLS*100}%`;marker.style.top=`${Math.floor(square/E.COLS)/E.ROWS*100}%`;board.appendChild(marker);}
    if(practice.selected!=null){const selected=board.querySelector(`[data-square="${practice.selected}"]`);if(selected)selected.classList.add('practice-selected');}
    const time=sample?.time??0,spent=practice.revives.length,available=E.reviveCount(practice.state)-spent;
    $('practiceTime').textContent=E.formatTime(time);
    const atEnd=Number($('practiceFrame').value)>=practice.run.trace.length;
    const liveHp=sample?.hpFraction??1;
    const outcome=atEnd?(practice.run.clear?`Cleared in ${E.formatTime(practice.run.time)}.`:practice.run.result==='fail'?'All board squares were destroyed.':`${pct(practice.run.hpFraction,1)} boss HP remains.`):`${pct(liveHp,1)} boss HP at this moment.`;
    $('practiceStatus').textContent=`Practice only · ${E.FEVER_NAMES[practice.state.fever]||'None'} Fever · ${outcome} ${E.steroidUnlocked(practice.state)?'Stronkroid available.':'Stronkroid locked.'} ${E.reviveCount(practice.state)?`${Math.max(0,available)} simulated revive(s) left.`:'Revival Shots locked.'}${practice.notice?' '+practice.notice:''}`;
    const pills=[];if(practice.steroidStart!=null)pills.push(`<span class="action-pill">Stronkroid at ${E.formatTime(practice.steroidStart)}</span>`);for(const action of practice.revives)pills.push(`<span class="action-pill">Revive square ${action.square} at ${E.formatTime(action.time)}</span>`);if(practice.selected!=null)pills.push(`<span class="action-pill selected">Selected square ${practice.selected}${dead.has(practice.selected)?' · dead':''}</span>`);
    $('practiceActions').innerHTML=pills.join('')||'<span>Move the time slider, click a dead square, then use a simulated active skill.</span>';
    $('practiceSteroid').disabled=!E.steroidUnlocked(practice.state)||practice.steroidStart!=null;
    $('practiceRevive').disabled=!E.reviveCount(practice.state)||available<=0||!dead.size;
    $('practicePlay').textContent=practice.playing?'Pause':'Play';
    for(const [mode,id] of [['add','practiceAdd'],['move','practiceMove'],['remove','practiceRemove']])$(id).classList.toggle('active',practice.editMode===mode);
    $('practiceEditHint').textContent=practice.pendingMoveAnchor!=null?'Now click a legal destination square for the selected cell.':practice.editMode==='add'?'Click an anchor square to add the selected available cell.':practice.editMode==='move'?'Click a placed cell to select it for moving.':practice.editMode==='remove'?'Click any square of a placed cell to remove that whole cell.':'Choose an edit, then click a board square.';
  }
  function setPracticeEdit(mode){if(!practice)return;practice.editMode=practice.editMode===mode?null:mode;practice.pendingMoveAnchor=null;practice.notice='';renderPractice();}
  let practiceAnimation=null;
  function stopPracticePlayback(){
    if(practiceAnimation){cancelAnimationFrame(practiceAnimation);practiceAnimation=null;}
    if(practice)practice.playing=false;
    $('practicePlay').textContent='Play';
  }
  function togglePracticePlayback(){
    if(!practice?.run)return;
    if(practice.playing){stopPracticePlayback();renderPractice();return;}
    let frame=Number($('practiceFrame').value)||0,max=practice.run.trace.length,last=performance.now(),carry=0;
    if(frame>=max){frame=0;$('practiceFrame').value='0';}
    practice.playing=true;
    const tick=now=>{
      if(!practice?.playing)return;
      carry+=(now-last)/1000*6;last=now;
      const steps=Math.floor(carry);
      if(steps){carry-=steps;frame=Math.min(max,frame+steps);$('practiceFrame').value=String(frame);renderPractice();}
      if(frame>=max){stopPracticePlayback();renderPractice();return;}
      practiceAnimation=requestAnimationFrame(tick);
    };
    practiceAnimation=requestAnimationFrame(tick);renderPractice();
  }
  function applyPracticeArrangement(next,notice){
    if(!E.isLegalLayout(state,next)){practice.notice='That placement is not legal on this unlocked board.';renderPractice();return false;}
    practice.arrangement=next.map(p=>({type:p.type,anchor:p.anchor,cells:p.cells.slice()}));practice.notice=notice;$('practiceLayout').value='custom';runPractice(true);return true;
  }
  function practiceAddAt(type,square){
    if(!practice||type<0||type>=E.unitsOwned(state))return;
    const cells=E.footprint(type,square);
    practice.selected=square;practice.notice='';
    if(!cells){practice.notice='That anchor would make this cell shape illegal.';renderPractice();return;}
    applyPracticeArrangement([...practice.arrangement,{type,anchor:square,cells}],'Added '+E.UNIT_NAMES[type]+'.');
  }
  function practiceBoardClick(square){
    if(!practice)return;
    const grid=E.arrangementGrid(practice.arrangement),hit=grid[square],mode=practice.editMode;
    practice.selected=square;practice.notice='';
    if(!mode){renderPractice();return;}
    if(mode==='add'){
      practiceAddAt(Number($('practiceCellType').value),square);return;
    }
    if(mode==='remove'){
      if(!hit){practice.notice='Choose a square occupied by a placed cell.';renderPractice();return;}
      applyPracticeArrangement(practice.arrangement.filter(p=>p.anchor!==hit.anchor),'Removed '+E.UNIT_NAMES[hit.type]+'.');return;
    }
    if(practice.pendingMoveAnchor==null){
      if(!hit){practice.notice='Choose a placed cell to move.';renderPractice();return;}
      practice.pendingMoveAnchor=hit.anchor;practice.selected=hit.anchor;renderPractice();return;
    }
    const moving=practice.arrangement.find(p=>p.anchor===practice.pendingMoveAnchor),cells=moving&&E.footprint(moving.type,square);
    if(!moving||!cells){practice.notice='That destination is illegal for this shape.';practice.pendingMoveAnchor=null;renderPractice();return;}
    practice.pendingMoveAnchor=null;
    applyPracticeArrangement([...practice.arrangement.filter(p=>p.anchor!==moving.anchor),{type:moving.type,anchor:square,cells}],'Moved '+E.UNIT_NAMES[moving.type]+'.');
  }
  $('practiceStart').addEventListener('click',()=>runPractice(true,false));
  $('practicePlay').addEventListener('click',togglePracticePlayback);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&practice?.playing)stopPracticePlayback();});
  $('practiceFrame').addEventListener('input',()=>{stopPracticePlayback();renderPractice();});
  $('practiceLayout').addEventListener('change',()=>runPractice(true,true));
  $('practiceFever').addEventListener('change',()=>runPractice(true,false));
  $('practiceAdd').addEventListener('click',()=>setPracticeEdit('add'));
  $('practiceMove').addEventListener('click',()=>setPracticeEdit('move'));
  $('practiceRemove').addEventListener('click',()=>setPracticeEdit('remove'));
  $('practiceCellType').addEventListener('change',refreshPracticeCells);
  $('practiceSteroid').addEventListener('click',()=>{if(!practice||practice.steroidStart!=null||!E.steroidUnlocked(practice.state))return;practice.steroidStart=currentPracticeSample()?.time??0;runPractice(false);});
  $('practiceRevive').addEventListener('click',()=>{
    const sample=currentPracticeSample(),dead=sample?.dead||[];
    if(!practice||!dead.length)return;
    const square=dead.includes(practice.selected)?practice.selected:dead[0];
    practice.revives.push({time:sample.time,square});practice.selected=square;runPractice(false);
  });
  let activeWorker=null,cancelActive=null;
  function stopSearch(){if(cancelActive)cancelActive();}
  function workerJob(job,options,result){
    stopSearch();
    return new Promise((resolve,reject)=>{
      const worker=new Worker('solver-worker.js');activeWorker=worker;
      const finish=()=>{worker.terminate();if(activeWorker===worker){activeWorker=null;cancelActive=null;}$('cancelBtn').disabled=true;};
      cancelActive=()=>{finish();reject(new Error('Search cancelled.'));};
      $('cancelBtn').disabled=false;
      worker.onmessage=({data})=>{
        if(data.type==='progress'){
          const p=data.progress,detail=p.stage==='validating'?` ${p.index}/${p.total} · ${p.runs} runs each`:p.tested?` · ${p.tested} layouts tested`:'';
          $('solverStatus').textContent=`${p.fever?p.fever+' · ':''}${p.stage}${detail}${p.candidates?' · '+p.candidates+' unique layouts generated':''}…`;
          if(job==='train')$('trainerStatus').textContent=`${p.fever?p.fever+' · ':''}${p.stage}${detail}…`;
          if(job==='optimize'&&p.arrangement){
            renderBoard($('bestBoard'),p.arrangement);renderCellMix(p.arrangement);
            renderSummary($('bestSummary'),p.stats);$('bestVerdict').textContent=p.stage==='validated layout'?'Finalist test':'Testing candidate · preliminary';
            $('layoutChanges').textContent=`Live preview: ${p.arrangement.length} cells. Exploring cell types, placements and empty squares.`;
          }
        }else if(data.type==='result'){finish();resolve(data.value);}
        else if(data.type==='error'){finish();reject(new Error(data.message));}
      };
      worker.onerror=e=>{finish();reject(new Error(e.message||'Worker failed.'));};
      worker.postMessage({job,state,options,result});
    });
  }
  $('cancelBtn').addEventListener('click',stopSearch);
  $('optimizeBtn').addEventListener('click',async()=>{
    if(!state||activeWorker)return;
    const btn=$('optimizeBtn'),q=quality();q.searchSeed=crypto.getRandomValues(new Uint32Array(1))[0];q.incumbentArr=lastResult?.arrangement||memoryForBoard()[0]?.arrangement;btn.disabled=true;$('replayPanel').classList.add('hidden');$('planBtn').disabled=true;
    $('parseBtn').disabled=true;$('fileInput').disabled=true;$('clearBtn').disabled=true;
    try{
      calibration=chooseCalibration();$('calibrationNote').textContent=calibrationText(calibration);
      const res=await workerJob('optimize',{...q,damageScale:calibration.scale,useSteroid:true,reviveDelaySeconds:currentReviveDelay(),searchFever:$('searchFever').checked});
      lastResult=res;
      const currentMap=new Map(res.current.map(p=>[p.anchor,p.type]));
      const removed=res.current.filter(p=>!res.arrangement.some(x=>x.anchor===p.anchor&&x.type===p.type)).length;
      const added=res.arrangement.filter(p=>currentMap.get(p.anchor)!==p.type).length;
      $('layoutChanges').textContent=`${res.candidates} candidate layouts generated · ${res.simulated} layouts evaluated in the winning Fever search. ${removed} old placements removed; ${added} new placements. Empty unlocked squares: ${res.slots-res.score.filledSlots}.`;
      const alternatives=$('alternatives');alternatives.innerHTML='';
      for(const [i,alt] of res.alternatives.entries()){
        const card=document.createElement('article');card.className='panel';
        const heading=document.createElement('h3');heading.textContent=`Alternative ${i+1} · ${pct(alt.stats.clearRate)} clear · ${pct(alt.stats.medianHpRemaining,1)} HP left`;card.appendChild(heading);
        const board=document.createElement('div');board.className='jelly-board';renderBoard(board,alt.arrangement);card.appendChild(board);alternatives.appendChild(card);
      }
      $('alternativesPanel').classList.remove('hidden');
      const projected=E.cloneState(state);projected.fever=res.fever;
      renderSummary($('currentSummary'),res.currentStats);renderTimeline($('currentTimeline'),res.currentStats);$('currentVerdict').innerHTML=verdict(res.currentStats);
      renderBoard($('bestBoard'),res.arrangement,projected);renderSummary($('bestSummary'),res.stats);renderTimeline($('bestTimeline'),res.stats);$('bestVerdict').innerHTML=verdict(res.stats);
      renderCellMix(res.arrangement,projected);
      $('replayPanel').classList.remove('hidden');$('replayFrame').max=String(res.replay.trace.length);$('replayFrame').value='0';renderReplay();
      const same=E.arrangementKey(res.arrangement)===E.arrangementKey(res.current)&&res.fever===state.fever;
      const confidence=E.clearConfidence(res.stats);
      const outcome=res.stats.clearRate>0?`${pct(res.stats.clearRate)} clear; median ${E.formatTime(res.stats.medianClearTime)}.`:`No clear found; median ${pct(res.stats.medianHpRemaining,1)} boss HP remains at the end.`;
      const steroid=res.steroidStart==null?'':` Press Stronkroid at ${res.steroidStart.toFixed(1)}s.`;
      $('solverStatus').textContent=`Best found: ${outcome} Fever: ${E.FEVER_NAMES[res.fever]||'none'}.${steroid} ${same?'Your current layout won for this objective. ':''}${res.stats.runs} runs; approximate 95% clear-rate interval ${pct(confidence[0],1)}–${pct(confidence[1],1)}. Search ${(res.timeMs/1000).toFixed(1)}s. ${state.attemptsRemaining===0?'Your save has no operation attempts remaining. ':''}Heuristic search cannot prove a global optimum.`;
      $('nextMove').textContent='Use Plan next purchase to compare progression options.';
      $('planBtn').disabled=false;
    }catch(e){
      if(e.message!=='Search cancelled.')fail(e.message);
      const arr=lastResult?.arrangement||currentArrangement,stats=lastResult?.stats||currentStats;
      renderBoard($('bestBoard'),arr);renderSummary($('bestSummary'),stats);renderCellMix(arr);$('bestVerdict').innerHTML=verdict(stats);
      $('layoutChanges').textContent='Showing the last completed result; preliminary candidates were not promoted.';
      $('solverStatus').textContent=e.message;$('planBtn').disabled=!lastResult;
    }
    finally{btn.disabled=false;$('parseBtn').disabled=false;$('fileInput').disabled=false;$('clearBtn').disabled=false;}
  });
  $('planBtn').addEventListener('click',async()=>{
    if(!state||!lastResult||activeWorker)return;
    $('planBtn').disabled=true;$('optimizeBtn').disabled=true;$('parseBtn').disabled=true;$('fileInput').disabled=true;$('clearBtn').disabled=true;
    try{const move=await workerJob('plan',quality(),lastResult);renderNextMove(move,lastResult.stats);$('solverStatus').textContent=move?'Purchase comparison complete.':`No affordable combat upgrade is available with ${E.formatNumber(state.bloodcells)} Bloodcells. More progression is needed; no clear has been guaranteed.`;}
    catch(e){$('solverStatus').textContent=e.message;}
    finally{$('planBtn').disabled=false;$('optimizeBtn').disabled=false;$('parseBtn').disabled=false;$('fileInput').disabled=false;$('clearBtn').disabled=false;}
  });

  $('trainBtn').addEventListener('click',async()=>{
    if(!state||activeWorker)return;
    const btn=$('trainBtn'),q=quality(),generations=Number($('trainGenerations').value)||3;
    btn.disabled=true;$('optimizeBtn').disabled=true;$('planBtn').disabled=true;$('parseBtn').disabled=true;$('fileInput').disabled=true;$('clearBtn').disabled=true;
    try{
      calibration=chooseCalibration();
      const timeMs=generations>=60?900:q.timeMs<=1800?1200:q.timeMs>=15000?3400:2200;
      const trained=await workerJob('train',{...q,generations,timeMs,searchSeed:crypto.getRandomValues(new Uint32Array(1))[0],memory:memoryForBoard(),damageScale:calibration.scale,useSteroid:true,reviveDelaySeconds:currentReviveDelay(),searchFever:$('searchFever').checked});
      saveTraining(trained);renderTrainer();
      const res=trained.best;lastResult=res;
      const projected=E.cloneState(state);projected.fever=res.fever;
      renderBoard($('bestBoard'),res.arrangement,projected);renderSummary($('bestSummary'),res.stats);renderTimeline($('bestTimeline'),res.stats);$('bestVerdict').innerHTML=verdict(res.stats);renderCellMix(res.arrangement,projected);
      const stopping=trained.cap>=60?(trained.solved?'Reliable clear found; auto-training stopped early.':`No reliable clear after ${trained.generations} attempts; auto-training stopped at its cap.`):`Self-play completed ${trained.generations} generation${trained.generations===1?'':'s'}.`;
      $('layoutChanges').textContent=`${stopping} The validated result is retained in local memory and seeds later optimizer and trainer searches for this board.`;
      $('solverStatus').textContent=`Self-play saved: ${pct(res.stats.clearRate,0)} clear · ${E.formatTime(res.stats.medianClearTime)} median · ${res.stats.runs} final validation runs. ${stopping}`;
      $('nextMove').textContent='Use Plan next purchase to compare progression options.';$('planBtn').disabled=false;
    }catch(e){if(e.message!=='Search cancelled.')fail(e.message);$('trainerStatus').textContent=e.message;}
    finally{btn.disabled=!state;$('optimizeBtn').disabled=false;$('planBtn').disabled=!lastResult;$('parseBtn').disabled=false;$('fileInput').disabled=false;$('clearBtn').disabled=false;renderTrainer();}
  });
  $('clearMemoryBtn').addEventListener('click',()=>{
    if(!state)return;const context=trainingContext();writePlaybook(readPlaybook().filter(entry=>entry.context!==context));renderTrainer();
  });
  $('exportMemoryBtn').addEventListener('click',()=>{
    const entries=memoryForBoard();const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),entries},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='idleon-jelly-playbook.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),0);
  });

  // Background tabs must not occupy the browser's limited localhost connections.
  window.plannerQoL=window.PlannerQoL?.init({pages:SKILL_PAGES,navigate:selectSideNav});
  $('clearBtn').addEventListener('click',()=>window.plannerQoL?.clear());
  window.PlannerLiveReload?.start({badge:$('liveBadge'),beforeReload:persistInput});

  try{
    const observed=sessionStorage.getItem(OBS_KEY);if(observed)$('observedTime').value=observed;
    const revive=sessionStorage.getItem(REVIVE_KEY);if(revive&&$('reviveDelay'))$('reviveDelay').value=revive;
  }catch(_){}
  try{fetch('/__status',{cache:'no-store'}).then(r=>r.json()).then(x=>{if(x.autoPull){$('liveBadge').textContent='GIT LIVE';$('liveBadge').title='This localhost server checks the connected Git repo for updates and hot-reloads changes.';}}).catch(()=>{});}catch(_){}

  try{
    const saved=sessionStorage.getItem(SESSION_KEY);
    if(saved){$('rememberTab').checked=true;$('jsonInput').value=saved;setTimeout(()=>loadText(saved),0);}
  }catch(_){/* no-op */}
})();
