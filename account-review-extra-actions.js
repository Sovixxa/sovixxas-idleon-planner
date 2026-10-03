(function(root){
'use strict';
const read=v=>typeof v==='string'?JSON.parse(v):v;
const valid=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const clean=v=>String(v??'').replaceAll('_',' ');
const fmt=v=>root.AccountReviewActions.formatNumber(v);
function summoning(raw,M=root.SummoningOptimizer){
 const s=M.snapshot(raw);if(!s.available)return [];
 return s.upgrades.flatMap(u=>{
  const from=s.levels[u.id],price=M.cost(s,u),wallet=s.balances[u.color];
  if(!M.unlocked(s,u)||from>=u.max||!valid(price)||price<=0||!valid(wallet)||wallet<price)return [];
  const next={...s,levels:[...s.levels]};next.levels[u.id]++;
  const before=M.bonus(s,u.id),after=M.bonus(next,u.id);
  if(!valid(before)||!valid(after)||after<=before)return [];
  const effect=u.id===79?'Player damage':`Summoning: ${clean(u.template)}`;
  return [{costs:[{kind:'essence',id:u.color,amount:price}],id:'summoning-action|'+u.id,sectionId:'summoning',page:'summoning',system:'Summoning',sourceName:u.name,name:`Buy ${u.name} level ${fmt(from+1)}`,current:from,target:from+1,changeLabel:'one essence purchase',state:'Ready to buy',ready:true,score:94,unlock:from===0,icon:`assets/SumUpgIc${u.id}.png`,effect,reason:`The saved ${M.colors[u.color]} essence balance covers this level and its prerequisite is unlocked.`,facts:[{label:'Cost',text:`${fmt(price)} ${M.colors[u.color]} essence`},{label:'Available',text:fmt(wallet)},{label:'Before',text:M.effect(s,u)},{label:'After',text:M.effect(next,u)}],benefit:M.effect(next,u),upgradeGain:{before,after,delta:after-before,unit:/\{%/.test(u.template)?'%':'',scope:'Summoning upgrade bonus'},preview:u.id===79?{kind:'summoning',id:u.id,from,to:from+1}:undefined,blocker:'One purchase at the saved discount. Essence is shared with other upgrades; Summoning unit bonuses do not increase character damage.'}];
 });
}
function fountain(raw,M=root.FountainOptimizer){
 const s=M.decode(raw);if(!s)return [];
 // Decode defaults are useful for the page, but recommendations require actual
 // saved balances and level entries, rather than treating absent data as zero.
 const data=read(raw.data)||raw,h=read(data.Holes);
 return M.candidates(s,{goal:'outside',marble:false}).flatMap(u=>{
  if(!valid(h?.[31]?.[u.water]?.[u.index])||!valid(h?.[32]?.[u.water]?.[u.index])||!valid(h?.[9]?.[30+u.currency])||!u.affordable)return [];
  const before=M.bonus(s,u.water,u.index),next=structuredClone(s);next.levels[u.water][u.index]++;
  const after=M.bonus(next,u.water,u.index);if(!(after>before))return [];
  const outside=M.outsideGoals.find(g=>g.water===u.water&&g.index===u.index);
  const effect=outside?.id==='damage'?'Character damage':outside?.id==='classExp'?'Class EXP':clean(u.description);
  return [{costs:[{kind:'fountain',id:u.currency,amount:u.cost}],id:`fountain-action|${u.water}|${u.index}`,sectionId:'fountain',page:'holeFountain',system:'Fountain',sourceName:u.name,name:`Buy ${u.name} level ${fmt(u.from+1)}`,current:u.from,target:u.from+1,changeLabel:'one Fountain purchase',state:'Ready to buy',ready:true,score:93,goals:outside?.id==='damage'?['damage']:outside?.id==='classExp'?['exp']:[],effect,reason:`${M.waters[u.water]} water and this upgrade's prerequisite are unlocked; your saved ${M.currencies[u.currency]} covers one level.`,facts:[{label:'Cost',text:`${fmt(u.cost)} ${M.currencies[u.currency]}`},{label:'Available',text:fmt(s.balances[u.currency])},{label:'Bonus value',text:`${fmt(before)} → ${fmt(after)}`}],upgradeGain:{before,after,delta:after-before,unit:'',scope:'Fountain source bonus'},benefit:clean(u.description),preview:['damage','classExp'].includes(outside?.id)?{kind:'fountain',id:u.water*20+u.index,water:u.water,index:u.index,from:u.from,to:u.from+1}:undefined,blocker:'One level, with saved marble multipliers. Other recommendations use the same wallet; this is not a combined spending plan.'}];
 });
}
function cauldrons(raw,account){
 const data=read(raw.data)||raw,saved=read(data.CauldronP2W),money=account.currencies?.rawMoney;
 if(!Array.isArray(saved)||!valid(money))return [];
 const groups=[['cauldrons',0,3,[['speed','Brewing speed',150],['newBubble','New bubble chance',125],['boostReq','Boost requirements',100]]],['liquids',1,2,[['regen','Liquid regeneration',100],['capacity','Liquid capacity',80]]]];
 return groups.flatMap(([group,g,width,stats])=>(account.alchemy?.p2w?.[group]||[]).flatMap((entry,index)=>stats.flatMap(([key,label,max],offset)=>{
  const value=entry[key],lv=read(saved[g])?.[index*width+offset];
  if(!valid(lv)||!Number.isInteger(lv)||lv>=max||value?.level!==lv||!valid(value.cost)||value.cost<=0||value.cost>money)return [];
  const name=`${clean(entry.name)} ${label.toLowerCase()}`;
  return [{id:`cauldron-action|${group}|${index}|${key}`,sectionId:'alchemy',page:'alchemy',system:'Alchemy coin upgrades',sourceName:name,name:`Buy ${name} level ${lv+1}`,current:lv,target:lv+1,changeLabel:'one coin upgrade',state:'Ready to buy',ready:true,score:85,effect:`Alchemy ${label}`,reason:`Saved level ${lv} is below the ${max} cap and account coins cover the next purchase.`,facts:[{label:'Cost',coin:value.cost},{label:'Account coins',coin:money},{label:'Level cap',text:String(max)}],benefit:`Raises ${name} by one upgrade level.`,blocker:'Open the Pay 2 Win tab in Alchemy. This spends in-game coins. Final production depends on your other Alchemy bonuses.'}];
 })));
}
root.AccountReviewExtraActions={summoning,fountain,cauldrons};
})(globalThis);
