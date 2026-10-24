(function(root){
'use strict';
const read=v=>{try{return typeof v==='string'?JSON.parse(v):v;}catch{return null;}};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const name=v=>String(v).replaceAll('_',' ');
const fmt=v=>v>=1e6?v.toExponential(2):v.toLocaleString(undefined,{maximumFractionDigits:2});
// Exact partition DP: each kitchen is used once, and each meal consumes stock once.
// One level outweighs all fractional-progress tie breakers combined.
function optimize({meals,speeds,ladles,cap,cost}){
 if(!Number.isFinite(ladles)||ladles<=0)throw Error('Enter a positive deposited ladle count.');
 if(!speeds.length||speeds.length>10||speeds.some(s=>!Number.isFinite(s)||s<=0))throw Error('Enter a positive speed for each unlocked kitchen (up to 10).');
 if(!Number.isInteger(cap)||cap<1||cap>200)throw Error('Confirm a meal cap between 1 and 200.');
 const eligible=meals.filter(m=>Number.isInteger(m.level)&&m.level>0&&m.level<cap&&Number.isFinite(m.stock)&&m.stock>=0&&Number.isFinite(m.progress)&&m.progress>=0&&Number.isFinite(m.requirement)&&m.requirement>0);
 const size=1<<speeds.length,full=size-1,sums=new Float64Array(size);
 for(let mask=1;mask<size;mask++){const bit=mask&-mask;sums[mask]=sums[mask^bit]+speeds[Math.log2(bit)];}
 const projections=eligible.map(m=>{
  const thresholds=[0];let sum=0;
  for(let level=m.level;level<cap;level++){sum+=Math.ceil(cost(level));thresholds.push(sum);}
  const project=mask=>{const produced=sums[mask]*ladles/m.requirement;
   if(!Number.isFinite(produced))throw Error('Production exceeds the supported numeric range. Reduce the entered values.');
   const available=m.stock+m.progress/m.requirement+produced;
   let gain=0;while(gain+1<thresholds.length&&available>=thresholds[gain+1])gain++;
   const fraction=m.level+gain>=cap?0:Math.max(0,Math.min(1,(available-thresholds[gain])/(thresholds[gain+1]-thresholds[gain])));
   return {after:m.level+gain,gain,fraction};};
  const baseline=project(0),values=Array.from({length:size},(_,mask)=>project(mask));
  return {meal:m,values,scores:values.map(v=>v.gain-baseline.gain+(v.fraction-baseline.fraction)/(eligible.length+1))};
 });
 let dp=new Float64Array(size).fill(-Infinity);dp[0]=0;const choices=[];
 for(const p of projections){const next=dp.slice(),choice=new Uint16Array(size);
  for(let mask=1;mask<size;mask++)for(let sub=mask;sub;sub=(sub-1)&mask){const score=dp[mask^sub]+p.scores[sub];if(score>next[mask]){next[mask]=score;choice[mask]=sub;}}
  choices.push(choice);dp=next;
 }
 let mask=full;const groups=[];
 if(!Number.isFinite(dp[mask]))return {groups:[],slots:[],gain:0,excluded:meals.length-eligible.length};
 for(let i=projections.length-1;i>=0;i--){const sub=choices[i][mask];if(sub){const p=projections[i],slots=speeds.flatMap((_,j)=>sub&(1<<j)?[j]:[]);groups.push({...p.meal,...p.values[sub],slots});mask^=sub;}}
 return {groups,slots:speeds.map((speed,slot)=>({slot,speed,group:groups.find(g=>g.slots.includes(slot))})),gain:groups.reduce((s,g)=>s+g.gain,0),excluded:meals.length-eligible.length};
}
function render(host,{data,model,catalog,selected,config,loading}){
 const saved=read(data.Menagerie),state=config.blueJelly||(config.blueJelly={ladles:saved?.[0]?.[5]??'',speeds:null});
 const speeds=state.speeds||selected?.speeds||[];
 host.innerHTML=`<div class="cook-nmlb-head"><div><h3>Blue Jellyfish · Kitchen optimizer</h3><p>Choose meals for your next daily reset.</p></div><img src="assets/MenaJelly2.png" width="64" height="64" alt="Blue Jellyfish"></div><details class="cook-blue-settings"><summary>Settings and details</summary><p class="cook-note">${saved?.[2]?.[5]>=1?'Blue Jellyfish unlocked.':saved?'Blue Jellyfish is locked in this save. You can plan ahead below.':'Import Menagerie data or enter your deposited ladles below.'} Every kitchen receives the full deposited count as hours of cooking each reset. Overflowing Ladle does not apply.</p><form class="cook-settings" id="blueForm"><label>Deposited ladles<input name="ladles" aria-label="Blue Jellyfish deposited ladles" value="${esc(state.ladles)}" placeholder="e.g. 1e8" inputmode="decimal" required></label><label>Kitchen speeds / hour, in slot order<input name="speeds" aria-label="Individual kitchen speeds" value="${esc(speeds.join(', '))}" placeholder="e.g. 1e30, 8e29, 5e29" required></label><button ${loading?'disabled':''}>Optimize kitchen slots</button><p>Uses ${config.cap} as your meal cap. Change it in Set up estimates if needed. Kitchen speeds come from the character and Voidwalker preset selected above; you can override them here.</p><p id="blueError" role="alert">${loading?'Calculating individual kitchen speeds…':''}</p></form><p class="cook-note">Maximizes total meal levels at fixed speed; progress toward the next level breaks ties. All unlocked meals compete equally. Existing stock is counted once per meal, including when several kitchens share it. Predictions exclude ordinary elapsed cooking, daily free levels, and speed increases from new meal levels. Claim the available upgrades in-game after the reset.</p></details><div id="blueResults" aria-live="polite"></div>`;
 const form=host.querySelector('#blueForm');
 const run=()=>{const error=host.querySelector('#blueError'),out=host.querySelector('#blueResults');error.textContent='';out.innerHTML='';
  try{const ladles=Number(form.elements.ladles.value),rates=form.elements.speeds.value.trim().split(/[\s,;]+/).filter(Boolean).map(Number);
   const result=optimize({meals:catalog.map((r,id)=>({id,name:name(r[0]),bonus:name(r[3]),level:model.levels[id],stock:model.stock[id],progress:model.progress[id],requirement:Number(r[1])})),speeds:rates,ladles,cap:config.cap,cost:level=>root.Cooking.cost(level,model.discount,config.companion)});
   state.ladles=ladles;if(rates.join(',')!==selected?.speeds?.join(','))state.speeds=rates;else state.speeds=null;
   out.innerHTML=result.groups.length?`<h3>Recommended slots · +${result.gain} meal levels available</h3><p class="cook-note">Repeated meals share the projected level below. ${result.gain===0?'No whole levels are reachable this reset; this allocation prioritizes partial progress.':''}</p><div class="cook-plans">${result.slots.slice().sort((a,b)=>b.slot-a.slot).map(({slot,speed,group:g})=>`<article class="cook-plan"><div class="cook-plan-title"><img src="assets/CookingM${g.id}.png" alt=""><span><small>Kitchen ${slot+1} · ${fmt(speed)} / hr</small><strong>Meal ${g.id+1} · ${esc(g.name)}</strong></span></div><p>Level ${g.level} → <strong>${g.after}</strong> (+${g.gain})${g.slots.length>1?' · combined across kitchens '+g.slots.map(i=>i+1).join(', '):''}</p><small>${esc(g.bonus.replace('{','…'))}</small></article>`).join('')}</div>`:'<p>No eligible meals. Recipes must be discovered, below the cap, and have saved stock and progress data.</p>';
  }catch(e){error.textContent=e.message;host.querySelector('.cook-blue-settings').open=true;}
 };
 form.onsubmit=e=>{e.preventDefault();run();};
 if(!loading&&Number(state.ladles)>0&&speeds.length)run();
}
const api={optimize,render};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BlueJelly=api;
})(typeof window!=='undefined'?window:globalThis);
