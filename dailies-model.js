(function(root){
  'use strict';
  const catalog=typeof module!=='undefined'&&module.exports?require('./dailies-data'):root.DailiesData;
  const parse=value=>{try{const v=typeof value==='string'?JSON.parse(value):value;return v&&typeof v==='object'&&!Array.isArray(v)&&v.h?v.h:v;}catch{return null;}};
  const number=value=>(typeof value==='number'||typeof value==='string'&&value.trim()!=='')&&Number.isFinite(Number(value))&&Number(value)>=0?Number(value):null;
  const MINI=[['slush',3,'Dilapidated Slush',96,.55,10,'Drop a Bucket of Slush on the snow pile in Refrigeration Station.'],['mush',4,'Mutated Mush',98,.5,8,'Drop Toxic Sludge or Radioactive Waste on the mushroom at Spaceway Raceway.'],['magmus',5,'Domeo Magmus',225,.5,6,'Walk over the rocks in The Killer Roundabout.'],['spiritlord',6,'Demented Spiritlord',226,.5,6,'Clear Troll Broodnest, then walk over the glowing grave.']];
  const countBoss=(days,power,cap)=>number(days)===null?null:Math.min(cap,Math.floor(Math.pow(Math.max(0,Number(days)-3),power)));
  function minibosses(options){return MINI.map(([id,world,name,slot,power,cap,hint])=>{
    const days=number(options?.[slot]),count=countBoss(days,power,cap);
    return {id,world,name,repeat:'timers',miniboss:true,hint,count,cap,ready:count===null?null:count>=2,cycle:days,
      status:count===null?null:`${count} / ${cap} available`,detail:count===null?'Import a save to read this spawn counter.':count>=2?'Two-spawn target reached.':`${Math.max(0,7-days)} logged-in daily reset${7-days===1?'':'s'} until two.`,url:`https://idleon.wiki/wiki/${name.replaceAll(' ','_')}`};
  });}
  // Counter mappings audited against the local game client and Toolbox parsers; see DAILIES-AUDIT.md.
  function model(raw){
    const data=parse(raw?.data)||raw||{},field=name=>parse(data[name]),options=field('OptionsListAccount')||field('OptLacc')||[],alchemy=field('CauldronP2W'),research=field('Research');
    const rows=[],add=(id,world,name,page,hint,repeat='daily')=>{const row={id,world,name,page,hint,repeat};rows.push(row);return row;};
    const counter=(row,value,noun)=>{const n=number(value);row.count=n;row.ready=n===null?null:n>0;row.status=n===null?null:`${n} ${noun} left`;return row;};
    const used=(row,value,noun)=>{const n=number(value);row.status=n===null?null:`${n} ${noun} used`;return row;};
    const flag=(row,value)=>{const n=number(value);row.ready=n===null?null:n===0;row.status=n===null?null:n===0?'Available in save':'Done in save';return row;};
    const vial=counter(add('vials',2,'Vial attempts','vials','Roll for undiscovered vials. This hides itself when every live vial is unlocked.'),parse(alchemy?.[5])?.[0],'attempts');
    const levels=parse(field('CauldronInfo')?.[4]),ids=catalog?.vialIds||[];
    const allKnown=ids.length>0&&ids.every(id=>number(levels?.[id])!==null);
    if(allKnown){const owned=ids.filter(id=>number(levels[id])>0).length;vial.detail=`${owned} / ${ids.length} vials unlocked`;if(owned===ids.length)vial.autoHidden='All vials unlocked';}
    add('shops',1,'Daily shop purchases',null,'Restock the materials, food, and summon ingredients you still need.');
    add('keys',1,'Boss keys & colosseum tickets',null,'Collect unlocked NPC rewards or use EZ-Access.');
    add('guilds',1,'Guild daily tasks','guilds','Complete the daily guild tasks worth doing for your account.');
    add('merits',1,'Daily world tasks','tasks','Check daily task-board objectives across your worlds.');
    add('picnic',1,'Picnic Stowaway','quests','Optional repeatable quest chain for gems and food.');
    add('defecaus',1,'Dr Defecaus & Boops',null,'Visit the sewers for your daily kills.');
    add('spikes',1,'Spikes minigame',null,'Optional daily gem reward from the secret minigame.');
    add('freeCompanion',1,'Free companion', 'pets','Check Pet Mart for the free claim; this is now a daily cooldown, not weekly.');
    const tournament=add('tournament',1,'Tournament registration',null,'Register for the next Pet Tournament.');
    if(number(options[496])>0&&number(options[511])!==null){tournament.ready=Number(options[511])<=Number(options[496]);tournament.status=tournament.ready?'Registration available':'Registered in save';}
    add('petGems',1,'Pet Mart gems',null,'Claim the free gems when offered in Pet Mart.');
    add('postOffice',2,'Post Office orders','postOffice','Review today’s shipments and any orders you want to turn in.');
    add('alchemyShop',2,'Alchemy liquids & shop','alchemy','Spend liquids and check the daily shop items you need.');
    flag(add('weeklyBattleDaily',2,'Weekly Battle daily attempt',null,'Use the daily attempt to improve this week’s best score.'),options[190]);
    const gemBudget=number(options[195]);counter(add('bossGems',2,'Boss gem farming',null,'Optional boss runs while your daily gem allowance remains.'),gemBudget===null?null:Math.max(0,Math.ceil((600-gemBudget)/4)),'gem-paying kills');
    add('islandsDaily',2,'Island collections','islandExpeditions','Check island bottles, trash, and Crystal Island spawns.');
    flag(add('randomEvent',1,'Random event', 'events','Check whether your daily random event is still available.'),options[137]);
    add('crystals',1,'Guaranteed crystal spawns',null,'Use guaranteed daily crystals if your account has unlocked them.');
    add('holeGames',5,'Hole minigames','hole','Check daily monument and cavern activities you have unlocked.');
    add('sneakingRolls',6,'Pristine charm & symbol drops','sneaking','These chances are rolled automatically when qualifying Sneaking loot is generated.');
    add('summoningBattles',6,'Summoning battles','summoning','Review your available battles and attempts.');
    counter(add('mornin',6,'Top of the Mornin’','compass','Use the Wind Walker allowance if this Compass upgrade is unlocked.'),options[365],'kills');
    used(add('lore',7,'Daily Lore','spelunking','Choose page stacks before reading. The daily cap depends on mastery.'),options[410],'reads');
    counter(add('research',7,'Research observations','research','Roll for missing observations.'),parse(research?.[7])?.[2],'rolls');
    counter(add('minehead',7,'Minehead attempts','minehead','Use the day’s available minigame attempts.'),parse(research?.[7])?.[8],'attempts');
    used(add('jewelCogs',7,'Jewel Cogs','construction','Claim unlocked daily cog pulls; the cap depends on your bonuses.'),options[414],'pulls');
    add('tinyCog',7,'Tiny Cog','construction','Claim the daily Tiny Cog if its Research unlock is active.');
    add('raid',7,'Raid registration',null,'Check the next raid in the tournament interface; an old export cannot confirm the current server raid day.');
    const killroy=add('killroyWeekly',2,'Killroy’s Slaughterhouse','killroy','Run remaining rooms, then spend your skulls.','weekly');
    if(number(options[113])!==null){const completed=[1,2,3].filter(i=>String(options[113]).includes(String(i))).length;if(Number(options[227])===1)counter(killroy,3-completed,'rooms');else{killroy.status=`${completed} rooms used`;killroy.detail='Check remaining rooms in game; your room unlocks are not inferred from the completion counter.';}}
    const battle=add('weeklyBattle',2,'Weekly Battle trophies',null,'Improve your best skull tier for this week.','weekly');
    if(number(options[189])!==null){battle.ready=Number(options[189])<5;battle.status=`${options[189]} / 5 best skulls`;}
    add('guildWeekly',1,'Guild weekly tasks','guilds','Complete weekly guild objectives.','weekly');
    add('dungeonWeekly',1,'Dungeon Happy Hour','dungeons','Use the weekly boosted run when Happy Hour is active.','weekly');
    add('rando',2,'Rando Island','islandExpeditions','Check this week’s random island reward.','weekly');
    add('shimmer',2,'Shimmer Island','islandExpeditions','Complete the weekly island challenge.','weekly');
    add('labWeekly',4,'Lab chip & jewel rotation','lab','Check the rotating stock for useful or missing purchases.','weekly');
    add('giants',3,'Giant monster farming','prayers','Review giant spawns after the weekly chance reset.','weekly');
    add('divinityWeekly',5,'Divinity unlinks','divinity','Use free unlinks only if you need to change god links.','weekly');
    add('exoticMarket',6,'Exotic Market','farming','Spend weekly purchases on relevant upgrades.','weekly');
    add('ballot',2,'Bonus Ballot','votes','Check the weekly bonus and voting options.','weekly');
    rows.push(...minibosses(options));
    for(const args of [
      ['forge',1,'Forge & anvil','smithing','Collect production and refill materials.'],
      ['arcade',2,'Arcade balls','arcade','Claim accumulated balls before the storage limit.'],
      ['trapping',3,'Collect traps','trapping','Collect when your chosen trap duration is complete.'],
      ['worship',3,'Worship charge','worship','Spend charge before reaching capacity.'],
      ['library',3,'Talent library','construction','Collect books when your checkout target is reached.'],
      ['construction',3,'Construction & refinery','construction','Check finished buildings, cogs, and salt cycles.'],
      ['breeding',4,'Eggs & spices','breeding','Check egg storage and collect spices.'],
      ['cooking',4,'Cooking','cooking','Review kitchens, recipes, and ladles.'],
      ['sailing',5,'Sailing','sailing','Open chests and check returning boats and captains.'],
      ['gaming',5,'Gaming','gaming','Harvest plants and check gaming tool cooldowns.'],
      ['farming',6,'Farming','farming','Harvest crops and check transfer tickets.'],
      ['sneaking',6,'Sneaking loot','sneaking','Check ninja loot, floors, and upgrades.'],
      ['familiars',6,'Summoning familiars','summoning','Review essence costs; their reset is a four-day cycle.'],
      ['talentCooldowns',1,'Class talent cooldowns','characters','Check Printer Go Brrr, Cranium Cooking, Refinery Throttle, Birthday, and Void Trial Rerun when relevant.'],
      ['tomeTag',4,'Tome nametag','tome','Check the monthly free nametag reward.']
    ])add(...args,'timers');
    applySaveRules(rows,raw);
    return rows;
  }
  function applySaveRules(rows,raw){
    const data=parse(raw?.data)||raw||{},field=key=>parse(data[key]),opt=field('OptionsListAccount')||field('OptLacc')||[],research=field('Research'),spelunk=field('Spelunk');
    const byId=Object.fromEntries(rows.map(row=>[row.id,row])),num=number;
    const hide=(id,reason)=>{byId[id].autoHidden=reason;byId[id].ready=false;};
    const remaining=(id,value,noun)=>{if(num(value)===null)return;const row=byId[id];row.count=value;row.ready=value>0;row.status=`${value} ${noun} left`;};
    const names=parse(raw?.charNames)||parse(data.charNames),levelKeys=Object.keys(data).filter(key=>/^Lv0_\d+$/.test(key));
    const levels=levelKeys.map(key=>parse(data[key]));
    const completeRoster=Array.isArray(names)&&names.length>0&&names.every((_,i)=>parse(data['Lv0_'+i])!=null);
    // Do not infer an account-wide skill maximum from a partial character export.
    const skill=index=>completeRoster&&levels.every(row=>num(row?.[index])!==null)?{max:Math.max(...levels.map(row=>Number(row[index]))),total:levels.reduce((sum,row)=>sum+Number(row[index]),0)}:null;
    const researchSkill=skill(20),found=parse(research?.[2]);
    if(researchSkill){
      const level=researchSkill.max,limit=level<1?0:num(found?.[0])===0?1:Math.min(43,5*Math.floor((level+10)/10)-Math.floor(level/20)-Math.floor(level/30)-Math.floor(level/50));
      if(!limit)hide('research','Research not unlocked');
      else if(Array.from({length:limit},(_,i)=>num(found?.[i])).every(value=>value!==null&&value>=1)){
        hide('research',`All ${limit} observations available at Research Lv ${level} found`);
        byId.research.detail='Returns automatically when a higher Research level opens a missing observation.';
      }
    }
    const spelunkSkill=skill(19),rift=num(field('Rift')?.[0]),reads=num(opt[410]);
    if(spelunkSkill?.max===0)hide('lore','Spelunking not unlocked');
    else if(reads!==null){
      const cap=rift!==null&&spelunkSkill?(rift>=15&&spelunkSkill.total>=500?8:5):null;
      if(cap!==null)remaining('lore',Math.max(0,cap-reads),'reads');
      else if(reads>=8)hide('lore','All daily reads used');
    }
    const talent=num(parse(spelunk?.[18])?.[18]),pulls=num(opt[414]);
    if(talent!==null&&pulls!==null)remaining('jewelCogs',Math.max(0,Math.round(1+2*talent)-pulls),'pulls');
    const world=num(parse(raw?.extraData)?.currentWorld);
    if(world!==null&&world>=1&&world<=7)for(const row of rows)if(row.world>world)hide(row.id,`World ${row.world} not unlocked`);
    // These raw flags are evaluated only when actually present.
    if(num(opt[189])>=5)hide('weeklyBattleDaily','Weekly Battle already at five skulls');
    const global=parse(parse(raw?.tournament)?.global),shopDay=num(global?.S),gemsDay=num(opt[516]);
    if(shopDay!==null&&shopDay>=1&&gemsDay!==null){byId.petGems.ready=gemsDay<shopDay;byId.petGems.status=gemsDay<shopDay?'Gems available':'Gems claimed in save';}
    const raidDay=num(global?.RD),registered=num(opt[611]);
    if(raidDay!==null&&raidDay>=1&&registered!==null){byId.raid.ready=registered<=raidDay;byId.raid.status=registered<=raidDay?'Registration available':'Registered in save';}
    const companion=parse(raw?.companion??data.companion??data.Companion),anchor=num(companion?.t),savedAt=num(field('TimeAway')?.GlobalTime);
    if(anchor!==null&&anchor>0&&savedAt!==null){const seconds=Math.max(0,(anchor+594000000)/1000-savedAt);byId.freeCompanion.ready=seconds===0;byId.freeCompanion.status=seconds===0?'Claim available in save':`${Math.ceil(seconds/3600)}h remaining at save time`;}
    const summonAttempts=num(parse(field('Summon')?.[3])?.[0]);
    if(summonAttempts!==null)remaining('summoningBattles',summonAttempts,'attempts');
    if(typeof opt[169]==='string'&&opt[169].includes('e')&&num(opt[182])!==null){byId.shimmer.ready=Number(opt[182])===0;byId.shimmer.status=byId.shimmer.ready?'Challenge available':'Challenge completed in save';}
    const orders=field('PostOfficeInfo0');
    if(Array.isArray(orders)&&orders.length>=6&&orders.slice(0,6).every(order=>num(parse(order)?.[2])!==null))remaining('postOffice',orders.slice(0,6).filter(order=>num(parse(order)[2])===0).length,'orders');
    if(num(opt[402])!==null&&num(opt[402])>=120)hide('sneakingRolls','Daily charm and symbol rolls exhausted');
    const islands=opt[169];
    if(typeof islands==='string'){
      if(!islands.includes('b'))hide('rando','Rando Island not unlocked');
      if(!islands.includes('e'))hide('shimmer','Shimmer Island not unlocked');
      if(!/[a-f]/.test(islands))hide('islandsDaily','No expedition islands unlocked');
    }
    // Evaluate character tasks only with the complete exported roster. Missing values
    // remain unknown; zero is a real completion/cooldown value, not a missing value.
    const characters=Array.isArray(names)&&names.length?names.map((_,i)=>({npc:field('NPCdialogue_'+i),quests:field('QuestComplete_'+i),traps:field('PldTraps_'+i)})):null;
    const set=(id,ready,status,detail)=>Object.assign(byId[id],{ready,status,...(detail?{detail}:{})});
    const guild=field('Guild');
    for(const [id,start,end] of [['guilds',1,6],['guildWeekly',6,10]]){
      if(opt[37]===0||opt[37]==='')hide(id,'No guild joined in save');
      else if(Array.isArray(guild)&&guild.length>=end){
        const tasks=guild.slice(start,end).map(parse);
        if(tasks.every(t=>catalog?.guildTasks?.[t?.[0]]&&num(t?.[2])!==null)){
          const pending=tasks.filter(t=>Number(t[2])<catalog.guildTasks[t[0]].requirement);
          set(id,pending.length>0,`${pending.length} unfinished tasks`,pending.length?pending.map(t=>`${catalog.guildTasks[t[0]].task.replaceAll('_',' ')}: ${t[2]} / ${catalog.guildTasks[t[0]].requirement}`).join(' · '):'All objectives reached in the exported guild task list.');
        }
      }
    }
    const tasks=field('TaskZZ1')||parse(field('Tasks')?.[1]);
    // W1–W6 have the rotating ninth daily task. Do not treat W7 placeholder rows as dailies.
    const taskWorlds=world===null?null:Math.min(6,world);
    if(taskWorlds&&Array.isArray(tasks)&&Array.from({length:taskWorlds},(_,i)=>num(parse(tasks[i])?.[8])).every(n=>n!==null)){
      const worlds=Array.from({length:taskWorlds},(_,i)=>i).filter(i=>Number(parse(tasks[i])[8])===0);
      set('merits',worlds.length>0,`${worlds.length} unfinished daily boards`,worlds.length?`Available boards: ${worlds.map(i=>'W'+(i+1)).join(', ')}.`:'Daily board tasks completed in every unlocked world.');
    }
    if(characters?.every(c=>c.npc&&c.quests&&num(c.npc.Picnic_Stowaway)!==null)){
      const eligible=characters.filter(c=>num(c.npc.Picnic_Stowaway)!==null&&Number(c.npc.Picnic_Stowaway)>=20);
      const quests=Array.from({length:9},(_,i)=>'Picnic_Stowaway'+(i+4));
      // Negative quest states are valid. Require actual fields before treating a chain as untouched.
      if(eligible.every(c=>quests.every(k=>Object.hasOwn(c.quests,k)&&[-1,0,1].includes(Number(c.quests[k]))))){
        const untouched=eligible.filter(c=>!quests.some(k=>Number(c.quests[k])===1));
        set('picnic',untouched.length>0,`${untouched.length} characters can start`,eligible.length?'Tracks starting the daily feeding chain, not finishing every follow-up quest.':'Daily quest chain not unlocked on any exported character.');
      }
    }
    if(characters?.every(c=>c.npc)&&world!==null){
      const sources=[['Dog_Bone',5,16,1],['Djonnut',6,31,2],['Bellows',8.5,80,3],['Typhoon',3,15,1],['Centurion',4,35,2],['Lonely_Hunter',6,56,3]].filter(s=>s[3]<=world);
      if(sources.every(s=>num(opt[s[2]])!==null)){
        const pending=sources.filter(([npc,threshold,slot])=>Number(opt[slot])>=1&&characters.some(c=>num(c.npc[npc])!==null&&Number(c.npc[npc])>threshold));
        // Zero pickup counters establish completion without needing quest unlock inference.
        if(pending.length||sources.every(s=>Number(opt[s[2]])===0))set('keys',pending.length>0,`${pending.length} NPC rewards waiting`,'Uses days since collection and NPC dialogue unlocks, not keys already in inventory.');
      }
    }
    if(characters?.every(c=>Array.isArray(c.traps))){
      const traps=characters.flatMap(c=>c.traps.map(parse)).filter(t=>t&&Number(t[0])===-1?false:true);
      if(traps.every(t=>t&&num(t[0])!==null&&num(t[2])!==null&&num(t[6])!==null)){
        const ready=traps.filter(t=>Number(t[2])>=Number(t[6]));
        const next=traps.length?Math.max(0,Math.min(...traps.map(t=>Number(t[6])-Number(t[2])))):null;
        set('trapping',ready.length>0,`${ready.length} / ${traps.length} traps ready`,next>0?`Next trap: ${Math.ceil(next/3600)}h remaining at save time.`:traps.length?'Elapsed trap time meets its placed duration.':'No traps placed in the exported roster.');
      }
    }
    const chests=field('SailChests');
    byId.sailing.name='Sailing chests';byId.sailing.hint='Open stored sailing chests. Returning boats and captain purchases are reviewed on the Sailing page.';
    if(Array.isArray(chests)&&chests.every(c=>Array.isArray(parse(c))&&num(parse(c)[3])!==null))set('sailing',chests.length>0,`${chests.length} stored chests`);
    const books=num(opt[55]);
    if(books!==null){byId.library.name='Stored library books';set('library',books>0,`${books} books stored`,'Counts books already credited in the save. Does not simulate extra offline books or assume a checkout target.');}
    const familiarLevel=num(parse(field('Summon')?.[0])?.[2]);
    if(familiarLevel!==null&&familiarLevel>=catalog.familiarMax)hide('familiars',`Familiar upgrade maxed (${catalog.familiarMax} / ${catalog.familiarMax})`);
    const unlinks=num(field('Divinity')?.[38]);
    if(unlinks!==null)set('divinityWeekly',unlinks>0,`${unlinks} free unlinks left`,'Optional: use only when you want to change god links.');
    // The game deposits these directly into empty cog inventory slots during reset.
    // There is no daily claim button, so never present it as an unclaimed action.
    if(research){hide('tinyCog','Automatically deposited at reset; no manual claim');byId.tinyCog.detail='Requires the Tiny Cog research unlock and an empty cog inventory slot. Manage inventory on Construction.';}
    if(typeof islands==='string'){
      const collections=[];
      if(islands.includes('a'))collections.push(['Trash',160]);
      // Bottles accrue on the dock independently of which island is selected.
      if(/[a-f]/.test(islands))collections.push(['Bottles',170]);
      if(islands.includes('c'))collections.push(['Crystal Island',171]);
      if(collections.length&&collections.every(([,slot])=>num(opt[slot])!==null)){
        const waiting=collections.filter(([,slot])=>Number(opt[slot])>0);
        set('islandsDaily',waiting.length>0,`${waiting.length} island collections waiting`,collections.map(([name,slot])=>`${name}: ${opt[slot]} saved days`).join(' · '));
      }
    }
    const boosted=num(opt[76]);
    if(num(opt[402])!==null){
      hide('sneakingRolls','Automatic loot rolls; no manual daily claim');
      byId.sneakingRolls.detail=`${Math.max(0,120-Number(opt[402]))} charm chances and ${Math.max(0,75-Number(opt[402]))} symbol chances remain in the daily counter. Symbols also require their Ninja legend upgrade. These are automatic drop chances, not attempts you click to spend.`;
    }
    if(boosted===0)hide('dungeonWeekly','No boosted dungeon runs remaining');
    else if(boosted!==null)byId.dungeonWeekly.detail=`${boosted} boosted runs stored. The save does not confirm that Happy Hour is active now.`;
    const tomeClaimed=num(opt[447]),month=num(opt[448]),server=parse(raw?.serverVars);
    if(num(server?.TomeOn)===0)hide('tomeTag','Tome reward period inactive');
    else if(tomeClaimed!==null&&tomeClaimed>=7&&month!==null&&savedAt!==null&&month===Math.floor(savedAt/2628000))hide('tomeTag','All seven tier rewards claimed this period');
    else if(tomeClaimed!==null)byId.tomeTag.detail=`${tomeClaimed} tier rewards recorded. Remaining eligibility needs the calculated Tome rank and the matching server reward period.`;
    const explanations={shops:'Purchases depend on which materials you want to restock; remaining shop stock alone does not establish a needed purchase.',defecaus:'A verified per-character sewer spawn/completion rule is not available yet.',spikes:'The daily secret-minigame reward flag has not been verified yet.',alchemyShop:'Liquid spending depends on your selected purchase and its current cost; stored liquid is not an unclaimed daily reward.',crystals:'The used-spawn counter is present, but the full account bonus calculation is needed to establish today’s guaranteed allowance.',holeGames:'Each unlocked cavern has its own attempt and reward rules; a single account-wide completion flag would be misleading.',sneakingRolls:'Charm ownership, roll unlocks and symbol eligibility need separate checks. A remaining roll counter alone does not mean you can use it.',rando:'Island access is known; the weekly event claim flag has not been verified yet.',labWeekly:'Needs the exact saved shop rotation, purchase flags, jewel ownership and material costs; owned chips can still be useful duplicates.',giants:'Giant spawns do not have a fixed weekly completion cap. The stopping point depends on your preferred spawn chance.',exoticMarket:'Needs the Lore unlock, bonus-dependent weekly purchase cap, rotation and affordable upgrade costs.',ballot:'The current bonus and available voting window need matching server data.',forge:'Production collection and material refills have separate conditions; inventory stock alone cannot establish both.',arcade:'Needs ball generation speed and storage capacity bonuses to calculate unclaimed balls from the saved timer.',worship:'Needs each character’s charge capacity and equipped skull before determining who is at capacity.',construction:'Buildings, refinery cycles and cog inventory have separate readiness rules; there is no single completed flag.',breeding:'Egg storage and spice claims require separate capacity and collection calculations.',cooking:'Meal upgrades, recipe progress and kitchen production have different costs and completion conditions.',gaming:'Plant capacity and individual tool cooldowns must be calculated before marking this routine ready.',farming:'Harvest choice depends on plot locks and your overgrowth target; a growing crop is not automatically due for harvest.',sneaking:'Stored loot does not establish whether you want to replace equipment or wait for better drops.',familiars:'The upgrade is not maxed, but essence affordability and the current cost-reset cycle still need calculation.',talentCooldowns:'Requires each character’s equipped talent preset and the matching cooldown; knowing the class alone is insufficient.'};
    for(const row of rows){
      if(row.ready==null&&!row.autoHidden){row.status=row.status||'Not yet verified';row.detail=row.detail||explanations[row.id]||'Required save fields are missing or incomplete. Import a complete account export to verify this activity.';}
      // An earlier world lock always wins over a later counter or character check.
      if(row.autoHidden)row.ready=false;
      if(row.autoHidden)continue;
      if(row.ready===false)row.autoHidden=row.miniboss?'Below two-spawn target':row.count===0?'No attempts or claims remaining':row.status||'Already done in this save';
    }
  }
  function period(now,hour,repeat='daily',weekday=4,weeklyHour=0){
    const date=new Date(now);
    if(repeat==='weekly'){date.setUTCHours(weeklyHour,0,0,0);date.setUTCDate(date.getUTCDate()-(date.getUTCDay()-weekday+7)%7);if(date.getTime()>now)date.setUTCDate(date.getUTCDate()-7);}
    else{date.setHours(hour,0,0,0);if(date.getTime()>now)date.setDate(date.getDate()-1);}
    return date.getTime();
  }
  function isDone(value,now,hour,repeat='daily',weekday=4,weeklyHour=0){return Number.isFinite(value)&&value>=period(now,hour,repeat,weekday,weeklyHour)&&value<=now;}
  function accountKey(raw){const data=parse(raw?.data)||raw||{},names=parse(raw?.charNames)||parse(data.charNames);return Array.isArray(names)&&names[0]?String(names[0]):'local';}
  function done(row,state,now){return row.miniboss&&row.cycle!==null?Number.isFinite(state.checks[row.id])&&state.cycles?.[row.id]===row.cycle:isDone(state.checks[row.id],now,state.hour,row.repeat,state.weekday,state.weeklyHour);}
  function hiddenReason(row,state){return state.hidden?.[row.id]?'Hidden by you':state.autoHide!==false?row.autoHidden||(state.checks&&done(row,state,Date.now())?'Checked for this period':''):'';}
  const api={model,period,isDone,accountKey,done,hiddenReason,minibosses,countBoss,catalog};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DailiesModel=api;
})(typeof window==='undefined'?globalThis:window);
