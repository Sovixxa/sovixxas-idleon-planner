(function(root){
'use strict';
const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v;}catch{return null;}};
const clean=v=>String(v??'').replaceAll('_',' ').trim();
const num=v=>v==null||v===''||!Number.isFinite(Number(v))?null:Number(v);
const entries=v=>Object.entries(parse(v)||{}).filter(([k])=>/^\d+$/.test(k));
const empty=id=>!id||['Blank','B','Empty'].includes(id);
function build(systems,raw,groups){
 const d=parse(raw?.data)||raw||{},players=systems.get('players')||[],names=raw?.charNames||systems.get('playerNames')||[];
 const out={cmp_equipment:[],cmp_loadouts:[],cmp_inventory:[],cmp_progress:[]};
 const items=new Map((systems.get('itemsData')||[]).map(x=>[x.internalName,x]));
 const quests=new Map(Object.values(systems.get('quests')?.npcData||{}).flatMap(n=>Object.values(n.data?.quests||{}).map(q=>[q.QuestName?.replaceAll(' ','_'),q.Name])));
 const ids=[...new Set(Object.keys(d).map(k=>k.match(/^(?:Lv0|EquipOrder|InventoryOrder|CardEquip|QuestComplete|MaxCarryCap|KLA)_(\d+)$/)?.[1]).filter(x=>x!=null))].sort((a,b)=>a-b);
 const image=id=>id?'assets/'+id+'.png':null;
 const itemName=id=>empty(id)?'Empty':id==='LockedInvSpace'?'Locked':items.get(id)?.displayName||clean(id);
 for(const id of ids){
  const p=players.find(p=>String(p.playerID)===id),name=names[id]||p?.playerName||'Character '+(+id+1);
  const meta={characterId:id,characterName:name,classId:num(d['CharacterClass_'+id]),className:p?.class||''};
  const add=(group,key,section,label,level,icon,extra={})=>out['cmp_'+group].push({...meta,id:id+':'+key,name:name+' · '+label,label,section,level:level??'Unavailable',icon:image(icon),status:level==null?'unknown':'active',...extra});
  const equipment=parse(d['EquipOrder_'+id]);
  const slots=[['Helmet','Weapon','Shirt','Pendant','Pants','Ring 1','Shoes','Ring 2','Premium hat','Keychain 1','Trophy','Keychain 2','Cape','Chat ring','Nametag'],['Pickaxe','Hatchet','Fishing rod','Catching net','Trap','Skull','DNA splicer']];
  for(const [type,section] of ['Gear','Tools','Food'].entries())for(const [slot,itemId] of entries(equipment?.[type])){
   if(type<2&&+slot>=slots[type].length&&empty(itemId))continue;
   if(type===2&&+slot>=6&&empty(itemId))continue;
   const item=p?.gear?.[['equipment','tools','food'][type]]?.[slot],known=type===2||d['EMm'+type+'_'+id]!=null;
   const details=empty(itemId)?[]:(item?.itemStats||[]).map(s=>{const total=Number(s.stoneName==='Weapon_Power'?item.weaponPower:s.value)+Number(s.stone||0);return Number.isFinite(total)&&(total!==0||s.stoneName==='Upgrade_Slots_Left')?(s.extra?total+s.extra:(s.stoneName==='Weapon_Power'?'Weapon power':clean(s.displayName))+': '+total):null;}).filter(Boolean);
   if(!empty(itemId)&&!known)details.push('Upgrade stats unavailable');
   const qty=type===2?num(parse(d['EquipQTY_'+id])?.[2]?.[slot]):null;
   if(type===2&&!empty(itemId))details.push(qty==null?'Quantity unavailable':'Quantity: '+qty.toLocaleString('en-US'));
   add('equipment',type+':'+slot,section,slots[type]?.[slot]||section+' slot '+(+slot+1),itemName(itemId),empty(itemId)?null:itemId,{effect:details.join(' · '),details});
  }
  const cards=parse(d['CardEquip_'+id]);
  for(const [slot,cardId] of entries(cards)){
   const card=p?.cardInfo?.equippedCards?.[slot];
   add('loadouts','card:'+slot,'Cards','Card '+(+slot+1),empty(cardId)?'Empty':card?.displayName||clean(cardId),empty(cardId)?null:'Cards'+(card?.data?.cardID||''));
  }
  if(d['CSetEq_'+id]!=null){const set=parse(d['CSetEq_'+id]);const text=Object.entries(set||{}).map(([k,v])=>clean(k).replace('{',v)).join(' · ');add('loadouts','cardSet','Cards','Card set',text||'None',p?.cardInfo?.getCardSetIcon?.());}
  if(d['PVtStarSign_'+id]!=null){const signs=(p?.starSigns||[]).filter(x=>x.aligned).map(x=>x.name).sort();add('loadouts','signs','Star signs','Aligned star signs',signs.join(' · ')||'None','nav-StarSigns');}
  for(const [slot,prayerId] of entries(d['Prayers_'+id])){const prayer=(systems.get('prayers')||[]).find(x=>x.index===Number(prayerId));add('loadouts','prayer:'+slot,'Prayers','Prayer '+(+slot+1),Number(prayerId)<0?'Empty':prayer?.data?.name||'Prayer '+prayerId,'nav-Prayers');}
  const chips=parse(d.Lab)?.[+id+1];
  for(const [slot,chipId] of entries(chips)){const chip=(systems.get('lab')?.chips||[]).find(x=>x.index===Number(chipId));add('loadouts','chip:'+slot,'Chips','Chip '+(+slot+1),Number(chipId)<0?'Empty':chip?.data?.name||'Chip '+chipId,'nav-Lab');}
  const inv=parse(d['InventoryOrder_'+id]),qty=parse(d['ItemQTY_'+id]);
  if(inv&&typeof inv==='object'){
   add('inventory','slots','Capacity','Inventory slots',String(entries(inv).filter(([,v])=>v!=='LockedInvSpace').length),'InvBag1',{value:entries(inv).filter(([,v])=>v!=='LockedInvSpace').length});
   for(const [slot,itemId] of entries(inv)){const value=empty(itemId)||itemId==='LockedInvSpace'?0:num(qty?.[slot]);add('inventory','slot:'+slot,'Items','Slot '+(+slot+1),itemName(itemId),empty(itemId)||itemId==='LockedInvSpace'?null:itemId,{value,effect:empty(itemId)||itemId==='LockedInvSpace'?'':value==null?'Quantity unavailable':'Quantity: '+value.toLocaleString('en-US')});}
  }
  for(const [key,section] of [['cmp_capacity','Capacity'],['cmp_bags','Bags']])for(const r of groups[key]||[]){if(!r.id.startsWith((key==='cmp_capacity'?'MaxCarryCap_':'InvBagsUsed_')+id+':'))continue;out.cmp_inventory.push({...r,...meta,id:id+':'+r.id,label:r.name.split(' · ').slice(1).join(' · '),section});}
  const levels=parse(d['Lv0_'+id]);
  if(levels){add('progress','level','Character','Class level',num(levels[0])==null?null:String(levels[0]),meta.classId==null?null:'ClassIcons'+meta.classId,{value:num(levels[0])});}
  if(d['CharacterClass_'+id]!=null)add('progress','class','Character','Class',p?.class||clean(root.FAMILY_CATALOG?.names?.[meta.classId])||'Class '+meta.classId,meta.classId==null?null:'ClassIcons'+meta.classId);
  if(d['CurrentMap_'+id]!=null)add('progress','map','Character','Current map',p?.currentMap||'Map '+d['CurrentMap_'+id],'Quest1');
  const completed=parse(d['QuestComplete_'+id]);
  if(completed&&typeof completed==='object')for(const [quest,state] of Object.entries(completed))add('progress','quest:'+quest,'Quests',quests.get(quest)||clean(quest),Number(state)===1?'Completed':Number(state)===0?'In progress':Number(state)===-1?'Not started':'Unavailable','Quest1');
  const gates=parse(d['KLA_'+id]);
  if(gates)for(const [mapId,mapName,requirements] of root.JSON_COMPARE_MAPS||[])for(const [portal,required] of requirements.entries()){
   if(required<=0)continue;
   const left=num(gates[mapId]?.[portal]);
   add('progress','portal:'+mapId+':'+portal,'Portals',mapName+' · Portal '+(portal+1),left===null?null:left<=0?'Kill gate cleared':Math.ceil(left).toLocaleString('en-US')+' kills left','Quest1',{value:left===null?null:Math.max(0,Math.ceil(left)),effect:'Kill requirement only; other unlock conditions may apply.'});
  }
 }
 return out;
}
root.JsonCompareCharacters={build};
})(typeof window!=='undefined'?window:globalThis);
