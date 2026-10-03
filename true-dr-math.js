(function(root){
'use strict';
const clamp=p=>Math.max(0,Math.min(1,p));
// Distribution of the actual client DropOdds(n, chance), including its >2 rounding branch.
function roll(n,p){
 if(!(n>0)||!(p>0))return [[0,1]];
 if(n*p>2)return [[Math.round(n*p),1]];
 const zero=Math.pow(1-p,n),one=n*p*Math.pow(1-p,n-1),p0=clamp(zero),p01=Math.max(p0,clamp(zero+one));
 return [[0,p0],[1,p01-p0],[2,1-p01]].filter(([,weight])=>weight>0);
}
const empty=()=>({chance:0,mean:0,min:0,max:0});
function together(results){return {chance:Math.max(0,-Math.expm1(results.reduce((p,r)=>p+Math.log1p(-r.chance),0))),mean:results.reduce((n,r)=>n+r.mean,0),min:results.reduce((n,r)=>n+r.min,0),max:results.reduce((n,r)=>n+r.max,0)};}
function mixed(outcomes){const values=outcomes.filter(([,w])=>w>0);return {chance:values.reduce((v,[r,w])=>v+r.chance*w,0),mean:values.reduce((v,[r,w])=>v+r.mean*w,0),min:Math.min(...values.map(([r])=>r.min)),max:Math.max(...values.map(([r])=>r.max))};}
function candyQuantity(q){const low=-.55,high=1.35*q,span=high-low,result=[];for(let k=1;k<=Math.floor(high);k++){const weight=Math.max(0,Math.min(high,k+1)-(k===1?low:k))/span;if(weight>0)result.push([k,weight]);}return result;}
function routeTree(routes){const roots=new Map();for(const route of routes){let level=roots;for(const entry of route){if(!level.has(entry.key))level.set(entry.key,{entry,children:new Map()});level=level.get(entry.key).children;}}return roots;}
function evaluate(routes,dr,context={},options={}){
 if(!Number.isFinite(dr)||dr<=0)return null;
 const iterations=options.iterations??1,rare=options.rare??context.rareMultiplier??1;
 function nodeResult(node,n,depth){
  const e=node.entry,id=e.id;
  if(options.savedGates){
   if(e.quest!=='N/A'&&Number(context.quests?.[e.quest])!==0)return empty();
   if(id.startsWith('Stamp')&&e.itemId!=null){const group=Math.floor(e.itemId/1000),index=e.itemId%1000;if(Number(context.stamps?.[group]?.[index])>0&&(depth>0||e.quest==='N/A'))return empty();}
   if(id.startsWith('SmithingRecipes')&&Number(context.recipes?.[Number(id.replace('SmithingRecipes',''))-1]?.[e.quantity])>=0)return empty();
   if(id.startsWith('InvStorage')&&Object.hasOwn(context.storage||{},String(e.itemId)))return empty();
  }
  const capped=/SmithingRecipes|TalentBook/.test(id),candy=/PremiumGem|Timecandy/.test(id);
  let chance=e.chance;
  if(options.savedGates&&id.startsWith('Stamp'))chance*=context.stampMultiplier??1;
  const p=depth===0?chance*dr:chance*dr/Math.max(dr,1)*(depth===1&&!capped&&!candy?rare:1);
  let outcomes=roll(n,p);
  if(candy&&depth===0){const gate=clamp(chance*Math.pow(dr,.2));outcomes=[[0,1-gate],...candyQuantity(e.quantity).map(([q,w])=>[q,w*gate])];}
  else if(capped||candy){outcomes=outcomes.map(([count,w])=>[Math.min(count,1),w]);if(candy&&depth===1){const gate=clamp(chance*Math.pow(dr,.35));outcomes=[[0,1-gate],...outcomes.map(([count,w])=>[count,w*gate])];}}
  return mixed(outcomes.map(([count,w])=>{
   const quantity=capped?1:candy&&depth===0?1:e.quantity;
   const qty=Math.round(quantity*count);
   if(!qty)return [empty(),w];
   if(node.children.size)return [together([...node.children.values()].map(child=>nodeResult(child,qty,depth+1))),w];
   const finalQty=Math.ceil(qty*(options.materialMulti??1));
   return [{chance:1,mean:finalQty,min:finalQty,max:finalQty},w];
  }));
 }
 const tree=routeTree(routes);
 const result=together([...tree.values()].map(node=>nodeResult(node,iterations,0)));
 result.quantity=result.chance>0?result.mean/result.chance:0;
 return result;
}
// Item actor initialization applies these after loot-table rolls and multikill.
function stackBonus(item,loot={}){
 const b=loot.stackBonuses;if(!b)return {factor:1};
 const statue=item.includes('EquipmentStatues'),golden=item.includes('FoodG');
 if(!statue&&!golden)return {factor:1};
 const chance=Math.max(0,Math.min(1,Number((statue?b.statueChance:b.goldenChance)?.value||0)/100));
 const proc=Math.round(2+(Number(b.legend||0)+(statue?Number(b.statueUpgrade||0):0))/100),pack=b.pack===2?2:1;
 return {factor:pack*(1+chance*(proc-1)),chance,proc,pack,breakdown:(statue?b.statueChance:b.goldenChance)?.breakdown||[]};
}
function iterations(source,loot={}){
 const crystal=source.startsWith('Crystal')?loot.crystalRolls||1:1;
 const score=Math.max(0,Number(loot.orbScore)||0)/100,whole=Math.floor(score),fraction=score-whole;
 const gimme=['mini4a','mini3a','babaMummy','babaHour'].includes(source)?0:loot.gimmeChance||0;
 // Gimme Gimme takes precedence over Orb and does not multiply Crystal Embiggener.
 return [[2,gimme],[Math.round((1+whole)*crystal),(1-gimme)*(1-fraction)],[Math.round((2+whole)*crystal),(1-gimme)*fraction]].filter(([,p])=>p>0);
}
const api={roll,evaluate,routeTree,stackBonus,iterations};root.TrueDrMath=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
