(function(root){'use strict';
const M=typeof module!=='undefined'&&module.exports?require('./fountain-optimizer.js'):root.FountainOptimizer;
const A=typeof module!=='undefined'&&module.exports?require('./arcade-model.js'):root.ArcadeModel;
const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v;}catch{return null;}};
const known=v=>v!=null&&v!==''&&typeof v!=='boolean'&&Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;
function calculate(raw={}){
 const data=parse(raw.data||raw),holes=parse(data?.Holes);let state;try{state=M.decode(raw);}catch{}
 if(!state||!holes)return null;
 const upgrades=parse(data.ArcadeUpg),pet=A.companion(raw);
 // ArcadeShopInfo[68]: 30 * level / (100 + level), super/companion
 // multipliers are shared with the audited Arcade page model.
 const arcade=A.bonus({formula:'decay',base:30,scale:100},upgrades?.[68],pet).total;
 const hasBonus=(w,i)=>known(holes[31]?.[w]?.[i])!==null&&known(holes[32]?.[w]?.[i])!==null;
 const active=hasBonus(0,12)?1+Math.min(4,4*M.bonus(state,0,12))+M.bonus(state,0,12)/100:null;
 const coinSpeed=hasBonus(0,9)&&arcade!==null?(1+M.bonus(state,0,9)/100)*(1+arcade/100):null;
 const rows=['Coin fill','Marble fill','Rubber Ducky fill'].map((name,tier)=>{
  const requirement=[7200,36000,90000][tier];
  const unlocked=tier===0?true:hasBonus(tier,tier===1?10:12)?M.bonus(state,tier,tier===1?10:12)>=1:null;
  const speed=tier===0?coinSpeed:1,progress=known(holes[33]?.[tier]),remaining=progress===null?null:Math.max(0,requirement-progress);
  const divide=(value,rate)=>value===null||rate===null?null:value/rate;
  return {name,tier,unlocked,requirement,progress:progress===null?null:Math.min(1,progress/requirement),away:divide(requirement,speed),active:divide(requirement,speed===null||active===null?null:speed*active),remainingAway:divide(remaining,speed),remainingActive:divide(remaining,speed===null||active===null?null:speed*active)};
 });
 return {rows,arcade,active,companionNote:pet.multiplier===null||pet.discrepancy?pet.note:''};
}
// Solve a full bar by changing one upgrade and holding every other saved bonus fixed.
function targetLevels(raw,{tier=0,seconds=1,active=true}={}){
 const timers=calculate(raw),state=M.decode(raw);
 if(!timers||!state||![0,1,2].includes(tier)||!Number.isFinite(seconds)||seconds<=0)return {error:'Enter a positive target time and load a complete Fountain save.'};
 const timer=timers.rows[tier];if(timer.unlocked!==true)return {error:'Unlock this fill bar first.'};
 const current=active?timer.active:timer.away;
 if(current===null)return {error:'Saved speed bonuses are missing. Import a complete save.'};
 const rows=(tier===0?(active?[9,12]:[9]):active?[12]:[]).map(index=>{
  const upgrade=M.catalog.find(u=>u.water===0&&u.index===index),level=state.levels[0][index];
  const result={name:upgrade.name,index,level,current,target:null,seconds:null,extra:null};
  if(current<=seconds)return {...result,target:level,extra:0,seconds:current,note:'Already at or below the target.'};
  if(index===9&&tier!==0||index===12&&!active)return {...result,note:index===9?'Only speeds up coin fill.':'Only works while standing in the Fountain.'};
  if(!M.unlocked(state,upgrade))return {...result,note:'Upgrade is locked. Complete its prerequisite first.'};
  const projected=JSON.parse(JSON.stringify(state));
  const time=n=>{projected.levels[0][index]=n;const coin=tier===0?(1+M.bonus(projected,0,9)/100)*(1+timers.arcade/100):1;const standing=active?1+Math.min(4,4*M.bonus(projected,0,12))+M.bonus(projected,0,12)/100:1;return timer.requirement/(coin*standing);};
  let lo=level,hi=Math.max(level+1,1);const limit=1e12;
  while(time(hi)>seconds&&hi<limit)hi=Math.min(limit,hi*2);
  if(time(hi)>seconds)return {...result,note:'Target requires more than 1 trillion levels in this single-upgrade calculation.'};
  while(lo+1<hi){const mid=Math.floor((lo+hi)/2);if(time(mid)<=seconds)hi=mid;else lo=mid;}
  return {...result,target:hi,extra:hi-level,seconds:time(hi),previousSeconds:time(hi-1),note:'Other upgrades, marble tiers and Arcade bonus held fixed.'};
 });const barUpgrade=tier===0?null:M.catalog.find(u=>u.water===tier&&u.index===(tier===1?10:12));return {rows,current,tier,seconds,active,barUpgrade:barUpgrade?{name:barUpgrade.name,water:barUpgrade.water,index:barUpgrade.index,level:state.levels[barUpgrade.water][barUpgrade.index],note:tier===1?'Marble Filling increases marbles awarded per fill; it does not shorten this timer.':'Rubber Ducky increases the chance of a Ducky stack per fill; it does not shorten this timer.'}:null};
}
const targetSettings=new WeakMap();
function bindTarget(host,raw){
 const panel=host.querySelector('[data-fountain-time-target]');if(!panel)return;
 const stored=targetSettings.get(raw);if(stored)for(const [key,value] of Object.entries(stored))panel.querySelector('[data-target-'+key+']').value=value;
 const paint=()=>{targetSettings.set(raw,Object.fromEntries(['seconds','unit','bar','mode'].map(key=>[key,panel.querySelector('[data-target-'+key+']').value])));const seconds=Number(panel.querySelector('[data-target-seconds]').value)*Number(panel.querySelector('[data-target-unit]').value),tier=Number(panel.querySelector('[data-target-bar]').value),active=panel.querySelector('[data-target-mode]').value==='active';
 const result=targetLevels(raw,{tier,seconds,active}),fmt=n=>n.toLocaleString('en-US');
 const alternative=!result.error&&!result.rows.length&&result.current>seconds?targetLevels(raw,{tier,seconds,active:true}):null;
 const cards=alternative?.rows||result.rows||[];
 panel.querySelector('[data-target-result]').innerHTML=result.error?`<p>${esc(result.error)}</p>`:`${result.barUpgrade?`<div class="fountain-bar-upgrade"><img src="assets/HoleFountainUpg${result.barUpgrade.water}_${result.barUpgrade.index}.png" width="36" height="36" alt=""><div><strong>${esc(result.barUpgrade.name)} · Lv ${fmt(result.barUpgrade.level)}</strong><p>${esc(result.barUpgrade.note)}</p></div></div>`:''}<p>Current full bar: <strong>${duration(result.current)}</strong> → target <strong>${seconds}s</strong></p>${alternative?`<p><strong>No upgrade reduces this bar’s away timer (${duration(result.current)}).</strong> To reach ${seconds}s, stand in the Fountain and use the Water Bender target below.</p><button type="button" class="fountain-inline-action" data-use-active>Use standing-in-Fountain calculation</button>`:!cards.length?'<p>Target already met while away. No speed upgrade needed.</p>':''}<div class="fountain-timer-grid">${cards.map(r=>`<article><h4><img src="assets/HoleFountainUpg0_${r.index}.png" width="28" height="28" alt=""> ${r.name}${alternative?' · requires standing in Fountain':''}</h4>${r.target===null?`<p>${esc(r.note)}</p>`:`<p>Lv ${fmt(r.level)} → <strong>Lv ${fmt(r.target)}</strong> (${fmt(r.extra)} more)</p><p>Projected full bar${alternative?' while standing':''}: <strong>${duration(r.seconds)}</strong></p>${r.extra===0?'<small>Target already met.</small>':''}`}</article>`).join('')}</div>`;
 const useActive=panel.querySelector('[data-use-active]');if(useActive)useActive.onclick=()=>{panel.querySelector('[data-target-mode]').value='active';paint();};

 };
 panel.querySelectorAll('input,select').forEach(input=>input.oninput=paint);paint();
}
function duration(seconds){
 if(seconds===null||!Number.isFinite(seconds))return 'Unknown';
 if(seconds<=0)return 'Ready';
 if(seconds<0.1)return '<0.1s';
 if(seconds<60)return `${Number(seconds.toFixed(1))}s`;
 const total=Math.ceil(seconds),days=Math.floor(total/86400),hours=Math.floor(total%86400/3600),minutes=Math.floor(total%3600/60),secs=total%60;
 return [days?days+'d':'',hours?hours+'h':'',minutes?minutes+'m':'',secs?secs+'s':''].filter(Boolean).join(' ');
}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function html(raw){
 const timers=calculate(raw);if(!timers)return '';
 return `<details open data-fountain-collapse="target" data-fountain-time-target class="fountain-timers"><summary>Target fill time · required upgrade levels</summary><div class="fountain-controls"><label>Fill bar<select data-target-bar><option value="0">Coins</option><option value="1">Marbles</option><option value="2">Rubber Duckies</option></select></label><label>Target time<input data-target-seconds aria-label="Target fill time" type="number" min="0.001" step="any" value="1" style="width:100px"></label><label>Units<select data-target-unit><option value="1">Seconds</option><option value="60">Minutes</option><option value="3600">Hours</option></select></label><label>Location<select data-target-mode><option value="active">Standing in Fountain</option><option value="away">Away from Fountain</option></select></label></div><div data-target-result aria-live="polite"></div><p class="fountain-note">Each result is an alternative: upgrade only that one to the shown level. Uses saved marble tiers and Arcade bonuses. This is a formula target, not an affordability estimate or a guarantee of one collection per second; game update timing can limit actual collection.</p></details><details data-fountain-collapse="timers" class="fountain-timers" aria-label="Fountain fill timers"><summary>Current fill timers &amp; saved progress</summary><div class="fountain-timer-grid">${timers.rows.map(row=>`<article data-timer="${row.tier}"><h4>${row.name}</h4>${row.unlocked===true?`<dl><div><dt>Standing in Fountain</dt><dd data-timer-active>${duration(row.active)}</dd></div><div><dt>Not in Fountain</dt><dd data-timer-away>${duration(row.away)}</dd></div></dl>${row.progress!==null?`<p>Saved bar: ${(row.progress*100).toFixed(1)}% · remaining <b>${duration(row.remainingActive)}</b> standing / <b>${duration(row.remainingAway)}</b> away</p>`:'<p>Current bar progress is missing from this save.</p>'}`:`<p>${row.unlocked===null?'Unlock status missing from save.':row.tier===1?'Unlock Marble Filling to enable this bar.':'Unlock Rubber Ducky to enable this bar.'}</p>`}</article>`).join('')}</div><p class="fountain-note">From your imported save, not a live countdown. Water Bender: ${timers.active===null?'unknown':Number(timers.active.toFixed(3))+'×'} active speed. Arcade Fountain Speed: ${timers.arcade===null?'unknown':Number(timers.arcade.toFixed(3))+'%'}. Water Bender speeds up all three bars while standing in the Fountain; Arcade and Fountain Filling speed up the coin bar.${timers.companionNote?' '+esc(timers.companionNote):''}</p></details>`;
}
const api={calculate,duration,html,targetLevels,bindTarget};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FountainTimers=api;
})(typeof window!=='undefined'?window:globalThis);
