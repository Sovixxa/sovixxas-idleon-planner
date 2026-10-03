(function(root){
'use strict';
const read=v=>typeof v==='string'?JSON.parse(v):v,valid=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0,clean=v=>String(v??'').replaceAll('_',' ');
function wallet(data,c){
 if(c.kind==='coins')return Object.entries(data).filter(([k])=>k==='MoneyBANK'||/^Money_\d+$/.test(k)).reduce((s,[,v])=>s+(Number(v)||0),0);
 if(c.kind==='item'){const ids=read(data.ChestOrder),qty=read(data.ChestQuantity);return (ids||[]).reduce((s,id,i)=>s+(id===c.id?Number(qty?.[i])||0:0),0);}
 const v=c.kind==='liquid'?read(read(data.CauldronInfo)?.[6])?.[Number(c.id.replace('Liquid',''))-1]:c.kind==='meal'?read(read(data.Meals)?.[2])?.[c.id]:c.kind==='essence'?read(read(data.Summon)?.[2])?.[c.id]:c.kind==='fountain'?read(read(data.Holes)?.[9])?.[30+c.id]:c.kind==='particles'?read(data.Divinity)?.[39]:c.kind==='gold'?read(data.OptionsListAccount)?.[75]:c.kind==='royal'?read(data.OptionsListAccount)?.[324]:null;
 return v==null?null:Number(v);
}
function arcadeCost(id,lv,discount){if(lv===100)return 5;const factor=Math.max(.6,1-discount/100);return Math.round(factor*(id===39?5+3*lv:[51,54,999].includes(id)?10+5*lv+lv**1.43:id>=70?20+10*lv+lv**1.92:id>=62?20+10*lv+lv**1.69:id>=55&&![60,61].includes(id)?20+10*lv+lv**1.83:5+3*lv+lv**1.3));}
function build(raw,parsed){
 const d=read(raw.data)||raw,a=parsed.account,M=root.PrayerMath,fmt=root.AccountReviewActions.formatNumber,out=[];
 function add(kind,id,s,page,costs,effect,before,after){
  if(!Number.isInteger(s.level)||s.level<0||!costs.length||costs.some(c=>!valid(c.amount)||c.amount<=0||!valid(wallet(d,c))))return;
  const ready=costs.every(c=>wallet(d,c)>=c.amount),name=clean(s.name||effect),missing=costs.filter(c=>wallet(d,c)<c.amount);
  out.push({id:kind+'-action|'+id,sectionId:page,page,system:{vial:'Vials',salt:'Salt Lick',atom:'Atom Collider',vault:'Upgrade Vault',arcade:'Arcade'}[kind],sourceName:name,name:`${ready?'Buy':'Save for'} ${name} level ${s.level+1}`,current:s.level,target:s.level+1,changeLabel:'one permanent upgrade',state:ready?'Ready to buy':'Prepare first',ready,score:ready?92:30,effect:clean(effect),reason:ready?'Your saved balance covers this unlocked next level.':`Missing ${missing.map(c=>fmt(c.amount-wallet(d,c))+' '+(c.id||c.kind)).join(', ')}.`,facts:costs.map(c=>c.kind==='coins'?{label:'Cost',coin:c.amount}:{label:'Cost / available',text:`${fmt(c.amount)} / ${fmt(wallet(d,c))} ${c.id||c.kind}`}),costs,preview:{kind,id,from:s.level,to:s.level+1},upgradeGain:valid(before)&&valid(after)?{before,after,delta:after-before,unit:'',scope:'source bonus at current multipliers'}:null,benefit:clean(effect),blocker:kind==='arcade'?'Only the saved shop rotation is considered. Lv 100 → 101 uses Royal Balls; other levels use Gold Balls.':'Priced from the saved account. Storage-only material balance; purchases share resources.'});
 }
 for(const [id,s] of (a.saltLick||[]).entries())if(read(d.SaltLick)?.[id]===s.level&&s.level<s.maxLevel)add('salt',id,{...s,name:'Salt Lick '+(id+1)},'saltLick',[{kind:'item',id:s.rawName,amount:Math.floor(s.baseCost*s.increment**s.level)}],s.desc,s.baseBonus*s.level,s.baseBonus*(s.level+1));
 if(a.towers?.data?.[8]?.level>0)for(const [id,s] of (a.atoms?.atoms||[]).entries())if(read(d.Atoms)?.[id]===s.level&&s.level<s.maxLevel)add('atom',id,s,'atomCollider',[{kind:'particles',amount:s.cost}],s.desc,!['Fluoride_-_Void_Plate_Chef','Carbon_-_Wizard_Maximizer'].includes(s.name)?s.baseBonus*s.level:undefined,!['Fluoride_-_Void_Plate_Chef','Carbon_-_Wizard_Maximizer'].includes(s.name)?s.baseBonus*(s.level+1):undefined);
 for(const [id,s] of (a.upgradeVault?.upgrades||[]).entries())if(read(d.UpgVault)?.[id]===s.level&&s.unlocked&&s.level<s.maxLevel)add('vault',id,s,'upgradeVault',[{kind:'coins',amount:s.cost}],s.description,s.bonus,M.calcUpgradeVaultBonus(a.upgradeVault.upgrades.map((entry,i)=>i===id?{...entry,level:entry.level+1}:entry),id));
 for(const s of a.alchemy?.vials||[]){const id=root.ReviewVialIds[s.name];if(id==null||read(read(d.CauldronInfo)?.[4])?.[id]!==s.level||s.level<1||s.level>=13)continue;
  const costs=s.itemReq.flatMap((r,i)=>r.rawName==='Blank'?[]:[{kind:/^Liquid/.test(r.rawName)?'liquid':'item',id:r.rawName,amount:i===0?[0,100,1000,2500,10000,50000,100000,500000,1000001,5000000,25000000,100000000,1000000000][s.level]:3*s.level}]);
  add('vial',id,s,'vials',costs,s.desc,M.growth(s.func,s.level,s.x1,s.x2,false)*s.multiplier,M.growth(s.func,s.level+1,s.x1,s.x2,false)*s.multiplier);
 }
 const goldStamp=Object.values(a.stamps||{}).flat().find(s=>s.stat==='GoldBallz');
 const discount=goldStamp?M.getStampBonus(a,goldStamp.category,goldStamp.rawName,parsed.characters[0]):0;
 for(const [id,s] of (a.arcade?.shop||[]).entries())if(s.active&&read(d.ArcadeUpg)?.[id]===s.level&&s.level>0&&s.level<101)add('arcade',id,{...s,name:clean(s.effect)},'arcade',[{kind:s.level===100?'royal':'gold',amount:arcadeCost(id,s.level,discount)}],s.effect);
 return out;
}
root.ReviewPermanent={build,wallet,arcadeCost};
})(globalThis);
