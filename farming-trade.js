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
function mount(host,result,model){
 const f=result.farming,multi=multiplier(f),stock=model.crops.reduce((sum,c)=>sum+c.quantity*weight(c.id,model.seeds),0),saved=Math.sqrt(stock)*multi;
 if(multi===null){host.innerHTML='<p class="collection-note">Bean bonuses are unavailable. Load a fresh complete account export.</p>';return;}
 const crops=model.crops.filter(c=>c.found&&weight(c.id,model.seeds)>0);
 if(!crops.length){host.innerHTML='<p class="collection-note">Discover a Farming crop and import your save to calculate a 777 trade.</p>';return;}
 host.innerHTML=`<section class="farm-extra-board farm777"><header><p class="eyebrow">FARMING · LEGUMULUCKY</p><h3>777 Trade</h3><p>Plan a crop trade with Legumulyte using your loaded account bonuses.</p></header><div class="farm-extra-stats"><article class="farm-extra-card"><h4>Saved depot trade</h4><strong>${exact(saved)} beans</strong><p>${qualifies(saved)?'Your saved depot is in the qualifying range.':saved>=778.9?'Already above the target. Adding crops cannot lower this quote.':'Below the target. Calculate your next harvest below.'}</p></article><article class="farm-extra-card"><h4>Bean multiplier</h4><strong>${exact(multi)}×</strong><p>Includes Market, Jade, achievement, Exotic and Vault bonuses.</p></article><article class="farm-extra-card"><h4>Achievement</h4><strong>${result.tradeAchievement?.completed?'Completed':result.tradeAchievement?.currentQuantity!=null?'Not completed':'Status unavailable'}</strong><p>Save date: ${result.savedTime?esc(new Date(result.savedTime*1000).toISOString().slice(0,10)):'Unavailable'}</p></article></div><div class="exotic-controls"><label>Starting depot<select data-bean-base><option value="saved">Loaded crop stock</option><option value="empty">Empty depot · hypothetical reset</option></select></label><label>Crop to harvest<select data-bean-crop>${crops.map(c=>`<option value="${c.id}">Crop #${c.id+1} · ${esc(model.seeds.find(s=>c.id>=s.start&&c.id<=s.end)?.name||'')}</option>`).join('')}</select></label></div><div data-bean-plan aria-live="polite"></div><label class="farm777-input">Additional crop units to try<input data-bean-quantity type="number" min="0" step="1" value="0" inputmode="numeric"></label><p data-bean-preview aria-live="polite"></p><h4>Your saved plots</h4><p>Each entry previews harvesting that plot alone into the selected starting depot. On-vine quantities can change before you collect.</p><div data-bean-plots class="farm-extra-grid"></div><section class="farm777-guide"><h3>How to make the trade</h3><ol><li><b>Choose your starting point.</b> Use loaded crop stock for your current depot. If it is already too high, an empty-depot plan assumes you first trade away the existing crops. That spends your crop stock and removes stock-based GMO eligibility; it does not undo permanent upgrades.</li><li><b>Control your harvest.</b> Start with a low-value crop such as apples. Lock its evolution in game and collect one plot at a time. Avoid Harvest All and large overgrown batches near the target. The calculated crop units are a stock target, not a promise that a plot can yield that exact amount.</li><li><b>Check the ticket before spending.</b> Inspect the Crop Transfer Ticket to see the bean quote. Aim for 777; the bundled game checks the unrounded reward strictly above 775.9 and below 778.9.</li><li><b>Trade when the quote matches.</b> Drop the ticket on Legumulyte, then check Legumulucky and import a fresh save.</li></ol><p>Bonuses stay fixed in this calculator. After buying upgrades, changing bonuses, harvesting, or resetting the depot, import again. If no integer amount of a crop fits, try another crop or a mixture; the calculator does not claim the achievement is impossible.</p></section><details><summary>Calculation and sources</summary><p>Beans = √(sum of crop quantity × 2.5^seed index × 1.08^crop offset) × your account multiplier. Jade, Crop Flooding, Legumioso I–III and Vault share one additive pool. The other three factors multiply that pool. These are snapshot predictions; verify the in-game quote before trading.</p><a href="https://steamcommunity.com/stats/1476970/achievements/" target="_blank" rel="noopener noreferrer">Official achievement list</a></details></section>`;
 const baseSelect=host.querySelector('[data-bean-base]'),cropSelect=host.querySelector('[data-bean-crop]'),input=host.querySelector('[data-bean-quantity]');
 const base=()=>baseSelect.value==='empty'?0:stock;
 const preview=()=>{const q=Number(input.value),valid=input.value.trim()!==''&&Number.isSafeInteger(q)&&q>=0,beans=valid?Math.sqrt(base()+q*weight(Number(cropSelect.value),model.seeds))*multi:NaN;host.querySelector('[data-bean-preview]').textContent=valid?`${exact(beans)} beans · ${qualifies(beans)?'Inside the qualifying range. Verify the ticket, then trade.':beans>=778.9?'Above the target.':'Below the target.'}`:'Enter a non-negative whole number of crop units.';};
 const update=()=>{
  const p=plan(base(),weight(Number(cropSelect.value),model.seeds),multi);
  host.querySelector('[data-bean-plan]').innerHTML=`<article class="farm-extra-card"><h4>${baseSelect.value==='empty'?'After an empty-depot reset':'From your saved stock'}</h4><strong>${p?.ready?'Ready to verify in game':p?.overshot?'Depot is already too high':p?.quantity!=null?`Add ${exact(p.quantity)} crop units`:'No whole-unit target for this crop'}</strong><p>${p?.quantity!=null?`Predicted reward: ${exact(p.beans)} beans. ${p.ready?'No additional harvest needed.':`Qualifying additional units: ${exact(p.low)}–${exact(p.high)}.`}`:p?.overshot?'Select the hypothetical empty depot to plan a fresh attempt.':'Try a different crop. Larger bonuses can make a single crop unit skip the target range.'}</p></article>`;
  input.value=p?.quantity??0;preview();
  host.querySelector('[data-bean-plots]').innerHTML=(f.plot||[]).filter(p=>!p.isLocked&&p.seedType>=0).map(p=>{const unit=weight(p.cropType,model.seeds),beans=unit>0&&Number.isFinite(p.cropQuantity)?Math.sqrt(base()+p.cropQuantity*unit)*multi:NaN;return `<article class="farm-extra-card"><h4>Plot ${p.index+1} · Crop #${p.cropType+1}</h4><strong>${exact(p.cropQuantity)} on vine</strong><p>${exact(beans)} beans after harvest${Number.isFinite(beans)?qualifies(beans)?' · In range':beans>=778.9?' · Too high':' · Below target':''}</p></article>`;}).join('')||'<p>No planted plots in this save.</p>';
 };
 baseSelect.onchange=update;cropSelect.onchange=update;input.oninput=preview;update();
}
const api={qualifies,multiplier,weight,plan,mount};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.FarmingTrade=api;
})(typeof window!=='undefined'?window:globalThis);
