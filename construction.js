/* Cap formulas audited against the installed game: WorkbenchStuff ExtraMaxLvAtom,
 * ConstMasteryBonus, Holes GambitPts/GambitPtsREQ, Sushi RoG_BonusQTY.
 * Never substitute a catalog's display column [10] for an account's actual cap. */
(function(root){
  'use strict';
  const parse=v=>{if(typeof v==='string'){try{return JSON.parse(v);}catch{return null;}}return v;};
  const num=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
  const fmt=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:0});
  function evaluate(data,catalog){
    const tower=parse(data.Tower??data.TowerInfo),rift=parse(data.Rift),atoms=parse(data.Atoms),spelunk=parse(data.Spelunk),sushi=parse(data.Sushi),holes=parse(data.Holes);
    const levels=catalog.map((_,id)=>num(tower?.[id]));
    const total=levels.every(n=>n!==null)?levels.reduce((a,b)=>a+b,0):null;
    const riftLevel=num(rift?.[0]);
    const unique=sushi?.[5]==null?null:(()=>{let n=0;while(n<64&&num(sushi[5][n])!==null&&Number(sushi[5][n])>=0)n++;return n;})();
    const carbon=num(atoms?.[5]),dances=num(spelunk?.[4]?.[6]);
    const times=Array.from({length:6},(_,i)=>num(holes?.[11]?.[65+i]));
    const rawPoints=times.every(n=>n!==null)?times.reduce((sum,n,i)=>sum+(i===0?100:200)*(n+3*Math.floor(n/10)+10*Math.floor(n/60)),0):null;
    const gambitRequired=2000+1000*10*(1+9/5)*Math.pow(1.26,9);
    // All Gambit score multipliers are non-negative. A sufficient unmultiplied
    // score proves this fixed reward is unlocked without approximating bonuses.
    const gambit=rawPoints===null?null:rawPoints>=gambitRequired?100:rawPoints===0?0:null;
    function mastery(threshold,amount){return riftLevel===null?null:riftLevel<40?0:total===null?null:total>=threshold?amount:0;}
    function masterSource(threshold,amount){const value=mastery(threshold,amount);return {name:'Construction Mastery',value,amount,action:`Clear Rift 40 and reach ${fmt(threshold)} total Construction building levels.`,progress:`Rift: ${riftLevel??'unknown'}/40 · Total building levels: ${total===null?'unknown':fmt(total)}/${fmt(threshold)}`};}
    const rows=catalog.map((r,id)=>{
      const level=levels[id],base=Number(r[8]),sources=[];
      if(id===6)sources.push(masterSource(500,35));
      if(id===1)sources.push(masterSource(1000,100));
      if(id>=9&&id<=17){
        sources.push({name:'Carbon — Wizard Maximizer',value:carbon===null?null:2*carbon,amount:null,action:'Each additional Carbon level adds +2 to all wizard tower caps. If Carbon is capped, raise atom max levels through Gaming Superbit #24 (+10), Compass → Atomic Potential (+1 per level, up to +20), or Summoning Event Shop upgrade #29 (+20; event-gated). Then upgrade Carbon.',progress:`Carbon level: ${carbon??'unknown'}`,repeatable:true});
        sources.push(masterSource(2500,30));
        sources.push({name:'The Hole — Gambit',value:gambit,amount:100,action:`Reach ${fmt(Math.ceil(gambitRequired))} Gambit points to unlock reward #10: +100 wizard tower max levels and +1 trimmed slot.`,progress:rawPoints===null?'Gambit save data missing.':gambit===100?'Unlocked: your score before multipliers already reaches the requirement.':gambit===0?'No Gambit score yet.':`Score before multipliers: ${fmt(rawPoints)}. Your multiplied score is not yet decoded; check reward #10 in Gambit.`});
      }
      if(id>=18){
        sources.push(masterSource(1500,100));
        const coral=['Reef','Vibrant','Glowing','Char','Neon','Aegean','Gilded','Twisted','Eternal'][id-18];
        sources.push({name:'W7 Spelunking — Dancing Coral',value:dances===null?null:dances>id-18?100:0,amount:100,action:`Buy dance #${id-17} at Dancing Coral using ${coral} Coral. Dances unlock in shrine order; this dance adds +100 to this shrine’s Construction cap.`,progress:`Dances bought: ${dances??'unknown'}/9`});
        sources.push({name:'W7 Sushi — 59 unique sushi',value:unique===null?null:unique>58?10:0,amount:10,action:'Discover 59 unique sushi to unlock +10 Construction max levels for every shrine.',progress:`Unique sushi: ${unique??'unknown'}/59`});
      }
      const known=sources.every(s=>s.value!==null),cap=base+sources.reduce((sum,s)=>sum+(s.value??0),0);
      const consistent=level===null||level<=cap;
      const capKnown=known&&consistent;
      const description=String(r[1]).replaceAll('_',' ').replaceAll('@','\n').replaceAll('{',level===null?'?':String(Math.floor(Math.max(0,level-1)*Number(r[2])))).replaceAll('}',level===null?'?':String(Math.floor(Math.max(0,level-1)*Number(r[3])))).replaceAll('$',level===null?'?':String(Math.floor(level)*Number(r[2])));
      return {id,name:r[0].replaceAll('_',' '),level,base,cap,capKnown,sources,description,status:level===null?'Level unavailable':!capKnown?'Cap needs verification':level>=cap?'Maxed':level===0?'Not built':'In progress',remaining:capKnown&&level!==null?Math.max(0,cap-level):null};
    });
    return {rows,total,riftLevel};
  }
  const api={evaluate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Construction=api;
})(typeof window!=='undefined'?window:globalThis);
