'use strict';
self.window=self;
self.localStorage={getItem:()=>null};
// The instrumented engine exposes primary-stat helpers. Tracing is unnecessary here.
self.ConnectedTrace={enter:()=>null,leave:()=>{},value:(_id,_name,value)=>value};
importScripts('connected-trace-engine.js','connected-primary-stats.js','cooking-impact-model.js');
const read=v=>typeof v==='string'?JSON.parse(v):v;
function apply(save,base,p,includeLevels){
 let key,group,index,to=p.to;
 if(p.kind==='stamp'){
  group={combat:0,skills:1,misc:2}[p.category];
  index=base.account.stamps[p.category]?.findIndex(s=>s.rawName===p.id);
  key=save.StampLv!==undefined?'StampLv':'StampLevel';
  if(p.cap&&includeLevels)to=p.future;
 }else if(['salt','atom','vault','arcade'].includes(p.kind)){
  const field={salt:'SaltLick',atom:'Atoms',vault:'UpgVault',arcade:'ArcadeUpg'}[p.kind],row=read(save[field]);
  if(!row||row[p.id]!==p.from||p.to!==p.from+1)throw Error('Upgrade no longer matches the save.');row[p.id]=p.to;save[field]=row;return;
 }else if(p.kind==='vial'){key='CauldronInfo';group=4;index=p.id;
 }else if(p.kind==='fountain'){
  const h=read(save.Holes),rows=read(h?.[31]),row=read(rows?.[p.water]);
  if(!row||row[p.index]!==p.from||p.to!==p.from+1)throw Error('Fountain upgrade does not match this save.');
  row[p.index]=p.to;rows[p.water]=row;h[31]=rows;save.Holes=h;return;
 }else if(p.kind==='summoning'){key='Summon';group=0;index=p.id;
 }else if(p.kind==='bubble'){
  if(!/^[OGPY]\d+$/.test(p.id))throw Error('Invalid bubble.');
  group='OGPY'.indexOf(p.id[0]);index=Number(p.id.slice(1));key='CauldronInfo';
 }else if(p.kind==='meal'){key='Meals';group=0;index=p.id;}
 else throw Error('This action has no supported stat preview.');
 const rows=read(save[key]),row=read(rows?.[group]);
 if(!Number.isInteger(index)||index<0||(!row||typeof row!=='object')||Number(row[index])!==p.from||!Number.isFinite(to)||to<p.from)throw Error('Upgrade does not match the imported save. Refresh Account Review.');
 row[index]=to;rows[group]=row;save[key]=rows;
 if(p.kind==='stamp'&&p.cap){const capKey=save.StampLvM!==undefined?'StampLvM':'StampLevelMAX',caps=read(save[capKey]);caps[group]=read(caps[group]);caps[group][index]=Math.max(caps[group][index],includeLevels?to:p.capTo);save[capKey]=caps;const options=read(save.OptionsListAccount);if(options){options[134]=0;save.OptionsListAccount=options;}}
}
function primary(parsed){
 const totals=parsed.characters.map(c=>ConnectedPrimaryStats.calculate(c,parsed.account,parsed.characters,PrayerMath));
 totals.forEach((rows,i)=>rows.forEach((r,j)=>{
  if(r.unknown.length||!Number.isFinite(r.computed))throw Error('Primary-stat model is incomplete for this character.');
  parsed.characters[i].stats[['strength','agility','wisdom','luck'][j]]=r.computed;
 }));
}
function metric(parsed,id,goal,save){
 const M=PrayerMath,a=parsed.account,cs=parsed.characters,c=cs[id];if(!c)throw Error('Choose an imported character.');
 const out=(label,value,unit='',note='')=>({label,value,unit,note});
 switch(goal){
 case 'balanced':case 'damage':return out('Maximum damage',M.getMaxDamage(c,cs,a).maxDamage,'','Damage estimate for the saved equipment and talent preset; situational boss bonuses may not affect this total.');
 case 'afk':return out('AFK kills at saved target',M.getMaxDamage(c,cs,a).finalKillsPerHour,'/hr','Uses the saved map and combat setup.');
 case 'exp':return out('Class EXP multiplier',M.getClassExpMulti(c,a,cs).value,'×','Class EXP bonus, not total EXP per hour.');
 case 'drop':return out('Drop rate',M.getDropRate(c,a,cs).dropRate,'×');
 case 'samples':return out('Printer sample rate',Math.min(90,M.getPrinterSampleRate(c,a,a.charactersLevels)),'%','Sample-rate component only; this does not predict resource sample size.');
 case 'skill':return out('All-skill efficiency multiplier',M.getAllEff(c,cs,a),'×','Shared efficiency component; individual skill output has additional factors.');
 case 'cooking':return CookingImpactModel.metric(parsed,id,'Mcook',save);
 default:throw Error('Permanent unlocks do not have a single numerical goal total.');
 }
}
self.onmessage=({data:q})=>{
 try{
  const raw=q.raw,save=structuredClone(read(raw.data)||raw);
  const parse=s=>{
   const errors=[],original=console.error;let p;
   try{console.error=(...args)=>errors.push(String(args[0]));p=PrayerMath.parseData(structuredClone(s),raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);}finally{console.error=original;}
   if(errors.length)throw Error('The full save could not be decoded for this preview.');return p;
  };
  if(!q.actions?.length)throw Error('Select at least one upgrade.');
  const base=parse(save),changed=structuredClone(save),seen=new Set();
  for(const p of q.actions){const key=p.kind+'|'+p.id;if(seen.has(key))throw Error('Duplicate upgrade selected.');seen.add(key);apply(changed,base,p,q.includeLevels);}
  const after=parse(changed);
  // Rebuild both scenarios consistently: saved PVStatList values do not update
  // when an upgrade changes STR/AGI/WIS/LUK.
  primary(base);primary(after);
  const beforeMetric=metric(base,q.character,q.goal,save),afterMetric=metric(after,q.character,q.goal,changed);
  if(!Number.isFinite(beforeMetric.value)||!Number.isFinite(afterMetric.value))throw Error('This goal total is unavailable in the imported save.');
  self.postMessage({result:{...beforeMetric,before:beforeMetric.value,after:afterMetric.value,relative:beforeMetric.value?100*(afterMetric.value/beforeMetric.value-1):null}});
 }catch(error){self.postMessage({error:error.message});}
};

self.ReviewSimulation={apply,primary,metric};
