(function(root){'use strict';
const parse=v=>typeof v==='string'?JSON.parse(v):v;
const finite=v=>v!==null&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
function build(raw,characters=[],catalog=root.TRAPS_CATALOG){
 const data=raw.data||raw,keys=Object.keys(data).filter(k=>/^PldTraps_\d+$/.test(k)).sort((a,b)=>Number(a.split('_')[1])-Number(b.split('_')[1]));
 if(!keys.length)return {missing:true};
 const ids=[...new Set([...keys.map(k=>Number(k.split('_')[1])),...characters.map((c,i)=>Number(c.playerId??i))])].sort((a,b)=>a-b);
 let invalid=0;
 const roster=ids.map(id=>{
  const character=characters.find((c,i)=>Number(c.playerId??i)===id),key='PldTraps_'+id;
  let slots=[];try{slots=parse(data[key]);if(!Array.isArray(slots))slots=[];}catch{invalid++;}
  const traps=[];let empty=0;
  for(const [slot,row] of slots.entries()){
   if(!Array.isArray(row)){invalid++;continue;}
   if(Number(row[0])===-1){empty++;continue;}
   if(!row[3]||row[3]==='Blank'){invalid++;continue;}
   const critter=catalog.critters.find(c=>c.critterName===row[3]);
   const elapsed=finite(row[2]),duration=finite(row[6]);
   const remaining=elapsed!==null&&duration>0?Math.max(0,duration-Math.max(0,elapsed)):null;
   traps.push({slot:slot+1,id:row[3],name:critter?.name||row[3],map:critter?.map||'Unknown location',quantity:finite(row[4]),xp:finite(row[7]),duration,elapsed,remaining,ready:remaining===0,progress:remaining===null?null:Math.min(1,Math.max(0,elapsed)/duration)});
  }
  const tool=character?.tools?.find(t=>t.Type==='TRAP_BOX_SET');
  return {id,name:character?.name||raw.charNames?.[id]||`Character ${id+1}`,level:character?.skillsInfo?.trapping?.level??null,tool:tool?{name:String(tool.displayName||tool.name).replaceAll('_',' '),id:tool.rawName}:null,traps,empty,available:data[key]!==undefined};
 });
 const all=roster.flatMap(c=>c.traps),waiting=all.filter(t=>t.remaining>0);
 const totals=catalog.critters.map(c=>{const slots=all.filter(t=>t.id===c.critterName);return {...c,slots:slots.length,ready:slots.filter(t=>t.ready).length,quantity:slots.reduce((n,t)=>n+(t.quantity??0),0)};});
 return {missing:false,roster,totals,invalid,placed:all.length,ready:all.filter(t=>t.ready).length,empty:roster.reduce((n,c)=>n+c.empty,0),next:waiting.length?Math.min(...waiting.map(t=>t.remaining)):null};
}
root.TrapsModel={build};
})(typeof window==='undefined'?self:window);
