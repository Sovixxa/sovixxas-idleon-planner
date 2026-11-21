import {calcUpgradeVaultBonus} from './vendor/idleon-toolbox/parsers/misc/upgradeVault';
import {getSushiBonus} from './vendor/idleon-toolbox/parsers/world-7/sushiStation';

const fmt=(v:number)=>v.toLocaleString('en-US',{maximumFractionDigits:3});
const parse=(v:any)=>typeof v==='string'?JSON.parse(v):v;
const milestone=(label:string,value:string,reached:boolean)=>({label,value,reached});
export function addGamingLimits(model:any,a:any,raw:any){
 const g=parse(raw.Gaming),s=parse(raw.GamingSprout),owned=(i:number)=>!!a.gaming.superbitsUpgrades?.[i]?.unlocked;
 const groups:any=Object.fromEntries(model.groups.map((g:any)=>[g.id,g]));
 const icons:any={bits:'nav-Gaming',harvest:'nav-Gaming',speed:'GamingItem4',growth:'GamingItem0',capacity:'nav-Gaming',luck:'nav-Gaming',exp:'XPskill'};
 const sourceIcons:any={
  'Gummy Orb Artifact':'Arti20','Weatherbook Artifact':'Arti23','Research Grid':'nav-Research','Research grid':'nav-Research',
  'Snail':'GamingItem7','Lucky Snail':'GamingItem7','Acorn':'GamingItem2','Acorn Shop':'GamingItem2','Acorn shop + Purrmep':'nav-Divinity',
  'Best Nugget':'GamingItem1','Elegant Shell':'nav-Gaming','Kitsune growth':'GamingItem4','Kitsune harvest penalty':'GamingItem4',
  'Rocky Boba (vial)':'Prehistrium','Meals + Ooz Ooblek':'nav-Cooking','Vial':'nav-Alchemy','Meals':'nav-Cooking','Stamps':'StampA1',
  'Koi Fish companion':'pets-static/w7b1b','Card (Boomy Mine)':'pets-static/w7b2','Monument':'HoleBraverySword','Lamp':'HoleLampWish',
  'Summoning':'nav-Summoning','Meritocracy':'nav-Meritocracy','Emperor':'nav-EmperorBonuses','Sushi Station':'Sushi0',
  'Skill Mastery':'RiftUI','MSA Totalizer':'nav-Worship','Sticker':'nav-Farming','Crop Scientist':'nav-Farming','Exotic shop':'nav-Farming',
  'Guild':'nav-Guilds','Bitty Litty Talent':'nav-LegendTalents','1000 Hours Played':'nav-LegendTalents','Tempestuous Emotions':'nav-LegendTalents',
  'Sprout Value upgrade':'nav-Gaming','Sprout Speed':'GamingItem0','Mutation upgrade':'GamingItem0','Capacity upgrade':'nav-Gaming',
  'Poing Multi':'GamingItem6','Rat King crowns':'GamingItem8','Rat King':'GamingItem8'
 };
 for(const group of model.groups){
  group.icon=`assets/${icons[group.id]}.png`;
  group.limit=group.id==='capacity'?'Hard cap · 24 plants':group.id==='growth'?'Chance caps at 100%':group.id==='speed'?'No fixed minimum interval':'No fixed overall cap';
  for(const r of group.rows){r.icon=`assets/${sourceIcons[r.name]||icons[group.id]}.png`;r.limitType='Account-dependent';r.limitLabel='Depends on account boosts';r.breakpoints=[];}
 }
 function set(id:string,name:string,meta:any){const r=groups[id].rows.find((x:any)=>x.name===name);if(r)Object.assign(r,meta);return r;}
 function hard(id:string,name:string,cap:number,label:string,extra:any={}){return set(id,name,{limitType:'Hard cap',cap,limitLabel:label,...extra});}
 function soft(id:string,name:string,cap:number,label:string,extra:any={}){return set(id,name,{limitType:'Soft limit',cap,limitLabel:label,...extra});}
 function uncapped(id:string,name:string,detail:string){set(id,name,{limitType:'No fixed cap',limitLabel:'No fixed cap',limitNote:detail});}
 hard('bits','Bit Toggle',100,'100× when enabled');
 hard('speed','Bit toggle time cost',100,'100× interval when enabled',{limitNote:'This is a time penalty, not a speed upgrade.'});
 hard('bits','Skill Mastery',1.15,'1.15×');hard('bits','Achievements',1.1,'1.10× · two rewards');
 hard('bits','Koi Fish companion',500,'500× upgraded · 100× owned',{breakpoints:[milestone('Owned','100×',a.companions?.list?.[53]?.acquired||false),milestone('Upgraded','500×',a.companions?.list?.[53]?.upgraded||false)]});
 hard('bits','Card (Boomy Mine)',2.4,'2.40× at highest card tier',{limitNote:'20% per card level, up to level 7. Higher tiers require the relevant card-tier unlocks or Cardifiers.'});
 for(const [id,index] of [['bits',29],['luck',42]] as any[]){const cap=1+getSushiBonus({...a,sushiStation:{...a.sushiStation,uniqueSushi:index+1}},index)/100;hard(id,'Sushi Station',cap,`${fmt(cap)}× at ${index+1} unique sushi`,{breakpoints:[milestone(`${index+1} unique sushi`,`${fmt(cap)}×`,a.sushiStation?.uniqueSushi>index)]});}
 for(const [id,name,stat] of [['bits','Rocky Boba (vial)','7bits'],['exp','Vial','GameXP']] as any[]){const v=a.alchemy?.vials?.find((v:any)=>v.stat===stat);if(v){const bonus=13*v.x1*v.multiplier;hard(id,name,id==='bits'?1+bonus/100:bonus,'Lv 13 with your current vial boosts',{currentLevel:v.level,limitNote:'The vial level caps at 13. Vial-effect boosts can raise its final bonus further.'});}}
 for(const name of ['Gummy Orb Artifact','Weatherbook Artifact'])set('bits',name,{limitType:'Scaling cap',limitLabel:'Artifact tier caps; bonus keeps scaling',limitNote:name.startsWith('Gummy')?'Higher artifact tiers multiply the Slab-based reward. More discovered items can still increase it at the highest tier.':'Higher artifact tiers multiply the Gaming-level reward. Gaming levels can still increase it at the highest tier.'});
 set('bits','Research Grid',{limitType:'Level cap',limitLabel:`Lv ${a.research?.gridSquares?.[87]?.level||0} / ${a.research?.gridSquares?.[87]?.maxLv||2}`,limitNote:'The upgrade level caps, but grid-wide and shape bonuses can still raise its effect.'});
 const snail=Math.max(0,a.gaming.snailLevel||0),snailCap=25+10*Number(owned(29))+5*Number(owned(30))+10*Number(owned(40));
 const snailValue=(n:number)=>2**Math.min(25,n)*1.5**Math.max(0,Math.min(25,n-25));
 hard('bits','Snail',snailValue(snailCap),`Lv ${snailCap} unlocked · Lv 50 absolute`,{
  currentLevel:snail,limitNote:'Lv 1–25 doubles bits per level; Lv 26–50 multiplies by 1.5. Superbits raise the starting Lv 25 cap by +10, +5 and +10.',
  next:snail<snailCap?`Lv ${snail+1}: ${fmt(snailValue(snail+1))}×`:'Current unlocked cap reached',
  breakpoints:[25,35,40,50].map(n=>milestone(`Lv ${n}`,`${fmt(snailValue(n))}×`,snail>=n))
 });
 const acorn=s[27]?.[2]||0,acornValue=(n:number)=>1+8*n/(250+n);
 soft('bits','Acorn',9,'Approaches 9×; never reaches it',{
  currentLevel:acorn,next:`Lv ${acorn+1}: ${fmt(acornValue(acorn+1))}×`,
  limitNote:'Each milestone is a share of the extra +8× bonus, not a share of the total multiplier.',
  breakpoints:[250,2250,24750].map((n,i)=>milestone(`Lv ${fmt(n)} · ${[50,90,99][i]}% of bonus`,`${fmt(acornValue(n))}×`,acorn>=n))
 });
 const score=g[10]||0;
 hard('bits','Poing Multi',25,'25× at 5,760,000 score',{
  next:score<5760000?`${fmt(5760000-score)} more score to cap`:'Score cap reached',
  breakpoints:[10000,160000,810000,5760000].map(n=>milestone(`${fmt(n)} score`,`${1+Math.sqrt(n)/100}×`,score>=n))
 });
 uncapped('bits','Best Nugget','The bit formula uses your best nugget without an upper clamp. Shovel and Metal Detector govern nugget rolls.');
 uncapped('bits','Elegant Shell','Shell rank and the import upgrade both increase this multiplier.');
 uncapped('bits','Bitty Litty Talent','Both the talent bonus and active Gaming level affect the result. A talent-level cap is not a cap on the whole multiplier.');
 uncapped('bits','Logbook + Bit by Bit','Logbook entries are finite, but the Bit by Bit bubble contribution can keep growing.');
 set('bits','Rat King crowns',{limitType:'Breakpoint',limitLabel:'Additive reward changes after 10 crowns',breakpoints:[milestone('First 10 crowns','+1 per crown, alongside 1.13^crowns', (a.gaming.ratKing?.crownsCount||0)>=10)],limitNote:'After 10 crowns, each extra crown adds 0.5 instead of 1. The 1.13^crowns part continues. Total crowns depend on available plants and stages.'});
 const mutation=g[7]||0,mutationValue=(n:number)=>13+11*n/(150+n);
 soft('growth','Mutation upgrade',24,'Approaches 24% before Crop Scientist',{
  currentLevel:mutation,next:`Lv ${mutation+1}: ${fmt(mutationValue(mutation+1))}%`,
  breakpoints:[150,1350,14850].map((n,i)=>milestone(`Lv ${fmt(n)} · ${[50,90,99][i]}% of added chance`,`${fmt(mutationValue(n))}%`,mutation>=n))
 });
 const baseChance=mutationValue(mutation)/100,crop=groups.growth.rows.find((r:any)=>r.name==='Crop Scientist').value;
 hard('growth','First-stage chance',100,'100% per roll',{
  next:baseChance*crop>=1?'First-stage chance is capped':`Needs ${fmt(1/baseChance)}× Crop Scientist at this mutation level`,
  limitNote:'Once capped, more Crop Scientist no longer improves first-stage growth; it can still help later stages.'
 });
 uncapped('growth','Crop Scientist','The first-stage chance can cap before this multiplier stops growing. Higher evolutions still benefit.');
 const slots=a.gemShopPurchases?.[133]||0,capacityLevel=Math.max(0,21-slots);
 set('capacity','Capacity upgrade',{limitType:'Effective cap',cap:capacityLevel,limitLabel:`Lv ${capacityLevel} fills 24 slots with your gems`,currentLevel:g[3],next:g[3]>=capacityLevel?'No extra slots from further levels':`${capacityLevel-g[3]} levels to fill the garden`,limitNote:'This is the useful level at your current gem-shop purchases, not the upgrade purchase limit.'});
 hard('capacity','Base capacity',3,'Fixed · 3 plants');
 set('capacity','Gem shop',{limitType:'Shared cap',limitLabel:'Combined garden limit: 24',limitNote:'Gem-shop slots and capacity levels share the same final 24-plant cap.'});
 hard('speed','Base interval',5000,'Fixed · 5,000 seconds');
 for(const name of ['Sprout Value upgrade','Account bit multiplier'])uncapped('harvest',name,'No fixed upper clamp in the harvest formula.');
 uncapped('speed','Sprout Speed','Each upgrade adds 2% to this speed factor; there is no finite speed-factor cap in the formula.');
 set('speed','Acorn shop + Purrmep',{limitType:'Diminishing returns',limitLabel:'Acorn growth scales as level^0.8',limitNote:'The Acorn percentage is (3 × level)^0.8. It keeps increasing, with less gain per extra level. Purrmep adds to the same percentage pool.'});
 for(const name of ['Kitsune growth'])set('speed',name,{limitType:'Trade-off',limitLabel:'Faster growth; lower bits per plant',limitNote:'Kitsune is an on/off toggle. Enabled: speed factor 4 + import level / 100; harvest value is divided by 3. Toggle it only with an empty garden.'});
 set('harvest','Kitsune harvest penalty',{limitType:'Trade-off',limitLabel:'Best harvest factor: 1× at zero stacks',limitNote:'Kitsune enabled divides harvest by 3; disabled keeps the full harvest value.'});
 hard('luck','Bigger Palette',2,'2× when unlocked');hard('luck','Artistic Gamer',1.3,'1.30× when unlocked');
 hard('luck','Jade Emporium',100,'+100% when unlocked');
 set('luck','Gamer Luck',{limitType:'Breakpoint',limitLabel:'Starts above Gaming Lv 200',limitNote:'Requires Gamer Luck. +3% per Gaming level above 200.',breakpoints:[milestone('Gaming Lv 201','First +3%',(a.gaming.superbitsUpgrades?.[45]?.unlocked&&model.characterLevel>200)||false)]});
 set('luck','Lucky Snail',{limitType:'Unlock cap',cap:20*Math.max(0,snailCap-25),limitLabel:`Up to +${20*Math.max(0,snailCap-25)}% at your Snail cap`,limitNote:'Requires Lucky Snail. +20% per Snail level above 25; absolute maximum +500%.',breakpoints:[milestone('Snail Lv 26','First +20%',snail>=26&&owned(28)),milestone('Snail Lv 50','+500%',snail>=50&&owned(28))]});
 // Palette x5=1 is L/(L+25); other colours are linear. Current effective bonus includes all saved boosts.
 for(const [id,name,index] of [['bits','DJ Musto palette',7],['bits','Offwhite palette',18],['speed','Chartreuse palette',8],['speed','Minty Blue palette',11],['luck','Palette',3]] as any[]){
  const p=a.gaming.palette?.[index],r=groups[id].rows.find((r:any)=>r.name===name);if(!p||!r)continue;
  if(p.x5===1){const cap=p.level>0?p.bonus*(p.level+25)/p.level:null,multi=r.unit==='×';
   soft(id,name,cap===null?null:multi?1+cap/100:cap,cap===null?`Approaches +${p.x4}% before boosts`:`Approaches ${fmt(multi?1+cap/100:cap)}${r.unit} with current boosts`,{currentLevel:p.level,limitNote:'Level / (level + 25) gives diminishing returns. Palette boosters can raise this limit.',breakpoints:[25,225,2475].map((n,i)=>milestone(`Lv ${fmt(n)}`,`${[50,90,99][i]}% of colour bonus`,p.level>=n))});
  }else uncapped(id,name,'Linear palette bonus per level. Level-up odds fall as the colour level rises; palette boosts increase each level’s effect.');
 }
 for(const [id,name,index] of [['bits','Vault Upgrade',68],['exp','Upgrade Vault',69]] as any[]){const u=a.upgradeVault?.upgrades?.[index];if(!u)continue;const upgrades=a.upgradeVault.upgrades.map((v:any,i:number)=>i===index?{...v,level:u.maxLevel}:v),bonus=calcUpgradeVaultBonus(upgrades,index);hard(id,name,id==='bits'?1+bonus/100:bonus,`Current account cap: Lv ${u.maxLevel}`,{currentLevel:u.level,icon:`assets/VaultUpg${index}.png`,limitNote:'Uses your current Vault boosts and unlocked level-cap extensions.'});}
 hard('exp','Skill Mastery',25,'+25% when unlocked');
 for(const group of model.groups)for(const r of group.rows){
  r.maxed=['Hard cap','Effective cap','Unlock cap'].includes(r.limitType)&&Number.isFinite(r.cap)&&r.value>=r.cap-1e-9&&!(r.name==='Lucky Snail'&&(!owned(28)||snailCap<=25));
 }
 groups.capacity.limit='Hard cap · 24 plants';
 groups.harvest.milestones=[milestone('Plant evolution','Most plants: 3× per stage; Cactus: 4×',false)];
 const jadeEvolution=Number(!!a.sneaking?.jadeEmporium?.find((v:any)=>v.originalIndex===6)?.unlocked);
 const maxEvolution=Math.min(9,Number(owned(48))+Number(owned(57))+Math.min(7,3+Number(owned(1))+Number(owned(5))+Number(owned(18))+jadeEvolution));
 groups.growth.milestones=[milestone('Growth stage limit',`${maxEvolution+1} stages unlocked · 10 maximum with all evolution unlocks.`,maxEvolution===9),milestone('Later evolution odds','Chance drops at higher stages; 100% first-stage growth does not mean instant evolution.',false)];
 groups.luck.milestones=[milestone('Colour level-up odds','Each additional colour level divides roll odds by at least 1.2. +10 levels makes a roll at least 6.19× rarer at the same luck.',false)];
 return model;
}
