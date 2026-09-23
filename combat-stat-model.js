(function(root){
'use strict';
const parse=v=>{if(typeof v==='string'){try{return JSON.parse(v);}catch{}}return v;};
const near=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=Math.max(1,Math.abs(b))*1e-9;
function expRows(result){
 const [add,multi]=result.breakdown.categories;
 const rows=[{name:'Base',value:1,operation:'add',group:'misc',stage:'Base multiplier',unit:'×',eligible:false}];
 for(const s of add.sources)rows.push({...s,operation:'add',group:s.value<0?'misc':'additive',stage:'Additive EXP pool',unit:'×'});
 for(const pool of add.subSections||[])for(const s of pool.sources||[])rows.push({...s,name:`${pool.name}: ${s.name}`,value:s.value/100,operation:'add',group:'additive',stage:'Additive equipment pool',unit:'×'});
 for(const s of multi.sources)rows.push({...s,operation:'multiply',group:'multi',stage:'EXP multiplier chain',unit:'×'});
 let running=0;
 for(const row of rows){running=row.operation==='multiply'?running*row.value:running+row.value;row.running=running;row.active=row.operation==='multiply'?row.value!==1:row.value!==0;}
 if(!near(running,result.value))throw Error('Class EXP breakdown does not reconcile with the calculated total.');
 return rows;
}
function damageRows(result){
 const rows=[];
 for(const category of result.damageBreakdown.categories){
  for(const section of category.subSections||[]){
   for(const source of section.sources||[]){
    const row={...source,stage:category.name,group:section.name==='Multiplicative'?'multi':'additive',operation:'pool',unit:category.name==='Base Damage'?'damage':'%',eligible:true};
    if(category.name==='Base Damage'&&source.name==='Weapon Power Effect'){
     // These entries are already inside weaponPowerEffect, so remove them from the aggregate.
     const nested=['Golden Food','Arcade','Owl','Vault (Bigger Damage)','Vault (Slice N Dice)'];
     row.value-=section.sources.filter(s=>nested.includes(s.name)).reduce((sum,s)=>sum+s.value,0);
     row.name='Weapon power + main stat';row.eligible=false;
     row.detail='Weapon-power formula, main stat and the early-stat bonus; Golden Food, Arcade, Owl and Vault terms are listed separately.';
    }
    if(category.name==='Base Damage'&&source.name==='Cosmo'){
     row.group='misc';row.unit='%';row.eligible=false;
     row.detail='Weapon-power amplification already included in Weapon power + main stat; do not add it again.';
    }
    if(category.name==='Base Damage'&&source.name==='Food (post-softcap)')row.detail='Added after the base-damage soft caps.';
    if(category.name==='HP/MP Damage')row.detail='Adds to the HP/MP and main-stat percentage pool. This pool is an input to the Per-X stage.';
    if(category.name==='Per-X Bonuses')row.detail=section.name==='Multiplicative'?'Multiplies this stage before its soft caps.':'Adds to the shared Per-X percentage pool before its soft caps.';
    if(category.name==='Damage %'){
     row.detail=section.name==='Multiplicative'?'Damage multiplier stage; soft caps and ordering affect its final impact.':'Adds inside one of the damage percentage pools, not directly to final damage.';
     if(['Tome','Achievements (Final)'].includes(source.name)){row.group='additive';row.detail='Tome and final achievements share one post-softcap percentage pool.';}
     if(/Curse|Balanced Spirit/.test(source.name)){row.group='misc';row.eligible=false;row.detail='Damage penalty. Prayer curses share a reduction term; the combined penalty has a 5% floor.';}
    }
    if(row.group==='multi'){row.value=1+row.value/100;row.operation='multiply';row.unit='×';}
    row.active=row.operation==='multiply'?row.value!==1:row.value!==0;
    if(!Number.isFinite(row.value))throw Error(`Unavailable damage source: ${row.name}`);
    rows.push(row);
   }
  }
 }
 const stages=result.damageStages;
 if(!near(stages.baseDamage*stages.perDamage*stages.percentDamage,result.maxDamage))throw Error('Damage stages do not reconcile with maximum damage.');
 rows.push({name:'Base damage soft caps',group:'misc',stage:'Base Damage',operation:'rule',active:true,eligible:false,display:'4,000 / 15,000',detail:'Above 4,000: 4,000 + (damage − 4,000)^0.91. Then above 15,000: 15,000 + (damage − 15,000)^0.84. Food is added afterwards.'});
 rows.push({name:'Per-X soft caps',group:'misc',stage:'Per-X Bonuses',operation:'rule',active:true,eligible:false,display:'3 stages',detail:'Applies the 100 threshold with exponent 0.86, then thresholds 2,000,000 (exponent 0.5) and 100,000,000 (exponent 0.3).'});
 rows.push({name:'Damage percentage soft caps',group:'misc',stage:'Damage %',operation:'rule',active:true,eligible:false,display:'6 stages',detail:'Before final multipliers: thresholds 100, 20M, 500M, 2B, 15B and 60B, with exponents 0.86, 0.8, 0.6, 0.45, 0.36 and 0.28 respectively.'});
 return rows;
}
function calculate(raw,kind,M=root.PrayerMath){
 if(!['damage','classExp'].includes(kind))throw Error('Unknown character stat');
 const copy=JSON.parse(JSON.stringify(raw)),data=parse(copy.data)||copy;
 if(!Object.keys(data).some(k=>/^CharacterClass_\d+$/.test(k)))return {kind,characters:[]};
 const errors=[],old=console.error;let parsed;
 try{console.error=(...args)=>errors.push(String(args[0]));parsed=M.parseData(data,copy.charNames,copy.companion,copy.guildData,copy.serverVars||{},copy.accountCreateTime,copy.tournament);}finally{console.error=old;}
 if(errors.length)throw Error('Some save sections could not be decoded. Import a fresh full export.');
 return {kind,todo:root.StatTodoModel?.build(parsed,kind,data),savedAt:copy.lastUpdated||null,characters:parsed.characters.map(ch=>{
  const common={id:ch.playerId,name:ch.name,className:ch.class,map:ch.currentMap,missing:['PVStatList_','EquipOrder_','Lv0_','Prayers_','CardEquip_'].filter(k=>data[k+ch.playerId]===undefined)};
  try{
   if([39,40,70,71,118,119].includes(Number(ch.mapIndex)))throw Error('Live dungeon stats are not available from this export.');
   const result=kind==='damage'?M.getMaxDamage(ch,parsed.characters,parsed.account):M.getClassExpMulti(ch,parsed.account,parsed.characters);
   const total=kind==='damage'?result.maxDamage:result.value;
   if(!Number.isFinite(total)||total<0)throw Error('The saved setup could not produce a finite stat.');
   const rows=kind==='damage'?damageRows(result):expRows(result);
   if(kind==='damage'&&parsed.account.hole?.reliquarium)rows.push({name:'Reliquarium penalty',group:'misc',stage:'Damage %',operation:'rule',active:true,eligible:false,display:'Active',detail:`Raises the final damage-percentage multiplier to the power ${4/(5+Number(parsed.account.accountOptions?.[473]||0))}.`});
   return {...common,total,min:kind==='damage'?result.minDamage:null,stages:kind==='damage'?result.damageStages:null,rows};
  }catch(error){return {...common,error:error.message};}
 })};
}
root.CombatStatModel={calculate,expRows,damageRows};
})(typeof window!=='undefined'?window:globalThis);
