(function(root){
'use strict';
const read=v=>typeof v==='string'?JSON.parse(v):v;
function session(raw,M=root.PrayerMath,AuditM=M){
 const S=root.DropTargetSources,T=root.ReviewTargetMetrics,save=structuredClone(read(raw.data)||raw),quiet={disabled:true,enter:()=>null,leave(){},value:(_i,_n,v)=>v},trace=root.ConnectedTrace,cache=new Map(),optionCaps=new WeakMap(),comparisonIssues=new Map(),partialKeys=new Set(),attempts=new Map();
 const now=()=>root.performance?.now?.()??Date.now();
 function storeComplete(key,options){cache.set(key,options);partialKeys.delete(key);attempts.set(key,new Set(options.map(c=>c.id)));comparisonIssues.delete(key);}
 function parse(s,audit=false){
  root.ConnectedTrace=audit?trace:quiet;if(audit)trace?.reset?.();
  const errors=[],old=console.error;let p;
  const engine=audit?AuditM:M;
  try{console.error=(...args)=>errors.push(String(args[0]));p=engine.parseData(structuredClone(s),raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);}finally{console.error=old;}
  if(errors.length||!p?.characters?.length)throw Error('Import a fresh full export before calculating upgrades.');
  // Reconstruct every native stat, but do not format discarded display rows
  // for every character and every upgrade scenario.
  T.primary(p,engine,false);if(engine.getConstruction)p.account.construction=engine.getConstruction(s,p.account,p.characters);return p;
 }
 const base=parse(save),descriptions=new Map(),sharedBenchmarks=new Map();
 function buildSources(p,id,metric,settings={}){
  const built=root.ReviewTargetSources.build(p,save,id,M,metric);
  if(!settings.accountWide||metric==='accountLevels'||metric.startsWith('unlock:'))return built;
  const candidates=built.candidates.filter(root.ReviewTargetSources.isAccountWide);
  return {...built,candidates,families:built.families.map(f=>({...f,candidates:candidates.filter(c=>c.system===f.name).length}))};
 }
 function sharedBenchmark(metric,settings){
  const key=JSON.stringify([metric,settings]);if(sharedBenchmarks.has(key))return sharedBenchmarks.get(key);
  const entries=[];
  for(const ch of base.characters){
   if([39,40,70,71,118,119].includes(Number(ch.mapIndex)))continue;
   try{const d=T.evaluate(base,ch.playerId,metric,save,M,{...settings,accountWide:false},false);if(d.value>0)entries.push({id:ch.playerId,value:d.value,cap:d.cap});}catch{}
  }
  if(!entries.length)throw Error('No saved setup can evaluate this bonus yet. Import a complete save with an applicable activity.');
  sharedBenchmarks.set(key,entries);return entries;
 }
 function evaluate(p,id,metric,s,settings={},audit=false){
  if(!settings.sharedGain)return T.evaluate(p,id,metric,s,audit?AuditM:M,settings,audit);
  const entries=sharedBenchmark(metric,settings),def=T.metrics.find(m=>m.id===metric);
  // A percentage change isolates the effect of shared purchases. Do not add
  // unrelated character totals or present a fictional account-wide hourly rate.
  const value=s===save?0:entries.reduce((sum,e)=>sum+100*(T.evaluate(p,e.id,metric,s,M,{...settings,accountWide:false},false).value/e.value-1),0)/entries.length;
  const cap=entries.every(e=>Number.isFinite(e.cap))?entries.reduce((sum,e)=>sum+100*(e.cap/e.value-1),0)/entries.length:undefined;
  const primaryStats=metric==='allStats'?['strength','wisdom','agility','luck'].map((id,i)=>({id,label:['STR','WIS','AGI','LUK'][i],value:entries.reduce((sum,e)=>sum+p.characters.find(c=>String(c.playerId)===String(e.id)).stats[id],0)/entries.length})):undefined;
  return {...def,...(primaryStats?{primaryStats}:{}),unit:'% gain',integer:false,measured:false,cap,value,rows:[],sharedGain:true,note:'Shared upgrades only. Target +10% means an average 10% improvement across eligible saved setups, with personal gear, food stacks and loadouts fixed.'};
 }
 function capacity(p,id){const c=p.characters.find(c=>String(c.playerId)===String(id));return Math.floor(Math.max(M.getItemCapacity('cFood',c,p.account,false).value,M.getItemCapacity('cFood',{...c,mapIndex:0},p.account,false).value));}
 function simulate(s,c,id,metric,settings,beforeCap,prepared,prepareOnly=false){
  const changed=structuredClone(s),rawFrom=S.get(s,c.path),from=c.missing&&rawFrom==null?0:Number(rawFrom);
  if(!Number.isFinite(from)||c.to<from||(c.exactFrom&&from!==c.from))throw Error('Upgrade no longer matches this scenario.');
  const patches=[];const patch=(path,value)=>{S.set(changed,path,value);patches.push({path,value});};
  for(const e of c.extraPatches||[]){if(S.get(s,e.path)!==e.from)throw Error('This item has already moved.');patch(e.path,e.value);}
  patch(c.path,c.to);if(c.levelSnapshotPath)patch(c.levelSnapshotPath,c.to);if(c.capPath)patch(c.capPath,Math.max(Number(S.get(s,c.capPath))||0,c.capTo));
  let p=prepared||parse(changed);if(prepareOnly)return {p};
  let cap=capacity(p,id),refills=[];
  // Capacity is not a stat gain by itself. Couple it with explicit additional
  // golden-food farming only if this upgrade actually raises loading capacity.
  if(!settings.accountWide&&cap>beforeCap){const ch=p.characters.find(c=>String(c.playerId)===String(id));
   for(const [i,f] of (ch.food||[]).entries())if(f.Type==='GOLDEN_FOOD'&&Number.isSafeInteger(cap)&&cap>f.amount&&S.get(changed,['EquipOrder_'+id,2,i])===f.rawName){patch(['EquipQTY_'+id,2,i],cap);refills.push({name:T.pretty(f.displayName||f.name),from:f.amount,to:cap});}
   if(refills.length)p=parse(changed);
  }
  const after=evaluate(p,id,metric,changed,settings).value;
  const baseRequirements=c.baseRequirements||c.requirements;
  return {changed,cap,after,p,step:{...c,from,patches,refills,baseRequirements,requirements:[...baseRequirements,...refills.map(f=>'Then farm and load '+T.pretty(f.name)+' from '+f.from.toLocaleString('en-US')+' to '+f.to.toLocaleString('en-US')+' items in town or the saved map. Capacity alone supplies no food bonus.')]}};
 }
 function describe(id,metric,settings={},parsed){
  const key=JSON.stringify([String(id),metric,settings]);if(descriptions.has(key))return descriptions.get(key);
  const p=parsed||parse(save,true);root.ConnectedTrace=trace;
  const total=evaluate(p,id,metric,save,settings,true),built=buildSources(p,id,metric,settings);
  root.ConnectedTrace=quiet;
  const description={...total,characters:p.characters.map(c=>({id:c.playerId,name:c.name})),families:built.families,notes:built.notes,candidates:built.candidates.length};descriptions.set(key,description);return description;
 }
 function drain(iterator){let next=iterator.next();while(!next.done){const q=next.value;next=iterator.next(q.candidates.map(c=>routeCandidate(q,c)));}return next.value;}
 function plan(...args){return drain(planSteps(...args));}
 function routeCandidate(q,c){
  try{const test=simulate(q.save,c,q.id,q.metric,q.settings,q.cap);return {cap:test.cap,after:test.after,step:test.step};}
  catch(e){return {error:e.message};}
 }
 function* planSteps(id,metric,target,settings={},progress=()=>{},run={}){
  const def=T.metrics.find(m=>m.id===metric);
  if(!def||!Number.isFinite(target)||target<=0||def.integer&&!Number.isSafeInteger(target))throw Error(def?.integer?'Enter a positive whole-number target.':'Enter a finite target greater than zero.');
  const description=describe(id,metric,settings),before=description.value;
  const built=buildSources(base,id,metric,settings),issues=[...(comparisonIssues.get(JSON.stringify([String(id),metric,settings]))||[])],key=JSON.stringify([String(id),metric,settings]);
  if(!run.quick&&partialKeys.has(key)){compareRoster([{character:id,result:description}],metric,target,settings,progress);issues.splice(0,issues.length,...(comparisonIssues.get(key)||[]));}
  let options=cache.get(key),current=before,combined=save,cap=capacity(base,id);const steps=[],conflicts=new Set();
  // Existing capped components can be inspected without running an irrelevant
  // scan. A capped component never implies the overall goal is maxed.
  const effectiveCap=def.measured?Math.floor(Number(settings.yieldPerHour)*.9):description.cap;
  let limited=Number.isFinite(effectiveCap)&&before>=effectiveCap;
  if(!options&&before<target&&!limited){options=[];
   for(const [i,c] of built.candidates.entries()){
    progress({phase:'compare',current:i+1,total:built.candidates.length,name:c.name});
    try{const test=simulate(save,c,id,metric,settings,cap);const option={...test.step,before,after:test.after,gain:test.after-before,relative:before?100*(test.after/before-1):null};options.push(option);optionCaps.set(option,test.cap);
    }catch(e){issues.push({name:c.name,error:e.message});}
   }
   options.sort((a,b)=>b.gain-a.gain||a.name.localeCompare(b.name));
   if(!issues.length)storeComplete(key,options);
  }
  options=options||[];
  const route=options.filter(c=>c.group!=='nametags').sort((a,b)=>(a.foodSlot!==undefined?-1:0)-(b.foodSlot!==undefined?-1:0)||b.gain-a.gain);
  let batchSave,batch=new Map();
  const width=Math.max(1,Math.min(8,Math.floor(Number(run.workers)||1)));
  for(const [i,candidate] of route.entries()){
   if(current>=target)break;
   if(run.quick&&now()>=run.routeDeadline)break;
   if(candidate.conflict&&conflicts.has(candidate.conflict))continue;
   progress({phase:'combine',current:i+1,total:route.length,name:candidate.name,workers:width});
   try{
    const adjusted=metric==='accountLevels'?{...candidate,to:Number(S.get(combined,candidate.path))+Math.min(candidate.to-Number(S.get(combined,candidate.path)),target-current)}:candidate;
    // Until a step is accepted, this is exactly the independent comparison.
    // Reuse it (including explicit food patches); still reparse every interaction.
    let test;
    if(combined===save&&adjusted===candidate&&optionCaps.has(candidate)){
     const changed=structuredClone(save);apply(changed,candidate);test={changed,cap:optionCaps.get(candidate),after:candidate.after,step:candidate};
    }else{
     // Speculate only against this exact cumulative save. Rejected candidates
     // share the batch; accepting a step invalidates every later prediction.
     if(batchSave!==combined){batch.clear();batchSave=combined;}
     if(!batch.has(candidate)){
      const upcoming=route.slice(i).filter(c=>!c.conflict||!conflicts.has(c.conflict)).slice(0,width);
      const candidates=upcoming.map(c=>metric==='accountLevels'?{...c,to:Number(S.get(combined,c.path))+Math.min(c.to-Number(S.get(combined,c.path)),target-current)}:c);
      const results=yield {save:combined,candidates,id,metric,settings,cap};
      upcoming.forEach((c,j)=>batch.set(c,results[j]));
     }
     test=batch.get(candidate);if(test.error)throw Error(test.error);
     const changed=structuredClone(combined);apply(changed,test.step);test={...test,changed};
    }
    const gain=test.after-current;
    if(gain<=Math.max(1e-12,Math.abs(current)*1e-12))continue;
    if(test.after<target&&(settings.sharedGain?gain<.01:current>0&&gain/current<.0001))continue;
    // Keep discrete milestones intact. Do not binary-search non-monotone native
    // formulas or signed prayer effects, and never sum independent gains.
    steps.push({...test.step,before:current,after:test.after,gain,relative:settings.sharedGain?null:current?100*gain/current:null});current=test.after;combined=test.changed;cap=test.cap;
    if(candidate.conflict)conflicts.add(candidate.conflict);
   }catch(e){issues.push({name:candidate.name,error:e.message});}
  }
  limited=limited||(Number.isFinite(effectiveCap)&&current>=effectiveCap&&current<target);
  const statTotals=metric==='allStats'?{beforePrimaryStats:description.primaryStats,primaryStats:steps.length?evaluate(parse(combined),id,metric,combined,settings).primaryStats:description.primaryStats}:{};
  return {...description,...statTotals,quick:!!run.quick,partial:partialKeys.has(key)||(!!run.quick&&current<target&&!limited&&now()>=run.routeDeadline),before,after:current,target,reached:current>=target,limited,steps,options,issues,tested:options.length,notes:[...description.notes,...(limited?[metric.startsWith('unlock:')?`${def.label} has ${effectiveCap} entries in the current catalogue. A larger collection-count target requires additional game content; this does not cap other account progression.`:`Only ${def.label} is at its ${effectiveCap}${def.unit} cap${def.measured?' for the entered resource yield':''}. Other components can still improve this goal.`]:[])],families:description.families.map(f=>({...f,positive:options.filter(c=>c.system===f.name&&c.gain>0).length,tested:options.filter(c=>c.system===f.name).length}))};
 }
 // Group by actual raw mutations, never source names or estimated gains. The
 // parsed scenario is transient: keep only compact results, not 1,000+ accounts.
 function compareRoster(entries,metric,target,settings,progress,run={}){
  const groups=new Map(),pending=[];
  for(const entry of entries){
   const id=entry.character,description=entry.result,key=JSON.stringify([String(id),metric,settings]);
   if(cache.has(key)&&!partialKeys.has(key)||description.value>=target||Number.isFinite(description.cap)&&description.value>=description.cap)continue;
   const state={id,key,before:description.value,cap:capacity(base,id),options:[...(cache.get(key)||[])],issues:[...(comparisonIssues.get(key)||[])],seen:new Set(attempts.get(key)||[])};pending.push(state);
   for(const c of buildSources(base,id,metric,settings).candidates){
    if(state.seen.has(c.id))continue;
    const signature=JSON.stringify([c.path,c.from,c.to,c.missing,c.exactFrom,c.extraPatches,c.levelSnapshotPath,c.capPath,c.capTo]);
    if(!groups.has(signature))groups.set(signature,[]);groups.get(signature).push({c,state});
   }
  }
  // Interleave families so a short scan does not spend its entire budget on
  // hundreds of stamps or meal ribbons. Ranking changes order, never coverage.
  const families=new Map(),words=(T.metrics.find(m=>m.id===metric)?.label||metric).toLowerCase().split(/[^a-z]+/).map(w=>w.startsWith('cook')?'cook':w).filter(w=>w.length>3&&!['total','character','maximum','multiplier','percentage'].includes(w));
  if(metric==='afkKills')words.push('afk','kill','multikill');
  const score=c=>(c.group==='nametags'?-100:0)+(c.system==='Golden food'?20:0)+words.filter(w=>(c.name+' '+(c.searchText||'')).toLowerCase().includes(w)).length*10;
  for(const group of groups.values()){const family=group[0].c.system;if(!families.has(family))families.set(family,[]);families.get(family).push(group);}
  const queues=[...families.values()].map(q=>q.sort((a,b)=>score(b[0].c)-score(a[0].c))).sort((a,b)=>score(b[0][0].c)-score(a[0][0].c)),ordered=[];
  for(let i=0;queues.some(q=>i<q.length);i++)for(const q of queues)if(q[i])ordered.push(q[i]);
  let index=0;
  for(const group of ordered){
   if(run.quick&&now()>=run.compareDeadline)break;
   for(const {c,state} of group)state.seen.add(c.id);
   progress({phase:'compare',current:++index,total:groups.size,name:group[0].c.name+' · '+group.length+' character'+(group.length===1?'':'s')});
   // First simulation supplies the untouched upgrade parse. A capacity upgrade
   // still gets each character's own food refill and a separate exact reparse.
   let prepared;
   try{prepared=simulate(save,group[0].c,group[0].state.id,metric,settings,Infinity,undefined,true).p;}catch(e){for(const {c,state} of group)state.issues.push({name:c.name,error:e.message});continue;}
   for(const {c,state} of group)try{
    const test=simulate(save,c,state.id,metric,settings,state.cap,prepared);
    const option={...test.step,before:state.before,after:test.after,gain:test.after-state.before,relative:state.before?100*(test.after/state.before-1):null};
    state.options.push(option);optionCaps.set(option,test.cap);
   }catch(e){state.issues.push({name:c.name,error:e.message});}
  }
  for(const state of pending){state.options.sort((a,b)=>b.gain-a.gain||a.name.localeCompare(b.name));cache.set(state.key,state.options);comparisonIssues.set(state.key,state.issues);attempts.set(state.key,state.seen);if(index<groups.size)partialKeys.add(state.key);else partialKeys.delete(state.key);}
 }
 function accountWide(...args){return drain(accountWideSteps(...args));}
 function* accountWideSteps(action,metric,target,settings={},progress=()=>{},run={}){
  const def=T.metrics.find(m=>m.id===metric);
  if(def?.measured)throw Error('Choose an individual character and enter their measured resource yield per hour.');
  if(action==='plan'&&(!def||!Number.isFinite(target)||target<=0||def.integer&&!Number.isSafeInteger(target)))throw Error(def?.integer?'Enter a positive whole-number target.':'Enter a finite target greater than zero.');
  const shared=['research','bits','power','accountLevels','printing','kitchens','recipes'].includes(metric)||metric.startsWith('unlock:');
  settings={...settings,accountWide:true,sharedGain:!shared};
  const results=[],excluded=[];let parsed;
  for(const c of base.characters){
   let description;try{if(!parsed&&!descriptions.has(JSON.stringify([String(c.playerId),metric,settings])))parsed=parse(save,true);description=describe(c.playerId,metric,settings,parsed);if(metric==='printing'&&description.value===0)throw Error('No active non-zero saved prints. Record and activate a sample before planning printer output.');}catch(e){excluded.push({name:c.name,error:e.message});continue;}
   results.push({character:c.playerId,name:c.name,result:description});break;
  }
  if(!results.length)throw Error('No eligible characters for this metric. '+excluded.map(e=>e.name+': '+e.error).join('; '));
  if(action==='plan'){
   if(run.quick)compareRoster(results,metric,target,settings,progress,run);
   const routeEnd=now()+4000;
   for(const [i,entry] of results.entries())entry.result=yield* planSteps(entry.character,metric,target,settings,p=>progress(p),{...run,routeDeadline:now()+Math.max(0,routeEnd-now())/(results.length-i)});
  }
  return {...def,unit:results[0].result.unit,note:results[0].result.note,sharedGain:!shared,quick:!!run.quick,partial:results.some(r=>r.result.partial),accountWide:true,shared:true,results,excluded:[],value:Math.min(...results.map(r=>r.result.value)),tested:results.reduce((n,r)=>n+(r.result.tested||0),0),issues:results.flatMap(r=>(r.result.issues||[]).map(e=>({...e,name:r.name+': '+e.name}))),reached:action==='plan'&&results.every(r=>r.result.reached),target,candidates:results.reduce((n,r)=>n+r.result.candidates,0)};
 }
 function prepareFull(id,metric,target,settings={}){
  const def=T.metrics.find(m=>m.id===metric);
  if(!def||!Number.isFinite(target)||target<=0||def.integer&&!Number.isSafeInteger(target))throw Error('Enter a valid target.');
  let description;
  if(id==='all'){
   const d=accountWide('describe',metric,target,settings);id=d.results[0].character;description=d.results[0].result;settings={...settings,accountWide:true,sharedGain:!!d.sharedGain};
  }else description=describe(id,metric,settings);
  const key=JSON.stringify([String(id),metric,settings]),seen=attempts.get(key)||new Set();
  const effectiveCap=def.measured?Math.floor(Number(settings.yieldPerHour)*.9):description.cap;
  const capped=Number.isFinite(effectiveCap)&&description.value>=effectiveCap;
  const candidates=description.value>=target||capped||cache.has(key)&&!partialKeys.has(key)?[]:buildSources(base,id,metric,settings).candidates.filter(c=>!seen.has(c.id));
  return {id,metric,settings,key,before:description.value,cap:capacity(base,id),candidates,routeCandidates:description.value>=target||capped?0:(cache.get(key)||[]).filter(c=>c.group!=='nametags').length};
 }
 function compareCandidate(context,c){
  try{const test=simulate(save,c,context.id,context.metric,context.settings,context.cap);return {option:{...test.step,before:context.before,after:test.after,gain:test.after-context.before,relative:context.before?100*(test.after/context.before-1):null},cap:test.cap};}
  catch(e){return {error:{id:c.id,name:c.name,error:e.message}};}
 }
 function acceptFull(context,results){
  const key=JSON.stringify([String(context.id),context.metric,context.settings]);
  const options=[...(cache.get(key)||[])],seen=new Set(attempts.get(key)||[]),issues=[...(comparisonIssues.get(key)||[])];
  for(const result of results){const id=result.option?.id||result.error?.id;if(!id||seen.has(id))continue;seen.add(id);
   if(result.error)issues.push(result.error);else{options.push(result.option);optionCaps.set(result.option,result.cap);}
  }
  options.sort((a,b)=>b.gain-a.gain||a.name.localeCompare(b.name));cache.set(key,options);attempts.set(key,seen);comparisonIssues.set(key,issues);
  const remaining=buildSources(base,context.id,context.metric,context.settings).candidates.some(c=>!seen.has(c.id));
  if(remaining)partialKeys.add(key);else partialKeys.delete(key);
 }
 function quickPlan(id,metric,target,settings={},progress=()=>{}){
  const def=T.metrics.find(m=>m.id===metric);
  if(!def||!Number.isFinite(target)||target<=0||def.integer&&!Number.isSafeInteger(target))throw Error(def?.integer?'Enter a positive whole-number target.':'Enter a finite target greater than zero.');
  const run={quick:true,compareDeadline:now()+6000};
  if(id==='all')return accountWide('plan',metric,target,settings,progress,run);
  const description=describe(id,metric,settings);
  compareRoster([{character:id,result:description}],metric,target,settings,progress,run);
  return plan(id,metric,target,settings,progress,{...run,routeDeadline:now()+4000});
 }
 function fullRoute(id,metric,target,settings,progress,workers){return id==='all'?accountWideSteps('plan',metric,target,settings,progress,{workers}):planSteps(id,metric,target,settings,progress,{workers});}
 return {describe,plan,quickPlan,accountWide,fullRoute,routeCandidate,prepareFull,compareCandidate,acceptFull,parse,simulate,characters:base.characters.map(c=>({id:c.playerId,name:c.name}))};
}
function apply(save,step){for(const patch of step.patches||[])root.DropTargetSources.set(save,patch.path,patch.value);}
root.ReviewTargetModel={session,apply};
})(typeof self!=='undefined'?self:globalThis);
