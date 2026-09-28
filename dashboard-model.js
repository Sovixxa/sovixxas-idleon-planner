(function(root){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x)),parse=x=>{try{return typeof x==='string'?JSON.parse(x):x;}catch{return null;}};
const pretty=x=>String(x??'').replace(/([a-z0-9])([A-Z])/g,'$1 $2').replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
const PAGES={tasks:'tasks',materialTracker:'loadouts',guild:'guilds',shops:'home',etc:'events',stamps:'stamps',owl:'orion',forge:'forge',alchemy:'alchemy',islands:'islandExpeditions',postOffice:'postOffice',arcade:'arcade',weeklyBosses:'weeklyBosses',killRoy:'killroy',kangaroo:'poppy',printer:'printer',library:'construction',construction:'construction',hatRack:'hatRack',equinox:'equinox',atomCollider:'atomCollider',traps:'trapping',breeding:'breeding',cooking:'cooking',laboratory:'lab',tome:'tome',gaming:'gaming',sailing:'sailing',hole:'hole',sneaking:'sneaking',beanstalk:'beanstalk',farming:'farming',summoning:'summoning',royalGuardian:'royalArmory',gallery:'nametags',spelunking:'spelunking',legendTalents:'legendTalents',zenithMarket:'zenithMarket',minehead:'minehead',research:'research',sushiStation:'sushi',clamWork:'clamworks',theButton:'button',cards:'cards',anvil:'smithing',worship:'worship',quests:'quests',obols:'obols',starSigns:'starSigns',crystalCountdown:'characters',tools:'characters',divinityStyle:'divinity',talents:'characters',equipment:'characters',bags:'carryCapacity',classSpecific:'characters'};
const LABELS={etc:'Other account alerts',owl:'Orion',kangaroo:'Poppy',killRoy:'Killroy',royalGuardian:'Royal Armory',clamWork:'Clamworks',theButton:'The Button',laboratory:'Laboratory',syphonCharge:'Charge Syphon overflow',closestFullWorship:'Next full worship charge',closestTrap:'Next trap collection',closestFlag:'Next construction flag',closestBuilding:'Next building',closestSalt:'Next refinery rank-up',bonusTimeLeft:'Bonus ballot reset',meritocracyTimeLeft:'Meritocracy reset',coinFill:'Fountain coin bar',marbleFill:'Fountain marble bar',overstim:'Overstim level',royalNodeCap:'Royal outpost resource cap',observationInsight:'Observation insight levels',daily:'Account daily reset',weekly:'Account weekly reset',serverWeekly:'Server weekly reset',library:'Talent library',minibosses:'Miniboss spawns'};
const ACCOUNT_SOURCES={tasks:['TaskZZ0'],materialTracker:['ChestQuantity'],guild:['Guild'],shops:['ShopStock'],etc:['OptLacc|OptionsListAccount'],stamps:['StampLv','StampLvM'],owl:['OptLacc|OptionsListAccount'],forge:['ForgeItemOrder'],alchemy:['CauldronInfo','CauldronP2W'],islands:['OptLacc|OptionsListAccount'],postOffice:['PostOfficeInfo0'],arcade:['ArcadeUpg','ArcUnclaim'],weeklyBosses:['WeeklyBoss'],killRoy:['OptLacc|OptionsListAccount'],kangaroo:['OptLacc|OptionsListAccount'],printer:['Print'],library:['TimeAway'],construction:['Tower','CogM','Refinery'],hatRack:['OptLacc|OptionsListAccount'],equinox:['Dream'],atomCollider:['Atoms'],traps:['PldTraps_0'],breeding:['Breeding'],cooking:['Meals','Cooking'],laboratory:['Lab'],tome:['OptLacc|OptionsListAccount'],gaming:['Gaming'],sailing:['Sailing','Boats'],hole:['Holes'],sneaking:['Ninja'],beanstalk:['OptLacc|OptionsListAccount'],farming:['FarmPlot','FarmUpg'],summoning:['Summon'],royalGuardian:['RoyalG','RoyalMaps'],gallery:['OptLacc|OptionsListAccount'],spelunking:['Spelunk'],legendTalents:['OptLacc|OptionsListAccount'],zenithMarket:['OptLacc|OptionsListAccount'],minehead:['Research'],research:['Research'],sushiStation:['Sushi'],clamWork:['OptLacc|OptionsListAccount'],theButton:['OptLacc|OptionsListAccount']};
const CHARACTER_SOURCES={cards:['CardEquip_','CSetEq_'],anvil:['AnvilPA_','AnvilPAstats_'],worship:['Prayers_','PVStatList_'],traps:['PldTraps_'],quests:['QuestComplete_'],alchemy:['CauldronBubbles'],obols:['ObolEqO0_'],postOffice:['POu_'],starSigns:['PVtStarSign_'],crystalCountdown:['Lv0_','ExpReq0_','SL_'],tools:['EquipOrder_'],divinityStyle:['Divinity'],talents:['SL_','SM_','AtkCD_'],equipment:['EquipOrder_','EMm0_'],bags:['MaxCarryCap_'],classSpecific:['InventoryOrder_','EquipOrder_','BuffsActive_']};
const CHARACTER_FUNCTIONS={anvil:'anvilAlerts',worship:'worshipAlerts',traps:'trapsAlerts',quests:'questsAlerts',alchemy:'alchemyAlerts',obols:'obolsAlerts',postOffice:'postOfficeAlerts',starSigns:'starSignsAlerts',crystalCountdown:'crystalCountdownAlerts',tools:'toolsAlerts',talents:'talentsAlerts',cards:'cardsAlert',divinityStyle:'getDivinityAlert',equipment:'getEquipmentAlert',bags:'bagsAlerts',classSpecific:'classSpecificAlerts'};
function registry(config){const out=[];for(const section of ['account','characters','timers']){if(section==='characters'){for(const [key,value] of Object.entries(config.characters||{}))out.push({id:`characters/${key}`,section,group:'Characters',key,config:value});}else for(const [group,entries] of Object.entries(config[section]||{}))for(const [key,value] of Object.entries(entries))out.push({id:`${section}/${group}/${key}`,section,group,key,config:value});}return out;}
function settings(defaults,input){
 const out=clone(defaults);
 for(const entry of registry(out)){
  const source=entry.section==='characters'?input?.characters?.[entry.key]:input?.[entry.section]?.[entry.group]?.[entry.key];if(!source)continue;
  if(typeof source.checked==='boolean')entry.config.checked=source.checked;
  for(const option of entry.config.options||[]){const incoming=source.options?.find?.(x=>x.name===option.name);if(!incoming)continue;if(typeof incoming.checked==='boolean')option.checked=incoming.checked;
   if(option.props&&incoming.props){const old=option.props.value,v=incoming.props.value;
    if(old&&typeof old==='object'){for(const key of Object.keys(old))if(typeof v?.[key]==='boolean')old[key]=v[key];}
    else if(option.type==='input'&&Number.isFinite(Number(v))&&String(v).trim()!=='')option.props.value=Math.max(Number(option.props.minValue??0),Math.min(Number(option.props.maxValue??1e15),Number(v)));
    else if(typeof v===typeof old)option.props.value=v;
   }
  }
 }return out;
}
function meaningful(value){if(Array.isArray(value))return value.length>0;if(value&&typeof value==='object')return Object.values(value).some(meaningful);return typeof value==='number'?Number.isFinite(value)&&value!==0:!!value;}
function payload(value,depth=0,seen=new Set()){
 if(value==null||typeof value==='function')return null;
 if(typeof value==='number')return Number.isFinite(value)?value:null;
 if(typeof value!=='object')return value;
 if(value instanceof Date)return Number.isFinite(value.getTime())?value.toISOString():null;
 if(depth>7||seen.has(value))return '[Further detail available on the system page]';
 seen.add(value);const result=Array.isArray(value)?value.map(x=>payload(x,depth+1,seen)):Object.fromEntries(Object.entries(value).filter(([k,v])=>!['breakdown','sources','image','icon','rawData'].includes(k)&&typeof v!=='function').map(([k,v])=>[k,payload(v,depth+1,seen)]));seen.delete(value);return result;
}
function missing(data,keys){return keys.filter(key=>!key.split('|').some(k=>Object.hasOwn(data,k)&&(parse(data[k])!=null||(k.startsWith('PVtStarSign_')&&typeof data[k]==='string'))));}
function snapshotTime(raw,now=Date.now()){const time=parse((parse(raw.data)||raw).TimeAway),candidates=[raw.lastUpdated,time?.Player];for(const v of candidates){const n=Number(v);if(Number.isFinite(n)&&n>946684800000&&n<=now+300000)return {at:n,known:true};}return {at:now,known:false};}
function calculate(raw,config,M,materials={},observedAt=Date.now()){
 const data=parse(raw?.data)||raw||{},entries=registry(config),stamp=snapshotTime(raw,observedAt),rows=[],errors=[];
 const skeleton=entry=>({id:entry.id,section:entry.section,group:entry.group,key:entry.key,label:LABELS[entry.key]||pretty(entry.key),page:PAGES[entry.key]||null,enabled:entry.config.checked===true,status:'unknown',details:null});
 const missingCore=missing(data,['Lv0_0','CharacterClass_0','TimeAway','OptLacc|OptionsListAccount']);
 if(missingCore.length)return {rows:entries.map(e=>({...skeleton(e),status:e.config.checked?'unknown':'disabled',message:'Load a full account save to calculate this tracker.'})),stamp,characters:[],errors:[],coverage:{account:45,characters:16,timers:36}};
 const originalDate=root.Date||Date,OriginalDate=originalDate;
 // Freeze calculations at the save's timestamp. Countdown text can tick without re-parsing.
 root.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[stamp.at]));}static now(){return stamp.at;}};
 const targets=Object.fromEntries(Object.entries(materials).filter(([key])=>M.items[key]).map(([key,value])=>[key,{...value,item:{...M.items[key],rawName:key}}]));
 const originalStorage=root.localStorage;root.localStorage={getItem:key=>key==='material-tracker'?JSON.stringify(targets):null};
 try{
  const normalized=clone(data);if(!normalized.OptLacc)normalized.OptLacc=normalized.OptionsListAccount;
  const parsed=M.parseData(normalized,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament),account=parsed.account,characters=parsed.characters||[];
  if(!characters.length)throw new Error('The save could not be parsed. Load a full account export and retry.');
  const charOptions=Object.fromEntries(Object.entries(config.characters).map(([key,val])=>[key,{...val,...Object.fromEntries((val.options||[]).map(o=>[o.name,o]))}]));
  for(const entry of entries){
   const base=skeleton(entry);
   if(!base.enabled){rows.push({...base,status:'disabled',message:'Disabled in your tracker settings'});continue;}
   try{
    if(entry.section==='timers'){const timer=root.DashboardTimers.calculate(entry,account,characters,M,stamp.at,data);rows.push({...base,...timer});continue;}
    if(entry.section==='account'){
     const absent=missing(data,ACCOUNT_SOURCES[entry.key]||[]);
     if(absent.length){rows.push({...base,message:'Save is missing '+absent.join(', ')});continue;}
     if(entry.key==='materialTracker'&&!Object.keys(materials).length){rows.push({...base,status:'setup',message:'Add a material target in tracker settings.'});continue;}
     const fields={[entry.key]:entry.config},options=M.accountAlerts.getOptions(fields);
     const fn=entry.group==='General'?'getGeneralAlerts':`getWorld${entry.group.replace('World ','')}Alerts`;
     const result=M.accountAlerts[fn](account,fields,options,characters);
     const details=payload(result[entry.key]??result),active=meaningful(details);
     rows.push({...base,status:active?'ready':'clear',details:active?details:null,message:active?'Needs attention':'No alert with current settings'});
    }else{
     for(const character of characters){
      const row={...base,id:base.id+'/'+character.playerId,character:character.name,characterId:character.playerId};
      const absent=missing(data,(CHARACTER_SOURCES[entry.key]||[]).map(k=>k.endsWith('_')?k+character.playerId:k));
      if(absent.length){rows.push({...row,message:'Save is missing '+absent.join(', ')});continue;}
      try{const value=M.characterAlerts[CHARACTER_FUNCTIONS[entry.key]](account,characters,character,stamp.at,charOptions);
       const details=payload(value),active=meaningful(details);rows.push({...row,status:active?'ready':'clear',details:active?details:null,message:active?'Needs attention':'No alert in this save'});
      }catch(error){errors.push({id:row.id,error:String(error.message)});rows.push({...row,message:'Could not calculate this character’s tracker. Refresh the save and retry.'});}
     }
    }
   }catch(error){errors.push({id:base.id,error:String(error.message)});rows.push({...base,message:'Could not calculate this tracker. Refresh the save and retry.'});}
  }
  const itemNames=Object.fromEntries(Object.entries(M.items).map(([key,value])=>[key,pretty(value.displayName||value.Name||key)]));
  return {rows,stamp,characters:characters.map(c=>({id:c.playerId,name:c.name,classIndex:c.classIndex,activity:c.afkTarget})),errors,itemNames,coverage:{account:entries.filter(e=>e.section==='account').length,characters:entries.filter(e=>e.section==='characters').length,timers:entries.filter(e=>e.section==='timers').length}};
 }finally{root.Date=originalDate;root.localStorage=originalStorage;}
}
const api={registry,settings,calculate,meaningful,payload,snapshotTime,pretty,LABELS,PAGES};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DashboardModel=api;
})(typeof self!=='undefined'?self:globalThis);
