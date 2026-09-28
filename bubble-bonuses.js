(function(root){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>Number(v).toLocaleString(undefined,{maximumFractionDigits:2});
const GROUPS=[
 ['combat','Damage & combat','Damage, accuracy, critical hits and survivability.'],
 ['stats','Stats & talent points','Base stats and the bonuses that scale them.'],
 ['skills','Skilling','Efficiency, power, AFK gains and resource collection.'],
 ['production','Production','Anvil, construction, printing, cooking and breeding.'],
 ['progress','EXP, drops & money','Experience, loot, cash and account progression.'],
 ['alchemy','Alchemy & bubble boosts','Brewing, discounts, extra levels and bubble multipliers.'],
 ['worlds','World & class systems','Sailing, gaming, farming, sneaking, spelunking and class currencies.']
];
const CATEGORIES={
 combat:'O5 O8 O9 O10 O19 O20 O24 O25 O31 G3 G5 G8 G9 G10 G20 G24 G25 G31 P5 P9 P10 P18 P20 P24 P25 P31',
 stats:'O0 O13 O23 O27 G0 G13 G23 G28 P0 P13 P23 P28 Y0',
 skills:'O2 O3 O6 O7 O17 O21 O26 G6 G7 G11 G12 G17 G21 G27 P2 P3 P6 P11 P12 P17 P21 P26 Y4',
 production:'O12 G2 G4 Y10 Y11 Y16 Y17',
 progress:'O4 O11 O15 O18 G15 G18 G19 P4 P15 P19 P22 Y1 Y2 Y3 Y5 Y8 Y12 Y13 Y15 Y18 Y19 Y32',
 alchemy:'O1 O14 O16 G1 G14 G16 P1 P7 P8 P14 P16 Y6 Y7 Y9 Y14 Y31',
 worlds:'O22 O28 O29 O30 O32 O33 G22 G26 G29 G30 G32 P27 P29 P30 P32 Y20 Y21 Y22 Y23 Y24 Y25 Y26 Y27 Y28 Y29 Y30'
};
const LABELS={
 O:['STR','Orange passive bubble multiplier|Warriors only','Mining efficiency|Per power of 10 max HP','Multi-ore chance','Mining & fishing EXP|Doubled for the lower-level skill','Base damage from HP|Depends on HP above 250','Multi-fish chance','Pickaxe & fishing rod power','Equipment defence|Also adds base defence per class level','Critical damage','Total damage','Construction EXP','Build speed|Per Construction level','Warrior talent points|Per tab, excluding Master Class','Orange bubble cost reduction','Monster cash|Per 250 STR','Selected orange bubble multiplier|Already included in affected values','Mining & fishing AFK gains','Golden food effect','Food preservation chance','Spear weapon power','Mining & fishing power|Per 100 Slab items','AFK time copied to gaming|Chance on AFK claim','Base STR|Per 100 Slab items','Total damage|Per 250 STR for warriors; LUK for beginners','STR contribution to damage','Mining & fishing power|Scales per 10 class levels above 500','STR bonus|Per 2,000 Tome points above 5,000','Red essence gain|Scales with total warrior levels','Crop evolution|Per 2,000 Tome points above 5,000','Multi-page chance|Active Spelunking','Total damage','Deathbringer bone gain','Royal outpost collection rate'],
 G:['AGI','Green passive bubble multiplier|Archers only','Anvil production speed|Also allows two production items when active','Damage mastery','Anvil point cost reduction','Base damage from movement speed|Depends on movement speed above 110%','Catching net & trap power','Multi-bug chance','Accuracy from secondary stats','Critical chance','Total damage','Trapping efficiency|Also +1 placeable trap, even when unequipped','Shiny critter chance','Archer & secret-class talent points|Per tab, excluding Master Class','Green bubble cost reduction','Monster cash|Per 250 AGI','Selected green bubble multiplier|Already included in affected values','Catching AFK gains','Deathnote & portal kill credit','Double AFK EXP chance','Bow weapon power','Catching & trapping power|Per 100 Slab items','AFK time copied to sailing|Chance on AFK claim','Base AGI & LUK|Per 100 Slab items','Total damage|Per 250 AGI for archers','AGI contribution to damage','Green essence gain|Scales with total archer levels','Catching & trapping power|Scales per 10 class levels above 500','AGI bonus|Per 2,000 Tome points above 5,000','Sneaking stealth|Per 2,000 Tome points above 5,000','Spelunking efficiency','Total damage','Windwalker dust gain'],
 P:['WIS','Purple passive bubble multiplier|Mages only','Chopping efficiency|Per power of 10 max MP','Multi-log chance','Chopping & alchemy EXP','Base damage from MP|Depends on MP above 150','Hatchet & worship skull power','Cranium Cooking & alchemy EXP|Duration, kill progress, cooldown reduction and EXP','Brew speed|Separate multiplier','Attack talents’ AFK contribution','Total damage','Worship charge rate & capacity','Worship max charge|Per 10 Worship levels','Mage talent points|Per tab, excluding Master Class','Purple bubble cost reduction','Monster cash|Per 250 WIS','Selected purple bubble multiplier|Already included in affected values','Chopping AFK gains','Basic attack speed','Laboratory EXP','Wand & fist weapon power','Chopping & worship power|Per 100 Slab items','Divinity EXP','Base WIS|Per 100 Slab items','Total damage|Per 250 WIS for mages','WIS contribution to damage','Chopping & worship power|Scales per 10 class levels above 500','Purple essence gain|Scales with total mage levels','WIS bonus|Per 2,000 Tome points above 5,000','All essence gain|Per 2,000 Tome points above 5,000','Finding the next spelunking depth','Arcane Cultist tachyon gain'],
 Y:['LUK','Drop rate','Statue EXP retained after leveling','Level-up gift chance','Skill prowess multiplier','Toilet Paper Postage talent max level','All bubble material cost reduction|Shares a reduction pool with other bonuses','Liquid capacity|Depends on combined Alchemy levels','Class EXP','Extra bubble upgrade chance','Cog production speed','Printer sample size|Shares the sample-rate cap','Preserve giant-monster spawn odds','Library checkout speed','Yellow bubble cost reduction','Multikill|Per damage tier','Egg incubation speed','Meal & fire kitchen speed|Multiplier per meal at level 11+','Card drop chance','Shiny mob chance|Per Rift level','Sailing speed','Divinity minor-link multiplier|For the linked deity','Gaming bits|Per plant discovered','Preserve Divinity gift points','Atom upgrade cost reduction','Crop evolution|Per World 6 map unlocked across characters','Yellow essence gain','Sneaking door damage','Sneaking item-find chance','Currency Conduit cost scaling reduction','Spelunking stamina regeneration','Kattlekruk daily bubble levels','Gallery bonus multiplier increase']
};
const categoryById=Object.fromEntries(Object.entries(CATEGORIES).flatMap(([category,ids])=>ids.split(' ').map(id=>[id,category])));
const FIRST={combat:['O10','O9','G9','G8','G3','O8'],stats:['O0','G0','P0','Y0'],skills:['O2','P2','O17','P17','G17','O7'],production:['O12','G2','Y11','Y17','Y16','Y10'],progress:['Y8','Y1','Y18','O15','G15','P15'],alchemy:['P8','Y9','Y6','Y31','O1','G1'],worlds:['Y20','Y22','Y25','Y27','Y28','Y30']};
function model(raw,catalog,context={},matching=false,targetPercent=99){
 targetPercent=[80,90,95,99,99.9].includes(Number(targetPercent))?Number(targetPercent):99;
 const optimizer=root.BubbleOptimizer||(typeof require==='function'?require('./bubble-optimizer'):null);
 const report=optimizer.model(raw,catalog,context,{matching});
 const entries=report.rows.map(row=>{
  const bubble=catalog['OGPY'.indexOf(row.id[0])].bubbles[Number(row.id.slice(1))];
  const [label,qualifier='']= (LABELS[row.id[0]][Number(row.id.slice(1))]||row.name).split('|');
  const summary=optimizer.bonusSummary(row,bubble,targetPercent);
  const dynamic=['O5','G5','P5','Y7'].includes(row.id);
  const unit=bubble.formula==='decayMulti'||row.id==='Y4'?'×':/\{\s*%/.test(bubble.bonus)?'%':'';
  const value=row.level===null?'Unknown':row.level===0?'Locked':dynamic?'Character-dependent':summary.current===null?'Unknown':fmt(summary.current)+unit;
  const hardCap=row.cap&&!row.cap.shared&&row.effective!==null&&Number.isFinite(row.capLevel);
  const canCompare=row.level>0&&!dynamic&&!row.conditional&&!row.cap?.shared&&summary.current!==null;
  const target=canCompare?(hardCap?row.cap.limit:row.ceiling===null?null:row.ceiling*targetPercent/100):null;
  const targetValue=target===null?null:fmt(target)+unit;
  const targetLabel=target!==null?(hardCap?'effect cap':targetPercent+'% target'):row.cap?.shared||row.conditional?'shared / character cap':canCompare?'no finite maximum':'';
  const badges=[];
  if(row.active)badges.push('Requires activation');
  if(row.cap?.shared||row.conditional)badges.push('Shared / character cap');
  if(row.prisma)badges.push('Prisma');
  if(row.effective===null&&row.level>0)badges.push('Base value only');
  return {...row,label,qualifier,summary,value,target,targetValue,targetLabel,badges,category:categoryById[row.id]||'worlds'};
 });
 return {entries,groups:GROUPS.map(([id,title,description])=>{const rank=e=>{const index=FIRST[id].indexOf(e.id);return index<0?100:index;};return {id,title,description,entries:entries.filter(e=>e.category===id).sort((a,b)=>rank(a)-rank(b))};})};
}
function render(host,raw,afterRender){
 let context={},loaded=false,query='',matching=false,showAll=false,hideMaxed=false,targetPercent=99,view;
 const opened=new Set();
 function paint(){
  const report=model(raw,root.ALCHEMY_CATALOG,context,matching,targetPercent),matches=e=>(!hideMaxed||e.target===null||e.summary.current<e.target)&&`${e.label} ${e.qualifier} ${e.name} ${e.description} ${e.group}`.toLowerCase().includes(query.toLowerCase());
  const count=report.entries.filter(matches).length,hiddenCount=hideMaxed?report.entries.filter(e=>e.target!==null&&e.summary.current>=e.target).length:0;
  host.innerHTML=`<section class="bubble-bonuses"><div class="section-head"><div><p class="eyebrow">Alchemy · your bubble bonuses</p><h2>What your bubbles give you</h2><p>Browse by benefit. Open any bonus to see its bubble, calculation and target level.</p></div></div><div class="bubble-bonus-controls"><label>Find a bonus<input id="bubbleBonusSearch" type="search" placeholder="Damage, mining, cash, cooking…" value="${esc(query)}"></label><label>Class boosts<select id="bubbleBonusClass"><option value="all">Before matching-class boosts</option><option value="matching" ${matching?'selected':''}>Matching class for each colour</option></select></label><label>Bonus target<select id="bubbleBonusTarget">${[80,90,95,99,99.9].map(n=>`<option value="${n}" ${targetPercent===n?'selected':''}>${n}%</option>`).join('')}</select></label><label class="bubble-bonus-toggle"><input id="bubbleBonusAll" type="checkbox" ${showAll?'checked':''}> Show every bonus</label><button id="bubbleBonusHideMaxed" class="secondary" type="button" aria-pressed="${hideMaxed}">Hide maxed</button></div><p class="bubble-bonus-explainer">${matching?'Each colour uses its matching class: orange = warrior, green = archer, purple = mage. These are different character contexts.':'Values include decoded account and Prisma multipliers, before matching-class boosts.'} Numbers show current / ${targetPercent}% target, or the actual effect cap when reachable. Current values can exceed the ${targetPercent}% checkpoint. Each line is a separate contribution, not your final character stat. “Per” bonuses still need the stated stat or level; large bubbles require activation.</p><p class="bubble-bonus-status" role="status">${count} bubble bonuses${hideMaxed?` · ${hiddenCount} maxed hidden`:''} · ${loaded?(context.warning?'Some account values unavailable — base values are labeled.':'Account calculations loaded.'):'Loading account multipliers…'}</p><div class="bubble-bonus-groups">${report.groups.map(g=>{const items=g.entries.filter(matches);if(!items.length)return '';const shown=showAll||query?items:items.slice(0,6),rest=items.slice(6);return `<section class="bubble-benefit-group" aria-labelledby="benefit-${g.id}"><header><h3 id="benefit-${g.id}">${esc(g.title)}</h3><span>${items.length}</span></header><p>${esc(g.description)}</p>${shown.map(entry).join('')}${!showAll&&!query&&rest.length?`<details class="bubble-bonus-more" data-bonus-open="more-${g.id}" ${opened.has('more-'+g.id)?'open':''}><summary>Show ${rest.length} more bonuses</summary>${rest.map(entry).join('')}</details>`:''}</section>`;}).join('')||'<p class="bubble-bonus-empty">No bonuses match. Try another search or turn off Hide maxed.</p>'}</div></section>`;
  view=host.querySelector('.bubble-bonuses');
  host.querySelector('#bubbleBonusSearch').oninput=e=>{const cursor=e.target.selectionStart;query=e.target.value;paint();const input=host.querySelector('#bubbleBonusSearch');input.focus();input.setSelectionRange(cursor,cursor);};
  host.querySelector('#bubbleBonusTarget').onchange=e=>{targetPercent=Number(e.target.value);paint();};
  host.querySelector('#bubbleBonusClass').onchange=e=>{matching=e.target.value==='matching';paint();};
  host.querySelector('#bubbleBonusHideMaxed').onclick=()=>{hideMaxed=!hideMaxed;paint();};
  host.querySelector('#bubbleBonusAll').onchange=e=>{showAll=e.target.checked;paint();};
  host.querySelectorAll('[data-bonus-open]').forEach(el=>el.ontoggle=()=>{if(el.open)opened.add(el.dataset.bonusOpen);else opened.delete(el.dataset.bonusOpen);});
  afterRender?.();
 }
 function entry(e){return `<details class="bubble-bonus-entry" data-bonus-open="${e.id}" data-bonus-id="${e.id}" ${opened.has(e.id)?'open':''}><summary><img src="${esc(e.icon)}" width="32" height="32" alt="" loading="lazy"><span class="bubble-bonus-label"><strong>${esc(e.label)}</strong>${e.qualifier?`<small>${esc(e.qualifier)}</small>`:''}<small class="bubble-bonus-source">${esc(e.name)}</small></span><span class="bubble-bonus-number"><b>${esc(e.value)}${e.targetValue!==null?` <span class="bubble-bonus-target-divider">/</span> ${esc(e.targetValue)}`:''}</b>${e.targetLabel?`<small>${esc(e.targetLabel)}</small>`:''}</span></summary><div class="bubble-bonus-source-details"><p>${esc(e.group)} cauldron · ${e.level===null?'Level unavailable':'Lv '+fmt(e.level)}${e.badges.length?' · '+esc(e.badges.join(' · ')):''}</p><p>${e.level===0?'Discover this bubble to gain its bonus.':esc(e.summary.effect)}</p><p>${esc(e.summary.target.text)}</p>${e.cap?.shared||e.conditional?`<p>${esc(e.summary.note)}</p>`:''}</div></details>`;}
 paint();root.BubbleOptimizer.prepare(raw).then(result=>{if(!host.contains(view))return;context=result;loaded=true;paint();});
}
const api={model,render,GROUPS,LABELS,CATEGORIES};if(typeof module!=='undefined')module.exports=api;else root.BubbleBonuses=api;
})(typeof window!=='undefined'?window:globalThis);
