(function(root){
'use strict';
const read=v=>typeof v==='string'?JSON.parse(v):v;
const pretty=s=>String(s??'').replaceAll('_',' ').replace(/([a-z])([A-Z])/g,'$1 $2');
const metrics=[];
// A parsed scenario is immutable after primary-stat reconstruction. Several
// metrics need the same combat/HP/MP/mining context; compute it once per scenario.
const damageCache=new WeakMap();
function add(id,label,unit,goals,note='',extra={}){metrics.push({id,label,unit,goals,note,...extra});}
add('dropRate','Drop rate','×',['drop'],'Drop-rate multiplier with native shared and personal bonuses.');
add('damage','Maximum damage','',['damage'],'Saved equipment, map and talent preset. Reconstructs primary stats for both scenarios; live combat buffs and special combat modes are not simulated.');
add('allStats','All stats (STR + WIS + AGI + LUK)','',['stats'],'Target the sum of STR, WIS, AGI and LUK, with all four totals shown separately. A gain in one stat can reach the combined target; it is not a minimum target for every stat. Account Wide targets the average percentage improvement in that sum from shared upgrades.');
for(const [id,label] of [['strength','Strength (STR)'],['wisdom','Wisdom (WIS)'],['agility','Agility (AGI)'],['luck','Luck (LUK)']])add(id,label,'',['stats'],'Recalculated primary stat using the saved equipment, talents and bonuses. Choose a character for a stat-total target, or Account Wide for the average percentage improvement from shared upgrades.');
add('sample','Printer sample percentage','%',['samples'],'Capped at 90%. This is the sampling percentage, not the resource yield: reaching 90% does not max your sample size.',{cap:90});
add('sampleSize','New sample at measured AFK yield',' items',['samples'],'Measured resource yield × effective sample percentage, rounded down. Enter current resource output per hour from the game. The entered yield is fixed; efficiency, skill speed and multikill changes need a fresh measurement.',{measured:true});
add('printing','Active printer output','/hr',['samples','balanced'],'Sum of this character’s active saved prints after printer multipliers. Existing recorded sample sizes stay fixed; new samples and live printing buffs are not assumed.');
add('kitchens','Total kitchen cooking speed','/hr',['cooking','balanced'],'Sum of unlocked kitchens using the selected character’s cooking context. This is kitchen speed, not ladles per day.');
add('recipes','Total recipe research speed','/hr',['cooking'],'Sum of unlocked kitchen recipe research speeds. Recipe discovery is not assumed.');
add('cookingEff','Cooking efficiency','',['cooking','skill'],'Character cooking efficiency; AFK gains and active ladle effects are separate.');
add('afkKills','AFK kill credit at saved map','/hr',['afk'],'Saved monster target, damage, accuracy, survivability and multikill. This is kill credit, not item drops or a guaranteed live EXP rate.');
for(const [type,label] of [['FIGHTING','Fighting'],['MINING','Mining'],['CHOPPIN','Chopping'],['FISHING','Fishing'],['CATCHING','Catching'],['COOKING','Cooking'],['LABORATORY','Laboratory'],['DIVINITY','Divinity'],['SPELUNKING','Spelunking']])add('afk:'+type,label+' AFK gains','%',['afk',...(type==='FIGHTING'?[]:['skill']),...(type==='COOKING'?['cooking']:[])],'Activity-specific AFK percentage using the saved loadout; equipment, skill levels and resource yield remain separate.',type==='DIVINITY'?{cap:100}:{});
add('mining','Mining efficiency','',['skill','samples'],'Mining efficiency only, not ore/hour. Resource difficulty, skill speed, multi-ore, AFK gains and sample percentage also affect sample size.');
add('allEff','All-skill efficiency multiplier','×',['skill','samples'],'Shared efficiency multiplier only. Individual skill base efficiency, tools, talents, speed and resource difficulty are separate.');
add('prowess','All-skill prowess','%',['skill'],'Shared prowess component, capped at 10%. Skill-specific prowess is separate.',{cap:10});
add('labEff','Laboratory efficiency','',['skill'],'Saved character Laboratory efficiency. Connection layout and experience bonuses are separate.');
add('spelunkEff','Spelunking efficiency','',['skill'],'Saved character Spelunking efficiency; cave rewards and progression depend on additional systems.');
add('classExp','Class EXP multiplier','×',['exp'],'Class EXP bonus, not EXP per hour. Enemy EXP, kills, accuracy and survival are separate.');
for(const skill of ['mining','smithing','chopping','fishing','alchemy','catching','trapping','worship','construction','cooking','laboratory','breeding','sailing','gaming','farming','sneaking','summoning','spelunking'])add('exp:'+skill,pretty(skill)+(skill==='gaming'?' EXP bonus':' EXP multiplier'),skill==='gaming'?'%':'×',['exp'],'Native activity EXP bonus using the selected character. It is not the amount of skill EXP earned per hour.');
add('divinityPoints','Divinity points at saved style','/hr',['balanced','skill'],'Points gain for the saved meditation style, not Divinity EXP. Style and deity links stay fixed.');
add('research','Research EXP rate','/hr',['balanced','exp'],'Account Research EXP rate with saved grid and observation assignments.');
add('construction','Character Construction base build rate','/hr',['balanced'],'Character build speed before the extra account and cog-board multipliers. The export stores those multipliers inside saved cog values, so this target uses the recalculable character component rather than treating the board snapshot as live.');
add('bits','Gaming bit multiplier','×',['balanced'],'Account bit multiplier; plant generation and collection frequency are separate.');
add('power','Spelunking power','',['balanced'],'Account Spelunking power with the saved progression.');
add('accountLevels','Total account class levels',' levels',['balanced'],'Combined class levels across the roster. New talent points must be allocated separately.',{integer:true});
for(const [id,label] of [['stamps','Collected stamps'],['vials','Unlocked vials'],['meals','Discovered meals'],['cards','Owned cards']])add('unlock:'+id,label,'',['unlock'],'Collection target. Conditional acquisition steps are counted only after their stated requirements are completed; the planner does not grant free unlocks.',{integer:true});
function sources(b,stage='Inputs'){
 const rows=[];if(!b)return rows;
 if(Array.isArray(b)){for(const s of b){if(s.title)stage=s.title;else if(s.name&&Number.isFinite(s.value))rows.push({name:pretty(s.name),value:s.value,stage,detail:s.formatted||''});}return rows;}
 for(const cat of b.categories||[]){rows.push(...sources(cat.sources,cat.name));for(const sub of cat.subSections||[])rows.push(...sources(sub.sources,cat.name+' · '+sub.name));}return rows;
}
function primary(p,M,details=true){
 damageCache.delete(p);
 const all=p.characters.map(c=>root.ConnectedPrimaryStats.calculate(c,p.account,p.characters,M,details));
 all.forEach((stats,i)=>stats.forEach((r,j)=>{if(r.unknown.length||!Number.isFinite(r.computed))throw Error('Primary-stat reconstruction is incomplete for '+p.characters[i].name);p.characters[i].stats[['strength','agility','wisdom','luck'][j]]=r.computed;}));return all;
}
function evaluate(p,id,metric,save,M=root.PrayerMath,settings={},audit=false){
 const def=metrics.find(m=>m.id===metric);if(!def)throw Error('Choose a supported target metric.');
 const cs=p.characters,ch=cs.find(c=>String(c.playerId)===String(id));if(!ch)throw Error('Choose an imported character.');
 const a=M.getCharacterStatAccount(p.account,ch);
 if(!settings.accountWide&&!metric.startsWith('unlock:')&&[39,40,70,71,118,119].includes(Number(ch.mapIndex)))throw Error('Choose a character saved outside a dungeon.');
 if(metric==='dropRate'&&Number(ch.mapIndex)===216&&Number(read(save.Holes)?.[0]?.[ch.playerId])===17)throw Error('Use a character saved outside Crystal Glunko Cove for normal drop-rate planning.');
 if(metric==='afkKills'&&ch.afkType!=='FIGHTING')throw Error('For kill credit, choose a character saved while fighting. Otherwise select the appropriate activity AFK percentage.');
 let value,rows=[],traceName,traceField='result',result,cap=def.cap,primaryStats;
 const damage=()=>{if(audit)return M.getMaxDamage(ch,cs,a);let entry=damageCache.get(p);if(!entry||entry.engine!==M){entry={engine:M,characters:new Map()};damageCache.set(p,entry);}const key=String(id);if(!entry.characters.has(key))entry.characters.set(key,M.getMaxDamage(ch,cs,a));return entry.characters.get(key);};
 if(metric==='dropRate'){result=M.getDropRate(ch,a,cs);value=result.dropRate;rows=sources(result.breakdown);}
 else if(metric==='damage'){result=damage();value=result.maxDamage;rows=root.CombatStatModel.damageRows(result);}
 else if(metric==='allStats'){
  primaryStats=['strength','wisdom','agility','luck'].map((id,i)=>({id,label:['STR','WIS','AGI','LUK'][i],value:ch.stats[id]}));
  value=primaryStats.reduce((sum,s)=>sum+s.value,0);
  if(audit)for(const stat of root.ConnectedPrimaryStats.calculate(ch,a,cs,M))rows.push(...stat.rows.map(r=>({...r,stage:stat.stat+' · '+r.stage})));
 }
 else if(['strength','wisdom','agility','luck'].includes(metric)){
  value=ch.stats[metric];
  if(audit){const index=['strength','agility','wisdom','luck'].indexOf(metric),stat=root.ConnectedPrimaryStats.calculate(ch,a,cs,M)[index];rows=stat.rows;}
 }
 else if(metric==='classExp'){result=M.getClassExpMulti(ch,a,cs);value=result.value;rows=root.CombatStatModel.expRows(result);}
 else if(metric.startsWith('afk:')){result=M.getAfkGain({...ch,afkType:metric.slice(4)},cs,a);value=result.afkGains===null?NaN:100*result.afkGains;rows=sources(result.breakdown);traceName='getAfkGain';traceField='result.afkGains';}
 else if(metric.startsWith('exp:')||metric==='divinityPoints'){result=M.getSkillExpMulti(metric==='divinityPoints'?'divinity':metric.slice(4),ch,cs,a,damage());value=metric==='exp:sneaking'?result.multiplier:result.value;rows=sources(result.breakdown);traceName='getSkillExpMulti';traceField=metric==='exp:sneaking'?'result.multiplier':'result.value';}
 else if(metric.startsWith('unlock:')){
  const type=metric.slice(7),items=type==='stamps'?Object.values(a.stamps||{}).flat():type==='vials'?a.alchemy.vials:type==='meals'?a.cooking.meals:Object.values(a.cards||{});
  value=items.filter(s=>Number(s[type==='cards'?'amount':'level'])>0).length;
  cap=items.length;
  rows=items.map(s=>({name:pretty(s.displayName||s.name||s.rawName),value:Number(s[type==='cards'?'amount':'level'])>0?1:0,stage:'Collection',detail:Number(s[type==='cards'?'amount':'level'])>0?'Owned / unlocked':'Not unlocked in the saved export'}));
 }else switch(metric){
 case 'sample':case 'sampleSize':{const rate=Math.min(90,M.getPrinterSampleRate(ch,a,a.charactersLevels));value=rate;traceName='getPrinterSampleRate';if(metric==='sampleSize'){const yieldPerHour=Number(settings.yieldPerHour);if(!(yieldPerHour>0&&Number.isFinite(yieldPerHour)))throw Error('Enter measured resource yield per hour from the game.');value=Math.floor(yieldPerHour*rate/100);rows.push({name:'Measured resource yield',value:yieldPerHour,stage:'Measured input'},{name:'Effective sampling percentage',value:rate,stage:'Sampling'});}break;}
 case 'printing':{const index=cs.indexOf(ch),prints=(settings.accountWide?(a.printer||[]).flat():(a.printer?.[index]||[])).filter(s=>s.active&&s.item!=='Blank');value=prints.reduce((n,s)=>n+Number(s.boostedValue||0),0);rows=prints.flatMap(s=>[{name:pretty(s.item),value:s.value,stage:'Recorded sample (fixed)'},...sources(s.breakdown,'Printer multipliers')]);break;}
 case 'afkKills':{result=damage();value=result.finalKillsPerHour;rows=[{name:'Kills/hour before AFK',value:result.killsPerHour,stage:'Saved target'},{name:'AFK fraction',value:result.afkGains,stage:'Saved target'},{name:'Survivability (%)',value:result.survivability,stage:'Saved target'},{name:'Kill credit per kill',value:result.killPerkill.value,stage:'Saved target'},...root.CombatStatModel.damageRows(result),...sources(result.killPerkill.breakdown,'Kill credit')];break;}
 case 'mining':value=damage().miningEff;traceName='getMiningEff';break;
 case 'allEff':value=M.getAllEff(ch,cs,a);traceName='getAllEff';break;
 case 'prowess':value=M.allProwess(ch,a)*100;rows=[{name:'PROWESESSARY, star signs and meals',value,stage:'Capped shared prowess',detail:'min(10%, bubble-derived prowess + signs + meals). Individual skill prowess remains separate.'}];break;
 case 'cookingEff':result=M.getCookingEff(ch,cs,a,damage());value=typeof result==='number'?result:result.value;rows=sources(result.breakdown);traceName='getCookingEff';break;
 case 'labEff':result=M.getLabEfficiency(ch,cs,a,damage());value=typeof result==='number'?result:result.value;rows=sources(result.breakdown);traceName='getLabEfficiency';break;
 case 'spelunkEff':result=M.getSpelunkingEfficiency(ch,cs,a);value=typeof result==='number'?result:result.value;rows=sources(result.breakdown);traceName='getSpelunkingEfficiency';break;
 case 'kitchens':case 'recipes':{const kitchens=M.parseKitchens(read(save.Cooking),read(save.Atoms),cs,a,settings.accountWide?undefined:{characterIndex:cs.indexOf(ch)}).filter(Boolean),key=metric==='kitchens'?'mealSpeed':'fireSpeed';const marsh=M.getMealsBonusByEffectOrStat(a,null,'zMealFarm'),farm=ch.skillsInfo?.farming?.level||0,highest=Math.max(...cs.map(c=>c.skillsInfo?.farming?.level||0));const ratio=metric==='kitchens'&&!settings.accountWide?(1+marsh*Math.ceil((farm+1)/50)/100)/(1+marsh*Math.ceil((highest+1)/50)/100):1;value=kitchens.reduce((sum,k)=>sum+k[key],0)*ratio;rows=kitchens.flatMap((k,i)=>[{name:'Kitchen '+(i+1)+' speed',value:k[key]*ratio,stage:'Kitchen totals'},...sources(k[key+'Breakdown'],'Kitchen '+(i+1)).map(r=>!settings.accountWide&&r.name==='Marshmallow (Meal)'?{...r,value:1+marsh*Math.ceil((farm+1)/50)/100}:r)]);break;}
 case 'research':value=a.research.researchEXPrateTOT;rows=[...sources(a.research.researchEXPmultiBreakdown),...(a.research.observations||[]).filter(o=>o.unlocked).map(o=>({name:pretty(o.name),value:o.researchEXPrate,stage:'Observation EXP / hr',detail:'Saved insight and lens placements. Observation rates already include the account multiplier.'}))];traceName='getResearchEXPmulti';traceField='result.value';break;
 case 'construction':value=M.getPlayerConstructionSpeed(ch,a);traceName='getPlayerConstructionSpeed';rows=[{name:'Saved account board rate (fixed reference)',value:a.construction.totalBuildRate,stage:'Saved snapshot',detail:'Not the target metric: saved character-cog values contain additional account multipliers.'}];break;
 case 'bits':result=M.getBitsMulti(a,cs);value=result.value;rows=sources(result.breakdown);break;
 case 'power':value=a.spelunking.power.value;rows=sources(a.spelunking.power.breakdown);break;
 case 'accountLevels':value=cs.reduce((sum,c)=>sum+c.level,0);rows=cs.map(c=>({name:c.name,value:c.level,stage:'Class levels'}));break;
 }
 if(!Number.isFinite(value)||value<0)throw Error(def.label+' is unavailable for this saved character or activity.');
 if(audit&&traceName){const t=root.ConnectedTrace?.get?.(traceName,traceField);if(t){const seen=new Set();rows.push(...t.rows.filter(r=>{const key=JSON.stringify([r.name,r.value]);if(r.name==='Condition'||seen.has(key))return false;seen.add(key);return true;}).map(r=>({name:r.name,value:r.value,stage:'Formula dependencies',detail:r.formula})));}}
 if(audit&&metric.startsWith('exp:'))for(const [fn,field,stage,skills] of [['getAllSkillsExp','result.value','Shared additive skill EXP',['mining','smithing','chopping','fishing','alchemy','catching','trapping','worship','cooking','spelunking']],['getAllSkillExpMultiplier','result','Shared skill EXP multiplier',['mining','chopping','fishing','catching','trapping','worship','cooking','laboratory','breeding','farming','sneaking','summoning','spelunking']]]){if(!skills.includes(metric.slice(4)))continue;const t=root.ConnectedTrace?.get?.(fn,field),seen=new Set();if(t)rows.push(...t.rows.filter(r=>{const key=JSON.stringify([r.name,r.value]);if(r.name==='Condition'||seen.has(key))return false;seen.add(key);return true;}).map(r=>({name:r.name,value:r.value,stage,detail:r.formula})));}
 if(audit&&['damage','mining','classExp','afkKills','cookingEff','labEff'].includes(metric))for(const stat of root.ConnectedPrimaryStats.calculate(ch,a,cs,M))rows.push(...stat.rows.map(r=>({...r,stage:stat.stat+' · '+r.stage})));
 if(audit&&!rows.length)rows=[{name:def.label,value,stage:'Total',detail:'The native engine returns this total without a source breakdown; see the system coverage below.'}];
 return {...def,...(settings.accountWide&&['kitchens','recipes'].includes(metric)?{note:'Account kitchen total using the native account context and saved applicable providers. Shared upgrades only; personal equipment and food remain fixed.'}:settings.accountWide&&metric==='printing'?{note:'Total items per hour across all active saved prints, with different resources combined. Recorded samples and personal loadouts remain fixed.'}:{}),cap,value,...(primaryStats?{primaryStats}:{}),rows:audit?rows:[]};
}
root.ReviewTargetMetrics={metrics,evaluate,primary,sources,pretty};
})(typeof self!=='undefined'?self:globalThis);
