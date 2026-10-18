 'use strict';
importScripts('prayer-math-engine.js');
let parsed,maps=[],rankings=new Map();
// Full-clear scenario: every normal monster dies once per clear + respawn cycle.
// Clear time is user supplied; AFK map spacing cannot predict active AoE pathing.
function rate(character,map,clearSeconds,uwu){
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
   const {character,request,clearSeconds,uwu}=e.data;
   const key=JSON.stringify([character,clearSeconds,uwu]);
   if(!rankings.has(key))rankings.set(key,maps.map(m=>{try{return {...m,kills:rate(character,m.id,clearSeconds,uwu)};}catch{return {...m,kills:null};}}).sort((a,b)=>(b.kills??-1)-(a.kills??-1)||a.id-b.id));
   postMessage({type:'rank',request,maps:rankings.get(key)});return;
  }
  if(e.data.type==='map'){
   const {character,map,request,clearSeconds,uwu}=e.data;
   const kills=rate(character,map,clearSeconds,uwu);
   postMessage({type:'map',request,kills:Number.isFinite(kills)?kills:null});return;
  }
  const raw=e.data,d=typeof raw.data==='string'?JSON.parse(raw.data):raw.data||raw;
  parsed=PrayerMath.parseData(d,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);
  const characters=parsed.characters.map((c,index)=>({index,eligible:['Beast_Master','Wind_Walker'].includes(c.class),name:c.name,map:c.mapIndex,rate:PrayerMath.calcShinyLvMulti(parsed.account,[c]).value}));
  rankings.clear();
  maps=Object.entries(PrayerMath.mapEnemiesArray).flatMap(([id,target])=>{
   const m=PrayerMath.monsters[target];
   return m?.Type==='Monster'&&m.SpecialType!=='a'&&Number(PrayerMath.mapMonsterCounts[id])>0&&Number.isFinite(m.RespawnTime)?[{id:Number(id),name:String(PrayerMath.mapNames[id]||m.Name).replaceAll('_',' ')}]:[];
  });
  postMessage({characters,maps});
 }catch(error){postMessage({type:e.data.type,request:e.data.request,error:error.message});}
};
