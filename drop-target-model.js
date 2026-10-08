(function(root){
'use strict';
const read=v=>typeof v==='string'?JSON.parse(v):v;
function plan(raw,character,target,M=root.PrayerMath,progress=()=>{}){
 if(!Number.isFinite(target)||target<=0)throw Error('Enter a target drop rate greater than zero, for example 25 for 25x.');
 const S=root.DropTargetSources,save=structuredClone(read(raw.data)||raw);
 const parse=s=>{const errors=[],old=console.error;let p;try{console.error=(...args)=>errors.push(String(args[0]));p=M.parseData(structuredClone(s),raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);}finally{console.error=old;}if(errors.length)throw Error('Import a fresh full export before calculating upgrades.');return p;};
 const parsed=parse(save),ch=parsed.characters.find(c=>String(c.playerId)===String(character));
 if(!ch)throw Error('Choose a saved character.');
 if([39,40,70,71,118,119].includes(Number(ch.mapIndex))||(Number(ch.mapIndex)===216&&Number(S.get(save,['Holes',0,ch.playerId]))===17))throw Error('Use a character saved outside dungeons and Crystal Glunko Cove for this normal drop-rate plan.');
 if(['PVStatList_','EquipOrder_','EquipQTY_','Lv0_','Prayers_','CardEquip_'].some(k=>save[k+ch.playerId]===undefined))throw Error('This character export is incomplete. Import a full export before calculating.');
 const selected=p=>p.characters.find(c=>c.playerId===ch.playerId);
 const rate=p=>M.getDropRate(selected(p),p.account,p.characters).dropRate;
 const before=rate(parsed);if(!Number.isFinite(before)||before<=0)throw Error('Current drop rate is unavailable.');
 const built=S.build(parsed,save,ch.playerId,M),issues=[],options=[];
 function simulate(base,c){
  const changed=structuredClone(base),from=Number(S.get(base,c.path));
  if(!Number.isFinite(from)||c.to<from||(c.exactFrom&&from!==c.from))throw Error('Upgrade no longer matches this scenario.');
  for(const patch of c.extraPatches||[]){if(S.get(base,patch.path)!==patch.from)throw Error('The stored item has already moved.');S.set(changed,patch.path,patch.value);}
  S.set(changed,c.path,c.to);
  if(c.capPath)S.set(changed,c.capPath,Math.max(Number(S.get(base,c.capPath)),c.capTo));
  let p=parse(changed),foodBefore,foodAfter;
  if(c.foodFill){
   foodBefore=S.foodState(parse(base),ch.playerId,base,M);foodAfter=S.foodState(p,ch.playerId,changed,M);
   if(foodAfter.missing)throw Error('A matching equipped golden food is required for this route.');
   const amount=c.id==='food-fill'?Math.min(c.to,Math.floor(foodAfter.capacity)):Math.max(foodBefore.amount,Math.floor(foodAfter.capacity));
   S.set(changed,foodAfter.path,amount);p=parse(changed);foodAfter=S.foodState(p,ch.playerId,changed,M);
  }
  const after=rate(p);if(!Number.isFinite(after))throw Error('This upgrade could not be calculated.');
  const patches=[{path:c.path,value:S.get(changed,c.path)},...(c.extraPatches||[]).map(({path,value})=>({path,value}))];
  if(c.capPath)patches.push({path:c.capPath,value:S.get(changed,c.capPath)});
  if(foodAfter)patches.push({path:foodAfter.path,value:foodAfter.amount});
  return {after,changed,p,step:{...c,from,foodBefore,foodAfter,patches}};
 }
 for(const [i,c] of built.candidates.entries()){
  progress({phase:'compare',current:i+1,total:built.candidates.length,name:c.name});
  try{const test=simulate(save,c);options.push({...test.step,before,after:test.after,gain:test.after-before,relative:100*(test.after/before-1)});}catch(error){issues.push({name:c.name,error:error.message});}
 }
 // These are single-source comparisons. Combined totals below are always recomputed
 // from the cumulative raw save, never by adding independent projected gains.
 options.sort((a,b)=>b.relative-a.relative||a.name.localeCompare(b.name));
 let current=before,combined=structuredClone(save);const steps=[],conflicts=new Set();
 const routeOptions=[...options].sort((a,b)=>(a.id==='food-fill'?-1:b.id==='food-fill'?1:0)||b.relative-a.relative);
 for(const candidate of routeOptions){
  if(candidate.conflict&&conflicts.has(candidate.conflict))continue;
  if(current>=target)break;
  if(candidate.gain<=1e-10)continue;
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
 const coverage=rows.map(row=>{const matches=options.filter(c=>c.sources.some(name=>name.toLowerCase()===row.name.toLowerCase()));return {name:row.name,value:row.value,operation:row.operation,detail:row.detail,...root.DropSourceInfo.get(row),status:matches.length?'Compared '+matches.length+' upgrade option'+(matches.length===1?'':'s'):'Review source - no verified next-step simulation',options:matches.map(c=>c.name)};});
 const golden=M.getGoldenFoodMulti(ch,parsed.account,parsed.characters);
 return {before,after:current,target,reached:current>=target,steps,options,issues,coverage,notes:built.notes,food:built.food,golden:{multiplier:golden.value,categories:golden.breakdown.categories},tested:options.length,missing:built.candidates.length-options.length};
}
function apply(save,step){for(const patch of step.patches||[])root.DropTargetSources.set(save,patch.path,patch.value);}
root.DropTargetModel={plan,apply};
})(typeof window!=='undefined'?window:globalThis);
