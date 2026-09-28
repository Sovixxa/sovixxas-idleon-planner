(function(root){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:2});
const GROUPS=[['combat','Damage & combat'],['stats','Stats & talent points'],['skills','Skilling'],['carry','Carry capacity'],['production','Production & alchemy'],['progress','EXP, drops & rewards'],['worlds','World systems']];
const LABELS={BaseDmg:'Base damage',BaseHP:'Base HP',BaseMP:'Base MP',PctDmg:'Total damage',BaseAcc:'Base accuracy',BaseDef:'Base defence',CritDmg:'Critical damage',BaseSTR:'STR',BaseAGI:'AGI',BaseWIS:'WIS',BaseLUK:'LUK',BaseAllStat:'All stats',AllStatPct:'All stats',PctMoveSpd:'Movement speed',BossDmg:'Boss damage',DropRate:'Drop rate',classxp:'Class EXP',ShinyChance:'Shiny critter chance',WorshipCharge:'Worship charge rate',WorshipMax:'Worship max charge',SampleRate:'Printer sample size',ArcadeBallz:'Arcade ball recharge',GoldBallz:'Golden ball cost reduction',ArcadeTimeMax:'Arcade ball claim window',BFood:'Boost food effect',GFood:'Golden food effect',CardDrop:'Card drop rate',krukd:'Daily Kattlekruk bubble levels',corale:'Daily coral gain','123Ess':'Green, yellow & blue essence gain','456Ess':'Purple, red & cyan essence gain',FishEffPerLv:'Fishing efficiency per Fishing level'};
function category(s){
 if(/^(Base(?:STR|AGI|WIS|LUK|AllStat)|AllStatPct|Talent)/.test(s.stat))return 'stats';
 if(/Cap$/.test(s.stat)&&!/Liquid|Forge/.test(s.stat))return 'carry';
 if(/Exp|xp|Drop|CrySpawn|Quest|GFood|BFood|BookSpd/i.test(s.stat))return 'progress';
 if(s.category==='combat'||s.stat==='Overkill')return 'combat';
 if(/Anvil|Alch|Liquid|Build|Sample|Cook|NewPet|Forge|Sigil|Refinery|DNA|kruk/.test(s.stat))return 'production';
 if(/Eff|Double|Worship|ShinyChance/i.test(s.stat))return 'skills';
 return 'worlds';
}
function model(data,character=0){
 const optimizer=root.StampOptimizer||(typeof require==='function'?require('./stamp-optimizer-model'):null);
 const report=optimizer.model(data,{goal:.99});
 const entries=report.rows.map(s=>{
  const effect=s.characterEffects?s.characterEffects[character]:s.effect;
  const known=s.known&&Number.isFinite(effect),unit=/\{\s*%/.test(s.description)?'%':/\{hr/.test(s.description)?' hr':s.func==='decayMulti'?'×':'';
  const base=s.func==='decay'?s.x1*s.level/(s.level+s.x2):null;
  // Skill-level penalties change with stamp level; their current multiplier cannot predict a ceiling.
  const multi=known&&base>0&&!(s.skillIndex>0)?effect/base:null;
  const ceiling=multi!==null?s.x1*multi:null;
  const exact=s.cap&&s.capLevel!==null;
  const target=!s.shared&&known&&s.level>0?(exact?s.cap.limit:ceiling!==null?ceiling*.99:null):null;
  const current=known?s.cap?Math.min(effect,s.cap.limit):effect:null;
  const value=!s.known?'Unknown':s.level===0?'Not acquired':current===null?'Unknown':fmt(current)+unit;
  const targetValue=target===null?null:fmt(target)+unit;
  const label=LABELS[s.stat]||(s.description||s.stat).replace(/^\+?\{(?:%|hr|x)?\s*/,'').split(/\._?|\.\s|\sAlso\b|,_/)[0].replace(/Efficicency/g,'Efficiency').trim();
  let targetText,targetLabel;
  if(s.shared){targetLabel='shared cap';targetText='Check the character’s combined printer sample rate; this stamp shares the 90% cap with other sources.';}
  else if(exact){targetLabel='effect cap';targetText=`Max-benefit level: Lv ${fmt(s.capLevel)}${s.level>=s.capLevel?' · reached':' · '+fmt(s.capLevel-s.level)+' levels to go'}. This cap applies to the named effect.`;}
  else if(s.func==='decay'&&!(s.skillIndex>0)&&target!==null){targetLabel='99% target';targetText=`99% checkpoint: Lv ${fmt(s.softLevel)}${s.level>=s.softLevel?' · reached':' · '+fmt(s.softLevel-s.level)+' levels to go'}. No finite level reaches the full theoretical maximum.`;}
  else if(s.func==='decay'&&s.skillIndex>0){targetLabel='skill-level dependent';targetText=`Base curve reaches 99% at effective Lv ${fmt(s.softLevel)}. Your character’s skill level can reduce the effective stamp level, so this is not a guaranteed stamp-level target.`;}
  else if(s.func==='decay'){targetLabel='maximum unavailable';targetText='The bonus maximum needs a known effect multiplier.';}
  else{targetLabel='no finite maximum';targetText='This bonus keeps growing. The material-unlocked level cap is an upgrade gate, not a maximum-benefit level.';}
  return {...s,label,category:category(s),current,value,target,targetValue,targetLabel,targetText,maxed:target!==null&&current>=target,effectText:!known?'Bonus unavailable.':s.description.replace(/[{}]/g,fmt(current))};
 });
 return {entries,groups:GROUPS.map(([id,title])=>({id,title,entries:entries.filter(e=>e.category===id)}))};
}
async function render(host,raw){
 host.innerHTML='<section class="stamp-bonuses"><h2>Stamp Bonuses</h2><p role="status">Calculating stamp bonuses…</p></section>';
 const loading=host.firstElementChild;let data;
 try{data=await root.StampCalculator.load(raw);}catch(error){if(host.contains(loading))loading.innerHTML=`<h2>Stamp Bonuses</h2><p>${esc(error.message)}</p>`;return;}
 if(!host.contains(loading))return;
 let query='',character=0,hideMaxed=false,showAll=false;const opened=new Set();
 function paint(){
  const report=model(data,character),matches=s=>(!hideMaxed||!s.maxed)&&`${s.label} ${s.name} ${s.description}`.toLowerCase().includes(query.toLowerCase()),shown=report.entries.filter(matches);
  host.innerHTML=`<section class="bubble-bonuses stamp-bonuses"><div class="section-head"><div><p class="eyebrow">World 1 · stamp bonuses</p><h2>What your stamps give you</h2><p>Your bonuses, grouped by what they improve. Open a line for its source stamp and level target.</p></div></div><nav class="skill-tabs" aria-label="Stamp sections"><button class="skill-tab" data-stamp-view="stamps">Upgrade calculator</button><button class="skill-tab" data-stamp-view="stampCollection">Collection</button><button class="skill-tab active" aria-current="page" data-stamp-view="stampBonuses">Stamp Bonuses</button></nav><div class="bubble-bonus-controls"><label>Find a bonus<input id="stampBonusSearch" type="search" value="${esc(query)}" placeholder="Damage, mining, carry capacity…"></label><label>Character<select id="stampBonusCharacter">${(data.characters||[]).map((c,i)=>`<option value="${i}" ${character===i?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><label class="bubble-bonus-toggle"><input id="stampBonusAll" type="checkbox" ${showAll?'checked':''}> Show every bonus</label><button id="stampBonusHideMaxed" class="secondary" aria-pressed="${hideMaxed}">Hide maxed</button></div><p class="bubble-bonus-explainer">Values are for ${esc(data.characters?.[character]?.name||'the first saved character')}, including decoded account bonuses and any skill-level reductions. Each line is a separate contribution. Numbers show current / 99% target, or the reachable effect cap. Stamps without a finite maximum stay visible; an unlocked level cap is not a bonus maximum.</p><p class="bubble-bonus-status" role="status">${shown.length} stamp bonuses${hideMaxed?' · '+report.entries.filter(s=>s.maxed).length+' maxed hidden':''}</p><div class="bubble-bonus-groups">${report.groups.map(g=>{const items=g.entries.filter(matches),first=showAll||query?items:items.slice(0,6),rest=items.slice(6);if(!items.length)return '';return `<section class="bubble-benefit-group"><header><h3>${esc(g.title)}</h3><span>${items.length}</span></header>${first.map(entry).join('')}${!showAll&&!query&&rest.length?`<details class="bubble-bonus-more" data-stamp-open="more-${g.id}" ${opened.has('more-'+g.id)?'open':''}><summary>Show ${rest.length} more bonuses</summary>${rest.map(entry).join('')}</details>`:''}</section>`;}).join('')||'<p>No bonuses match. Change your search or turn off Hide maxed.</p>'}</div></section>`;
  host.querySelectorAll('[data-stamp-view]').forEach(b=>b.onclick=()=>root.dispatchEvent(new CustomEvent('idleon:navigate',{detail:b.dataset.stampView})));
  host.querySelector('#stampBonusSearch').oninput=e=>{const cursor=e.target.selectionStart;query=e.target.value;paint();const input=host.querySelector('#stampBonusSearch');input.focus();input.setSelectionRange(cursor,cursor);};
  host.querySelector('#stampBonusCharacter').onchange=e=>{character=Number(e.target.value);paint();};
  host.querySelector('#stampBonusAll').onchange=e=>{showAll=e.target.checked;paint();};
  host.querySelector('#stampBonusHideMaxed').onclick=()=>{hideMaxed=!hideMaxed;paint();};
  host.querySelectorAll('[data-stamp-open]').forEach(el=>el.ontoggle=()=>{if(el.open)opened.add(el.dataset.stampOpen);else opened.delete(el.dataset.stampOpen);});
 }
 function entry(s){return `<details class="bubble-bonus-entry" data-stamp-id="${esc(s.id)}" data-stamp-open="${esc(s.id)}" ${opened.has(s.id)?'open':''}><summary><img src="assets/${esc(s.id)}.png" width="32" height="32" alt="" loading="lazy"><span class="bubble-bonus-label"><strong>${esc(s.label)}</strong><small class="bubble-bonus-source">${esc(s.name)}</small></span><span class="bubble-bonus-number"><b>${esc(s.value)}${s.targetValue!==null?' / '+esc(s.targetValue):''}</b><small>${esc(s.targetLabel)}</small></span></summary><div class="bubble-bonus-source-details"><p>${esc(s.name)} · ${s.known?'Lv '+fmt(s.level)+' · unlocked level cap '+fmt(s.maxLevel):'Level data unavailable'}</p><p>${s.level===0?'Obtain and hand in this stamp to gain its bonus.':esc(s.effectText)}</p><p>${esc(s.targetText)}</p>${s.skillIndex>0?'<p>The selected character’s skill level may limit this stamp’s effect.</p>':''}</div></details>`;}
 paint();
}
const api={model,render,category};if(typeof module!=='undefined')module.exports=api;else root.StampBonuses=api;
})(typeof window!=='undefined'?window:globalThis);
