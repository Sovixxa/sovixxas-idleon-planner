(function(root){
'use strict';
const guides={
 'Cooking efficiency and prowess':['base','Cooking','Raise Cooking efficiency through strength, equipment, stamps, talents and skill efficiency bonuses. Prowess changes the efficiency curve. This base contribution caps at 1; more efficiency above that threshold does not add EXP multiplier.'],
 'Left Hand of Learning':['add','Maestro talents','Level Left Hand of Learning on Maestro. Its bonus depends on skill levels and which character is cooking. Raise talent caps with library books.'],
 'Cooking EXP meals':['add','Cooking meals','Discover and level meals with Cooking EXP bonuses. Meal amplifiers and your account meal cap determine their effective bonus.'],
 "Chef's Essentials":['add','Post Office','Spend boxes on Chef’s Essentials and raise its Cooking EXP reward. The saved character’s allocation applies.'],
 'Cooking EXP cards':['add','Cards','Collect and upgrade cards whose effect is Cooking EXP gain. This Cooking-specific card pool uses account cards.'],
 'Apocalypse Chow':['add','Blood Berserker talents','Level Apocalypse Chow and finish its monster kill requirements on this character. EXP scales with qualifying Chows and effective talent level.'],
 'Tempestuous Emotions':['add','Warrior talents','Invest in Tempestuous Emotions. Library books and bonus talent levels raise its available strength.'],
 'Ladle statue':['add','Statues','Deposit Ladle statues and improve statue amplifiers. Statue levels have no fixed cap.'],
 'Cooking Skill Mastery':['add','Rift','Unlock Skill Mastery and reach Cooking’s first mastery reward for +25% EXP.'],
 'Cooking ballot':['add','Bonus Ballot','The Cooking EXP ballot applies while its bonus is active. Ballot amplifiers change its strength.'],
 'Cooking Knowledge':['multi','Upgrade Vault','Purchase Cooking Knowledge levels. Vault amplifiers and account cap extensions affect this separate multiplier.'],
 'Skill EXP Meritocracy':['multi','Meritocracy','The winning Skill EXP Meritocracy bonus multiplies Cooking EXP. Its strength depends on your ballot boosters.'],
 'Skillium Fancyson':['multi','Legend Talents','Spend Legend Points on Skillium Fancyson. Research can extend its talent cap.'],
 'Whale companion':['multi','Companions','Whale’s active owned, upgraded or borrowed effect multiplies skill EXP.'],
 'Star signs':['shared','Star signs','Activate Skill EXP signs through equipped or infinite signs. Sign amplifiers affect their contribution.'],
 'Chaotic Efaunt card':['shared','Cards','Equip and upgrade the Chaotic Efaunt card. Equipped-card amplification applies.'],
 'Passive Skill EXP cards':['shared','Cards','Collect and upgrade passive Skill EXP cards; these do not need an equipped slot.'],
 'Arcade Skill EXP':['shared','Arcade','Spend arcade points on the Skill EXP upgrade.'],
 'Golden Ham':['shared','Golden food','Equip Golden Ham or unlock its Beanstalk benefit. Quantity and golden food effect determine the bonus.'],
 'Card set':['shared','Card sets','Select the Skill EXP card set and upgrade its constituent cards.'],
 'Green Tube enhancement':['shared','Voidwalker / Bubonic Conjuror','Enhancement Eclipse unlocks the Green Tube enhancement. Its contribution depends on your effective Green Tube bonus.'],
 'Lucky Charm enhancement':['shared','Voidwalker talents','Enhancement Eclipse unlocks the Lucky Charm enhancement for qualifying Maestro-class characters.'],
 'EXP shrine':['shared','Construction shrines','Level the EXP shrine and meet its placement or global activation conditions.'],
 'Seesaw statue':['shared','Statues','Deposit Seesaw statues. Statue amplifiers strengthen the bonus; levels have no fixed cap.'],
 'Unending Energy':['shared','Worship prayers','Equip Unending Energy and upgrade it with souls for its Skill EXP blessing.'],
 'Balance of Proficiency':['shared','Worship prayers','Equip and upgrade Balance of Proficiency for its Skill EXP blessing.'],
 'Skilled Dimwit curse':['shared','Worship prayers','Skilled Dimwit subtracts Skill EXP while active. Unequip it when prioritizing EXP if its efficiency benefit does not compensate.'],
 'Royal Sampler curse':['shared','Worship prayers','The Royal Sampler subtracts Skill EXP while active. Check your saved prayer loadout.'],
 'Skill EXP equipment':['shared','Equipment','Equip items with Skill EXP stats. This row totals the applicable gear bonuses.'],
 'Maestro Transfusion':['shared','Maestro talents','Activate Maestro Transfusion for its Skill EXP effect. The saved active buff determines the bonus.'],
 'Salt Lick':['shared','Construction','Purchase the EXP upgrade at the Salt Lick using its required materials.'],
 'Dungeon Flurbo EXP':['shared','Party Dungeons','Spend Flurbos on the EXP passive upgrade.'],
 'Myriad Crate':['shared','Post Office','Allocate boxes to Myriad Crate on this character to improve its Skill EXP reward.'],
 'Flutterbis':['shared','Divinity','Activate the relevant Flutterbis link effect. The linked god’s level affects the bonus.'],
 'Achievements':['shared','Achievements','Complete the Skill EXP achievements. Their direct rewards add together here.'],
 '400-level Skill Mastery':['shared','Rift','Reach 400 combined account levels in each skill for its shared Skill EXP reward.'],
 'All Skill Mastery':['shared','Rift','Raise combined account skill levels to unlock All Skill EXP mastery rewards.'],
 'Shiny pets':['shared','Breeding','Level shiny pets with the Skill EXP bonus.'],
 'MSA Skill EXP superbit':['shared','Gaming / Worship','Unlock MSA Skill EXP in the Superbits menu and progress its associated worship benefit.'],
 'Bloque companion':['shared','Companions','Bloque’s active companion effect adds Skill EXP. Its upgraded effect is included when available.'],
 'Summoning rewards':['shared','Summoning','Win battles granting Skill EXP and improve winner reward amplifiers.'],
 'Guild Skill EXP':['shared','Guild','Improve the guild’s Skill EXP bonus. Guild data must be present in the export.'],
 'Owl Skill XP':['shared','Owl','Progress the Owl and its Skill XP bonus.'],
 'Chizoar armor set':['shared','Armor sets','Unlock the Chizoar armor set for its fixed +40% account-wide Skill EXP bonus.'],
 'Hole schematic':['shared','The Hole','Build and improve the Skill EXP schematic and its associated progression.'],
 'Friend bonus':['shared','Friends','Progress the Skill EXP friend bonus.']
};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>Number.isFinite(v)?v.toLocaleString(undefined,{maximumFractionDigits:2}):'—';
const cache=new WeakMap();
function calculate(raw){if(cache.has(raw))return cache.get(raw);const job=new Promise(resolve=>{let w,t;const finish=r=>{clearTimeout(t);w?.terminate();resolve(r);};try{w=new Worker('cooking-exp-worker.js');w.onmessage=e=>finish(e.data);w.onerror=()=>finish({error:true});t=setTimeout(()=>finish({error:true}),60000);w.postMessage(raw);}catch{finish({error:true});}});cache.set(raw,job);job.then(r=>{if(r.error)cache.delete(raw);});return job;}

function summarize(model,name){
 const values=(model?.characters||[]).map(c=>({name:c.name,value:c.breakdown?.find(r=>r.name===name)?.value})).filter(x=>Number.isFinite(x.value));
 const min=values.length?Math.min(...values.map(x=>x.value)):null,max=values.length?Math.max(...values.map(x=>x.value)):null;
 const progress=model?.progress?.[name]||{},cap=Number.isFinite(progress.cap)?progress.cap:null;
 return {values,min,max,progress,cap,maxed:cap!==null&&min!==null&&min>=cap-1e-8};
}
function mount(host,raw={}){
 let model=null,loading=true;
 const limits=root.CookingExpLimits.limits,characterSources=root.CookingExpLimits.characterSources;
 host.innerHTML=`<section class="artifact-chance cook-exp-account"><div class="exp-card" data-cook-exp-total role="status"><h3>Account-wide Cooking EXP</h3><p>Reading account progress…</p></div><div class="artifact-filters"><label>Find a source<input type="search" data-cook-exp-search placeholder="Search bonus, breakpoint or location…"></label><label>Show<select data-cook-exp-filter><option value="">All sources</option><option value="add">Cooking bonuses</option><option value="shared">All Skill EXP</option><option value="multi">Multipliers</option><option value="base">Base</option></select></label><label class="artifact-upgrades"><input type="checkbox" data-cook-exp-hide> Hide maxed bonuses</label><span data-cook-exp-count aria-live="polite"></span></div><div class="artifact-table-wrap"><table class="artifact-table"><thead><tr><th>Bonus / where to get it</th><th>Your account</th><th>Maximum / hard cap</th><th>Breakpoints / soft caps</th></tr></thead><tbody data-cook-exp-rows></tbody></table></div><details class="artifact-help"><summary>How to read account-wide progress</summary><p>Every source is listed once for the account. Shared bonuses show one value. Where active loadouts, talents or links differ, the account column shows the saved range across all characters; expand the source to see their values and saved levels. Ranges are not added into a fictional account EXP multiplier.</p><p>Maximum bonuses use current account amplifiers where available. A talent’s asymptote is not an attainable maximum. “No fixed cap” and “account-dependent” sources remain visible when hiding maxed bonuses. Loadout-dependent sources count as maxed only when every displayed value reaches the verified cap.</p><p>For an individual character, add the efficiency base, Cooking bonuses and shared All Skill EXP bonuses, then multiply by Cooking Knowledge, Skill EXP Meritocracy, Skillium Fancyson and Whale. The result has a 0.1× floor. Meal production, ladle yield and Cooking Mastery EXP are separate.</p></details></section>`;
 const search=host.querySelector('[data-cook-exp-search]'),filter=host.querySelector('[data-cook-exp-filter]'),hide=host.querySelector('[data-cook-exp-hide]');
 const display=(value,kind)=>kind==='multi'?fmt(value)+'×':kind==='base'?fmt(value):`${value>=0?'+':''}${fmt(value*100)}%`;
 function paint(){
  const rows=Object.entries(guides).map(([name,guide])=>({name,guide,state:summarize(model,name),limit:limits[name]})).filter(({name,guide,limit,state})=>(!filter.value||filter.value===guide[0])&&(!hide.checked||!state.maxed)&&[name,...guide,...limit,state.progress.current,state.progress.next].join(' ').toLowerCase().includes(search.value.toLowerCase()));
  host.querySelector('[data-cook-exp-total]').innerHTML=`<h3>Account-wide Cooking EXP</h3><p>${loading?'Reading account progress…':model?.characters?.length?`${Object.keys(guides).length} sources · account unlocks, current caps and breakpoints · ${model.characters.length} characters included`:model?.error?'Could not calculate this save. The complete cap and breakpoint guide is still available. <button data-cook-exp-retry>Retry</button>':'Import your save to see account progress alongside every source’s caps and breakpoints.'}</p>`;
  host.querySelector('[data-cook-exp-retry]')?.addEventListener('click',()=>mount(host,raw));
  host.querySelector('[data-cook-exp-rows]').innerHTML=rows.map(({name,guide:[kind,where,help],state,limit:[maximum,breakpoints,soft]})=>{
   const {min,max,values,progress,cap,maxed}=state,dependent=characterSources.has(name)||min!==max;
   const current=min===null?(loading?'…':'Save needed'):min===max?display(min,kind):display(min,kind)+' – '+display(max,kind);
   return `<tr><td><details><summary><strong>${esc(name)}</strong><small>${esc(where)} · ${{base:'Base',add:'Cooking bonus',shared:'All Skill EXP',multi:'Multiplier'}[kind]}</small></summary><div class="artifact-row-details"><p><b>Where to get it:</b> ${esc(help)}</p>${progress.current?`<p><b>Saved account progress:</b> ${esc(progress.current)}</p>`:''}<p><b>Breakpoints:</b> ${esc(breakpoints)}</p>${dependent&&values.length?`<details><summary>Saved values across ${values.length} characters</summary>${values.map(x=>`<p>${esc(x.name)}: ${display(x.value,kind)}</p>`).join('')}</details>`:''}</div></details></td><td><strong class="artifact-current">${current}</strong><small>${dependent?'Account unlock / character activation':'Account-wide bonus'}</small>${progress.current&&progress.current.length<150?`<small>${esc(progress.current)}</small>`:''}${maxed?'<small>Maxed at current cap</small>':''}</td><td>${cap!==null?`<strong class="artifact-maximum">${display(cap,kind)}</strong>`:''}<p>${esc(progress.maximum||maximum)}</p>${progress.maximum?`<small>${esc(maximum)}</small>`:''}</td><td>${progress.next?`<strong>${esc(progress.next)}</strong>`:''}<p>${esc(breakpoints)}</p><small><b>Soft cap:</b> ${esc(soft)}</small></td></tr>`;
  }).join('')||'<tr><td colspan="4">No matching sources.</td></tr>';
  host.querySelector('[data-cook-exp-count]').textContent=rows.length+' sources';
 }
 search.oninput=filter.onchange=hide.onchange=paint;paint();calculate(raw).then(result=>{if(!host.isConnected)return;model=result;loading=false;paint();});
}
root.CookingExp={guides,mount,summarize};
})(typeof window!=='undefined'?window:globalThis);
