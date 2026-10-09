(function(root){

'use strict';

const stamps=root.MapBonusCatalog.stamps;

const targets={O0:['str'],O23:['str'],O27:['str'],G0:['agi'],G23:['agi','luk'],G28:['agi'],P0:['wis'],P23:['wis'],P28:['wis'],Y0:['luk']};

function effectTargets(text){

 const out=[];

 if(/damage|weapon power/i.test(text)&&!/mob fighting|pet (?:damage|dmg)|summon(?:ing)? damage|tower|door/i.test(text))out.push('damage');

 if(/accuracy/i.test(text))out.push('accuracy');

 if(/efficiency|efficicency/i.test(text))out.push('efficiency');

 if(/drop rate|drop chance/i.test(text)&&!/card drop|shiny/i.test(text))out.push('drops');

 return out;

}

function stampTargets(s){if(/^(Base|Pct)(STR|AGI|WIS|LUK)$/.test(s.stat))return [s.stat.slice(-3).toLowerCase()];if(/AllStat/.test(s.stat))return ['str','wis','agi','luk'];return effectTargets(s.description);}

function catalog(){

 const bubbles=(root.ALCHEMY_CATALOG||[]).flatMap(g=>g.bubbles.map(b=>({...b,id:g.letter+b.index}))).map(b=>{const links=targets[b.id]||effectTargets(b.bonus);return {id:'bubble-'+b.id,key:b.id,name:b.name,type:'Bubble',icon:/^assets\//.test(b.icon||'')?b.icon:root.UpgradeIcons.source({page:'alchemy'}),targets:links,description:b.bonus,label:links.join(' / ')};});

 const stampNodes=stamps.map(s=>({id:'stamp-'+s.id,key:s.id,name:s.name,type:'Stamp',icon:'assets/'+s.id+'.png',targets:stampTargets(s),description:s.description,label:s.stat==='AllStatPct'?'% All Stats':s.stat==='BaseAllStat'?'All Stats':s.stat.replace(/^Base/,'')}));

 const meals=(root.WORLD4_CATALOG?.MealINFO||[]).map((m,i)=>{const text=m[3].replaceAll('_',' '),links=m[5]==='Stat'?['str','wis','agi','luk']:effectTargets(text);return {id:'meal-'+i,key:i,name:m[0].replaceAll('_',' '),type:'Meal',icon:'assets/CookingM'+i+'.png',targets:links,description:text,label:links.join(' / ')};});

 return [...bubbles,...stampNodes,...meals].map(s=>({...s,targets:[...new Set([...s.targets,...benefitTargets(s.description,s.type)])]}));

}

const effects=[

 ['movement','Movement speed',/movement|move speed/i],

 ['statues','Statues',/statue/i],

 ['stamp-cost','Stamp costs & levels',/stamp/i],

 ['post-office','Post Office',/post office|box points|pens/i],

 ['portal-kills','Portal kills',/portal|kills? count|kill.{0,20}count/i],

 ['rare-spawns','Crystal & giant spawns',/crystal|giant monster/i],

 ['food','Food & golden food',/food|food effect/i],

 ['equinox','Equinox',/equinox|dream cloud/i],

 ['shrines','Shrines',/shrine/i],

 ['star-signs','Star Signs',/star sign|constellation/i],

 ['dungeons','Dungeons',/dungeon|flurbo|boosted run/i],

 ['library','Library & talent books',/library|book|checkout/i],

 ['shop','Shop prices & stock',/shop|sell price|stock/i],

 ['minehead','Minehead',/minehead|mine currency|best ever hit/i],

 ['amber','Spelunking amber & stamina',/amber|stamina|outpost|bling bag/i],

 ['clamworks','Clamworks',/clam|pearl|promotion/i],

 ['sushi','Sushi',/sushi/i],

 ['legend','Legend Talents',/legend talent|ribbon|familiar/i],

 ['meritocracy','Meritocracy',/meritocracy|merit point/i],

 ['hoops','Hoops',/hoops|basketball/i],

 ['darts','Darts',/darts|bullseye/i],

 ['zenith','Zenith Market',/zenith|cluster/i],

 ['royal','Royal Guardian',/royal|armory/i],

 ['grimoire','Grimoire & bones',/grimoire|bone|wraith/i],

 ['compass','Compass & dust',/compass|dust|medallion|tempest/i],

 ['tesseract','Tesseract & tachyons',/tesseract|tachyon|prisma|arcane/i],

 ['hole-production','Hole resources & production',/rupie|jar |collectible|bucket|bell|study rate|conjur|schematic|measurement/i],



 ['cooking-speed','Cooking speed',/cooking.{0,25}speed|meal.{0,20}speed|kitchen.{0,20}speed/i],

 ['artifact-find','Artifact find chance',/artifact.{0,30}(?:find|chance)|(?:find|chance).{0,30}artifact/i],

 ['sailing-speed','Sailing speed',/(?:sailing|boat).{0,25}speed/i],

 ['crop-speed','Crop growth speed',/(?:crop|farming|growth).{0,25}speed|grow.{0,20}faster/i],

 ['crop-evolution','Crop evolution',/evolution|evolve.{0,20}(?:chance|crop)/i],

 ['overgrowth','Overgrowth',/overgrowth/i],

 ['skill-exp','Skill EXP',/(?:skill|skilling).{0,25}(?:exp|xp|experience)|(?:exp|experience).{0,25}skill/i],

 ['class-exp','Class EXP',/(?:class|combat).{0,25}(?:exp|xp|experience)|(?:exp|experience).{0,25}(?:class|combat)/i],

 ['build-speed','Construction build speed',/build(?:ing)?.{0,15}speed|construction.{0,20}speed/i],

 ['printing','3D printing & sampling',/printer|printing|sample size|sampling/i],

 ['refinery-speed','Refinery speed',/refinery.{0,25}(?:speed|cycle)|salt.{0,20}production/i],

 ['brew-speed','Alchemy brewing speed',/brew.{0,20}speed/i],

 ['liquid','Liquid generation & capacity',/liquid.{0,30}(?:regen|speed|capacity|cap|generat)/i],

 ['sigil-speed','Sigil speed',/sigil.{0,25}(?:speed|exp|charge)/i],

 ['egg-speed','Egg incubation speed',/(?:egg|incubat).{0,25}(?:speed|time|faster)/i],

 ['pet-power','Pet power & damage',/pet.{0,25}(?:power|damage|dmg)|breeding.{0,20}power/i],

 ['shiny-speed','Shiny pet speed',/shiny.{0,25}(?:speed|level|exp)/i],

 ['lab-range','Laboratory range',/line width|connection range|lab.{0,20}range/i],

 ['divinity-gain','Divinity gains',/divinity.{0,25}(?:gain|point|exp)/i],

 ['gaming-bits','Gaming bit gains',/bits? (?:gain|per)|(?:gain|more|extra).{0,15}bits|gaming.{0,20}bits/i],

 ['gaming-speed','Gaming growth speed',/(?:sprout|gaming|plant).{0,25}(?:speed|growth|time)/i],

 ['jade','Jade gains',/jade/i],

 ['stealth','Sneaking stealth',/stealth/i],

 ['summoning-essence','Summoning essence',/essence/i],

 ['summoning-power','Summoning damage & health',/summon.{0,25}(?:damage|health|hp)/i],

 ['afk-gains','AFK gains',/afk.{0,25}(?:gain|rate)/i],

 ['respawn','Monster respawn',/respawn/i],

 ['money','Money gains',/money|cash|coins/i],

 ['card-chance','Card drop chance',/card.{0,20}(?:drop|chance)|(?:drop|chance).{0,20}card/i],

 ['multikill','Multikill',/multikill/i],

 ['critical','Critical chance & damage',/critical|\bcrit\b/i],

 ['defence','Defence',/defen[cs]e/i],

 ['skill-speed','Skill speed',/(?:skill|skilling|mining|chopping|fishing|catching).{0,25}speed/i],

 ['skill-afk','Skill AFK gains',/(?:skill|skilling).{0,25}afk|afk.{0,25}(?:skill|skilling)/i],

 ['forge-speed','Forge speed & capacity',/forge|smelt/i],

 ['anvil-speed','Anvil production',/anvil|smithing.{0,20}speed/i],

 ['villagers','Villager EXP & speed',/villager/i],

 ['research','Research',/research/i],

 ['spelunking','Spelunking',/spelunk/i],

 ['coral','Coral Reef',/coral|reef/i]

];

const systemAreas=new Map();

function areas(){return [...effects.map(([id,name])=>({id:'effect:'+id,name})),...root.ConnectedBonuses.BENEFITS.filter(([id])=>id!=='world7').map(([id,name])=>({id:'benefit:'+id,name})),...[...systemAreas].map(([id,name])=>({id,name}))];}

function matchesEffect(text,key){return !!effects.find(([id])=>'effect:'+id===key)?.[2].test(text);}

function benefitTargets(text,source='Unidentified source'){

 const ids=root.ConnectedBonuses.BENEFITS.filter(([id,,pattern])=>id!=='world7'&&pattern.test(text)).map(([id])=>'benefit:'+id);

 ids.push(...effects.filter(([, ,pattern])=>pattern.test(text)).map(([id])=>'effect:'+id));

 if(!ids.length){const id='system:'+encodeURIComponent(source);systemAreas.set(id,source+' bonuses & unlocks');ids.push(id);}

 return ids;

}

function classify(row){return benefitTargets([row.effect,row.benefitText].filter(Boolean).join(' '),row.source);}

function wording(text){return String(text??'').replace(/\s*@\s*/g,' · ').replace(/[{}]|\$(?!\d)/g,'[value unavailable]').replace(/\bDMG\b/g,'Damage').replace(/\bSPD\b/g,'Speed').replace(/\bLVs?\b/g,'Levels').replace(/\b([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)\b/g,s=>s.replaceAll('_',' ')).replace(/\s+/g,' ').trim();}

function resolveDetails(rows,raw){

 const data=typeof raw.data==='string'?JSON.parse(raw.data):raw.data||raw,parse=v=>typeof v==='string'?JSON.parse(v):v,holes=parse(data.Holes)||[],options=parse(data.OptionsListAccount||data.OptLacc)||[];

 const d=root.BonusSystems.systems(raw),hole=d.get('hole'),compass=d.get('compass'),fmt=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:3}),f=(w,i)=>hole?.fountain?.getBonus(w,i)||0;

 const royalModel=root.RoyalArmory.model(raw);
 let timers=null;try{timers=root.FountainTimers?.calculate(raw);}catch{}

 for(const row of rows){

  if(row.source==='The Hole · Fountain'){

   const x=hole?.fountain?.upgrades.find(x=>String(x.data.name).replaceAll('_',' ')===row.name);if(!x)continue;const w=x.data.waterIndex,i=x.data.index,b=x.getBonus();let text=String(x.data.description).replaceAll('{',fmt(b)).replaceAll('}',fmt(1+b/100));

   const spaces=Math.min(16,1+f(0,10)),stack=Math.min(50,3+f(0,11));

   if(i>=2&&i<=4){const c=w*3+i-2,boosters=[[0,2],[0,5],[0,6],[0,7],[1,5],[1,6],[1,7],[2,5],[2,6]],bo=boosters[c],log=Math.log(Math.max(1,Number(holes[9]?.[[3,16,20][w]])||0))/2.30259;const base=1+b*(1+f(...bo)/100)*(1+log*f(w,19)/100);text=`${['Bronze','Silver','Gold','Dollar','Credit','Treasury','Moolah','Shilling','Greane'][c]} currency base value: ${fmt(base)} before account currency multipliers.`;}

   else if(w===0&&i===8)text=`Auto-collects overflow currency at ${fmt(100*(.1+.5*b/(100+b)))}% of its value when the Fountain is at capacity.`;
   else if(w===2&&i===9)text=`Each Lucky coin adds +${fmt(25+b)}% to that currency type’s value.`;
   else if(w===0&&i===9&&timers){const t=timers.rows[0];text=`Coin fill time: ${root.FountainTimers.duration(t.away)} away from the Fountain; ${root.FountainTimers.duration(t.active)} while standing in it.`;}

   else if(w===0&&i===10)text=`${spaces} coin stack locations; ${spaces*stack} total coin capacity.`;

   else if(w===0&&i===11)text=`${stack} coins per stack; ${spaces*stack} total coin capacity.`;

   else if(w===0&&i===12)text=`Fountain bars fill ${fmt(1+Math.min(4,4*b)+b/100)}× faster while standing in the Fountain.`;

   else if(w===1&&i===8)text=`1 in ${fmt(300/(1+b/100))} chance for a currency stack to become royal when the fountain fills.`;

   else if(w===1&&i===9)text=`Royal stacks are worth ${fmt(5+b/100)}× their normal currency value.`;

   else if(w===1&&i===10)text=`Unlocks the Marble fill bar; +${fmt(b)}% base Marble per fill before external bonuses.`;

   else if(i===19)text=`+${fmt(b)}% ${['coin','bill','stack'][w]} value per power of 10 of ${['Mythril','Sharp Notes','Cavern sediment'][w]} owned.`;

   else if(w===2&&i===8)text=`Collected currency can become Lucky, permanently increasing that currency’s value. Each additional Lucky upgrade is four times rarer.`;

   else if(w===2&&i===11)text=`Each Rubber Ducky multiplies coin value by ${fmt(1+b/100)}×; ${Number(options[601])||0} saved Rubber Duckies.`;

   else if(w===2&&i===12)text=`Each Rubber Ducky bar fill has a 1 in ${fmt(3/((1+(b+f(2,10))/100)*Math.pow(.2,Number(options[601])||0)))} chance to grant a Rubber Ducky.`;

   row.effect=text;

  }

  if(row.source==='Clamworks'&&row.name==='Promotion 9')row.effect=fmt(1+Math.max(0,5*((d.get('clamworks')?.promoLevel||0)-8))/100)+'× Class EXP multiplier.';
  if(row.source==='Sailing Artifacts'&&row.name==='Deathskull'){const artifact=root.World5?.decodeSailing(data,root.WORLD5_CATALOG)?.artifacts.find(a=>a.name==='Deathskull'),tier=artifact?.tier||0,entry=root.WORLD5_CATALOG.ArtifactInfo.find(a=>a[0]==='Deathskull');row.effect=tier<2?'+1 Gallery slot when owned.':'+2 Gallery slots.';for(let t=3;t<=Math.min(tier,6);t++)row.effect+=' '+String(entry?.[2*t+1]||'').replaceAll('_',' ');}
  if(row.source==='The Hole · Engineer'&&row.name==='Variety Effect')row.effect=row.effect.split(/I see|I_see/)[0].replace(/\.\.\.$/,'.');
  if(row.source==='The Hole · Engineer'&&row.name==='Hiring the Hounds from Beyond')row.effect=row.effect.split('尬')[0]+(row.effect.includes('Total Bonus:')?' Total Bonus:'+row.effect.split('Total Bonus:')[1]:'');
  if(row.source==='The Hole · Bonuses'&&row.name==='Equal Spread'&&hole?.majiks&&hole?.villagers?.length){const x=Object.values(hole.majiks).flat().find(x=>String(x.data.name).replaceAll('_',' ')===row.name),amount=x?.getBonus?.();if(Number.isFinite(amount))row.effect=`+${fmt(amount)}% villager EXP per five opals invested in the villager with the fewest opals. Total: +${fmt(amount*Math.floor(Math.min(...hole.villagers.map(v=>v.opals))/5))}%.`;}
  if(row.source==='The Hole · Gambit'&&/Summoning Doublers/.test(row.name))row.effect='Use the star button on a Summoning upgrade to double it. More Gambit Points unlock more doublers; reset their assignments at the Lamp.';
  if(row.source==='Royal Armory'){
   const model=royalModel,u=model.upgrades.find(x=>x.name===row.name),b=u?.bonus;
   if(u&&Number.isFinite(b)){
    const ranks={20:'Trading',22:'Intel',24:'Command',25:'Military',26:'Purity'};
    if(ranks[u.id])row.effect=`+${fmt(b)}% to ${ranks[u.id]} unit base EXP rate (${fmt(1+b/100)} EXP/hr before Orblet, outpost and other bonuses).`;
    else if(u.id===23)row.effect=`+${fmt(b)}% Militia base clearing rate: ${fmt(4000*(1+b/100))} monsters/hr before character and account clearing multipliers.`;
    else if(u.id>=60&&u.id<=67)row.effect=`Recruits a Militia unit in World ${u.id-59}. Its clearing rate uses your Militia bonuses and character setup.`;
    else if(u.id===17)row.effect='Militia also grants EXP to its outpost’s highest rank; EXP/hr depends on that outpost’s rank and EXP bonuses.';
    else if(u.id===18)row.effect=`+${fmt(b)}% collection rate per Resource Grade. Saved total: +${fmt(b*model.resources.reduce((sum,x)=>sum+(x.grade||0),0))}%.`;
    else if(u.id===50)row.effect=`+${fmt(b)}% collection rate per Outpost Level. Saved total: +${fmt(b*model.outposts.reduce((sum,x)=>sum+(x.barracks||0)+(x.logistics||0)+(x.education||0),0))}%.`;
    else if(u.id===51||u.id===52)row.effect=u.description.split(/Total Bonus:/)[0].trim();
    else if(u.id===41)row.effect=`Unlocks Royal Marble drops from mobs on outpost maps; +${fmt(b)}% to the Marble drop bonus. Final odds depend on the map and character’s other bonuses.`;
    else if(u.id===68)row.effect='Recruits one movable unit per purchase; the next unit depends on the current recruitment sequence.';
    else if(u.id===79)row.effect='Boosts the stat selected in Compounding Outposting, scaling with the number of built outposts.';
   }
  }
  if(row.source==='Compass'){

   const x=compass?.upgrades.find(x=>String(x.data.name).replaceAll('_',' ')===row.name);if(!x)continue;let text=String(x.data.description).replaceAll('{',fmt(x.bonus)).replaceAll('}',fmt(1+x.bonus/100));

   if(['Stardust Hoarding','Moondust Hoarding','Solardust Hoarding'].includes(row.name)){const idx=['Stardust Hoarding','Moondust Hoarding','Solardust Hoarding'].indexOf(row.name);text=text.replaceAll('$',fmt(x.bonus*compass.getLogValue(compass.availableDust[idx])));}

   if(row.name==='Mastery Destruction')text=text.replaceAll('$',fmt(Math.pow(1+x.bonus/100,compass.completedMasteries))+'×');

   if(row.name==='Elemental Vision')text='Reveals elemental weaknesses for abominations and mobs in AFK Info. Your current element depends on the equipped weapon.';
   const drops={'Weapon Drop':'Tempest Weapons from eligible mobs','Stone Drop':'Tempest Upgrade Stones from mobs','Medallion Collection':'monster Medallions while in Tempest Form','Ring Drop':'Tempest Rings from eligible mobs'};
   if(drops[row.name])text='Unlocks '+drops[row.name]+'. Final drop odds depend on the eligible item and current setup.';
   if(row.name==='The Luck Factor')text=text.split('@')[0];
   if(row.name==='Tempest Damage IV')text=text.split('@')[0]+' Tempest equipment Weapon Power also contributes to Tempest damage.';
   if(row.name==='Knockoff Compass')text=`Adds ${fmt(x.bonus)}% to the shared Compass cost divisor. Costs are divided by ${fmt(1+(compass.getUpgradeBonus(36)+compass.getUpgradeBonus(77))/100)} with both cost bonuses.`;
   row.effect=text;

  }

  if(row.source==='Rift Rewards'){const bonus=d.get('rift')?.bonuses.find(b=>b.name===row.name);if(bonus){row.effect=bonus.description.replace("Lava didn't bother with a description for this one. ",'');row.detail='Unlocks at Rift '+(bonus.unlockAt-1);}else if(row.name==='Cooking Mastery')row.effect='Unlocks Cooking Mastery and its mastery rewards.';else if(row.name==='Rift Guy')row.effect='Unlocks Rift Guy.';}

 }

 return rows;

}

function merge(sources,entries){

 const norm=s=>String(s||'').toLowerCase().replace(/[_’']/g,' ').replace(/[^a-z0-9]+/g,' ').trim();

 const typeOf=s=>/bubble/i.test(s)?'Bubble':/stamp/i.test(s)?'Stamp':/cooking.*meal|^cooking$/i.test(s)?'Meal':s||'Other';

 const similarity=(a,b)=>{const words=t=>new Set(norm(t).split(' ').filter(w=>w.length>2&&!/^\d+$/.test(w))),x=words(a),y=words(b);return [...x].filter(w=>y.has(w)).length/Math.max(1,new Set([...x,...y]).size);};

 const describe=row=>[wording(row.effect),wording(row.detail),wording(row.note),row.status==='missing'?'Missing / locked':row.status==='owned'?'Owned / inactive':row.status==='unknown'?'Saved state unknown':''].filter(Boolean).join(' · ');

 for(const row of entries){if(!row.name)continue;const type=typeOf(row.source),key=type+'|'+norm(row.name)+(row.mapIdentity?'|'+norm(row.mapIdentity):''),text=[row.effect,row.benefitText].filter(Boolean).join(' '),targets=classify(row),existing=sources.filter(s=>s.type===type&&norm(s.name)===norm(row.name)&&(!s.mapIdentity||s.mapIdentity===row.mapIdentity)).sort((a,b)=>similarity(b.description,text)-similarity(a.description,text))[0];

  if(existing){existing.targets=[...new Set([...existing.targets.filter(t=>!t.startsWith('system:')),...targets,...effectTargets(text)])];existing.description=describe(row);existing.conditions=[wording(row.detail),wording(row.note),row.status==='missing'?'Missing / locked':row.status==='owned'?'Owned / inactive':''].filter(Boolean).join(' · ');existing.mapWorld=row.mapWorld;existing.mapIdentity=row.mapIdentity;existing.status=row.status;existing.value=row.value==null?existing.value:String(row.value);existing.label=row.level||existing.label;continue;}

  const pages=[['sailing','sailing'],['artifact','sailing'],['cooking','cooking'],['meal','cooking'],['alchemy','alchemy'],['vial','alchemy'],['sigil','alchemy'],['stamp','stamps'],['lab','lab'],['construction','construction'],['refinery','construction'],['gaming','gaming'],['farming','farming'],['sneak','sneaking'],['summon','summoning'],['breeding','breeding'],['shiny','breeding'],['divinity','divinity'],['research','research'],['spelunk','spelunking'],['coral','coralReef'],['card','cards'],['star sign','starSigns'],['guild','guilds'],['post office','postOffice'],['arcade','arcade'],['companion','pets'],['achievement','tasks'],['gallery','nametags'],['hat rack','hatRack'],['armor','armorSets'],['hole','hole']];

  const page=row.page||pages.find(([label])=>type.toLowerCase().includes(label))?.[1];

  const specific=effectTargets(text),icon=root.UpgradeIcons.source({icon:row.icon,page});

  const source={id:'game-'+encodeURIComponent(key),name:row.name,type,icon,targets:[...new Set([...specific,...targets])],description:describe(row),conditions:[wording(row.detail),wording(row.note),row.status==='missing'?'Missing / locked':row.status==='owned'?'Owned / inactive':''].filter(Boolean).join(' · '),mapWorld:row.mapWorld,mapIdentity:row.mapIdentity,status:row.status,label:row.level||'View bonus',value:row.value==null?'':String(row.value)};

  sources.push(source);

 }

 return sources;

}

function relevantSkill(source,skill){if(skill==='all'||!source.targets.includes('efficiency'))return true;const text=source.description;const specialized=/mining|chopping|fishing|catching|trapping|worship|cooking|laboratory|spelunk/i;return !specialized.test(text)||new RegExp(skill,'i').test(text);}



async function hydrate(raw,update){

 if(!raw||!Object.keys(raw).length)return;

 await Promise.allSettled([

 root.Cooking.calculate(typeof raw.data==='string'?JSON.parse(raw.data):raw.data||raw,raw).then(report=>{const scenario=report.scenarios?.find(s=>s.id==='current')||report.scenarios?.[0];update((scenario?.mealBonuses||[]).map(m=>{const key=root.WORLD4_CATALOG.MealINFO.findIndex(r=>r[0]===m.name);return {id:'meal-'+key,value:Number.isFinite(m.bonus)?m.bonus.toLocaleString(undefined,{maximumFractionDigits:2})+(/%/.test(root.WORLD4_CATALOG.MealINFO[key]?.[3]||'')?'%':''):'Unknown'};}));}),

 root.BubbleOptimizer.prepare(raw).then(context=>{const entries=root.BubbleBonuses.model(raw,root.ALCHEMY_CATALOG,context).entries;update(entries.map(e=>({id:'bubble-'+e.id,value:e.value,description:e.summary.effect})));}),

 root.StampCalculator.load(raw).then(data=>{const entries=root.StampBonuses.model(data,0).entries;update(entries.map(e=>({id:'stamp-'+e.id,value:e.value,description:e.effectText})));})

 ]);

}


// Organize by the system's home world, not by the world affected by its bonus.
function organization(source){
 const type=source.type||source.stage||'Account bonuses';
 const worlds=[
  /^(Stamp|Statues|Bribes|Anvil|Forge|Star Signs|Constellations|Dungeon)/i,
  /^(Bubble|Alchemy|Vials|Sigils|Obols|Post Office|Arcade|Killroy|Island Expeditions|Weekly Votes)/i,
  /^(Construction|Death Note|Atom Collider|Salt Lick|Shrines|Prayers|Worship|Equinox|Armor Sets)/i,
  /^(Meal|Cooking|Lab |Shiny Pets|Pet Arena|Rift|Slab)/i,
  /^(Sailing|Gaming|Divinity|The Hole|Upgrade Vault)/i,
  /^(Farming|Sneaking|Jade Emporium|Pristine Charms|Summoning|Emperor)/i,
  /^(Research|Spelunking|Minehead|Clamworks|Meritocracy|Big Fish|Coral|Dancing Coral|Hoops|Darts|Zenith|Sushi|Button|Legend Talents|Orblet)/i
 ];
 const index=worlds.findIndex(pattern=>pattern.test(type));
 const world=index>=0?'World '+(index+1):/^(Compass|Grimoire|Tesseract|Royal Armory|Royal Statues)/.test(type)?'Masterclasses':/^(Orion|Poppy|Bubba)$/.test(type)?'Clickers':source.mapWorld||'Account';
 const tier=type==='Bubble'?({O:'Orange',G:'Green',P:'Purple',Y:'Yellow'}[String(source.key||'')[0]]||''):type==='Stamp'?({A:'Combat',B:'Skills',C:'Miscellaneous'}[String(source.key||'').replace('Stamp','')[0]]||''):'';
 return {world,rank:/^World [1-7]$/.test(world)?Number(world.slice(-1)):world==='Masterclasses'?8:world==='Clickers'?9:10,system:({Bubble:'Alchemy Bubbles',Stamp:'Stamps',Meal:'Meals'})[type]||type,tier,tierRank:({Orange:0,Green:1,Purple:2,Yellow:3,Combat:0,Skills:1,Miscellaneous:2})[tier]||0};
}
function organized(sources){
 return sources.map(source=>({source,...organization(source)})).sort((a,b)=>a.rank-b.rank||a.system.localeCompare(b.system,undefined,{numeric:true})||a.tierRank-b.tierRank||String(a.source.key??a.source.name).localeCompare(String(b.source.key??b.source.name),undefined,{numeric:true}));
}


function areaWorld(area){
 const id=area.id.split(':').slice(1).join(':');
 if(area.id.startsWith('system:'))return organization({type:decodeURIComponent(id)}).world;
 const groups=[
 ['mining','chopping','smithing','statues','stamp-cost','star-signs','dungeons','forge-speed','anvil-speed'],
 ['fishing','catching','alchemy','post-office','brew-speed','liquid','sigil-speed'],
 ['trapping','worship','construction','equinox','shrines','library','build-speed','printing','refinery-speed','multikill'],
 ['cooking','breeding','lab','cooking-speed','egg-speed','pet-power','shiny-speed','lab-range'],
 ['sailing','gaming','divinity','hole','artifact-find','sailing-speed','divinity-gain','gaming-bits','gaming-speed','hole-production','villagers'],
 ['farming','sneaking','summoning','crop-speed','crop-evolution','overgrowth','jade','stealth','summoning-essence','summoning-power'],
 ['minehead','amber','clamworks','sushi','legend','meritocracy','hoops','darts','zenith','research','spelunking','coral']
 ];
 const world=groups.findIndex(ids=>ids.includes(id));
 return world>=0?'World '+(world+1):['royal','grimoire','compass','tesseract'].includes(id)?'Masterclasses':'Account';
}

root.StatMapSources={areaWorld,organization,organized,catalog,hydrate,relevantSkill,merge,areas,matchesEffect,classify,effectTargets,wording,resolveDetails};

})(window);
