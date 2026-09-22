(function(root){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>v==null||!Number.isFinite(v)?'Unavailable':v!==0&&(Math.abs(v)>=1e9||Math.abs(v)<.001)?v.toExponential(5):v.toLocaleString(undefined,{maximumFractionDigits:4});
const pct=v=>v==null?'—':`${v>0?'+':''}${fmt(v)}%`;
const goals={combat:'Portal / Death Note kills',progression:'Class EXP',loot:'Rare drops',coins:'Coins',damage:'Maximum damage',skilling:'Skill efficiency',skillxp:'All-skill EXP bonus',printing:'Printer sample rate',capacity:'Carry capacity',trapping:'Shiny trapping',minigame:'Minigame rewards per play',dungeon:'Dungeon rewards per pass',giants:'Giant spawn chance',crystals:'Crystals from giants'};
const stats={damage:'Max damage',accuracy:'Accuracy',hitChance:'Hit chance (%)',defence:'Defence',survival:'Survivability (%)',classExp:'Class EXP multiplier',skillExp:'All-skill EXP bonus (%)',efficiency:'Skill efficiency multiplier',afk:'AFK gain multiplier',capacity:'Carry multiplier',sample:'Sample rate (%)',monsterHp:'Monster HP',drop:'Drop-rate multiplier',cash:'Coin multiplier',playCost:'Plays per minigame',minigameReward:'Minigame reward multiplier',dungeonReward:'Dungeon reward multiplier',dungeonCost:'Dungeon passes per run',giants:'Giant chance per kill',shinyBundle:'Shinies per success',shinyDivisor:'Shiny chance divisor'};
const workers=new WeakMap();
function changes(before,after,all=false){return Object.entries(stats).filter(([k])=>Number.isFinite(before[k])&&Number.isFinite(after[k])&&(all||Math.abs(before[k]-after[k])>Math.max(Number.MIN_VALUE,Math.abs(before[k])*1e-10))).map(([k,label])=>`<tr><th scope="row">${label}</th><td>${fmt(before[k])}</td><td>${fmt(after[k])}</td><td>${before[k]?pct(100*(after[k]/before[k]-1)):'New effect'}</td></tr>`).join('');}
function resultHtml(r){
 const names=ids=>ids.map(i=>r.rows.find(row=>row.index===i)?.name||`Prayer ${i}`).join(', ')||'No prayers';
 const compared=changes(r.currentStats,r.bestStats,true);
 return `${r.planning?`<section class="prayer-planning-summary"><h3>Planning ahead · ${esc(r.planning.critterName||r.planning.area)}</h3><p>Saved location: ${esc(r.planning.savedArea)} · ${esc(r.planning.savedTarget)}. Projecting the chosen activity using your saved gear, talents and account upgrades. Map unlocks are not checked.</p></section>`:''}<section class="prayer-recommendation"><h3>${r.selected.length?'Use '+esc(names(r.selected)):'Use no prayers for this target'}</h3><p class="prayer-net">${r.change===null?(r.optimized>r.baseline?'Enables this output':'No output'):pct(r.change)} <small>vs your equipped prayers${r.planning?' in this planned area':' in the JSON'}</small></p><div class="prayer-totals"><div><span>Equipped setup</span><strong>${fmt(r.baseline)}</strong></div><div><span>Recommended setup</span><strong>${fmt(r.optimized)}</strong></div><div><span>No prayers</span><strong>${fmt(r.empty)}</strong></div></div><p>${esc(r.spec.unit)} · ${r.selected.length} / ${r.slots.total} slots used</p><small>Equipped in save: ${esc(names(r.current))}. ${r.combinations} combinations considered among prayers that affect this target. Fewer prayers win output ties.</small></section>
 <section class="prayer-situational"><h3>${esc(r.character.name)} · ${esc(r.character.target)}</h3><p>${r.slots.base} progression slots (highest Wizard-line level ${r.slots.highestWizard}) + ${r.slots.gem} purchased slots = <b>${r.slots.total} available</b>. Maximum: 12 with all 4 gem purchases.</p><p>${r.passive?`${r.passive} no-prayer superbits are unlocked. The calculation includes their stacked passive bonuses and the bonuses lost when equipping a prayer.`:'No no-prayer superbits were detected.'}</p>${r.notes?`<p>${esc(r.notes)}</p>`:''}${r.planning?'<p>Planning uses hourly rates, not the old AFK absence. Unending Energy still caps gains after 10 hours. Minigame comparisons assume enough plays for an attempt.</p>':''}${r.goal==='progression'&&!r.planning?`<p>Unending Energy: the game caps AFK gains at 10 hours. Saved elapsed time: ${r.savedSeconds===null?'unavailable':fmt(r.savedSeconds/3600)+' hours'}. The calculation uses that saved interval, not a guessed claim schedule.</p>`:''}</section>
 ${compared?`<details open class="prayer-math" data-prayer-stats><summary>Character stats: equipped → recommended</summary><div class="prayer-table-wrap"><table><thead><tr><th>Stat</th><th>Equipped</th><th>Recommended</th><th>Change</th></tr></thead><tbody>${compared}</tbody></table></div></details>`:''}
 <p class="collection-note">Each prayer below is tested with and without it while keeping the other recommended prayers fixed. The verdict is for <b>${esc(r.spec.label.toLowerCase())}</b>; secondary effects remain visible.</p>
 <div class="prayer-score-list">${r.rows.map(row=>{
 const changed=changes(row.beforeStats,row.afterStats);
 return `<article class="prayer-score ${row.chosen?'is-selected':''}"><div class="prayer-score-title"><img src="assets/Prayer${row.index}.png" alt=""><div><h3>${esc(row.name)}</h3><small>Lv ${row.level}${row.equipped?' · equipped in save':''}</small><p class="prayer-verdict ${row.verdict==='Do not use'?'is-negative':''}">${esc(row.verdict)} · ${row.change===null?(row.after>row.before?'enables output':'no % comparison'):pct(row.change)}</p></div></div><div class="prayer-effects"><p class="prayer-buff"><b>Buff:</b> ${esc(row.bonusText)}</p><p class="prayer-debuff"><b>Curse:</b> ${esc(row.curseText)}</p><p class="prayer-decision">${esc(row.reason)}</p><p><b>Result:</b> ${fmt(row.before)} → ${fmt(row.after)} ${esc(r.spec.unit)}</p><div class="prayer-breakdown"><span>Buff contribution <b>${pct(row.buffChange)}</b></span><span>Curse contribution <b>${pct(row.curseChange)}</b></span>${row.passiveChange?`<span>No-prayer bonus change <b>${pct(row.passiveChange)}</b></span>`:''}</div>${row.notes?`<p class="prayer-footnote">${esc(row.notes)}</p>`:''}${changed?`<details><summary>Show calculated stat changes</summary><div class="prayer-table-wrap"><table><thead><tr><th>Stat</th><th>Without</th><th>With</th><th>Change</th></tr></thead><tbody>${changed}</tbody></table></div></details>`:''}</div></article>`;
 }).join('')}</div>
 <details class="prayer-math"><summary>Calculation basis</summary><p>The imported JSON supplies character stats, map, equipment, talents, account upgrades and equipped prayers. Each tested setup recalculates the relevant game formulas, including additive bonus pools, curse floors, hit chance, survivability, monster HP, multikill tiers, capped sample rate and no-prayer superbits. Buff/curse contributions are percentage-point contributions to the net change, all measured against the same without-prayer output.</p><p>These are calculated outputs for the saved state, not live game measurements. Active combat movement, future equipment changes and future AFK absences are not predicted. Prayers affect the selected character; shared drops, samples and Death Note progress can benefit the account. Your JSON is never modified.</p><p>Formula source and modifications: <a href="vendor/idleon-toolbox/README.md">calculation engine sources</a>.</p></details>`;
}
function render(host,raw,afterRender){
 workers.get(host)?.terminate();
 let characterId=0,goal='combat',mode='plan',areaId=null,critterId=null,requestId=0,roster=[],catalog={areas:[],critters:[]};
 const page=host.dataset?.page;
 const active=()=>host.dataset?.page===page&&!!host.querySelector('[data-prayer-results]');
 if(!raw||!Object.keys(raw.data||raw).length){host.innerHTML='<h2>Prayer Optimizer</h2><p>Load a JSON save from Home to calculate your prayer setup.</p>';afterRender?.();return;}
 host.innerHTML='<div class="section-head compact"><div><p class="eyebrow">World 3 · JSON calculation</p><h2>Prayer Optimizer</h2><p>Plan prayer setups for any area using your saved character stats.</p></div></div><section class="prayer-optimizer-controls"><label>Character<select data-prayer-character disabled><option>Loading characters…</option></select></label><label>Compare<select data-prayer-mode disabled><option value="plan">Plan a setup</option><option value="saved">Saved location</option></select></label><label>Optimize<select data-prayer-profile disabled>'+Object.entries(goals).map(([key,label])=>'<option value="'+key+'">'+label+'</option>').join('')+'</select></label><label data-prayer-area-label>Planned area<select data-prayer-area disabled></select></label><label data-prayer-critter-label hidden>Planned critter<select data-prayer-critter disabled></select></label></section><p data-prayer-status role="status">Reading your JSON and calculating account bonuses…</p><div data-prayer-results></div>';
 afterRender?.();
 if(typeof root.Worker!=='function'){host.querySelector('[data-prayer-status]').textContent='A browser with Web Worker support is required for the account calculation.';return;}
 const worker=new root.Worker('prayer-worker.js');workers.set(host,worker);
 const status=host.querySelector('[data-prayer-status]'),output=host.querySelector('[data-prayer-results]'),picker=host.querySelector('[data-prayer-character]'),modePicker=host.querySelector('[data-prayer-mode]'),goalPicker=host.querySelector('[data-prayer-profile]'),areaPicker=host.querySelector('[data-prayer-area]'),critterPicker=host.querySelector('[data-prayer-critter]');
 const controls=()=>{
  const fighting=['combat','progression','loot','coins','giants','crystals'].includes(goal);
  const areas=catalog.areas.filter(a=>fighting?/fighting/i.test(a.activity):goal==='minigame'?/^(Mining|Choppin|Fishing|Catching)$/i.test(a.activity):true);
  if(!areas.some(a=>a.mapId===areaId))areaId=areas.find(a=>a.mapId===roster.find(c=>c.id===characterId)?.mapId)?.mapId??areas[0]?.mapId;
  areaPicker.innerHTML=[...new Set(areas.map(a=>a.world))].map(world=>'<optgroup label="World '+world+'">'+areas.filter(a=>a.world===world).map(a=>'<option value="'+a.mapId+'">'+esc(a.name)+' · '+esc(a.label)+'</option>').join('')+'</optgroup>').join('');
  areaPicker.value=String(areaId);
  if(!catalog.critters.some(c=>c.id===critterId))critterId=catalog.critters[0]?.id;
  critterPicker.innerHTML=catalog.critters.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('');critterPicker.value=critterId;
  host.querySelector('[data-prayer-area-label]').hidden=mode!=='plan'||goal==='trapping';
  host.querySelector('[data-prayer-critter-label]').hidden=mode!=='plan'||goal!=='trapping';
 };
 const calculate=()=>{controls();status.textContent='Calculating prayer combinations…';output.innerHTML='';worker.postMessage({requestId:++requestId,characterId,goal,planning:{mode,mapId:areaId,critter:critterId}});};
 worker.onmessage=event=>{
  if(!active()){worker.terminate();return;}
  const message=event.data;if(message.requestId!==requestId)return;
  if(message.type==='roster'){
   roster=message.roster;catalog=message.targets;
   characterId=roster[0]?.id??0;
   for(const element of [picker,modePicker,goalPicker,areaPicker,critterPicker])element.disabled=false;
   picker.innerHTML=roster.map(c=>'<option value="'+c.id+'">'+esc(c.name)+' · saved at '+esc(c.target)+'</option>').join('');picker.value=String(characterId);
   calculate();
  }else if(message.type==='progress')status.textContent='Calculating prayer combinations: '+message.done+' / '+message.total+'…';
  else if(message.type==='error'){
   status.textContent=message.error;
   if(message.stats)output.innerHTML='<section class="prayer-situational"><h3>Saved character stats</h3><p>These stats remain available. Choose Plan a setup to compare prayers in another area.</p><div class="prayer-table-wrap"><table><thead><tr><th>Stat</th><th>Saved value</th></tr></thead><tbody>'+Object.entries(stats).filter(([key])=>Number.isFinite(message.stats[key])).map(([key,label])=>'<tr><th scope="row">'+label+'</th><td>'+fmt(message.stats[key])+'</td></tr>').join('')+'</tbody></table></div></section>';
  }else if(message.type==='result'){status.textContent='Calculated from your JSON.';output.innerHTML=resultHtml(message.result);}
 };
 worker.onerror=()=>{if(active())status.textContent='The prayer calculation could not finish. Reload the page and re-import your JSON.';};
 picker.onchange=e=>{characterId=Number(e.target.value);calculate();};
 goalPicker.onchange=e=>{goal=e.target.value;calculate();};
 modePicker.onchange=e=>{mode=e.target.value;calculate();};
 areaPicker.onchange=e=>{areaId=Number(e.target.value);calculate();};
 critterPicker.onchange=e=>{critterId=e.target.value;calculate();};
 worker.postMessage({requestId:++requestId,initialize:true,raw});
}
const api={render,resultHtml,goals};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PrayerOptimizer=api;
})(typeof window!=='undefined'?window:globalThis);
