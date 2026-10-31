 'use strict';
importScripts('prayer-math-engine.js');
let parsed,maps=[],rankings=new Map(),clearCache=new Map();
// Full-clear scenario: every normal monster dies once per clear + respawn cycle.
// Automatic baseline: sequential basic attacks plus catalog travel spacing.
// No AFK gain or multikill credit, and no invented WW AoE rotation.
function autoClear(character,map){
 const key=JSON.stringify([character,map]);
 if(clearCache.has(key))return clearCache.get(key);
 const c=parsed.characters[character],target=PrayerMath.mapEnemiesArray[map];
 const onMap={...c,mapIndex:Number(map),targetMonster:target};
 const info=PrayerMath.getMaxDamage(onMap,parsed.characters,parsed.account);
 const damage=PrayerMath.getEffectiveDamage(info,onMap);
 const hp=PrayerMath.getMonsterHpTotal(PrayerMath.monsters[target]?.MonsterHPTotal,onMap,parsed.account);
 const count=Number(PrayerMath.mapMonsterCounts[map]);
 const spacing=Number(PrayerMath.mapDetails[map]?.[1]?.[1]);
 const hit=Math.min(1,Number(info.hitChance)/100),speed=Number(info.movementSpeed),cadence=Number(info.actionWaitTime);
 let result=null;
 if([damage,hp,count,hit,speed,cadence].every(v=>Number.isFinite(v)&&v>0)&&Number.isFinite(spacing)&&spacing>=0){
  const attacks=Math.max(1,Math.ceil(hp/damage))/hit;
  const combatSeconds=count*attacks*cadence;
  const travelSeconds=Math.max(0,count-1)*spacing/(130*speed/100);
  const seconds=combatSeconds+travelSeconds;
  if(Number.isFinite(seconds)&&seconds>0)result={seconds,combatSeconds,travelSeconds};
 }
 clearCache.set(key,result);return result;
}
function rate(character,map,clearSeconds,uwu,mode){
   if(mode==='auto')clearSeconds=autoClear(character,map)?.seconds;
   if(!(Number(clearSeconds)>0))return null;
   const c=parsed.characters[character];
   const onMap={...c,mapIndex:Number(map),targetMonster:PrayerMath.mapEnemiesArray[map]};
   const reduction=uwu&&c.flatTalents?.some(t=>t.name==='UWU_RAWRRR'&&t.level>0)?PrayerMath.getTalentBonus(c.flatTalents,'UWU_RAWRRR'):0;
   const respawn=Math.max(4,PrayerMath.getRespawnRate(onMap,parsed.account).respawnRate-reduction);
   const count=Number(PrayerMath.mapMonsterCounts[map]);
   const kills=3600*count/(Number(clearSeconds)+respawn);
   return Number.isFinite(kills)?kills:null;
}

onmessage=e=>{
 try{
  if(e.data.type==='rank'){
   const {character,request,clearSeconds,uwu,mode}=e.data;
   const key=JSON.stringify([character,clearSeconds,uwu,mode]);
   if(!rankings.has(key))rankings.set(key,maps.map(m=>{try{return {...m,kills:rate(character,m.id,clearSeconds,uwu,mode)};}catch{return {...m,kills:null};}}).sort((a,b)=>(b.kills??-1)-(a.kills??-1)||a.id-b.id));
   postMessage({type:'rank',request,maps:rankings.get(key)});return;
  }
  if(e.data.type==='map'){
   const {character,map,request,clearSeconds,uwu,mode}=e.data;
   const kills=rate(character,map,clearSeconds,uwu,mode);
   postMessage({type:'map',request,kills:Number.isFinite(kills)?kills:null,clear:mode==='auto'?autoClear(character,map):null,mode});return;
  }
  const raw=e.data,d=typeof raw.data==='string'?JSON.parse(raw.data):raw.data||raw;
  parsed=PrayerMath.parseData(d,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);
  const characters=parsed.characters.map((c,index)=>({index,eligible:['Beast_Master','Wind_Walker'].includes(c.class),name:c.name,map:c.mapIndex,rate:PrayerMath.calcShinyLvMulti(parsed.account,[c]).value}));
  rankings.clear();clearCache.clear();
  maps=Object.entries(PrayerMath.mapEnemiesArray).flatMap(([id,target])=>{
   const m=PrayerMath.monsters[target];
   return m?.Type==='Monster'&&m.SpecialType!=='a'&&Number(PrayerMath.mapMonsterCounts[id])>0&&Number.isFinite(m.RespawnTime)?[{id:Number(id),name:String(PrayerMath.mapNames[id]||m.Name).replaceAll('_',' ')}]:[];
  });
  postMessage({characters,maps});
 }catch(error){postMessage({type:e.data.type,request:e.data.request,error:error.message});}
};
