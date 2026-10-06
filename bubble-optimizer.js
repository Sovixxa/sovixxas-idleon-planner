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
// Only ordinary AFK materials are candy candidates. Time-gated currencies need their own systems.
function candyMaterial(id){return /^(?:Copper|Iron|Gold|Plat|Dementia|Void|Lustre|Starfire|Dreadlo|Marble|Godshard|Prehistrium)$/.test(id)||/^(?:Fish\d+|Bug\d+|Tree\d+|OakTree|BirchTree|JungleTree|ForestTree|ToiletTree|StumpTree|SaharanFoal|AlienTree|Grasslands\d+|Jungle\d+|Desert[A-C]\d+|Snow[A-C]\d+|Galaxy[A-C]\d+|Lava[A-C]\d+|Spi[A-D]\d+|w7[A-D]\d+)[a-z]?$/.test(id);}
function materialCost(req,index,level,discount){
 if(/^Liquid[1-4]$/.test(req.rawName))return req.baseCost+Math.floor(level/20);
 if(num(discount)===null||discount<=0||!Number.isFinite(req.baseCost))return null;
 // Special currencies have system-specific limits and are intentionally not priced as inventory items.
 if(/^(?:Bits|W6item)/.test(req.rawName))return null;
 const rate=index>14?1.37-.28*level/(60+level):1.35-.3*level/(50+level);
 return Math.round(Math.max(1,Math.min(1e9,req.baseCost*Math.pow(rate,level)*discount)));
}
function spendingPlan(row,requirements,context={},settings={}){
 if(!['Underleveled','No finite cap'].includes(row.state))return {method:'Hold',reason:row.reason,cost:null,eligible:false,farmable:false,clicks:0,target:row.level,totals:{},particles:0,gain:1,stop:row.reason};
 const info=context.spending,reqs=requirements||[],material=reqs.find(r=>!/^Liquid/.test(r.rawName));
 const discount=info?.discounts?.['OGPY'.indexOf(row.id[0])]?.[settings.matching?'matching':'all'];
 const index=Number(row.id.slice(1)),cost=material&&row.level>0?materialCost(material,index,row.level,discount):null;
 const farmable=!!material&&candyMaterial(material.rawName),eligible=cost!==null&&cost>=1e8;
 const method=farmable?'Candy / materials':eligible&&info?.boron?'Atoms':'Materials / other';
 const reason=farmable?'Farm this AFK material with candy or use printer / stored materials; save limited atom clicks for harder resources.':eligible&&info?.boron?'This material is not a direct AFK candy drop. Use Boron clicks when the displayed cost is at least 100M.':!material?'This bubble uses liquids, not atoms or candy drops.':cost===null?'Special resource or missing cost data: use its source system and check the in-game price.':eligible?'Unlock Boron before using atom clicks.':'Below the 100M atom threshold; use materials or free daily levels first.';
 const limit=Math.max(1,Math.min(1000,Math.floor(num(settings.clicks)??25)));
 const atomLimit=Math.max(0,Math.floor(num(settings.atomClicks)??num(info?.remainingAtomClicks)??0));
 const gain=info&&num(info.larry)!==null?Math.max(1,Math.ceil(info.larry/100)):1;
 const totals={},maxClicks=method==='Atoms'?Math.min(limit,atomLimit):limit;
 let level=row.level,clicks=0,particles=0,stop='Session click limit';
 if(!info||!reqs.length||row.level===null||row.level===0)return {method,reason,cost,eligible,farmable,clicks:0,target:row.level,totals,particles,gain,stop:'Load complete account data to calculate a session.'};
 for(;clicks<maxClicks;clicks++){
  if(row.target!==null&&level>=row.target){stop='Long-term checkpoint reached';break;}
  const prices=reqs.map(r=>materialCost(r,index,level,discount));
  if(prices.some(p=>p===null||!Number.isFinite(p))){stop='Check special-resource cost in game';break;}
  let blocked=false;
  for(let j=0;j<reqs.length;j++)if(/^Liquid/.test(reqs[j].rawName)){
   const available=num(info.liquids?.[Number(reqs[j].rawName.slice(-1))-1]);
   if(available===null||(totals[reqs[j].rawName]||0)+prices[j]>available){stop=available===null?'Liquid balance unavailable':'Saved liquid balance is the limit';blocked=true;break;}
  }
  if(blocked)break;
  const atomCost=method==='Atoms'?Math.floor(prices[reqs.indexOf(material)]/1e9*(index+1)*Math.pow(1.04,index)*100):0;
  if(method==='Atoms'&&(num(info.particles)===null||particles+atomCost>info.particles)){stop='Saved particle balance is the limit';break;}
  reqs.forEach((r,j)=>{if(method!=='Atoms'||/^Liquid/.test(r.rawName))totals[r.rawName]=(totals[r.rawName]||0)+prices[j];});
  particles+=atomCost;level+=gain;
 }
 if(method==='Atoms'&&maxClicks===0)stop='Enter your remaining atom clicks above';
 return {method,reason,cost,eligible,farmable,clicks,target:level,totals,particles,gain,stop};
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
 rows.push({id,name:b.name,icon:b.icon,itemReq:b.itemReq,group:catalog[g].name,level,formula:b.formula,description:b.bonus,active:b.active,prisma:prisma(g,i),multi,base,effective,
  ceiling:limit===null?null:limit*(multi??1),ceilingBaseOnly:multi===null,softLevel,capLevel,cap:cap?{...cap}:null,conditional,evidence: evidence?{limit:evidence.limit,note:evidence.note}:null,
  target,state,reason,progress,priority,shared,gain:level>0&&multi!==null&&!conditional&&(!cap?.shared||shared!==null||capped)?(cap?Math.min(cap.limit,value(b,level+1)*multi+other)-Math.min(cap.limit,effective+other):(value(b,level+1)-base)*multi):null,
  targetGain:target!==null&&effective!==null?(cap?Math.min(cap.limit,value(b,target)*multi+other)-Math.min(cap.limit,effective+other):(value(b,target)-base)*multi):null});
 }
 for(const row of rows)row.spending=spendingPlan(row,row.itemReq,context,settings);
 const todo=rows.filter(r=>r.state==='Underleveled'&&r.target>r.level).sort((a,b)=>b.priority-a.priority||(a.progress??0)-(b.progress??0)||(a.target-a.level)-(b.target-b.level)||a.id.localeCompare(b.id));
 return {rows,todo,goal,matching,prismaMulti:prismaValue,warning:context.warning||null};
}
const jobs=new WeakMap();
function prepare(raw){
 if(jobs.has(raw))return jobs.get(raw);
 const promise=new Promise(resolve=>{
  let worker,timer;
  function done(context){clearTimeout(timer);worker?.terminate();resolve(context);}
  const failed=()=>done({warning:'Account multipliers unavailable. Reopen this page to retry, or import a full export to verify cap levels.'});
  try{
   worker=new root.Worker('bubble-optimizer-worker.js');
   timer=setTimeout(()=>done({warning:'Account multiplier decoding timed out. Base targets remain available.'}),45000);
   worker.onmessage=e=>done(e.data);worker.onerror=failed;worker.postMessage(raw);
  }catch{failed();}
 });
 jobs.set(raw,promise);
 promise.then(context=>{if(context?.warning&&jobs.get(raw)===promise)jobs.delete(raw);});
 return promise;
}
function render(host,raw,afterRender){
 let settings={goal:.95,matching:false,clicks:25,atomClicks:null},material='All',method='All',yields={},query='',filter='All',group='All',showAll=false,context={},expanded=new Set(),done=new Set(),token={},marker;host.bubbleToken=token;
 try{done=new Set(JSON.parse(localStorage.getItem('idleon-bubble-todo-v1')||'[]'));}catch{}
 function paint(){host.querySelectorAll('[data-bubble-details]').forEach(detail=>{detail.open?expanded.add(detail.dataset.bubbleDetails):expanded.delete(detail.dataset.bubbleDetails);});const report=model(raw,root.ALCHEMY_CATALOG,context,settings),counts=state=>report.rows.filter(r=>r.state===state).length;
 const matchesMaterial=r=>material==='All'||root.UpgradeMaterials.bubble(r).includes(material);
 const entries=report.rows.filter(r=>matchesMaterial(r)&&(filter==='All'||r.state===filter)&&(group==='All'||r.group===group)&&`${r.name} ${r.description}`.toLowerCase().includes(query));
 const todo=[...report.todo,...report.rows.filter(r=>r.state==='No finite cap')].filter(r=>matchesMaterial(r)&&!done.has(r.id+'|'+r.target)&&(method==='All'||r.spending.method===method));
 const bubbleName=r=>`<span class="bubble-name"><img src="${esc(r.icon)}" width="40" height="40" alt="" loading="lazy"><strong>${esc(r.name)}</strong></span>`;
 const spending=r=>{const p=r.spending,material=r.itemReq?.find(x=>!/^Liquid/.test(x.rawName)),yieldValue=num(yields[r.id]),needed=material?p.totals[material.rawName]:null;return `<p class="bubble-route">${esc(p.method)}${p.eligible?' · atom threshold reached':''}</p><p>${esc(p.reason)}</p><p><strong>This session: ${fmt(p.clicks)} clicks · Lv ${fmt(r.level)} → ${fmt(p.target)}</strong></p><p>${esc(p.stop)}. ${p.clicks?`${fmt(p.gain)} guaranteed levels per click; random extra levels may finish sooner.`:''}</p>${p.clicks?`<ul class="bubble-costs">${p.particles?`<li>${fmt(p.particles)} particles</li>`:''}${Object.entries(p.totals).map(([id,total])=>`<li>${fmt(total)} ${esc((r.itemReq.find(x=>x.rawName===id)?.name||id).replaceAll('_',' '))}</li>`).join('')}</ul>`:''}${p.farmable&&needed?`<label class="bubble-candy-input">${esc(material.name.replaceAll('_',' '))} collected per candy<input type="number" min="1" step="any" data-candy-yield="${r.id}" value="${esc(yields[r.id]||'')}" placeholder="Your measured yield"></label><p>${yieldValue>0?`${fmt(Math.ceil(needed/yieldValue))} candies for this session (same yield per candy).`:'Enter your actual yield for a candy-count estimate.'}</p>`:''}`;};
 const capText=r=>r.cap?`${r.evidence?.limit||fmt(r.cap.limit)}${r.cap.shared?' · shared pool':''}`:r.conditional?(r.evidence?.limit||'Character-dependent limit'):'No verified hard effect cap';
 host.innerHTML=`<section class="bubble-optimizer"><div class="section-head"><div><p class="eyebrow">World 2 · Alchemy</p><h2>Bubble upgrade optimizer</h2><p>Spend toward useful targets. Keep capped effects out of your upgrade list.</p></div><button class="secondary" data-bubble-collection>Bubble collection</button></div>
 <div class="bubble-controls"><label>Soft target<select id="bubbleGoal">${[90,95,99].map(n=>`<option value="${n/100}" ${settings.goal===n/100?'selected':''}>${n}% of diminishing bonus</option>`).join('')}</select></label><label>Class context<select id="bubbleClass"><option value="all">Without matching-class boost</option><option value="matching" ${settings.matching?'selected':''}>With matching-class boost</option></select></label></div>
 <p class="review-note">Prisma multiplier: ${report.prismaMulti===null?'loading or unavailable':fmt(report.prismaMulti)+'×'}. Class context applies the colour’s class bubble to passive bubbles (Carpenter is exempt). Targets hold other bubble levels fixed. Large bubbles must be active for their effect.</p>${report.warning?`<p role="status">${esc(report.warning)}</p>`:''}
 <div class="bubble-summary"><div><strong>${report.todo.length}</strong> underleveled</div><div><strong>${counts('Capped')}</strong> capped effects</div><div><strong>${counts('Soft target met')}</strong> soft targets met</div><div><strong>${counts('Check shared cap')+counts('Check multipliers')}</strong> need checking</div></div>
 <div class="bubble-controls"><label>Upgrade material<select id="bubbleMaterial">${['All',...root.UpgradeMaterials.options(report.rows,root.UpgradeMaterials.bubble)].map(s=>`<option ${material===s?'selected':''}>${esc(s)}</option>`).join('')}</select></label></div><p class="review-note">Material filter applies to recommendations and the full table. Bubbles match any required resource, including liquids.</p><h3>What to click next</h3><p>Use candy or printed materials for farmable resources. Reserve atom clicks for resources you cannot directly farm with candy. Each card is an alternative session, not a combined shopping list.</p><div class="bubble-controls"><label>Clicks per bubble this session<input id="bubbleClicks" type="number" min="1" max="1000" value="${settings.clicks}"></label><label>Atom clicks remaining today<input id="bubbleAtomClicks" type="number" min="0" max="1000" value="${settings.atomClicks??context.spending?.remainingAtomClicks??0}"></label><label>Spending method<select id="bubbleMethod">${['All','Atoms','Candy / materials','Materials / other'].map(s=>`<option ${method===s?'selected':''}>${s}</option>`).join('')}</select></label></div><p class="review-note">Session estimates use saved liquids and particles, current discounts, and guaranteed LAAARRRRYYYY levels. Remaining Boron clicks start from the save; update them if you have spent any since importing. Material availability, carry capacity and candy yield are not inferred. Bargain Tags are excluded because they reset after an upgrade. Costs and random extra levels can change during a session; recheck before spending.</p>
 <div class="bubble-todo">${todo.slice(0,showAll?todo.length:12).map((r,i)=>`<article><details data-bubble-details="${esc(r.id)}" ${expanded.has(r.id)?'open':''}><summary><span>${i+1} · ${esc(r.group)} · ${r.priority===3?'Account growth':r.priority===2?'Production / efficiency':'Other bonuses'}</span><h4>${bubbleName(r)}</h4></summary>${spending(r)}<p class="review-note">${r.target===null?'No finite checkpoint — review after each session.':'Long-term checkpoint: Lv '+fmt(r.target)+' · '+fmt(r.target-r.level)+' levels away'}</p><p>${r.target===null?'This bubble keeps growing.':r.capLevel!==null&&r.target===r.capLevel?'Stop at the effective cap.':'Work toward the selected soft checkpoint over multiple sessions.'} ${r.targetGain!==null?'Effect gain: +'+fmt(r.targetGain)+'.':'Effective gain needs multiplier data.'}</p><button class="secondary" data-bubble-done="${esc(r.id+'|'+r.target)}">Mark planned</button></details></article>`).join('')||'<p>No unplanned upgrades match these material and spending filters. Try another filter or review caps and missing data below.</p>'}</div><p class="review-note">Showing ${showAll?todo.length:Math.min(12,todo.length)} of ${todo.length} unplanned targets. Marking planned does not change saved levels.${todo.length>12?` <button class="secondary" data-bubble-show>${showAll?'Show first 12':'Show all targets'}</button>`:''}${done.size?' <button class="secondary" data-bubble-reset>Reset planned marks</button>':''}</p>
 <h3>All bubbles &amp; caps</h3><div class="bubble-controls"><label>Search<input id="bubbleSearch" type="search" value="${esc(query)}" placeholder="Bubble or bonus"></label><label>Status<select id="bubbleStatus">${['All','Underleveled','Capped','Soft target met','Check shared cap','Check multipliers','No finite cap','Locked','Missing data'].map(s=>`<option ${filter===s?'selected':''}>${s}</option>`).join('')}</select></label><label>Cauldron<select id="bubbleGroup">${['All',...root.ALCHEMY_CATALOG.map(g=>g.name)].map(s=>`<option ${group===s?'selected':''}>${s}</option>`).join('')}</select></label></div>
 <p aria-live="polite">${entries.length} bubbles shown</p><div class="bubble-table-wrap"><table><thead><tr><th>Bubble / level</th><th>Status / next step</th><th>Hard / shadow cap</th><th>Soft ceiling / target</th></tr></thead><tbody>${entries.map(r=>`<tr><td>${bubbleName(r)}<small>${esc(r.group)} · Lv ${fmt(r.level)}${r.prisma?' · Prisma':''}</small><details><summary>Bonus &amp; calculation</summary><p>${esc(r.description)}</p><p>Formula: ${esc(r.formula)}. Base: ${fmt(r.base)}. Multiplier: ${fmt(r.multi)}. Before effect cap: ${fmt(r.effective)}.${r.shared!==null?` Other saved pool bonuses: ${fmt(r.shared)}.`:''} Next-level effect gain: ${fmt(r.gain)}.</p>${r.evidence?`<p>${esc(r.evidence.note)}</p>`:''}${r.active?'<p>Requires an active large bubble; equipment and companion activation are not verified here.</p>':''}</details></td><td><b>${esc(r.state)}</b><p>${esc(r.reason)}</p><p class="bubble-route">${esc(r.spending.method)}</p><p>${esc(r.spending.reason)}</p>${r.target!==null?`<strong>Target Lv ${fmt(r.target)}</strong>`:''}</td><td>${esc(capText(r))}${r.cap?`<small>${r.capLevel===0?'Shared pool already capped':r.capLevel!==null?(r.shared!==null?'With saved shared bonuses: Lv ':'Bubble-alone threshold: Lv ')+fmt(r.capLevel):r.multi===null?'Level requires multiplier data':'No finite bubble-alone level reaches this limit'}${r.cap.shared?' · other sources can reach it sooner':''}</small>`:''}</td><td>${r.ceiling===null?'No finite formula ceiling':fmt(r.ceiling)+(r.ceilingBaseOnly?' (base only)':'')+' · approached, not reached'}<small>${r.softLevel!==null?'Checkpoint Lv '+fmt(r.softLevel)+(r.formula==='addDECAY'?' · diminishing returns begin':' · '+Math.round(report.goal*100)+'% of variable bonus'):'No soft checkpoint'}${r.progress!==null?' · '+fmt(100*r.progress)+'% reached':''}</small></td></tr>`).join('')}</tbody></table></div>
 <details class="bubble-method"><summary>How to read caps and priorities</summary><p>A hard effect cap stops the named bonus from increasing. A shadow cap is such a limit in the consuming calculation even if the tooltip grows. No universal hard bubble-level limit is assumed. Soft ceilings are asymptotes, not stop rules. The 90/95/99% checkpoints apply to the variable part of decayMulti, excluding its baseline 1×.</p><p>addDECAY grows linearly through level 50,000, then approaches twice that base bonus. Large-bubble and character-dependent combined pools need a setup check. “Capped” applies only to the named effect and selected context; it does not rule out benefits from total bubble levels or other account mechanics.</p><p>Cap evidence: installed game client, ${esc(root.ShadowCapsData?.checked||'local audit')}. Session estimates reprice every click using the installed material-cost curve and your decoded discounts. Special currencies are left for an in-game check. Liquid and particle balances are checked separately for each card; material balances and candy collection are not assumed. Atom eligibility requires a 100M material price and Boron. Recommendations group by material source, not a universal best-value ranking. Planned marks are stored in this browser; new save levels recalculate the list.</p></details></section>`;
 marker=host.firstElementChild;
 host.querySelectorAll('[data-bubble-details]').forEach(detail=>detail.ontoggle=()=>{if(!detail.isConnected)return;detail.open?expanded.add(detail.dataset.bubbleDetails):expanded.delete(detail.dataset.bubbleDetails);});
 host.querySelector('#bubbleClicks').onchange=e=>{const next=Math.max(1,Math.min(1000,Math.floor(Number(e.target.value)||1)));if(settings.clicks===next)return;settings.clicks=next;queueMicrotask(paint);};
 host.querySelector('#bubbleAtomClicks').onchange=e=>{const next=Math.max(0,Math.min(1000,Math.floor(Number(e.target.value)||0)));if(settings.atomClicks===next)return;settings.atomClicks=next;queueMicrotask(paint);};
 host.querySelector('#bubbleMaterial').onchange=e=>{material=e.target.value;showAll=false;paint();};
 host.querySelector('#bubbleMethod').onchange=e=>{method=e.target.value;paint();};
 host.querySelectorAll('[data-candy-yield]').forEach(input=>input.onchange=e=>{const id=e.target.dataset.candyYield;if(yields[id]===e.target.value)return;yields[id]=e.target.value;queueMicrotask(paint);});
 host.querySelector('[data-bubble-collection]').onclick=()=>root.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'alchemyCollection'}));
 host.querySelector('#bubbleGoal').onchange=e=>{settings.goal=Number(e.target.value);paint();};host.querySelector('#bubbleClass').onchange=e=>{settings.matching=e.target.value==='matching';paint();};
 host.querySelector('#bubbleStatus').onchange=e=>{filter=e.target.value;paint();};host.querySelector('#bubbleGroup').onchange=e=>{group=e.target.value;paint();};
 host.querySelector('#bubbleSearch').oninput=e=>{const start=e.target.selectionStart;query=e.target.value.toLowerCase();paint();const input=host.querySelector('#bubbleSearch');input.focus();input.setSelectionRange(start,start);};
 host.querySelectorAll('[data-bubble-done]').forEach(b=>b.onclick=()=>{done.add(b.dataset.bubbleDone);try{localStorage.setItem('idleon-bubble-todo-v1',JSON.stringify([...done]));}catch{}paint();});
 const show=host.querySelector('[data-bubble-show]');if(show)show.onclick=()=>{showAll=!showAll;paint();};
 const reset=host.querySelector('[data-bubble-reset]');if(reset)reset.onclick=()=>{done.clear();try{localStorage.removeItem('idleon-bubble-todo-v1');}catch{}paint();};
 afterRender?.();
 }
 paint();prepare(raw).then(result=>{if(host.bubbleToken!==token||host.firstElementChild!==marker)return;context=result;paint();});
}
function bonusLevelTarget(row,bubble,threshold=99){
 const goal=[80,90,95,99,99.9].includes(threshold)?threshold:99;
 if(row.conditional||row.cap?.shared&&row.shared==null)return {level:null,text:'Max-benefit level depends on your character or other shared bonuses. Check the combined effect before spending.'};
 if(row.cap&&row.effective===null)return {level:null,text:'Max-benefit level needs account multipliers. Import a complete save to calculate it.'};
 if(row.cap&&Number.isFinite(row.capLevel)){
  if(row.capLevel===0)return {level:0,text:'Maximum benefit already supplied by other shared bonuses. No extra bubble levels needed for this effect.'};
  return {level:row.capLevel,text:`Max-benefit level: ${fmt(row.capLevel)}${row.level!==null&&row.level>=row.capLevel?' · reached':row.level!==null?' · '+fmt(row.capLevel-row.level)+' levels to go':''}. ${row.cap.shared?'Includes other saved shared bonuses.':'Stops improving this effect at this level.'}`};
 }
 const limit=ceiling(bubble),target=limit!==null?levelFor(bubble,limit*goal/100,1):null;
 if(target===null)return {level:null,text:'No maximum-benefit level: this bonus keeps growing. Upgrade in manageable batches.'};
 return {level:target,text:`No finite level gives 100% of this bonus. ${goal}% checkpoint: Lv ${fmt(target)}${row.level!==null&&row.level>=target?' · reached':row.level!==null?' · '+fmt(target-row.level)+' levels to go':''}. Further levels still help; this is not a hard cap.`};
}
function bonusSummary(row,bubble,threshold=99){
 const effective=row.effective!==null,current=effective?row.effective:row.base;
 const hard=effective&&row.cap&&!row.cap.shared;
 const maximum=hard?row.cap.limit:row.ceiling;
 const amount=current===null?null:hard?Math.min(current,maximum):current;
 const unit=/\{\s*%/.test(bubble.bonus)?'%':/\{\s*x\b/i.test(bubble.bonus)?'×':'';
 const format=value=>value===null?'Unknown':fmt(value)+unit;
 const label=hard?'effect cap':maximum!==null?'theoretical maximum':'no fixed maximum';
 const effectAmount=current===null?'an unknown amount':fmt(hard?amount:current);
 const effect=bubble.bonus.replace(/[{}]/g,effectAmount).replaceAll('$','[depends on character]');
 return {current:amount,maximum,target:bonusLevelTarget(row,bubble,threshold),ratio:amount!==null&&maximum>0?Math.min(1,amount/maximum):null,
  headline:amount===null?'Bonus unavailable':maximum===null?`${format(amount)} · no fixed maximum`:`${format(amount)} of ${format(maximum)}`,
  label,effect,scope:effective?'Account bonus · before matching-class boosts':'Base bonus · account multipliers unavailable',
  note:row.cap?.shared?'This effect shares a cap with other bonuses. The combined total must be checked separately.':row.conditional?'The usable bonus depends on your character and other bonuses.':hard?'Further levels do not improve this effect once capped.':maximum!==null?'This is a theoretical ceiling, approached as levels increase.':'This bonus keeps growing with levels.'};
}
const api={model,value,levelFor,render,prepare,bonusSummary,bonusLevelTarget,CAPS,materialCost,spendingPlan,candyMaterial};if(typeof module!=='undefined')module.exports=api;else root.BubbleOptimizer=api;
})(typeof window!=='undefined'?window:globalThis);
