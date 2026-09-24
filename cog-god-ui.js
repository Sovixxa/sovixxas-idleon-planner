(function(root){
 'use strict';
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:1,notation:Math.abs(n)>=10000?'compact':'standard'});
 const coord=i=>'ABCDEFGH'[Math.floor(i/12)]+(i%12+1);
 const shapeName={'':'EXP filler',up:'↑ Above',down:'↓ Below',left:'← Left',right:'→ Right',row:'↔ Entire row',column:'↕ Entire column',adjacent:'+ Adjacent',diagonal:'× Diagonal',corners:'⋮ Four distant corners',around:'◎ Surrounding tiles',everything:'∞ Whole board'};
 const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v;}catch{return null;}};
 function create(host,model,data){
  const levels=Object.entries(data).filter(([key])=>/^Lv0_\d+$/.test(key)).map(([,v])=>{const p=parse(v);return Number((p?.h||p)?.[8])||0;});
  const level=Math.max(1,...levels,...model.slots.filter(s=>s.isPlayer).map(s=>Number(s.level)||0));
  const panel=document.createElement('details');panel.className='cog-god-panel';
  panel.innerHTML=`<summary>God board <span>Perfect-roll Construction EXP target</span></summary><p>Plan the cogs you could roll next. Each target cog has four maximum EXP rolls and the strongest player EXP buff available for its shape.</p><form class="cog-god-controls"><label>Highest Construction level at roll time<input name="level" type="number" min="1" max="10000000" step="1" required value="${level}"></label><label><input name="jewels" type="checkbox" checked> Include perfect Jewel cogs (155% row/column)</label><label><input name="fullBoard" type="checkbox" checked> Assume all 96 board tiles unlocked</label><button type="submit">Find god board</button><button type="button" class="god-cancel" hidden>Cancel</button></form><p class="cog-god-status" role="status">Choose your assumptions, then find a target.</p><div class="cog-god-result"></div><details class="cog-god-assumptions"><summary>What this target assumes</summary><p>Uses your current board characters and their saved underlying EXP rates. Searches their positions and fills usable ordinary-cog slots with hypothetical perfect rolls: Superb 40%, Ultimate 65%, and optionally Jewel 155% player EXP buffs. Keeps placed Yin/Excogia and Yang cogs, production characters, and small-cog rails in their saved positions. Shelf special cogs and character roster changes are outside this search.</p><p>Roll level changes future cog stats only; it does not forecast character leveling or account upgrades. Perfect Jewel cogs assume access to Jewel generation and unlimited future rolls. This is a best-found layout, not a proof of the absolute maximum. Ordinary cog EXP keeps growing with Construction level. Current small-cog effects stay included in saved character rates.</p></details>`;
  const form=panel.querySelector('form'),status=panel.querySelector('[role=status]'),result=panel.querySelector('.cog-god-result'),submit=form.querySelector('[type=submit]'),cancel=form.querySelector('.god-cancel');
  const allowance=root.CogOptimizer.jewelAllowance(data);
  form.insertAdjacentHTML('afterbegin','<label>Target <select name="mode"><option value="realistic">Realistic · limited new rolls</option><option value="perfect">Perfect · unlimited rolls</option></select></label>');
  const budget=document.createElement('fieldset');budget.className='god-realistic-controls';
  budget.innerHTML=`<legend>30-day rolling budget</legend><label>Days / future daily resets<input name="days" type="number" min="0" max="365" step="1" required value="30"></label><label>Jeweled cogs per day<input name="dailyJewels" type="number" min="0" max="100" step="1" required value="${allowance.daily??0}" ${allowance.daily!=null?'readonly':''}></label><label>Ordinary production tier<select name="ordinaryTier"><option value="0">Basic</option><option value="1">Decent</option><option value="2">Superb</option><option value="3" selected>Ultimate</option></select></label><label>Ordinary rolls per day, after Jewel claims<input name="ordinaryDaily" type="number" min="0" max="5000" step="1" required value="100"></label><p>${allowance.daily!=null?`Saved daily Jewel cap: <strong>${allowance.daily}</strong>${allowance.points!=null?` · Cog Lover ${allowance.points} points`:''}.${allowance.unlocked===false?' Jewel production is locked in this save.':''}`:'Daily Jewel allowance is unavailable. Enter the cap shown in game; defaults to zero until supplied.'}${allowance.remaining!=null?` ${allowance.remaining} claims remain in the saved day.`:''} This forecast counts future daily resets; today's remaining claims are not added. Ordinary rolls/day is an editable assumption, not a measured production rate.</p><p class="god-budget-total"></p>`;
  form.insertBefore(budget,submit);
  let worker=null,run=0;
  const stop=()=>{worker?.terminate();worker=null;submit.disabled=false;cancel.hidden=true;};
  cancel.onclick=()=>{run++;stop();status.textContent='Search cancelled. You can start a new search.';};
  form.onsubmit=e=>{
   e.preventDefault();if(!form.reportValidity())return;stop();const id=++run;
   const options={mode:form.elements.mode.value,level:Number(form.elements.level.value),jewels:form.elements.jewels.checked,fullBoard:form.elements.fullBoard.checked,days:Number(form.elements.days.value),dailyJewels:Number(form.elements.dailyJewels.value),dailyLimit:allowance.daily,ordinaryDaily:Number(form.elements.ordinaryDaily.value),ordinaryTier:Number(form.elements.ordinaryTier.value)};
   status.textContent=options.mode==='realistic'?'Sampling future rolls and optimizing five scenarios…':'Searching perfect-roll layouts…';result.replaceChildren();submit.disabled=true;cancel.hidden=false;
   try{
    worker=new Worker('cog-god-worker.js');host.cogGodWorker=worker;
    worker.onmessage=({data})=>{if(id!==run)return;if(data.progress){status.textContent=data.progress.message;return;}stop();if(data.error){status.textContent=data.error;return;}status.textContent=data.result.mode==='realistic'?'Realistic target ready · middle result from five sampled roll budgets':'Best-found target ready · hypothetical cogs';paint(data.result);};
    worker.onerror=()=>{if(id!==run)return;stop();status.textContent='Could not load the god-board worker. Refresh and try again.';};
    worker.postMessage({model,options});
   }catch(error){stop();status.textContent=error.message;}
  };
  const perfectAssumptions=panel.querySelector('.cog-god-assumptions').innerHTML;
  const updateBudget=()=>{if(form.elements.mode.value==='realistic')panel.querySelector('summary span').textContent=form.elements.days.value+'-day Construction EXP forecast';budget.querySelector('legend').textContent=`${form.elements.days.value}-day rolling budget`;budget.querySelector('.god-budget-total').textContent=`Budget: ${fmt(Number(form.elements.days.value)*Number(form.elements.dailyJewels.value))} Jewel rolls + ${fmt(Number(form.elements.days.value)*Number(form.elements.ordinaryDaily.value))} ordinary rolls.`;};
  budget.oninput=updateBudget;updateBudget();
  form.elements.mode.onchange=()=>{
   run++;stop();result.replaceChildren();const real=form.elements.mode.value==='realistic';budget.hidden=!real;
   budget.querySelectorAll('input,select').forEach(el=>el.disabled=!real);
   for(const name of ['jewels','fullBoard'])form.elements[name].closest('label').hidden=real;
   submit.textContent=real?'Find realistic board':'Find god board';
   panel.querySelector('summary span').textContent=real?form.elements.days.value+'-day Construction EXP forecast':'Perfect-roll Construction EXP target';
   panel.querySelector('p').textContent=real?'Build toward a strong board using your owned cogs plus a limited number of new rolls. Jewel quality, directional bonuses and base stats are sampled from the game’s roll probabilities.':'Plan the cogs you could roll next. Each target cog has four maximum EXP rolls and the strongest player EXP buff available for its shape.';
   panel.querySelector('.cog-god-assumptions').innerHTML=real?'<summary>What this forecast assumes</summary><p>Uses your current unlocks, board characters, production assignments, rails, and owned board/shelf cogs. Adds only the rolls in the budget. The displayed board is the middle EXP result from five sampled futures, each optimized with a bounded search. This is an illustration, not a confidence interval or a guarantee of what you will roll.</p><p>Level and account bonuses stay fixed. Set ordinary rolls/day to what you can produce after Jewel claims consume their stored batch. The search keeps a bounded pool of promising sampled EXP cogs. It does not forecast future unlocks, automatic cog upgrades, or character leveling.</p>':perfectAssumptions;
   status.textContent='Choose your assumptions, then find a target.';
  };
  form.elements.mode.onchange();
  function paint(plan){
   const ratio=plan.before.exp>0?plan.after.exp/plan.before.exp:0,assets=new Set(root.COG_ASSETS||[]);
   result.innerHTML=`<div class="cog-god-stats"><div><small>Saved player EXP / hour</small><strong>${fmt(plan.before.exp)}</strong></div><div><small>Target player EXP / hour</small><strong>${fmt(plan.after.exp)}</strong></div><div><small>Target / saved</small><strong>${fmt(ratio)}×</strong></div></div><p>Roll level ${fmt(plan.level)} · ${plan.jewels?'Jewel cogs included':'Superb + Ultimate cogs'} · ${plan.fullBoard?'Fully unlocked board assumed':'Current unlocks'} · current characters and small-cog rails. Gold tiles are cogs to roll; character portraits and retained special cogs are from your save.</p><div class="cog-god-layout"><div><div class="cog-god-grid" aria-label="God board target"></div><p class="muted">Select or hover a tile to see its roll target and coverage. Teal marks tiles it boosts; purple marks cogs boosting it.</p><div class="cog-god-detail" aria-live="polite">Select a tile to inspect its buffs.</div></div><div><h4>Cogs to roll</h4><p>Keep the shape and <strong>Player Construction EXP</strong> bonus shown below, alongside high ordinary EXP. These are perfect-roll targets, not minimum keep thresholds.</p><div class="cog-god-shopping"></div><h4>Character targets</h4><ul>${plan.characters.map(c=>`<li>${esc(c.name)} → <strong>${coord(c.to)}</strong> · ${fmt(c.exp)} EXP/h</li>`).join('')}</ul><p>Each targeted roll spends all four base-stat rolls on EXP, so its own build and flag stats are zero. Buffs stack additively and never amplify other cogs’ buff percentages.</p></div></div>${plan.warnings.length?`<p class="cog-data-warning">${plan.warnings.map(esc).join(' ')}</p>`:''}`;
   const grid=result.querySelector('.cog-god-grid');grid.innerHTML='<span></span>'+Array.from({length:12},(_,i)=>`<span class="cog-coordinate">${i+1}</span>`).join('');
   const buttons=[];
   plan.board.forEach((s,i)=>{
    if(i%12===0)grid.insertAdjacentHTML('beforeend',`<span class="cog-coordinate">${'ABCDEFGH'[Math.floor(i/12)]}</span>`);
    const sprite=s.isPlayer?'ClassIcons'+s.classId+'.png':s.item+'.png',button=document.createElement('button');
    button.type='button';button.className='cog-god-tile'+(s.ideal?' is-ideal':'')+(s.isPlayer?' is-character':'');
    button.innerHTML=(assets.has(sprite)?`<img src="assets/${sprite}" alt="">`:s.empty?'·':'?')+`<small>${s.isPlayer?'EXP':s.stats.h?(shapeName[s.stats.h]||s.stats.h).split(' ')[0]:s.empty?'':'◆'}</small>`;
    button.setAttribute('aria-label',`${coord(i)}: ${s.isPlayer?s.name:s.name||s.item}, ${s.stats.h||'no directional buff'}`);
    const inspect=()=>{
     buttons.forEach(b=>b.classList.remove('god-source','god-target','god-selected'));button.classList.add('god-selected');
     plan.rates[i].targets.forEach(t=>buttons[t]?.classList.add('god-target'));plan.rates[i].sources.forEach(t=>buttons[t]?.classList.add('god-source'));
     result.querySelector('.cog-god-detail').innerHTML=`<strong>${coord(i)} · ${esc(s.isPlayer?s.name:s.name||s.item)}</strong><p>${s.ideal?'Roll target':s.empty?'Empty / protected tile':'Saved piece'} · Own EXP bonus: ${fmt(s.stats.d||0)}%${s.stats.h?` · ${esc(shapeName[s.stats.h]||s.stats.h)} · +${fmt(plan.rates[i].stats.f?.value||0)}% player EXP`:''}</p><p>Boosts: ${plan.rates[i].targets.map(coord).join(', ')||'None'}<br>Receives +${fmt(plan.rates[i].boosts.exp)}% player EXP from: ${plan.rates[i].sources.map(coord).join(', ')||'None'}</p>`;
     if(s.forecast)result.querySelector('.cog-god-detail').insertAdjacentHTML('beforeend',`<p>Sampled base stats: ${fmt(s.stats.a||0)} build/h · ${fmt(s.stats.c||0)} flaggy/h. Directional roll: +${fmt(s.stats.e||0)}% build · +${fmt(s.stats.f||0)}% player EXP · +${fmt(s.stats.g||0)}% flaggy · +${fmt(s.stats.j||0)}% local flag speed${s.stats.k?' · “No effect” roll: no benefit':''}.</p>`);
    };
    button.onclick=inspect;button.onfocus=inspect;button.onmouseenter=inspect;buttons.push(button);grid.append(button);
   });
   result.querySelector('.cog-god-shopping').innerHTML=plan.shopping.map(c=>`<details><summary><strong>${c.positions.length}× ${c.tier===4?'Jewel':c.tier===3?'Ultimate':'Superb'}</strong> · ${esc(shapeName[c.shape])}<small class="cog-god-roll-stats">+${c.d}% ordinary EXP${c.boost?` · +${c.boost}% player EXP`:''}</small></summary><p>Place at ${c.positions.map(coord).join(', ')}</p></details>`).join('');
   if(plan.mode==='realistic'){
    const f=plan.forecast;
    result.querySelector('.cog-god-stats').insertAdjacentHTML('afterend',`<section class="god-forecast-summary"><strong>${f.days} days · ${f.jewelRolls} Jewel rolls · ${f.ordinaryRolls} ordinary rolls</strong><p>Five sampled outcomes: ${fmt(f.low)}–${fmt(f.high)} player EXP/h. Showing the middle outcome, including rearrangements of owned cogs. The range is illustrative, not a confidence interval.</p><p>This board uses <strong>${f.newJewels} new Jewels and ${f.newOrdinary} new ordinary cogs</strong>; other rolls were not selected. Bluegem with any player EXP row/column roll: ${fmt(f.expectedBluegemXP)} expected across this budget, with a ${fmt(f.chanceBluegemXP*100)}% chance of at least one. A perfect 155% roll is rarer.</p></section>`);
    result.querySelector(':scope > p').textContent=`Roll level ${fmt(plan.level)} · current unlocks and characters. Gold tiles are sampled future cogs; other tiles are owned pieces. Build these upgrades as suitable rolls arrive; this is not a sequence of swaps you can make today.`;
    const heading=result.querySelector('.cog-god-layout h4');heading.textContent='Sampled upgrades to pursue';heading.nextElementSibling.textContent='These are actual stat combinations from the sampled rolls, not perfect caps or mandatory keep thresholds. Keep a new cog when it improves your owned-board optimizer.';
    result.querySelector('.cog-god-layout > div:last-child > p:last-child').textContent='Future cogs retain their sampled mixture of build, flaggy and EXP rolls. Your owned cogs remain available to the search.';
    result.querySelector('.cog-god-shopping').innerHTML=plan.shopping.length?plan.shopping.map(c=>`<details><summary><strong>${c.positions.length}× ${esc(c.name)}</strong> · ${esc(shapeName[c.shape])}<small class="cog-god-roll-stats">+${c.d}% ordinary EXP${c.boost?` · +${c.boost}% player EXP`:''}</small></summary><p>Target positions: ${c.positions.map(coord).join(', ')}</p></details>`).join(''):'<p>No sampled new cog improved the selected layout.</p>';
   }
  }
  const wrapper=document.createElement('div');wrapper.append(panel);if(root.CogReference)wrapper.append(root.CogReference.create(level));return wrapper;
 }
 root.CogGodBoard={create};
})(typeof window!=='undefined'?window:globalThis);
