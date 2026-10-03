(function(root){
'use strict';
const num=v=>Number.isFinite(Number(v))?Number(v):0, parse=v=>typeof v==='string'?JSON.parse(v):v;
const words=v=>String(v??'').replaceAll('_',' '),product=xs=>xs.reduce((v,x)=>v*x.value,1);
function decode(raw,catalog,context){
  const data=parse(raw?.data)||raw||{},s=parse(data.Sushi);
  if(!Array.isArray(s)||s.length<8||s.slice(0,8).some(x=>!Array.isArray(x)))return null;
  const research=parse(data.Research)||[],bundles=parse(data.BundlesReceived)||{};
  return {catalog,context,tiers:Array.from({length:120},(_,i)=>num(s[0][i]??-1)),plates:Array.from({length:120},(_,i)=>num(s[1][i]??-1)),fires:Array.from({length:15},(_,i)=>num(s[3][i]??-1)),levels:s[2].map(num),misc:s[4].map(num),tracking:s[5].map(num),xp:s[6].map(num),knowledge:s[7].map(num),bundle:num(bundles.bon_v)>0?2:1,jellyBundle:num(bundles.ban_j)===1?2:1,jellyDiscount:num(research[7]?.[9])>18?num(catalog.Research[47]?.[18]):0};
}
function knowledge(s){
  const r=s.catalog.Research;
  return r[30].map((name,i)=>{
    const level=num(s.knowledge[i]),category=num(r[33][i]),discovered=(s.tracking[i]??-1)>=0,perfecto=(s.tracking[i]??0)>=1;
    const perLevel=discovered?num(r[35][category])*(perfecto?2:1)*(1+i/30):0;
    const required=(3+level+level**1.5)*1.5**Math.max(0,level-2);
    return {i,name:words(name),category,level,discovered,perfecto,perLevel,bonus:perLevel*level,xp:num(s.xp[i]),required,remaining:Math.max(0,required-num(s.xp[i])),description:words(r[34][category])};
  });
}
function formatEffect(template,value){return words(template).replaceAll('{',String(Number(value.toPrecision(5)))).replaceAll('^',String(Number(value.toPrecision(5)))).replaceAll('}',String(Number((1+value/100).toPrecision(5)))).replaceAll('@',' · ');}
function calculate(s){
  const ks=knowledge(s),totals=Array(11).fill(0);ks.forEach(k=>totals[k.category]+=k.bonus);
  const lv=i=>num(s.levels[i]),q=i=>lv(i)*num(s.catalog.SushiUPG[i]?.[3]),sum=ids=>ids.reduce((n,i)=>n+q(i),0),t=i=>num(totals[i]);
  let unique=0;while(unique<ks.length&&ks[unique].discovered)unique++;
  const spark=Math.max(0,num(s.misc[2])),sparkPct=.2*Math.log2(Math.max(1,spark))+Math.log(Math.max(1,spark))/2.302585;
  const fireBase=(1+t(9)/100)*(1+sparkPct/100),plateBase=1+t(8)/100;
  const factor=(name,value,page)=>({name,value,page});
  const fuelFactors=[factor('Bon V bundle',s.bundle),factor('Fastburn Fuel I–V',1+sum([8,9,10,11,12])/100),factor('Fuel knowledge',1+t(4)/100)];
  for(const i of [27,36,45])fuelFactors.push(factor('Knowledge: '+ks[i]?.name,1+(ks[i]?.bonus||0)/100));
  for(const i of [9,10,11,12])fuelFactors.push(factor(words(s.catalog.SushiUPG[i][0])+' extra',1+lv(i)/100));
  const orange=s.tiers.reduce((total,tier,i)=>total+(tier>=0&&s.fires[i%15]===0?(tier+1)*fireBase:0),0);
  fuelFactors.push(factor('Red fireplaces',1+orange/100));
  const fuel=50*product(fuelFactors),cap=(200+t(3))*s.bundle*(1+sum([1,2,3,4,5])/100)*[2,3,4,5].reduce((v,i)=>v*(1+lv(i)/100),1);
  const best=Math.max(0,num(s.misc[8])),over=Math.max(0,best-1500),combo=1+Math.min(10,best**.3)+90*over/(20000+over);
  const overflow=Math.max(1,num(s.misc[1])/1e6),overtuned=5*Math.log2(overflow)+10*Math.log(overflow)/2.302585;
  const currencyFactors=[factor('Discoveries',1.1**unique),factor('Best combo',combo),factor('Bon V bundle',s.bundle),factor('Ban J bundle',s.jellyBundle),factor('Surcharges + Gaming superbit',1+(sum([30,31,32,33,34])+num(s.context?.superbit))/100,'gaming'),factor('Bucks knowledge',1+t(0)/100),factor('No Tax on Tips',1+q(40)/100),factor('Hourly Wage + Tier Vision',1+sum([41,43])/100),factor('Overtuned Fuel',1+overtuned/100),...(s.context?.factors||[])];
  const currencyMulti=product(currencyFactors),knowledgeFactors=[factor('3rd Degree Searing',1+q(38)/100),factor('Knowledge EXP bonuses',1+t(1)/100)],xpMulti=product(knowledgeFactors);
  const xpDaily=ks.map(()=>0);let baseBucks=0;
  const slots=s.tiers.map((tier,i)=>{
    const plate=s.plates[i],fire=s.fires[i%15],base=tier<0?0:tier<10?[1,3,8,20,50,115,250,560,1220,2650][tier]:tier<16?(2.46-tier/100)**tier+5*tier+tier*tier:2.31**tier;
    const bucks=base*(plate===1?1+.5*plateBase:1)*(fire===1?1+1.5*fireBase:1);baseBucks+=bucks;
    const km=xpMulti*(fire===3?1+fireBase:1);
    if(lv(13)>0&&tier>=0){if(plate===2)for(let j=0;j<tier&&j<ks.length;j++)xpDaily[j]+=.2*plateBase*km;else if(plate===3&&tier<ks.length)xpDaily[tier]+=plateBase*km;}
    return {i,tier,plate,fire,bucks:bucks*currencyMulti,xpMulti:km};
  });
  ks.forEach(k=>{k.daily=xpDaily[k.i];k.days=k.daily>0?k.remaining/k.daily:null;k.effect=formatEffect(k.description,k.bonus);k.nextEffect=formatEffect(k.description,k.bonus+k.perLevel);k.perfectEffect=formatEffect(k.description,k.bonus*2);});
  const rog=i=>unique>i?num(s.catalog.Research[37][i]):0;
  const discounts=[factor('Wholesale Pricing',1/(1+q(36)/100)),factor('Discovery discount',Math.max(.1,1-Math.max(rog(26),rog(44))/100)),factor('Knowledge discount',1/(1+t(6)/100)),factor('Jelly Operator',1/(1+s.jellyDiscount/100),'jelly')];
  return {knowledge:ks,totals,unique,fuel,cap,combo,sparkPct,fireBase,plateBase,slots,bucksPerHour:baseBucks*currencyMulti,currencyMulti,currencyFactors,fuelFactors,knowledgeFactors,discounts,discount:product(discounts),xpDaily,totalXpDaily:xpDaily.reduce((a,b)=>a+b,0),xpCreation:(1+q(37)/10)*xpMulti,hoursToCap:Math.max(0,cap-num(s.misc[0]))/fuel};
}
function cost(s,visual,model=calculate(s)){
  const id=num(s.catalog.Research[32][visual]),u=s.catalog.SushiUPG[id];
  return Math.max(.1,num(u[4])||1)*(5+visual+Math.max(0,visual-1)**2)*(1.5+Math.max(0,visual-3)/16)**Math.max(0,visual-4)*1.3**Math.max(0,visual-20)*num(u[2])**num(s.levels[id])*model.discount;
}
function upgrades(s,goal='bucks'){
  const current=calculate(s),cash=num(s.misc[3]),r=s.catalog.Research;
  return r[32].map((value,visual)=>{
    const id=num(value),u=s.catalog.SushiUPG[id],level=num(s.levels[id]),max=num(u[1]),maxed=max<=998&&level>=max,available=visual===0||num(s.levels[num(r[32][visual-1])])>=1;
    const price=cost(s,visual,current),next={...s,levels:s.levels.slice()};next.levels[id]=level+1;const after=calculate(next);
    const deltas={bucks:after.bucksPerHour-current.bucksPerHour,fuel:after.fuel-current.fuel,knowledge:after.totalXpDaily-current.totalXpDaily,capacity:after.cap-current.cap};
    const baseline={bucks:current.bucksPerHour,fuel:current.fuel,knowledge:current.totalXpDaily,capacity:current.cap}[goal],delta=deltas[goal]||0;
    const quantity=num(u[3])*(level+1),compact=v=>Number(v.toPrecision(5));
    const substitutions={6:quantity+1,8:compact(after.fuel)+' Fuel/hr; max capacity '+compact(after.cap),14:compact(1+.5*after.plateBase),15:compact(.2*after.plateBase),16:compact(after.plateBase),22:1+quantity,25:'Saved sparks: '+compact(num(s.misc[2]))+'; fireplace multiplier '+compact(1+after.sparkPct/100)+'×',26:compact(1+after.fireBase),27:compact(1+1.5*after.fireBase),28:'Saved overflow fuel: '+compact(num(s.misc[1]))+'; see Overtuned Fuel in the bucks breakdown',29:after.unique-6,36:compact(100*(1-1/(1+quantity/100))),37:compact(1+quantity/10)};
    for(const i of [2,3,4,5,9,10,11,12])substitutions[i]=compact(1+(level+1)/100);
    const effect=formatEffect(u[5],id===24?20*after.fireBase:quantity).replaceAll('$',String(substitutions[id]??quantity));
    return {id,visual,name:words(u[0]),level,max,maxed,available,cost:price,affordable:cash>=price,wait:cash>=price?0:current.bucksPerHour>0?(price-cash)/current.bucksPerHour:null,deltas,gain:baseline>0?delta/baseline:delta>0?1:0,score:price>0?delta/price:0,payback:deltas.bucks>0?price/deltas.bucks:null,effect,discountGain:1-after.discount/current.discount};
  }).sort((a,b)=>Number(b.available&&!b.maxed)-Number(a.available&&!a.maxed)||b.score-a.score||a.visual-b.visual);
}
// Pairwise local search preserves the exact sushi and plate inventories. It never merges or invents a sushi.
function optimize(s,goal){
  const result={...s,tiers:s.tiers.slice(),plates:s.plates.slice(),fires:s.fires.slice()},open=result.plates.map((p,i)=>p>=0?i:-1).filter(i=>i>=0);
  const base=calculate(s),score=m=>goal==='fuel'?m.fuel:goal==='knowledge'?m.totalXpDaily:m.bucksPerHour;
  // Green, pink, and red are the immediate-rate colors; purple's future spark growth is outside this preview.
  const desired=goal==='bucks'?1:goal==='knowledge'?3:0,unlocked=desired===0||num(s.levels[desired===1?27:26])>0;
  if(unlocked)result.fires=result.fires.map(x=>x>=0?desired:x);
  const metrics=calculate(result),weight=(tier,i)=>{
    if(tier<0)return 0;
    const p=result.plates[i],f=result.fires[i%15];
    if(goal==='fuel')return f===0?tier+1:0;
    if(goal==='knowledge')return (p===2?.2*tier:p===3?1:0)*(f===3?1+metrics.fireBase:1);
    const b=tier<10?[1,3,8,20,50,115,250,560,1220,2650][tier]:tier<16?(2.46-tier/100)**tier+5*tier+tier*tier:2.31**tier;
    return b*(p===1?1+.5*metrics.plateBase:1)*(f===1?1+1.5*metrics.fireBase:1);
  };
  for(let pass=0;pass<8;pass++){
    let changed=false;
    for(let a=0;a<open.length;a++)for(let b=a+1;b<open.length;b++){
      const i=open[a],j=open[b],x=result.tiers[i],y=result.tiers[j];
      if(weight(y,i)+weight(x,j)>(weight(x,i)+weight(y,j))*(1+1e-12)){[result.tiers[i],result.tiers[j]]=[y,x];changed=true;}
    }
    if(!changed)break;
  }
  return score(calculate(result))>=score(base)?result:{...s,tiers:s.tiers.slice(),plates:s.plates.slice(),fires:s.fires.slice()};
}
root.SushiModel={decode,calculate,knowledge,cost,upgrades,optimize,formatEffect};
if(typeof module!=='undefined')module.exports=root.SushiModel;
})(globalThis);
