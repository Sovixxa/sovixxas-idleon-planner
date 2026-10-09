(function(root){
  'use strict';
  const parse=v=>{if(typeof v==='string'){try{return JSON.parse(v);}catch{return null;}}return v;};
  const value=v=>v!==null&&v!==undefined&&v!==''&&typeof v!=='boolean'&&Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;
  const at=(v,...path)=>{for(const k of path){v=parse(v);v=v?.[k];}return value(v);};
  const clean=v=>String(v??'').replaceAll('_',' ').replaceAll('@',' ');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>{const n=Number(v);if(!Number.isFinite(n))return 'Unavailable';const units=['','K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc'];const tier=Math.max(0,Math.floor(Math.log10(Math.abs(n)||1)/3));if(tier>=units.length)return n.toExponential(2);if(tier===0)return n!==0&&Math.abs(n)<.01?n.toExponential(2):n.toLocaleString('en-US',{maximumFractionDigits:2});let scaled=n/1000**tier;const bumped=Math.abs(Number(scaled.toFixed(2)))>=1000&&tier+1<units.length;return Number((bumped?scaled/1000:scaled).toFixed(2))+units[tier+Number(bumped)];};
  const GOAL_KEY='idleon-account-review-goal-v2';
  const PAGE_FOR={questUnlocks:'quests',sushiReview:'sushi',vialsReview:'vials',constructionReady:'construction',sailingReview:'sailing',cookingReview:'cooking',starsReview:'starSigns',storageReview:'storage',worldGates:'rift'};
  // Acquisition exclusions checked 2026-10-03 against bundled stamps.ts,
  // quest/drop catalogs and https://www.digitaltq.com/wiki/idleon/stamps.
  // Do not copy stamps.ts wholesale: its Stat Wallstreet exclusion is outdated.
  const UNAVAILABLE_STAMPS=new Set(['A43','B28','B29','B33','B35','C13','C17']);
  const RANDOM_STAMPS={C4:'Arcade',C5:'Arcade',C8:'Arcade',C9:'Level-up gifts',A23:'Level-up gifts'};
  function stampAcquisition(stamp,data,raw={},quests=[]){
    const id=String(stamp.id||'').replace(/^Stamp/,''),itemId='Stamp'+id;
    const owned=(items,quantities)=>{items=parse(items);quantities=parse(quantities);return Array.isArray(items)&&items.some((item,index)=>item===itemId&&at(quantities,index)>0);};
    const carriers=Object.keys(data).filter(key=>/^InventoryOrder_\d+$/.test(key)&&owned(data[key],data['ItemQTY_'+key.slice(15)])).map(key=>raw.charNames?.[Number(key.slice(15))]||'Character '+(Number(key.slice(15))+1));
    const stored=owned(data.ChestOrder,data.ChestQuantity);
    // An actual item in this save takes precedence over historical source limits.
    if(stored||carriers.length)return {status:'ready',label:'Ready to hand in',page:'stamps',detail:`Stamp item found ${carriers.length?'on '+carriers.join(', '):'in storage'}. ${stored&&!carriers.length?'Move it to a character, then take':'Take'} it to Mr. Pigibank.`,source:'Saved inventory / storage'};
    if(UNAVAILABLE_STAMPS.has(id))return {status:'unavailable',label:'No obtainable source verified',detail:'No obtainable source is verified in the checked catalogs. Excluded from collection recommendations.',source:'Stamp availability review · 3 Oct 2026'};
    if(RANDOM_STAMPS[id])return {status:'random',label:'Rare random reward',detail:`${RANDOM_STAMPS[id]} reward. Treat this as a passive drop, not a required upgrade or a task with a reliable completion time.`,source:RANDOM_STAMPS[id]};
    const routes=quests.filter(quest=>(quest.rewards||[]).some(reward=>String(reward).split(' × ').pop()===itemId));
    const active=routes.find(quest=>Object.values(quest.states||{}).some(state=>state===0)&&!/giftmas|falloween|loveulyte|egggulyte|coastiolyte|bubbulyte|spring splendor|anniversary|holiday|event|summer|new year/i.test(`${quest.npc} ${quest.name} ${quest.description}`));
    if(active)return {status:'quest',label:'Quest in progress',page:'quests',detail:`${active.npc}: ${active.name} rewards this stamp. The quest is active on a character; check its remaining requirements before pursuing it.`,source:active.name};
    return {status:'unverified',label:'Access not verified',detail:routes.length?'A quest reward is documented, but an active, regular quest route is not verified in this save. Check the quest chain and reward recovery.':'No currently accessible acquisition route is verified from this save. Kept for reference, not recommended as a task.',source:routes.length?'Quest reward catalog':'Source / access needs checking'};
  }
  const GOALS=[
    {id:'balanced',name:'Account growth',description:'A balanced mix of claims, permanent unlocks and production upgrades.'},
    {id:'stats',name:'All Stats',description:'Calculate upgrades for Strength, Wisdom, Agility and Luck.',match:/\bstr\b|\bwis\b|\bagi\b|\bluk\b|strength|wisdom|agility|luck|all.?stat/i},
    {id:'damage',name:'More damage',description:'Prioritize bonuses that explicitly improve character damage.',match:/damage|\bstr\b|\bagi\b|\bwis\b|\bluk\b|strength|agility|wisdom|luck|critical/i,exclude:/pet damage|tower damage|summon.*damage/i},
    {id:'samples',name:'Bigger samples',description:'Find sampling, skill efficiency and gathering bonuses to check before your next print.',match:/sampl|printer|skill efficiency|all skill|mining efficiency|chopping efficiency|fishing efficiency|catching efficiency|skill afk/i},
    {id:'cooking',name:'Faster cooking',description:'Focus on cooking speed, meal speed and ladle bonuses.',match:/cooking speed|cook.*spd|meal.*speed|ladle|kitchen.*speed/i},
    {id:'afk',name:'AFK gains',description:'Focus on explicit AFK gain and multikill bonuses.',match:/afk|multikill|multi.kill|kills per/i},
    {id:'skill',name:'Skilling',description:'Find efficiency, prowess, skill EXP and gathering bonuses.',match:/skill|efficiency|prowess|mining|chopping|fishing|catching|trapping/i},
    {id:'exp',name:'More EXP',description:'Find experience bonuses; check whether each applies to class or skill EXP.',match:/\bexp\b|experience/i},
    {id:'drop',name:'Drop rate',description:'Focus on explicit drop rate and drop rarity bonuses.',match:/drop rate|drop rarity|drop chance|drop.*%/i},
    {id:'unlock',name:'Permanent unlocks',description:'Find verified stamp hand-ins and inspect supported collection routes.'}
  ];
  const goalFor=id=>GOALS.find(goal=>goal.id===id)||GOALS[0];
  function matchesGoal(effect,id){const goal=goalFor(id);return !!goal.match&&goal.match.test(effect||'')&&!(goal.exclude?.test(effect||''));}
  function rankForGoal(report,id='balanced',{readyOnly=false}={}){
    const goal=goalFor(id),claims=report.priorities.filter(item=>(item.ready||item.state==='Do now'));
    let actions=report.priorities.filter(item=>goal.id==='balanced'||(goal.id==='unlock'?item.unlock===true:item.goals?item.goals.includes(goal.id):matchesGoal(item.effect,goal.id)));
    actions=actions.filter(item=>!readyOnly||(item.ready||item.state==='Do now')).map(item=>({...item,goalId:goal.id,goalReason:item.reason})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
    // Keep the goal relevant before diversifying across systems.
    const first=[],seen=new Set();for(const item of actions)if(!seen.has(item.page)&&first.length<3){first.push(item);seen.add(item.page);}
    const ids=new Set(first.map(item=>item.id));
    return {goal,actions:[...first,...actions.filter(item=>!ids.has(item.id))],claims};
  }
  // A compact review rubric distilled from repeated account reviews. These are
  // deliberately actions and system relationships, not universal level caps.
  const PLAYBOOK={
    foundations:[
      {title:'Permanent multipliers first',copy:'Fix neglected prints, stamps, vials, bubbles, cards, statues, constellations, Obols, meals and artifacts before pouring a major pile of resources into the newest world.',pages:['stamps','alchemy','cards','statues','starSigns','obols','cooking','sailing']},
      {title:'Every character should be equipped for a job',copy:'Check current armor and tools, food and gold food, bags, card set, prayers, Obols, talent books, Anvil points and Post Office boxes. A generic loadout is rarely the right one.',pages:['characters','loadouts','cards','obols','prayers','postOffice']},
      {title:'Keep account routines alive',copy:'Daily: shop buys, boss gems, particles, vial attempts, Page Reads, spice clicks, Hole touch, familiars, forging and relevant Emperor attempts. Weekly: minibosses, weekly boss, chips, Killroy and worthwhile Exotic Market buys.',pages:['vials','research','breeding','hole','summoning','killroy','lab','farming']}
    ],
    worlds:[
      {world:'World 1',title:'Foundation',copy:'Push affordable stamps; keep Forge and Anvil useful; pick up missing stamp/Pig-quest unlocks, bribes and easy achievement/trophy paths.',pages:['stamps','bribes','quests']},
      {world:'World 2',title:'Alchemy + Vials',copy:'Unlock bubbles and vials, improve cauldrons and efficiency, keep liquids moving, spend Killroy rewards, and do not park characters on Sigils prematurely.',pages:['alchemy','vials','killroy','islandExpeditions']},
      {world:'World 3',title:'Prints → Refinery → Construction',copy:'Reprint with a real sampling loadout; keep salts balanced, Construction and cogs active, TD/prayers moving, and Death Note/traps supporting multikill and Vman.',pages:['printer','refinery','construction','worship','prayers','deathNote','equinox']},
      {world:'World 4',title:'Cooking + Breeding + Rift',copy:'Spend ladles, progress meals and spices, improve breedability/Arena and targeted shinies, then keep Rift and missing skill mastery moving.',pages:['cooking','breeding','petArena','rift']},
      {world:'World 5',title:'Artifacts + Hole',copy:'Find artifacts and improve ships/captains, build Divinity links and rank, push Gaming growth/value and do not let Hole monuments, studies, wishes, jars or gambits sit untouched.',pages:['sailing','divinity','gaming','hole','slab']},
      {world:'World 6',title:'Farming first',copy:'Unlock plots and prioritize growth, crop evolution/value and useful market buys. Use daily Summoning lives, maintain Sneaking item layouts and grow Gold Food/Beanstalk progress.',pages:['farming','summoning','sneaking','beanstalk','emperorBonuses']},
      {world:'World 7',title:'Daily research, not a foundation substitute',copy:'Keep Page Reads, observations and research moving. Do not let World 7 spending outrank badly neglected older-world multipliers.',pages:['research','sushi','minehead','spelunking','zenithMarket']}
    ],
    specialists:[
      {title:'Masterclasses',copy:'Keep DB Zows/Chows/Wows and Grimoire moving; WW Compass and Medallions active; AC Tesseract toward jewels/Emperor bonuses; RG resource grades active; and Vman at #1 skills where its bonuses need it.',pages:['masterclasses','grimoire','compass','tesseract','royalArmory','characters']},
      {title:'Clickers',copy:'Check Orion, Poppy and Bubba for their next meaningful milestone. Do not force a single target—the best reset or push depends on current rewards.',pages:['orion','poppy','bubba']},
      {title:'Cleanup that compounds',copy:'Fill easy Slab entries, finish straightforward quests/achievements, improve card stars and Onyx statues, and collect missing bags, keychains, upgrade stones and useful gear sets.',pages:['slab','quests','tasks','cards','statues','armorSets']}
    ]
  };
  // Planner milestones, not game caps. Only positive, recorded
  // levels receive upgrade advice; zero and unknown are separate states.
  function model(raw={},catalog=root,evidence={}){
    const data=parse(raw.data)||raw,sections=[],unlocks=[],ready=[],stampTargets=[];
    const addUnlock=(system,page,name,detail)=>unlocks.push({id:`unlock|${page}|${name}`,system,page,name,detail});
    const addReady=(system,page,name,detail)=>ready.push({system,page,name,detail});
    function add(id,title,world,rows,steps,why,rank=true){
      if(!rows.length)rows=[{name:title,current:null}];
      rows=rows.map((r,i)=>{const current=value(r.current),tier=current===null?null:steps.filter(n=>current>=n).length,target=current===null||current===0?null:steps.find(n=>n>current)??steps[steps.length-1];return {...r,id:id+'-'+i,current,tier,target,status:current===null?'unknown':current===0?'unstarted':tier===steps.length?'complete':'next',progress:current===null||current===0?0:Math.min(1,current/target)};});
      const active=rows.filter(r=>r.status==='next').sort((a,b)=>a.tier-b.tier||(a.target-a.current)-(b.target-b.current));
      sections.push({id,title,world,rows,steps,why,next:rank?active[0]||null:null,known:rows.filter(r=>r.current!==null).length,complete:rows.filter(r=>r.status==='complete').length});
    }
    add('stamps','Stamps',1,(catalog.STAMP_CATALOG||[]).flatMap((g,gi)=>g.stamps.map((s,i)=>({name:s.name,current:at(data.StampLv,gi,i),effect:s.bonus}))),[10,25,50,100],'Stamps provide permanent account bonuses. Choose effects that support your current goal.');
    add('alchemy','Alchemy bubbles',2,(catalog.ALCHEMY_CATALOG||[]).flatMap((g,gi)=>g.bubbles.map((b,i)=>({name:b.name,current:at(data.CauldronInfo,gi,i),effect:clean(b.bonus).replace(/[{}]/g,'')})).filter(r=>r.name!=='BUBBLE')),[10,25,50,100,250,500,1000],'Bubble levels strengthen account bonuses; large bubbles may need to be equipped.');
    add('construction','Construction',3,(catalog.CONSTRUCTION_CATALOG||[]).map((r,i)=>({name:clean(r[0]),current:at(data.Tower??data.TowerInfo,i)})),[1],'Built structures enable World 3 systems. Later building levels have different account-dependent caps.');
    add('worship','Worship wave records',3,Array.from({length:8},(_,i)=>({name:'Totem '+(i+1),current:at(data.TotemInfo,0,i)})),[10,30,50,70],'Higher wave records improve soul collection and can contribute to unlocked total-wave bonuses.');
    add('cooking','Cooking meals',4,(catalog.WORLD4_CATALOG?.MealINFO||[]).map((m,i)=>({name:clean(m[0]),current:at(data.Meals,0,i),effect:clean(m[3]).replace(/[{}]/g,'')})),[5,10,20,30],'Meal levels strengthen permanent bonuses. Cooking speed and spice access determine which meal is practical to pursue.');
    const rewards=catalog.WORLD4_CATALOG?.RiftStuff?.[1]||[],riftSteps=Array.from({length:Math.floor(rewards.length/5)},(_,i)=>5*(i+1));
    add('rift','Rift rewards',4,[{name:'Rift clears',current:at(data.Rift,0)}],riftSteps.length?riftSteps:[5,10,15,20],'Rift milestones unlock permanent features. Each challenge may require a different character or setup.');
    add('characters','Character levels',0,Object.keys(data).filter(k=>/^Lv0_\d+$/.test(k)).sort((a,b)=>Number(a.slice(4))-Number(b.slice(4))).map(k=>({name:'Character '+(Number(k.slice(4))+1),current:at(data[k],0)})),[30,60,100,200],'Class levels provide talent points and support character progression. Dedicated skill characters may intentionally lag behind.');
    try{
      const questModel=catalog.QuestsPage?.model?.(raw),firstQuestByNpc=new Map();
      const systems=catalog.BeanValueEngine?.systems?.(raw),itemNames=new Map((systems?.get?.('itemsData')||[]).map(item=>[item.internalName,item.displayName]));
      const itemLabel=entry=>{const match=String(entry).match(/^(\d+) × (.+)$/),id=match?.[2]||String(entry);return match?`${match[1]} × ${itemNames.get(id)||clean(id).replace(/([a-z])([A-Z0-9])/g,'$1 $2')}`:itemNames.get(id)||clean(id);};
      for(const quest of questModel?.rows||[]){
        if(!quest.important||firstQuestByNpc.has(quest.npc))continue;
        const states=Object.values(quest.states||{}),complete=states.some(state=>Number(state)===1);
        if(!complete)firstQuestByNpc.set(quest.npc,quest);
      }
      add('questUnlocks','Quest unlocks',0,[...firstQuestByNpc.values()].map(quest=>({name:quest.name,current:1,effect:`${quest.npc} · ${quest.rewards?.length?'Rewards: '+quest.rewards.map(itemLabel).join(', '):'Progress the chain for its unlock rewards.'}`})),[2],'The next unfinished progression or unlock quest from each giver. Open Quests for its requirements, rewards, and the rest of the chain.');
      const sushi=systems?.get?.('sushi'),uniqueSushi=Number(sushi?.uniqueSushi);
      if(Number.isFinite(uniqueSushi))add('sushiReview','Sushi recipes',7,[{name:'Unique sushi recipes',current:uniqueSushi,effect:'Unlocking recipes grants their permanent Sushi Station bonuses. Open Sushi to see each recipe and its effect.'}],[5,10,20,30,40,50,63],'More unique sushi recipes unlock additional permanent bonuses. This is a completion overview, not a recommendation to pursue every recipe immediately.');
      const alchemy=systems?.get?.('alchemy'),vials=alchemy?.vials||[],vialsFound=vials.filter(vial=>Number(vial.level)>0).length;
      if(vials.length)add('vialsReview','Vials & sigils',2,[{name:'Discovered vials',current:vialsFound,effect:'Unlock more vials for permanent alchemy bonuses. Open Vials or Sigils to see their individual requirements.'}],[10,25,50,75,vials.length],'Vials and sigils are permanent account progression. This overview tracks discovered vials; individual sources and charge requirements remain on their pages.');
      const construction=systems?.get?.('construction'),built=construction?.buildings?.filter(building=>Number(building.level)>0).length||0;
      if(construction?.buildings?.length)add('constructionReady','Construction readiness',3,[{name:'Built construction buildings',current:built,effect:`${construction.buildings.filter(building=>building.finishedUpgrade).length} finished upgrade${construction.buildings.filter(building=>building.finishedUpgrade).length===1?'':'s'} awaiting collection · ${Number(systems?.get?.('printer')?.slotsUnlocked)||0} printer slots unlocked.`}],[5,10,15,20,construction.buildings.length],'Use this as a quick construction check. Open Construction for building queues, refinery ranks, shrines, and printer samples.');
      const sailing=systems?.get?.('sailing'),artifactsFound=sailing?.artifacts?.filter(artifact=>artifact.unlocked).length||0,islandsFound=sailing?.islands?.filter(island=>island.unlocked).length||0;
      if(sailing?.artifacts?.length)add('sailingReview','Sailing progression',5,[{name:'Artifacts discovered',current:artifactsFound,effect:`${islandsFound} islands unlocked. Artifacts and islands provide permanent account bonuses.`}],[5,10,20,30,sailing.artifacts.length],'Open Sailing to see undiscovered artifacts, island progress, boats, captains, and their exact requirements.');
      const cooking=systems?.get?.('cooking'),mealsFound=Number(cooking?.mealsDiscovered);
      if(Number.isFinite(mealsFound))add('cookingReview','Cooking & breeding',4,[{name:'Meals discovered',current:mealsFound,effect:`${cooking?.kitchens?.length||0} kitchens available. Open Cooking to see missing recipes and spice requirements.`},{name:'Breeding territories unlocked',current:systems?.get?.('breeding')?.territory?.filter(territory=>territory.unlocked).length||0,effect:'Open Breeding to review territories, spices, pets, arena progress, and upgrades.'}],[5,10,20,40,74],'Cooking and breeding unlock permanent bonuses through meals, recipes, spices, territories, pets, and upgrades.');
      const starSigns=systems?.get?.('starsigns'),signsFound=starSigns?.unlockedStarSigns?.length||0,constellations=systems?.get?.('constellations'),constellationsFound=Object.values(constellations||{}).filter(Boolean).length;
      if(signsFound||constellationsFound)add('starsReview','Star Signs & constellations',1,[{name:'Unlocked Star Signs',current:signsFound,effect:`${constellationsFound} constellations recorded. Open Star Signs to inspect unowned signs and incomplete constellations.`}],[10,25,50,75,80],'Star Signs and constellations unlock account-wide bonuses. Their pages contain the precise map and character requirements.');
      const storage=systems?.get?.('storage'),storageCategories=Object.keys(storage?.storageChestsUsed||{}).length;
      if(storageCategories)add('storageReview','Storage & inventory',0,[{name:'Storage categories tracked',current:storageCategories,effect:'Open Storage or inventory systems to review bag upgrades, capacity, and account storage needs.'}],[10,20,30,40,50],'Capacity upgrades can gate stamp, crafting, and quest progress. This overview does not assume every unfilled slot is available to buy.');
      const rift=systems?.get?.('rift'),riftLevel=Number(rift?.level);
      if(Number.isFinite(riftLevel))add('worldGates','World gates & Rift',4,[{name:'Rift level',current:riftLevel,effect:`${rift?.bonuses?.filter(bonus=>bonus.active).length||0} Rift rewards active. Open Rift and Quests for the individual world-progression gates.`}],[5,10,20,30,40],'World gates include quest chains, portals, bosses, and Rift rewards. This section tracks the reliable Rift portion; the Quest section covers quest-based gates.');
      const affordableStamps=(systems?.get?.('stamps')||[]).flat().filter(stamp=>stamp.level>0&&stamp.canUpgradeWithCoins&&stamp.canUpgradeWithMats&&!stamp.cantCarry).length;
      if(affordableStamps)addReady('Stamps','stamps',`${affordableStamps} stamp upgrade${affordableStamps===1?'':'s'} to check`,'Decoder cost checks pass. Open Stamps to verify occupied inventory slots and the character who can carry the full material payment.');
      const finishedBuildings=construction?.buildings?.filter(building=>building.finishedUpgrade).length||0;
      if(finishedBuildings)addReady('Construction','construction',`${finishedBuildings} construction upgrade${finishedBuildings===1?'':'s'} ready to claim`,'Collect finished construction work before starting another build.');
      const eggs=Number(systems?.get?.('breeding')?.eggsUnclaimed)||0;
      if(eggs)addReady('Breeding','breeding',`${eggs} breeding egg${eggs===1?'':'s'} ready to collect`,'Collect available eggs to keep breeding progress moving.');
      const lab=systems?.get?.('lab'),inactiveLab=lab?.bonuses?.filter(bonus=>bonus.unlocked&&!bonus.active).length||0;
      if(inactiveLab)addReady('Lab','lab',`${inactiveLab} unlocked Lab bonus${inactiveLab===1?' is':'es'} inactive`,'Check character links and layout to activate these available bonuses.');
      const armor=catalog.ArmorSets?.model?.(data),lockedSets=armor?.rows?.filter(set=>!set.unlocked)||[];
      if(armor?.available&&lockedSets.length)add('armorSets','Armor Smithy sets',3,lockedSets.map(set=>({name:set.name,current:1,effect:set.bonus})),[2],'Locked Armor Smithy set bonuses. Open Armor Sets to see the exact gear required for each set.');
    }catch(_){/* Extra review sections require a full decoded save. */}
    // Zeros here are explicit uncollected/unlocked states; omitted values may be
    // from a partial export, so they are intentionally not treated as locked.
    let stampQuests=[];try{stampQuests=catalog.QuestsPage?.model?.(raw)?.rows||[];}catch(_){}
    (catalog.STAMP_CATALOG||[]).forEach((group,gi)=>group.stamps.forEach((stamp,i)=>{if(at(data.StampLv,gi,i)===0){
      const acquisition=stampAcquisition(stamp,data,raw,stampQuests),entry={id:'unlock|stamps|'+stamp.name,system:'Stamps',name:stamp.name,sourceUrl:stamp.url,effect:stamp.bonus,...acquisition};
      stampTargets.push(entry);
      const row=sections.find(section=>section.id==='stamps')?.rows.find(row=>row.name===stamp.name);if(row)row.acquisition=acquisition;
      if(['ready','quest'].includes(acquisition.status))unlocks.push(entry);
    }}));
    (catalog.ALCHEMY_CATALOG||[]).forEach((group,gi)=>group.bubbles.forEach((bubble,i)=>{if(bubble.name!=='BUBBLE'&&at(data.CauldronInfo,gi,i)===0)addUnlock('Alchemy bubbles','alchemy',bubble.name,'Not unlocked yet — discover it through its cauldron before it can be leveled.');}));
    try{const systems=catalog.BeanValueEngine?.systems?.(raw),sets=systems?.get?.('equipmentSets');sets?.equipmentSets?.filter(set=>set.unlocked===false).forEach(set=>addUnlock('Armor Smithy sets','armorSets',clean(set.data?.name||`Set ${set.index+1}`),'Not unlocked yet — unlock its Armor Smithy set requirements before pursuing the bonus.'));}catch(_){/* Leave unlock data out when a partial export cannot be decoded. */}
    // Recommendations require an executable action and save-backed evidence.
    // Benchmarks below are browsing context, never generated spending targets.
    const actions=(evidence.actions||[]).map(action=>({...action}));
    try{
      const systems=catalog.BeanValueEngine?.systems?.(raw);
      for(const building of systems?.get?.('construction')?.buildings||[])if(building.finishedUpgrade&&building.name&&Number.isFinite(building.level)){
        actions.push({id:'claim-building|'+building.index,sectionId:'construction',page:'construction',system:'Construction',name:'Claim '+clean(building.name)+' level '+(building.level+1),state:'Do now',ready:true,score:150,effect:clean(building.description),reason:'The save marks this specific building upgrade as finished and awaiting collection.',facts:[{label:'Saved building level',text:String(building.level)},{label:'Upgrade status',text:'Finished, not collected'}],benefit:'Applies the finished upgrade and frees its build slot.',blocker:'Refresh after claiming; this recommendation describes the imported save.'});
      }
      const eggs=Number(systems?.get?.('breeding')?.eggsUnclaimed);
      if(Number.isFinite(eggs)&&eggs>0)actions.push({id:'ready|breeding',sectionId:'breeding',page:'breeding',system:'Breeding',name:'Collect '+eggs+' breeding eggs',state:'Do now',ready:true,score:120,effect:'Breeding eggs',reason:'Your save contains '+eggs+' unclaimed breeding eggs.',facts:[{label:'Unclaimed eggs',text:String(eggs)}],benefit:'Collects the eggs already available in your save.',blocker:'No prediction of pet rolls or territory wins.'});
    }catch(_){}
    for(const stamp of stampTargets.filter(stamp=>stamp.status==='ready'))actions.push({id:'hand-in|'+stamp.id,sectionId:'stamps',page:'stamps',system:'Stamps',name:'Hand in '+stamp.name+' to Mr. Pigibank',sourceName:stamp.name,state:'Do now',ready:true,score:145,unlock:true,effect:stamp.effect,reason:stamp.detail,facts:[{label:'Evidence',text:stamp.source}],benefit:'Unlocks '+stamp.name+' for upgrades.',blocker:'Move the stamp from storage to a character first if needed.'});
    actions.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
    // Keep the first screen varied; retain the remaining actions in priority order.
    const seen=new Set(),priorities=[];
    for(const action of actions){if(!seen.has(action.page)){seen.add(action.page);priorities.push(action);}}
    const top=priorities.slice(0,3),topIds=new Set(top.map(action=>action.id));
    const ordered=[...top,...actions.filter(action=>!topIds.has(action.id))];
    const ranked=sections.filter(s=>s.next).sort((a,b)=>{
      const best=id=>actions.find(action=>action.sectionId===id)?.score??-1;
      return best(b.id)-best(a.id)||a.id.localeCompare(b.id);
    });
    const focusSections=[];
    try{
      const questModel=catalog.QuestsPage?.model?.(raw),questStatus=row=>{const states=Object.values(row.states||{});return states.some(v=>v===1)?'Complete':states.some(v=>v===0)?'In progress':'Not started';};
      const quests=(questModel?.rows||[]).filter(row=>row.important&&questStatus(row)!=='Complete').map(row=>({name:row.name,meta:`${row.npc} · ${questStatus(row)}`,detail:'Progress this quest chain for its account, equipment, recipe, inventory, stamp, or other unlock reward.'}));
      if(quests.length)focusSections.push({id:'quests',title:'Quest unlock paths',page:'quests',entries:quests});
      const sets=catalog.BeanValueEngine?.systems?.(raw)?.get?.('equipmentSets')?.equipmentSets?.filter(set=>set.unlocked===false).map(set=>({name:clean(set.data?.name||`Armor Set ${set.index+1}`),meta:'Armor Smithy',detail:'This permanent set bonus is still locked. Check the Armor Sets page for its required equipment.'}))||[];
      if(sets.length)focusSections.push({id:'armorSets',title:'Armor Smithy sets',page:'armorSets',entries:sets});
    }catch(_){/* These supplemental paths are omitted when a partial save cannot be decoded. */}
    return {diagnostics:evidence.diagnostics||[],sections,ranked,priorities:ordered,unlocks,ready,stampTargets,focusSections,actionCoverage:evidence.coverage||[],known:sections.reduce((n,s)=>n+s.known,0),total:sections.reduce((n,s)=>n+s.rows.length,0)};
  }
  const reports=new WeakMap(),requests=new WeakMap(),renders=new WeakMap();
  function prepare(raw){
    if(reports.has(raw))return Promise.resolve(reports.get(raw));
    if(requests.has(raw))return requests.get(raw);
    const job=new Promise((resolve,reject)=>{
      const worker=new root.Worker('account-review-worker.js');
      const timer=root.setTimeout(()=>finish(new Error('Account review timed out. Reopen this page to retry.')),30000);
      function finish(error,report){root.clearTimeout(timer);worker.terminate();if(error)reject(error);else{reports.set(raw,report);resolve(report);}}
      worker.onmessage=e=>finish(e.data.error?new Error(e.data.error):null,e.data.report);
      worker.onerror=e=>finish(new Error(e.message||'Account review could not load.'));
      try{worker.postMessage(raw);}catch(error){finish(error);}
    }).finally(()=>requests.delete(raw));
    requests.set(raw,job);return job;
  }
  function render(host,raw){
    if(typeof root.Worker==='function'&&!reports.has(raw)){
      host.innerHTML='<p role="status">Loading account review…</p>';
      const marker=host.firstElementChild;renders.set(host,marker);
      prepare(raw).then(()=>{if(renders.get(host)===marker&&host.firstElementChild===marker)render(host,raw);}).catch(error=>{if(renders.get(host)===marker&&host.firstElementChild===marker)host.innerHTML='<p role="alert">'+esc(error.message)+'</p>';});
      return;
    }
    const report=reports.get(raw)||model(raw),empty=!Object.keys(raw?.data||raw||{}).length;
    let status='next',system='all',query='',goal='balanced',page=0,readyOnly=false;
    try{goal=goalFor(localStorage.getItem(GOAL_KEY)).id;}catch(_){}
    let ranked=rankForGoal(report,goal);
    const pageButtons=pages=>`<div class="review-links">${pages.map(page=>`<button class="secondary" data-review-page="${page}">Open ${esc(root.SKILL_PAGES?.[page]?.title||clean(page))}</button>`).join('')}</div>`;
    const playbookItem=item=>`<article><div><span>${esc(item.world||'Account-wide')}</span><h4>${esc(item.title)}</h4><p>${esc(item.copy)}</p></div>${pageButtons(item.pages)}</article>`;
    const playbookHtml=()=>`<section class="review-playbook"><div class="section-head compact"><div><p class="eyebrow">Review rubric</p><h3>Foundation before frontier</h3><p>Use this to judge relative account weakness. It is intentionally not a list of mandatory universal caps.</p></div></div><div class="review-playbook-grid">${PLAYBOOK.foundations.map(playbookItem).join('')}</div><details class="review-world-guide"><summary><strong>World-by-world review map</strong><span>Open only the world you are checking</span></summary><div class="review-playbook-grid">${PLAYBOOK.worlds.map(playbookItem).join('')}</div></details><details class="review-world-guide"><summary><strong>Classes, clickers &amp; cleanup</strong><span>Masterclass and account-wide checks</span></summary><div class="review-playbook-grid">${PLAYBOOK.specialists.map(playbookItem).join('')}</div></details></section>`;
    const unlockHtml=()=>{if(!report.unlocks.length)return '<p class="review-note">No unlock candidates with a supported route. Excluded and unverified stamps are listed under Account checks.</p>';const preview=report.unlocks.slice(0,3),remaining=report.unlocks.slice(3),itemHtml=item=>`<article><div><span>${esc(item.system)}${item.label?' · '+esc(item.label):''}</span><strong>${esc(item.name)}</strong><p>${esc(item.detail)}</p>${item.sourceUrl?`<details class="review-unlock-source"><summary>Stamp reference</summary><p>Source reference: <a href="${esc(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(item.name)} guide ↗</a></p></details>`:''}</div><button class="secondary" data-review-page="${esc(item.page)}">Open</button></article>`;return`<section class="review-unlocks"><div><p class="eyebrow">Unlock candidates · ${report.unlocks.length}</p><h3>Collection &amp; unlock checks</h3><p>Showing ${preview.length}. Stamp tasks require an item in your save or an active regular quest; quest requirements still need checking.</p></div><div class="review-unlock-list">${preview.map(itemHtml).join('')}</div>${remaining.length?`<details class="review-unlock-more"><summary>Show ${remaining.length} more unlock${remaining.length===1?'':'s'}</summary><div class="review-unlock-list">${remaining.map(itemHtml).join('')}</div></details>`:''}</section>`;};
    const stampReferenceHtml=()=>{
      const excluded=(report.stampTargets||[]).filter(item=>!['ready','quest'].includes(item.status));
      if(!excluded.length)return '';
      return `<details class="review-section review-stamp-exclusions"><summary><strong>Excluded stamp targets</strong><span>${excluded.length} reference entries · not tasks</span></summary><p>These stamps do not count as collection tasks. Random rewards, unavailable sources and unverified access stay out of recommendations.</p>${[['unavailable','No obtainable source verified'],['random','Rare random rewards — passive only'],['unverified','Source or account access not verified']].map(([status,title])=>{const items=excluded.filter(item=>item.status===status);return items.length?`<h4>${title} · ${items.length}</h4><div class="review-grid">${items.map(item=>`<article class="review-item" data-stamp-exclusion="${status}"><h4>${esc(item.name)}</h4><span class="review-badge">${esc(item.label)}</span><p>${esc(item.detail)}</p>${item.sourceUrl?`<a href="${esc(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">Reference</a>`:''}</article>`).join('')}</div>`:'';}).join('')}</details>`;
    };
    const focusHtml=()=>report.focusSections.map(section=>`<details class="review-section review-focus-section"><summary><strong>${esc(section.title)}</strong><span>${section.entries.length} incomplete unlock${section.entries.length===1?'':'s'}</span></summary><p>These unlock paths are tracked separately from level milestones.</p><button class="secondary" data-review-page="${esc(section.page)}">Open ${esc(section.title)}</button><div class="review-grid">${section.entries.map(entry=>`<article class="review-item"><h4>${esc(entry.name)}</h4><span class="review-badge">${esc(entry.meta)}</span><p>${esc(entry.detail)}</p></article>`).join('')}</div></details>`).join('');
    const card=(item,index)=>{
      const gain=item.upgradeGain;
      const capAction=item.changeLabel==='unlocked level cap';
      const future=item.futureGain;
      const futureText=future?(future.delta>0?`After buying through Lv ${fmt(item.futureLevel)}: +${fmt(future.delta)}${future.unit==='%'?' percentage points':future.unit==='×'?'×':''} ${future.scope}. Extra coins required.`:`Buying through Lv ${fmt(item.futureLevel)} adds no bonus in this saved setup.`):'Extra coin purchases are needed to gain the bonus.';
      const gainHtml=capAction?`<span class="review-gain">Unlocks ${fmt(item.target-item.current)} levels<small>${esc(futureText)}</small></span>`:gain?`<span class="review-gain">${gain.delta>=0?'+':''}${fmt(gain.delta)}${gain.unit==='%'?' percentage points':gain.unit==='×'?'×':''} <small>${esc(gain.scope)}</small></span>`:`<span class="review-gain"><small>${esc(item.benefit||'See action details')}</small></span>`;
      return `<article class="review-action"><details class="review-action-fold"><summary><span class="eyebrow">${index+1} · ${esc(item.system)}</span><span class="review-state ${item.ready?'ready':''}">${esc(item.state)}</span><h4>${esc(item.name)}</h4>${gainHtml}<span class="review-expand-hint">Details &amp; costs</span></summary><div class="review-action-body">${item.target!==undefined?`<p class="review-change" title="${esc(item.current)} → ${esc(item.target)}">${fmt(item.current)} <span>→</span> ${fmt(item.target)} <small>${esc(item.changeLabel||'saved action')}</small></p>`:''}${!capAction&&gain&&Number.isFinite(gain.before)&&Number.isFinite(gain.after)?`<p><b>Bonus:</b> <span title="${esc(gain.before)} → ${esc(gain.after)}">${fmt(gain.before)}${esc(gain.unit)} → ${fmt(gain.after)}${esc(gain.unit)}</span></p>`:''}${item.futureGain?`<p class="review-action-benefit">After separately buying levels through ${fmt(item.futureLevel)}: +${fmt(item.futureGain.delta)}${item.futureGain.unit==='%'?' percentage points':item.futureGain.unit==='×'?'×':''} ${esc(item.futureGain.scope)}. Those coin purchases are not included in this cap payment.</p>`:''}<p>${esc(item.reason)}</p>${item.facts?.length?`<dl class="review-evidence">${item.facts.map(fact=>`<div><dt>${esc(fact.label)}</dt><dd>${fact.coin!==undefined?(root.GameCurrency?.html(fact.coin)||esc(fmt(fact.coin))+' coins'):esc(fact.text)}</dd></div>`).join('')}</dl>`:''}${item.eta?`<p class="review-note"><b>Time estimate:</b> ${item.eta.hours===null?'Unavailable':fmt(item.eta.hours)+' hours'} · ${esc(item.eta.detail)}</p>`:''}${item.effect?`<p>${esc(item.effect)}</p>`:''}<p class="review-note">${esc(item.blocker)}</p><p class="review-note">Bonus changes describe this source, not your final character stat. Purchases share saved balances; refresh after spending.</p><div class="review-action-buttons"><button class="secondary" data-review-page="${esc(item.page)}">Open ${esc(item.system)}</button></div></div></details></article>`;

    };
    const priorityHtml=()=>{
      const start=page*6,items=ranked.actions.slice(start,start+6),pages=Math.ceil(ranked.actions.length/6);
      return `<section class="review-priorities"><div class="review-list-head"><div><h3>Your next account steps</h3><p>${ranked.actions.length} ${readyOnly?'ready':'supported'} actions · ${esc(ranked.goal.name)}</p></div><label class="review-ready-filter"><input type="checkbox" data-review-ready ${readyOnly?'checked':''}> Ready now only</label></div><div class="review-start">${items.map((item,index)=>card(item,start+index)).join('')||`<div class="review-empty"><h3>${readyOnly?'No verified actions ready':'No supported actions for this goal'}</h3><p>${readyOnly?'Turn off the ready-only filter to see upgrades that need checking.':'No purchase or corrective action is verified for this goal in the loaded save. Account checks still shows your progress; no generic tasks are substituted.'}</p></div>`}</div>${pages>1?`<div class="review-pagination"><button class="secondary" data-review-prev ${page===0?'disabled':''}>Previous</button><span aria-live="polite">${page+1} / ${pages}</span><button class="secondary" data-review-next ${page+1>=pages?'disabled':''}>Next</button></div>`:''}${report.actionCoverage?.some(entry=>entry.status==='unavailable')?`<details class="review-calculation-status"><summary>Some action calculations are unavailable</summary>${report.actionCoverage.filter(entry=>entry.status==='unavailable').map(entry=>`<p>${esc(entry.system)}: ${esc(entry.reason)}</p>`).join('')}</details>`:''}${report.actionCoverage?.length?`<details class="review-calculation-status"><summary>Recommendation coverage · ${report.actionCoverage.filter(x=>x.status==='calculated').length} calculators</summary>${report.actionCoverage.map(x=>`<p>${esc(x.system)}: ${x.status==='calculated'?`${x.actions} supported action${x.actions===1?'':'s'}`:esc(x.reason)}</p>`).join('')}<p>Only unlocked, priced upgrades with enough saved currency are added by the Summoning, Fountain and Alchemy coin checks. Unsupported systems still appear in Account checks where available.</p></details>`:''}<p class="review-note">Each action explains its saved evidence. Purchases share your balances; refresh after spending. Rankings do not compare gain per hour.</p></section>`;
    };
    const checksHtml=()=>{
      const shown=report.sections.filter(s=>system==='all'||s.id===system).map(s=>({...s,visible:s.rows.filter(r=>(status==='all'||r.status===status)&&`${s.title} ${r.name} ${r.effect||''}`.toLowerCase().includes(query))})).filter(s=>s.visible.length);
      return `<section class="review-checks"><div class="review-summary"><div><strong>${report.sections.filter(s=>s.known).length} / ${report.sections.length}</strong><span>systems with data</span></div><div><strong>${report.unlocks.length}</strong><span>unlock candidates</span></div><div><strong>${report.total-report.known}</strong><span>values unavailable</span></div></div><div class="review-controls"><label>Show<select aria-label="Review status">${[['next','Next checkpoints'],['complete','Benchmarks met'],['unstarted','Not started'],['unknown','Missing data'],['all','All reviewed entries']].map(([v,t])=>`<option value="${v}" ${v===status?'selected':''}>${t}</option>`).join('')}</select></label><label>System<select aria-label="Review system"><option value="all">All systems</option>${report.sections.map(s=>`<option value="${s.id}" ${s.id===system?'selected':''}>${esc(s.title)}</option>`).join('')}</select></label><label>Search<input type="search" aria-label="Search account review" placeholder="Find a bonus or upgrade…" value="${esc(query)}"></label></div><p class="review-note">Account checks cover all goals. ${shown.reduce((n,s)=>n+s.visible.length,0)} matching entries.</p>${shown.map(s=>`<details class="review-section"><summary><strong>${esc(s.title)}</strong><span>${s.visible.length} entries</span></summary><p>${esc(s.why)}</p><button class="secondary" data-review-page="${esc(PAGE_FOR[s.id]||s.id)}">Open ${esc(s.title)}</button><div class="review-grid">${s.visible.map(r=>`<article class="review-item"><h4>${esc(r.name)}</h4><span class="review-badge">${r.status==='unknown'?'Missing data':r.status==='unstarted'?(r.acquisition?.label||'Not started'):r.status==='complete'?'Benchmark met':'Next checkpoint'}</span><p>${r.current===null?'Unavailable in this save':'Current: '+fmt(r.current)}${r.status==='next'?' → '+fmt(r.target):''}</p>${r.effect?`<small>${esc(r.effect)}</small>`:''}${r.acquisition?`<p>${esc(r.acquisition.detail)}</p>`:''}</article>`).join('')}</div></details>`).join('')||'<p class="review-empty">No entries match these filters.</p>'}${unlockHtml()}${stampReferenceHtml()}${focusHtml()}<details class="review-method"><summary>Account progression guide</summary>${playbookHtml()}</details><details class="review-method"><summary>Coverage &amp; ranking</summary><p>Actions use priced stamp upgrades and inventory blockers, funded single-click bubble purchases, meal upgrades covered by saved stock, refinery imbalances, funded Summoning and Fountain levels, Alchemy coin upgrades, finished buildings and stamp hand-ins. Goal matching uses effect descriptions. Other systems remain review context; unsupported calculations do not generate advice.</p><p>Saved balances apply independently to each action. One purchase can change other prices and bonuses. Within matching actions, verified readiness ranks ahead of preparation; benchmarks never create spending recommendations.</p></details></section>`;
    };
    function paint(){
      root.ReviewTargetUI?.release();
      ranked=rankForGoal(report,goal,{readyOnly});page=Math.min(page,Math.max(0,Math.ceil(ranked.actions.length/6)-1));
      host.innerHTML=`<section class="account-review"><div class="section-head"><div><p class="eyebrow">Optimizers · goal-based planning</p><h2>Account Review</h2><p>Choose a goal. Find your next useful upgrade.</p></div><button class="secondary" data-review-load>${empty?'Load save':'Update save'}</button></div>${empty?'<div class="review-empty"><h3>Start with your account</h3><p>Load a full IdleOn export from Home to get recommendations from your saved progress.</p></div>':`<section class="review-goals" aria-label="Account goal"><div class="review-list-head"><h3>What are you working toward?</h3><span class="review-note">Saved on this browser</span></div><label class="review-goal-mobile">Your goal<select aria-label="Review goal">${GOALS.map(g=>`<option value="${g.id}" ${goal===g.id?'selected':''}>${esc(g.name)}</option>`).join('')}</select></label><div class="review-goal-buttons">${GOALS.map(g=>`<button type="button" data-review-goal="${g.id}" aria-pressed="${goal===g.id}">${esc(g.name)}</button>`).join('')}</div><p class="review-goal-description" aria-live="polite">${esc(ranked.goal.description)}</p></section>`}${!empty?'<section id="reviewTargetCalculator" class="carry-empty" role="region" aria-label="Target calculator">Loading calculator...</section>':''}</section>`;
      if(!empty){
        const calculator=host.querySelector('#reviewTargetCalculator');
        root.ReviewTargetUI.mount(calculator,raw,goal);
      }
      host.querySelectorAll('[data-review-goal]').forEach(button=>button.onclick=()=>{goal=button.dataset.reviewGoal;page=0;readyOnly=false;try{localStorage.setItem(GOAL_KEY,goal);}catch(_){}paint();host.querySelector('[data-review-goal="'+goal+'"]')?.focus();});
      const ready=host.querySelector('[data-review-ready]');if(ready)ready.onchange=()=>{readyOnly=ready.checked;page=0;paint();};
      const prev=host.querySelector('[data-review-prev]');if(prev)prev.onclick=()=>{page--;paint();};
      const next=host.querySelector('[data-review-next]');if(next)next.onclick=()=>{page++;paint();};
      host.querySelector('[data-review-load]').onclick=()=>{document.getElementById('navHome').click();document.getElementById('changeJsonBtn')?.click();document.getElementById('jsonInput')?.focus();};
      host.querySelectorAll('[data-review-page]').forEach(b=>b.onclick=()=>root.dispatchEvent(new CustomEvent('idleon:navigate',{detail:b.dataset.reviewPage})));
      const filter=host.querySelector('[aria-label="Review status"]');if(filter)filter.onchange=()=>{status=filter.value;paint();};
      const select=host.querySelector('[aria-label="Review system"]');if(select)select.onchange=()=>{system=select.value;paint();};
      const goalSelect=host.querySelector('[aria-label="Review goal"]');if(goalSelect)goalSelect.onchange=()=>{goal=goalFor(goalSelect.value).id;page=0;readyOnly=false;try{localStorage.setItem(GOAL_KEY,goal);}catch(_){}paint();host.querySelector('[aria-label="Review goal"]')?.focus();};
      const input=host.querySelector('[aria-label="Search account review"]');if(input)input.oninput=()=>{query=input.value.toLowerCase();paint();host.querySelector('[aria-label="Search account review"]').focus();};
    }
    paint();
  }
  const api={model,render,rankForGoal,GOALS,matchesGoal,stampAcquisition};if(typeof module!=='undefined')module.exports=api;else root.AccountReview=api;
})(typeof window!=='undefined'?window:globalThis);
