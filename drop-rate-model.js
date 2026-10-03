(function(root){
'use strict';
const parse=v=>{if(typeof v==='string'){try{return JSON.parse(v);}catch{}}return v;};
const factors=new Set(['Siege Breaker','Crystal Glunko','Mama Troll','Glimbo DR','Mallay','Glunko The Massive','Santa Snake']);
function ledger(result){
 const [add,multi]=result.breakdown.categories, rows=[];
 const row=(name,operation,value,detail='')=>rows.push({name,operation,value,detail,active:operation==='multiply'?value!==1:value!==0});
 for(const source of add.sources.filter(s=>!['Ninja Mastery','Gem Bundle2','Chip (capped at 5)'].includes(s.name)))row(source.name,'add',source.value);
 row('Equipment, Gallery & Hat Rack','add',result.pools.additive/100,add.subSections[0].sources.map(s=>`${s.name}: +${s.value.toLocaleString('en-US',{maximumFractionDigits:4})}%`).join(' · '));
 row('Drop-rate chip (base capped at 5×)','add',add.sources.find(s=>s.name==='Chip (capped at 5)').value);
 row('Drop-rate bundle (+2)','add',add.sources.find(s=>s.name==='Gem Bundle2').value);
 row('Archlord of the Pirates','multiply',multi.sources.find(s=>s.name==='Siege Breaker').value);
 row('Ninja Mastery','add',add.sources.find(s=>s.name==='Ninja Mastery').value,'Added after Archlord, before the remaining multipliers.');
 const gearPool=(key,index,name)=>row(name,'multiply',1+result.pools[key]/100,multi.subSections[index].sources.map(s=>`${s.name}: +${s.value.toLocaleString('en-US',{maximumFractionDigits:4})}%`).join(' · '));
 for(const source of multi.sources.filter(s=>s.name!=='Siege Breaker')){
  row(source.name,'multiply',factors.has(source.name)?source.value:1+source.value,source.name==='Sushi + Jelly Operator'?`Sushi +${result.sushiDropRateBonus}%, Jelly +${result.jellyDropRateBonus}% in one shared pool.`:'');
  if(source.name==='Tome Multi')gearPool('bonus',0,'BONUS DROP RATE equipment pool');
  if(source.name==='Pristine Charm')gearPool('multi',1,'DROP RATE MULTI equipment pool');
 }
 let running=0;for(const r of rows){running=r.operation==='add'?running+r.value:running*r.value;r.running=running;}
 if(!Number.isFinite(running)||Math.abs(running-result.dropRate)>Math.max(1,result.dropRate)*1e-10)throw new Error('Drop-rate breakdown does not reconcile with its total.');
 return rows;
}
// Native Grimoire_DMG / Grimoire_ACC, used instead of normal stats in Wraith Form.
function wraithStats(bonuses,options,total,form,marauder){
 const b=i=>Number(bonuses[i])||0,o=i=>Number(options[i])||0,log=v=>Math.log(Math.max(1,v))/2.30259;
 const style=1+marauder*(total/100)/100;
 return {damage:(5+b(0)+b(6)+b(16)+b(33)+b(46))*(1+form/100)*(1+(b(8)+b(28)+b(43)+b(50))/100)*(1+(o(334)*b(13)+o(335)*b(21)+o(336)*b(31))/100)*(1+b(18)*log(o(330))/100)*style,accuracy:(2+b(1)+b(12)+b(25)+b(37)+b(47))*(1+(b(7)+b(38))/100)*(1+b(41)*log(o(332))/100)*style};
}
function calculate(raw,M=root.PrayerMath){
 const copy=JSON.parse(JSON.stringify(raw)),d=parse(copy.data)||copy;
 if(!Object.keys(d).some(k=>/^CharacterClass_\d+$/.test(k)))return {characters:[]};
 const errors=[],originalError=console.error;let parsed;
 try{console.error=(...args)=>errors.push(String(args[0]));parsed=M.parseData(d,copy.charNames,copy.companion,copy.guildData,copy.serverVars||{},copy.accountCreateTime,copy.tournament);}finally{console.error=originalError;}
 if(errors.length)throw new Error('Some save sections could not be decoded. Import a fresh full export.');
 const holes=parse(d.Holes);
 return {todo:root.StatTodoModel?.build(parsed,'drop',d),savedAt: copy.lastUpdated || null, characters:parsed.characters.map(ch=>{
  const missing=['PVStatList_','EquipOrder_','Lv0_','Prayers_','CardEquip_'].filter(k=>d[k+ch.playerId]===undefined);
  try{
   if([39,40,70,71,118,119].includes(Number(ch.mapIndex)))throw new Error('Dungeon drop rate uses live dungeon stats that are not in this export.');
   const result=M.getDropRate(ch,parsed.account,parsed.characters),rows=ledger(result);
   const gold=rows.find(row=>row.name==='Golden Food');
   if(gold){
    const effect=Math.max(0,100*(M.getGoldenFoodMulti(ch,parsed.account,parsed.characters).value-1));
    gold.detail=`Gold Food Bonus: +${effect.toLocaleString('en-US',{maximumFractionDigits:2})}%. Includes equipped Golden Cake and Beanstalk.`;
   }
   const family=rows.find(row=>row.name==='Royal Guardian family');
   if(family)family.detail='Includes The Family Guy when this character supplies the family bonus.';
   const cove=Number(ch.mapIndex)===216&&Number(holes?.[0]?.[ch.playerId])===17;
   const normal=result.dropRate,total=cove?parsed.account.hole.caverns.crystalGlunkoCove.dropRate:normal;
   if(!Number.isFinite(total))throw new Error('Non-finite drop rate');
   let loot={rareMultiplier:1+M.getTalentBonus(ch.flatTalents,'RARES_EVERYWHERE!')/100,crystalRolls:ch.crystalSpawnChance?.embiggener||1,quests:parse(d['QuestComplete_'+ch.playerId])||{},stamps:parse(d.StampLvM)||[],recipes:parse(d.AnvilCraftStatus)||[],storage:parse(d.InvStorageUsed)||{},stampMultiplier:1+((parsed.account.bribes?.[1]?.done?parsed.account.bribes[1].value:0)+(parsed.account.bribes?.[8]?.done?parsed.account.bribes[8].value:0))/100,hpMultiplier:M.getMonsterHpTotal(1,ch,parsed.account)};try{const stats=M.getMaxDamage(ch,parsed.characters,parsed.account);Object.assign(loot,{damage:stats.maxDamage,accuracy:stats.accuracy,unlocked:parsed.account.towers?.towersTwo>.5,base:M.getMultiKillBase(ch,parsed.characters,parsed.account),perTier:Array.from({length:7},(_,world)=>M.getMultiKillPerTier(ch,parsed.characters,parsed.account,world))});}catch{}
   const bundles=parse(d.BundlesReceived)||{};
   loot.stackBonuses={pack:Number(bundles.bon_k)===1?2:1,goldenChance:M.getDoubleGoldenFoodDrop(parsed.account),statueChance:M.getDoubleStatueDrop(parsed.account,ch,parsed.characters),legend:Number(M.getLegendTalentBonus(parsed.account,2))||0,statueUpgrade:Number(M.getSpelunkingBonus(parsed.account,48))||0};
   const buffs=parse(d['BuffsActive_'+ch.playerId])||[];
   loot.gimmeChance=buffs.some(b=>Number(b[0])===19&&Number(b[1])>100)?Math.max(0,Math.min(1,(M.getTalentBonus(ch.flatTalents,'GIMME_GIMME')-.05)/99.95)):0;
   if(buffs.some(b=>Number(b[0])===195&&Number(b[1])>100)&&M.getTalentBonus(ch.flatTalents,'WRAITH_FORM')>=1){Object.assign(loot,wraithStats((parsed.account.grimoire?.upgrades||[]).map(u=>u.bonus),parsed.account.accountOptions||[],parsed.account.grimoire?.totalUpgradeLevels||0,M.getTalentBonus(ch.flatTalents,'WRAITH_FORM'),M.getTalentBonus(ch.flatTalents,'MARAUDER_STYLE')));loot.wraith=true;}
   else if(buffs.some(b=>[420,585].includes(Number(b[0]))&&Number(b[1])>100)){loot.damage=null;loot.accuracy=null;}
   loot.deathNote=Array.from({length:7},(_,i)=>parsed.account.deathNote?.[i]?.rank||0);
   loot.miniBossNote=parsed.account.deathNote?.miniBosses?.rank||0;
   return {loot,id:ch.playerId,name:ch.name,className:ch.class,map:ch.currentMap,total,normal,rows,missing,cove};
  }catch(error){return {id:ch.playerId,name:ch.name,className:ch.class,error:error.message,missing};}
 })};
}
root.DropRateModel={calculate,ledger,wraithStats};
if(typeof module!=='undefined')module.exports=root.DropRateModel;
})(typeof window!=='undefined'?window:globalThis);
