(function(root){
'use strict';
const clean=v=>String(v??'').replaceAll('_',' ').replace(/[{}]/g,'');
const fmt=v=>{const n=Number(v);if(!Number.isFinite(n))return 'Unavailable';const units=['','K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc'];const tier=Math.max(0,Math.floor(Math.log10(Math.abs(n)||1)/3));if(tier>=units.length)return n.toExponential(2);if(tier===0)return n!==0&&Math.abs(n)<.01?n.toExponential(2):n.toLocaleString('en-US',{maximumFractionDigits:2});let scaled=n/1000**tier;const bumped=Math.abs(Number(scaled.toFixed(2)))>=1000&&tier+1<units.length;return Number((bumped?scaled/1000:scaled).toFixed(2))+units[tier+Number(bumped)];};
const valid=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v;}catch{return null;}};
const unitFor=description=>/\{\s*%/.test(description)?'%':/\{\s*x\b/i.test(description)?'×':'';
function gain(before,after,unit,scope){if(!valid(before)||!valid(after))return null;return {before,after,delta:after-before,unit,scope};}
function gainText(g){return g?`${g.delta>=0?'+':''}${fmt(g.delta)}${g.unit==='%'?' percentage points':g.unit==='×'?'×':''} · ${g.scope}`:'Gain not calculated';}
function stampActions(report){
 return report.rows.flatMap(s=>{
  if(!s.known||!(s.level>0)||!['Upgradeable now','Clear inventory','Need materials','Need coins'].includes(s.status))return [];
  const coin=s.coin,cost=coin?s.goldCost:s.materialCost;
  if(!valid(cost)||!(cost>0)||!Number.isFinite(s.nextLevel)||s.nextLevel<=s.level)return [];
  if(!coin&&(!s.best||!valid(s.owned)||!valid(s.best.carried)))return [];
  const stock=coin?report.money:s.owned+s.best.carried;if(!valid(stock))return [];
  const shortfall=Math.max(0,cost-stock),ready=s.status==='Upgradeable now';
  let title=coin?`Upgrade ${s.name} from ${fmt(s.level)} to ${fmt(s.nextLevel)}`:`Raise ${s.name}'s level cap from ${fmt(s.maxLevel)} to ${fmt(s.nextLevel)}`;
  if(s.status==='Clear inventory')title=`Clear ${fmt(s.slotsToClear)} inventory slots on ${s.best.name} for ${s.name}`;
  if(shortfall>0)title=coin?`Save the missing coins for ${s.name}`:`Collect ${fmt(shortfall)} more ${s.item} for ${s.name}`;
  const facts=coin?[{label:'Next level costs',coin:cost},{label:'Account coins',coin:report.money}]:[{label:'Material payment',text:`${fmt(cost)} ${s.item}`},{label:'Available',text:`${fmt(s.owned)} in storage + ${fmt(s.best.carried)} on ${s.best.name}`},{label:'Carry capacity',text:`${fmt(s.best.capacity)} on ${s.best.name} (${fmt(s.best.freeSlots)} free slots)`}];
  if(shortfall)facts.push(coin?{label:'Shortfall',coin:shortfall}:{label:'Shortfall',text:`${fmt(shortfall)} ${s.item}`});
  const projection=s.projections?.find(p=>p.name===s.best?.name)||s.projections?.[0];
  const projected=projection?gain(projection.before,projection.after,unitFor(s.description),s.category==='skills'?'stamp bonus on '+projection.name:'stamp bonus'):null;
  const upgradeGain=coin?projected:{before:projection?.before??null,after:projection?.before??null,delta:0,unit:unitFor(s.description),scope:'cap increase only'};
  return [{costs:coin?[{kind:'coins',amount:cost}]:[{kind:'item',id:s.itemId,amount:cost}],preview:{kind:'stamp',id:s.id,category:s.category,from:s.level,to:coin?s.nextLevel:s.level,future:s.projectedLevel,cap:!coin,capTo:s.nextLevel},upgradeGain,futureGain:coin?null:projected,futureLevel:s.projectedLevel,id:'stamp-action|'+s.id,sectionId:'stamps',page:'stamps',system:'Stamps',name:title,sourceName:s.name,icon:`assets/${s.id}.png`,current:coin?s.level:s.maxLevel,target:s.nextLevel,changeLabel:coin?'one coin purchase':'unlocked level cap',state:ready?'Ready to buy':'Prepare first',ready,score:(ready?100:35)+(s.priority||0),effect:clean(s.description),reason:coin?`Your saved level is ${fmt(s.level)} and the unlocked cap is ${fmt(s.maxLevel)}. ${ready?'Your saved coins cover this purchase.':'The next purchase needs more coins.'}`:`${s.name} is at its saved level cap. ${ready?'The payment fits on '+s.best.name+'.':s.reason}`,facts,blocker:coin?'Price is for one level. Recalculate after buying.':`Pay with ${s.best.name} in the saved W1 setup. Raising the cap does not buy the new levels.`,benefit:coin?gainText(projected):`Unlocks ${fmt(s.nextLevel-s.maxLevel)} more coin levels; the cap increase alone adds no stamp effect.`}];
 });
}
function bubbleActions(report,stock){
 return report.rows.flatMap(s=>{
  const plan=s.spending;
  // Keep only one-click, priced and fully funded material purchases. Atom and
  // shared-cap decisions remain on their dedicated optimizer until verified.
  if(!['Underleveled','No finite cap'].includes(s.state)||!(s.gain>0)||!plan||plan.method==='Atoms'||plan.clicks!==1||!(plan.target>s.level))return [];
  const costs=Object.entries(plan.totals||{});if(!costs.length)return [];
  if(costs.some(([id,cost])=>!valid(cost)||(!/^Liquid[1-4]$/.test(id)&&(!valid(stock[id])||stock[id]<cost))))return [];
  const name=clean(s.name),effect=clean(s.description),facts=costs.map(([id,cost])=>({label:'One-click cost',text:`${fmt(cost)} ${clean(s.itemReq?.find(r=>r.rawName===id)?.name||id)}${/^Liquid/.test(id)?' (covered by saved liquid balance)':` / ${fmt(stock[id])} in storage`}`}));
  facts.push({label:'Level gain',text:`At least ${fmt(plan.gain)} from the decoded Larry bonus`});
  if(valid(s.effective))facts.push({label:'Current bubble effect',text:fmt(s.effective)});
  const upgradeGain=gain(s.previewBefore??s.effective,s.projectedEffect,unitFor(s.description),'bubble bonus · minimum after one click');
  return [{costs:costs.map(([id,amount])=>({kind:/^Liquid/.test(id)?'liquid':'item',id,amount})),preview:{kind:'bubble',id:s.id,from:s.level,to:plan.target},upgradeGain,id:'bubble-action|'+s.id,sectionId:'alchemy',page:'alchemy',system:'Alchemy bubbles',name:`Buy one level-up of ${name}`,sourceName:name,icon:s.icon,current:s.level,target:plan.target,changeLabel:'minimum level after one click',state:'Ready to buy',ready:true,score:90+(s.priority||0),effect,reason:`The saved materials and liquids cover one click. ${name} has a positive next-level effect and is below its verified spending stop.`,facts,benefit:upgradeGain?gainText(upgradeGain):'Full-click effect change is unavailable.',blocker:'Price uses the non-matching-class discount. Use the saved setup; this is one purchase, not a combined shopping list.'}];
 });
}
function mealActions(data,raw,account,M,C){
 const decoded=C.decode(data,raw);if(!decoded.capKnown||!decoded.discountKnown||!decoded.companionKnown)return [];
 return (account.cooking?.meals||[]).flatMap(meal=>{
  const level=decoded.levels[meal.index],stock=decoded.stock[meal.index];
  if(!Number.isInteger(level)||level<1||level>=decoded.cap||!valid(stock))return [];
  const cost=Math.ceil(C.cost(level,decoded.discount,decoded.companion));if(!valid(cost)||cost<=0||stock<cost)return [];
  const next={...account,cooking:{...account.cooking,meals:account.cooking.meals.map(m=>m.index===meal.index?{...m,level:level+1}:m)}};
  const before=M.getMealsBonusByEffectOrStat(account,null,meal.stat),after=M.getMealsBonusByEffectOrStat(next,null,meal.stat);
  if(!valid(before)||!valid(after)||after<=before)return [];
  const name=clean(meal.name),effect=clean(meal.effect);
  return [{costs:[{kind:'meal',id:meal.index,amount:cost}],preview:{kind:'meal',id:meal.index,from:level,to:level+1},upgradeGain:gain(before,after,unitFor(meal.effect),'combined meal bonus'),id:'meal-action|'+meal.index,sectionId:'cooking',page:'cooking',system:'Cooking meals',name:`Level ${name} from ${level} to ${level+1} using saved meals`,sourceName:name,icon:`assets/${meal.rawName}.png`,current:level,target:level+1,changeLabel:'one meal upgrade',state:'Ready to buy',ready:true,score:105,effect,reason:`You have ${fmt(stock)} ${name}; the next level requires ${fmt(cost)}. No extra cooking or ladles are needed for this level.`,facts:[{label:'Consume',text:`${fmt(cost)} ${name}`},{label:'Saved stock',text:fmt(stock)},{label:'Combined meal effect',text:`${fmt(before)} → ${fmt(after)}`}],benefit:`${effect}: +${fmt(after-before)} in the combined meal bonus pool.`,blocker:'Uses the saved meal discounts and cap. The bonus-pool change is not the final character stat.'}];
 });
}
function refineryActions(report){
 const actions=[];
 for(const [i,s] of report.rows.entries()){
  const downstream=report.rows[i+1];
  if(!s.unlocked||!s.active||!s.isDeficit||!downstream?.unlocked||!downstream.active||!Number.isFinite(s.balancePerHour)||s.balancePerHour>=0)continue;
  actions.push({id:'refinery-drain|'+i,sectionId:'refinery',page:'refinery',system:'Refinery',name:`Pause ${downstream.name} to stop draining ${s.name}`,sourceName:s.name,icon:s.icon,state:'Do now',ready:true,score:135,effect:'Refinery salt production',reason:`${s.name} produces ${fmt(s.outputPerHour)}/hr while the next salt consumes ${fmt(s.consumedPerHour)}/hr. The current chain loses ${fmt(-s.balancePerHour)}/hr.`,facts:[{label:'Production / use',text:`${fmt(s.outputPerHour)} / ${fmt(s.consumedPerHour)} per hour`},{label:'Refinery stock',text:fmt(s.stored)}],benefit:`Removes ${downstream.name}'s demand while you rebuild ${s.name} reserves.`,blocker:'Pausing also stops downstream production. Other salt spending and active extra cycles are outside this forecast.'});
 }
 const target=report.plan?.[0],s=report.rows.find(r=>r.index===target?.index);
 if(s&&s.unlocked&&s.auto>0&&target.to>s.rank)actions.push({id:'refinery-auto|'+s.index,sectionId:'refinery',page:'refinery',system:'Refinery',name:`Turn off ${s.name} auto-refine while building toward rank ${fmt(target.to)}`,sourceName:s.name,icon:s.icon,state:'Do now',ready:true,score:125,effect:'Refinery salt production',reason:`Your rank is ${fmt(s.rank)}; the current unlocked chain needs support rank ${fmt(target.to)}. Auto-refine is set to ${fmt(s.auto*100)}%, which can empty the power bar before a rank-up.`,facts:[{label:'Current power',text:`${fmt(s.refined)} / ${fmt(s.capacity)}`},{label:'Support target',text:`Rank ${fmt(s.rank)} → ${fmt(target.to)}`}],benefit:'Lets the power bar fill for rank-ups instead of refining early.',blocker:'Support target assumes all unlocked salts run continuously. Recheck upstream supply before each rank-up.'});
 for(const action of actions){const row=report.rows.find(r=>action.id==='refinery-auto|'+r.index);if(!row||!row.active||!(row.power>0)||!(row.cycleSeconds>0))continue;const cycles=Math.ceil(Math.max(0,row.capacity-row.refined)/row.power);if(row.inputs?.every(input=>Number.isFinite(input.stock)&&input.stock>=input.quantity*cycles))action.eta={hours:cycles*row.cycleSeconds/3600,detail:'Time to fill the next rank bar after disabling auto-refine, assuming the saved cycle rate and no other input spending. Current cycle progress and active extra cycles are excluded.'};}
 return actions;
}
function build(raw,parsed){
 const data=parse(raw.data)||raw,{account}=parsed,actions=[],coverage=[];
 const run=(system,fn)=>{try{const found=fn();actions.push(...found);coverage.push({system,status:'calculated',actions:found.length});}catch(error){coverage.push({system,status:'unavailable',reason:error.message});}};
 run('Stamps',()=>stampActions(root.StampOptimizer.model(root.StampCalculatorData.build(raw,parsed))));
 run('Alchemy',()=>{
  const items=parse(data.ChestOrder),amounts=parse(data.ChestQuantity);if(!Array.isArray(items)||!Array.isArray(amounts))throw Error('Storage balances missing.');
  const stock={};items.forEach((id,i)=>{if(valid(amounts[i]))stock[id]=(stock[id]||0)+amounts[i];});
  const context=root.BubbleOptimizerContext.build(parsed);
  const report=root.BubbleOptimizer.model(raw,root.ALCHEMY_CATALOG,context,{clicks:1,matching:false});
  for(const row of report.rows){
   const bubble=root.ALCHEMY_CATALOG['OGPY'.indexOf(row.id[0])]?.bubbles[Number(row.id.slice(1))];
   if(bubble&&valid(row.multi)&&row.spending?.target>row.level){
    const ceiling=row.cap?row.cap.limit-(row.shared||0):Infinity;
    row.previewBefore=Math.min(ceiling,row.effective);
    row.projectedEffect=Math.min(ceiling,root.BubbleOptimizer.value(bubble,row.spending.target)*row.multi);
   }
  }
  return bubbleActions(report,stock);
 });
 run('Cooking',()=>mealActions(data,raw,account,root.PrayerMath,root.Cooking));
 run('Refinery',()=>data.Refinery?refineryActions(root.RefineryPlannerModel.build(account,parsed.characters)):[]);
 run('Summoning',()=>root.AccountReviewExtraActions.summoning(raw));
 run('Fountain',()=>root.AccountReviewExtraActions.fountain(raw));
 run('Alchemy coin upgrades',()=>root.AccountReviewExtraActions.cauldrons(raw,account));
 run('Vials, Salt Lick, Atoms, Arcade and Vault',()=>root.ReviewPermanent.build(raw,parsed));
 if(!raw.__planning)run('Connected optimizers',()=>root.ReviewConnections.build(raw,parsed));
 return {actions,coverage};
}
const api={formatNumber:fmt,gainText,build,stampActions,bubbleActions,mealActions,refineryActions};if(typeof module!=='undefined')module.exports=api;else root.AccountReviewActions=api;
})(globalThis);
