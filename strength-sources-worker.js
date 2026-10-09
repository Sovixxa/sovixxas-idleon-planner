'use strict';
importScripts('connected-trace-runtime.js','connected-trace-engine.js','connected-primary-stats.js');
// This view needs source values, not the much larger full calculation traces.
self.ConnectedTrace={disabled:true,enter(){},leave(){},value:(_id,_name,value)=>value};
self.onmessage=({data:raw})=>{
 try{
  const copy=structuredClone(raw),data=typeof copy.data==='string'?JSON.parse(copy.data):copy.data||copy;
  if(!Object.keys(data).some(k=>/^CharacterClass_\d+$/.test(k))){postMessage({characters:[]});return;}
  const p=PrayerMath.parseData(data,copy.charNames,copy.companion,copy.guildData,copy.serverVars||{},copy.accountCreateTime,copy.tournament);
  const characters=p.characters.map((ch,i)=>({name:copy.charNames?.[i]||`Character ${i+1}`,stats:Object.fromEntries(ConnectedPrimaryStats.calculate(ch,p.account,p.characters,PrayerMath).map(s=>[s.stat.toLowerCase(),s]))}));
  const account=sharedStats(p,characters);
  postMessage({characters,account});
 }catch(error){postMessage({error:error.message});}
};

function sharedStats(p,characters){
 const M=PrayerMath,a=p.account,pretty=s=>String(s).replaceAll('_',' '),result={};
 if(!characters.length)return result;
 for(const [i,key] of ['str','agi','wis','luk'].entries()){
  const stat=key.toUpperCase(),original=characters[0].stats[key];
  const keep=/^(Account talent · |(?:STR|AGI|WIS|LUK) stamp$|All-stat stamp$|Shimmer Island|Family · |Cooking · |Guild · |Sigil · |Alchemy · |Breeding · |Arcade · |Orion · |Pristine charm · |Alchemy vials · |Lab · |All-stat % stamp$|Summoning win bonus$|Sailing · |Achievement · |Event stat bonuses$|Farming · |Voting · |Armor set · |Companion · Sandy Pot$)/;
  const rows=original.rows.filter(r=>keep.test(r.name)).map(r=>({...r}));
  const bubble=id=>{const b=a.alchemy.bubblesFlat.find(b=>b.stat===id);return b?M.getBubbleBonus(a,b.bubbleName,false,false):0;};
  const set=(name,value)=>{const r=rows.find(r=>r.name===name);if(r)r.value=value;};
  const setBubble=(id,value)=>{const b=a.alchemy.bubblesFlat.find(b=>b.stat===id);if(b)set('Alchemy · '+pretty(b.bubbleName),value);};
  setBubble(['W4','A4','M4','A4'][i],bubble(['W4','A4','M4','A4'][i])*Math.floor(a.looty.totalItems/100));
  if(i<3){const id=['W8','A9','M9'][i];setBubble(id,bubble(id)*Math.max(0,Math.floor((a.tome.totalPoints-5000)/2000))*(1+(M.getGrimoireBonus(a.grimoire?.upgrades,17)+M.getArmorSetBonus(a,'TROLL_SET'))/100));}
  setBubble('Total'+stat,bubble('Total'+stat));
  const family=(name,cls)=>Math.max(0,...p.characters.filter(c=>M.checkCharClass(c.class,cls)).map(c=>M.getFamilyBonusBonus(M.classFamilyBonuses,name,c.level)));
  set('Family · '+stat,family('TOTAL_'+stat,['Warrior','Archer','Mage','Beginner'][i]));set('Family · All Stat',family('ALL_STAT','Bubonic_Conjuror'));
  const sum=stage=>rows.filter(r=>r.stage===stage).reduce((n,r)=>n+r.value,0);
  const baseTotal=sum('Base additions')+Math.floor(sum('Shared all-stat base')),multiplier=1+(sum('Additive stat %')+Math.floor(sum('All-stat % pool')*10)/10)/100,outside=sum('Post-multiplier additions');
  result[key]={stat,rows,baseTotal,multiplier,outside,computed:Math.floor(baseTotal*multiplier+outside),accountWide:true,unknown:original.unknown};
 }
 return result;
}
