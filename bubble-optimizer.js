(function(root){
'use strict';
const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v;}catch{return null;}};
const num=v=>v!==null&&v!==undefined&&v!==''&&typeof v!=='boolean'&&Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>v===null||v===undefined?'Unknown':Number(v).toLocaleString(undefined,{maximumFractionDigits:3});
// Bubble IDs use the installed catalog's cauldron letter and zero-based index.
// Shared pools are deliberately not inferred from a single bubble's tooltip.
const CAPS={
 G4:{name:'Anvilnomics',limit:90},Y2:{name:'Startue EXP',limit:50},
 O14:{name:'Orange Bargain',limit:95},G14:{name:'Green Bargain',limit:95},P14:{name:'Purple Bargain',limit:95},Y14:{name:'Yellow Bargain',limit:95},
 Y6:{name:'Undeveloped Costs + vial',limit:95,shared:true},G19:{name:'AFK EXP doubling',limit:90,shared:true},
 Y11:{name:'Printer sample rate',limit:90,shared:true},Y23:{name:'Gifts Abound',limit:35},
 Y28:{name:'Ninja Looter item-find contribution',limit:2},Y32:{name:'Codfrey Rulz OK',limit:20},O33:{name:'Royal Riches',limit:50},
 Y4:{name:'Shared prowess contribution',limit:2,shared:true},G30:{name:'Multi-resource value',limit:98,shared:true},
 P30:{name:'Deep Depth / holes to next floor',limit:200,shared:true}
};
const CONDITIONAL={O3:'Multi-ore',O6:'Multi-fish',P3:'Multi-log',G7:'Multi-bug'};
const SECONDARY=[[0,2,4,7,14],[0,6,9,12,14],[0,2,6,12,14],[]];
function value(b,l){const a=Number(b.base),k=Number(b.scale);if(l<=0)return 0;switch(b.formula){
 case 'decay':return a*l/(l+k);case 'decayMulti':return 1+a*l/(l+k);
 case 'addDECAY':return l<=50000?a*l:a*50000+(l-50000)/(l+100000)*a*50000;
 case 'bigBase':return a+k*l;default:return null;
}}
function ceiling(b){return b.formula==='decay'?b.base:b.formula==='decayMulti'?1+b.base:b.formula==='addDECAY'?b.base*100000:null;}
function levelFor(b,effect,multi){
 const goal=effect/multi,a=Number(b.base),k=Number(b.scale);let n;
 if(!(multi>0)||!(goal>0))return null;
 if(b.formula==='decay'||b.formula==='decayMulti'){const y=goal-(b.formula==='decayMulti'?1:0);if(y>=a)return null;n=y<=0?1:k*y/(a-y);}
 else if(b.formula==='bigBase'){if(k<=0)return null;n=(goal-a)/k;}
 else if(b.formula==='addDECAY'){if(goal>=a*100000)return null;n=goal<=a*50000?goal/a:50000+150000*(goal-a*50000)/(a*100000-goal);}
 else return null;
 let target=Math.max(1,Math.ceil(n));while(value(b,target)*multi<effect&&target<Number.MAX_SAFE_INTEGER)target++;
 if(target>1&&value(b,target-1)*multi>=effect)target--;return Number.isSafeInteger(target)?target:null;
}
function model(raw={},catalog=root.ALCHEMY_CATALOG||[],context={},settings={}){
 const data=parse(raw.data)||raw,levels=parse(data.CauldronInfo),options=parse(data.OptLacc??data.OptionsListAccount),prismaText=options?.[384]??options?.h?.[384];
 const goal=[.9,.95,.99].includes(Number(settings.goal))?Number(settings.goal):.95;
 const matching=!!settings.matching,rows=[];
 const prismaKnown=prismaText!==undefined&&prismaText!==null;
 const prisma=(g,i)=>prismaKnown?String(prismaText).includes('_abc'[g]+i+','):null;
 const prismaValue=num(context.prismaMulti);
 const multiplier=(g,i)=>{const active=prisma(g,i);return active===false?1:active===true&&prismaValue!==null?prismaValue:null;};
 const saved=(g,i)=>num(parse(levels?.[g])?.[i]);
 for(let g=0;g<catalog.length;g++)for(const [i,b] of catalog[g].bubbles.entries()){
 if(b.name==='BUBBLE')continue;
 const id=catalog[g].letter+i,level=saved(g,i),cap=CAPS[id],conditional=CONDITIONAL[id];let multi=multiplier(g,i);
 for(const index of [...(SECONDARY[g].includes(i)?[16]:[]),...(matching&&g<3&&!b.active&&i!==1&&!(g===0&&i===12)?[1]:[])]){
 const depLevel=saved(g,index),depMulti=multiplier(g,index);
 if(depLevel===null||depMulti===null)multi=null;
 else if(depLevel>0&&multi!==null)multi*=value(catalog[g].bubbles[index],depLevel)*depMulti;
 }
 const base=level===null?null:value(b,level),limit=ceiling(b),effective=multi===null||base===null?null:base*multi;
 const softLevel=b.formula==='decay'||b.formula==='decayMulti'?Math.ceil(b.scale*goal/(1-goal)-1e-9):b.formula==='addDECAY'?50000:null;
 const shared=num(context.shared?.[id]),other=shared??0;
 const capLevel=cap&&other>=cap.limit?0:cap&&multi!==null?levelFor(b,cap.limit-other,multi):null;
 const capped=cap&&(other>=cap.limit||effective!==null&&effective+other>=cap.limit);
 let target=softLevel,state='Underleveled',reason='Below your selected diminishing-return checkpoint.';
 if(capLevel!==null)target=target===null?capLevel:Math.min(target,capLevel);
 if(level===null){state='Missing data';target=null;reason='This bubble level is missing from the export.';}
 else if(level===0){state='Locked';target=null;reason='Discover this bubble before planning upgrades.';}
 else if(capped){state='Capped';target=null;reason='Additional levels do not improve this capped effect in the selected class context.';}
 else if(cap?.shared&&shared===null||conditional){state='Check shared cap';target=null;reason='Other bonuses or character setup affect this limit. Check the combined in-game value before spending.';}
 else if(cap&&multi===null){state='Check multipliers';target=null;reason='Prisma or multiplier data is missing, so a safe stop level cannot be calculated.';}
 else if(softLevel===null){state='No finite cap';target=null;reason='This formula keeps growing. Compare its next-level gain with your current goal and cost.';}
 else if(level>=target){state='Soft target met';target=null;reason=b.formula==='addDECAY'?'Past the 50,000-level linear section. Further levels still help at diminishing returns.':'Selected soft target met. Further levels still help; this is a spending checkpoint, not a hard cap.';}
 const progress=level===null?null:b.formula==='decay'||b.formula==='decayMulti'?level/(level+b.scale):b.formula==='addDECAY'?Math.min(1,level/50000):null;
 const priority=['Y9','Y31','Y17','O12','O1','G1','P1','O16','G16','P16'].includes(id)?3:['O2','O7','O14','O17','G2','G4','G6','G14','G17','P2','P6','P8','P11','P14','P17','Y6','Y10','Y13','Y14','Y15','Y16','Y20','Y22','Y24','Y25','Y30'].includes(id)?2:1;
 const evidence=(root.ShadowCapsData?.caps||[]).find(c=>c.name===(cap?.name||conditional));
 rows.push({id,name:b.name,group:catalog[g].name,level,formula:b.formula,description:b.bonus,active:b.active,prisma:prisma(g,i),multi,base,effective,
  ceiling:limit===null?null:limit*(multi??1),ceilingBaseOnly:multi===null,softLevel,capLevel,cap:cap?{...cap}:null,conditional,evidence: evidence?{limit:evidence.limit,note:evidence.note}:null,
  target,state,reason,progress,priority,shared,gain:level>0&&multi!==null&&!conditional&&(!cap?.shared||shared!==null||capped)?(cap?Math.min(cap.limit,value(b,level+1)*multi+other)-Math.min(cap.limit,effective+other):(value(b,level+1)-base)*multi):null,
  targetGain:target!==null&&effective!==null?(cap?Math.min(cap.limit,value(b,target)*multi+other)-Math.min(cap.limit,effective+other):(value(b,target)-base)*multi):null});
 }
 const todo=rows.filter(r=>r.state==='Underleveled'&&r.target>r.level).sort((a,b)=>b.priority-a.priority||(a.progress??0)-(b.progress??0)||(a.target-a.level)-(b.target-b.level)||a.id.localeCompare(b.id));
 return {rows,todo,goal,matching,prismaMulti:prismaValue,warning:context.warning||null};
}
const jobs=new WeakMap();
function prepare(raw){if(jobs.has(raw))return jobs.get(raw);const promise=new Promise(resolve=>{
 const worker=new root.Worker('bubble-optimizer-worker.js');const timer=setTimeout(()=>done({warning:'Account multiplier decoding timed out. Base targets remain available.'}),45000);
 function done(context){clearTimeout(timer);worker.terminate();resolve(context);}
 worker.onmessage=e=>done(e.data);worker.onerror=()=>done({warning:'Account multipliers unavailable. Import a full export to verify cap levels.'});worker.postMessage(raw);
});jobs.set(raw,promise);return promise;}
function render(host,raw){
 let settings={goal:.95,matching:false},query='',filter='All',group='All',showAll=false,context={},done=new Set(),token={},marker;host.bubbleToken=token;
 try{done=new Set(JSON.parse(localStorage.getItem('idleon-bubble-todo-v1')||'[]'));}catch{}
 function paint(){const report=model(raw,root.ALCHEMY_CATALOG,context,settings),counts=state=>report.rows.filter(r=>r.state===state).length;
 const entries=report.rows.filter(r=>(filter==='All'||r.state===filter)&&(group==='All'||r.group===group)&&`${r.name} ${r.description}`.toLowerCase().includes(query));
 const todo=report.todo.filter(r=>!done.has(r.id+'|'+r.target));
 const capText=r=>r.cap?`${r.evidence?.limit||fmt(r.cap.limit)}${r.cap.shared?' · shared pool':''}`:r.conditional?(r.evidence?.limit||'Character-dependent limit'):'No verified hard effect cap';
 host.innerHTML=`<section class="bubble-optimizer"><div class="section-head"><div><p class="eyebrow">World 2 · Alchemy</p><h2>Bubble upgrade optimizer</h2><p>Spend toward useful targets. Keep capped effects out of your upgrade list.</p></div><button class="secondary" data-bubble-collection>Bubble collection</button></div>
 <div class="bubble-controls"><label>Soft target<select id="bubbleGoal">${[90,95,99].map(n=>`<option value="${n/100}" ${settings.goal===n/100?'selected':''}>${n}% of diminishing bonus</option>`).join('')}</select></label><label>Class context<select id="bubbleClass"><option value="all">Without matching-class boost</option><option value="matching" ${settings.matching?'selected':''}>With matching-class boost</option></select></label></div>
 <p class="review-note">Prisma multiplier: ${report.prismaMulti===null?'loading or unavailable':fmt(report.prismaMulti)+'×'}. Class context applies the colour’s class bubble to passive bubbles (Carpenter is exempt). Targets hold other bubble levels fixed. Large bubbles must be active for their effect.</p>${report.warning?`<p role="status">${esc(report.warning)}</p>`:''}
 <div class="bubble-summary"><div><strong>${report.todo.length}</strong> underleveled</div><div><strong>${counts('Capped')}</strong> capped effects</div><div><strong>${counts('Soft target met')}</strong> soft targets met</div><div><strong>${counts('Check shared cap')+counts('Check multipliers')}</strong> need checking</div></div>
 <h3>Bubble upgrade to-do list</h3><p>Account growth bubbles first, then the largest gap to your selected soft target. This is cap-based priority, not a material-cost optimizer.</p>
 <div class="bubble-todo">${todo.slice(0,showAll?todo.length:12).map((r,i)=>`<article><span>${i+1} · ${esc(r.group)} · ${r.priority===3?'Account growth':r.priority===2?'Production / efficiency':'Other bonuses'}</span><h4>${esc(r.name)}</h4><p>Lv ${fmt(r.level)} → <strong>${fmt(r.target)}</strong> · ${fmt(r.target-r.level)} levels</p><p>${r.capLevel!==null&&r.target===r.capLevel?'Stop at the effective cap.':'Reach the selected soft checkpoint.'} ${r.targetGain!==null?'Effect gain: +'+fmt(r.targetGain)+'.':'Effective gain needs multiplier data.'}</p><button class="secondary" data-bubble-done="${esc(r.id+'|'+r.target)}">Mark planned</button></article>`).join('')||'<p>No remaining upgrades below the selected target. Review shared caps, uncapped bubbles, or missing data below.</p>'}</div><p class="review-note">Showing ${showAll?todo.length:Math.min(12,todo.length)} of ${todo.length} unplanned targets. Marking planned does not change saved levels.${todo.length>12?` <button class="secondary" data-bubble-show>${showAll?'Show first 12':'Show all targets'}</button>`:''}${done.size?' <button class="secondary" data-bubble-reset>Reset planned marks</button>':''}</p>
 <h3>All bubbles &amp; caps</h3><div class="bubble-controls"><label>Search<input id="bubbleSearch" type="search" value="${esc(query)}" placeholder="Bubble or bonus"></label><label>Status<select id="bubbleStatus">${['All','Underleveled','Capped','Soft target met','Check shared cap','Check multipliers','No finite cap','Locked','Missing data'].map(s=>`<option ${filter===s?'selected':''}>${s}</option>`).join('')}</select></label><label>Cauldron<select id="bubbleGroup">${['All',...root.ALCHEMY_CATALOG.map(g=>g.name)].map(s=>`<option ${group===s?'selected':''}>${s}</option>`).join('')}</select></label></div>
 <p aria-live="polite">${entries.length} bubbles shown</p><div class="bubble-table-wrap"><table><thead><tr><th>Bubble / level</th><th>Status / next step</th><th>Hard / shadow cap</th><th>Soft ceiling / target</th></tr></thead><tbody>${entries.map(r=>`<tr><td><strong>${esc(r.name)}</strong><small>${esc(r.group)} · Lv ${fmt(r.level)}${r.prisma?' · Prisma':''}</small><details><summary>Bonus &amp; calculation</summary><p>${esc(r.description)}</p><p>Formula: ${esc(r.formula)}. Base: ${fmt(r.base)}. Multiplier: ${fmt(r.multi)}. Before effect cap: ${fmt(r.effective)}.${r.shared!==null?` Other saved pool bonuses: ${fmt(r.shared)}.`:''} Next-level effect gain: ${fmt(r.gain)}.</p>${r.evidence?`<p>${esc(r.evidence.note)}</p>`:''}${r.active?'<p>Requires an active large bubble; equipment and companion activation are not verified here.</p>':''}</details></td><td><b>${esc(r.state)}</b><p>${esc(r.reason)}</p>${r.target!==null?`<strong>Target Lv ${fmt(r.target)}</strong>`:''}</td><td>${esc(capText(r))}${r.cap?`<small>${r.capLevel===0?'Shared pool already capped':r.capLevel!==null?(r.shared!==null?'With saved shared bonuses: Lv ':'Bubble-alone threshold: Lv ')+fmt(r.capLevel):r.multi===null?'Level requires multiplier data':'No finite bubble-alone level reaches this limit'}${r.cap.shared?' · other sources can reach it sooner':''}</small>`:''}</td><td>${r.ceiling===null?'No finite formula ceiling':fmt(r.ceiling)+(r.ceilingBaseOnly?' (base only)':'')+' · approached, not reached'}<small>${r.softLevel!==null?'Checkpoint Lv '+fmt(r.softLevel)+(r.formula==='addDECAY'?' · diminishing returns begin':' · '+Math.round(report.goal*100)+'% of variable bonus'):'No soft checkpoint'}${r.progress!==null?' · '+fmt(100*r.progress)+'% reached':''}</small></td></tr>`).join('')}</tbody></table></div>
 <details class="bubble-method"><summary>How to read caps and priorities</summary><p>A hard effect cap stops the named bonus from increasing. A shadow cap is such a limit in the consuming calculation even if the tooltip grows. No universal hard bubble-level limit is assumed. Soft ceilings are asymptotes, not stop rules. The 90/95/99% checkpoints apply to the variable part of decayMulti, excluding its baseline 1×.</p><p>addDECAY grows linearly through level 50,000, then approaches twice that base bonus. Large-bubble and character-dependent combined pools need a setup check. “Capped” applies only to the named effect and selected context; it does not rule out benefits from total bubble levels or other account mechanics.</p><p>Cap evidence: installed game client, ${esc(root.ShadowCapsData?.checked||'local audit')}. Cost, available materials and affordability are not modeled. Planned marks are stored in this browser; new save levels recalculate the list.</p></details></section>`;
 marker=host.firstElementChild;
 host.querySelector('[data-bubble-collection]').onclick=()=>root.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'alchemyCollection'}));
 host.querySelector('#bubbleGoal').onchange=e=>{settings.goal=Number(e.target.value);paint();};host.querySelector('#bubbleClass').onchange=e=>{settings.matching=e.target.value==='matching';paint();};
 host.querySelector('#bubbleStatus').onchange=e=>{filter=e.target.value;paint();};host.querySelector('#bubbleGroup').onchange=e=>{group=e.target.value;paint();};
 host.querySelector('#bubbleSearch').oninput=e=>{const start=e.target.selectionStart;query=e.target.value.toLowerCase();paint();const input=host.querySelector('#bubbleSearch');input.focus();input.setSelectionRange(start,start);};
 host.querySelectorAll('[data-bubble-done]').forEach(b=>b.onclick=()=>{done.add(b.dataset.bubbleDone);try{localStorage.setItem('idleon-bubble-todo-v1',JSON.stringify([...done]));}catch{}paint();});
 const show=host.querySelector('[data-bubble-show]');if(show)show.onclick=()=>{showAll=!showAll;paint();};
 const reset=host.querySelector('[data-bubble-reset]');if(reset)reset.onclick=()=>{done.clear();try{localStorage.removeItem('idleon-bubble-todo-v1');}catch{}paint();};
 }
 paint();prepare(raw).then(result=>{if(host.bubbleToken!==token||host.firstElementChild!==marker)return;context=result;paint();});
}
const api={model,value,levelFor,render,CAPS};if(typeof module!=='undefined')module.exports=api;else root.BubbleOptimizer=api;
})(typeof window!=='undefined'?window:globalThis);
