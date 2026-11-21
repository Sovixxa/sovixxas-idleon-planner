(function(root){'use strict';
const catalog=typeof module!=='undefined'?require('./equipment-stones-data'):root.EquipmentStones;
const KEYS=['Weapon_Power','Defence','STR','AGI','WIS','LUK','UQ1val','UQ2val'];
const ARMOR='aHelmet aShirt aPants aShoes aPendant aRing'.split(' '),TOOLS='aPick aHatchet aFishingRod aBugNet aTrap aSkull aDNAgun'.split(' '),MYSTERY=[...ARMOR,'aWeapon','aPick','aHatchet','aObol'];
const cache=new Map();
function options(base){
 const type=base.typeGen,groups=new Set();if(ARMOR.includes(type))groups.add(1);if(TOOLS.includes(type))groups.add(2);if(type==='aWeapon')groups.add(0);if(type==='aHelmet')groups.add(4);if(MYSTERY.includes(type))groups.add(5);
 const result=[],seen=new Set();function add(v,id,relaxed=false){const key=v.join(',');if(!seen.has(key)){seen.add(key);result.push({v,id,relaxed});}}
 for(const stone of catalog.filter(s=>groups.has(s.group))){
 if(stone.group===5)continue;
 let vectors=[Array(8).fill(0)];for(const part of stone.effect.split('.')){let [key,value]=part.split(',');value=Number(value);if(key==='Main_Stat'||key==='Random_Stat'){vectors=vectors.flatMap(v=>[2,3,4,5].map(i=>{const w=v.slice();w[i]+=value;return w;}));}else{if(key==='Misc_Bonus')key=Number(base.UQ1val)?'UQ1val':'Defence';const i=KEYS.indexOf(key);if(i<0)return null;vectors.forEach(v=>v[i]+=value);}}
 vectors.forEach(v=>add(v,stone.id));if(stone.failure)add(Array(8).fill(0),'Failed '+stone.id);
 }
 // Superset of mystery outcomes: ignore order-dependent stat-floor and UQ eligibility.
 // It can prevent a conclusion, never manufacture a confirmed history.
 if(groups.has(5))for(let i=0;i<8;i++)for(let value=-(i<6?20:1);value<=(i<6?20:1);value++){if(!value)continue;const v=Array(8).fill(0);v[i]=value;add(v,'Mystery stone',true);}
 return result;
}
function craft(v){if(v[0]||v[1]||v[6]||v[7])return false;const positive=v.slice(2,6).filter(n=>n!==0);return positive.length===0||positive.length===1&&[1,2,3,4,7,8,9,10,11,12].includes(positive[0]);}
function search(target,count,opts,limit=12000,craftTarget=null){
 if(craftTarget)target=target.map((v,i)=>v-craftTarget[i]);
 if(count<0)return {possible:false};if(count>30)return {possible:null};let nodes=0,aborted=false;const dead=new Set();
 const directions=[];for(let i=0;i<8;i++){const v=Array(8).fill(0);v[i]=1;directions.push(v,v.map(x=>-x));}for(const indexes of [[0,1],[0,2,3,4,5],[1,2,3,4,5],[0,1,2,3,4,5],[2,3,4,5]]){const v=Array(8).fill(0);indexes.forEach(i=>v[i]=1);directions.push(v);}
 const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),bounds=directions.map(v=>({v,max:Math.max(...opts.map(o=>dot(v,o.v))),craft:craftTarget?0:Math.max(0,...v.slice(2,6))*12}));
 // Prefer high-tier stones; regular witnesses are cheaper and explainable.
 const sorted=opts.slice().sort((a,b)=>Number(a.relaxed)-Number(b.relaxed)||dot(b.v,target)-dot(a.v,target));
 const suffix=Array(sorted.length+1);suffix[sorted.length]=bounds.map(()=>-Infinity);for(let i=sorted.length-1;i>=0;i--)suffix[i]=bounds.map((b,j)=>Math.max(dot(sorted[i].v,b.v),suffix[i+1][j]));
 function visit(rem,n,start){if(++nodes>limit){aborted=true;return null;}if(!n)return (craftTarget?rem.every(v=>v===0):craft(rem))?[]:null;
 if(bounds.some((b,j)=>dot(rem,b.v)>n*suffix[start][j]+b.craft))return null;
 const key=n+':'+start+':'+rem.join(',');if(dead.has(key))return null;
 for(let i=start;i<sorted.length;i++){const o=sorted[i],next=rem.map((v,j)=>v-o.v[j]);const found=visit(next,n-1,i);if(found)return [o,...found];if(aborted)return null;}
 dead.add(key);return null;}
 const history=visit(target,count,0);return {possible:history?true:aborted?null:false,history,nodes};
}
function infer(base,changes,{limit=12000,successfulOnly=false,singleType=false,modernOnly=false}={}){
 const slots=Number(base?.Upgrade_Slots_Left),delta=changes?.Upgrade_Slots_Left;
 if(!base||!Number.isInteger(slots)||slots<=0||!Number.isInteger(delta)||slots+delta<0||changes.Premiumified||!base.typeGen||/Tempest/.test(base.id||''))return {status:'Uncertain'};
 const allOptions=options(base)?.filter(o=>!modernOnly||['StoneW8','StoneW9','StoneA7','StoneA8','StoneT7','StoneT8'].includes(o.id)),opts=successfulOnly?allOptions?.filter(o=>!o.relaxed&&!o.id.startsWith('Failed ')):allOptions;if(!opts?.length||KEYS.some(k=>!Number.isFinite(changes[k])))return {status:'Uncertain'};
 const target=KEYS.map(k=>changes[k]);if(target.some(n=>!Number.isInteger(n)))return {status:'Uncertain'};
 const key=JSON.stringify([base.typeGen,Number(base.UQ1val)||0,slots,delta,target,limit,successfulOnly,singleType,modernOnly]);if(cache.has(key))return cache.get(key);
 const regular=opts.filter(o=>!o.relaxed);
 const solve=count=>{if(singleType&&successfulOnly){let incomplete=false;for(const id of new Set(regular.map(o=>o.id))){const result=search(target,count,regular.filter(o=>o.id===id),limit);if(result.possible===true)return result;if(result.possible===null)incomplete=true;}return {possible:incomplete?null:false};}const quick=search(target,count,regular,limit);return quick.possible===true||regular.length===opts.length?quick:search(target,count,opts,limit);};
 const without=solve(-delta),withSlot=solve(1-delta);
 let status='Uncertain',proof;
 if(without.possible===false&&withSlot.possible===true&&!withSlot.history.some(o=>o.relaxed)){status='Present';proof=withSlot;}
 if(withSlot.possible===false&&without.possible===true&&!without.history.some(o=>o.relaxed)){status='Missing';proof=without;}
 const result={status,successfulOnly,singleType,reason:without.possible===null||withSlot.possible===null?'Search limit':without.possible===true&&withSlot.possible===true?'Both slot counts fit':'No matching history',without:without.possible,withSlot:withSlot.possible};
 const describe=(candidate,bonus)=>candidate.possible===true&&!candidate.history.some(o=>o.relaxed)?{bonus,used:candidate.history.length,stones:candidate.history.reduce((o,s)=>(o[s.id]=(o[s.id]||0)+1,o),{}),craft:target.map((v,i)=>v-candidate.history.reduce((s,o)=>s+o.v[i],0))}:null;
 if(without.possible===true&&withSlot.possible===true)result.matches=[describe(without,0),describe(withSlot,1)].filter(Boolean);
 if(proof){result.used=proof.history.length;result.remaining=slots+delta;result.base=slots;result.stones=proof.history.reduce((o,s)=>(o[s.id]=(o[s.id]||0)+1,o),{});result.craft=target.map((v,i)=>v-proof.history.reduce((s,o)=>s+o.v[i],0));}
 if(modernOnly){
  const rolls=[Array(8).fill(0)];for(let stat=2;stat<=5;stat++)for(const amount of [1,2,3,4,7,8,9,10,11,12]){const roll=Array(8).fill(0);roll[stat]=amount;rolls.push(roll);}
  const candidates=[];let complete=true;
  for(const roll of rolls){let fits=false;for(const [bonus,possibility] of [[0,without.possible],[1,withSlot.possible]]){if(possibility===false)continue;const attempt=search(target,bonus-delta,opts,limit,roll);if(attempt.possible===null)complete=false;if(attempt.possible===true){fits=true;break;}}if(fits)candidates.push(roll.slice(2,6));}
  result.godlyCandidates=candidates;result.godlyComplete=complete;
 }
 if(cache.size>1000)cache.clear();cache.set(key,result);return result;
}
const api={infer,search,options,KEYS};if(typeof module!=='undefined')module.exports=api;else root.EquipmentSlotCheck=api;
})(typeof window!=='undefined'?window:globalThis);
