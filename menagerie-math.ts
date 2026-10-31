import { getResearchGridBonus } from './vendor/idleon-toolbox/parsers/world-7/research';
import { getVialsBonusByStat } from './vendor/idleon-toolbox/parsers/world-2/alchemy';
import { randomList, research, atomsInfo } from './vendor/idleon-toolbox/data/website-data';
import { getEventShopBonus, isCompanionBonusActive } from './vendor/idleon-toolbox/parsers/misc';
import { getGrimoireBonus } from './vendor/idleon-toolbox/parsers/class-specific/grimoire';
import { getCompassBonus } from './vendor/idleon-toolbox/parsers/class-specific/compass';
import { getTesseractBonus } from './vendor/idleon-toolbox/parsers/class-specific/tesseract';
import { getEmperorBonus } from './vendor/idleon-toolbox/parsers/world-6/emperor';
import { getSushiBonus } from './vendor/idleon-toolbox/parsers/world-7/sushiStation';

const read=(v:any)=>{try{return typeof v==='string'?JSON.parse(v):v;}catch{return undefined;}};
const n=(v:any)=>Number(v)||0;
export function getMenagerieAnalysis(raw:any,account:any){
 const d=read(raw?.data)||raw,m=read(d.Menagerie),s=read(d.Spelunk)||[],o=read(d.OptionsListAccount??d.OptLacc)||[],r=read(d.Research)||[];
 if(!Array.isArray(m)||m[0]?.[2]==null)return {available:false,reason:'Menagerie rank is absent from this export.'};
 const rank=n(m[0]?.[2]),boost=(i:number)=>n(m[3]?.[i])*n(research[58][i]);
 const companion=read(raw?.companion??d.companion??d.Companion);
 const companionsKnown=Array.isArray(read(companion?.l));
 // Client Stuff2("TotalOpalsEarned"): bonus Opals plus every cavern reward.
 const holes=read(d.Holes),gems=read(d.GemItemsPurchased);
 const opalsKnown=Array.isArray(holes?.[7])&&holes[7].every((v:any)=>v!=null&&v!==''&&Number.isFinite(Number(v)))&&companionsKnown;
 const bonusOpals=Math.round(n(gems?.[5])+getGrimoireBonus(account?.grimoire?.upgrades,11)
  +25*(isCompanionBonusActive(account,13)?n(account?.companions?.list?.[13]?.bonus):0)
  +getCompassBonus(account,52)+Math.floor(getEmperorBonus(account,3)+(n(holes?.[13]?.[102])>0?1:0))
  +getTesseractBonus(account,25)+getSushiBonus(account,56));
 const totalOpals=opalsKnown?holes[7].reduce((total:number,v:any)=>Math.round(total+Number(v)),bonusOpals):null;
 const bundles=read(d.BundlesReceived)||{},owned=(id:string)=>n((bundles.h||bundles)[id])===1;
 const jade=account?.sneaking?.jadeEmporium?.[47]?.unlocked?1:0;
 const crucible=n(m[2]?.[8])>=1?(randomList[115]||[]).slice(0,16).filter((v:any)=>n(o[628])>=n(v)).length:0;
 const factors=[
  ['Singularity',1+Math.round(5*n(o[620]))/100],
  ['Gaming Zuperbit',1+(account?.gaming?.superbitsUpgrades?.[69]?.unlocked?.valueOf()?0.25:0)],
  ['Arcade',1+n(account?.arcade?.shop?.[73]?.bonus)/100],
  ['Jade Emporium',1+.1*jade],
  ['Menagerie rank',1+boost(1)*rank/100],
  ['Research F4',1+getResearchGridBonus(account,165,0)/100],
  ...['ban_k','ban_l','ban_m'].map((id,i)=>['Bundle '+id,1+(owned(id)?[1,2,2][i]:0)])
 ].map(([name,value])=>({name,value:Number(value)}));
 const card=Object.values(account?.cards||{}).find((c:any)=>c.rawName==='w7b10'||c.id==='w7b10') as any;
 const additive=[
  ['Pink jellyfish',n(m[0]?.[4])],['Clamworks',n(o[464])>8?25:0],
  ['Event Shop: Extra Lumi',50*getEventShopBonus(account,62)],
  ['Companion',isCompanionBonusActive(account,116)?n(account?.companions?.list?.[116]?.bonus):0],
  ['Crucible',10*(crucible>4?1:0)+25*(crucible>14?1:0)],['Yellow jellyfish',3*n(m[0]?.[14])],
  ['Atom Collider',n(read(d.Atoms)?.[16])*n(atomsInfo[16]?.baseBonus)],
  ['Zenith Market',n(account?.zenith?.market?.[11]?.bonus)],
  ['Dancing Coral',n(account?.coralReef?.dancingCoral?.[6]?.bonus)],
  ['Alchemy vial',n(getVialsBonusByStat(account?.alchemy?.vials,'7lumiadd'))],
  ['Research E4',getResearchGridBonus(account,164,0)],
  ['Magni Pufferfin card',Math.min(50,5*(n(card?.amount)>0?n(card?.stars)+1:0))]
 ].map(([name,value])=>({name,value:Number(value)}));
 const missing=['Research','Spelunk','Atoms','ArcadeUpg','Gaming','CauldronInfo','Cards0','BundlesReceived'].filter(k=>d[k]==null);
 if(!companionsKnown)missing.push('Companion ownership');
 if(d.TowerInfo==null&&d.Tower==null)missing.push('TowerInfo');
 if(d.OptionsListAccount==null&&d.OptLacc==null)missing.push('OptionsListAccount');
 const rate=rank<=0?0:10*factors.reduce((p,x)=>p*x.value,1)*(1+additive.reduce((p,x)=>p+x.value,0)/100);
 const missionSlots=Math.min(33,1+boost(0)+getResearchGridBonus(account,164,1)+jade+3*(owned('ban_k')?1:0));
 const lv=n(m[3]?.[1]),cost=3*lv+lv**1.5+(5+1**1.5)*Math.max(1.45,2.25-1/4*.15)**1*2.1**lv;
 const gain=rate/(1+boost(1)*rank/100)*n(research[58][1])*rank/100;
 const milestones=(randomList[115]||[]).map((wave:any,index:number)=>({wave:n(wave),earned:index<crucible}));
 const pipsqueak=companionsKnown?(isCompanionBonusActive(account,173)?n(account?.companions?.list?.[173]?.bonus):0):null;
 const ninja=read(d.Ninja)||[];
 const omnijade={dailyLevels:pipsqueak==null?null:Math.max(1,Math.min(5,Math.round(1+Math.ceil(pipsqueak/2)))),total:pipsqueak==null||ninja[103]?.[31]==null?null:Math.round(n(ninja[103][31])+pipsqueak),assigned:Array.isArray(m[6])?m[6].slice(0,17).filter((v:any)=>n(v)>0).length:null,pipsqueak};
 return {available:true,totalOpals,complete:missing.length===0,missing,rate:missing.length?null:rate,factors,additive,missionSlots,crucible,milestones,omnijade,bestCrucibleWave:n(o[628]),
  nextLumiBoost:{level:lv,cost,gain:missing.length?null:gain,paybackHours:missing.length||gain<=0?null:cost/gain,affordable:n(m[0]?.[0])>=cost}};
}
