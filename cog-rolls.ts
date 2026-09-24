// Client: WorkbenchStuff2 64557–64569; daily Jewel gate 63861;
// Gaming SuperBitType 71168; LegendPTS_bonus 71803; Tiny bonuses 72547.
const jewelNames=['Topaz','Ruby','Amethyst','Garnet','Emerald','Bluegem'];
function cogRollPower(level:number,tier:number){return Math.pow(3,Math.min(3.4,tier))+.25*Math.pow(level/3+.7,1.4+.05*tier);}
function cogExpRoll(value:number){return Math.max(Math.floor(Math.pow(value,.4)+10*Math.log(Math.max(value,1))/2.30259-5),2);}
export function cogRollCaps(level:number,tier:number){
 if(!Number.isFinite(level)||level<1||level>1e7||!Number.isInteger(tier)||tier<0||tier>4)throw new Error('Invalid cog level or tier.');
 const rolls=3+Math.floor(Math.min(3,tier)/2),max=Math.ceil(3*cogRollPower(level,tier))-1;
 return {build:rolls*max,flag:tier===4?0:rolls*Math.round(Math.pow(max,.8)),exp:rolls*cogExpRoll(max),rolls};
}
export function cogSpecialStats(level:number){
 cogRollCaps(level,0);
 const tier=level<15?0:level<40?1:level<70?2:3,value=2.5*cogRollPower(level,tier)*(1.5+.5*tier);
 return {yang:{buildBoost:Math.floor(50+level/(level+80)*120),expBoost:Math.floor(50+level/(level+80)*160)},yin:{build:Math.floor(value),flag:Math.floor(Math.pow(value,.8)),exp:cogExpRoll(value)}};
}
const cogUnwrap=(v:any)=>{try{const p=typeof v==='string'?JSON.parse(v):v;return p?.h&&typeof p.h==='object'?p.h:p;}catch{return undefined;}};
export function jewelAllowance(data:any={}){
 const gaming=cogUnwrap(data.Gaming),spelunk=cogUnwrap(data.Spelunk),talents=cogUnwrap(spelunk?.[18]),opts=cogUnwrap(data.OptLacc??data.OptionsListAccount);
 const unlocked=gaming?.[12]==null?null:String(gaming[12]).includes('G'); // Number2Letter[33]
 const points=talents?.[18]==null?null:Number(talents[18]);
 const daily=unlocked===false?0:unlocked===true&&Number.isFinite(points)&&points!>=0?Math.round(1+2*points!):null;
 const used=opts?.[414]==null?null:Number(opts[414]);
 return {unlocked,points,daily,used:Number.isFinite(used)?used:null,remaining:daily!=null&&used!=null&&Number.isFinite(used)?Math.max(0,daily-used):null};
}
export function cogRandom(seed:number){let state=seed>>>0;return ()=>{state+=0x6D2B79F5;let t=state;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function rollCog(level:number,tier:number,rng:()=>number){
 const int=(a:number,b:number)=>a+Math.floor(rng()*(b-a+1)),stats:any={a:0,c:0,d:0};
 const rolls=int(2+Math.floor(Math.min(3,tier)/2),3+Math.floor(Math.min(3,tier)/2));
 for(let i=0;i<rolls;i++){
  const strength=int(1,100+40*Math.floor(tier/4)),max=strength<50?1.5:strength<75?2:3;
  const value=Math.floor((.4+rng()*(max-.4))*cogRollPower(level,tier)),kind=int(1,100);
  if(kind<69)stats.a+=value;else if(kind<89&&tier!==4)stats.c+=Math.round(Math.pow(value,.8));else stats.d+=cogExpRoll(value);
 }
 let shape='',bonus='',amount=0,jewel=0;
 const direction=()=>rng()<.25?'up':rng()<.334?'down':rng()<.5?'left':'right';
 if(tier===0&&rng()<.1){shape=rng()<.5?'adjacent':'diagonal';bonus='e';amount=int(5,10);}
 if(tier===1&&rng()<.25){shape=rng()<.8?(rng()<.5?'adjacent':'diagonal'):direction();bonus=rng()<.7?'e':'g';amount=int(8,15);}
 if(tier===2&&rng()<.1){shape=rng()<.6?(rng()<.5?'adjacent':'diagonal'):rng()<.8?direction():rng()<.5?'row':'column';bonus=rng()<.65?'e':rng()<.4?'g':rng()<.5?'f':'k';amount=int(12,40);}
 if(tier===3&&rng()<.1){shape=rng()<.6?direction():rng()<.4?'row':rng()<.8?'column':'corners';bonus=rng()<.5?'e':rng()<.3?'g':rng()<.3?'f':'j';amount=int(20,65);}
 if(tier===4)for(let step=1;step<=5;step++){
  if(rng()>=.35)break;jewel=step;shape='';bonus='';amount=0;
  shape=rng()<.25?'row':rng()<.334?'column':'';
  if(shape){bonus=rng()<.5?'e':'f';amount=int(30,40)+23*step;}
 }
 if(shape){stats.h=shape;stats[bonus]=amount;}
 const suffix:any={adjacent:'ad',diagonal:'di',up:'up',down:'do',left:'le',right:'ri',row:'ro',column:'co',corners:'cr'};
 return {item:tier===4?'CogCry'+jewel:'Cog'+tier+(suffix[shape]||'A0'),name:tier===4?jewelNames[jewel]+' cog':['Basic','Decent','Superb','Ultimate'][tier]+' cog',stats,tier,jewel};
}
export function realisticBoard(model:any,options:any={},onProgress?:any){
 const level=Number(options.level),days=Number(options.days??30),daily=Number(options.dailyJewels??0),ordinary=Number(options.ordinaryDaily??100),tier=Number(options.ordinaryTier??3);
 cogRollCaps(level,tier);
 if(tier>3)throw new Error('Ordinary production must be Basic, Decent, Superb, or Ultimate.');
 if(!Number.isInteger(days)||days<0||days>365||!Number.isInteger(daily)||daily<0||daily>100||!Number.isInteger(ordinary)||ordinary<0||ordinary>5000)throw new Error('Use 0–365 days, 0–100 daily Jewels, and 0–5,000 ordinary rolls/day.');
 if(options.dailyLimit!=null&&daily>Number(options.dailyLimit))throw new Error('Daily Jewel rolls exceed your saved allowance.');
 const jewelRolls=days*daily,ordinaryRolls=days*ordinary;
 if(jewelRolls+ordinaryRolls>200000)throw new Error('Limit the forecast to 200,000 rolls by reducing days or ordinary rolls/day.');
 if(!model.board.some((s:any)=>s.isPlayer&&number(s.stats.b)>0))throw new Error('Load a save with player EXP rates on the board.');
 const samples:any[]=[];
 for(let sample=0;sample<5;sample++){
  onProgress?.({message:`${days}-day model: rolling and optimizing sample ${sample+1} / 5`});
  const rng=cogRandom(19473+sample*100003),generated:any[]=[];
  for(let i=0;i<ordinaryRolls+jewelRolls;i++){
   const cog=rollCog(level,i<ordinaryRolls?tier:4,rng);
   if(cog.stats.d>0||cog.stats.f>0)generated.push(cog);
  }
  // Retain a bounded EXP candidate pool, not an unlimited supply of every roll.
  const keep=new Set<any>();
  generated.sort((a,b)=>b.stats.d-a.stats.d).slice(0,96).forEach(c=>keep.add(c));
  for(const shape of ['adjacent','diagonal','up','down','left','right','row','column','corners']){
   const shaped=generated.filter(c=>c.stats.h===shape&&c.stats.f>0);
   shaped.sort((a,b)=>b.stats.f-a.stats.f||b.stats.d-a.stats.d).slice(0,24).forEach(c=>keep.add(c));
   shaped.sort((a,b)=>b.stats.d-a.stats.d||b.stats.f-a.stats.f).slice(0,24).forEach(c=>keep.add(c));
  }
  const future=Array.from(keep).map((c:any,i)=>({...c,index:252+i,isPlayer:false,empty:false,known:true,statsKnown:true,locked:false,flag:false,ideal:true,forecast:true,zone:'Future roll'}));
  const extended={...model,slots:[...model.slots,...future],shelf:[...model.shelf,...future]};
  const plan=optimize(extended,'exp',350),slots=extended.slots.slice();
  for(const move of plan.moves)[slots[move.from],slots[move.to]]=[slots[move.to],slots[move.from]];
  samples.push({plan,slots});
 }
 samples.sort((a,b)=>a.plan.totalsAfter.exp-b.plan.totalsAfter.exp);
 const {plan,slots}=samples[2],shopping:any={};
 plan.board.forEach((s:any,i:number)=>{if(!s.forecast)return;const key=[s.item,s.stats.h,s.stats.f,s.stats.d].join(':');if(!shopping[key])shopping[key]={tier:s.tier,name:s.name,shape:s.stats.h||'',boost:s.stats.f||0,d:s.stats.d,positions:[],forecast:true};shopping[key].positions.push(i);});
 const usefulChance=Math.pow(.35,5)*(.25+.75*.334)*.5;
 return {mode:'realistic',slots,board:plan.board,before:plan.totalsBefore,after:plan.totalsAfter,rates:plan.ratesAfter,shopping:Object.values(shopping),level,jewels:daily>0,fullBoard:false,warnings:plan.warnings,characters:plan.board.flatMap((s:any,i:number)=>s.isPlayer?[{name:s.name,from:s.index,to:i,exp:plan.ratesAfter[i].exp}]:[]),forecast:{days,daily,ordinary,tier,jewelRolls,ordinaryRolls,samples:5,low:samples[0].plan.totalsAfter.exp,high:samples[4].plan.totalsAfter.exp,newJewels:plan.board.filter((s:any)=>s.forecast&&s.tier===4).length,newOrdinary:plan.board.filter((s:any)=>s.forecast&&s.tier!==4).length,expectedBluegemXP:jewelRolls*usefulChance,chanceBluegemXP:1-Math.pow(1-usefulChance,jewelRolls)}};
}
