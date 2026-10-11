(function(root){
'use strict';
const names=['','Normal','Copper','Silver','Gold','Platinum','Dementia','Void','Lustre','Starfire','Dreadlo','Godshard'];
const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v;}catch{return null;}};
const number=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
function fromSave(raw){const d=parse(raw?.data)||raw||{},b=parse(d.Breeding),g=parse(d.GemItemsPurchased),t=parse(d.Tasks),task2=parse(t?.[2])??parse(d.TaskZZ2),a=parse(d.AchieveReg),o=parse(d.OptionsListAccount??d.OptLacc),worlds=Math.max(3,number(o?.[117]));return {loaded:Array.isArray(b),pets:Array.isArray(b?.[1])?b[1].slice(0,worlds).reduce((s,v)=>s+number(v),0):1,capacity:Math.round(3+number(b?.[2]?.[2])+number(g?.[119])+number(parse(task2?.[3])?.[2])),rarity:number(b?.[2]?.[5]),shatter:number(b?.[2]?.[11]),achievement:Number(a?.[221])===-1,eggs:Array.isArray(b?.[0])?b[0].filter(v=>v>0):[]};}
function exp(tier,pets,multi=1){return (2+Math.pow(pets,1.5)*Math.pow(1.85,tier))*multi;}
function rarityChance(options,tier){const level=Math.max(0,options.rarity);return Math.min(1,Math.pow(((options.mode!=='item'&&options.mode!=='catchup')?.29:.3)+.005*level,1+tier)*(1+.25*level)*(options.achievement?1.1:1)*((options.mode!=='item'&&options.mode!=='catchup')?1+Math.max(0,options.legend||0)/100:1));}
function simulate(options,target,steps=150000){
 const capacity=Math.max(1,Math.min(40,Math.floor(options.capacity))),level=Math.max(0,options.rarity),pets=Math.max(1,options.pets),multi=Math.max(.1,options.multi||1);
 if(target>1&&level===0)return {target,locked:true};
 let seed=12345+target,eggs=[],total=0,hatches=0;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const chance=tier=>rarityChance(options,tier);
 const shatter=Math.min(1,Math.ceil(12*Math.pow(Math.max(0,options.shatter||0),.698))/100);
 for(let step=0;step<steps;step++){
  if(eggs.length<capacity)eggs.push(1);
  else for(let slot=0;slot<capacity;slot++)if(random()<chance(eggs[slot])){eggs[slot]=Math.min(11,eggs[slot]+1);break;}
  let guard=0;
  while(eggs.length&&eggs[0]>=target&&guard++<1000){total+=exp(eggs.shift(),pets,multi);hatches++;if(!eggs.length&&random()<shatter)eggs=[1,1].slice(0,capacity);}
 }
 return {target,hatches,perHatch:hatches?total/hatches:0,perEgg:total/steps,steps};
}
// Low hatch counts do not support a useful long-run item-use estimate.
function eggEstimate(row){return !row.locked&&row.hatches>=100&&Number.isFinite(row.steps)&&row.steps>0?row.steps/row.hatches:null;}
function optimize(options,steps){const rows=names.slice(1).map((_,i)=>simulate(options,i+1,steps));const best=rows.filter(r=>!r.locked).reduce((a,b)=>b.perEgg>a.perEgg?b:a);return {rows,best};}
function render(host,raw,subtabs){
 const save=fromSave(raw),fmt=v=>Number(v).toLocaleString(undefined,{maximumFractionDigits:2});
 host.innerHTML=`<section class="breeding-exp"><header class="section-head compact"><div><p class="eyebrow">World 4 · Breeding</p><h2>Breeding EXP optimizer</h2><p>Compare when to hatch for the most EXP per incubation opportunity.</p></div></header><p class="muted">${save.loaded?'Egg capacity, discovered species, upgrades and achievement loaded from your save.':'No breeding save loaded. Enter your values to explore a setup.'} <span data-breed-exp-import>${save.loaded?'Reading your saved EXP multiplier and Purebred Eggs bonus…':'EXP multiplier and Purebred Eggs bonus can be entered manually.'}</span></p><form id="breedExpForm" class="breed-exp-controls">${[['pets','Discovered species',save.pets,1,200],['capacity','Egg capacity',save.capacity,1,40],['rarity','Rarity of the Egg level',save.rarity,0,10],['shatter','Shattershell Iteration level',save.shatter,0,10],['multi','Breeding EXP multiplier ×',1,.1,1e12],['legend','Purebred Eggs rarity bonus %',0,0,1e6]].map(([id,label,value,min,max])=>`<label>${label}<input name="${id}" type="number" min="${min}" max="${max}" step="${id==='multi'||id==='legend'?'any':1}" value="${value}" required></label>`).join('')}<label>Egg processing method<select name="mode"><option value="natural">Live incubation</option><option value="catchup">Catch-up when opening Breeding</option></select></label><label class="breed-exp-check"><input name="achievement" type="checkbox" ${save.achievement?'checked':''}> Rarity achievement completed (+10%)</label><button type="submit">Optimize EXP</button></form><div id="breedExpResults" aria-live="polite"></div><details class="exp-card"><summary>How to use this plan</summary><p>Keep the incubator full while upgrading eggs. Hatch the first egg once it reaches the recommended tier, then refill the empty slot. For Normal, hatch immediately and use any Shattershell eggs too.</p><p>Results simulate 150,000 incubation opportunities per target, including the ordered egg tray and Shattershell refunds. They estimate long-run EXP efficiency, not EXP per hour. The egg-use estimate is the long-run average number of consumed egg items per hatch if items supply every incubation opportunity; natural incubation reduces the items needed. It is not a guaranteed batch size or a countdown from your current tray. Each consumed egg item adds one incubation opportunity; using a stack can consume several items at once. Natural incubation time does not change with tray occupancy. Live processing uses Purebred Eggs; the catch-up path when opening Breeding uses a different rarity chance and omits that bonus. Items can be processed through either path. The simulation hatches between individual opportunities; bulk use or offline catch-up may give different results. Rare targets with few hatches are less reliable.</p><p>Uses repeat-pet EXP; new species and shiny hatches award extra EXP. Starts with an empty tray, ignores manual click time, and assumes you hatch as soon as the target is reached. Saved eggs are not spent or changed.</p><p>The saved EXP multiplier and Purebred Eggs bonus load automatically. You can override them to match your current in-game values. Improve Shining Beacon of Egg, Nest Egg stamp, breeding EXP meals/vial, Egg statue and the hidden “nothing” upgrade before a large hatching session. These bonuses increase absolute EXP; the shared multiplier does not change the best egg tier.</p></details></section>`;
 subtabs();
 const section=host.querySelector(".breeding-exp"),panel=document.createElement("div");panel.className="breed-exp-optimizer-panel";const start=section.querySelector("p.muted");for(let node=start;node;){const next=node.nextSibling;panel.append(node);node=next;}section.append(panel);const bonuses=document.createElement("div");bonuses.hidden=true;section.append(bonuses);const nav=document.createElement("nav");nav.className="skill-tabs breed-exp-subtabs";nav.setAttribute("aria-label","Breeding EXP sections");nav.innerHTML='<button class="skill-tab active" data-breed-exp-tab="optimizer" aria-pressed="true">Optimizer</button><button class="skill-tab" data-breed-exp-tab="bonuses" aria-pressed="false">EXP Bonuses</button>';panel.before(nav);nav.querySelectorAll("button").forEach(button=>button.onclick=()=>{const show=button.dataset.breedExpTab==="bonuses";panel.hidden=show;bonuses.hidden=!show;nav.querySelectorAll("button").forEach(b=>{b.classList.toggle("active",b===button);b.setAttribute("aria-pressed",String(b===button));});if(show)root.BreedingExpBonuses.mount(bonuses,raw);else root.BreedingExpBonuses.dispose();});
 const form=host.querySelector('form'),results=host.querySelector('#breedExpResults');
 function calculate(){if(!form.reportValidity())return;const values=Object.fromEntries(new FormData(form));for(const key of ['pets','capacity','rarity','shatter','multi','legend'])values[key]=Number(values[key]);values.achievement=form.elements.achievement.checked;const {rows,best}=optimize(values),base=rows[0].perEgg;results.innerHTML=`<section class="exp-card breed-exp-best"><p class="eyebrow">Best simulated target</p><h3>Hatch at ${names[best.target]}</h3><p><strong>${fmt(best.perEgg)} EXP per opportunity</strong> · ${fmt(best.perEgg/base)}× immediate hatching</p><p data-breed-egg-estimate><strong>${eggEstimate(best)===null?'ESTIMATE: Insufficient sample':`ESTIMATE: Use about ${fmt(eggEstimate(best))} egg items per ${names[best.target]} hatch on average`}</strong><br><small>Assumes one egg item per opportunity, with hatching between opportunities. Includes Shattershell refunds; free incubation lowers item use. This is not a stack size or an estimate for your current tray.</small></p><small>Estimated from ${fmt(best.hatches)} hatches. Close results can vary with randomness.</small></section><div class="breed-exp-table"><table><thead><tr><th>Target egg</th><th>EXP / hatch</th><th>EXP / opportunity</th><th>vs Normal</th><th>Est. egg items / hatch</th><th>Sample hatches</th></tr></thead><tbody>${rows.map(r=>`<tr class="${r.target===best.target?'breed-exp-winner':''}"><th><img src="assets/PetEgg${r.target}.png" alt="">${names[r.target]}${r.target===best.target?' · Best':''}</th><td>${r.locked?'Locked':r.hatches?fmt(r.perHatch):'—'}</td><td>${r.locked?'—':r.hatches?fmt(r.perEgg):'Insufficient sample'}</td><td>${r.locked||!r.hatches?'—':fmt(r.perEgg/base)+'×'}</td><td>${r.locked?'—':eggEstimate(r)===null?'Insufficient sample':fmt(eggEstimate(r))}</td><td>${r.locked?'—':fmt(r.hatches)+(r.hatches<100?' · Low sample':'')}</td></tr>`).join('')}</tbody></table></div>`;}
 form.onsubmit=e=>{e.preventDefault();calculate();};calculate();
 if(save.loaded){
  const status=host.querySelector('[data-breed-exp-import]'),edited=new Set();
  form.addEventListener('input',e=>edited.add(e.target.name));
  let pending,timeout,observer;
  const stop=()=>{pending?.terminate();clearTimeout(timeout);observer?.disconnect();};
  const fail=()=>{stop();if(section.isConnected)status.textContent='Could not load saved bonuses. Enter your in-game EXP multiplier and Purebred Eggs bonus manually.';};
  try{
   pending=new Worker('breeding-exp-bonuses-worker.js');
   observer=new MutationObserver(()=>{if(!section.isConnected)stop();});observer.observe(host,{childList:true});
   timeout=setTimeout(fail,60000);pending.onerror=fail;
   pending.onmessage=e=>{
    const model=e.data.result;
    if(e.data.error||!model||model.missing||!Number.isFinite(model.total)){fail();return;}
    stop();if(!section.isConnected)return;
    if(!edited.has('multi'))form.elements.multi.value=model.total;
    if(!edited.has('legend')&&Number.isFinite(model.legendRarity))form.elements.legend.value=model.legendRarity;
    status.textContent='Saved EXP multiplier and Purebred Eggs bonus loaded; you can edit either value.';calculate();
   };pending.postMessage(raw);
  }catch{fail();}
 }
}
const api={fromSave,exp,simulate,rarityChance,eggEstimate,optimize,render};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BreedingExp=api;
})(typeof window!=='undefined'?window:globalThis);
