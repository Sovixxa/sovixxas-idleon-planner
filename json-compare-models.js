(function(root){
'use strict';
const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v;}catch{return null;}};
const clean=v=>String(v??'').replaceAll('_',' ').replace(/\s+/g,' ').trim();
const number=v=>v==null||v===''||!Number.isFinite(Number(v))?null:Number(v);
const fmt=v=>root.ProgressionModels.fmt(v);
function build(systems,raw){
 const d=parse(raw?.data)||raw||{},out={},names=raw?.charNames||systems.get('playerNames')||[];
 const player=i=>names[i]||'Character '+(Number(i)+1),has=(...keys)=>keys.some(k=>d[k]!=null),prefix=p=>Object.keys(d).some(k=>k.startsWith(p));
 const row=(id,name,value,icon,unit='Level',detail='')=>({id:String(id),name:clean(name),value:number(value),level:number(value)==null?'Unavailable':unit+' '+fmt(Number(value)),icon:icon?'assets/'+String(icon).replace(/^ConTowerB/,'ConTower')+'.png':null,effect:detail,status:number(value)==null?'unknown':'active'});
 const put=(key,known,fn)=>{out['cmp_'+key]=known?fn():[];};
 const items=new Map((systems.get('itemsData')||[]).map(x=>[x.internalName,x]));
 const itemName=id=>items.get(id)?.displayName||clean(id);
 const art=x=>{try{return x?.getImageData?.()?.location||null;}catch{return null;}};
 put('saltLick',has('SaltLick'),()=>{const model=systems.get('saltLick'),saved=parse(d.SaltLick);return (model?.bonuses||[]).map(x=>row(x.index,itemName(x.data.item),number(saved?.[x.index]),x.data.item,'Level',clean(model.getBonusText?.(x.index)||x.data.desc)));});
 put('atomCollider',has('Atoms'),()=> (systems.get('collider')?.atoms||[]).map(x=>row(x.index,x.data.name,x.level,art(x),'Level',clean(x.getBonusText?.()||''))));
 put('shrines',has('Shrine'),()=>Object.values(systems.get('shrines')||{}).map((x,index)=>row(index,x.name,x.level,x.iconName,'Level',clean(x.getBonusText?.()||''))));
 put('deathNote',prefix('KLA_'),()=>{const model=systems.get('deathnote'),rows=[];for(const [world,mobs] of model?.getKillsMap?.()||[])for(const [name,kills] of mobs){const rank=world==='Minibosses'?model.getDeathnoteMinibossRank(kills):model.getDeathnoteRank(kills);rows.push(row(world+':'+name,name,kills,'StatusSkull'+(rank?rank-1-Math.floor(rank/7)-2*Math.floor(rank/10):0),'Kills',world+' · '+rank+' skull points'));}return rows;});
 const options=parse(d.OptionsListAccount??d.OptLacc);
 put('emperor',number(options?.[369])!==null,()=>{const model=systems.get('emperor');return [row('kills','Emperor showdowns',number(options[369]),null,'Wins'),...(model?.emperorBonuses||[]).map(x=>{const template=clean(x.data.bonusName),name=template.replace(/[{}]/g,'').replace(/^[+%x ]+/,'');const value=x.getBonus();return row(x.index,name,x.level,['ClassIcons58','Bone0_x1','ClassIcons57','Opal','ClassIcons29','Quest78','Tach0_x1','ClassIcons56','ClassIcons59','ClassIcons60','ClassIcons61','Owlb_5'][x.index],'Level',template.replace('{',fmt(value)).replace('}',fmt(value)));})];});
 put('observations',has('Research'),()=>{const saved=parse(d.Research);return (root.ENDGAME_ASSETS?.observations||[]).slice(0,43).flatMap((x,id)=>[row(id+':level',clean(x.name)+' · Level',number(saved?.[4]?.[id]),'ResObj'+id,'Level'),row(id+':insight',clean(x.name)+' · Insight',number(saved?.[3]?.[id]),'ResObj'+id,'Insight')]);});
 put('stamps',has('StampLv'),()=> (systems.get('stamps')||[]).flatMap((group,g)=>group.map((x,i)=>row(g+':'+i,x.name,x.level,x.raw_name))));
 put('statues',prefix('StatueLevels_'),()=> (systems.get('statues')||[]).flatMap((p,i)=>(p.statues||[]).map(x=>row(i+':'+x.index,player(i)+' · '+x.displayName,has('StatueLevels_'+i)?x.level:null,x.internalName,'Level','Statue tier '+x.type))));
 put('anvil',prefix('AnvilPAstats_'),()=>Object.entries(systems.get('anvil')?.playerAnvils||{}).flatMap(([i,p])=>[['xpPoints','EXP'],['speedPoints','Speed'],['capPoints','Capacity'],['pointsFromCoins','Coin purchases'],['pointsFromMats','Material purchases']].map(([key,name])=>row(i+':'+key,player(i)+' · '+name,has('AnvilPAstats_'+i)?p[key]:null,null,'Points'))));
 put('bubbles',has('CauldronBubbles'),()=> (systems.get('alchemy')?.cauldrons||[]).flatMap((c,i)=>c.bubbles.flatMap((x,j)=>x.name==='Bubble'?[]:[row(i+':'+j,x.name,x.level,art(x))])));
 put('postOffice',prefix('POu_'),()=> (systems.get('players')||[]).flatMap((p,i)=>(p.postOffice||[]).map(x=>row(i+':'+x.index,player(i)+' · '+x.name,has('POu_'+i)?x.level:null,art(x),'Boxes'))));
 put('obols',prefix('ObolEq'),()=>{
  const ob=systems.get('obols'),rows=[];
  const add=(key,label,list)=> (list||[]).forEach((slot,i)=>{const item=slot.item?.internalName==='Blank'?null:slot.item;rows.push({id:key+':'+i,boardName:label,name:label+' · Slot '+(i+1),level:item?.displayName||'Empty',status:slot.locked?'missing':'active',icon:item?.internalName?'assets/'+item.internalName+'.png':null,effect:(item?.itemStats||[]).map(s=>{const value=Number(s.stoneName==='Weapon_Power'?item.weaponPower:s.value)||0,total=value+(Number(s.stone)||0);return total?(s.extra?fmt(total)+s.extra:(s.stoneName==='Weapon_Power'?'Weapon Power':s.displayName)+': '+fmt(total)):null;}).filter(Boolean).join(' · ')});});
  if(has('ObolEqO1'))add('family','Family',ob?.familyObols);(ob?.playerObols||[]).forEach((list,i)=>{if(has('ObolEqO0_'+i))add(i,player(i),list);});return rows;
 });
 put('construction',has('Tower','TowerInfo'),()=> (systems.get('construction')?.buildings||[]).map(x=>row(x.index,x.name,x.level,art(x))));
 put('refinery',has('Refinery'),()=>Object.entries(systems.get('refinery')?.salts||{}).map(([id,x])=>row(id,['Redox Salt','Explosive Salt','Spontaneity Salt','Dioxide Salt','Purple Salt','Nullo Salt','Void Salt','Godshard Salt','Anionic Salt'][Number(id.replace('Refinery',''))-1]||itemName(id),x.rank,id,'Rank')));
 put('printer',has('Print'),()=> (systems.get('printer')?.samples||[]).flatMap((samples,i)=>samples.map((x,j)=>row(i+':'+j,player(i)+' · Sample '+(j+1),x.quantity,x.item==='Blank'?null:x.item,'',x.item==='Blank'?'Empty sample':itemName(x.item)))));
 put('worship',has('TotemInfo'),()=> (systems.get('worship')?.totemInfo||[]).map(x=>row(x.index,x.name,number(parse(parse(d.TotemInfo)?.[0])?.[x.index]),null,'Wave')));
 put('meals',has('Cooking'),()=> (systems.get('cooking')?.meals||[]).map(x=>row(x.mealIndex,x.name,x.level,art(x))));
 put('kitchens',has('Cooking'),()=> (systems.get('cooking')?.kitchens||[]).flatMap(x=>[['mealLevels','Speed'],['recipeLevels','Fire'],['luckLevels','Luck']].map(([key,label])=>row(x.index+':'+key,'Kitchen '+(x.index+1)+' · '+label,x[key],null))));
 put('lab',has('Lab'),()=>[...(systems.get('lab')?.chips||[]).map(x=>row('chip:'+x.index,x.data.name,x.count,art(x),'Copies')),...(systems.get('lab')?.jewels||[]).map(x=>({...row('jewel:'+x.index,x.data.name,Number(x.available),art(x),''),level:x.available?'Owned':'Not owned'}))]);
 put('artifacts',has('Sailing'),()=> (systems.get('sailing')?.artifacts||[]).map(x=>({...row(x.index,x.data.name,x.status,art(x),'Tier'),level:['Not found','Normal','Ancient','Eldritch','Sovereign','Omnipotent','Transcendent','Verisimilitude'][x.status]||'Tier '+x.status})));
 put('boats',has('Boats'),()=> (systems.get('sailing')?.boats||[]).flatMap(x=>[['lootUpgrades','Loot'],['speedUpgrades','Speed']].map(([key,name])=>row(x.index+':'+key,'Boat '+(x.index+1)+' · '+name,x[key],null))));
 put('divinity',has('Divinity'),()=>[row('rank','God rank',systems.get('divinity')?.godRank,null,'Rank'),...(systems.get('divinity')?.gods||[]).map(x=>row(x.index,x.data.name,x.blessLevel,art(x),'Blessing',x.unlocked?'Unlocked':'Locked'))]);
 put('gaming',has('Gaming'),()=>{
  const g=systems.get('gaming'),saved=parse(d.Gaming)||[];
  return [...(g?.upgrades||[]).map((x,i)=>row('base:'+i,x.data.name,number(saved[i+1]),null)),...(g?.importBoxes||[]).map(x=>row('import:'+x.index,x.data.name||'Import '+(x.index+1),x.level,null)),...(g?.superbits||[]).map(x=>({...row('super:'+x.index,x.data.name||'Superbit '+(x.index+1),Number(x.unlocked),null,''),level:x.unlocked?'Unlocked':'Locked'})),...(g?.paletteColors||[]).map(x=>row('palette:'+x.index,x.data.name||'Palette '+(x.index+1),x.level,null))];
 });
 put('crops',has('FarmCrop'),()=> (systems.get('farming')?.cropDepot||[]).map(x=>({...row(x.index,systems.get('farming')?.cropNames?.[x.index]||'Crop '+(x.index+1),Number(x.discovered),'FarmCrop'+x.index,''),level:x.discovered?'Discovered':'Not discovered'})));
 put('landRanks',has('FarmRank'),()=> (systems.get('farming')?.farmPlots||[]).map(x=>row(x.index,'Plot '+(x.index+1),x.landRank,null,'Rank')));
 put('sneaking',has('Ninja'),()=>[...(systems.get('sneaking')?.sneakingUpgrades||[]).map(x=>row(x.index,x.data.name,x.level,art(x))),...(systems.get('sneaking')?.jadeUpgrades||[]).map(x=>({...row('jade:'+x.index,x.data.name,Number(x.purchased),null,''),level:x.purchased?'Purchased':'Not purchased'}))]);
 put('summoning',has('Summon'),()=> (systems.get('summoning')?.summonEssences||[]).map((x,i)=>row(i,['White','Green','Yellow','Blue','Purple','Red','Cyan','Endless','Endless II','Endless III'][i]||'Battle group '+(i+1),x.victories,null,'Wins')));
 put('research',has('Research'),()=>root.World7.research(d).bonuses.filter(x=>x.real).map(x=>row(x.id,x.name,number(parse(d.Research)?.[0]?.[x.id]),null)));
 put('spelunking',has('Spelunk'),()=>{const m=root.World7.spelunk(d),saved=parse(d.Spelunk),tunnels=m.tunnels.slice(0,root.WORLD7_CATALOG.SpelunkRocks.length);return [
  ...m.upgrades.map(x=>({...row('upgrade:'+x.id,x.name,number(saved?.[5]?.[x.id]),'CaveShopUpg'+x.id),section:'upgrades'})),
  ...tunnels.flatMap(x=>[
    {...row('grand:'+x.id,x.name,number(saved?.[44]?.[x.id]),'CaveDoor'+x.id,'Discoveries'),section:'grand',tunnel:x.id},
    {...row('regular:'+x.id,x.name,number(saved?.[1]?.[x.id]),'CaveDoor'+x.id,'Depth'),section:'depths',mode:'regular',tunnel:x.id},
    {...row('manic:'+x.id,x.name,number(saved?.[47]?.[x.id]),'CaveDoor'+x.id,'Depth'),section:'depths',mode:'manic',tunnel:x.id},
    {...row('haul:'+x.id,x.name+' · Best haul',number(saved?.[2]?.[x.id]),'CaveDoor'+x.id,'Amber'),section:'amber'}
  ]),
  ...m.rocks.map(x=>({...row('rock:'+x.id,x.name,Array.isArray(saved?.[6])?Number(x.found):null,(x.index===root.WORLD7_CATALOG.SpelunkRocks[x.tunnel].length-1?'CaveBoss'+x.tunnel:'CaveRock'+(x.tunnel===0?'_':String.fromCharCode(96+x.tunnel))+x.index),''),level:!Array.isArray(saved?.[6])?'Unavailable':x.found?'Discovered':'Not discovered',section:'rocks'}))
 ];});
 if(has('Spelunk')){
  const saved=parse(d.Spelunk),chapterNames=['The Fear Within','Decay Surrounds','This Is Gospel','No Escape','Sunken Plunder','Kelp Primeval','Burning Crusade'];
  for(const [chapter,bonuses] of (root.WORLD7_CATALOG.SpelunkChapters||[]).entries())for(const [index,bonus] of bonuses.entries()){
    const level=number(saved?.[8]?.[chapter*4+index]),template=clean(bonus[0]).replaceAll('|',' '),name=template.replace(/[{}]/g,'').replace(/^[+%x ]+/,'');
    const base=Number(bonus[1]),scale=Number(bonus[2]),type=bonus[3],multi=Number(bonus[4])===1?1+(systems.get('sailing')?.artifacts?.[35]?.getBonus?.()||0)/100:1;
    const amount=level===null?null:type.startsWith('decay')?base*level/(scale+level||1):base*level+scale;
    const effect=amount===null?'Bonus unavailable':template.replace('{',fmt(amount*multi)).replace('}',fmt(Math.max(1,(amount+(type==='decayMulti'?1:0))*multi)));
    out.cmp_spelunking.push({...row('lore:'+chapter+':'+index,(chapterNames[chapter]||'Chapter '+(chapter+1))+' · '+name,level,'Spelunking'+chapter,'Level',effect),section:'lore',chapter});
  }
 }
 put('gallery',Array.isArray(parse(d.Spelunk)?.[16])||Array.isArray(parse(d.Spelunk)?.[17]),()=>{const saved=parse(d.Spelunk),m=root.Gallery.model(d);return [...(Array.isArray(saved[16])?m.trophies:[]).map(x=>row('trophy:'+x.id,x.name,x.count,'Trophy'+x.id,'Copies',x.stored+' stored · '+x.displayed+' displayed')),...(Array.isArray(saved[17])?m.nametags:[]).map(x=>row('tag:'+x.id,x.name,x.grade,(x.id===44?'EquipmentNametag44':'NametagLeft_'+x.id),'Grade'))];});

 const section=(r,name)=>({...r,section:name});
 put('capacity',prefix('MaxCarryCap_'),()=>Object.keys(d).filter(k=>/^MaxCarryCap_\d+$/.test(k)).flatMap(k=>Object.entries(parse(d[k])||{}).filter(([type])=>!['Quests','Statues','fillerz'].includes(type)).map(([type,value])=>row(k+':'+type,player(k.split('_')[1])+' · '+({bCraft:'Materials',Bugs:'Catching',Foods:'Food',Chopping:'Logs',Mining:'Ores'}[type]||type),value,null,'Base capacity','Saved bag capacity before character multipliers'))));
 put('bags',prefix('InvBagsUsed_'),()=>Object.keys(d).filter(k=>/^InvBagsUsed_\d+$/.test(k)).flatMap(k=>{const used=parse(d[k])||{};return [...items.values()].filter(x=>/^InvBag\d+$/.test(x.internalName)).map(x=>{const id=Number(x.internalName.replace('InvBag','')),key=id<100?id-1:id,owned=Object.hasOwn(used,String(key));return {...row(k+':'+id,player(k.split('_')[1])+' · '+x.displayName,Number(owned),x.internalName),level:owned?'Used':'Not used'};});}));
 put('arcade',has('ArcadeUpg'),()=>{const levels=parse(d.ArcadeUpg);return (systems.get('arcade')?.bonuses||[]).filter(x=>!/who knows|filler/i.test(clean(x.effect))).map(x=>row(x.index,clean(x.effect).replace(/[{}]/g,'').replace(/^[+% ]+/,''),number(levels?.[x.index]),null));});
 put('equinox',has('Dream'),()=>{const e=systems.get('equinox');return [...(e?.upgrades||[]).map(x=>section(row('upgrade:'+x.index,x.data.name,x.level,null,'Level',clean(x.data.upgrade)),'Upgrades')),...(e?.challenges||[]).map(x=>section({...row('dream:'+x.index,clean(x.data.challenge),Number(x.complete),null),level:x.complete?'Completed':'Incomplete'},'Dreams'))];});
 put('trapping',prefix('PldTraps_'),()=>Object.keys(d).filter(k=>/^PldTraps_\d+$/.test(k)).flatMap(k=>(parse(d[k])||[]).map((trap,i)=>{const empty=Number(trap[0])===-1;return row(k+':'+i,player(k.split('_')[1])+' · Trap '+(i+1),empty?0:number(trap[4]),empty?null:trap[3],'Critters',empty?'Empty trap slot':itemName(trap[3])+' · '+fmt(trap[6]/3600)+' hours');})));
 put('breeding',has('Pets'),()=>{const b=systems.get('breeding');return [...(b?.upgrade||[]).map((x,i)=>row('upgrade:'+i,i===0?'Breeding EXP (hidden upgrade)':clean(x.data?.upgradeName||x.name||'Breeding upgrade '+(i+1)).split('}')[0].trim(),x.level,i===0?'PetEgg':art(x))),row('arena','Highest arena wave',b?.arenaWave,'PetEgg','Wave'),row('eggs','Eggs waiting',b?.eggsUnclaimed,'PetEgg','Eggs'),row('cells','Dead cells',b?.deadCells,'PetEgg','Cells')];});
 const research=parse(d.Research);
 put('minehead',Array.isArray(research?.[7])||Array.isArray(research?.[8]),()=>{const m=root.World7.minehead(d),bosses=root.World7.mineheadBosses(d);return [...m.upgrades.map(x=>section(row('upgrade:'+x.id,x.name,number(research?.[8]?.[x.id]),'MineUpg'+x.id,'Level','Maximum level '+x.max),'Upgrades')),...bosses.bosses.map(x=>section({...row('boss:'+x.id,x.name,bosses.known?Number(x.status==='Defeated'):null,null,'',x.reward),icon:x.icon,level:x.status},'Bosses')),...[[4,'Bosses defeated'],[5,'Minehead currency'],[6,'Best hit'],[8,'Daily tries remaining']].map(([i,name])=>section(row('stat:'+i,name,number(research?.[7]?.[i]),null,''),'Progress'))];});
 put('jelly',Array.isArray(research?.[17]),()=>[...root.JellyEngine.UPGRADE_META.map(x=>section(row('upgrade:'+x.id,x.name,number(research[17]?.[x.id]),'JellyUpg'+x.id,'Level',x.desc),'Upgrades')),...root.JellyEngine.UNIT_NAMES.map((name,i)=>section(row('cell:'+i,name,number(research?.[16]?.[i]),'JellyUnit'+i),'Cells')),...[[9,'Operation'],[10,'Attempts remaining'],[11,'Bloodcells'],[12,'Best DPS'],[13,'Fever'],[14,'Best bloodcell reward']].map(([i,name])=>section(row('stat:'+i,name,number(research?.[7]?.[i]),null,''),'Progress'))]);
 if(has('Ninja')){
  const ninja=systems.get('sneaking'),saved=parse(d.Ninja);
  out.cmp_sneaking=out.cmp_sneaking.map(r=>section(r,r.id.startsWith('jade:')?'Jade Emporium':'Knowledge'));
  for(const p of ninja?.players||[]){out.cmp_sneaking.push(section(row('ninja:'+p.index,'Ninja '+(p.index+1),p.level,'NinjaBar0','Level',p.activity),'Ninjas'));for(const [slot,item] of Object.entries(p.equipment||{})){const id=item?.data?.internalId;out.cmp_sneaking.push(section({...row('gear:'+p.index+':'+slot,'Ninja '+(p.index+1)+' · '+slot,item?.level??null,id,'Level',item?.data?.name||'Empty'),status:'active',level:id?(item.data.name+(item.level!=null?' · Level '+fmt(item.level):'')):'Empty'},'Gear'));}}
  for(const [i,name] of ['Aquamarine','Malachite','Garnet','Starite','Topaz','Moissanite','Emerald','Firefrost'].entries())out.cmp_sneaking.push(section(row('gem:'+i,name,number(options?.[233+i]),'NjGem'+i),'Gemstones'));
  out.cmp_sneaking.push(section(row('mastery','Selected mastery',number(options?.[231]),'NinjaBar0','Rank'),'Mastery'));
  for(const x of ninja?.pristineCharms||[])out.cmp_sneaking.push(section({...row('charm:'+x.index,x.data.name,Number(x.unlocked),x.data.internalId),level:x.unlocked?'Collected':'Not collected'},'Pristine Charms'));
 }

 return out;
}
root.JsonCompareModels={build};
})(typeof window!=='undefined'?window:globalThis);
