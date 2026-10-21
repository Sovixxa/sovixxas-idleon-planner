(function(root){
'use strict';
const qualifies=value=>Number.isFinite(value)&&value>775.9&&value<778.9;
const exact=value=>Number.isFinite(value)?value.toLocaleString('en',{maximumFractionDigits:6}):'Unavailable';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function multiplier(farming){
 const sources=farming.stats?.magicBean?.categories?.flatMap(c=>c.sources||[])||[];
 const get=name=>sources.find(s=>s.name===name)?.value;
 const pooled=['Deal Sweetening (Jade)','Achievement','Legumioso I (Exotic)','Legumioso II (Exotic)','Legumioso III (Exotic)','Vault'].map(get);
 const factors=['More Beenz (Market)','Largumes I (Exotic)','Largumes II (Exotic)'].map(get);
 if([...pooled,...factors].some(v=>!Number.isFinite(v)))return null;
 const result=factors.reduce((a,b)=>a*b,1)*(1+pooled.reduce((a,b)=>a+b-1,0));
 return Number.isFinite(result)&&result>0?result:null;
}
function weight(id,seeds){const seed=seeds.find(s=>id>=s.start&&id<=s.end);return seed?2.5**seed.id*1.08**(id-seed.start):0;}
function plan(base,unit,multi){
 if(![base,unit,multi].every(Number.isFinite)||base<0||unit<=0||multi<=0)return null;
 const reward=q=>Math.sqrt(base+q*unit)*multi;
 if(qualifies(reward(0)))return {quantity:0,low:0,high:0,beans:reward(0),ready:true};
 if(reward(0)>=778.9)return {overshot:true};
 let low=Math.max(0,Math.floor(((775.9/multi)**2-base)/unit)+1),high=Math.ceil(((778.9/multi)**2-base)/unit)-1;
 // Recheck strict endpoints after floating-point inversion.
 if(!qualifies(reward(low)))low++;
 if(high>=low&&!qualifies(reward(high)))high--;
 if(high<low||!Number.isSafeInteger(high)||!qualifies(reward(low)))return {unreachable:true};
 const quantity=Math.min(high,Math.max(low,Math.round(((777/multi)**2-base)/unit)));
 return {quantity,low,high,beans:reward(quantity),ready:false};
}
function cropPlans(base,multi,crops,seeds){
 return crops.filter(c=>c.found&&weight(c.id,seeds)>0).map(c=>({...plan(base,weight(c.id,seeds),multi),id:c.id})).filter(p=>p.quantity!=null).sort((a,b)=>Math.abs(a.beans-777)-Math.abs(b.beans-777)||a.quantity-b.quantity||a.id-b.id);
}
function batchPlan(base,unit,multi,quantity){
 if(!Number.isSafeInteger(quantity)||quantity<=0)return null;
 const p=plan(base,unit*quantity,multi);
 return p&&p.quantity!=null?{...p,batches:p.quantity,units:p.quantity*quantity}:p;
}
// Bounded integer search; every returned recipe is checked with the forward formula.
function solveMix(base,multi,crops,seeds,budget=100000){
 if(!Number.isFinite(base)||base<0||!Number.isFinite(multi)||multi<=0)return {status:'invalid'};
 const reward=sum=>Math.sqrt(sum)*multi;
 if(qualifies(reward(base)))return {status:'ready',items:[],beans:reward(base)};
 if(reward(base)>=778.9)return {status:'overshot'};
 const single=cropPlans(base,multi,crops,seeds)[0];
 if(single)return {status:'found',items:[{id:single.id,quantity:single.quantity}],beans:single.beans};
 const upper=(778.9/multi)**2;
 const options=crops.filter(c=>c.found).map(c=>({id:c.id,unit:weight(c.id,seeds)})).filter(c=>c.unit>0&&Number.isFinite(c.unit)&&base+c.unit<upper).sort((a,b)=>b.unit-a.unit||a.id-b.id);
 let visited=0,limited=false,answer=null;
 const search=(i,sum,items)=>{
  if(++visited>budget){limited=true;return false;}
  if(qualifies(reward(sum))){answer={status:'found',items:items.slice(),beans:reward(sum)};return true;}
  if(i>=options.length||sum>=upper)return false;
  const c=options[i],p=plan(sum,c.unit,multi);
  if(p?.quantity!=null){answer={status:'found',items:[...items,{id:c.id,quantity:p.quantity}],beans:p.beans};return true;}
  if(i===options.length-1)return false;
  const max=Math.floor((upper-sum)/c.unit);
  if(!Number.isSafeInteger(max)){limited=true;return false;}
  for(let q=max;q>=0;q--){
   if(q)items.push({id:c.id,quantity:q});
   const found=search(i+1,sum+q*c.unit,items);
   if(q)items.pop();
   if(found)return true;
   if(limited)return false;
  }
  return false;
 };
 search(0,base,[]);
 return answer||{status:limited?'limited':'none'};
}
function mount(host,result,model){
 const f=result.farming,multi=multiplier(f),stock=model.crops.reduce((sum,c)=>sum+c.quantity*weight(c.id,model.seeds),0),saved=Math.sqrt(stock)*multi;
 if(multi===null){host.innerHTML='<p class="collection-note">Bean bonuses are unavailable. Load a fresh complete account export.</p>';return;}
 const crops=model.crops.filter(c=>c.found&&weight(c.id,model.seeds)>0);
 if(!crops.length){host.innerHTML='<p class="collection-note">Discover a Farming crop and import your save to calculate a 777 trade.</p>';return;}
 host.innerHTML=`<section class="farm-extra-board farm777"><header><p class="eyebrow">FARMING · LEGUMULUCKY</p><h3>777 Trade</h3><p>Plan a crop trade with Legumulyte using your loaded account bonuses.</p></header><div class="farm-extra-stats"><article class="farm-extra-card"><h4>Saved depot trade</h4><strong>${exact(saved)} beans</strong><p>${qualifies(saved)?'Your saved depot is in the qualifying range.':saved>=778.9?'Already above the target. Adding crops cannot lower this quote.':'Below the target. Calculate your next harvest below.'}</p></article><article class="farm-extra-card"><h4>Bean multiplier</h4><strong>${exact(multi)}×</strong><p>Includes Market, Jade, achievement, Exotic and Vault bonuses.</p></article><article class="farm-extra-card"><h4>Achievement</h4><strong>${result.tradeAchievement?.completed?'Completed':result.tradeAchievement?.currentQuantity!=null?'Not completed':'Status unavailable'}</strong><p>Save date: ${result.savedTime?esc(new Date(result.savedTime*1000).toISOString().slice(0,10)):'Unavailable'}</p></article></div><div class="exotic-controls"><label>Starting depot<select data-bean-base><option value="saved">Loaded crop stock</option><option value="empty">Empty depot · hypothetical reset</option></select></label><label>Crop to harvest<select data-bean-crop>${crops.map(c=>`<option value="${c.id}">Crop #${c.id+1} · ${esc(model.seeds.find(s=>c.id>=s.start&&c.id<=s.end)?.name||'')}</option>`).join('')}</select></label></div><section class="farm777-mix"><h3>Automatic crop plan</h3><p>Finds a qualifying recipe using discovered crops. Prefers one crop when possible, then searches mixtures. Quantities are extra crop units, not harvest clicks; this does not optimize growing time.</p><div data-bean-auto aria-live="polite"></div><h3>Your crop mix</h3><p>Add any number of crops to preview their combined trade. The single-crop calculator below can fill the remaining gap.</p><div data-bean-mix></div><button type="button" data-bean-add>Add crop</button> <button type="button" data-bean-clear>Clear mix</button><p data-bean-mix-preview aria-live="polite"></p></section><div data-bean-plan aria-live="polite"></div><details><summary>Compare all discovered crops</summary><p>Closest to 777 first. These are additional crop units after your crop mix, not harvest clicks.</p><div data-bean-ranking></div></details><label class="farm777-input">Additional crop units to try<input data-bean-quantity type="number" min="0" step="1" value="0" inputmode="numeric"></label><p data-bean-preview aria-live="polite"></p><h4>Your saved plots</h4><p>Uses calculated harvest yields including your saved harvest bonuses. Plots use the selected starting depot without the hypothetical crop mix. Repeated batches assume the same crop and yield each time; growth and bonus changes can change the result.</p><div data-bean-plots class="farm-extra-grid"></div><section class="farm777-guide"><h3>How to make the trade</h3><ol><li><b>Choose your starting point.</b> Use loaded crop stock for your current depot. If it is already too high, an empty-depot plan assumes you first trade away the existing crops. That spends your crop stock and removes stock-based GMO eligibility; it does not undo permanent upgrades.</li><li><b>Control your harvest.</b> Start with a low-value crop such as apples. Lock its evolution in game and collect one plot at a time. Avoid Harvest All and large overgrown batches near the target. The calculated crop units are a stock target, not a promise that a plot can yield that exact amount.</li><li><b>Check the ticket before spending.</b> Inspect the Crop Transfer Ticket to see the bean quote. Aim for 777; the bundled game checks the unrounded reward strictly above 775.9 and below 778.9.</li><li><b>Trade when the quote matches.</b> Drop the ticket on Legumulyte, then check Legumulucky and import a fresh save.</li></ol><p>Bonuses stay fixed in this calculator. After buying upgrades, changing bonuses, harvesting, or resetting the depot, import again. If no integer amount of a crop fits, try another crop or a mixture; the calculator does not claim the achievement is impossible.</p></section><details><summary>Calculation and sources</summary><p>Beans = √(sum of crop quantity × 2.5^seed index × 1.08^crop offset) × your account multiplier. Jade, Crop Flooding, Legumioso I–III and Vault share one additive pool. The other three factors multiply that pool. These are snapshot predictions; verify the in-game quote before trading.</p><a href="https://steamcommunity.com/stats/1476970/achievements/" target="_blank" rel="noopener noreferrer">Official achievement list</a></details></section>`;
 const baseSelect=host.querySelector('[data-bean-base]'),cropSelect=host.querySelector('[data-bean-crop]'),input=host.querySelector('[data-bean-quantity]');
 const depot=()=>baseSelect.value==='empty'?0:stock;
 const label=id=>`Crop #${id+1} · ${esc(model.seeds.find(s=>id>=s.start&&id<=s.end)?.name||'')}`;
 let mix=[],recommendation;
 const base=()=>mix.reduce((sum,row)=>{const q=Number(row.quantity);return String(row.quantity).trim()!==''&&Number.isSafeInteger(q)&&q>=0?sum+q*weight(row.id,model.seeds):NaN;},depot());
 const renderMix=()=>{
  host.querySelector('[data-bean-mix]').innerHTML=mix.map((row,i)=>`<div class="exotic-controls" data-bean-row="${i}"><img src="assets/FarmCrop${row.id}.png" width="32" height="32" alt=""><label>Crop ${i+1}<select data-mix-crop>${crops.map(c=>`<option value="${c.id}" ${c.id===row.id?'selected':''}>${label(c.id)}</option>`).join('')}</select></label><label>Additional units<input data-mix-quantity type="number" min="0" step="1" value="${esc(row.quantity)}"></label><button type="button" data-mix-remove aria-label="Remove crop ${i+1}">Remove</button></div>`).join('')||'<p>No crops added yet.</p>';
  host.querySelectorAll('[data-bean-row]').forEach(el=>{
   const i=Number(el.dataset.beanRow);
   el.querySelector('[data-mix-crop]').onchange=e=>{mix[i].id=Number(e.target.value);renderMix();update();};
   el.querySelector('[data-mix-quantity]').oninput=e=>{mix[i].quantity=e.target.value;update();};
   el.querySelector('[data-mix-remove]').onclick=()=>{mix.splice(i,1);renderMix();update();};
  });
 };
 const recommend=()=>{
  recommendation=solveMix(depot(),multi,crops,model.seeds);
  const r=recommendation;
  host.querySelector('[data-bean-auto]').innerHTML=r.status==='found'?`<p><b>${baseSelect.value==='empty'?'After emptying your depot':'Add to your loaded depot'}:</b></p><ul>${r.items.map(item=>`<li><img src="assets/FarmCrop${item.id}.png" width="32" height="32" alt=""> <b>${exact(item.quantity)} units</b> of ${label(item.id)}</li>`).join('')}</ul><p>Predicted trade: <b>${exact(r.beans)} beans</b>. Lock these crops and verify the ticket before trading.</p><button type="button" data-bean-apply>Use this crop plan</button>`:r.status==='ready'?'<p>Your depot already qualifies. No additional crops needed.</p>':r.status==='overshot'?'<p>Your depot is too high. Choose the hypothetical empty depot to find a fresh recipe.</p>':r.status==='limited'?'<p>Search limit reached without a recipe. This does not prove a mixture is impossible. You can still try a manual mix.</p>':'<p>No qualifying whole-unit recipe found with these discovered crops and fixed bonuses.</p>';
  const apply=host.querySelector('[data-bean-apply]');
  if(apply)apply.onclick=()=>{mix=r.items.map(item=>({...item}));renderMix();update();};
 };
 const preview=()=>{const q=Number(input.value),valid=input.value.trim()!==''&&Number.isSafeInteger(q)&&q>=0&&Number.isFinite(base()),beans=valid?Math.sqrt(base()+q*weight(Number(cropSelect.value),model.seeds))*multi:NaN;host.querySelector('[data-bean-preview]').textContent=valid?`${exact(beans)} beans · ${qualifies(beans)?'Inside the qualifying range. Verify the ticket, then trade.':beans>=778.9?'Above the target.':'Below the target.'}`:'Enter a non-negative whole number of crop units.';};
 const update=()=>{
  const beans=Math.sqrt(base())*multi;
  host.querySelector('[data-bean-mix-preview]').textContent=Number.isFinite(beans)?`Your mix: ${exact(beans)} beans · ${qualifies(beans)?'Inside the qualifying range.':beans>=778.9?'Above the target.':'Below the target.'}`:'Enter non-negative whole crop quantities in every row.';
  const ranked=cropPlans(base(),multi,crops,model.seeds);
  const label=id=>`Crop #${id+1} · ${esc(model.seeds.find(s=>id>=s.start&&id<=s.end)?.name||'')}`;
  host.querySelector('[data-bean-ranking]').innerHTML=ranked.length?`<div class="bean-table-wrap"><table class="bean-table"><thead><tr><th>Crop</th><th>Additional units</th><th>Beans</th><th>Allowed units</th></tr></thead><tbody>${ranked.map(r=>`<tr><td><button type="button" data-bean-pick="${r.id}">${label(r.id)}</button></td><td>${exact(r.quantity)}</td><td>${exact(r.beans)}</td><td>${exact(r.low)}–${exact(r.high)}</td></tr>`).join('')}</tbody></table></div>`:Number.isFinite(base())?'<p>No single-crop addition fits this starting stock. Try an empty depot or adjust your crop mix. This does not rule out a mixture.</p>':'<p>Enter a non-negative whole number for every crop in the mix.</p>';
  host.querySelectorAll('[data-bean-pick]').forEach(b=>b.onclick=()=>{cropSelect.value=b.dataset.beanPick;update();});
  const p=plan(base(),weight(Number(cropSelect.value),model.seeds),multi);
  host.querySelector('[data-bean-plan]').innerHTML=`<article class="farm-extra-card"><h4>${baseSelect.value==='empty'?'After an empty-depot reset':'From your saved stock'}</h4><strong>${!Number.isFinite(base())?'Invalid crop mix':p?.ready?(mix.some(r=>Number(r.quantity)>0)?'Your planned mix qualifies':'Ready to verify in game'):p?.overshot?'Depot is already too high':p?.quantity!=null?`Add ${exact(p.quantity)} crop units`:'No whole-unit target for this crop'}</strong><p>${p?.quantity!=null?`Predicted reward: ${exact(p.beans)} beans. ${p.ready?(mix.some(r=>Number(r.quantity)>0)?'Collect the listed mix; no further crop units are needed beyond it.':'No additional harvest needed.'):`Qualifying additional units: ${exact(p.low)}–${exact(p.high)}.`}`:p?.overshot?'Select the hypothetical empty depot to plan a fresh attempt.':'Try a different crop. Larger bonuses can make a single crop unit skip the target range.'}</p></article>`;
  input.value=p?.quantity??0;preview();
  host.querySelector('[data-bean-plots]').innerHTML=(result.harvests||[]).filter(p=>Number.isFinite(p.quantity)&&p.quantity>0).map(p=>{
   const unit=weight(p.cropId,model.seeds),beans=Math.sqrt(depot()+p.quantity*unit)*multi,batch=batchPlan(depot(),unit,multi,p.quantity);
   return `<article class="farm-extra-card"><h4>Plot ${p.index+1} · ${label(p.cropId)}</h4><strong>${exact(p.quantity)} crops per saved harvest</strong><p>${exact(beans)} beans after one harvest · ${qualifies(beans)?'In range':beans>=778.9?'Too high':'Below target'}</p><p>${batch?.ready?'Depot is already in range.':batch?.batches!=null?`${exact(batch.batches)} identical harvest batches → ${exact(batch.beans)} beans`:!Number.isSafeInteger(p.quantity)?'Batch count unavailable for a yield outside safe whole-number precision.':'No whole number of this harvest batch reaches the range.'}</p></article>`;
  }).join('')||'<p>No calculated harvest yields in this save.</p>';
 };
 baseSelect.onchange=()=>{const best=cropPlans(base(),multi,crops,model.seeds)[0];if(best)cropSelect.value=best.id;update();recommend();};cropSelect.onchange=update;input.oninput=preview;host.querySelector('[data-bean-add]').onclick=()=>{mix.push({id:crops[0].id,quantity:0});renderMix();update();};host.querySelector('[data-bean-clear]').onclick=()=>{mix=[];renderMix();update();};renderMix();recommend();const best=cropPlans(base(),multi,crops,model.seeds)[0];if(best)cropSelect.value=best.id;update();
}
function beanTarget(stock,unit,multi,target,balance=0){
 if(![stock,unit,multi,target,balance].every(Number.isFinite)||stock<0||unit<=0||multi<=0||target<0||balance<0)return null;
 const required=Math.max(0,target-balance),quantity=Math.max(0,Math.ceil(((required/multi)**2-stock)/unit));
 return Number.isSafeInteger(quantity)?{quantity,beans:Math.sqrt(stock+quantity*unit)*multi}:null;
}
function harvestRows(result,model){
 const multi=multiplier(result.farming),stock=model.crops.reduce((sum,c)=>sum+c.quantity*weight(c.id,model.seeds),0);
 if(multi===null)return [];
 return (result.harvests||[]).filter(p=>Number.isFinite(p.quantity)&&p.quantity>0&&weight(p.cropId,model.seeds)>0).map(p=>({...p,beans:Math.sqrt(stock+p.quantity*weight(p.cropId,model.seeds))*multi,gain:(Math.sqrt(stock+p.quantity*weight(p.cropId,model.seeds))-Math.sqrt(stock))*multi})).sort((a,b)=>b.gain-a.gain);
}
function mountBeans(host,result,model){
 const multi=multiplier(result.farming),stock=model.crops.reduce((sum,c)=>sum+c.quantity*weight(c.id,model.seeds),0);
 if(multi===null){host.innerHTML='<p class="collection-note">Bean bonuses are unavailable. Load a fresh complete account export.</p>';return;}
 const crops=model.crops.filter(c=>c.found&&weight(c.id,model.seeds)>0).sort((a,b)=>weight(b.id,model.seeds)-weight(a.id,model.seeds));
 if(!crops.length){host.innerHTML='<p class="collection-note">Discover a Farming crop and import your save to calculate harvests.</p>';return;}
 const quote=Math.sqrt(stock)*multi,harvests=harvestRows(result,model),fmt=v=>{if(!Number.isFinite(v))return 'Unavailable';const scale=[[1e12,'trillion'],[1e9,'billion'],[1e6,'million']].find(([n])=>Math.abs(v)>=n);return Intl.NumberFormat('en',{maximumFractionDigits:2}).format(scale?v/scale[0]:v)+(scale?' '+scale[1]:'');};
 const label=id=>`Crop #${id+1} · ${model.seeds.find(s=>id>=s.start&&id<=s.end)?.name||''}`;
 const cropCell=id=>`<span class="bean-crop"><img src="assets/FarmCrop${id}.png" alt="" width="32" height="32"><span>${esc(label(id))}</span></span>`;
 const number=v=>`<span title="${esc(exact(v))}">${esc(fmt(v))}</span>`;
 const table=(headers,rows)=>`<div class="bean-table-wrap"><table class="bean-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
 const allStock=harvests.reduce((sum,p)=>sum+p.quantity*weight(p.cropId,model.seeds),stock),allQuote=Math.sqrt(allStock)*multi;
 host.innerHTML=`<section class="farm-extra-board farm-beans"><header><p class="eyebrow">FARMING · BEAN TRADES</p><h3>Harvest calculator</h3></header><div class="farm-extra-stats"><article class="farm-extra-card"><h4>Beans if you trade now</h4><strong>${number(quote)} beans</strong></article><article class="farm-extra-card"><h4>Beans after harvesting all plots</h4><strong>${number(allQuote)} beans</strong><p>+${number(allQuote-quote)} from harvesting</p></article></div><div class="exotic-controls"><label>How many beans do you want?<input data-beans-target type="number" min="0" step="any" value="${quote>0?quote*1.25:1000}"></label><input data-beans-crop type="hidden" value="${crops[0].id}"><label>Try harvesting this many more crops<input data-beans-units type="number" min="0" step="1" value="1000"></label></div><details class="bean-picker" data-beans-picker><summary><span>Crop to harvest</span><span data-beans-selected></span><span class="bean-picker-action">Choose crop ▾</span></summary><label class="bean-family-filter">Seed family<select data-beans-family><option value="all">All families</option>${model.seeds.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></label><div class="bean-picker-grid">${crops.map(c=>`<button type="button" data-beans-tile="${c.id}" data-seed="${model.seeds.find(s=>c.id>=s.start&&c.id<=s.end)?.id}" title="${esc(label(c.id))}"><img src="assets/FarmCrop${c.id}.png" alt="${esc(label(c.id))}" width="32" height="32"><small>#${c.id+1}</small></button>`).join('')}</div></details><div class="bean-target-buttons">${[1.1,1.25,1.5,2].map(x=>`<button type="button" data-beans-multiple="${x}">+${Math.round((x-1)*100)}% beans</button>`).join('')}</div><div data-beans-result aria-live="polite"></div><h3>Which crop needs the least harvesting?</h3><p class="farm-extra-note">Each row reaches your bean target using that crop alone. Amounts are crops added to your depot, not harvest clicks. Growth time is not compared.</p><div data-beans-ranking></div><h3>Crops needed for a bigger trade <span data-beans-breakpoint-name></span></h3><div data-beans-breakpoints></div><details><summary>All discovered crops</summary><div data-beans-all></div></details></section>`;
 const target=host.querySelector('[data-beans-target]'),crop=host.querySelector('[data-beans-crop]'),units=host.querySelector('[data-beans-units]');
 const update=()=>{
  const t=Number(target.value),q=Number(units.value),id=Number(crop.value),unit=weight(id,model.seeds),validTarget=target.value.trim()!==''&&Number.isFinite(t)&&t>=0,validQ=units.value.trim()!==''&&Number.isSafeInteger(q)&&q>=0,p=validTarget?beanTarget(stock,unit,multi,t):null;
  const card=(heading,value,detail)=>`<article class="farm-extra-card"><h4>${heading}</h4><strong>${value}</strong><p>${detail}</p></article>`;
  host.querySelector('[data-beans-result]').innerHTML=`<div class="farm-extra-stats">${p?card('To reach your bean target',p.quantity===0?'No more crops needed':`Harvest ${number(p.quantity)} more of this crop`,p.quantity===0?'Your saved depot already reaches this target.':`${cropCell(id)}Your trade will give ${number(p.beans)} beans.`):card('Target unavailable','Enter a valid target','Use a non-negative finite target with a safe whole-unit harvest.')}${validQ?card('If you harvest the amount entered',number(Math.sqrt(stock+q*unit)*multi)+' beans total',`Harvesting ${number(q)} more crops adds ${number((Math.sqrt(stock+q*unit)-Math.sqrt(stock))*multi)} beans to your trade.`):card('Invalid harvest','Enter whole crop units','Use a non-negative safe whole number.')}</div>`;
  host.querySelector('[data-beans-selected]').innerHTML=cropCell(id);
  host.querySelectorAll('[data-beans-tile]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.beansTile)===id)));
  const rows=crops.map(c=>{const plan=validTarget?beanTarget(stock,weight(c.id,model.seeds),multi,t):null;return `<tr class="${c.id===id?'selected':''}"><td><button type="button" data-beans-pick="${c.id}">${cropCell(c.id)}</button></td><td>${plan?number(plan.quantity):'—'} more crops</td></tr>`;});
  const headers=['Choose a crop','Harvest this much more'];
  host.querySelector('[data-beans-ranking]').innerHTML=table(headers,rows.slice(0,5));host.querySelector('[data-beans-all]').innerHTML=table(headers,rows);
  host.querySelector('[data-beans-breakpoint-name]').innerHTML=cropCell(id);
  host.querySelector('[data-beans-breakpoints]').innerHTML=table(['Bean increase','Harvest this much more','Your trade gives'],[1.1,1.25,1.5,2,3].map(x=>{const bp=beanTarget(stock,unit,multi,quote*x);return `<tr><td>${x===2?'Double the beans':x===3?'Triple the beans':Math.round((x-1)*100)+'% more beans'}</td><td>${quote>0&&bp?number(bp.quantity)+' crops':'Set a target above'}</td><td>${number(quote*x)} beans</td></tr>`;}));
  host.querySelectorAll('[data-beans-pick]').forEach(b=>b.onclick=()=>{crop.value=b.dataset.beansPick;update();});
 };
 target.oninput=update;units.oninput=update;
 host.querySelectorAll('[data-beans-tile]').forEach(b=>b.onclick=()=>{crop.value=b.dataset.beansTile;host.querySelector('[data-beans-picker]').open=false;update();host.querySelector('[data-beans-picker] summary').focus();});
 host.querySelector('[data-beans-family]').onchange=e=>{host.querySelectorAll('[data-beans-tile]').forEach(b=>b.hidden=e.target.value!=='all'&&b.dataset.seed!==e.target.value);};
 host.querySelectorAll('[data-beans-multiple]').forEach(b=>b.onclick=()=>{target.value=quote*Number(b.dataset.beansMultiple);update();});update();
}
const api={solveMix,cropPlans,batchPlan,qualifies,multiplier,weight,plan,mount,beanTarget,mountBeans,harvestRows};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.FarmingTrade=api;
})(typeof window!=='undefined'?window:globalThis);
