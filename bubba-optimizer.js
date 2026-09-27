(function(root){'use strict';
const D=typeof module!=='undefined'&&module.exports?require('./bubba-optimizer-data'):root.BubbaOptimizerData;
const n=x=>Number.isFinite(Number(x))?Math.max(0,Number(x)):0,integer=x=>Math.floor(n(x));
const parse=x=>{try{return typeof x==='string'?JSON.parse(x):x;}catch{return null;}};
const log=x=>Math.log(Math.max(1,x))/2.30259,log2=x=>Math.log2(Math.max(1,x));
const clone=s=>({...s,paid:[...s.paid],free:[...s.free],traits:[...s.traits],gifts:[...s.gifts],dice:[...s.dice],smoke:[...s.smoke],coins:[...s.coins],outside:{...s.outside}});
function decode(raw){let data=parse(raw);for(let i=0;i<4&&data&&!data.Bubba;i++)data=parse(data.data??data.rawData??data);const b=parse(data?.Bubba);if(!Array.isArray(b)||![0,1,2,3,4,5].every(i=>Array.isArray(b[i])))return null;
 const row=(i,count)=>Array.from({length:count},(_,j)=>integer(b[i][j]));const options=parse(data.OptionsListAccount??data.OptLacc)||[],vault=parse(data.UpgVault)||[],research=parse(data.Research)||[],sushi=parse(data.Sushi)||[],holes=parse(data.Holes)||[];
 let unique=0;while(unique<40&&sushi[5]?.[unique]!=null&&Number(sushi[5][unique])>=0)unique++;
 const marble=integer(holes[32]?.[2]?.[18]),fountain=Math.round(integer(holes[31]?.[2]?.[18])*2*(marble?1.5+.5*marble:1));
 const outside={vault:1+n(vault[65])*D.vault65*(1+n(vault[89])*D.vault89/100)/100,sushi:1+(unique>39?D.sushi:0)/100,jelly:1+(n(research[7]?.[9])>58?D.jelly:0)/100,fountain:1+fountain/100,minehead:1/(1+(n(research[7]?.[4])>5?D.minehead:0)/100)};
 return {paid:row(1,28),free:row(2,28),traits:row(3,6),gifts:[integer(b[0][2]),integer(b[0][3])],dice:row(4,8),smoke:row(5,5),coins:Array.from({length:4},(_,i)=>n(b[0][9+i])),wallet:n(b[0][0]),happiness:n(b[0][1]),produced:n(b[0][4]),patsUsed:Number.isFinite(Number(b[0][5]))?Number(b[0][5]):0,training:integer(b[0][6]),trainingProgress:n(b[0][8]),hourElapsed:n(b[0][13]),smokeSeconds:n(b[0][14]),emulsified:integer(b[0][15]),poppy:n(options[267]),outside,productionScale:1,costScale:1};
}
const level=(s,i)=>Math.round(s.paid[i]+s.free[i]);
const bonus=(s,i)=>level(s,i)*D.upgrades[i].bonus;
const canEmulsify=s=>s.paid[8]>=6;
const emul=(s,i)=>canEmulsify(s)?i:s.emulsified;
const trait=(s,i,e=s.emulsified)=>s.traits[i]*D.traits[i]*(1+bonus(s,13)/100)*(e===i+1?3:1);
const gift=(s,i)=>s.gifts.includes(i+1)?D.gifts[i]*Math.min(5,1+bonus(s,17)/100):0;
const happiness=h=>1+10*(log2(h)+25*log(h)+Math.pow(h,.75))/100;
function diceMulti(s){let v=0;for(const die of s.dice)if(die>0)v=Math.max(1,v)*(Math.min(die,6)+Math.max(die-6,0)/2.5);return 1+v/100;}
const smokeMulti=s=>s.smoke.reduce((v,q,i)=>v*(1+q*D.smoke[i]/100),1);
const coinMulti=s=>1+s.coins.reduce((v,q,i)=>v+q*[1,5,25,100][i],0)/100;
function rate(s,e=s.emulsified,h=s.happiness){return (bonus(s,0)+bonus(s,7)+bonus(s,23))*(1+(bonus(s,2)+bonus(s,11)+bonus(s,19)+bonus(s,24)*log(s.poppy))/100)*happiness(h)*diceMulti(s)*smokeMulti(s)*(1+trait(s,0,e)/100)*(1+(s.paid[8]>0?s.paid.reduce((v,x,i)=>v+level(s,i),0):0)/100)*(1+gift(s,0)/100)*coinMulti(s)*s.outside.vault*s.outside.sushi*s.outside.jelly*s.outside.fountain*s.productionScale;}
function cost(s,i,e=s.emulsified){const u=D.upgrades[i],l=s.paid[i];return s.outside.minehead*s.costScale*u.base*(Math.pow(i+1,2)*l+Math.pow(2.4+i/3.65,i)*Math.pow(u.growth,l))/((1+bonus(s,4)/100)*(1+bonus(s,18)/100)*(1+bonus(s,26)/100)*(1+trait(s,1,e)/100));}
const required=i=>i===0?0:50*Math.pow(2.8+i/3.55,i-Math.min(1,Math.floor(i/4)));
const unlocked=(s,i)=>s.produced>=required(i);
const buyable=(s,i)=>unlocked(s,i)&&(D.upgrades[i].cap===999||s.paid[i]<D.upgrades[i].cap);
const regularPats=s=>Math.ceil(log2(level(s,1))+Math.min(level(s,1),3));
const patsAvailable=s=>level(s,1)>0?Math.max(0,regularPats(s)-Math.max(s.hourElapsed>=3600?Math.min(s.patsUsed,0):s.patsUsed,-1e6)):0;
const petGain=(s,e=s.emulsified)=>bonus(s,1)*(1+(bonus(s,20)+trait(s,2,e)+gift(s,1))/100);
const purchaseHappy=(s,e=s.emulsified)=>{const b=bonus(s,5);return (Math.min(1,b)+2*b/(b+200))*(1+(bonus(s,20)+trait(s,2,e)+gift(s,1))/100);};
const doubleChance=(s,e=s.emulsified)=>Math.min(1,(trait(s,4,e)+gift(s,5))/100);
const trainingSeconds=s=>{const total=s.traits.reduce((a,b)=>a+b,0);return Math.max(0,20*(1+total/20)*Math.pow(1.03,total)-s.trainingProgress)/((1+bonus(s,6)/100)*(1+gift(s,2)/100));};
function calibrated(s,observedRate,observedCost){const next=clone(s);if(n(observedRate)>0&&rate(s)>0)next.productionScale=n(observedRate)/rate(s);if(n(observedCost)>0&&cost(s,8)>0)next.costScale=n(observedCost)/cost(s,8);return next;}
function purchase(s,i,e=emul(s,2)){const p=cost(s,i,e);if(!buyable(s,i)||!Number.isFinite(p)||p>s.wallet)return null;const next=clone(s);next.wallet-=p;next.paid[i]++;next.happiness+=purchaseHappy(next,e);return next;}
const steady=s=>rate(s,emul(s,1),0);
const goalWait=s=>{const gap=Math.max(0,cost(s,8,emul(s,2))-s.wallet,required(8)-s.produced);return gap===0?0:steady(s)>0?gap/steady(s):Infinity;};
const ordinary=[0,2,4,7,11,13,17,18,19,23,24,26];
function candidates(s,{goal='mega',horizon=3600,reserve=0,holdCheap=false}={}){const before=steady(s),target=cost(s,8,emul(s,2)),wait=goalWait(s),budget=Math.max(0,s.wallet-reserve);return ordinary.filter(i=>buyable(s,i)&&!(holdCheap&&[0,2].includes(i)&&level(s,i)>=50&&level(s,21)===0)).map(i=>{const price=cost(s,i,emul(s,2)),next=purchase(s,i);if(!next)return null;const after=steady(next),gain=after-before,saving=target-cost(next,8,emul(next,2)),afterWait=goalWait(next),value=goal==='mega'?(Number.isFinite(wait)?wait-afterWait:Number.isFinite(afterWait)?Number.MAX_VALUE/(1+afterWait):gain>0?gain/price:0):gain*horizon-price;return {id:i,name:D.upgrades[i].name,cost:price,level:level(next,i),gain,gainPct:before>0?100*gain/before:0,saving,payback:gain>0?price/gain:Infinity,value,wait:afterWait,affordable:price<=budget};}).filter(x=>x&&x.affordable&&Number.isFinite(x.value)&&x.value>0).sort((a,b)=>b.value-a.value||a.cost-b.cost);}
// Roadmaps rank marginal production / target-discount benefit per meat invested.
// Future unlocks require real additional production, counted in the funding total.
function roadmapCandidates(s,options){const before=steady(s),target=cost(s,8,emul(s,2)),reserve=n(options.reserve);return ordinary.filter(i=>(D.upgrades[i].cap===999||s.paid[i]<D.upgrades[i].cap)&&!(options.holdCheap&&[0,2].includes(i)&&level(s,i)>=50&&level(s,21)===0)).map(i=>{const price=cost(s,i,emul(s,2)),extra=Math.max(0,price+reserve-s.wallet,required(i)-s.produced);if(!Number.isFinite(price+extra))return null;const funded=clone(s);funded.wallet+=extra;funded.produced+=extra;
 // Avoid floating-point rounding making an exactly funded purchase fail.
 funded.wallet=Math.max(funded.wallet,price+reserve);funded.produced=Math.max(funded.produced,required(i));
 const next=purchase(funded,i);if(!next)return null;const gain=steady(next)-before,saving=target-cost(next,8,emul(next,2)),benefit=(before>0?gain/before:gain)+(options.goal==='production'?0:saving/target),value=benefit/Math.max(1,price,required(i)-s.produced);return {id:i,name:D.upgrades[i].name,cost:price,level:level(next,i),gain,saving,value,extra,next,affordable:extra===0};}).filter(x=>x&&Number.isFinite(x.value)&&x.value>0).sort((a,b)=>b.value-a.value||a.cost-b.cost);}
function plan(s,options={}){let state=clone(s),steps=[],extra=0,spent=0;const roadmap=options.mode==='roadmap',limit=Math.min(5000,Math.max(1,integer(options.steps||500)));for(let i=0;i<limit;i++){if(options.goal!=='production'&&goalWait(state)===0)break;const best=(roadmap?roadmapCandidates(state,options):candidates(state,options))[0];if(!best)break;state=roadmap?best.next:purchase(state,best.id);extra+=best.extra||0;spent+=best.cost;const {next,...row}=best;steps.push({...row,wallet:state.wallet,extra:best.extra||0,totalExtra:extra,future:extra>0});}return {steps,state,extra,beforeRate:steady(s),afterRate:steady(state),beforeWait:goalWait(s),afterWait:goalWait(state),spent,limited:steps.length===limit};}
function smokeExpectedGain(s){const exponent=Math.max(.1,9-10*s.smokeSeconds/(7200+s.smokeSeconds)),qty=(1+bonus(s,25)/100)*(1+9*Math.min(1,gift(s,4)/100));let result=0;for(let i=0;i<5;i++){const chance=Math.pow((i+1)/5,1/exponent)-Math.pow(i/5,1/exponent);result+=chance*qty*D.smoke[i]/(100+s.smoke[i]*D.smoke[i]);}return result;}
function decay(s,seconds){for(let t=Math.max(0,seconds);t>0&&s.happiness>0;){const dt=Math.min(t,1/30);s.happiness=Math.max(0,s.happiness-Math.max(1,s.happiness/13)*dt);t-=dt;}}
function push(s,{patMode='current',maxGifts=1000,secondsPerGift=1,secondsPerPat=.15,training=1}={}){
 const state=clone(s),events=[];if(state.hourElapsed>=3600){state.hourElapsed=0;state.patsUsed=Math.min(0,state.patsUsed);}maxGifts=Math.min(5000,integer(maxGifts));secondsPerGift=Math.min(30,Math.max(.1,n(secondsPerGift)));secondsPerPat=Math.min(5,Math.max(.05,n(secondsPerPat)));training=Math.min(5,integer(training));let waited=0,pats=0,spent=0,payout=0;
 if(unlocked(state,8)&&state.wallet>=cost(state,8,emul(state,2)))return {state,events,pats:0,waited:0,spent:0,payout:0,reachable:true,reason:'Already enough meat; no pats or gifts needed',target:cost(state,8,emul(state,2)),gap:0};
 // Income while waiting/clicking and all random rewards are deliberately omitted.
 const applyPats=count=>{for(let i=0;i<count;i++){state.happiness+=petGain(state,emul(state,3));decay(state,secondsPerPat);}pats+=count;};
 if(patMode==='double'){const first=patsAvailable(state),regular=regularPats(state),until=Math.max(0,3600-Math.min(3600,state.hourElapsed)),duration=first*secondsPerPat; if(duration>until&&until>0)return {state,events,pats:0,waited:0,spent:0,payout:0,reachable:false,reason:'Not enough time to spend this pat batch before refresh. Use current pats or re-import after refresh.'};waited=Math.max(0,until-duration);decay(state,waited);applyPats(first);applyPats(regular);}
 else if(patMode==='current')applyPats(patsAvailable(state));
 const target=()=>cost(state,8,emul(state,2));const ready=()=>unlocked(state,8)&&state.wallet>=target();let reason='Gift limit reached';
 for(let i=0;i<maxGifts&&!ready();i++){
  if(!buyable(state,10)){reason='Open Gift is not unlocked in this run';break;}
  const price=cost(state,10,emul(state,1));if(!Number.isFinite(price)||price>state.wallet){reason='Cannot afford the next gift while Hustle is emulsified';break;}
  state.wallet-=price;spent+=price;state.paid[10]++;state.happiness+=purchaseHappy(state,emul(state,1));const gain=state.gifts.includes(1)?1200*rate(state,emul(state,1)):0;
  state.wallet+=gain;state.produced+=gain;payout+=gain;
  if(state.gifts.includes(2))state.happiness+=200;
  if(state.gifts.includes(3))state.traits[training]++;
  events.push({opening:i+1,cost:price,payout:gain,wallet:state.wallet,target:target(),happiness:state.happiness});
  if(ready())break;decay(state,secondsPerGift);
 }
 const reachable=ready();return {state,events,pats,waited,spent,payout,reachable,reason:reachable?'Enough meat for the next Megaflesh':reason,target:target(),gap:Math.max(0,target()-state.wallet),excluded:state.gifts.some(x=>[4,5,6].includes(x))};
}
const api={data:D,decode,clone,level,bonus,trait,gift,happiness,diceMulti,smokeMulti,coinMulti,rate,cost,required,unlocked,buyable,regularPats,patsAvailable,petGain,purchaseHappy,doubleChance,trainingSeconds,calibrated,purchase,candidates,plan,push,steady,goalWait,smokeExpectedGain,emul};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BubbaOptimizer=api;
})(typeof window!=='undefined'?window:globalThis);
