(function(root){
'use strict';
const pretty=v=>String(v??'').replaceAll('_',' ');
function analyze(parsed,actions){
 const M=root.PrayerMath,a=parsed.account,rates={};
 for(const slots of a.printer||[])for(const s of slots||[])if(s.active&&s.item!=='Blank'&&Number.isFinite(s.boostedValue)&&s.boostedValue>0)rates[s.item]=(rates[s.item]||0)+s.boostedValue;
 for(const action of actions){
  const shortages=(action.costs||[]).filter(c=>c.kind==='item').map(c=>{const stock=(a.storage?.list||[]).filter(s=>s.rawName===c.id).reduce((sum,s)=>sum+(s.amount||0),0);return {...c,shortfall:Math.max(0,c.amount-stock),rate:rates[c.id]};}).filter(c=>c.shortfall>0);
  if(!shortages.length)continue;
  const all=(action.costs||[]).every(c=>c.kind==='item');
  action.eta=all&&shortages.every(c=>c.rate>0)?{hours:Math.max(...shortages.map(c=>c.shortfall/c.rate)),detail:'At saved gross printer output, assuming no spending. Storage caps and atom conversion can prevent accumulation; this is a production estimate, not a purchase-ready countdown.'}:{hours:null,detail:'No complete, verified production rate for every missing resource.'};
 }
 return parsed.characters.map(c=>{
  if(!/fighting/i.test(c.afkType||''))return {id:c.playerId,name:c.name,target:pretty(c.afkTarget||c.currentMap),note:'Saved activity is not combat; combat bottlenecks are not inferred.',issues:[]};
  try{
   const d=M.getMaxDamage(c,parsed.characters,a),count=M.mapDetails[c.mapIndex]?.[1]?.[0],spawnCap=count>0?Math.floor(3600*count/(d.respawnRate+.1)):null,issues=[];
   if(Number.isFinite(d.hitChance)&&d.hitChance<99.99)issues.push({title:'Accuracy is limiting hits',detail:`${d.hitChance.toFixed(1)}% hit chance at the saved target.`,match:'accuracy|total agi|total wis|total str'});
   if(Number.isFinite(d.survivability)&&d.survivability<99.99)issues.push({title:'Survival is reducing AFK output',detail:`${d.survivability.toFixed(1)}% modeled survival. Check food supply and defence before damage-only spending.`,match:'defen|health| hp|food'});
   if(spawnCap&&d.killsPerHour>=spawnCap*.99)issues.push({title:'Base kills are near the map spawn limit',detail:`${Math.round(d.killsPerHour).toLocaleString('en-US')} base kills/hr versus about ${spawnCap.toLocaleString('en-US')} from respawns. More damage can still help multikill tiers; compare AFK gain and respawn upgrades.`,match:'afk|respawn|multikill'});
   if(!issues.length)issues.push({title:'No accuracy or survival shortfall detected',detail:'Compare actual AFK gains from upgrades; this does not prove damage is your only bottleneck.',match:'damage|afk|multikill'});
   return {id:c.playerId,name:c.name,target:pretty(c.afkTarget||c.currentMap),damage:d.maxDamage,kills:d.finalKillsPerHour,accuracy:d.hitChance,survival:d.survivability,issues:issues.map(x=>({...x,actions:actions.filter(a=>a.ready&&new RegExp(x.match,'i').test(a.effect||'')).slice(0,3).map(a=>({name:a.name,page:a.page}))}))};
  }catch(error){return {id:c.playerId,name:c.name,issues:[],note:'Combat calculation unavailable: '+error.message};}
 });
}
root.ReviewDiagnostics={analyze};
})(globalThis);
