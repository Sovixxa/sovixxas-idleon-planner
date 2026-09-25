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
 return `<section class="fountain-timers" aria-label="Fountain fill timers"><div class="fountain-timers-heading"><h3>Fountain fill timers</h3><span>Time for one full bar</span></div><div class="fountain-timer-grid">${timers.rows.map(row=>`<article data-timer="${row.tier}"><h4>${row.name}</h4>${row.unlocked===true?`<dl><div><dt>Standing in Fountain</dt><dd data-timer-active>${duration(row.active)}</dd></div><div><dt>Not in Fountain</dt><dd data-timer-away>${duration(row.away)}</dd></div></dl>${row.progress!==null?`<p>Saved bar: ${(row.progress*100).toFixed(1)}% · remaining <b>${duration(row.remainingActive)}</b> standing / <b>${duration(row.remainingAway)}</b> away</p>`:'<p>Current bar progress is missing from this save.</p>'}`:`<p>${row.unlocked===null?'Unlock status missing from save.':row.tier===1?'Unlock Marble Filling to enable this bar.':'Unlock Rubber Ducky to enable this bar.'}</p>`}</article>`).join('')}</div><p class="fountain-note">From your imported save, not a live countdown. Water Bender: ${timers.active===null?'unknown':Number(timers.active.toFixed(3))+'×'} active speed. Arcade Fountain Speed: ${timers.arcade===null?'unknown':Number(timers.arcade.toFixed(3))+'%'}. Water Bender speeds up all three bars while standing in the Fountain; Arcade and Fountain Filling speed up the coin bar.${timers.companionNote?' '+esc(timers.companionNote):''}</p></section>`;
}
const api={calculate,duration,html};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FountainTimers=api;
})(typeof window!=='undefined'?window:globalThis);
