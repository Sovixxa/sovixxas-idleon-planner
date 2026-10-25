(function(root){
 'use strict';
 const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v;}catch{return null;}};
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function amount(v){
  if(v==null||String(v).trim()==='')return null;
  const match=String(v).replace(/,/g,'').trim().match(/^(\d+(?:\.\d*)?|\.\d+)(?:e\+?(\d+)|\s*([kmbt]))?$/i);
  if(!match)return null;
  const n=match[2]?Number(match[1]+'e'+match[2]):Number(match[1])*({k:1e3,m:1e6,b:1e9,t:1e12}[match[3]?.toLowerCase()]||1);
  return Number.isFinite(n)?n:null;
 }
 const names=['Class EXP','Mining','Smithing','Chopping','Fishing','Alchemy','Catching','Trapping','Construction','Worship','Cooking','Breeding','Laboratory','Sailing','Divinity','Gaming','Farming','Sneaking','Summoning','Spelunking','Research'];
 const skills=names.map((name,id)=>({id,name,balloons:id<11&&id!==8,candy:[0,1,3,4,6].includes(id),shared:[11,13,15,16,18,20].includes(id)}));
 const balloonTypes=[{id:'small',name:'Small',base:50},{id:'medium',name:'Medium',base:120},{id:'large',name:'Large',base:200}];
 const candyTypes=[...[1,2,4,12,24,72].map((hours,i)=>({id:'Timecandy'+(i+1),name:hours+' hour',min:hours,max:hours})),{id:'Timecandy7',name:'Steamy (random)',min:1/6,max:24},{id:'Timecandy8',name:'Spooky (random)',min:1/3,max:12},{id:'Timecandy9',name:'Cosmic (random)',min:5,max:500},{id:'Timecandy10',name:'Spirit (24 hour)',min:24,max:24}];
 function candyStock(state){
  const d=state?.rawData||{},stock=Object.fromEntries(candyTypes.map(c=>[c.id,0]));let known=false;
  for(const [order,quantity] of [['ChestOrder','ChestQuantity'],...Object.keys(d).filter(k=>/^InventoryOrder_\d+$/.test(k)).map(k=>[k,k.replace('InventoryOrder_','ItemQuantity_')])]){
   const items=parse(d[order]),counts=parse(d[quantity]);if(!Array.isArray(items)||!Array.isArray(counts))continue;known=true;
   items.forEach((id,i)=>{if(id in stock&&amount(counts[i])!==null)stock[id]+=amount(counts[i]);});
  }return known?stock:null;
 }
 function candyEstimate(row,skill,remaining,type){
  if(!skills[skill]?.candy)return {error:'Direct candy EXP planning is unavailable for this skill. Passive system gains are not included.'};
  if(!type)return {error:'Choose a candy.'};
  const map=amount(row.map);
  if(map!==null&&(map>=299||[120,166,200,216].includes(map)))return {error:'Time candy is blocked on this saved map. Move to an eligible activity and import the updated save.'};
  if(['Cooking','Laboratory','Nothing'].includes(row.activity)&&map!==72)return {error:'Time candy cannot be used for the saved activity.'};
  if(row.candyBlocked)return {error:row.candyBlocked};
  if(row.savedLevel!=null&&row.candyCap==null)return {error:'Waiting for saved prayer limits. If calculation fails, import a complete save.'};
  const rate=amount(row.rate);if(!(rate>0))return {error:'Enter the selected activity’s positive AFK EXP/hour.'};
  const cap=row.candyCap??Infinity,low=Math.min(type.min,cap),high=Math.min(type.max,cap);
  const gain=h=>{const xp=rate*h;return xp<2e9?Math.floor(xp):xp;},minExp=gain(low),maxExp=gain(high);
  if(!(minExp>0))return {error:'This rate gives less than 1 EXP at the minimum candy duration.'};
  const best=Math.ceil(remaining/maxExp),worst=Math.ceil(remaining/minExp);
  if(!Number.isSafeInteger(best)||!Number.isSafeInteger(worst))return {error:'Candy count exceeds the supported numeric range.'};
  return {candies:worst,candyBest:best,candyWorst:worst,candyRandom:type.min!==type.max,candyExp:minExp,candyExpMax:maxExp,candyHours:low,candyCap:cap,wasted:worst*low-remaining/rate};
 }
 // q._customBlock_IncreaseExpREQ, not the older expReqQTY helper.
 function requirement(L,skill=0,serverFactor=null){
  switch(Number(skill)){
   case 0:return (15+L**1.9+11*L)*(1.208-Math.min(.164,.215*L/(L+100)))**L-15;
   case 2:return (15+L**2+13*L)*(1.225-Math.min(.114,.135*L/(L+50)))**L-26;
   case 8:return L<71?((10+L**2.81+4*L)*(1.117-.135*L/(L+5))**L-6)*(1+L**1.72/300):((10+L**2.81+4*L)*1.003**L-6)/2.35*(1+L**1.72/300);
   case 9:return (15+L**1.3+6*L)*(1.17-Math.min(.07,.135*L/(L+50)))**L-26;
   case 11:return (10+L**1.9+10*L)*1.11**L;
   case 12:return L<5?6.4*L*1.6**L:(10+L**1.3+24*L)*1.024**L-9*L;
   case 13:return (10+L**1.6+5*L)*1.08**L;
   case 14:return (9+L**1.4+3*L)*(1.1-.08*L/(L+20))**L;
   case 15:return (10+L**1.6+3*L)*1.13**L*1.13**Math.max(0,L-20);
   case 16:return (12+2*L)*(1+L/30)*2**(L/30)*1.25**(L/8)*(1.075**L+2*L)*(1+.3*Math.floor(L/10))-100;
   case 17:return (15+L**2+13*L)*(1.245-Math.min(.114,.135*L/(L+50)))**L-10;
   case 18:return (15+L**1.7+7*L)*(1.175-Math.min(.15,.115*L/(L+50)))**L-25;
   case 19:return (20+L**3+25*L)*(1.19-Math.min(.15,.2*L/(L+50)))**L-63;
   case 20:return L>20&&!(serverFactor>0)?NaN:10*Math.max(0,L-1)+10*(1+L**(1+L/10*.4)/10)*1.1**L*Math.max(1,serverFactor||1)**Math.max(0,L-20);
   default:return skills[Number(skill)]?(15+L**2+15*L)*(1.225-Math.min(.18,.135*L/(L+50)))**L-30:NaN;
  }
 }
 function currentRequirement(row,skill,serverFactor){return Number(row.level)===row.savedLevel&&row.savedRequirement>0?row.savedRequirement:requirement(Number(row.level),skill,serverFactor);}
 function calculate(row,target,options={}){
  const skill=Number(options.skill||0),level=amount(row.level),goal=amount(target),progress=amount(row.progress),rate=amount(row.rate);
  if(!skills[skill])return {error:'Select a supported skill.'};
  if(!Number.isInteger(level)||level<1||level>10000||!Number.isInteger(goal)||goal<1||goal>10000)return {error:'Enter whole levels from 1 to 10,000. Locked skills need to be unlocked in game.'};
  if(level>=goal)return {remaining:0,hours:0,balloons:0,candies:0,candyBest:0,candyWorst:0,ready:true};
  if(progress===null)return {error:'Enter EXP earned within the current level.'};
  const first=currentRequirement(row,skill,options.serverFactor);
  if(!(first>0)||!Number.isFinite(first))return {error:'EXP requirement unavailable. Research needs its saved server factor above level 20.'};
  if(progress>=first)return {error:'Current EXP exceeds this level. Claim/update the level and EXP.'};
  let remaining=first-progress;for(let l=level+1;l<goal;l++)remaining+=requirement(l,skill,options.serverFactor);
  if(!Number.isFinite(remaining))return {error:'Target exceeds the numeric range, or the required Research server factor is missing.'};
  if(options.mode==='balloons'){
   if(!skills[skill].balloons)return {remaining,error:'EXP balloons cannot be used for '+skills[skill].name+'.'};
   const type=balloonTypes.find(t=>t.id===options.balloon),multi=amount(row.multiplier);
   if(!type||!(multi>0))return {remaining,error:'Enter the effective EXP multiplier for balloons (×).'};
   let xp=progress,count=0;
   for(let l=level;l<goal;l++){
    const req=l===level?first:requirement(l,skill,options.serverFactor),gain=type.base*(l+1)*multi;
    if(!(gain>0)||!Number.isFinite(gain))return {remaining,error:'Balloon gain is outside the numeric range.'};
    if(xp<req){const used=Math.ceil((req-xp)/gain);count+=used;xp+=used*gain;}
    xp=Math.max(0,xp-req);
    if(!Number.isSafeInteger(count))return {remaining,error:'More than 9 quadrillion balloons; an exact count is outside the supported range.'};
   }
   return {remaining,balloons:count};
  }
  if(options.mode==='candy')return {remaining,...candyEstimate(row,skill,remaining,candyTypes.find(c=>c.id===options.candy))};
  if(rate===0)return {remaining,error:'No EXP gain at this rate. Change activity or enter a different rate.'};
  if(rate===null||rate<0)return {remaining,error:'Enter a positive EXP/hour for this skill.'};
  const hours=remaining/rate;
  return Number.isFinite(hours)?{remaining,hours}:{remaining,error:'Rate is too small to estimate.'};
 }
 function roster(state,skill=0){
  const d=state?.rawData||{},names=state?.rawRoot?.charNames||[];
  const rows=Object.keys(d).filter(k=>/^Lv0_\d+$/.test(k)).map(k=>{
   const id=Number(k.slice(4)),level=parse(d[k])?.[skill]??'',savedRequirement=amount(parse(d['ExpReq0_'+id])?.[skill]);
   return {id,map:d['CurrentMap_'+id]??'',activity:d['AFKtarget_'+id],name:names[id]||`Character ${id+1}`,level,progress:parse(d['Exp0_'+id])?.[skill]??'',rate:'',multiplier:'',savedLevel:amount(level),savedRequirement};
  }).sort((a,b)=>a.id-b.id);
  if(skills[skill]?.shared&&rows.length){const valid=rows.filter(r=>amount(r.level)>0);if(valid.length){const best=valid.reduce((a,b)=>Number(b.level)>Number(a.level)||Number(b.level)===Number(a.level)&&Number(b.progress)>Number(a.progress)?b:a);return [{...best,name:'Account-wide '+skills[skill].name}];}}
  return rows;
 }
 const fmt=n=>n.toLocaleString(undefined,{maximumFractionDigits:2,notation:n>=1e6?'scientific':'standard'});
 function inputValue(row,field){const n=amount(row[field]);return !row.overrides?.[field]&&n>=1e6?Number(n.toPrecision(7)).toExponential():row[field];}
 function duration(hours){if(hours===0)return 'Ready now';if(hours<1/60)return 'Less than 1 minute';if(hours>1e9)return `${fmt(hours/24)} days`;const minutes=Math.ceil(hours*60);return `${Math.floor(minutes/1440)}d ${Math.floor(minutes%1440/60)}h ${minutes%60}m`;}
 function applyAuto(plan,skill,session){
  const nodes=new Map();
  for(const row of plan.rows)for(const node of session.auto?.[row.id]?.[skill]?.nodes||[])if(!nodes.has(node.id))nodes.set(node.id,node);
  if(nodes.size){
   plan.nodes=[...nodes.values()];
   if(!nodes.has(plan.node))plan.node=[plan.rows[0]?.node,session.auto?.[plan.rows[0]?.id]?.[skill]?.defaultNode,plan.nodes[0].id].find(id=>nodes.has(id));
  }
  for(const row of plan.rows){const auto=session.auto?.[row.id]?.[skill];if(!auto)continue;
   row.loadout=auto.loadout;row.foodSlots=auto.foodSlots;row.foodChoices=auto.foodChoices;row.savedFoods=auto.savedFoods;
   for(const field of ['candyCap','candyBlocked'])if(field in auto)row[field]=auto[field];
   if(auto.nodes?.length){
    row.nodes=auto.nodes;row.node=plan.node||auto.defaultNode;const selected=row.nodes.find(n=>n.id===row.node);
    if(selected){row.gathering=skill===0?null:selected;row.combat=selected.combat;row.loadout=auto.loadout;row.map=selected.map??'';row.activity=selected.activity;if(!row.overrides?.rate)row.rate=Number.isFinite(selected.rate)?String(selected.rate):'';if(skill===0)row.candyBlocked=selected.candyBlocked||null;row.rateSource=Number.isFinite(selected.rate)?'Calculated for '+selected.label+' with saved equipment, cards, talents and bonuses. '+(skill===0?'Includes equipped cards, gear, food, talents, saved active buffs and account bonuses; primary stats are rebuilt. Map access is not checked. ':'Harvest chance: '+(selected.harvestChance*100).toFixed(1)+'%. ')+'Assumes a constant rate; no future equipment changes or food depletion.':'No calculated combat rate for this activity. Choose a combat map or enter its AFK EXP/hour.';}
   }
   if(plan.node&&!auto.nodes?.some(n=>n.id===plan.node)){const selected=nodes.get(plan.node);row.node=plan.node;row.map=selected?.map??'';row.activity=selected?.activity;row.combat=null;row.gathering=null;if(!row.overrides?.rate)row.rate='';row.rateSource='No calculated rate for this character at the shared location. Enter a manual rate.';}
   for(const field of ['rate','multiplier'])if(!(field==='rate'&&(plan.node||auto.nodes?.length))&&!row.overrides?.[field]&&Number.isFinite(auto[field]))row[field]=String(auto[field]);
  }
 }
 function loadAuto(session,state){
  if(session.started||!state?.rawData)return;
  session.started=true;session.loading=true;
  const signature=session.signature;
  const done=(result,error)=>{if(signature!==session.signature)return;session.loading=false;session.auto=result;session.autoError=error;if(result)(session.cache||={})[signature]=result;session.notify?.();};
  try{
   const worker=new Worker('afk-save-worker.js');
   const timeout=setTimeout(()=>{worker.terminate();done(null,'Save calculations timed out. Reset this skill to retry.');},60000);
   session.cancel=()=>{clearTimeout(timeout);worker.terminate();};
   worker.onmessage=e=>{clearTimeout(timeout);worker.terminate();done(e.data.result,e.data.error);};
   worker.onerror=()=>{clearTimeout(timeout);worker.terminate();done(null,'Save calculations could not load. Reset this skill to retry.');};
   worker.postMessage({raw:{...state.rawRoot,data:state.rawData},options:session.options||{}});
  }catch(e){done(null,'Save calculations are unavailable in this browser.');}
 }
 const sessions=new WeakMap();let manual;
 function restoreSession(state){
  const storageKey='idleon.afk-plans.v1:'+JSON.stringify(state?.rawRoot?.charNames||['manual']);
  let saved;try{saved=JSON.parse(root.localStorage?.getItem(storageKey)||'null');}catch{}
  return {storageKey,skill:skills[saved?.skill]?Number(saved.skill):0,plans:{},savedPlans:saved?.plans||{},scenarios:saved?.scenarios||{}};
 }
 function saveSession(session){
  const plans={...session.savedPlans};
  for(const [id,plan] of Object.entries(session.plans))plans[id]={node:plan.node,target:plan.target,mode:plan.mode,balloon:plan.balloon,candy:plan.candy,rows:plan.rows.map(r=>({id:r.id,node:r.node,rate:r.overrides?.rate?r.rate:undefined,multiplier:r.overrides?.multiplier?r.multiplier:undefined}))};
  try{root.localStorage?.setItem(session.storageKey,JSON.stringify({skill:session.skill,plans,scenarios:session.scenarios}));}catch{}
 }
 function defaultOptions(state,skill){return {skill,statueWeek:Number(parse(state?.rawRoot?.serverVars||state?.rawData?.serverVars)?.voteCat2?.[0])===26,boostFoods:false,activeBuffs:true,prayers:true,foods:{}};}
 function optionsHtml(state,session,skill){
  if(!state?.rawData)return '';
  const o=session.options;
  return `<fieldset class="afk-options"><legend>Planning bonuses · ${esc(skill.name)}</legend>${[['statueWeek','Statue Week (Meritocracy)'],...([0,1,3,4,6].includes(skill.id)?[['boostFoods','Simulate unequipped boost foods']]:[]),['activeBuffs','Include saved active buffs'],['prayers','Include saved prayers']].map(([key,label])=>`<label><input type="checkbox" data-afk-option="${key}" ${o[key]?'checked':''}>${label}</label>`).join('')}</fieldset>`;
 }
 function foodSelection(row,state,options){
  const order=parse(state.rawData['EquipOrder_'+row.id])?.[2]||{},qty=parse(state.rawData['EquipQTY_'+row.id])?.[2]||{},overrides=options.foods[row.id]||{},allowed=new Set(row.foodChoices.map(f=>f.id));
  return [...new Set(Array.from({length:row.foodSlots},(_,slot)=>overrides[slot]??(Number(qty[slot])>0?order[slot]:'Blank')).filter(id=>allowed.has(id)))];
 }
 function foodOverrides(row,state,selected){
  if(selected.length>row.foodSlots)throw Error('Too many boost foods for unlocked slots.');
  const order=parse(state.rawData['EquipOrder_'+row.id])?.[2]||{},qty=parse(state.rawData['EquipQTY_'+row.id])?.[2]||{},allowed=new Set(row.foodChoices.map(f=>f.id));
  const slots=Array.from({length:row.foodSlots},(_,slot)=>Number(qty[slot])>0?order[slot]||'Blank':'Blank');
  for(let i=0;i<slots.length;i++)if(allowed.has(slots[i])&&!selected.includes(slots[i]))slots[i]='Blank';
  for(const id of selected){if(slots.includes(id))continue;let slot=slots.indexOf('Blank');if(slot<0)slot=slots.findLastIndex(id=>!selected.includes(id));slots[slot]=id;}
  return Object.fromEntries(slots.flatMap((id,slot)=>id===order[slot]&&Number(qty[slot])>0?[]:[[slot,id]]));
 }
 function foodHtml(plan,state,session){
  const first=plan.rows.find(r=>r.foodChoices?.length);if(!first)return '';
  const row={...first,foodSlots:Math.min(...plan.rows.map(r=>r.foodSlots).filter(Number.isFinite))},index=0;
  if(!session.options?.boostFoods||!row.foodChoices?.length)return '';
  const selected=session.options.sharedFoods||[];
  const labels={ClassEXP:'Class EXP',MiningSpeedBoosts:'Mining speed',ChoppinSpeedBoosts:'Chopping speed',FishingSpeedBoosts:'Fishing speed',CatchingSpeedBoosts:'Catching speed',BaseDmgBoosts:'Damage',WeaponPowerBoosts:'Weapon power',MoveSpdBoosts:'Movement speed'};
  const primary={0:'ClassEXP',1:'MiningSpeedBoosts',3:'ChoppinSpeedBoosts',4:'FishingSpeedBoosts',6:'CatchingSpeedBoosts'}[session.skill];
  const groups=Object.groupBy(row.foodChoices,f=>f.effect);
  const groupHtml=Object.entries(groups).sort(([a],[b])=>Number(b===primary)-Number(a===primary)).map(([effect,foods])=>{
   const checks=foods.map(f=>`<label title="Base food bonus; account modifiers are included in the calculation"><input type="checkbox" data-afk-food-row="${index}" data-afk-food-id="${esc(f.id)}" ${selected.includes(f.id)?'checked':selected.length>=row.foodSlots?'disabled':''}><span>${esc(f.label)}</span><small>+${esc(f.bonus)}${/Speed|ClassEXP/.test(effect)?'%':''}</small></label>`).join('');
   return effect===primary?`<div class="afk-food-group">${checks}</div>`:`<details class="afk-food-extra" ${foods.some(f=>selected.includes(f.id))?'open':''}><summary>${esc(labels[effect]||'Other foods')}</summary>${checks}</details>`;
  }).join('');
  return `<details class="afk-food-plan" open><summary>Boost foods <small>${selected.length}/${row.foodSlots}</small></summary>${groupHtml}</details>`;

 }
 function auditHtml(row){
  const c=row.combat,g=row.gathering,l=row.loadout;if(!l)return '';
  const formula=c?`<p>${fmt(c.kills)} base kills/hour × ${fmt(c.afk)} AFK multiplier × ${fmt(c.survival)}% survival × ${fmt(c.monsterExp)} EXP per monster × ${fmt(c.expMultiplier)} class EXP multiplier.</p><p>Maximum damage: ${fmt(c.damage)} · Hit chance: ${fmt(c.hit)}%.</p>`:g?`<p>Efficiency: ${fmt(g.efficiency)} · Harvest chance: ${fmt(g.harvestChance*100)}% · Actions/hour: ${fmt(g.actions)} · AFK multiplier: ${fmt(g.afk)} · Skill EXP multiplier: ${fmt(g.multiplier)}.</p>`:'';
  return `<details><summary>EXP calculation &amp; planned loadout</summary>${formula}${Object.entries({Equipment:l.equipment,Cards:l.cards,'Card set':[l.cardSet],Food:l.food,Prayers:l.prayers,'Active buffs':l.buffs,'Attack bar talents':l.talents,'Equipped star signs':l.starSigns,'Character and family obols':l.obols}).map(([label,items])=>`<p><strong>${label}:</strong> ${esc((items||[]).filter(Boolean).join(', ')||'None recorded')}</p>`).join('')}<p>Uses saved talent levels and account bonuses. These are AFK rates; active-only gains, future buff expiration and food depletion are not simulated.${row.overrides?.rate?' The time estimate uses your manual rate override.':''}</p></details>`;
 }
 function render(host,state){
  const key=state?.rawData;let session=key?sessions.get(key):manual;
  if(!session){session=restoreSession(state);if(key)sessions.set(key,session);else manual=session;}
  const skill=skills[session.skill];
  session.scenarios||={};
  const options=session.scenarios[skill.id]||=defaultOptions(state,skill.id);options.sharedFoods||=[];const signature=JSON.stringify({...options,skill:options.boostFoods?skill.id:null,foods:options.boostFoods?options.foods:{}});
  session.options=options;
  if(session.signature!==signature){session.cancel?.();session.signature=signature;session.auto=session.cache?.[signature]||null;session.started=!!session.auto;session.loading=false;session.autoError=null;}
  loadAuto(session,state);
  let plan=session.plans[skill.id];
  if(!plan){const imported=roster(state,skill.id);plan={target:skill.id===0?'500':imported.some(r=>amount(r.level)>0)?String(Math.min(10000,Math.max(...imported.map(r=>amount(r.level)||0))+1)):'',mode:'afk',balloon:'small',candy:'Timecandy1',rows:imported.length?imported:[{id:0,name:skill.shared?'Account-wide '+skill.name:'Manual character',level:'',progress:'0',rate:'',multiplier:''}]};const saved=session.savedPlans[skill.id];if(saved){if(typeof saved.node==='string')plan.node=saved.node;if(typeof saved.target==='string')plan.target=saved.target;if(['afk','balloons','candy'].includes(saved.mode)&&!(saved.mode==='balloons'&&!skill.balloons)&&!(saved.mode==='candy'&&!skill.candy))plan.mode=saved.mode;if(balloonTypes.some(x=>x.id===saved.balloon))plan.balloon=saved.balloon;if(candyTypes.some(x=>x.id===saved.candy))plan.candy=saved.candy;for(const row of plan.rows){const r=saved.rows?.find(r=>r.id===row.id);if(!r)continue;if(typeof r.node==='string')row.node=r.node;for(const field of ['rate','multiplier'])if(typeof r[field]==='string'){row[field]=r[field];(row.overrides||={})[field]=true;}}delete session.savedPlans[skill.id];}session.plans[skill.id]=plan;}
  applyAuto(plan,skill.id,session);
  if(!session.auto)for(const row of plan.rows){for(const field of ['rate','multiplier'])if(!row.overrides?.[field])row[field]='';row.combat=null;row.candyCap=null;row.rateSource='';}
  const serverFactor=amount(parse(state?.rawRoot?.serverVars)?.A_ResXP??parse(state?.rawData?.serverVars)?.A_ResXP);
  const candy=plan.mode==='candy',stock=candyStock(state),chosenCandy=candyTypes.find(c=>c.id===plan.candy);
  const ball=plan.mode==='balloons',rateLabel=skill.id===0?'AFK EXP/hour':'EXP/hour';
  const unsupported=skill.id===8?'Balloons are blocked in World 3 town, so Construction balloon planning is unavailable.':`EXP balloons cannot be used for ${skill.name}.`;
  const note=skill.id===0?'Everyone uses the selected combat map, with their own saved loadout and bonuses.':skill.id===17?'Use average Sneaking EXP/hour for the chosen floor, including time lost to detection.':skill.id===19?'Everyone uses the selected Spelunking map with their saved loadout and bonuses. These are AFK gathering rates; active cave runs and stamina rewards are not included. Map access is not checked.':skill.shared?'This is a shared account skill. Use its average EXP/hour over your actual collection or activity cycle.':skill.candy?'Everyone uses the selected node, with their own saved loadout and bonuses.':'Use the selected skill’s in-game EXP/hour or a measured average from the activity you plan to do.';
  host.innerHTML=`<section class="exp-card afk-tester" data-qol-ignore><p class="eyebrow">Leveling calculator · ${esc(skill.name)}</p><h3>Time, balloons and candy to target level</h3>${optionsHtml(state,session,skill)}<div class="afk-controls"><label>Skill<select data-afk-skill>${skills.map(s=>`<option value="${s.id}" ${s.id===skill.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></label><label>Calculate<select data-afk-mode><option value="afk" ${plan.mode==='afk'?'selected':''}>Time from EXP/hour</option><option value="balloons" ${ball?'selected':''} ${!skill.balloons?'disabled':''}>EXP balloons${!skill.balloons?' — unavailable':''}</option><option value="candy" ${candy?'selected':''} ${!skill.candy?'disabled':''}>Time candy${!skill.candy?' — direct EXP unavailable':''}</option></select></label><label>${skill.shared?'Target level':'Target level for everyone'}<input data-afk-target type="number" min="1" max="10000" step="1" placeholder="Choose a target" value="${esc(plan.target)}"></label>${ball?`<label>Balloon size<select data-afk-balloon>${balloonTypes.map(t=>`<option value="${t.id}" ${t.id===plan.balloon?'selected':''}>${t.name} EXP balloon</option>`).join('')}</select></label>`:''}${candy?`<label>Candy<select data-afk-candy>${candyTypes.map(t=>`<option value="${t.id}" ${t.id===plan.candy?'selected':''}>${t.name}${stock?' · '+stock[t.id].toLocaleString()+' owned':''}</option>`).join('')}</select></label>`:''}${!ball&&(skill.candy||skill.id===19)?`<label class="afk-node-label">${skill.id===0?'Combat map for everyone':skill.id===19?'Spelunking map for everyone':'Skilling node for everyone'}<select data-afk-node="0" ${!plan.nodes?.length?'disabled':''}>${plan.nodes?.length?plan.nodes.map(n=>`<option value="${esc(n.id)}" ${n.id===plan.node?'selected':''}>${esc(n.label)}</option>`).join(''):'<option>'+(session.loading?'Loading locations…':'No calculated locations available')+'</option>'}</select></label>`:''}<button type="button" class="secondary" data-afk-reset>Reset this skill from save</button></div><div data-afk-summary role="status" aria-live="polite"></div>${foodHtml(plan,state,session)}<div class="afk-roster">${plan.rows.map((r,i)=>`<article class="afk-character"><h4>${esc(r.name)}</h4><div class="afk-fields">${[['level','Current level'],['progress','Current EXP'],ball?['multiplier','Balloon EXP multiplier (×)']:['rate',rateLabel]].map(([field,label])=>`<label>${label}<input data-afk-row="${i}" data-afk-field="${field}" aria-label="${esc(r.name)} ${label}" value="${esc(inputValue(r,field))}" inputmode="decimal" autocomplete="off" title="${esc(r[field])}"></label>`).join('')}</div><details class="afk-rate-details"><summary>Rate details</summary><p data-afk-source="${i}"></p></details><div data-afk-result="${i}"></div>${[0,1,3,4,6,19].includes(skill.id)&&!ball?`<div data-afk-audit="${i}"></div>`:''}</article>`).join('')}</div><details class="afk-help"><summary>Help &amp; assumptions</summary><p>Shared foods use empty slots first, then replace saved foods. Food supply is assumed to last the session. Statue Week replaces the saved Meritocracy selection.</p><p>${ball?'Balloon multipliers are calculated from the imported save. Enter an override only when needed. Gains update at each new level.':esc(note)}</p>${!skill.balloons?`<p class="afk-note">${esc(unsupported)}</p>`:ball?'<p class="afk-note">Use balloons while this skill is displayed. World 1 town gives Smithing EXP; World 2 town gives Alchemy EXP. Balloons cannot be used in World 3 town. Disable EXP conversion for these estimates.</p>':''}${candy?'<p class="afk-note">Candy uses the selected activity and AFK EXP/hour. Counts round up to whole items. The saved 10-hour prayer limit applies to each candy. Random candies show best/worst duration bounds, not an expected count. Passive skill progress, changing rates, food depletion and extra level-up rewards are not modeled. Known World 7 and special-map restrictions follow the supplied game client. Planned nodes without a saved location assume a map where candy is allowed.</p>':''}<p>Numbers accept K, M, B, T, or scientific notation. Current EXP is progress within the current level.</p><p>Imported levels, EXP and current-level requirements are save snapshots. New levels use the game’s level-up formulas. Unclaimed gains are not included. Time estimates assume a constant average EXP/hour; account for downtime, collection intervals, survival and any AFK limit in that rate.</p><p>Balloon estimates assume a constant effective EXP multiplier, no EXP conversion, and no additional EXP awarded on level-up. Future Crystal Countdown reductions and other bonuses that change as you level are not predicted. Re-import or update your inputs when these change.</p><p>Shared skills use the furthest-progressed character snapshot once, not one estimate per character. Research above level 20 requires its server factor in the export. Skill inputs are kept separately while switching tabs; your last selections are saved in this browser. Imported levels and EXP refresh from your save.</p></details></section>`;
  function update(){
   saveSession(session);
   plan.rows.forEach((row,i)=>{
    const field=ball?'multiplier':'rate',auto=session.auto?.[row.id]?.[skill.id];
    const source=row.overrides?.[field]?'Manual override. Reset this skill to restore save calculations.':session.loading?'Calculating from your save…':(Number.isFinite(auto?.[field])||field==='rate'&&row.rateSource)?(field==='rate'&&row.rateSource?row.rateSource:auto[field+'Source']):session.autoError||auto?.error||(ball?'This multiplier could not be derived from the save. Enter an override.':auto?.context||auto?.rateReason||'An hourly rate is not yet calculated for this skill. Enter the in-game rate or a measured average; imported levels and EXP are already filled.');
    host.querySelector(`[data-afk-source="${i}"]`).textContent=source;
    const audit=host.querySelector(`[data-afk-audit="${i}"]`);
    if(audit) audit.innerHTML=session.loading?'':auditHtml(row);

   });
   const results=plan.rows.map(r=>calculate(r,plan.target,{skill:skill.id,mode:plan.mode,balloon:plan.balloon,candy:plan.candy,serverFactor}));
   results.forEach((r,i)=>{host.querySelector(`[data-afk-result="${i}"]`).innerHTML=r.ready?'<p><strong>Target reached</strong></p>':`<p>${r.remaining!=null?`EXP remaining: <strong>${fmt(r.remaining)}</strong><br>`:''}${r.error?esc(r.error):ball?`${balloonTypes.find(t=>t.id===plan.balloon).name} balloons: <strong>${r.balloons.toLocaleString()}</strong>`:candy?`Candy needed: <strong>${r.candyRandom?r.candyBest.toLocaleString()+'–'+r.candyWorst.toLocaleString():r.candies.toLocaleString()}</strong><br>EXP per candy: ${fmt(r.candyExp)}${r.candyRandom?'–'+fmt(r.candyExpMax):''}${r.candyCap===10?'<br>10-hour prayer cap applied.':''}${!r.candyRandom?'<br>Excess effective time: '+duration(r.wasted):''}`:`Time remaining: <strong>${duration(r.hours)}</strong>`}</p>`;});
   const ready=results.filter(r=>r.ready).length,missing=results.filter(r=>r.error).length,max=Math.max(0,...results.filter(r=>!r.error).map(r=>r.hours||0)),finish=new Date(Date.now()+max*3600000),total=results.reduce((n,r)=>n+(r.balloons||0),0),candyMin=results.reduce((n,r)=>n+(r.candyBest||0),0),candyMax=results.reduce((n,r)=>n+(r.candyWorst||0),0);
   host.querySelector('[data-afk-summary]').innerHTML=`<p><strong>${ready} / ${results.length} at target level</strong> · ${missing?`${missing} need valid inputs before a complete estimate is available.`:ball?`Total needed: ${Number.isSafeInteger(total)?total.toLocaleString():'more than 9 quadrillion'} ${plan.balloon} balloons.`:candy?`Candy: ${fmt(candyMin)}${candyMin!==candyMax?'–'+fmt(candyMax):''}${stock?` · ${stock[plan.candy].toLocaleString()} owned${stock[plan.candy]<candyMin?' · short '+fmt(candyMin-stock[plan.candy]):stock[plan.candy]<candyMax?' · enough only with favorable rolls':' · enough at the modeled rate'}`:''}.`:max===0?'Everyone has reached the target.':`Everyone reaches the target in ${duration(max)}${Number.isFinite(finish.getTime())?` · approximately ${esc(finish.toLocaleString())} (your local time)`:''}.`}</p>`;
  }
  host.querySelectorAll('[data-afk-option]').forEach(input=>input.onchange=()=>{options[input.dataset.afkOption]=input.checked;render(host,state);});
  host.querySelectorAll('[data-afk-food-row]').forEach(input=>input.onchange=()=>{const selected=options.sharedFoods.filter(id=>id!==input.dataset.afkFoodId);if(input.checked)selected.push(input.dataset.afkFoodId);options.sharedFoods=selected;render(host,state);});
  host.querySelectorAll('[data-afk-row]').forEach(input=>input.oninput=()=>{const row=plan.rows[Number(input.dataset.afkRow)];row[input.dataset.afkField]=input.value;(row.overrides||={})[input.dataset.afkField]=true;input.title=input.value;update();});
  host.querySelector('[data-afk-target]').oninput=e=>{plan.target=e.target.value;update();};
  host.querySelector('[data-afk-skill]').onchange=e=>{session.skill=Number(e.target.value);render(host,state);};
  host.querySelector('[data-afk-mode]').onchange=e=>{plan.mode=e.target.value==='balloons'&&skill.balloons?'balloons':e.target.value==='candy'&&skill.candy?'candy':'afk';render(host,state);};
  host.querySelectorAll('[data-afk-node]').forEach(input=>input.onchange=()=>{plan.node=input.value;for(const row of plan.rows){row.node=plan.node;if(row.overrides)delete row.overrides.rate;}render(host,state);});
  const candySelect=host.querySelector('[data-afk-candy]');if(candySelect)candySelect.onchange=e=>{plan.candy=e.target.value;render(host,state);};
  const balloon=host.querySelector('[data-afk-balloon]');if(balloon)balloon.onchange=e=>{plan.balloon=e.target.value;update();};
  host.querySelector('[data-afk-reset]').onclick=()=>{if(session.autoError){session.started=false;session.autoError=null;}delete session.plans[skill.id];delete session.scenarios[skill.id];render(host,state);};
  session.notify=()=>{if(!host.isConnected||!host.querySelector('[data-afk-skill]'))return;if([0,1,3,4,6,19].includes(skill.id)){render(host,state);return;}applyAuto(plan,skill.id,session);host.querySelectorAll('[data-afk-row]').forEach(input=>{const row=plan.rows[Number(input.dataset.afkRow)];if(!row.overrides?.[input.dataset.afkField]){input.value=inputValue(row,input.dataset.afkField);input.title=row[input.dataset.afkField];}});update();};
  update();
 }
 const api={foodSelection,foodOverrides,candyTypes,candyStock,candyEstimate,applyAuto,amount,requirement,calculate,roster,duration,render,skills,balloonTypes};if(typeof module!=='undefined')module.exports=api;else root.AfkTester=api;
})(typeof window!=='undefined'?window:globalThis);
