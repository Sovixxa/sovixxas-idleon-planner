(function(root){'use strict';
const configs={grimoire:{title:'Grimoire',className:'Death Bringer',save:'Grimoire',art:'Grimoire',prefix:'Bone',currencies:['Femur','Ribcage','Cranium','Bovinae']},compass:{title:'Compass',className:'Wind Walker',save:'Compass',art:'Compass',prefix:'Dust',currencies:['Stardust','Moondust','Solardust','Cooldust','Novadust']},tesseract:{title:'Tesseract',className:'Arcane Cultist',save:'Arcane',art:'Tesseract',prefix:'Tach',currencies:['Purple','Brown','Green','Red','Silver','Gold']},royalArmory:{title:'Royal Armory',className:'Royal Guardian',save:'RoyalG',art:'RoyalArmory',prefix:'RGres',currencies:[]}};
const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v;}catch{return null;}};
const valid=v=>v!=null&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=0;
function snapshot(key,raw,systems){const cfg=configs[key],data=parse(raw?.data)||raw||{};
 if(!Array.isArray(parse(data[cfg.save])))return {available:false,upgrades:[],balances:{}};
 if(key==='royalArmory'){const m=root.RoyalArmory.model(raw),r=parse(data.RoyalG),stored=parse(r[1])||[];return {available:true,balances:Object.fromEntries(stored.map((v,i)=>[i,valid(v)?Number(v):null])),upgrades:m.upgrades.filter(x=>x.slot>=0).sort((a,b)=>a.slot-b.slot).map(x=>{const c=root.ROYAL_ARMORY_CATALOG.upgrades.find(c=>c.index===x.id);return {...x,effect:x.description,currency:root.ROYAL_ARMORY_CATALOG.upgrades.find(row=>row.index===x.slot)?.costResourceIndex,costModel:{kind:'royal',base:c.baseCost,growth:c.costScaling},cost:x.level==null?null:x.id===46&&x.level<3?2:x.id===58&&x.level<1?3:25*Math.pow(1.24,x.slot)*(3+5*x.slot)*c.baseCost*Math.pow(c.costScaling,x.level),icon:`assets/RAupg${x.id}.png`,group:`Shelf ${Math.floor(x.slot/10)+1}`};})};}
 const s=systems.get(key),balances=s?.resources||s?.availableDust||{};
 return {available:true,balances,upgrades:(s?.upgrades||[]).map(x=>({id:x.id,name:x.data.name,level:x.level,max:x.data.maxLevel??x.data.max_level,unlocked:x.unlocked,cost:x.cost,currency:x.data.dustType??x.data.x1,costModel:{kind:key==='compass'?'exponential':'scaled',base:x.data.base_cost,growth:key==='compass'?x.data.costMult:x.data.scaling_factor+.01},effect:x.getDescription(s.upgrades),icon:`assets/${x.getImageData().location}.png`,group:x.data.upgradeType||cfg.title}))};
}
// Goals identify relevant descriptions, not simulated total stat gains.
const goals=[
 {id:'all',label:'All upgrades'},
 {id:'damage',label:'Damage & critical hits',pattern:/damage|critical|crit\b/i},
 {id:'accuracy',label:'Accuracy',pattern:/accuracy/i},
 {id:'defence',label:'Defence & survivability',pattern:/defen[cs]e|health|\bhp\b|surviv/i},
 {id:'speed',label:'Attack speed',pattern:/attack speed|attack rate/i},
 {id:'resources',label:'Masterclass resource gains',pattern:/bone|dust|tachyon|resource|collection|drop/i},
 {id:'drops',label:'Drop rate & drop chance',pattern:/drop rate|drop chance|chance.*drop|extra.*drop/i},
 {id:'experience',label:'Experience gains',pattern:/\bexp\b|experience|\bxp\b/i},
 {id:'talents',label:'Talent points & levels',pattern:/talent/i},
 {id:'collection',label:'Resource collection & replenishment',pattern:/collection|replenish|refill/i},
 {id:'trading',label:'Trading rank & Trader units',pattern:/trad(er|ers|e|ing)/i},
 {id:'outposts',label:'Outpost points & ranks',pattern:/outpost|\bpts\b/i},
 {id:'statues',label:'Statues & enchantments',pattern:/statue|enchantment|parchment/i},
 {id:'costs',label:'Cheaper upgrades',pattern:/cheaper|cost.*reduc|reduc.*cost|discount/i},
 {id:'account',label:'Account-wide bonuses',pattern:/account|all characters|all players/i}
];
const matchesGoal=(x,id)=>id==='all'||!!goals.find(g=>g.id===id)?.pattern?.test(x.name+' '+x.effect);
const availableGoals=model=>goals.filter(g=>g.id==='all'||model.upgrades.some(x=>matchesGoal(x,g.id)));
// Cheapest first within each currency; each upgrade contributes one next level.
function optimize(model,{percent=100,goal='all',mode='now',count=0}={}){
 if(Number(count)>0)return repeatPlan(model,{percent,goal,mode,count});
 const future=mode==='future',fraction=Math.max(0,Math.min(100,Number(percent)||0))/100;
 const remaining=Object.fromEntries(Object.entries(model.balances).filter(([,v])=>valid(v)).map(([k,v])=>[k,Number(v)*fraction]));
 const candidates=model.upgrades.filter(x=>valid(x.level)&&x.level<x.max&&matchesGoal(x,goal));
 const locked=candidates.filter(x=>x.unlocked!==true);
 const eligible=candidates.filter(x=>x.unlocked===true&&(future||valid(x.cost)&&valid(remaining[x.currency]))).sort((a,b)=>a.currency-b.currency||(valid(a.cost)?a.cost:Infinity)-(valid(b.cost)?b.cost:Infinity)||a.id-b.id),steps=[];
 for(const x of eligible){const knownCost=valid(x.cost),knownBalance=valid(model.balances[x.currency]),before=remaining[x.currency];
  if(!future&&(!knownCost||!knownBalance||x.cost>before))continue;
  const shortfall=knownCost&&knownBalance?Math.max(0,x.cost-before):null;
  if(knownCost&&knownBalance)remaining[x.currency]-=x.cost;
  steps.push({...x,shortfall,affordable:shortfall===0});
 }
 return {steps,remaining,locked:future?locked:[],needed:Object.fromEntries(Object.entries(remaining).map(([k,v])=>[k,Math.max(0,-v)]))};
}
// Project level-dependent cost growth with account discounts held fixed.
function costAt(x,level){
 if(level===x.level)return x.cost;
 const c=x.costModel;if(!c||!valid(x.cost))return null;
 if(c.kind==='royal')return x.id===46&&level<3?2:x.id===58&&level<1?3:25*Math.pow(1.24,x.slot)*(3+5*x.slot)*c.base*Math.pow(c.growth,level);
 if(c.kind==='exponential')return x.cost*Math.pow(c.growth,level-x.level);
 if(c.kind==='scaled'){const raw=l=>l+(c.base+l)*Math.pow(c.growth,l);return x.cost*raw(level)/raw(x.level);}
 return null;
}
function repeatPlan(model,{percent,goal,mode,count}){
 const limit=Math.max(1,Math.min(1000,Math.floor(Number(count)||1))),future=mode==='future',fraction=Math.max(0,Math.min(100,Number(percent)||0))/100;
 const remaining=Object.fromEntries(Object.entries(model.balances).filter(([,v])=>valid(v)).map(([k,v])=>[k,Number(v)*fraction]));
 const candidates=model.upgrades.filter(x=>valid(x.level)&&x.level<x.max&&matchesGoal(x,goal)),locked=candidates.filter(x=>x.unlocked!==true),pool=candidates.filter(x=>x.unlocked===true).map(x=>({source:x,level:x.level}));
 const currencies=[...new Set(pool.map(x=>x.source.currency))].sort((a,b)=>a-b),steps=[];
 while(steps.length<limit){let added=false;
  for(const currency of currencies){const choices=pool.filter(x=>x.source.currency===currency&&x.level<x.source.max).map(x=>({x,cost:costAt(x.source,x.level)})).filter(v=>valid(v.cost)&&(future||remaining[currency]!=null&&v.cost<=remaining[currency])).sort((a,b)=>a.cost-b.cost||a.x.source.id-b.x.source.id);
   if(!choices.length)continue;
   const {x,cost}=choices[0],known=remaining[currency]!=null,shortfall=known?Math.max(0,cost-remaining[currency]):null;
   if(known)remaining[currency]-=cost;
   steps.push({...x.source,level:x.level,cost,shortfall,affordable:shortfall===0,position:steps.length+1});x.level++;added=true;
   if(steps.length>=limit)break;
  }
  if(!added)break;
 }
 return {steps,remaining,locked:future?locked:[],requested:limit,needed:Object.fromEntries(Object.entries(remaining).map(([k,v])=>[k,Math.max(0,-v)]))};
}
function collapseSteps(steps){const groups=new Map();for(const [i,x] of steps.entries()){const key=x.currency+':'+x.id;let row=groups.get(key);if(!row){row={...x,count:0,cost:0,endLevel:x.level,firstPosition:i+1};groups.set(key,row);}row.count++;row.cost+=x.cost;row.endLevel=x.level+1;row.shortfall=x.shortfall;row.affordable=row.affordable&&x.affordable;}return [...groups.values()];}
// Match the benefit's target, not the source, scaling input, or Prisma metadata.
const bonusPatterns={grimoire:/\bwraith\b|(?:extra|gain|drop|more|increase)[^.;]*\bbones?\b|\bbones?\s*(?:gain|drop)|bonuses from most Grimoire upgrades/i,compass:/\btempest\b|(?:extra|gain|drop|more|increase)[^.;]*\b(?:dust|stardust|moondust|solardust|cooldust|novadust)\b|\b(?:dust|stardust|moondust|solardust|cooldust|novadust)\s*(?:gain|drop)|bonuses from most Compass upgrades/i,tesseract:/\barcanist\b|arcane (?:damage|mob|crystal)|(?:extra|gain|drop|more|increase)[^.;]*\btachyons?\b|\btachyons?\s*(?:gain|drop)|bonuses from most Tesseract upgrades|prisma bubble drop chance/i,royalArmory:/\boutposts?\b|\borblet|\bverminous\b|parchment|castle damage/i};
function affectsForm(key,row){
 if(row.mcKeys)return row.mcKeys.includes(key);
 if(row.mcKey)return row.mcKey===key;
 if(row.floorKind||/^slab/i.test(row.systemId||'')||row.systemId==='holeAllBonuses')return false;
 if(key==='royalArmory'&&/masterclass.*drops|all masterclasses.*(?:bones|dust|tachyon)|W6 Masterclasses/i.test(row.effect||''))return false;
 if(key==='compass'&&['Elemental','Fighter','Survival'].includes(row.group))return true;
 const effect=String(row.effect||'').split(/\s+per\s+|\s+for every\s+|[·]|\bPrisma multiplier\b/i)[0];
 // Use catalog effect text, never a positional presentation label.
 if(row.source==='Alchemy Bubbles'){
  const names={grimoire:'BONE BUBBLE',compass:'DUST BUBBLE',tesseract:'TACHYON BUBBLE',royalArmory:'ROYAL RICHES'};
  // Bone Bubble's joke tooltip mentions the other classes and resources.
  // Explicit catalog identities avoid both misleading prose and shifted labels.
  return String(row.name||'').replaceAll('_',' ').toUpperCase()===names[key];
 }
 const target=effect;
 return bonusPatterns[key].test(target)||key!=='royalArmory'&&/all master\s*class drops|master\s*class.*drop/i.test(target);
}
function bonusRows(key,groups,bubbles=[],upgrades=[]){
 const names={gamingPalette:'Gaming Palette',emperorBonuses:'Emperor',arcade:'Arcade'};
 const rows=Object.entries(groups).filter(([id])=>id!==key).flatMap(([id,entries])=>(Array.isArray(entries)?entries:[]).map(r=>({...r,systemId:id,source:r.source||names[id]||id.replace(/([a-z])([A-Z])/g,'$1 $2')}))).concat(bubbles);
 const matches=rows.filter(r=>affectsForm(key,r));
 return matches.map(r=>({...r,status:r.status==='maxed'?'active':r.status,category:/bubble/i.test(r.source)?'bubbles':/gaming/i.test(r.source)?'gaming':'other'})).concat(upgrades.filter(r=>affectsForm(key,r)).map(r=>({...r,classKey:key,savedLevel:r.level,source:configs[key].title,category:'class',level:r.level==null?'Level unknown':`Lv ${r.level}`,status:r.level==null?'unknown':r.unlocked&&r.level>0?'active':'missing'})));
}
// These categories describe the displayed contribution, not its final formula pool.
// In particular, a +% source can feed a pool that later multiplies another stat.
function bonusType(row){
 if(row.calculationType)return row.calculationType;
 const text=String(row.effect||'').trim();
 const multi=/(?:\d[\d,.]*(?:e[+-]?\d+)?\s*[x×](?=\s|$)|[x×]\s*\d|\btrue multiplier\b)/i.test(text);
 const additive=/(?:^|\s)\+\s*\d/.test(text);
 if(/\b(?:unlock|instead of|chance|replac)\b|\bper\b|\bPOW\b/i.test(text)||multi&&additive)return 'other';
 if(multi)return 'multi';
 if(additive)return 'additive';
 return 'other';
}
const capFormat=v=>Number(v).toLocaleString(undefined,{maximumFractionDigits:3});
function bonusCaps(row){
 if(row.caps)return row.caps;
 const level=row.savedLevel??(typeof row.level==='number'?row.level:Number(String(row.level).match(/^Lv ([\d,]+)/)?.[1]?.replaceAll(',','')));
 const max=row.max??Number(String(row.level).match(/\/ ([\d,]+)/)?.[1]?.replaceAll(',',''));
 const c={maximum:'Not established by the current decoder',hard:'Not verified',soft:'Not verified',target:'No reliable numeric target available for this source.'};
 if(Number.isFinite(max)&&max>0){
  c.maximum='Level '+capFormat(max)+(max>=999999?' (catalog limit; not a practical target)':'');
  c.hard='Level limit '+capFormat(max)+'; this is not a combined-stat cap.';
  c.soft='No separate soft cap verified.';
  c.target=Number.isFinite(level)?level>=max?'Level limit reached.':max===1?'Unlock this upgrade.':max>=999999?'Compare the next affordable level with other upgrades; do not target the catalog limit.':capFormat(max-level)+' levels remain to the level limit. Affordability determines how far to push.':'Import the saved level to show remaining levels.';
  if(row.category==='class'&&Number.isFinite(row.cost)&&level<max)c.next='Next level costs '+capFormat(row.cost)+' of its upgrade currency (estimate).';
 }
 const id=row.systemId||'';
 if(id==='vials')return {...c,maximum:'Vial level 13',hard:'Level 13; the effect can still grow through account multipliers.',soft:'No separate soft cap.',target:level>=13?'Vial maxed. Improve vial multipliers for further effect gain.':Number.isFinite(level)?capFormat(13-level)+' vial levels remaining.':'Import the vial level.'};
 if(id==='killroy'&&row.name==='Masterclass Drops'){
  const checkpoint=Number.isFinite(level)?[200,800,1800,3800].find(v=>v>level):200;
  return {maximum:'2.3× theoretical ceiling (never reached at a finite level)',hard:'No effect hard cap in the decoded formula.',soft:'Diminishing returns from the first level: 1 + 1.3 × L / (L + 200). Lv 200 / 800 / 1,800 / 3,800 give 50% / 80% / 90% / 95% of the scaling bonus.',target:checkpoint?'Next checkpoint: Lv '+capFormat(checkpoint)+'. Compare skull cost with other Killroy upgrades; this is not a mandatory target.':'Above 95% of the scaling bonus; prioritize cost versus the tiny next gain.',next:Number.isFinite(level)?'Next level: '+capFormat(1+1.3*(level+1)/(level+201))+'×; gain +'+Number(1.3*200/((level+200)*(level+201))).toLocaleString(undefined,{maximumSignificantDigits:4})+'×.':undefined};
 }
 if(id==='emperorBonuses')return {maximum:'No finite ceiling in the decoded formula',hard:'No bonus-level hard cap in the decoded formula.',soft:'Linear per awarded level, with rounding; boss difficulty and attempts limit progress.',target:'Work toward the next kill that awards this bonus.',next:row.killProjections?.find(x=>x.improved)?'In '+row.killProjections.find(x=>x.improved).kill+' total kills: '+row.killProjections.find(x=>x.improved).effect:row.projection};
 if(id==='meritocracy')return {maximum:'Account-scaled weekly effect',hard:'Not a levelable upgrade; no fixed account-wide maximum established.',soft:'Not applicable to the weekly selection.',target:row.status==='active'?'This weekly bonus is selected. Improve Meritocracy multipliers for a larger effect.':'Not selected this week. The shown effect is potential, not currently active.'};
 if(/Lab Jewels/i.test(row.source))return {maximum:'Fixed jewel reward × account amplifiers',hard:'One jewel unlock; its amplified effect has no fixed maximum established here.',soft:'No jewel levels or soft-cap target.',target:row.status==='active'?'Jewel active. Improve applicable jewel/mainframe amplification.':'Unlock and connect the jewel; check its connection conditions.'};
 if(id==='sushi'&&row.group==='Sushi collection')return {maximum:'One first-discovery reward',hard:'Discovery is a one-time unlock.',soft:'No level-based soft cap for this discovery reward.',target:row.status==='missing'?'Discover this sushi.':'Discovery reward obtained; repeating the discovery does not add another copy.'};
 if(Number.isFinite(row.fishCeiling))return {maximum:capFormat(row.fishCeiling)+'% theoretical ceiling',hard:'Not reached at a finite advice level.',soft:'L / (L + 100): Lv 100 / 400 / 900 / 1,900 give 50% / 80% / 90% / 95%.',target:'Use the next advice level you can afford; compare the marginal effect with other advice.',next:row.detail};
 if(/^Talents/.test(row.source))return {...c,maximum:'Depends on book maximum and added talent levels',hard:'Saved preset level is not a verified talent cap.',target:'Compare talent points and book upgrades. Per-resource effects still require their stated resource scaling.'};
 if(row.classKey==='royalArmory'&&row.id===40){c.hard='Recycling effect capped at 75%; level limit '+capFormat(max)+'.';c.target='Stop buying for recycling once its displayed effect reaches 75%.';}
 if(row.classKey==='royalArmory'&&row.id===37){c.hard='Combined parchment chance is capped at 100%; includes other sources.';c.target='Unlock first; check the combined chance in Verminous before investing in further drop bonuses.';}
 return c;
}
function enrichBonusCaps(groups,systems){
 const gaming=systems.get('gaming');
 for(const row of groups.gamingPalette||[]){const color=gaming?.paletteColors?.find(x=>x.data.name===row.name);if(!color)continue;
  const linear=color.data.usesDecay!==1,level=color.level,bonus=gaming.getPaletteBonus(color.index),gain=level>0?bonus/level:null;
  row.caps=linear?{maximum:'No finite ceiling in the decoded formula',hard:'No level hard cap in the palette formula.',soft:'Linear bonus per level; upgrade costs increase.',target:'Buy affordable levels; there is no special stopping level.',next:gain==null?'Per-level gain needs a nonzero saved level.':'Next level adds '+capFormat(gain)+' percentage points with current account boosts.'}:{maximum:level>0?capFormat(bonus*(level+25)/level)+'% theoretical ceiling':'Account-scaled theoretical ceiling',hard:'Not reached at a finite level.',soft:'L / (L + 25): Lv 25 / 100 / 225 / 475 give 50% / 80% / 90% / 95%.',target:'Compare the next checkpoint with palette costs; checkpoints are not hard caps.'};
 }
 for(const row of groups.button||[]){const x=systems.get('button')?.bonuses?.find(x=>x.data.name===row.name);if(!x)continue;row.caps={maximum:'No finite ceiling in the decoded formula',hard:'No accumulated-bonus cap in the formula.',soft:'Linear gain per press awarded to this category; requirements get harder.',target:'Complete the next affordable Button requirement. Categories rotate every five presses.',next:'Each press in this category adds '+capFormat(x.data.bonusPerPress*x.bonusMultiplier/100)+'× to this multiplier with current boosts.'};}
 return groups;
}
const bonusTypes={multi:'Multipliers (×)',additive:'Additive bonuses (+)',other:'Conditional / other'};
const api={configs,snapshot,optimize,availableGoals,costAt,collapseSteps,bonusRows,bonusType,bonusTypes,bonusCaps,enrichBonusCaps};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MasterclassModel=api;
})(typeof self!=='undefined'?self:globalThis);
