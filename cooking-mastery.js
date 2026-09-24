(function(root){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number.isFinite(n)?n.toLocaleString(undefined,{maximumFractionDigits:2}):'—';
const name=v=>String(v??'').replaceAll('_',' ');
const multi=p=>1+p/(p+5);
const relative=p=>100*(multi(p+1)/multi(p)-1);
const factorNames={Mcook:'Meals (Cooking Speed)',KitchenEff:'Kitchen Eff (Meal)',zMealFarm:'Marshmallow (Meal)'};
function speedAt(mastery,rate,points){
 if(!rate?.kitchenSources?.length)return null;
 const ratios={};
 for(const stat of Object.keys(factorNames)){
  const meals=mastery.mealBonuses.filter(m=>m.stat===stat);
  const base=meals.reduce((s,m)=>s+m.bonus,0);
  const next=meals.reduce((s,m)=>{const node=mastery.nodes.find(n=>n.id===m.id);return s+m.bonus*multi(points[m.id]??node.points)/multi(node.points);},0);
  ratios[stat]=base>0?next/base:1;
 }
 return rate.kitchenSources.reduce((sum,k)=>sum+k.speed*Object.entries(factorNames).reduce((product,[stat,key])=>{const f=k.factors[key];return product*(1+(f-1)*ratios[stat])/f;},1),0);
}
function yellowRows(m,rate,points={},goal='speed'){
 const current=speedAt(m,rate,points);
 return m.nodes.filter(n=>n.mealLevel>0).map(n=>{
  const p=points[n.id]??n.points;
  const gain=goal==='speed'?(current>0?100*(speedAt(m,rate,{...points,[n.id]:p+1})/current-1):null):relative(p);
  return {...n,points:p,gain,multi:multi(p),nextMilestone:[5,20,45,95].find(t=>t>p)??null};
 }).sort((a,b)=>(b.gain??-1)-(a.gain??-1)||a.id-b.id);
}
function purpleRows(m,points={}){
 return m.categories.map(c=>{
  const p=points[c.index]??c.points;
  const source=c.index===0?Math.max(0,Math.log10(Math.max(1,c.sourceValue))):c.index===1?Math.max(0,c.sourceValue-1000):c.index===2?Math.max(0,c.sourceValue-75):c.sourceValue;
  const slope=c.baseMulti*(source||0)/100;
  const ribbon=x=>250*c.baseMulti*x/(25+c.baseMulti*x);
  const gain=c.isExpBoost?100*slope/(1+slope*p):ribbon(p+1)-ribbon(p);
  const threshold=t=>slope>0?Math.max(0,Math.floor(100/t-1/slope)+1):null;
  return {...c,points:p,slope,gain,bonus:c.isExpBoost?100*slope*p:ribbon(p),soft:threshold(1),shadow:threshold(.1),ribbon100:Math.ceil(50/(3*c.baseMulti)),ribbon200:Math.ceil(100/c.baseMulti)};
 }).sort((a,b)=>Number(b.unlocked)-Number(a.unlocked)||Number(b.isExpBoost)-Number(a.isExpBoost)||b.gain-a.gain||a.index-b.index);
}
function allocate(m,rate,color,goal='speed',initial={}){
 const count=Math.min(2000,Math.max(0,Math.floor(color==='yellow'?m.points.nodeLeft:m.points.categoryLeft))),points={...initial},changes=new Map();
 for(let i=0;i<count;i++){
  const row=color==='yellow'?yellowRows(m,rate,points,goal).find(r=>r.gain>0):purpleRows(m,points).find(r=>r.unlocked&&r.isExpBoost&&r.gain>0);
  if(!row)break;
  const id=color==='yellow'?row.id:row.index;points[id]=row.points+1;changes.set(id,(changes.get(id)||0)+1);
 }
 return {points,changes:[...changes].map(([id,add])=>({id,add})),count:[...changes.values()].reduce((s,n)=>s+n,0)};
}
// Priority 1 is highest. These are visible planning preferences, not game multipliers.
const cookingOnly=new Set(['Mcook','KitchenEff','zMealFarm','Rcook','KitchC','CookExp']);
// Deliberate account shortlist: unknown/new effects are opt-in, never fallback spending.
const accountPriorities={zGoldFood:1,ResearchXP:1,MineCurr:1,Seff:2,zJade:3};
const defaultWeight=(n,profile='account')=>profile==='cooking'?(n.stat==='zGoldFood'?1:factorNames[n.stat]?2:0):(accountPriorities[n.stat]??0);
const priority=n=>({1:'Gold · priority 1',2:'Purple · priority 2',3:'Blue · priority 3',0:'Excluded'})[n];
function bonusAt(n,p){return n.stat==='PxLine'?n.bonus:n.bonus*multi(p)/multi(n.points);}
function yumiAllocation(m,budget,priorities={},target=10,profile='account'){
 const yumi=m.nodes.find(n=>n.stat==='zGoldFood'&&n.mealLevel>0&&n.bonus>0&&(priorities[n.id]??defaultWeight(n,profile))>0);
 const reserve=budget>1?Math.max(1,Math.ceil(budget*.2)):0;
 return {yumi,target:Math.min(Math.max(0,Math.floor(target)),Math.max(0,budget-reserve)),reserve};
}
function accountSetup(m,budget,priorities={},target=10,profile='account'){
 budget=Math.min(2000,Math.max(0,Math.floor(budget)));
 const points=Object.fromEntries(m.nodes.map(n=>[n.id,0]));
 const first=yumiAllocation(m,budget,priorities,target,profile);
 if(first.yumi)points[first.yumi.id]=first.target;
 const candidates=m.nodes.filter(n=>n.mealLevel>0&&n.bonus>0&&n.stat!=='PxLine'&&n.id!==first.yumi?.id);
 for(let i=first.yumi?first.target:0;i<budget;i++){
  const totals={};for(const n of m.nodes)totals[n.stat]=(totals[n.stat]||0)+bonusAt(n,points[n.id]);
  let best=null,score=0;
  for(const n of candidates){if(profile==='account'&&n.stat==='zSumEss'&&points[n.id]>=1)continue;const weight=({1:3,2:2,3:1,0:0})[priorities[n.id]??defaultWeight(n,profile)]||0,delta=bonusAt(n,points[n.id]+1)-bonusAt(n,points[n.id]);const gain=weight*Math.log1p(delta/(1+totals[n.stat]));if(gain>score){score=gain;best=n;}}
  if(!best)break;points[best.id]++;
 }
 return points;
}
function gainSummary(m,points){
 const groups=new Map();
 for(const n of m.nodes){const p=points[n.id]??n.points;if(!groups.has(n.stat))groups.set(n.stat,{stat:n.stat,effect:name(n.effect).replace('{',''),base:0,total:0,points:0,meals:[]});const g=groups.get(n.stat);g.base+=bonusAt(n,0);g.total+=bonusAt(n,p);g.points+=p;if(p)g.meals.push(name(n.name)+' '+p);}
 return [...groups.values()].filter(g=>g.points>0).map(g=>({...g,gain:g.base>0?100*(g.total/g.base-1):0}));
}
// Keep saved account bonuses fixed; only replace the simulated meal contribution.
function pointImpact(m,rate,points,id){
 const node=m.nodes.find(n=>n.id===id),p=points[id]??node.points;
 const nextPoints={...points,[id]:p+1};
 if(node.stat==='MineCurr'&&Number.isFinite(m.minehead?.perHour)){
  const g=m.minehead,base=1+(g.grid+g.meal)/100;
  const at=allocation=>g.perHour*(1+(g.grid+m.nodes.filter(n=>n.stat==='MineCurr').reduce((sum,n)=>sum+bonusAt(n,allocation[n.id]??n.points),0))/100)/base;
  const saved=g.perHour,test=at(points),next=at(nextPoints);
  return {kind:'currency',label:'Minehead currency / hour',saved,test,next,relative:saved?100*(test/saved-1):0,nextRelative:test?100*(next/test-1):0};
 }
 if(node.stat==='zGoldFood'&&rate?.goldenFood){
  const g=rate.goldenFood;
  const at=allocation=>g.multiplier+(m.nodes.filter(n=>n.stat==='zGoldFood').reduce((sum,n)=>sum+bonusAt(n,allocation[n.id]??n.points),0)-g.meal)*g.outer/100;
  const saved=g.multiplier,test=at(points),next=at(nextPoints);
  return {kind:'gold',label:'Golden food effect',saved:(saved-1)*100,test:(test-1)*100,next:(next-1)*100,relative:100*(test/saved-1),nextRelative:100*(next/test-1)};
 }
 if(factorNames[node.stat]&&rate?.speed>0){
  const saved=rate.speed,test=speedAt(m,rate,points),next=speedAt(m,rate,nextPoints);
  return {kind:'speed',label:'Total kitchen speed',saved,test,next,relative:100*(test/saved-1),nextRelative:100*(next/test-1)};
 }
 const same=m.nodes.filter(n=>n.stat===node.stat),at=allocation=>same.reduce((sum,n)=>sum+bonusAt(n,allocation[n.id]??n.points),0);
 const saved=at({}),test=at(points),next=at(nextPoints);
 return {kind:'meal',label:'Combined meal contribution',saved,test,next,relative:saved?100*(test/saved-1):0,nextRelative:test?100*(next/test-1):0};
}
const signed=n=>(n>=0?'+':'')+fmt(n);
function impactMarkup(m,rate,points,id){
 const v=pointImpact(m,rate,points,id),unit=v.kind==='gold'?'%':v.kind==='currency'?' /hr':'';
 return `<div class="mastery-point-impact"><b>${v.label}${v.kind==='gold'?' · '+esc(rate.name):''}</b><small>Saved ${fmt(v.saved)}${unit} → Test ${fmt(v.test)}${unit}</small><small>${signed(v.test-v.saved)}${v.kind==='gold'?' percentage points':v.kind==='currency'?' /hr':''} vs save · ${signed(v.relative)}% ${v.kind==='gold'?'actual effect':'gain'}</small><small>Next +1 point → ${fmt(v.next)}${unit} (${signed(v.nextRelative)}% ${v.kind==='gold'?'actual effect':'gain'})</small>${v.kind==='meal'?'<small>Meal total only; final account stat is not calculated.</small>':''}</div>`;
}
function preview(m,rate,yellow,purple){
 const saved=purpleRows(m),next=purpleRows(m,purple);
 const ratio=next.filter(c=>c.isExpBoost).reduce((v,c)=>v*(1+c.bonus/100)/(1+saved.find(s=>s.index===c.index).bonus/100),1);
 return {speed:speedAt(m,rate,yellow),expRate:m.expRate*ratio,ribbon:next.find(c=>!c.isExpBoost)?.bonus||0};
}
function render(host,scenario,rate,state={}){
 const m=scenario?.mastery;
 if(!m?.unlocked){host.innerHTML='<p class="cook-note">Cooking Mastery is locked or missing from this save.</p>';return;}
 const profile=state.profile||'account';state.profileWeights??={};state.weights=state.profileWeights[profile]??={};
 state.yellow??={};state.purple??={};state.query??='';state.page??=0;state.yumiTarget??=10;state.summaryMode??='saved';
 state.yellowBudget??=m.points.nodeSpent+m.points.nodeLeft;state.purpleBudget??=m.points.categorySpent+m.points.categoryLeft;
 const color=state.color||'yellow',goal=state.goal||'priority',yp=state.yellow,pp=state.purple,points=state[color];
 const usedY=m.nodes.reduce((s,n)=>s+(yp[n.id]??n.points),0),usedP=m.categories.reduce((s,c)=>s+(pp[c.index]??c.points),0);
 const used=color==='yellow'?usedY:usedP,budget=state[color+'Budget'];
 const live=preview(m,rate,yp,pp),recommendation=accountSetup(m,state.yellowBudget,state.weights,state.yumiTarget,profile),first=yumiAllocation(m,state.yellowBudget,state.weights,state.yumiTarget,profile);
 const modified={...m,points:{...m.points,nodeLeft:Math.max(0,state.yellowBudget-usedY),categoryLeft:Math.max(0,state.purpleBudget-usedP)}};
 const purple=purpleRows(m,pp),plan=allocate(modified,rate,'purple','speed',pp);
 const yellow=yellowRows(m,rate,yp,goal==='speed'?'speed':'bonus');
 if(goal==='priority')yellow.sort((a,b)=>((state.weights[a.id]??defaultWeight(a,profile))||4)-((state.weights[b.id]??defaultWeight(b,profile))||4)||recommendation[b.id]-recommendation[a.id]||a.id-b.id);
 const query=state.query.toLowerCase(),filtered=(color==='yellow'?yellow:purple).filter(r=>(name(r.name)+' '+name(r.effect||r.label||'')).toLowerCase().includes(query));
 const pages=Math.max(1,Math.ceil(filtered.length/6));state.page=Math.min(state.page,pages-1);const visible=filtered.slice(state.page*6,state.page*6+6);
 const summaryPoints=state.summaryMode==='saved'?{}:state.summaryMode==='recommended'?recommendation:yp;
 const summary=gainSummary(m,summaryPoints),summaryPurple=purpleRows(m,state.summaryMode==='saved'?{}:pp);
 const topPurple=purple.find(c=>c.unlocked&&c.isExpBoost&&c.gain>0);
 const rowInput=(r)=>`<input class="mastery-point-input" type="number" min="0" max="2000" step="1" data-master-point="${color==='yellow'?r.id:r.index}" value="${r.points}" aria-label="${esc(name(r.name))} points" ${color==='purple'&&!r.unlocked?'disabled':''}>`;
 host.innerHTML=`<details class="mastery-gain-summary" ${state.summaryOpen?'open':''}><summary>Current point setup gains <span>Saved: ${m.points.nodeSpent} yellow · ${m.points.categorySpent} purple · rank ${m.level+1}</span></summary><label>Show <select id="masterySummaryMode"><option value="saved">Current saved setup</option><option value="test">Calculator setup</option><option value="recommended">Recommended yellow setup</option></select></label><p>Extra meal-stat bonus from yellow mastery compared with zero yellow points. These are meal contributions, not final character stats.</p><div class="mastery-gain-list">${summary.map(g=>`<div><strong>${esc(g.effect)} · +${fmt(g.gain)}%</strong><span>${g.points} points · ${esc(g.meals.join(' · '))}</span><small>${fmt(g.base)} without mastery → ${fmt(g.total)} with mastery</small></div>`).join('')||'<p>No yellow points assigned.</p>'}</div><div class="mastery-gain-list">${summaryPurple.filter(c=>c.points>0).map(c=>`<div><strong>${esc(name(c.name))} · ${c.isExpBoost?fmt(1+c.bonus/100)+'× Mastery EXP':fmt(c.bonus)+'% ribbon chance'}</strong><span>${c.points} purple points${state.summaryMode==='recommended'?' (calculator allocation)':''}</span></div>`).join('')}</div></details>
 <div class="mastery-topline"><div class="cook-tabs" role="tablist" aria-label="Mastery point type"><button role="tab" data-mastery-color="yellow" aria-selected="${color==='yellow'}">Yellow · meals</button><button role="tab" data-mastery-color="purple" aria-selected="${color==='purple'}">Purple · flavors</button></div><span class="${used>budget?'mastery-over':''}" role="status">${used} / ${budget} assigned · ${Math.abs(budget-used)} ${used>budget?'over budget':'remaining'}</span></div>
 <div class="mastery-compact-controls"><label>Search<input id="masterySearch" type="search" value="${esc(state.query)}" placeholder="Meal, bonus or flavor…"></label><label>Budget<input id="masteryBudget" type="number" min="0" max="2000" step="1" value="${budget}"></label>${color==='yellow'?`<label>Plan for<select id="masteryProfile"><option value="account">Account bonuses</option><option value="cooking">Cooking progression</option></select></label><label>Sort<select id="masteryGoal"><option value="priority">Priority first</option><option value="speed">Cooking speed gain</option><option value="bonus">Meal bonus gain</option></select></label><label>Yumi target<select id="masteryYumiTarget">${[5,10,12,15,20,45].map(p=>`<option value="${p}">${p} pts · ${fmt(multi(p))}×</option>`).join('')}</select></label>`:''}</div>
 <div class="mastery-actions"><button id="masteryLoad">${color==='yellow'?'Load recommended setup':'Allocate remaining EXP points'}</button><button id="masteryReset">Reset to save</button><button id="masteryClear">Clear points</button><small>Preview only · no save changes</small></div>
 <div class="mastery-preview-strip">${profile==='cooking'?`<span>Kitchen speed <b>${live.speed===null?'—':fmt(live.speed/rate.speed)+'× saved'}</b></span>`:`<span>Yumi meal bonus <b>${first.yumi?fmt(multi(yp[first.yumi.id]??first.yumi.points))+'×':'Unavailable'}</b></span>`}<span>Mastery EXP <b>${fmt(live.expRate/m.expRate)}× saved</b></span><span>Ribbon chance <b>${fmt(live.ribbon)}%</b></span></div>
 ${color==='yellow'?`<p class="mastery-profile-note">${profile==='account'?'Overall account: Yumi stops at 10 by default; Research EXP and Minehead currency are P1, skill efficiency P2, jade P3. Other bonuses are opt-in, including essence (at most 1 recommended point).':'Cooking plan: Yumi first, then cooking-speed priorities.'} Changing the plan updates recommendations; use Load recommended setup to apply it to the calculator.</p><div class="mastery-yumi-callout"><b>P1 · ${first.yumi?`${esc(name(first.yumi.name))}: ${first.target} points → ${fmt(multi(first.target))}× meal bonus`:'Yumi unavailable or excluded'}</b><span>${first.yumi?`${state.yellowBudget-first.target} points remain for the rest. Yumi stops at this target.`:'Available points go to the other eligible meals.'}</span></div><div class="mastery-legend"><span class="mastery-p1">P1 · Gold / first</span><span class="mastery-p2">P2 · Purple / next</span><span class="mastery-p3">P3 · Blue / later</span><span class="mastery-p0">Excluded</span></div><details class="cook-breakdown"><summary>Full recommended setup & why</summary><p>${m.nodes.filter(n=>recommendation[n.id]>0).sort((a,b)=>recommendation[b.id]-recommendation[a.id]).map(n=>`${esc(name(n.name))}: <b>${recommendation[n.id]} points</b>`).join(' · ')||'No points allocated.'}</p><p>Yumi gets its target first; at least 20% of budgets above one point is reserved for other meals. The default 10 points gives 1.667× Yumi’s meal bonus; 20 costs twice as much for 1.8×. ${profile==='account'?'Research EXP (Giga Chip) and Minehead currency (Divorce Cake) are P1 after Yumi. P2 is skill efficiency: Corn, Riceball and Whipped Cocoa compete using their actual contribution to the shared bonus. Jade is P3. Library checkout, liquid caps, sailing, Buncha Banana, cooking, and all other situational bonuses receive zero unless you opt in. Essence is off by default and capped at one recommended point if enabled. Locked meals receive zero; their points go to eligible meals. You can still edit any allocation manually.':'Cooking P2 covers meal cooking speed, Cabbage and Marshmallow.'} Afterwards, priorities 1/2/3 weight marginal pooled meal-stat gains by 3/2/1. These are adjustable planning preferences, not a universal account optimum. Excluded meals get zero. Loading this replaces the calculator allocation only.</p></details>`:`<p class="mastery-purple-tip">${topPurple?`Best next EXP point: ${esc(name(topPurple.name))} (+${fmt(topPurple.gain)}%).`: 'No unlocked EXP gain available.'} Smoky improves ribbons and is excluded from the EXP allocation.</p>`}
 <div class="mastery-edit-list">${visible.map(r=>color==='yellow'?`<article class="mastery-edit-row mastery-p${state.weights[r.id]??defaultWeight(r,profile)}"><div class="mastery-row-name"><img src="assets/CookingM${r.id}.png" alt=""><div><strong>${esc(name(r.name))}</strong><small>${esc(name(r.effect).replace('{',''))} · meal ${r.mealLevel}</small></div></div><label>Points ${rowInput(r)}</label><label>Priority<select data-master-weight="${r.id}" aria-label="${esc(name(r.name))} priority">${[1,2,3,0].map(p=>`<option value="${p}" ${(state.weights[r.id]??defaultWeight(r,profile))===p?'selected':''}>${priority(p)}</option>`).join('')}</select></label><div class="mastery-row-gain mastery-yellow-gain"><div class="mastery-meal-gain"><b>${fmt(r.multi)}× meal bonus</b><small>${fmt(m.nodes.find(n=>n.id===r.id).bonus)} → ${fmt(bonusAt(m.nodes.find(n=>n.id===r.id),r.points))}</small><small>Recommended: ${recommendation[r.id]} points${profile==='account'&&r.stat==='zSumEss'?' · 1-point limit':''}</small></div>${impactMarkup(m,rate,yp,r.id)}</div></article>`:`<article class="mastery-edit-row mastery-purple-row"><div class="mastery-row-name"><div><strong>${esc(name(r.name))}</strong><small>${esc(r.label)}${r.unlocked?'':` · unlock rank ${r.unlockLevel+1}`}</small></div></div><label>Points ${rowInput(r)}</label><div class="mastery-row-gain"><b>${r.isExpBoost?fmt(1+r.bonus/100)+'× EXP':fmt(r.bonus)+'% ribbon chance'}</b><small>Next point: ${!r.unlocked?'locked':fmt(r.gain)+(r.isExpBoost?'% EXP':' percentage points')}</small></div></article>`).join('')||'<p class="cook-note">No matching meals or flavors.</p>'}</div>
 <div class="mastery-pagination"><button id="masteryPrev" ${state.page===0?'disabled':''}>Previous</button><span>${filtered.length} matches · Page ${state.page+1} of ${pages}</span><button id="masteryNext" ${state.page+1>=pages?'disabled':''}>Next</button></div>
 <details class="cook-breakdown"><summary>Breakpoints, caps & calculator assumptions</summary><p>Yellow: 1 + points/(points+5), approaching 2×. Milestones: 5 → 1.5×, 20 → 1.8×, 45 → 1.9×, 95 → 1.95×. Next-point own-bonus gain falls below 1% at 12 points and 0.1% at 46; these practical soft/shadow thresholds are not hard game caps.</p><p>Purple EXP has diminishing relative returns. Smoky approaches 250%; 100% guarantees +1 ribbon rank, 200% guarantees +2. Applied ribbons cap at 25. Flavor unlocks: ${m.categories.map(c=>`${esc(name(c.name))} rank ${c.unlockLevel+1}`).join(' · ')}. EXP requirements grow 12.5× per saved level after level 40, versus 2.5× before.</p><p>Budgets are limited to 2,000 for responsive testing and do not unlock flavors. Meal values include imported bonus multipliers; Minehead shows currency per hour with current account upgrades and bonuses held fixed. Golden food effect uses the selected character and preset with other imported bonuses held fixed. Other effects show combined meal contributions unless a full account calculation is available; final damage is not calculated. Priorities are separate from the mathematically sorted gain views.</p></details>`;
 const repaint=()=>{const scroll=root.scrollY,focused=host.ownerDocument?.activeElement,key=focused?.dataset?.masterPoint,weight=focused?.dataset?.masterWeight;render(host,scenario,rate,state);if(key!==undefined)host.querySelector(`[data-master-point="${key}"]`)?.focus({preventScroll:true});if(weight!==undefined)host.querySelector(`[data-master-weight="${weight}"]`)?.focus({preventScroll:true});if(Number.isFinite(scroll))root.scrollTo?.(0,scroll);};
 const details=host.querySelector('.mastery-gain-summary');details.ontoggle=()=>{state.summaryOpen=details.open;};
 const summarySelect=host.querySelector('#masterySummaryMode');summarySelect.value=state.summaryMode;summarySelect.onchange=()=>{state.summaryMode=summarySelect.value;state.summaryOpen=true;repaint();};
 host.querySelector('#masterySearch').oninput=e=>{const pos=e.target.selectionStart;state.query=e.target.value;state.page=0;repaint();const el=host.querySelector('#masterySearch');el.focus({preventScroll:true});try{el.setSelectionRange(pos,pos);}catch{}};
 host.querySelector('#masteryBudget').onchange=e=>{const v=Number(e.target.value);if(Number.isInteger(v)&&v>=0&&v<=2000)state[color+'Budget']=v;repaint();};
 host.querySelectorAll('[data-master-point]').forEach(el=>el.onchange=()=>{const v=Number(el.value);if(Number.isInteger(v)&&v>=0&&v<=2000)points[Number(el.dataset.masterPoint)]=v;repaint();});
 host.querySelectorAll('[data-master-weight]').forEach(el=>el.onchange=()=>{state.weights[Number(el.dataset.masterWeight)]=Number(el.value);repaint();});
 host.querySelector('#masteryReset').onclick=()=>{state[color]={};state[color+'Budget']=color==='yellow'?m.points.nodeSpent+m.points.nodeLeft:m.points.categorySpent+m.points.categoryLeft;repaint();};
 host.querySelector('#masteryClear').onclick=()=>{state[color]=Object.fromEntries((color==='yellow'?m.nodes:m.categories).map(n=>[color==='yellow'?n.id:n.index,0]));repaint();};
 host.querySelector('#masteryLoad').onclick=()=>{if(color==='yellow')state.yellow={...recommendation};else state.purple={...pp,...plan.points};repaint();};
 host.querySelectorAll('[data-mastery-color]').forEach(b=>b.onclick=()=>{state.color=b.dataset.masteryColor;state.page=0;state.query='';repaint();});
 const select=host.querySelector('#masteryGoal');if(select){select.value=goal;select.onchange=()=>{state.goal=select.value;state.page=0;repaint();};}
 const profileSelect=host.querySelector('#masteryProfile');if(profileSelect){profileSelect.value=profile;profileSelect.onchange=()=>{state.profile=profileSelect.value;state.page=0;repaint();};}
 const target=host.querySelector('#masteryYumiTarget');if(target){target.value=String(state.yumiTarget);target.onchange=()=>{state.yumiTarget=Number(target.value);repaint();};}
 host.querySelector('#masteryPrev').onclick=()=>{state.page--;repaint();};host.querySelector('#masteryNext').onclick=()=>{state.page++;repaint();};
}
const api={pointImpact,defaultWeight,cookingOnly,multi,relative,speedAt,yellowRows,purpleRows,allocate,bonusAt,accountSetup,yumiAllocation,gainSummary,preview,render};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CookingMastery=api;
})(typeof window!=='undefined'?window:globalThis);
