(function(root){'use strict';
const parse=v=>{if(typeof v==='string')try{return JSON.parse(v);}catch{return null;}return v;};
const number=v=>v==null||v===''||!Number.isFinite(Number(v))?null:Number(v);
const text=v=>String(v??'').replace(/[_|@]/g,' ').replace(/膛/g,'').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>v==null?'Unknown':Number(v).toLocaleString('en',{maximumFractionDigits:2});
function boostCost(id,level){const exponent=[8,10,12].includes(id)?35:[17,5,2].includes(id)?22.8:id===6?3.5:[0,1,7].includes(id)?2.1:1.3;return 3*level+level**1.5+(5+id**1.5)*Math.max(1.45,2.25-id/4*.15)**id*exponent**level;}
const unlockCost=id=>(10+id*id)*Math.max(1.6,2.5-id/4*.15)**id;
function decode(raw={},catalog=root.WORLD7_CATALOG,extra=root.UPDATE_CATALOG){
 const data=parse(raw.data??raw.rawData)||raw,m=parse(data.Menagerie),r=parse(data.Research)||[],s=parse(data.Spelunk)||[],opt=parse(data.OptionsListAccount??data.OptLacc)||[],div=parse(data.Divinity)||[],R=catalog.Research;
 const known=Array.isArray(m)&&m.length>0,at=(row,col)=>known?number(m[row]?.[col]):null,rank=at(0,2),lumi=at(0,0);
 const levels=R[57].map((_,i)=>at(3,i)),boost=i=>levels[i]==null?null:levels[i]*Number(R[58][i]);
 const unlocks=R[56].map((description,id)=>({id,name:text(description),hint:text(R[62][id]),owned:at(2,id)==null?null:at(2,id)>=1,available:rank==null?null:id<Math.min(7,rank)+Math.floor(Math.max(0,rank-7)/2),cost:unlockCost(id)}));
 const boosts=R[57].map((description,id)=>({id,name:text(description),level:levels[id],value:boost(id),available:rank==null?null:id<Math.min(6,rank)+Math.floor(Math.max(0,rank-6)/2),cost:levels[id]==null?null:boostCost(id,levels[id]),effect:levels[id]==null?text(description):text(description).replace('{',fmt(boost(id))).replace('}',fmt(1+boost(id)/100))}));
 const arr=key=>parse(data[key]),opts={1:232,4:319,8:464,14:594,22:369};
 function progress(id){
  const sum=list=>Array.isArray(list)&&list.every(x=>number(x)!=null)?list.reduce((a,b)=>a+Number(b),0):null;
  if(id in opts)return number(opt[opts[id]]);
  if(id===5)return sum(arr('TotemInfo')?.[0]);
  if(id===10){const sushi=arr('Sushi')?.[5];if(!Array.isArray(sushi))return null;let count=0;while(count<Math.min(64,sushi.length)&&number(sushi[count])!=null&&Number(sushi[count])>=0)count++;return count;}
  if(id===15)return sum(r[9]);
  if(id===30){const kills=arr('Ninja')?.[105];return Array.isArray(kills)?kills.reduce((n,k)=>n+(k<100?0:k<250?1:k<1000?2:k<5000?3:k<25000?4:k<100000?5:k<1000000?7:10),0):null;}
  if(id===2){const a=sum(s[1]),b=sum(s[47]);return a==null||b==null?null:Math.round(a+b);}
  if(id===13)return sum(r[12]);
  if(id===18){const a=arr('Sailing')?.[3];return Array.isArray(a)?Math.round(a.reduce((a,b)=>a+Math.max(0,Number(b)||0),0)):null;}
  if(id===28)return sum(s[9]);
  if(id===29||id===32){let k=arr('KRbest');if(!k)return null;k=k.h||k;return Math.round(Object.entries(k).filter(([key])=>id===29?/^SummzTrz[0-6]$/.test(key):!key.includes('SummzTrz')).reduce((a,[,v])=>a+(Number(v)||0),0));}
  if(id===31){const row=arr('CauldronP2W')?.[4];return Array.isArray(row)?Math.round(row.filter((_,i)=>i%2===1).reduce((a,v)=>a+Number(v)+1,0)):null;}
  if(id===0){const keys=Object.keys(data).filter(k=>/^Lv0_\d+$/.test(k));return keys.length?keys.reduce((n,k)=>n+(number(parse(data[k])?.[0])||0),0):null;}
  if(id===3){const crops=arr('FarmCrop');return crops?Object.keys(crops.h??crops).length:null;}
  if(id===6)return div[25]==null?null:Math.round(Number(div[25])-10);
  if(id===7)return number(arr('Meals')?.[0]?.[0]);
  if(id===9||id===11)return number(r[7]?.[id===9?4:9]);
  if(id===17)return Array.isArray(r[11])?r[11].length:null;
  if(id===19){const slab=arr('Cards')?.[1]??arr('Cards1');return Array.isArray(slab)?slab.length:null;}
  if(id===20){const p=arr('Printer');if(!Array.isArray(p))return null;const i=p.indexOf('Copper');return i<0?0:Math.ceil(Math.log10(Math.max(1,Number(p[i+1]))));}
  if(id===21)return Array.isArray(arr('GreenStacks'))?arr('GreenStacks').length:null;
  if(id===23){const x=arr('Holes')?.[11];return x?[1,3,5,7].reduce((n,i)=>n+(Number(x[i])||0),0):null;}
  if(id===24){const bits=number(arr('Gaming')?.[0]);return bits==null?null:Math.floor(Math.log10(Math.max(1,bits)));}
  if(id===25||id===26){const v=number(opt[id===25?262:279]);return v==null?null:Math.round(v-(id===25?9:11));}
  if(id===27){const v=number(arr('Bubba')?.[1]?.[8]);return v==null?null:Math.round(v-11);}
  return null;
 }
 const missions=R[52].map((name,id)=>{const level=at(1,id),target=level==null?null:Math.floor(Number(R[54][id])+Number(R[53][id])*level),value=progress(id);return{id,name:text(name),label:text(R[55][id]),level,target,value,ready:target==null||value==null?null:value>=target};});
 const shellsRequired=rank==null?null:Math.round(Math.min(15,1+Math.min(1,Math.floor(rank/3))+Math.min(1,Math.floor(rank))+Math.min(8,Math.floor(Math.max(0,rank-5)/5))+Math.min(1,Math.floor(rank/8))+Math.min(2,Math.floor(rank/22))));
 const singularity=(catalog.Spelunky[25]||[]).slice(6).map((description,i)=>{const level=number(opt[616+i]),id=i+6,bonus=level==null?null:Math.round(i===3?125*level/(level+100):[100,10,50,0,5,1][i]*level),cost=level==null?null:(i>=4?(5+2*i)**i*1.85**level:(7+2*i)**i*1.13**level);return{id,name:text(description),level,bonus,cost};});
 const scurge=(catalog.Spelunky[27]||[]).slice(9).map((description,id)=>{const level=at(5,id),bonus=level==null?null:level*Number(catalog.Spelunky[28][9+id]);return{id,name:text(description),level,bonus,required:[0,5,10,25,50,100,250,500,1000][id]};});
 const boats=arr('Boats'),nightLevels=Array.isArray(boats)?boats.slice(0,20).reduce((n,b)=>n+Math.max(0,(Number(b?.[3])||0)+(Number(b?.[5])||0)-600),0):null;
 const pinkCosts=known?[1e35*(350+150*Number(m[0][3]||0))**Number(m[0][3]||0),1e30*6**Number(m[0][4]||0)]:null;
 const yellowLevels=[11,12,13,14].reduce((a,i)=>a+Number(m?.[0]?.[i]||0),0),yellowCost=known?1e5*Math.max(3.2,8-.15*yellowLevels)**yellowLevels:null;
 const scurgeExpRequired=known?(50+15*Number(m[0][8]||0))*1.08**Number(m[0][8]||0):null;
 return{pinkCosts,yellowCost,scurgeExpRequired,known,rank,lumi,shells:at(0,1),shellsRequired,missions,unlocks,boosts,singularity,scurge,scurgeLevel:at(0,8),scurgeExp:at(0,7),nightLevels,nightBonuses:nightLevels==null?null:[1+nightLevels/(nightLevels+10000)*1999,1+nightLevels/(nightLevels+10000)*499],spirals:number(opt[622]),time:number(opt[624]),kills:number(opt[623]),omegaBalls:number(opt[625]),jelly:m?.[0]||[],extra};
}
function render(host,raw){const model=decode(raw),token={};host._menagerieToken=token;let tab='Missions',filter='all',analysis=null;
 const status=(v,yes,no)=>v==null?'Unknown':v?yes:no;
 const tile=(icon,name,value,detail)=>`<article class="mena-tile"><img src="assets/${icon}.png" alt=""><div><strong>${esc(name)}</strong><span>${esc(value)}</span><small>${esc(detail)}</small></div></article>`;
 function paint(){
  const m=model;host.innerHTML=`<section class="menagerie-page"><div class="section-head compact"><div><p class="eyebrow">World 7 · Town</p><h2>Luminous Menagerie</h2></div><strong>Rank ${fmt(m.rank)} · ${fmt(m.lumi)} Lumi · ${fmt(m.shells)} / ${fmt(m.shellsRequired)} shells</strong></div>${!m.known?'<p class="muted">Import a save from the new update to see Menagerie progress.</p>':''}<nav class="skill-tabs" aria-label="Menagerie sections">${['Missions','Unlocks','Boosts','Jellyfish','Singularity','Scurge','Nightmariners','Crucible','Lumi sources'].map(t=>`<button class="skill-tab ${t===tab?'active':''}" data-mena-tab="${t}">${t}</button>`).join('')}</nav><div data-mena-body></div></section>`;
  const body=host.querySelector('[data-mena-body]');let content='';
  if(tab==='Missions'){content=`<p class="muted">Each claim awards a shell and raises that mission's next requirement. Locked missions cannot be claimed yet.</p><label>Show <select data-mena-filter><option value="all">All missions</option><option value="ready">Target reached</option></select></label><div class="mena-grid">${m.missions.filter(x=>filter!=='ready'||(x.ready&&analysis?.available&&x.id<analysis.missionSlots)).map(x=>tile('MenaIconY'+x.id,x.name.replace('{',fmt(x.target)).replace('$',x.id===20?'1e'+fmt(x.target):fmt(x.target)),`${fmt(x.value)} / ${fmt(x.target)} · ${analysis?.available&&x.id>=analysis.missionSlots?'Locked':status(x.ready,'Target reached','In progress')}`,`${x.label} · ${fmt(x.level)} claims`)).join('')}</div>`;}
  if(tab==='Unlocks')content=`<p class="muted">One-time unlocks cost Lumi. Higher Menagerie ranks open more slots.</p><div class="mena-grid">${m.unlocks.map(x=>tile('MenaIconO'+x.id,x.name,status(x.owned,'Owned',x.available?'Available':'Rank locked'),`${fmt(x.cost)} Lumi · ${x.hint==='_'?'':x.hint}`)).join('')}</div>`;
  if(tab==='Boosts')content=`<div class="mena-grid">${m.boosts.map(x=>tile('MenaIconP'+x.id,x.effect,`Lv ${fmt(x.level)} · ${status(x.available,'Available','Rank locked')}`,`${fmt(x.cost)} Lumi for next level${m.lumi!=null&&x.cost!=null&&x.available&&m.lumi>=x.cost?' · Affordable':''}`)).join('')}</div>`;
  if(tab==='Jellyfish')content=`<div class="mena-grid">${[[3,'Purple','Pink-jelly upgrades: '+fmt(number(m.jelly[3]))+' / '+fmt(number(m.jelly[4]))],[5,'Blue','Lab and other linked bonuses'],[7,'Red','Reading multiplier: '+fmt(m.known?Math.floor(Math.max(1,(Number(m.jelly[6])||0)**.74)):null)+'×'],[10,'Silver','Obol misc multiplier: '+fmt(m.known?1+(Number(m.jelly[9])||0)/100:null)+'×'],[12,'Yellow','Construction bonuses: '+[11,12,13,14].map((i,j)=>fmt(m.known?(Number(m.jelly[i])||0)*[25,15,10,3][j]:null)).join(' / ')],[23,'Green','Unlocked through Menagerie progression']].map(([id,name,detail])=>tile('MenaJelly'+([3,5,7,10,12,23].indexOf(id)+1),name+' jellyfish',status(m.unlocks[id].owned,'Unlocked','Locked'),detail)).join('')}</div>`;
  if(tab==='Jellyfish')content+=`<div class="mena-analysis"><h3>Next upgrades</h3><p>Pink jellyfish: ${fmt(m.pinkCosts?.[0])} for the next first upgrade; ${fmt(m.pinkCosts?.[1])} for another +1% additive Lumi.</p><p>Yellow jellyfish: ${fmt(m.yellowCost)} build progress for the next bonus. Choose +25% build, +15% Construction EXP, +10% flags, or +3% additive Lumi.</p></div>`;
  if(tab==='Crucible')content=`<p>Breeding Crucible: ${status(m.unlocks[8].owned,'Unlocked','Locked')}</p>`+(analysis?.available?`<p>Best wave: ${fmt(analysis.bestCrucibleWave)} · ${fmt(analysis.crucible)} / 16 rewards earned</p><div class="mena-grid">${analysis.milestones.map((x,i)=>tile('MenaIconO8','Wave '+x.wave,x.earned?'Earned':'Not earned',i===4?'+10% additive Lumi':i===14?'+25% additive Lumi':'Crucible reward '+(i+1))).join('')}</div>`:'<p>Import a complete save to calculate earned rewards.</p>');
  if(tab==='Singularity')content=`<p>Coral Kid Singularity: ${status(m.unlocks[2].owned,'Unlocked','Locked')} · ${fmt(m.time)} hours elapsed · ${fmt(m.kills)} kills · ${fmt(m.spirals)} Spirals</p><p class="muted">Transmute Divinity points into Singularity Spirals at the Coral Kid.</p><div class="mena-grid">${m.singularity.map(x=>tile('CKsing',x.name.replaceAll('{',fmt(x.bonus)).replaceAll('}',fmt(x.bonus==null?null:1+x.bonus/100)),'Saved level '+fmt(x.level),fmt(x.cost)+' Spirals for next level')).join('')}</div>`;
  if(tab==='Scurge')content=`<p>Clamworks Scurge: ${status(m.unlocks[4].owned,'Unlocked','Locked')} · Lv ${fmt(m.scurgeLevel)} · ${fmt(m.scurgeExp)} / ${fmt(m.scurgeExpRequired)} EXP</p><div class="mena-grid">${m.scurge.map(x=>tile('MenaIconO4',x.name.replaceAll('}',fmt(x.bonus==null?null:1+x.bonus/100)).replaceAll('$',x.id===7?'[depends on players]':fmt(x.level==null?null:x.id===2?null:x.id===3?100-100/(1+x.bonus/100):x.id===6?100*Math.min(.8,x.level/(x.level+25)*.75):1+x.bonus)),'Lv '+fmt(x.level),'1 green pearl · Requires Scurge Lv '+x.required)).join('')}</div>`;
  if(tab==='Nightmariners')content=`<p>Sailing Nightmariners: ${status(m.unlocks[13].owned,'Unlocked','Locked')}</p><div class="mena-grid">${tile('MenaIconO13','Ship levels above 600',fmt(m.nightLevels),'Combined loot and speed upgrade levels per ship')}${tile('MenaIconO13','Nightmariner multipliers',m.nightBonuses?m.nightBonuses.map(x=>fmt(x)+'×').join(' / '):'Unknown','Artifact find chance / Captain EXP · Requires the Nightmariner unlock')}</div>`;
  if(tab==='Lumi sources')content=`<p class="muted">Starts at 10 Lumi per hour after rank 1. Separate multipliers multiply together; additive sources share one percentage pool. This is a source checklist, not an account-rate estimate.</p><div class="mena-grid">${[
   ['CKsing','Coral Kid Singularity','Separate multiplier','Upgrade 11: +5% per level'],
   ['PachiShopICON73','Arcade','Separate multiplier','Hourly Lumi Gain · Omega upgrades multiply the bonus by 6'],
   ['MenaIconP1','Menagerie rank','Separate multiplier','Boost 2 scales with your Menagerie rank'],
   ['MenaJelly0','Research F4','Separate multiplier','Baby Menagerie'],
   ['MenaJelly0','Gaming Zuperbit','Separate multiplier','New Superbit 69: up to 25%'],
   ['MenaIconO0','Jade Emporium','Separate multiplier','Menagerie Maxxing: +10% and another mission'],
   ['MenaJelly1','Pink jelly upgrade','Additive pool','Saved bonus: '+fmt(number(m.jelly[4]))+'%'],
   ['MenaIconO4','Clamworks','Additive pool','Work bonus 9 adds 25%'],
   ['MenaIconO8','Breeding Crucible','Additive pool','Crucible rewards 5 and 15 add 10% and 25%'],
   ['MenaJelly5','Yellow jellyfish','Additive pool','Construction Lumi bonus: '+fmt(m.known?3*(Number(m.jelly[14])||0):null)+'%'],
   ['Atom16','Atom Collider','Additive pool',text(m.extra.AtomInfo[16][5])],
   ['MenaJelly0','Zenith Market','Additive pool',text(m.extra.ZenithMarket[11][6])],
   ['Coral6','Gilded Coral','Additive pool','Dropped by Magni Pufferfin; scales with Crescent Shrine levels above 200'],
   ['MenaJelly0','Alchemy vial','Additive pool',text(m.extra.AlchemyDescription[4][86][0])],
   ['MenaJelly0','Research E4','Additive pool','New mission and Lumi bonuses'],
   ['CardsJ22','Magni Pufferfin card','Additive pool','Passive Lumi gain; 5% per card level, capped at 50%'],
   ['MenaJelly0','Menagerie bundles','Separate multipliers','The three bundles contribute ×2, ×3 and ×3 when owned'],
   ['MenaJelly0','Luminous Shell','Alchemy Liquid Shop','One shell; starts at 100,000 Liquid 4 and scales by 3.7 per purchase. Cost never resets.']
  ].map(x=>tile(...x)).join('')}</div>`;
  if(tab==='Lumi sources'&&analysis?.available){const next=analysis.nextLumiBoost;content=`<section class="mena-analysis"><h3>${fmt(analysis.rate)} Lumi / hour</h3>${analysis.missing.length?'<p>Missing source data: '+esc(analysis.missing.join(', '))+'</p>':''}<p>Next rank-scaling boost: ${fmt(next.cost)} Lumi → +${fmt(next.gain)} Lumi/hour. Payback: ${fmt(next.paybackHours)} hours. ${next.affordable?'Affordable':'Save more Lumi'}.</p><table><thead><tr><th>Source</th><th>Contribution</th></tr></thead><tbody>${analysis.factors.map(x=>`<tr><td>${esc(x.name)}</td><td>×${fmt(x.value)}</td></tr>`).join('')}${analysis.additive.map(x=>`<tr><td>${esc(x.name)}</td><td>+${fmt(x.value)}% in additive pool</td></tr>`).join('')}</tbody></table></section>`+content.replace('This is a source checklist, not an account-rate estimate.','The breakdown above uses your imported save.');}
  if(tab==='Missions'&&analysis?.available)content=`<p>${fmt(analysis.missionSlots)} mission slots unlocked. Targets below are progress checks; missions beyond those slots remain locked.</p>`+content;
  body.innerHTML=content;host.querySelectorAll('[data-mena-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.menaTab;paint();});const select=host.querySelector('[data-mena-filter]');if(select){select.value=filter;select.onchange=()=>{filter=select.value;paint();};}
 }
 paint();
 if(model.known&&typeof Worker!=='undefined'){const worker=new Worker('menagerie-worker.js');worker.onmessage=({data})=>{analysis=data;worker.terminate();if(host._menagerieToken===token&&host.querySelector('.menagerie-page'))paint();};worker.onerror=()=>worker.terminate();worker.postMessage(raw);}
}
const api={decode,boostCost,unlockCost,render};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Menagerie=api;
})(typeof window!=='undefined'?window:globalThis);
