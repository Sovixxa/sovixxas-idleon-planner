(function(root){'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label=v=>String(v??'').replace(/^%_?/,'').replaceAll('_',' ');
const fmt=v=>Number(v).toLocaleString(undefined,{maximumFractionDigits:2});
const value=(name,n)=>`+${fmt(n)}${String(name).startsWith('%')?'%':''}`;
const cache=new WeakMap(),requests=new WeakMap();
function load(raw){
 if(cache.has(raw))return cache.get(raw);
 const promise=new Promise((resolve,reject)=>{
  const worker=new Worker('hat-rack-worker.js');
  const timer=setTimeout(()=>finish(Error('Hat Rack calculation timed out. Please retry.')),60000);
  function finish(error,result){clearTimeout(timer);worker.terminate();error?reject(error):resolve(result);}
  worker.onmessage=e=>finish(e.data.error?Error(e.data.error):null,e.data);
  worker.onerror=()=>finish(Error('Could not load the Hat Rack calculator.'));
  worker.postMessage(raw);
 });cache.set(raw,promise);promise.catch(()=>cache.delete(raw));return promise;
}
function bonuses(hat,multi){
 const rows=['Weapon_Power','STR','AGI','WIS','LUK','Defence'].filter(k=>Number(hat[k])).map(k=>({name:k,value:Number(hat[k])*(hat.isAcquired?multi:1)}));
 for(const i of [1,2])if(hat[`UQ${i}txt`]&&Number(hat[`UQ${i}val`]))rows.push({name:hat[`UQ${i}txt`],value:Number(hat[`UQ${i}val`])});
 return rows;
}
function acquisition(hat){
 const guide=root.HAT_SOURCES?.records?.[hat.rawName];
 const routes=guide?.routes||[];
 return `<section class="hr-howto"><h3>How to get this hat</h3><p class="hr-premium">${hat.Type==='PREMIUM_HELMET'?'Premium hat · Hat Rack eligible':'Hat type not confirmed'}</p><p class="hr-howto-intro">Premium is the item type, not a requirement to spend money.</p>${routes.length?routes.map(r=>`<article class="hr-source"><span class="hr-source-kind">${esc(r.kind)}</span><h4>${esc(r.title)}</h4><ol>${r.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>${r.materials?`<h5>Materials</h5><ul class="hr-materials">${r.materials.map(m=>`<li><strong>${fmt(m.quantity)}×</strong> <a href="${esc(m.url)}" target="_blank" rel="noopener noreferrer">${esc(m.name)}</a></li>`).join('')}</ul>`:''}${r.note?`<p class="hr-source-note">${esc(r.note)}</p>`:''}${r.url?`<a class="hr-reference" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">Source reference ↗</a>`:`<small class="hr-evidence">${esc(r.evidence)}</small>`}</article>`).join(''):'<p class="hr-unverified">Acquisition source not yet verified. No drop, shop, or recipe is assumed for this hat.</p>'}${guide?`<a class="hr-reference" href="${esc(guide.url)}" target="_blank" rel="noopener noreferrer">${esc(guide.name)} — item reference ↗</a>`:''}<p class="hr-source-note">Once obtained, give the hat to Harold at the World 3 Hat Rack, then import an updated save.</p></section>`;
}
function content(m,filter='all',selected=null){
 const hats=m.allPremiumHelmets,visible=hats.filter(h=>filter==='all'||(filter==='collected'?h.isAcquired:!h.isAcquired));
 const hat=hats.find(h=>h.rawName===selected);
 const ordered=['Weapon_Power','STR','AGI','WIS','LUK','Defence','%_DROP_RATE','%_MONEY','%_XP_FROM_MONSTERS','%_SKILL_EXP','%_MULTIKILL','%_ALL_STATS','%_SKILL_EFFICIENCY','%_ALL_AFK_GAIN','%_DAMAGE_MULTI','%_DIVINITY_EXP','%_EXTRA_BONES','%_BONUS_MONEY','%_CLASS_EXP_MULTI','%_DUST_MULTI','%_DROP_RATE_MULTI','%_AFK_GAINS_MULTI','%_EXTRA_TACHYONS','%_BONUS_KILLS','%_MASTERCLASS_DROPS','%_MARBLE_DROP'];
 const totals=[...m.hatBonuses].sort((a,b)=>{const rank=n=>ordered.includes(n)?ordered.indexOf(n):ordered.length;return rank(a.name)-rank(b.name);});
 return `<div class="hr-layout"><section class="hr-collection" aria-label="Premium hat collection"><div class="hr-controls"><label>Show <select id="hatRackFilter"><option value="all" ${filter==='all'?'selected':''}>All hats</option><option value="collected" ${filter==='collected'?'selected':''}>Collected</option><option value="missing" ${filter==='missing'?'selected':''}>Missing</option></select></label><small>${visible.length} hats</small></div><div class="hr-rack">${visible.map(h=>`<button class="hr-hat ${h.isAcquired?'collected':'missing'} ${h.rawName===selected?'selected':''}" data-hat="${esc(h.rawName)}" aria-label="${esc(label(h.displayName))} — ${h.isAcquired?'Collected':'Missing'}" aria-pressed="${h.rawName===selected}" title="${esc(label(h.displayName))} · Premium hat · ${esc(root.HAT_SOURCES?.records?.[h.rawName]?.routes?.map(r=>r.kind).filter((v,i,a)=>a.indexOf(v)===i).join(', ')||'Source unverified')}"><img src="assets/${esc(h.rawName)}_x1.png" alt="" loading="lazy"></button>`).join('')||'<p>No hats in this view.</p>'}</div><p class="hr-legend">Dimmed hats are missing. Select a hat for details.</p></section><section class="hr-board"><header><p class="eyebrow">World 3 · Collection</p><h2>The Hat Rack</h2><p>Premium hats collected: <strong>${m.totalHats} / ${hats.length}</strong></p><progress value="${m.totalHats}" max="${hats.length}" aria-label="Premium hats collected"></progress></header><div class="hr-bonuses">${totals.map(b=>`<div><strong>${value(b.name,b.value)}</strong><span>${esc(label(b.name))}</span></div>`).join('')||'<p>Deposit premium hats in game to activate rack bonuses.</p>'}</div><footer><section class="hr-detail" aria-live="polite">${hat?`<div class="hr-detail-title"><img src="assets/${esc(hat.rawName)}_x1.png" alt=""><div><h3>${esc(label(hat.displayName))}</h3><span>${hat.isAcquired?'Collected · rack contribution':'Missing · base item bonuses'}</span></div></div><div class="hr-hat-bonuses">${bonuses(hat,m.bonusMulti).map(b=>`<span>${value(b.name,b.value)} ${esc(label(b.name))}</span>`).join('')||'<span>No stat bonuses.</span>'}</div>${acquisition(hat)}`:'<h3>Click a hat on the left for info</h3><p>Browse your collection and each hat’s bonuses.</p>'}</section><div class="hr-multiplier"><span>Hat Rack Bonus Multi</span><strong>${fmt(m.bonusMulti)}×</strong><small>Included in collected hat contributions</small></div></footer><p class="hr-save-note">From your imported save. Deposit hats with Harold in game, then import an updated save.</p></section></div>`;
}
async function render(host,raw){
 const token={};requests.set(host,token);
 host.innerHTML='<section class="panel"><h2>The Hat Rack</h2><p role="status">Loading your hat collection…</p></section>';
 try{const result=await load(raw);if(requests.get(host)!==token||host.dataset.page!=='hatRack')return;
  if(result.missing){host.innerHTML='<section class="panel"><h2>The Hat Rack</h2><p>No Hat Rack collection was found in this save. Import a recent full export to see your hats and bonuses.</p></section>';return;}
  let filter='all',selected=null;
  const paint=()=>{host.innerHTML=content(result.rack,filter,selected);host.querySelector('#hatRackFilter').onchange=e=>{filter=e.target.value;paint();host.querySelector('#hatRackFilter').focus();};host.querySelectorAll('[data-hat]').forEach(button=>button.onclick=()=>{selected=button.dataset.hat;paint();[...host.querySelectorAll('[data-hat]')].find(b=>b.dataset.hat===selected)?.focus({preventScroll:true});});};paint();
 }catch(error){if(requests.get(host)===token&&host.dataset.page==='hatRack')host.innerHTML=`<section class="panel"><h2>The Hat Rack</h2><p role="alert">${esc(error.message)}</p><button id="hatRackRetry">Retry</button></section>`;host.querySelector('#hatRackRetry')?.addEventListener('click',()=>render(host,raw));}
}
root.HatRack={render,content,bonuses,acquisition};
})(window);
