(function(root){
  'use strict';
  const fmt=v=>{const n=Number(v);if(v==null||!Number.isFinite(n))return 'Unknown';if(Math.abs(n)>=1e18)return n.toExponential(2).replace('e+','e');for(const [d,s] of [[1e15,'Q'],[1e12,'T'],[1e9,'B'],[1e6,'M'],[1e3,'K']])if(Math.abs(n)>=d)return +(n/d).toFixed(2)+s;return n.toLocaleString('en-US',{maximumFractionDigits:2});};
  const clean=v=>String(v??'').replaceAll('_',' ').replaceAll('@',' ').trim();
  const effect=(text,value)=>clean(text).replace(/\}x/g,fmt(1+value/100)+'x').replace('$',fmt(Math.floor((value+4)/(value+100)*1000)/10)).replace(/[{}]/g,fmt(value));
  // The client advances only after progress is strictly greater than a threshold.
  function shinyLevelFromProgress(value){
    if(value==null||value===''||!Number.isFinite(Number(value))||Number(value)<0)return null;
    const progress=Number(value);if(progress===0)return 0;
    let level=1;
    for(let n=1;n<20;n++)if(progress>Math.floor((1+Math.pow(n,1.6))*Math.pow(1.7,n)))level=n+1;
    return level;
  }
  function build(systems,raw={}){
    const out={},breeding=systems.get('breeding'),vault=systems.get('upgradeVault'),emperor=systems.get('emperor'),tome=systems.get('tome'),slab=systems.get('slab');
    const row=(name,effect,level,icon,extra={})=>({name:clean(name),effect:clean(effect),level,icon:`assets/${/^(MotherlodeTREE|(?:Bone|Dust|Tach|DungRNG)\d+)$/.test(icon)?icon+'_x1':icon}.png`,status:'active',...extra});
    const arena=['Unlocks 3rd mob battle slot','+25% Library VIP membership','1.20x total damage','New Post Office upgrade crate','Unlocks 4th mob battle slot','1.5x monster cash','New Post Office upgrade crate','−50% kitchen upgrade costs','Unlocks 5th mob battle slot','New Post Office upgrade crate','+60% Library VIP membership','Equip a 3rd large bubble','Unlocks 6th mob battle slot','+20% line width for all players','2x monster cash','1.40x total damage'];
    if(breeding){
      const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v;}catch{return null;}},saved=parse(raw?.data)||raw||{},b=parse(saved.Breeding),opts=parse(saved.OptionsListAccount??saved.OptLacc),rawPets=parse(saved.Pets),stored=parse(saved.PetsStored),rawTerritory=parse(saved.Territory);
      const arenaWave=opts?.[89]!=null&&Number.isFinite(Number(opts[89]))?Number(opts[89]):null;
      const breedingWorlds=Math.max(3,Number(opts?.[117])||0);
      const petUnlocked=p=>b?.[1]?.[p.data.world]==null?null:p.data.world<breedingWorlds&&p.indexInWorld<Number(b[1][p.data.world]);
      const species=(breeding.basePets||[]).filter(p=>p.data.world<4&&p.data.petId!=='_').map(p=>({id:p.data.petId,world:p.data.world+1,order:p.indexInWorld,gene:p.gene.data.name,unlocked:petUnlocked(p)}));
      const inventory=[];
      for(const [zone,values] of [['Assigned',rawPets],['Storage',stored]])for(const [slot,rawPet] of Object.entries(values||{})){
        const p=parse(rawPet),g=breeding.genes?.[Number(p?.[1])],power=Number(p?.[2]);
        if(!Array.isArray(p)||!species.some(s=>s.id===p[0])||!g||!Number.isFinite(power)||power<=0)continue;
        inventory.push({key:zone+slot,id:p[0],gene:g.data.name,power,slot:Number(slot),location:zone==='Storage'?'Storage #'+(Number(slot)+1):Number(slot)<27?'Fenceyard #'+(Number(slot)+1):'Territory '+(Math.floor((Number(slot)-27)/4)+1)+' · slot '+((Number(slot)-27)%4+1)});
      }
      out.breedingTeams=[{arenaWave,inventoryKnown:rawPets!=null||stored!=null,species,inventory,genes:(breeding.genes||[]).map(g=>({name:g.data.name,active:clean(g.data.description),passive:clean(g.data.combatDescription)})),territories:(breeding.territory||[]).filter(t=>t.index!==14&&t.data.battleName!=='Filler Filler').map((t,i)=>({index:i,name:clean(t.data.battleName),unlocked:opts?.[85]==null?null:i<Number(opts[85]),requirement:t.data.fightPower,rounds:rawTerritory?.[i]?.[1]??null,pets:inventory.filter(p=>p.location.startsWith('Territory '+(i+1)+' ·'))}))}];
      const waves=[2,5,8,12,15,20,25,35,50,65,80,100,125,150,175,200];
      out.petArena=arena.map((text,i)=>{
        const wave=waves[i],owned=arenaWave!==null&&arenaWave>=wave;
        return row(`Wave ${wave}`,text,arenaWave===null?'Unknown':owned?'Unlocked':'Locked','pets-static/mushG',{status:arenaWave===null?'unknown':owned?'maxed':'missing',summary:arenaWave===null?'Arena progress is missing from this export.':`Highest arena wave: ${fmt(arenaWave)} · ${waves.filter(w=>arenaWave>=w).length} / 16 rewards`,detail:arenaWave===null?'Import arena progress to check this reward.':owned?'Permanent arena reward unlocked.':`${wave-arenaWave} more waves to this reward.`});
      });
      out.shinyPets=(breeding.shinyBonuses||[]).map(x=>{
        const pets=(x.pets||[]).filter(p=>p.data.world<4&&p.data.petId!=='_').map(p=>{
          const level=shinyLevelFromProgress(b?.[22+p.data.world]?.[p.indexInWorld]);
          return {id:p.data.petId,world:p.data.world+1,order:p.indexInWorld,level,unlocked:petUnlocked(p),bonus:level===null?'Saved progress unavailable':effect(x.data.text,level*x.data.bonusPerLevel),perLevel:effect(x.data.text,x.data.bonusPerLevel),icon:'assets/pets-static/'+(root.ARCADE_PAGE_ASSETS?.petSprites?.includes(p.data.petId)?p.data.petId:'mushG')+'.png'};
        });
        const complete=pets.every(p=>p.level!==null),totalLevels=pets.reduce((sum,p)=>sum+(p.level??0),0);
        return row(clean(x.data.text).replace(/^[+{}%x ]+/g,''),complete?effect(x.data.text,totalLevels*x.data.bonusPerLevel):'Bonus unavailable: incomplete shiny records',`${fmt(totalLevels)} ${complete?'combined':'known'} levels`+(complete?'':' · incomplete'),`pets-static/${pets.find(p=>root.ARCADE_PAGE_ASSETS?.petSprites?.includes(p.id))?.id||'mushG'}`,{status:!complete?'unknown':totalLevels?'active':'missing',bonusId:x.data.index,pets,detail:pets.map(p=>`${clean(p.id)}: shiny ${p.level===null?'unknown':'Lv '+p.level}`).join(' · ')});
      });
    }
    if(vault)out.upgradeVault=vault.bonuses.map(x=>row(x.data.name,x.getDescription(),`Lv ${fmt(x.level)}${x.level<=x.data.max_level?' / '+fmt(x.data.max_level):''}`,`VaultUpg${x.id}`,{status:!x.unlocked?'missing':x.level>=x.data.max_level?'maxed':'active',cost:x.cost,detail:x.level>=x.data.max_level?'Catalog maximum reached (additional granted levels are retained).':`Next upgrade cost shown in coins. ${fmt(x.data.max_level-x.level)} levels to catalog maximum.`}));
    if(emperor)out.emperorBonuses=emperor.emperorBonuses.map(x=>{const next=x.data.levelMappings.includes(emperor.emperorKills%48),bonus=x.getBonus(),projected=Math.floor(x.data.bonusValue*(x.level+(next?1:0))*(1+(x.arcaneBonus48+x.arcadeBonus51)/100));const second=x.data.levelMappings.includes((emperor.emperorKills+1)%48),afterTwo=Math.floor(x.data.bonusValue*(x.level+(next?1:0)+(second?1:0))*(1+(x.arcaneBonus48+x.arcadeBonus51)/100));let futureLevel=x.level;const killProjections=Array.from({length:25},(_,i)=>{const improved=x.data.levelMappings.includes((emperor.emperorKills+i)%48);if(improved)futureLevel++;return{kill:emperor.emperorKills+i+1,level:futureLevel,improved,effect:effect(x.data.bonusName,Math.floor(x.data.bonusValue*futureLevel*(1+(x.arcaneBonus48+x.arcadeBonus51)/100)))};});return row(clean(x.data.bonusName).replace(/^\+?\{%?\s*|^\}x\s*|^\$%\s*/, ''),effect(x.data.bonusName,bonus),`Lv ${x.level}`,['ClassIcons58','Bone0_x1','ClassIcons57','Opal','ClassIcons29','Quest78','Tach0_x1','ClassIcons56','ClassIcons59','ClassIcons60','ClassIcons61','Owlb_5'][x.index],{killProjections,emperorKills:emperor.emperorKills,afterOne:effect(x.data.bonusName,projected),afterTwo:effect(x.data.bonusName,afterTwo),second,levelOne:x.level+(next?1:0),levelTwo:x.level+(next?1:0)+(second?1:0),status:x.level?'active':'missing',next,summary:`${fmt(emperor.emperorKills)} Emperor kills · Next boss HP: ${fmt(emperor.bossHP)}`,projection:next?`Next kill → ${effect(x.data.bonusName,projected)}`:'Unchanged after next kill',detail:`${[9,10].includes(x.index)?'Reserved World 7 bonus in the installed client; no specific active effect is claimed. ':''}Next kill: ${x.level} → ${x.level+(next?1:0)} levels. Projection holds your current Arcade and Arcane multipliers fixed.`});});
    if(tome){const player=Math.max(0,tome.highestScoreIndex||0);out.tome=tome.lines.map(x=>{const bounded=['linearToMax','boundedDecay'].includes(x.data.scalingType),score=x.getPlayerScore(player),target=x.data.totalVal;return row(x.getLineName(),x.getLineDescription(),fmt(score)+' points','TomeClaim',{id:x.index,order:x.getDisplayOrder(),status:!x.unlocked?'missing':bounded&&score>=target?'maxed':'active',score,target,bounded,progress:Math.max(0,Math.min(1,score/target)),value:fmt(x.currentValues?.[player]),unlock:x.getLineUnlockLevel(),summary:`Calculated score: ${tome.getPlayerTotalScore(player).toLocaleString('en-US')} · Best account score: ${tome.highestScore.toLocaleString('en-US')} · ${clean(raw.charNames?.[player]||'Character '+(player+1))} · ${tome.getScoreRankingDisplay()} (saved thresholds)`,detail:bounded?`Maximum: ${fmt(target)} points`:`Benchmark: ${fmt(target)} points. This metric can scale beyond its benchmark; it has no finite reachable cap.`});}).sort((a,b)=>a.order-b.order);
      const current=root.TomeCurrent?.build(tome,raw);if(current)out.tome=current.rows;
      out.tomeBonuses=(tome.epilogueBonuses||[]).map(x=>row('Epilogue '+(x.index+1),current&&!current.complete?'Bonus requires complete Tome progress':effect(x.data.bonus,x.getBonus(current?.score??tome.highestScore)),x.unlocked?'Unlocked':'Locked','TomeClaim',{status:x.unlocked?'active':'missing'}));}
    if(slab){out.slab=slab.obtainableItems.map(x=>row(x.displayName,(x.sources?.sources||[]).map(s=>s.txtName).filter(Boolean).join(' · ')||'Source details unavailable',x.obtained?'Found':'Missing',x.internalName,{id:x.internalName,group:clean(x.type||x.typeGen||'Other'),status:x.obtained?'maxed':'missing',summary:`${slab.obtainableItems.filter(x=>x.obtained).length} / ${slab.obtainableItems.length} obtainable items found · Raw saved count: ${fmt(slab.rawObtainedCount)}`}));
      const saved=raw?.data||raw||{},greenStacks=String(saved.GreenStacks??'').split(',').map(x=>x.trim()).filter(Boolean),greenSet=new Set(greenStacks),byId=new Map(slab.obtainableItems.map(x=>[x.internalName,x])),nonStorable=new Set(['CURRENCY','DUNGEON_EVAPORATE','DUNGEON_FOOD','DUNGEON_ITEM','DUNGEON_KEY']),candidates=slab.obtainableItems.filter(x=>typeof x.typeGen==='string'&&!x.typeGen.startsWith('a')&&!nonStorable.has(x.type));
      const stackRow=item=>{const stacked=greenSet.has(item.internalName);return row(item.displayName,(item.sources?.sources||[]).map(s=>s.txtName).filter(Boolean).join(' · ')||'Source details unavailable',stacked?'Greenstacked':'Not greenstacked',item.internalName,{id:item.internalName,group:clean(item.type||item.typeGen||'Other'),status:stacked?'maxed':'missing',summary:`${candidates.filter(x=>greenSet.has(x.internalName)).length} / ${candidates.length} eligible items Greenstacked`});};
      out.slabGreenStacks=[...candidates.map(stackRow),...greenStacks.filter(id=>!byId.has(id)).map(id=>row(id,'Recorded in the save GreenStacks registry.','Greenstacked',id,{id,group:'Other',status:'maxed',summary:`${greenStacks.length} registered Greenstacks`}))];
      out.slabBonuses=(slab.bonuses||[]).map(x=>row(x.type,`+${fmt(x.bonus)}% ${x.type}`,'Active','Slab5'));}
    return out;
  }
  root.ProgressionModels={build,fmt,shinyLevelFromProgress};
})(typeof window!=='undefined'?window:globalThis);
