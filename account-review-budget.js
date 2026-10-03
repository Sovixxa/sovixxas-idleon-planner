(function(root){
'use strict';
const read=v=>typeof v==='string'?JSON.parse(v):v,key=c=>c.kind+'|'+(c.id??'');
function pay(save,c){
 let amount=c.amount;
 if(root.ReviewPermanent.wallet(save,c)<amount)throw Error('Insufficient '+key(c));
 if(c.kind==='coins'){
  for(const field of Object.keys(save).filter(k=>k==='MoneyBANK'||/^Money_\d+$/.test(k))){const used=Math.min(Number(save[field])||0,amount);save[field]=Number(save[field])-used;amount-=used;if(amount<=0)break;}return;
 }
 if(c.kind==='item'){
  const ids=read(save.ChestOrder),qty=read(save.ChestQuantity);for(let i=0;i<ids.length;i++)if(ids[i]===c.id){const used=Math.min(qty[i],amount);qty[i]-=used;amount-=used;if(amount<=0)break;}save.ChestQuantity=qty;return;
 }
 const path=c.kind==='liquid'?['CauldronInfo',6,Number(c.id.replace('Liquid',''))-1]:c.kind==='meal'?['Meals',2,c.id]:c.kind==='essence'?['Summon',2,c.id]:c.kind==='fountain'?['Holes',9,30+c.id]:c.kind==='particles'?['Divinity',39]:c.kind==='royal'?['OptionsListAccount',324]:c.kind==='gold'?['OptionsListAccount',75]:null;
 if(!path)throw Error('Unsupported wallet '+c.kind);
 let node=save;for(const part of path.slice(0,-1)){node[part]=read(node[part]);node=node[part];}node[path.at(-1)]-=amount;
}
async function plan(raw,options,engine,progress=()=>{}){
 const save=structuredClone(read(raw.data)||raw),initial=structuredClone(save),spent={},steps=[],limit=Math.min(12,Math.max(1,Math.floor(options.count||5))),fraction=Math.min(1,Math.max(0,Number(options.percent??100)/100));
 let parsed=engine.parse(save),before=engine.metric(parsed,save),current=before,stop='Purchase limit reached';
 const canPay=costs=>{const totals=new Map();for(const c of costs||[]){const k=key(c),old=totals.get(k);totals.set(k,{...c,amount:c.amount+(old?.amount||0)});}return totals.size>0&&[...totals.values()].every(c=>Number.isFinite(c.amount)&&c.amount>0&&root.ReviewPermanent.wallet(save,c)>=c.amount&&root.ReviewPermanent.wallet(initial,c)*fraction-(spent[key(c)]||0)>=c.amount);};
 for(let step=0;step<limit;step++){
  const candidates=engine.actions(save,parsed).filter(a=>a.preview&&a.costs&&canPay(a.costs));
  // Bound interactive runtime; rank by existing goal/readiness order first.
  const shortlist=candidates.slice(0,16);let best=null;
  for(let i=0;i<shortlist.length;i++){
   const action=shortlist[i];progress({step:step+1,limit,candidate:i+1,candidates:shortlist.length});
   try{
    const next=structuredClone(save),costs=structuredClone(action.costs);costs.forEach(c=>pay(next,c));engine.apply(next,parsed,action.preview);
    let p=engine.parse(next),name=action.name;
    if(action.preview.cap){
     const coin=engine.actions(next,p).find(a=>a.id===action.id&&!a.preview.cap);
     if(!coin||!canPay([...costs,...coin.costs]))continue;
     coin.costs.forEach(c=>pay(next,c));costs.push(...coin.costs);engine.apply(next,p,coin.preview);p=engine.parse(next);name+='; then buy one stamp level';
    }
    const after=engine.metric(p,next),gain=after.value-current.value;if(!(gain>0)||!Number.isFinite(gain))continue;
    const share=costs.reduce((s,c)=>s+c.amount/Math.max(1,root.ReviewPermanent.wallet(initial,c)*fraction),0);
    const score=options.strategy==='gain'?gain:gain/Math.max(1e-12,share);
    if(!best||score>best.score)best={action,name,next,p,costs,after,gain,score};
   }catch(error){engine.warn?.(action.id,error.message);}
   await Promise.resolve();
  }
  if(!best){stop='No further positive modeled gain within the supported candidates and remaining budget';break;}
  for(const k of Object.keys(save))delete save[k];Object.assign(save,best.next);parsed=best.p;
  best.costs.forEach(c=>spent[key(c)]=(spent[key(c)]||0)+c.amount);
  steps.push({name:best.name,page:best.action.page,before:current.value,after:best.after.value,gain:best.gain,costs:best.costs});current=best.after;
 }
 const balances=Object.entries(spent).map(([id,amount])=>{const [kind,rawId]=id.split('|'),c={kind,id:['meal','essence','fountain'].includes(kind)?Number(rawId):rawId||undefined};return {id,spent:amount,remaining:root.ReviewPermanent.wallet(save,c)};});
 return {steps,before:before.value,after:current.value,label:current.label,unit:current.unit,balances,stop,consideredLimit:16,strategy:options.strategy||'efficiency'};
}
root.ReviewBudget={plan,pay};
})(globalThis);
