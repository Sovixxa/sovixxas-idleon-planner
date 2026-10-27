'use strict';
// Installed before the older decoder's dependency passes, so downstream totals
// see the updated values too. Never changes the imported save.
function installLegacyMenagerie(systems,raw,quantities,vaultEligible=[]){
 const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v;}catch{return undefined;}};
 const m=parse(raw.Menagerie)||[],s=parse(raw.Spelunk)||[],q=i=>(Number(m[3]?.[i])||0)*(Number(quantities[i])||0),multi=i=>1+q(i)/100;
 const options=parse(raw.OptLacc)||parse(raw.OptionsListAccount)||[],waves=[5,10,15,20,25,35,50,60,70,85,100,125,150,175,200,250],cruc=i=>Number(m[2]?.[8])>=1&&Number(options[628]||0)>=waves[i]?1:0;
 const meatmaxxing=typeof options[311]==='string'&&options[311].includes('職');
 if(String(options[311]||'').includes('策'))for(const upgrade of systems.get('upgradeVault')?.bonuses||[])if(vaultEligible.includes(String(upgrade.id)))upgrade.data={...upgrade.data,max_level:Number(upgrade.data.max_level)+25};
 const breeding=systems.get('breeding'),rawBreeding=parse(raw.Breeding),maxShiny=Number(m[2]?.[11])>=1?30:20;
 let overLevels=0;
 for(const pet of breeding?.basePets||[]){
  if(pet.data.world>=4||pet.data.petId==='_')continue;
  const progress=Number(rawBreeding?.[22+pet.data.world]?.[pet.indexInWorld]);
  if(!Number.isFinite(progress))continue;
  let level=progress>0?1:0;
  for(let n=1;n<maxShiny;n++)if(progress>Math.floor((1+n**1.6)*1.7**n))level=n+1;
  pet.shinyLevel=level;overLevels+=Math.max(0,level-20);
 }
 // The subsequent legacy pass writes these three rates; scale each exactly once.
 if(breeding)for(const key of ['shinySpeedMulti','shinySpeedMultiWithSilkrode','shinySpeedMultiWithoutStarSign']){
  let base=breeding[key];Object.defineProperty(breeding,key,{configurable:true,enumerable:true,get:()=>base*(1+overLevels/10),set:value=>{base=value;}});
 }
 const wrap=(obj,key,change)=>{if(!obj||typeof obj[key]!=='function')return;
  if(!obj.__menagerieOriginal)Object.defineProperty(obj,'__menagerieOriginal',{value:{},configurable:true});
  const original=obj.__menagerieOriginal[key]||obj[key];obj.__menagerieOriginal[key]=original;
  obj[key]=function(...args){return change(original.apply(this,args),args,this);};
 };
 for(const upgrade of systems.get('sneaking')?.sneakingUpgrades||[])if(upgrade.index<17)wrap(upgrade,'getBonus',(value,args)=>value+(Number(m[7]?.[upgrade.index])||0)*upgrade.bonusPerLvl);
 for(const [name,id] of [['orion',16],['poppy',18],['bubba',20]])wrap(systems.get(name),'getUpgradeCost',(value,args)=>value/(Number(args[0])===0?multi(id):1)/(name==='bubba'&&meatmaxxing?2:1));
 wrap(systems.get('orion'),'getFeatherRate',value=>value*(1+4*cruc(1)));
 wrap(systems.get('bubba'),'getMeatSliceRate',value=>value*(1+2*cruc(10))*(meatmaxxing?3:1));
 for(const slot of systems.get('forge')?.slots||[])wrap(slot,'getSpeed',value=>value*multi(11));
 for(const kitchen of systems.get('cooking')?.kitchens||[])wrap(kitchen,'getMealSpeed',value=>value*multi(4)*(1+9*cruc(5)+20*cruc(12)));
 for(const boat of systems.get('sailing')?.boats||[])wrap(boat,'getLootValue',(value,args,obj)=>{
  const options=args[0]||{},level=options.lootUpgrades??obj.lootUpgrades;
  const captain=options.includeCaptain===false?0:(obj.captain?.traits||[]).filter(t=>t.bonus.bonus.includes('Loot Value')).reduce((n,t)=>n+t.currentBonus,0);
  const pool=obj.sigilBonus+obj.genieLampBonus+25*Math.min(30,obj.activeEnderCaptains)+obj.arcadeBonus;
  const oldBase=5+2+Math.floor(level/8)**2*level,newBase=5+(2+Math.floor(level/8)**2)*level;
  return value*newBase/oldBase*(1+captain/100)*(1+pool/100)/(1+(pool+captain)/100)*multi(9);
 });
 for(const upg of systems.get('summoning')?.summonUpgrades||[])wrap(upg,'nextLevelCost',(value,args,obj)=>value/Math.max(1,Math.pow(Math.min(50,multi(7)),Math.floor(obj.level/50))));
 wrap(systems.get('gaming'),'getPaletteBonus',(value,args)=>{const stars=Number(s[49]?.[args[0]])||0;return value*Math.max(1,1+stars+Math.floor(stars/2));});
 wrap(systems.get('farming'),'getExoticMarketBonusValue',(value,args)=>{const result=value*(s[50]?.includes(args[0])?2:1);return args[0]===39?Math.min(50,result):result;});
}
if(typeof module!=='undefined')module.exports=installLegacyMenagerie;
