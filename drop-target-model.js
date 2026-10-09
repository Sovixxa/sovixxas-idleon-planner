(function(root){
'use strict';
const read=v=>typeof v==='string'?JSON.parse(v):v;
// Store compact projections for exact raw scenarios, not entire parsed accounts.
// The cache belongs to one imported save and is bounded for long roster routes.
function session(raw,M=root.PrayerMath){
 const S=root.DropTargetSources,save=structuredClone(read(raw.data)||raw),cache=new Map();
 const parse=s=>{const errors=[],old=console.error;let p;try{console.error=(...args)=>errors.push(String(args[0]));p=M.parseData(structuredClone(s),raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);}finally{console.error=old;}if(errors.length||!p?.characters?.length)throw Error('Import a fresh full export before calculating upgrades.');return p;};
 const parsed=parse(save),original=new Map(Object.keys(save).map(k=>[k,JSON.stringify(save[k])]));
 const signature=s=>JSON.stringify([...new Set([...original.keys(),...Object.keys(s)])].sort().flatMap(k=>{const value=JSON.stringify(s[k]);return value===original.get(k)?[]:[[k,value]];}));
 function project(p,s){const rates={},foods={};for(const c of p.characters){const id=String(c.playerId);try{rates[id]=M.getDropRate(c,p.account,p.characters).dropRate;}catch(e){rates[id]=NaN;}try{foods[id]=S.foodState(p,id,s,M);}catch(e){foods[id]={missing:true,error:e.message};}}return {rates,foods,mealMaxLevel:p.account.cooking?.mealMaxLevel};}
 const baseline=project(parsed,save);cache.set('[]',baseline);
 function inspect(s){const key=signature(s);if(cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);return value;}const value=project(parse(s),s);cache.set(key,value);if(cache.size>256)cache.delete(cache.keys().next().value);return value;}
 return {save,parsed,inspect};
}
function plan(raw,character,target,M=root.PrayerMath,progress=()=>{},shared){
 if(!Number.isFinite(target)||target<=0)throw Error('Enter a target drop rate greater than zero, for example 25 for 25x.');
 const S=root.DropTargetSources,context=shared||session(raw,M),{save,inspect}=context;
 const parsed=context.parsed,ch=parsed.characters.find(c=>String(c.playerId)===String(character));
 if(!ch)throw Error('Choose a saved character.');
 if([39,40,70,71,118,119].includes(Number(ch.mapIndex))||(Number(ch.mapIndex)===216&&Number(S.get(save,['Holes',0,ch.playerId]))===17))throw Error('Use a character saved outside dungeons and Crystal Glunko Cove for this normal drop-rate plan.');
 if(['PVStatList_','EquipOrder_','EquipQTY_','Lv0_','Prayers_','CardEquip_'].some(k=>save[k+ch.playerId]===undefined))throw Error('This character export is incomplete. Import a full export before calculating.');
 const rate=p=>p.rates[String(ch.playerId)];
 const before=rate(inspect(save));if(!Number.isFinite(before)||before<=0)throw Error('Current drop rate is unavailable.');
 const built=S.build(parsed,save,ch.playerId,M),issues=[],options=[];
 function simulate(base,c){
  const changed=structuredClone(base),from=Number(S.get(base,c.path));
  if(!Number.isFinite(from)||c.to<from||(c.exactFrom&&from!==c.from))throw Error('Upgrade no longer matches this scenario.');
  for(const patch of c.extraPatches||[]){if(S.get(base,patch.path)!==patch.from)throw Error('The stored item has already moved.');S.set(changed,patch.path,patch.value);}
  S.set(changed,c.path,c.to);
  if(c.capPath)S.set(changed,c.capPath,Math.max(Number(S.get(base,c.capPath)),c.capTo));
  let p=inspect(changed),foodBefore,foodAfter;const stockPatches=[];
  if(c.mealIndex!==undefined){
   const path=['Meals',0,c.mealIndex],level=Number(S.get(changed,path));
   const value=Math.max(level,Math.min(p.mealMaxLevel,level+5));
   S.set(changed,path,value);stockPatches.push({path,value});p=inspect(changed);
  }
  if(c.foodFill){
   foodBefore=inspect(base).foods[String(ch.playerId)];foodAfter=p.foods[String(ch.playerId)];
   if(foodAfter.missing)throw Error('A matching equipped golden food is required for this route.');
   const amount=c.id==='food-fill'?Math.min(c.to,Math.floor(foodAfter.capacity)):foodAfter.capacity>foodBefore.capacity?Math.max(foodBefore.amount,Math.floor(foodAfter.capacity)):foodBefore.amount;
   // Reserve banked food in this hypothetical route, so later refills cannot
   // promise to reuse the same saved cakes. Any deficit remains a farming task.
   let needed=Math.max(0,amount-foodBefore.amount);
   for(const slot of foodBefore.bankSlots){const used=Math.min(needed,slot.amount);if(used>0){const value=slot.amount-used;S.set(changed,slot.path,value);stockPatches.push({path:slot.path,value});needed-=used;}}
   S.set(changed,foodAfter.path,amount);p=inspect(changed);foodAfter=p.foods[String(ch.playerId)];
  }
  const after=rate(p);if(!Number.isFinite(after))throw Error('This upgrade could not be calculated.');
  const patches=[{path:c.path,value:S.get(changed,c.path)},...(c.extraPatches||[]).map(({path,value})=>({path,value}))];
  if(c.capPath)patches.push({path:c.capPath,value:S.get(changed,c.capPath)});
  if(foodAfter)patches.push({path:foodAfter.path,value:foodAfter.amount});
  patches.push(...stockPatches);
  return {after,changed,p,step:{...c,from,foodBefore,foodAfter,patches}};
 }
 for(const [i,c] of (before>=target?[]:built.candidates).entries()){
  progress({phase:'compare',current:i+1,total:built.candidates.length,name:c.name});
  try{const test=simulate(save,c);options.push({...test.step,before,after:test.after,gain:test.after-before,relative:100*(test.after/before-1)});}catch(error){issues.push({name:c.name,error:error.message});}
 }
 // These are single-source comparisons. Combined totals below are always recomputed
 // from the cumulative raw save, never by adding independent projected gains.
 options.sort((a,b)=>b.relative-a.relative||a.name.localeCompare(b.name));
 let current=before,combined=structuredClone(save);const steps=[],conflicts=new Set();
 const routeOptions=options.filter(c=>c.group!=='nametags').sort((a,b)=>(a.id==='food-fill'?-1:b.id==='food-fill'?1:0)||b.relative-a.relative);
 for(const candidate of routeOptions){
  if(candidate.conflict&&conflicts.has(candidate.conflict))continue;
  if(current>=target)break;
  // An independently neutral option can gain after earlier upgrades.
  // Judge it against the cumulative save, not its original comparison.
  progress({phase:'combine',current:steps.length+1,total:options.length,name:candidate.name});
  try{
   let c={...candidate},test=simulate(combined,c);
   if(test.after<=current+1e-10)continue;
   // Negligible options remain visible in the full comparison, but do not create
   // long recommendation lists unless they actually close the target gap.
   if(test.after<target&&100*(test.after/current-1)<.01)continue;
   if(test.after>=target&&['level','items','points','kills'].includes(c.unit)){
    let low=Number(S.get(combined,c.path))+1,high=c.to;
    while(low<high){const mid=Math.floor((low+high)/2),probe=simulate(combined,{...c,to:mid});if(probe.after>=target)high=mid;else low=mid+1;}
    c.to=low;test=simulate(combined,c);
   }
   steps.push({...test.step,before:current,after:test.after,gain:test.after-current,relative:100*(test.after/current-1)});
   current=test.after;combined=test.changed;if(candidate.conflict)conflicts.add(candidate.conflict);
  }catch(error){issues.push({name:candidate.name,error:error.message});}
 }
 const rows=root.DropRateModel.ledger(M.getDropRate(ch,parsed.account,parsed.characters));
 const coverage=rows.map(row=>{const matches=options.filter(c=>c.sources.some(name=>name.toLowerCase()===row.name.toLowerCase()));return {name:row.name,value:row.value,operation:row.operation,detail:row.detail,...root.DropSourceInfo.get(row),status:matches.length?'Compared '+matches.length+' upgrade option'+(matches.length===1?'':'s')+'; partial coverage':'Review source - no verified next-step simulation',options:matches.map(c=>c.name)};});
 const golden=M.getGoldenFoodMulti(ch,parsed.account,parsed.characters);
 return {before,after:current,target,reached:current>=target,steps,options,issues,coverage,notes:built.notes,food:built.food,golden:{multiplier:golden.value,categories:golden.breakdown.categories},tested:options.length,missing:built.candidates.length-options.length};
}
function apply(save,step){for(const patch of step.patches||[])root.DropTargetSources.set(save,patch.path,patch.value);}
root.DropTargetModel={plan,apply,session};
})(typeof window!=='undefined'?window:globalThis);
