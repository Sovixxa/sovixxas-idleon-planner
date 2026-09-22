(function(root){
  'use strict';
  const parse=v=>{if(typeof v==='string'){try{return JSON.parse(v);}catch{}}return v;};
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const fmt=v=>root.ProgressionModels?root.ProgressionModels.fmt(v):num(v).toLocaleString('en-US',{maximumFractionDigits:2});
  const pretty=v=>String(v??'').replaceAll('_',' ').replaceAll('@',' ').replace(/\s+/g,' ').trim();
  const image=name=>name?`assets/${name}.png`:null;
  function rank(kills,mini=false,rift=false){
    const limits=mini?[100,250,1000,5000,25000,100000,1000000]:[25000,100000,250000,500000,1000000,5000000,100000000];
    const values=[0,1,2,3,4,5,7];
    const index=limits.findIndex(limit=>kills<limit);
    return index<0?(!mini&&rift&&kills>1e9?20:10):values[index];
  }
  function build(systems,raw={}){
    const data=parse(raw.data)||raw,field=(...keys)=>{for(const key of keys){const v=parse(data[key]);if(v!=null)return v;}return null;};
    const rows={},options=field('OptionsListAccount','OptLacc');
    const make=(name,effect,level,icon,extra={})=>({name:pretty(name),effect:pretty(effect),level:level==null?'Unknown':`Lv ${fmt(level)}`,status:level==null?'unknown':level>0?'active':'missing',icon:image(icon),...extra});
    const alchemy=systems.get('alchemy');
    const vialLevels=field('CauldronInfo');
    rows.vials=(alchemy?.vials||[]).map(x=>make(x.name,x.getBonusText(),vialLevels?x.level:null,x.requirements?.[0]?.internalName,{source:'Vials',group:'Vials',detail:`${x.level>=13?'Max level reached. ':''}Includes decoded vial multipliers. Material: ${x.requirements?.[0]?.displayName||'Unknown'}.`,status:vialLevels?(x.level>=13?'maxed':x.level>0?'active':'missing'):'unknown'}));
    const sigils=systems.get('sigils');
    rows.sigils=(sigils?.sigils||[]).map(x=>make(x.data.name,x.getBonusText(),field('CauldronP2W')?x.boostLevel:null,`aSiga${x.index}`,{source:'Sigils',level:field('CauldronP2W')?['Unlocked','Boosted','Ionized','Ethereal','Eclectic'][x.boostLevel]||'Locked':'Unknown',status:!field('CauldronP2W')?'unknown':x.boostLevel<0?'missing':x.boostLevel===4?'maxed':'active',detail:`${fmt(x.progress)} charge · ${fmt(x.activePlayers)} assigned. Includes ${fmt(1+x.artifactBoost)}x artifact multiplier.`}));
    const salt=systems.get('saltLick');
    rows.saltLick=(salt?.bonuses||[]).map((x,i)=>make(pretty(x.data.desc).replace(/[{}]/g,'').replace(/^\+?\s*%?\s*/,''),salt.getBonusText(i),field('SaltLick')?x.level:null,x.data.item||x.data.reqItem||'ConTower3',{source:'Salt Lick',level:field('SaltLick')?`Lv ${x.level} / ${x.data.maxLevel}`:'Unknown',status:!field('SaltLick')?'unknown':x.level>=x.data.maxLevel?'maxed':x.level?'active':'missing',detail:x.level<x.data.maxLevel?`Next upgrade: ${fmt(salt.getCost(i))} ${pretty(x.data.item||x.data.reqItem||'resources')}.`:'Maximum level reached.'}));
    const collider=systems.get('collider');
    rows.atomCollider=(collider?.atoms||[]).map(x=>make(x.data.name,x.getBonusText(),field('Atoms')?x.level:null,`Atom${x.index}`,{source:'Atom Collider',level:field('Atoms')?`Lv ${x.level} / ${x.getMaxLevel()}`:'Unknown',status:!field('Atoms')?'unknown':x.level>=x.getMaxLevel()?'maxed':x.level?'active':'missing',detail:`${fmt(collider.particles)} particles available. ${x.level<x.getMaxLevel()?`Next upgrade: ${fmt(x.getCost())} particles.`:'Maximum level reached.'}${x.index===0?` Current stamp discount: ${fmt(x.getBonus())}%.`:''}`}));
    for(const [index,x] of (root.ARCADE_PAGE_ASSETS?.atoms||[]).entries())if(index>=(collider?.atoms?.length||0)){
      const level=field('Atoms')?.[index],cap=collider?.atoms?.[0]?.getMaxLevel();
      rows.atomCollider.push(make(x[0],x[5].replace('{',fmt(num(level)*num(x[4]))),level,`Atom${index}`,{source:'Atom Collider',level:level==null?'Unknown':`Lv ${level}${cap?' / '+cap:''}`,status:level==null?'unknown':cap&&level>=cap?'maxed':level?'active':'missing',detail:'Unlocked by the Sushi Atom Collider unlock. This is a separate Jelly Bloodcell gain multiplier.'}));
    }
    const killDefs=[['Artifact Find Chance',228,1,1,300,'x'],['Crop Evolution Chance',229,1,9,300,'x'],['Sneaking Jade Gain',230,1,2,300,'x'],['Gallery Grade',467,0,10,200,'gallery'],['Masterclass Drops',468,1,1.3,200,'x'],['World 7 Skill EXP',469,1,.8,150,'x'],['Daily Coral Gain',470,0,25,250,'%'],['Future Bonus',471,1,2,200,'x']];
    rows.killroy=killDefs.map(([name,slot,base,scale,decay,unit],i)=>{const level=options?.[slot],value=base+scale*num(level)/(decay+num(level));return make(name,`${unit==='gallery'?'+'+fmt(value/100)+'x':unit==='%'?'+'+fmt(value)+'%':fmt(value)+'x'} ${name}`,level,'KillsSkull',{source:'Killroy',detail:unit==='gallery'?'Adds to the gallery multiplier for podiums with at least two levels.':name==='Future Bonus'?'Reserved by the installed client; no active benefit is claimed.':`Next level: ${fmt(base+scale*(num(level)+1)/(decay+num(level)+1))}${unit}.`});});
    rows.killroy.unshift(make('Third Weekly Battle','Unlocks a third Killroy fight each week.',options?.[227],'KillsSkull',{source:'Killroy',level:options?.[227]==null?'Unknown':num(options[227])?'Unlocked':'Locked',status:options?.[227]==null?'unknown':num(options[227])?'maxed':'missing'}));
    const dungeon=systems.get('dungeons'),upgrades=field('DungUpg');
    rows.dungeons=[];
    for(const [type,passives] of dungeon?.passives||[]){for(const x of passives){const max=type==='Flurbo'?50:100,unit=x.type==='%'?'%':x.type==='+'?'':x.type;rows.dungeons.push(make(x.effect,`+${fmt(x.getBonus())}${unit||''} ${pretty(x.effect)}`,upgrades?.[type==='Flurbo'?5:1]?.[x.index],type==='Flurbo'?'DungCredits2':`DungStatTr${x.index}`,{source:'Dungeons',group:type==='Flurbo'?'Account Bonuses':'Dungeon Stats',status:!upgrades?'unknown':x.level>=max?'maxed':x.level?'active':'missing',detail:`${type==='Flurbo'?'Applies outside Dungeons.':'Applies inside Dungeons.'} ${x.level<max?`Next level: ${fmt(x.getUpgradeCost())} ${type==='Flurbo'?'Flurbos':'Credits'}.`:'Maximum level reached.'} Rank ${fmt(dungeon.rank)} · ${fmt(dungeon.flurbos)} Flurbos · ${fmt(dungeon.credits)} Credits.`}));}}
    for(const x of dungeon?.items||[])rows.dungeons.push(make(x.name,x.getBonusText(),upgrades?.[0]?.[x.index],`DungItems${x.index}`,{source:'Dungeons',group:'RNG Items',detail:`${x.rarity} · Dungeon item effect. Maximum level ${x.maxLevel}.`}));
    for(const x of dungeon?.traits||[])rows.dungeons.push(make(x.setName||'Dungeon Trait',x.bonus,upgrades?Number(x.active):null,`DungTrait${x.active?'A':'B'}${x.index}`,{source:'Dungeons',group:'Traits',level:upgrades?(x.active?'Selected':'Not selected'):'Unknown'}));
    const prayerLevels=field('PrayersUnlocked','PrayOwned'),prayers=systems.get('prayers');
    rows.prayers=Object.values(prayers||{}).map(x=>{const lv=prayerLevels?.[x.index],equipped=Object.keys(data).filter(k=>/^Prayers_\d+$/.test(k)&&(parse(data[k])||[]).map(Number).includes(x.index)).map(k=>raw.charNames?.[Number(k.split('_')[1])]||`Character ${Number(k.split('_')[1])+1}`);const bonus=Math.round(x.data.x1*(1+(num(lv)-1)/10)),curse=Math.round(x.data.x2*(1+(num(lv)-1)/10));return make(x.data.name,lv==null?'Bonus unknown':num(lv)>0?x.data.bonus.replace('{',fmt(bonus)):'Locked · no prayer bonus',lv,`Prayer${x.index}`,{source:'Prayers',detail:`${num(lv)>0?'Curse: '+x.data.curse.replace('{',fmt(curse))+'. ':''}Equipped: ${equipped.join(', ')||'Nobody'}. Prayer benefits apply when equipped; Gaming's passive prayer effects are separate.`,level:lv==null?'Unknown':`Lv ${lv} / ${x.data.maxLevel}`});});
    const death=systems.get('deathnote'),knownKills=Object.keys(data).some(k=>/^KLA_/.test(k));
    rows.deathNote=[];
    for(const [world,mobs] of death?.getKillsMap?.()||[]){const mini=world==='Minibosses',total=[...mobs.values()].reduce((sum,k)=>sum+rank(k,mini,death.hasRiftBonus),0);for(const [name,kills] of mobs){const value=rank(kills,mini,death.hasRiftBonus),next=mini?({0:100,1:250,2:1000,3:5000,4:25000,5:100000,7:1000000}[value]):({0:25000,1:100000,2:250000,3:500000,4:1000000,5:5000000,7:100000000,10:death.hasRiftBonus?1000000001:0}[value]);rows.deathNote.push(make(name,`+${value}% ${mini?'account':'world'} multikill per damage tier`,knownKills?kills:null,`StatusSkull${value?value-1-Math.floor(value/7)-2*Math.floor(value/10):0}`,{source:'Death Note',group:world,level:knownKills?`${fmt(kills)} kills`:'Unknown',status:!knownKills?'unknown':next?'active':'maxed',detail:`${world}: +${total}% from skulls. ${next?`${fmt(Math.max(0,next-kills))} kills to next skull (${fmt(next)} total).`:'Highest available skull.'}`}));}}
    const owned=field('BribeStatus');
    rows.bribes=(root.BRIBES_CATALOG||[]).map((x,i)=>make(x[0],x[1],owned?.[i],`BribeO${x[3]}`,{source:'Bribes',group:x[4]==='BribeExpansion'?'Unlocks':'Bonuses',level:owned?.[i]==null?'Unknown':num(owned[i])?'Purchased':'Not purchased',status:owned?.[i]==null?'unknown':num(owned[i])?'maxed':'missing',cost:num(x[2]),detail:'Listed purchase cost; affordability and prerequisites are not inferred.'}));
    const armor=root.ArmorSets?.model(data);
    rows.armorSets=(armor?.rows||[]).map(x=>make(x.name,x.bonus,armor.available?Number(x.unlocked):null,root.ARCADE_PAGE_ASSETS?.armor[x.id]||'SmithingHammerChisel',{source:'Armor Sets',level:armor.available?(x.unlocked?'Unlocked':'Locked'):'Unknown',status:!armor.available?'unknown':x.unlocked?'maxed':'missing',detail:`Armor: ${x.armor.join(', ')}.${x.tools.length?` Tools (equip ${x.requiredTools}): ${x.tools.join(', ')}.`:''}${x.weapons.length?` Weapons (equip ${x.requiredWeapon}): ${x.weapons.join(', ')}.`:''}`}));
    rows.prayers=rows.prayers.filter(x=>!/^Some Prayer Name/.test(x.name));
    const bits=systems.get('gaming')?.superbits||[],passiveFraction=(bits[9]?.unlocked||bits[39]?.unlocked)?[9,39,53].reduce((sum,id)=>sum+(bits[id]?.unlocked ? .2 : 0),0):0;
    rows.prayers.forEach((row,index)=>{if(passiveFraction&&index!==5&&num(prayerLevels?.[index])>0){const prayer=prayers[index],value=Math.round(passiveFraction*prayer.data.x1*(1+(num(prayerLevels[index])-1)/10));row.detail+=` With no prayers equipped: ${prayer.data.bonus.replace('{',fmt(value))}, no curse (${fmt(passiveFraction*100)}% from Gaming).`;}});
    if(rows.bribes[0])rows.bribes[0].detail+=' The game description says 5%; the installed bonus parameter is 8.';
    for(const list of Object.values(rows))for(const x of list){if(x.status==='unknown'){x.effect='Saved bonus unavailable';x.detail='This field is missing from the export. Import a complete save to see its current value.';}}
    return rows;
  }
  const api={build,rank};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadePageModels=api;
})(typeof window!=='undefined'?window:globalThis);
