(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root) root.JellyEngine=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

const VERSION='0.9.9-alchemy-bubbles';
  const COLS=18, ROWS=10, BOARD_SIZE=180, FPS=60;
  const UNIT_NAMES=['Amoeba','Plasmid','Ribosome','Organelle','Immunoid','Virus','Mitochondria','Gigacyst','Bruhollio'];
  const UNIT_IMG_DIMS=[[36,36],[73,36],[36,109],[110,110],[73,73],[36,36],[147,147],[184,183],[36,36]];
  const UNIT_VISUAL_OFFSET=[0,0,0,-1,0,0,0,-2,0];
  const BASE_CD=[145,60,400,160,750,200,10,20,30];
  const BASE_DMG=[1,1.2,12,6,20,1,2,4,1];
  // CustomLists.Research[51]: [baseX, baseY, jitterPixels].
  // Only base offsets are multiplied by 18; jitter is already in pixels.
  const BULLET_LAUNCH=[[0,0,15],[1,0,13],[0,2,13],[0,0,20],[1,1,15],[0,0,15],[3,3,60],[0,0,40],[0,0,0]];
  // Exact Research[49] footprints from the shipped client. The game stores these as
  // FLAT board-index offsets, not row/column coordinates. This distinction matters:
  // Mitochondria offset +3 is not covered by Lava's row-wrap guard, so a handful of
  // right-edge placements are genuinely accepted by the client.
  const SHAPE_OFFSETS=[
    [0],
    [0,1],
    [0,18,36],
    [0,1,-1,18,-18],
    [0,1,18,19],
    [0],
    [0,1,2,3,18,19,20,21,36,37,38,39,54,55,56,57],
    [-36,-19,-18,-17,-2,-1,0,1,2,17,18,19,36],
    [0]
  ];
  // Human-readable geometry for display only. Solver legality always uses SHAPE_OFFSETS.
  const SHAPE_COORDS=[
    [[0,0]],
    [[0,0],[0,1]],
    [[0,0],[1,0],[2,0]],
    [[0,0],[0,1],[0,-1],[1,0],[-1,0]],
    [[0,0],[0,1],[1,0],[1,1]],
    [[0,0]],
    [[0,0],[0,1],[0,2],[0,3],[1,0],[1,1],[1,2],[1,3],[2,0],[2,1],[2,2],[2,3],[3,0],[3,1],[3,2],[3,3]],
    [[-2,0],[-1,-1],[-1,0],[-1,1],[0,-2],[0,-1],[0,0],[0,1],[0,2],[1,-1],[1,0],[1,1],[2,0]],
    [[0,0]]
  ];
  const PLOTS=[
    '0,5,1','5,4,1','9,4,1','13,3,1','16,2,1','18,5,1','23,4,1','27,4,1','31,3,1','34,2,1',
    '36,5,1','41,4,1','45,4,1','49,3,1','52,2,1','54,7,1','65,2,1','67,1,4','68,4,1','72,3,2',
    '83,2,2','86,2,2','88,2,1','106,2,1','108,7,1','119,2,1','122,4,1','126,5,1','131,5,1','136,4,1',
    '140,1,3','141,1,3','142,1,3','143,1,3','144,5,1','149,5,1','154,4,1','162,5,1','167,5,1','172,4,1'
  ];
  const UPGRADE_ORDER=[0,23,39,1,18,9,8,24,2,12,19,38,10,33,3,17,28,36,16,25,4,14,20,29,31,5,15,32,21,27,6,13,30,34,7,35,22,26,11,37,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99];
  const PROXIMITY_CORES=new Set([43,44,45,46,60,65,78,83,96,101,114,119,133,134,135,136]);
  const BLOCKED_CENTER=new Set([61,62,63,64,79,80,81,82,97,98,99,100,115,116,117,118]);
  const DIRECT_COMBAT_UPGRADES=new Set([10,11,13,14,17,18,19,20,21,22,28,29,30,31,32,35,36]);
  const BOARD_PROGRESS_UPGRADES=new Set([0,1,2,3,4,5,6,7,8,9,15,16]);
  const ROG_BONUS=[50,35,25,5,1,1,15,40,25,30,100,50,1,1,5,4,200,1,25,20,150,30,10,40,30,1,30,200,2,20,20,25,3,1,1,1,1,10,35,75,15,5,25,3,1,1,30,6,3,25,1,200,3,20,60,5,1,1,150,20,5,3,25,25,1,1,1,1,1,1,1,1];
  // Research[37]: Royal Guardian bonuses unlocked by unique Sushi count.
  const SUSHI_ROG_BONUS=[100,30,2,2,2,1,30,30,1,30,100,25,50,1,20,25,50,1,20,1,200,3,1,1,2,30,25,50,100,100,1,50,100,3,50,100,1,40,25,100,1,100,20,50,50,25,30,50,10,10,10,10,50,1,1,25,2,30,10,10,30,2,10,10];
  // CustomLists.Research[5]: Observation-shape multipliers used by Grid_Bonus.
  const OBSERVATION_BONUS=[25,15,50,20,20,35,25,30,35,60];
  // Only the companion entries needed by Grid_Bonus_Allmulti. Values are [normal, level-1 upgraded].
  // CompanionDB[0] babaMummy: 1 / 1. CompanionDB[55] w7b11: 15 / 20.
  const GRID_COMPANION_BONUS={0:[1,1],27:[1,1.5],55:[15,20]};
  const UPGRADE_META=[
    ['Amoeba Cell Cultivation',1,1.0,1,0,'Unlock Amoeba; +10% all Cell DMG passive per effective Amoeba.'],
    ['Plasmid Cell Cultivation',1,1.0,1,2,'Unlock Plasmid; +15% all Cell SPD passive per effective Plasmid.'],
    ['Ribosome Cell Cultivation',1,1.0,1,3,'Unlock Ribosome; +50% all Cell DMG passive per effective Ribosome.'],
    ['Organelle Cell Cultivation',1,1.0,1,1.3,'Unlock Organelle; +25% all Cell SPD passive and 1.5x SPD to touching cells.'],
    ['Immunoid Cell Cultivation',1,1.0,1,5,'Unlock Immunoid; critical-condition tank/stun cell.'],
    ['Virus Cell Cultivation',1,1.0,1,20,'Unlock Virus; adjacent infected slots multiply all damage by +10% each.'],
    ['Mitochondria Cell Cultivation',1,1.0,1,30,'Unlock Mitochondria; 1.5x all Cell SPD passive.'],
    ['Gigacyst Cell Cultivation',1,1.0,1,50,'Unlock Gigacyst; 3x all Cell DMG passive.'],
    ['Another Unlock',25,11.5,1,7,'+1 plot unlock.'],
    ['Slot Unlocking',1,1.0,1,0,'Unlock plot purchasing.'],
    ['Cell Biology',9999,1.210,20,0,'Cell EXP per attack and Cell EXP gain.'],
    ['Cell Evolution',9999,1.650,10,0,'Cell EXP multiplier.'],
    ['DPS Biometrics',1,1.0,1,1.5,'Bloodcell multiplier from best-ever DPS.'],
    ['Proximity Stimulus',5,2000,1,0,'Cells with cores beside the obstruction get multiplicative DMG and SPD.'],
    ['Cells of Three, Better They Be!',1,1.0,1,0,'Every 3rd cell of a type doubles that cell type passive contribution.'],
    ['Viral Injection',4,10000,1,0,'Allows additional Virus cells.'],
    ['Feverizer',6,250,1,0.04,'Unlocks Fever effects.'],
    ['Cell Mutilation',20,40,1,0.20,'More DMG per Cell LV.'],
    ['Cell Destruction I',9999,1.15,5,0,'Additive all Cell DMG.'],
    ['Cell Destruction II',9999,1.22,10,0,'Additive all Cell DMG.'],
    ['Cell Destruction III',9999,1.51,25,0,'Additive all Cell DMG.'],
    ['Cell Desolation I',9999,1.35,3,0,'Multiplicative all Cell DMG.'],
    ['Cell Desolation II',9999,2.10,15,0,'Multiplicative all Cell DMG.'],
    ['Bloodcell Coagulation',9999,1.10,5,0,'Additive Bloodcell gain.'],
    ['Bloodletting I',9999,1.15,10,0,'Additive Bloodcell gain.'],
    ['Bloodletting II',9999,1.32,25,0,'Additive Bloodcell gain.'],
    ['Blood Tribunal I',9999,1.40,3,0,'Multiplicative Bloodcell gain.'],
    ['Blood Tribunal II',9999,1.85,5,0,'Multiplicative Bloodcell gain.'],
    ['Immuno Weakening',1,1.0,1,0,'Every Amoeba hit adds +1% all DMG for the rest of the operation.'],
    ['Stronkroid',150,1.30,1,0,'One steroid burst; +50% plus upgrade value to attack speed for 300 frames.'],
    ['Cell Adaptation I',9999,1.12,3,0,'Cell EXP gain.'],
    ['Cell Adaptation II',9999,1.18,5,0,'Cell EXP gain.'],
    ['Cell Metabolism',10,65,1,0,'All Cell DMG per 100 combined Cell levels.'],
    ['Cell Dialysis',25,5.50,1,0,'Bloodcell gain per total Cell level.'],
    ['Lower Cholesterol',9999,1.45,1,0,'Reduces all Jelly upgrade costs.'],
    ['Revival Shots',5,1500,1,0,'Critical-condition revives.'],
    ['Critical Status',1,1.0,1,0,'Enables Critical Condition after timer expires.'],
    ["Rift Guy's Upgrade",0,1.0,1,0,'Special progression upgrade.'],
    ['Daily Transfusion',20,2.50,10,0.15,'Daily Bloodcells from best operation.'],
    ['Operational Bonuses',1,1.10,1,0,'Successful-operation account bonuses.']
  ].map((x,id)=>({id,name:x[0],max:x[1],growth:x[2],perLevel:x[3],baseCost:x[4],desc:x[5]}));

  function asNum(v,d=0){ const n=Number(v); return Number.isFinite(n)?n:d; }
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function percentile(sorted,p){if(!sorted.length)return null;const x=(sorted.length-1)*p,i=Math.floor(x),f=x-i;return sorted[i]+(sorted[Math.min(sorted.length-1,i+1)]-sorted[i])*f;}
  function median(a){if(!a.length)return null;const s=a.slice().sort((x,y)=>x-y);return percentile(s,.5);}
  function parseInput(input){
    let obj=input;
    if(typeof input==='string'){
      const text=input.replace(/^\uFEFF/,'').trim();
      if(/(?:\.\.\.|…)\s*\([\d.,]+\s*[KMGT]?B\s+left\)\s*$/i.test(text))throw new Error('This export is cut off (the text ends with a size-left notice). Save the complete export as a .json or .txt file and use Open JSON/TXT. The missing data cannot be recovered from this paste.');
      try{obj=JSON.parse(text);}catch(_){throw new Error('This text is not valid JSON. Copy the complete raw export, or use Open JSON/TXT to load the original export file.');}
    }
    const data=obj&&obj.data&&typeof obj.data==='object'?obj.data:obj;
    if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Could not find account data in this JSON. Use a full IdleOn export or a data-only export.');
    if(data.Research==null){
      if(!Object.keys(data).some(key=>/^Lv0_\d+$/.test(key)||['CauldronInfo','StampLv','UpgVault'].includes(key)))throw new Error('Could not find recognizable IdleOn account data in this JSON. Use the complete export.');
      return {...makeState([],0,data,obj),hasJelly:false};
    }
    const research=typeof data.Research==='string'?JSON.parse(data.Research):data.Research;
    if(Array.isArray(research)&&research.length<19)return {...makeState([],0,data,obj),hasJelly:false};
    if(!Array.isArray(research)) throw new Error('Research exists, but its format is not the Jelly Operator schema this build expects.');
    let researchLevel=0;
    for(const [k,v] of Object.entries(data)) if(/^Lv0_\d+$/.test(k)&&Array.isArray(v)) researchLevel=Math.max(researchLevel,asNum(v[20],0));
    return {...makeState(research,researchLevel,data,obj),hasJelly:true};
  }
  function makeState(research,researchLevel=0,rawData=null,rawRoot=null){
    const R=research;
    return {
      research:R,researchLevel,rawData,rawRoot,
      board:Array.isArray(R[14])?R[14].slice():Array(BOARD_SIZE).fill(-1),
      cellExp:Array.isArray(R[15])?R[15].slice():Array(10).fill(0),
      cellLevels:Array.isArray(R[16])?R[16].slice():Array(10).fill(0),
      upgrades:Array.isArray(R[17])?R[17].slice():Array(100).fill(0),
      plots:Array.isArray(R[18])?R[18].slice():[],
      bloodcells:asNum(R[7]?.[11]), obstruction:asNum(R[7]?.[9]), attemptsRemaining:asNum(R[7]?.[10]),
      bestDps:asNum(R[7]?.[12]), fever:asNum(R[7]?.[13]), bestBloodcells:asNum(R[7]?.[14])
    };
  }
  function cloneState(state){return {...state,board:state.board.slice(),cellExp:state.cellExp.slice(),cellLevels:state.cellLevels.slice(),upgrades:state.upgrades.slice(),plots:state.plots.slice()};}
  function upgradeQty(state,id){ const m=UPGRADE_META[id]; return m?m.perLevel*asNum(state.upgrades[id]):0; }
  function unitsOwned(state){let n=0;for(let i=0;i<8;i++)n+=upgradeQty(state,i);return Math.round(Math.min(8,n));}
  function virusLimit(state){return Math.round(1+upgradeQty(state,15));}
  function feverUnlocked(state){return upgradeQty(state,16)>=1;}
  function critUnlocked(state){return upgradeQty(state,36)>=1;}
  function steroidUnlocked(state){return upgradeQty(state,29)>=1;}
  function reviveCount(state){return Math.round(upgradeQty(state,35));}
  function bossHP(n){return n<12?[100,200,400,1000,2000,4000,6000,10000,15000,30000,50000,100000][n]:1e5*Math.pow(1.65,n-11)*(1+0.9*Math.floor((n-11)/12));}
  function bossTime(n){return 30+5*Math.floor(n/12);}
  function bossAtkCD(n){return Math.max(10,120-20*Math.floor(n/6));}
  function obstructionTier(state){return Math.max(0,Math.min(5,Math.floor(state.obstruction/12)));}
  function unlockedSlots(state){
    const s=new Set();
    for(const pidxRaw of state.plots){
      const pidx=Math.round(asNum(pidxRaw,-1)); if(pidx<0||pidx>=PLOTS.length) continue;
      const [start,w,h]=PLOTS[pidx].split(',').map(Number);
      for(let dy=0;dy<h;dy++) for(let dx=0;dx<w;dx++) s.add(start+dx+COLS*dy);
    }
    [77,95,78,96].forEach(x=>s.add(x));
    if(state.obstruction>0)[76,94].forEach(x=>s.add(x));
    if(state.obstruction>1)[75,93].forEach(x=>s.add(x));
    BLOCKED_CENTER.forEach(x=>s.delete(x));
    return s;
  }
  function jsRemainder(a,b){return a<0?-(Math.abs(a)%b):(a%b);}
  function footprint(type,anchor){
    // Reproduce the client placement test byte-for-byte in spirit:
    // 1) flat index must remain 0..179; 2) center obstruction is forbidden;
    // 3) ONLY offsets -2..+2 get an explicit horizontal wrap guard.
    // SlotUnlocked is checked by placementsForState because it depends on the save.
    const offsets=SHAPE_OFFSETS[type]||[0],out=[];
    for(const off of offsets){
      const idx=Math.round(anchor+off);
      if(idx<0||idx>=BOARD_SIZE||BLOCKED_CENTER.has(idx))return null;
      if(off>-3&&off<3){
        const col=anchor%COLS+jsRemainder(off,COLS);
        if(col<0||col>COLS-1)return null;
      }
      out.push(idx);
    }
    return out;
  }
  function placementsForState(state){
    const slots=unlockedSlots(state),ntypes=unitsOwned(state),out=[];
    for(let t=0;t<ntypes;t++)for(let a=0;a<BOARD_SIZE;a++){const fp=footprint(t,a);if(fp&&fp.every(x=>slots.has(x)))out.push({type:t,anchor:a,cells:fp});}
    return out;
  }
  function arrangementFromBoard(state){
    const arr=[];for(let a=0;a<Math.min(BOARD_SIZE,state.board.length);a++){const t=asNum(state.board[a],-1);if(t>=0&&t<9){const fp=footprint(t,a);if(fp)arr.push({type:t,anchor:a,cells:fp});}}return arr;
  }
  function rawCounts(arr){const c=Array(9).fill(0);for(const p of arr)if(p.type>=0&&p.type<9)c[p.type]++;return c;}
  function effectiveCounts(state,counts){const e=counts.slice();if(upgradeQty(state,14)>=1)for(let i=0;i<9;i++)if(i!==5)e[i]+=Math.floor(counts[i]/3);return e;}
  function rogBonus(state,index){return state.obstruction>index?asNum(ROG_BONUS[index]):0;}
  function bundleFlag(state,key){
    let b=state?.rawData?.BundlesReceived;if(typeof b==='string'){try{b=JSON.parse(b);}catch(_){b=null;}}
    return b&&typeof b==='object'&&asNum(b[key],0)===1?1:0;
  }
  function rawArray(state,key){
    let v=state?.rawData?.[key];if(typeof v==='string'){try{v=JSON.parse(v);}catch(_){v=null;}}
    return Array.isArray(v)?v:null;
  }
  function paletteCellDamageBonus(state){
    // Gaming Palette #1 (Mossy Green). Unlike several other palette colors, index 1
    // has no Super-Bit special-case multiplier in PaletteBonus().
    const sp=rawArray(state,'Spelunk');
    if(!sp||!Array.isArray(sp[9])||!Array.isArray(sp[18])||!Array.isArray(sp[0]))return null;
    const level=asNum(sp[9][1],0);
    const base=(level/(level+25))*3; // GamingPalette[1]: max/value 3, decay-style flag 1
    const picasso=Math.round(asNum(sp[18][10],0)*25); // LegendTalent #10, Picasso Gaming
    const lore=asNum(sp[0][8],0)>=1?1:0;
    return base*(1+picasso/100)*(1+.5*lore);
  }
  function parsedObject(v){if(v&&typeof v==='object')return v;if(typeof v==='string'){try{return JSON.parse(v);}catch(_){return null;}}return null;}
  function companionGridBonus(state,id){
    const table=GRID_COMPANION_BONUS[id];if(!table)return {known:false,value:0};
    const comp=parsedObject(state?.rawRoot?.companion),options=rawArray(state,'OptionsListAccount');
    const borrowed=String(options?.[606]??'').split(',').filter(x=>x.trim()!=='').map(Number).includes(id);
    const rows=Array.isArray(comp?.l)?comp.l:null;
    if(!rows&&!borrowed)return {known:false,value:0};
    let found=false,level=0;
    for(const row of rows||[]){const a=String(row).split(',');if(Math.round(asNum(a[0],-1))===id){found=true;level=Math.max(level,asNum(a[4],0));}}
    // Client cache uses upgraded values only when its stored level equals exactly 1.
    // The borrowed-companion list subsequently writes BASE values over this cache.
    let value=borrowed?table[0]:found?table[level===1?1:0]:0;
    if(id===0&&value){
      const direct=rawArray(state,'Lv0');
      const levels=direct?[asNum(direct[14])]:Object.entries(state.rawData||{}).filter(([k,v])=>/^Lv0_\d+$/.test(k)&&Array.isArray(v)).map(([,v])=>asNum(v[14]));
      if(!levels.length||levels.some(x=>x<2)&&levels.some(x=>x>=2))return {known:false,value:0,reason:'Active character Divinity level is unavailable or ambiguous'};
      if(levels.every(x=>x<2))value=0;
    }
    return {known:true,value,owned:found,borrowed,upgraded:found&&level===1&&!borrowed};
  }
  function dreamCloudBonus(state,index){
    const wb=parsedObject(state?.rawData?.WeeklyBoss);if(!wb)return {known:false,value:0};
    return {known:true,value:asNum(wb['d_'+index],0)===-1?1:0};
  }
  function gridAllMultiplier(state){
    const c55=companionGridBonus(state,55),c0=companionGridBonus(state,0);
    const d71=dreamCloudBonus(state,71),d72=dreamCloudBonus(state,72),d76=dreamCloudBonus(state,76);
    if(!c55.known||!c0.known||!d71.known||!d72.known||!d76.known)return {known:false,value:1};
    const r173=asNum(state?.research?.[0]?.[173],0);
    const sushi53=sushiRogBonus(state,53);
    const pct=c55.value+5*Math.min(1,r173*c0.value)+d71.value+d72.value+d76.value+sushi53;
    return {known:true,value:1+pct/100,pct,parts:{companion55:c55.value,research173:5*Math.min(1,r173*c0.value),dream71:d71.value,dream72:d72.value,dream76:d76.value,sushi53}};
  }
  function researchGridBonus(state,index){
    const lv=asNum(state?.research?.[0]?.[index],0),base={185:5,187:10}[index];
    if(base==null)return {value:0,known:false,level:lv};
    if(lv<=0)return {value:0,known:true,level:lv,allMulti:1};
    const all=gridAllMultiplier(state);if(!all.known)return {value:0,known:false,level:lv,allMulti:1};
    const assigned=Math.round(asNum(state?.research?.[1]?.[index],-1));
    const obs=assigned===-1?1:(1+asNum(OBSERVATION_BONUS[assigned],0)/100);
    return {value:base*lv*obs*Math.max(1,all.value),known:true,level:lv,allMulti:all.value,observationIndex:assigned,observationMultiplier:obs,parts:all.parts};
  }
  function gridCellDamageBonus(state){return researchGridBonus(state,185);}
  function externalDamageStatus(state){
    const palette=paletteCellDamageBonus(state),grid=gridCellDamageBonus(state);
    return {known:palette!=null&&grid.known,palette:palette??0,grid:grid.value,gridLevel:grid.level,gridAllMulti:grid.allMulti??1,gridDetails:grid};
  }
  function sushiUniqueCount(state){
    let sushi=state?.rawData?.Sushi;if(typeof sushi==='string'){try{sushi=JSON.parse(sushi);}catch(_){sushi=null;}}
    const known=Array.isArray(sushi)&&Array.isArray(sushi[5])?sushi[5]:null;
    if(!known)return 0;
    let n=0;for(;n<Math.min(64,known.length);n++)if(asNum(known[n],-1)<0)break;
    return n;
  }
  function sushiRogBonus(state,index){return sushiUniqueCount(state)>index?asNum(SUSHI_ROG_BONUS[index],0):0;}
  function organelleSpeedMultiplier(state){return 1.5+Math.min(.25,Math.max(0,sushiRogBonus(state,63)/100));}
  function arcadeBloodcellBonus(state){
    const levels=rawArray(state,'ArcadeUpg'),comp=companionGridBonus(state,27);
    if(!levels||!comp.known)return {known:false,value:0};
    const level=asNum(levels[72]);
    // Shipped branch is equality to 1, not 1+companionValue. Preserve the upgraded
    // Reindeer mismatch: value 1.5 does not pass this equality check.
    return {known:true,value:5*level/(level+100)*(level===101?2:1)*(comp.value===1?2:1),level,companion:comp};
  }
  function dpsBloodcellMultiplier(bestDps){
    const log10=x=>Math.log(Math.max(x,1))/2.30259,log2=x=>Math.log(Math.max(x,1))/Math.log(2);
    return 1+Math.min(2,log2(bestDps/100)/20)+log10(bestDps)/50*15/(log10(bestDps/50)+20);
  }
  function bloodcellBonuses(state){
    const arcade=arcadeBloodcellBonus(state),grid=researchGridBonus(state,187),atoms=rawArray(state,'Atoms'),bundles=parsedObject(state.rawData?.BundlesReceived);
    const total=state.cellLevels.reduce((a,b)=>a+asNum(b),0),q=id=>upgradeQty(state,id);
    const factors={upgrades:1+(q(23)+q(24)+q(25)+q(33)*total)/100,arcade:1+arcade.value/100,grid:1+grid.value/100,
      sepsis:feverUnlocked(state)&&Math.round(state.fever)===2?2:1,bundle:1+bundleFlag(state,'ban_j'),obstruction24:1+rogBonus(state,24)/100,
      savedDps:dpsBloodcellMultiplier(state.bestDps),tribunalI:1+q(26)/100,tribunalII:1+q(27)/100,atom15:1+asNum(atoms?.[15])/100};
    const missing=[];if(!arcade.known)missing.push('Arcade #72 / companion #27');if(!grid.known)missing.push('Research Grid #187 account multiplier');if(!atoms)missing.push('Atoms');if(!bundles)missing.push('BundlesReceived');
    const multiplier=missing.length?null:Object.values(factors).reduce((a,b)=>a*b,1);
    return {known:missing.length===0,multiplier,factors,missing,arcade,grid,dailyAttempts:2+Math.round(asNum(state.research?.[0]?.[186])),dailyTransfusion:state.bestBloodcells*q(38)/100};
  }
  function bonusAudit(state){
    const ext=externalDamageStatus(state),sushi=rawArray(state,'Sushi'),grid=gridAllMultiplier(state),economy=bloodcellBonuses(state),missing=[];
    if(paletteCellDamageBonus(state)==null)missing.push('Gaming Palette / Spelunk');
    if(!ext.gridDetails.known)missing.push('Cellular Warfare account multiplier');
    if(!sushi||!Array.isArray(sushi[5]))missing.push('Sushi #63 Organelle speed');
    return {combatKnown:missing.length===0,missing,damage:ext,grid,organelle:organelleSpeedMultiplier(state),sushiUnique:sushiUniqueCount(state),
      expMultiplier:cellExpMultiplier(state),damageMultiplier:jellyDamageMultiplier(state,0),feverSpeed:feverSpeedMultiplier(state),economy};
  }
  const CELL_PASSIVES=[
    '+10% damage in the shared Amoeba/Ribosome term per effective cell.',
    '+15% speed in the shared Plasmid/Organelle term per effective cell.',
    '+50% damage in the shared Amoeba/Ribosome term per effective cell.',
    '+25% speed in the shared Plasmid/Organelle term per effective cell.',
    'No global stat passive.', 'No global count passive.',
    'Separate speed factor: 1 + 0.50 × effective Mito count.',
    'Separate damage factor: 1 + 2.00 × effective Gigacyst count.'
  ];
  const CELL_ABILITIES=[
    'Each landed shot adds a permanent +1% operation damage stack when Immuno Weakening is unlocked.',
    'Projectile attack; no additional on-hit ability in the shipped loop.',
    'Projectile attack; no additional on-hit ability in the shipped loop.',
    'Any target footprint touching the surrounding buff area grants its core the cached adjacency speed multiplier. Multiple nearby Organelles do not stack the adjacency factor.',
    'Every living body square draws Critical attacks first. Each hit delays the next boss attack to 3× its normal interval, even after this core dies.',
    'A neighboring target square infects the whole target footprint. Global damage factor is 1 + infected squares / 10; adjacent Viruses can infect each other.',
    'Projectile attack plus global speed; the 4×4 footprint preserves the client’s legal edge-wrap behavior.',
    'Projectile attack plus global damage; multiple copies add inside one multiplier, not repeated 3× multiplications.'
  ];
  function cellDetails(state,arr){
    const model=combatModel(state,arr),damage=jellyDamageMultiplier(state,0);
    return UNIT_NAMES.slice(0,8).map((name,type)=>{
      const units=model.units.filter(u=>u.type===type),hits=units.map(u=>u.baseDamage*damage),intervals=units.map(u=>Math.ceil(u.cd/u.progressPerFrame)/FPS);
      return {name,type,unlocked:type<unitsOwned(state),area:SHAPE_OFFSETS[type].length,count:model.counts[type],effective:model.effectiveCounts[type],level:asNum(state.cellLevels[type]),exp:asNum(state.cellExp[type]),expRequired:cellExpReq(state.cellLevels[type]),
        passive:CELL_PASSIVES[type],ability:CELL_ABILITIES[type],hitRange:hits.length?[Math.min(...hits),Math.max(...hits)]:null,intervalRange:intervals.length?[Math.min(...intervals),Math.max(...intervals)]:null,
        boosted:units.filter(u=>u.orgBoost>1).length,infected:units.filter(u=>u.cells.some(c=>model.infected.has(c))).length};
    });
  }
  function slotPurchasesLeft(state){return Math.round(upgradeQty(state,9)+upgradeQty(state,8)+rogBonus(state,44)+bundleFlag(state,'ban_j')-state.plots.length);}
  function plotCells(index){const p=PLOTS[index];if(!p)return[];const [start,w,h]=p.split(',').map(Number),out=[];for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++)out.push(start+dx+COLS*dy);return out;}
  function plotLabel(index){const p=PLOTS[index];if(!p)return`Plot ${index+1}`;const [start,w,h]=p.split(',').map(Number),row=Math.floor(start/COLS),col=start%COLS;const vertical=row<3?'upper':row<7?'middle':'lower',horizontal=col<7?'west':col<11?'central':'east';return `Plot ${index+1} · ${vertical} ${horizontal} · ${w*h} slots`;}
  function organelleBoosted(arr){
    const surround=new Set();
    for(const p of arr)if(p.type===3){const i=p.anchor,col=i%COLS;[i-36,i-19,i-17,i+17,i+19,i+36].forEach(x=>{if(x>=0&&x<BOARD_SIZE)surround.add(x)});if(col>1)surround.add(i-2);if(col<16)surround.add(i+2);}
    const b=new Set();for(const p of arr)if(p.cells.some(x=>surround.has(x)))b.add(p.anchor);return b;
  }
  function infectedSlots(arr){
    const adjacent=new Set();for(const p of arr)if(p.type===5){const i=p.anchor,col=i%COLS,row=Math.floor(i/COLS);if(row>0)adjacent.add(i-COLS);if(row<ROWS-1)adjacent.add(i+COLS);if(col>0)adjacent.add(i-1);if(col<COLS-1)adjacent.add(i+1);}
    const infected=new Set();for(const p of arr)if(p.cells.some(x=>adjacent.has(x)))p.cells.forEach(x=>infected.add(x));return infected;
  }
  function passiveMultipliers(state,counts){
    const e=effectiveCounts(state,counts);
    return {damage:(1+2*e[7])*(1+0.5*e[2]+0.1*e[0]),speed:(1+0.5*e[6])*(1+0.25*e[3]+0.15*e[1]),effective:e};
  }
  function feverDamageMultiplier(state,elapsedSeconds,coldFirstTick=1){
    if(!feverUnlocked(state))return 1;
    const f=Math.round(state.fever);
    if(f===0){
      if(upgradeQty(state,12)<1)return 1;
      // COLD increments from an actor-level 1000ms periodic callback, not a timer
      // synchronized to operation start. coldFirstTick is therefore the phase until
      // the first callback after the operation begins (normally 0..1 seconds).
      const t=Math.max(0,asNum(elapsedSeconds,0)),first=clamp(asNum(coldFirstTick,1),0,1);
      const ticks=t<first?0:1+Math.floor(t-first);
      return 1+ticks/100;
    }
    if(f===1)return 2;
    if(f===4)return 1.5;
    return 1;
  }
  function feverSpeedMultiplier(state){
    if(!feverUnlocked(state))return 1;
    const f=Math.round(state.fever);if(f===4)return 1.25;if(f===5)return 1.4;return 1;
  }
  function jellyDamageMultiplierForLevels(state,levels,elapsedSeconds=0,coldFirstTick=1){
    const q=id=>upgradeQty(state,id),ext=externalDamageStatus(state);
    // Client quirk: JellyOperation('CellLV_tot') is cached in DNSM and the runtime
    // level-up path does not invalidate it. Individual-cell level damage updates live,
    // but Cell Metabolism's combined-level breakpoint stays on the operation-start/cache value.
    // `levels` is intentionally ignored for that combined total.
    const cachedTotalLv=state.cellLevels.reduce((a,b)=>a+asNum(b),0);
    return (1+(q(18)+q(19)+q(20)+ext.palette)/100)*(1+ext.grid/100)*(1+q(21)/100)*(1+q(22)/100)*(1+q(32)*Math.floor(cachedTotalLv/100)/100)*feverDamageMultiplier(state,elapsedSeconds,coldFirstTick);
  }
  function jellyDamageMultiplier(state,elapsedSeconds=0,coldFirstTick=1){return jellyDamageMultiplierForLevels(state,state.cellLevels,elapsedSeconds,coldFirstTick);}
  function cellExpReq(level){return 20*Math.pow(1.3,Math.max(0,asNum(level,0)));}
  function cellExpMultiplier(state){return (1+(feverUnlocked(state)&&Math.round(state.fever)===3?100:0)/100)*(1+(upgradeQty(state,30)+upgradeQty(state,31)+upgradeQty(state,10))/100)*(1+upgradeQty(state,11)/100);}
  function canLevelCells(state){return upgradeQty(state,10)>=1;}
  function combatModel(state,arr){
    const counts=rawCounts(arr),pass=passiveMultipliers(state,counts),boosted=organelleBoosted(arr),infected=infectedSlots(arr);
    const virusMulti=1+infected.size/10;
    const globalSpeed=pass.speed*feverSpeedMultiplier(state);
    const globalDamage=pass.damage*virusMulti;
    const units=arr.map((p,idx)=>{
      const t=p.type,lv=asNum(state.cellLevels[t]),levelMulti=1+lv*(1+upgradeQty(state,17))/100;
      const prox=upgradeQty(state,13)>=1&&PROXIMITY_CORES.has(p.anchor)?1+upgradeQty(state,13)/100:1;
      const org=boosted.has(p.anchor)?organelleSpeedMultiplier(state):1;
      const cd=1.5*BASE_CD[t]/globalSpeed;
      const baseDamage=5*BASE_DMG[t]*globalDamage*levelMulti*prox;
      const row=Math.floor(p.anchor/COLS),col=p.anchor%COLS;
      const sx=171+37*col,sy=61+37*row,dist=Math.hypot(501-sx,245-sy);
      const travel=.6+dist/400;
      return {id:idx,type:t,anchor:p.anchor,cells:p.cells.slice(),cd,progressPerFrame:.65*org*prox,baseDamage,travel,orgBoost:org,prox};
    });
    return {counts,effectiveCounts:pass.effective,boosted,infected,virusMulti,globalSpeed,globalDamage,units};
  }
  function layoutScore(state,arr){
    const m=combatModel(state,arr);let sum=0;
    for(const u of m.units)sum+=u.baseDamage/u.cd*u.progressPerFrame/.65;
    const normalized=sum;
    return {normalized,withJellyUpgrades:normalized*jellyDamageMultiplier(state,0),counts:m.counts,effectiveCounts:m.effectiveCounts,organelleBoosted:m.boosted.size,infectedSlots:m.infected.size,filledSlots:new Set(arr.flatMap(p=>p.cells)).size};
  }
  function performanceNow(){return typeof performance!=='undefined'&&performance.now?performance.now():Date.now();}
  function backInEase(t){t=clamp(asNum(t,0),0,1);return t===0?0:t===1?1:t*t*(2.70158*t-1.70158);}
  function projectileLaunchPosition(type,anchor,rx,ry){
    const p=BULLET_LAUNCH[type]||BULLET_LAUNCH[8];
    return [Math.round(171+37*(anchor%COLS)+18*p[0]+p[2]*rx),Math.round(61+37*Math.floor(anchor/COLS)+18*p[1]+p[2]*ry)];
  }
  function projectileHitDelayFrames(type,anchor,rng){
    const col=anchor%COLS,row=Math.floor(anchor/COLS),sx=171+37*col,sy=61+37*row;
    const [x0,y0]=projectileLaunchPosition(type,anchor,2*rng()-1,2*rng()-1);
    const duration=.6+Math.hypot(501-sx,245-sy)/400;
    const maxFrames=Math.max(1,Math.ceil(duration*FPS)+2);
    for(let k=0;k<=maxFrames;k++){
      const f=backInEase(Math.min(1,k/(duration*FPS)));
      const x=x0+(484-x0)*f,y=y0+(228-y0)*f;
      if(Math.abs(504-x)<25&&Math.abs(243-y)<25)return k;
    }
    return Math.max(1,Math.round(duration*FPS));
  }
  function seededRng(seed){let x=(seed|0)||123456789;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)%4294967296)/4294967296;};}
  function randInt(rng,a,b){return a+Math.floor(rng()*(b-a+1));}
  function roidMulti(state){return 1+(50+upgradeQty(state,29))/100;}
  function chooseRevive(model,dead,units,revives){
    if(revives<=0)return -1;
    // Revival Shots is a manual click in-game. For optimization we assume a competent click:
    // revive a dead attack anchor first; otherwise restore an Immunoid square so it can keep soaking boss hits.
    let best=-1,bestScore=-1;
    for(const u of units){
      if(dead[u.anchor]){
        let score=u.baseDamage*Math.max(.001,u.progressPerFrame)/Math.max(1,u.cd);
        if(u.type===4)score+=1e12;
        if(score>bestScore){bestScore=score;best=u.anchor;}
      }
    }
    if(best>=0)return best;
    const immunoidCells=[];
    for(const u of units)if(u.type===4)for(const c of u.cells)if(dead[c])immunoidCells.push(c);
    return immunoidCells.length?immunoidCells[0]:-1;
  }
  function simulateOne(state,arr,options={}){
    const rng=seededRng(asNum(options.seed,12345));
    arr=arr.slice().sort((a,b)=>a.anchor-b.anchor);
    const model=combatModel(state,arr),units=model.units;
    const damageScale=Math.max(.000001,asNum(options.damageScale,1));
    const dpsOnly=!!options.dpsOnly;
    const hpMax=dpsOnly?1e300:bossHP(state.obstruction);
    let hp=hpMax,elapsed=0,frame=0,stack=0,bossCounter=0;
    const timer=bossTime(state.obstruction),crit=critUnlocked(state),bossCD=bossAtkCD(state.obstruction);
    let revives=reviveCount(state),roidFrames=0,roidUsed=false;
    // COLD's 1-second callback is phase-shifted relative to the click that starts an
    // operation. Model that real timing jitter rather than pinning the first tick to 1.000s.
    const coldFirstTick=Math.round(state.fever)===0&&feverUnlocked(state)?rng():1;
    // Account inputs and combined-level bonuses stay fixed for this operation.
    const fixedDamageMulti=jellyDamageMultiplier(state,0,coldFirstTick)/feverDamageMultiplier(state,0,coldFirstTick);
    let pendingRevive=null;
    // A revive is a direct click on a dead square in the shipped client; it has no
    // built-in cooldown or animation lock. Callers may supply a reaction delay when
    // they want a conservative, human-speed estimate.
    const reviveDelayFrames=Math.max(0,Math.round(asNum(options.reviveDelaySeconds,0)*FPS));
    const steroidStart=Math.max(0,asNum(options.steroidStartSeconds,0));
    // The practice lab can feed explicit player clicks back into this same loop.
    // Keep them frame-addressed so a replay is deterministic and never touches a save.
    const manualRevives=(Array.isArray(options.manualRevives)?options.manualRevives:[])
      .map(x=>({frame:Math.max(1,Math.round(asNum(x.time,0)*FPS)),square:Math.round(asNum(x.square,-1))}))
      .filter(x=>x.square>=0&&x.square<BOARD_SIZE).sort((a,b)=>a.frame-b.frame);
    let nextManualRevive=0;
    const dead=Array(BOARD_SIZE).fill(false),progress=Array(units.length).fill(0);
    const runtimeLevels=state.cellLevels.slice(),runtimeExp=state.cellExp.slice();
    let levelCooldown=0,levelsGained=0;
    const expMulti=cellExpMultiplier(state),levelingEnabled=canLevelCells(state);
    for(let i=0;i<units.length;i++)progress[i]=randInt(rng,0,Math.max(5,Math.floor(units[i].cd-1)));
    const trace=options.trace?[]:null,events=options.trace?[]:null;
    const projectiles=[];const damageBuckets=[];let bucketDamage=0,peak3s=0,hpAtTimer=null,criticalEntered=false,bossHits=0;
    // There is no arbitrary post-timer timeout in the game. Bound the simulation by the
    // maximum time Critical Condition could need to consume every living square. Immunoid
    // hits impose the -2*CD stun, making the next boss hit arrive ~3*CD ticks later.
    const occupiedCells=new Set(arr.flatMap(p=>p.cells));
    const immunoidCells=new Set(arr.filter(p=>p.type===4).flatMap(p=>p.cells));
    const otherCellCount=Math.max(0,occupiedCells.size-immunoidCells.size);
    const reviveWorstTicks=revives*(immunoidCells.size>0?3*bossCD:bossCD);
    const criticalLifetime=crit?(3*bossCD*immunoidCells.size+bossCD*otherCellCount+reviveWorstTicks)/FPS+5:5;
    const defaultMax=dpsOnly?timer+12:timer+criticalLifetime;
    const maxSeconds=Math.max(timer+5,asNum(options.maxSeconds,defaultMax));
    let result='timeout';
    while(elapsed<maxSeconds){
      frame++;elapsed=frame/FPS;
      // Jelly UI processes Cell EXP/level-ups before the active-operation attack loop.
      // The cooldown counter decrements every update; at most one type levels when <=0,
      // scanning type 0..8. A level-up sets the gate back to 20 updates.
      levelCooldown--;
      if(levelingEnabled&&levelCooldown<=0){
        for(let t=0;t<9;t++){
          const req=cellExpReq(runtimeLevels[t]);
          if(asNum(runtimeExp[t],0)>=req){runtimeExp[t]=asNum(runtimeExp[t],0)-req;runtimeLevels[t]=Math.round(asNum(runtimeLevels[t],0)+1);levelCooldown=20;levelsGained++;break;}
        }
      }
      if(!roidUsed&&options.useSteroid!==false&&steroidUnlocked(state)&&elapsed>=steroidStart){roidFrames=300;roidUsed=true;}
      // Client update order decrements GenINFO[238] before it evaluates RoidMulti.
      if(roidFrames>0)roidFrames--;
      const roid=roidFrames>0?roidMulti(state):1;
      if(pendingRevive&&frame>=pendingRevive.frame){dead[pendingRevive.cell]=false;pendingRevive=null;}
      while(nextManualRevive<manualRevives.length&&manualRevives[nextManualRevive].frame<=frame){
        const action=manualRevives[nextManualRevive++];
        if(revives>0&&dead[action.square]){
          revives--;dead[action.square]=false;
          if(events)events.push({type:'revive',time:elapsed,square:action.square,manual:true});
        }
      }
      for(let i=0;i<units.length;i++){
        const u=units[i];if(dead[u.anchor])continue;
        progress[i]+=.65*roid*u.orgBoost*u.prox;
        if(progress[i]>=u.cd){
          progress[i]=0;
          const initialLv=asNum(state.cellLevels[u.type],0),runtimeLv=asNum(runtimeLevels[u.type],0);
          const initialLevelMulti=1+initialLv*(1+upgradeQty(state,17))/100;
          const runtimeLevelMulti=1+runtimeLv*(1+upgradeQty(state,17))/100;
          const runtimeBase=u.baseDamage/Math.max(1e-12,initialLevelMulti)*runtimeLevelMulti;
          const dmg=runtimeBase*fixedDamageMulti*feverDamageMultiplier(state,elapsed,coldFirstTick)*(1+stack/100)*damageScale;
          projectiles.push({sourceAnchor:u.anchor,hitFrame:frame+projectileHitDelayFrames(u.type,u.anchor,rng),damage:dmg,type:u.type});
        }
      }
      for(let i=projectiles.length-1;i>=0;i--)if(projectiles[i].hitFrame<=frame){
        const p=projectiles[i];if(events&&dead[p.sourceAnchor])events.push({type:'posthumousHit',time:elapsed,anchor:p.sourceAnchor,damage:p.damage});hp-=p.damage;bucketDamage+=p.damage;if(upgradeQty(state,28)>=1&&p.type===0)stack++;
        if(levelingEnabled)runtimeExp[p.type]=asNum(runtimeExp[p.type],0)+expMulti;
        projectiles.splice(i,1);
      }
      if(frame%FPS===0){
        damageBuckets.unshift(bucketDamage);bucketDamage=0;if(damageBuckets.length>5)damageBuckets.length=5;
        if(damageBuckets.length>=4){const d=(damageBuckets[1]+damageBuckets[2]+damageBuckets[3])/3;peak3s=Math.max(peak3s,d);}
      }
      if(trace&&frame%FPS===0)trace.push({time:elapsed,hpFraction:Math.max(0,hp/hpMax),dead:dead.flatMap((v,i)=>v?[i]:[]),levels:runtimeLevels.slice(),steroid:roidFrames>0});
      if(!dpsOnly&&hp<=0){result='clear';break;}
      if(elapsed>timer&&hpAtTimer===null){hpAtTimer=dpsOnly?null:Math.max(0,hp/hpMax);criticalEntered=true;}
      if(!dpsOnly&&elapsed>timer){
        bossCounter++;
        if(!crit)bossCounter+=9999;
        if(bossCounter>=bossCD){
          bossCounter=0;const alive=[],immunoid=[];
          for(const u of units)for(const c of u.cells)if(!dead[c]){alive.push(c);if(u.type===4)immunoid.push(c);}
          if(!crit||alive.length===0){result='fail';break;}
          const pool=immunoid.length?immunoid:alive,target=pool[randInt(rng,0,pool.length-1)];dead[target]=true;bossHits++;if(events)events.push({type:'death',time:elapsed,square:target,immunoid:immunoid.length>0});
          if(immunoid.length)bossCounter=-2*bossCD;
          if(options.autoRevive!==false&&revives>0&&!pendingRevive){
            const r=chooseRevive(model,dead,units,revives);
            if(r>=0){
              revives--;
              // With a zero reaction delay, the click happens in this same logical
              // update, before the next attack-progress update.
              if(reviveDelayFrames===0){
                dead[r]=false;
                if(events)events.push({type:'revive',time:elapsed,square:r,immediate:true});
              }else pendingRevive={cell:r,frame:frame+reviveDelayFrames};
            }
          }
        }
      }
    }
    if(trace)trace.push({time:elapsed,hpFraction:Math.max(0,hp/hpMax),dead:dead.flatMap((v,i)=>v?[i]:[]),levels:runtimeLevels.slice(),steroid:roidFrames>0});
    if(dpsOnly)result='dps';
    return {trace:trace||undefined,events:events||undefined,result,clear:result==='clear',time:result==='clear'?elapsed:null,elapsed,hpRemaining:dpsOnly?null:Math.max(0,hp),hpFraction:dpsOnly?null:Math.max(0,hp/hpMax),hpAtTimer,criticalEntered,amoebaStacks:stack,peak3s,bossHits,revivesLeft:revives,steroidUsed:roidUsed,steroidStart:roidUsed?steroidStart:null,reviveDelaySeconds:reviveDelayFrames/FPS,coldFirstTick,levelsGained,runtimeLevels,runtimeExp};
  }
  function simulateMany(state,arr,options={}){
    const runs=Math.max(1,Math.min(500,Math.round(asNum(options.runs,24)))),seedBase=Math.round(asNum(options.seed,0xC0FFEE));
    const out=[];for(let i=0;i<runs;i++)out.push(simulateOne(state,arr,{...options,seed:seedBase+i*7919}));
    const clears=out.filter(x=>x.clear),times=clears.map(x=>x.time).sort((a,b)=>a-b),hpTimer=out.map(x=>x.hpAtTimer).filter(x=>x!=null),peaks=out.map(x=>x.peak3s).filter(Number.isFinite);
    const timer=bossTime(state.obstruction),normalClears=clears.filter(x=>x.time<=timer),criticalClears=clears.filter(x=>x.time>timer);
    const critEntries=out.filter(x=>x.criticalEntered),stacks=out.map(x=>x.amoebaStacks).filter(Number.isFinite),bossHits=out.map(x=>x.bossHits).filter(Number.isFinite);
    return {
      runs,clearRate:clears.length/runs,normalClearRate:normalClears.length/runs,criticalClearRate:criticalClears.length/runs,criticalEntryRate:critEntries.length/runs,
      medianClearTime:percentile(times,.5),p10ClearTime:percentile(times,.1),p90ClearTime:percentile(times,.9),meanClearTime:times.length?times.reduce((a,b)=>a+b,0)/times.length:null,
      medianElapsed:median(out.map(x=>x.elapsed)),
      medianHpRemaining:median(out.map(x=>x.hpFraction).filter(x=>x!=null)),
      medianHpAtTimer:hpTimer.length?median(hpTimer):null,avgPeakDps:peaks.length?peaks.reduce((a,b)=>a+b,0)/peaks.length:0,medianAmoebaStacks:stacks.length?median(stacks):0,medianBossHits:bossHits.length?median(bossHits):0,
      results:options.keepRuns?out:undefined
    };
  }
  function autoDamageScale(state,arr){
    const ext=externalDamageStatus(state);
    if(ext.known)return {scale:1,source:'exactJson',modelPeak:0,external:ext};
    if(!(state.bestDps>0)||!arr.length)return {scale:1,source:'internal',modelPeak:0,external:ext};
    const peaks=[];for(let i=0;i<5;i++)peaks.push(simulateOne(state,arr,{dpsOnly:true,damageScale:1,useSteroid:true,maxSeconds:bossTime(state.obstruction)+8,seed:0xA11CE+i*1777}).peak3s);
    const modelPeak=median(peaks)||0;if(modelPeak<=0)return {scale:1,source:'internal',modelPeak,external:ext};
    return {scale:clamp(state.bestDps/modelPeak,.05,500),source:'savedBestDps',modelPeak,external:ext};
  }
  function calibrateToObservedClearTime(state,arr,observedSeconds,options={}){
    const target=asNum(observedSeconds,0);
    if(!(target>0)||!arr.length)return autoDamageScale(state,arr);
    const runs=Math.max(6,Math.min(24,Math.round(asNum(options.runs,10))));
    const reviveDelaySeconds=Math.max(0,asNum(options.reviveDelaySeconds,.12));
    const simAt=scale=>simulateMany(state,arr,{runs,damageScale:scale,seed:0x0B5E,useSteroid:options.useSteroid!==false,steroidStartSeconds:asNum(options.steroidStartSeconds,0),reviveDelaySeconds});
    let lo=.002,hi=1000,best=null;
    for(let i=0;i<18;i++){
      const mid=Math.sqrt(lo*hi),st=simAt(mid),t=st.medianClearTime;
      if(t==null||t>target)lo=mid;else hi=mid;
      if(t!=null&&(!best||Math.abs(t-target)<Math.abs(best.stats.medianClearTime-target)))best={scale:mid,stats:st};
    }
    const scale=best?best.scale:hi;
    return {scale:clamp(scale,.002,1000),source:'observedClear',observedSeconds:target,matchedTime:best?.stats?.medianClearTime??null,modelPeak:0};
  }
  function steroidStartCandidates(state){
    if(!steroidUnlocked(state))return [0];
    const timer=bossTime(state.obstruction),dur=300/FPS;
    const set=new Set([0,Math.max(0,timer-dur),Math.max(0,timer/2-dur/2)]);
    for(let t=5;t<timer;t+=5)set.add(t);
    return [...set].sort((a,b)=>a-b);
  }
  function optimizeSteroidStart(state,arr,options={}){
    if(options.useSteroid===false||!steroidUnlocked(state))return {start:0,stats:simulateMany(state,arr,{...options,useSteroid:false}),tested:1};
    const candidates=steroidStartCandidates(state),runs=Math.max(1,Math.min(500,Math.round(asNum(options.runs,24))));
    let best=null;
    for(const start of candidates){
      const stats=simulateMany(state,arr,{...options,runs,useSteroid:true,steroidStartSeconds:start,seed:Math.round(asNum(options.seed,0x57E2))});
      const obj=timedObjective(stats,options.objectiveMode);
      if(!best||obj>best.objective)best={start,stats,objective:obj,tested:candidates.length};
    }
    return best;
  }
  function timedObjective(stats,mode='chance'){
    const cr=stats.clearRate,t=stats.medianClearTime??1e9,p90=stats.p90ClearTime??t;
    if(cr>0){
      if(mode==='fastest')return 1e12-1e8*t+1e7*cr-1e4*p90;
      if(mode==='balanced')return 1e12+cr*1e10-1e8*t-1e6*p90; // ~1% clear chance ~= 1 second median time
      return cr*1e12-1e7*t-1e5*p90; // chance-first: time mainly breaks close ties
    }
    const hp=stats.medianHpRemaining??stats.medianHpAtTimer??1;return -1e12-1e10*hp+Math.min(1e8,stats.avgPeakDps);
  }
  function mixUpperScore(state,counts,totalSlots){
    const e=effectiveCounts(state,counts);let sum=0;
    const gd=(1+2*e[7])*(1+.5*e[2]+.1*e[0]),gs=(1+.5*e[6])*(1+.25*e[3]+.15*e[1]);
    for(let t=0;t<counts.length;t++){const lv=asNum(state.cellLevels[t]),lm=1+lv*(1+upgradeQty(state,17))/100;sum+=counts[t]*(5*BASE_DMG[t]*lm)/(1.5*BASE_CD[t]);}
    if(counts[3]>0)sum*=1.5;const vu=counts[5]>0?1+totalSlots/10:1;return sum*gd*gs*vu;
  }
  function enumerateMixes(state,totalSlots,limit=260){
    // Bounded beam search: retain representatives at every occupied area, including
    // partial boards. Unlike exhaustive recursion, work stays bounded at full unlock.
    const ntypes=unitsOwned(state),perArea=Math.max(2,Math.ceil(limit/Math.max(1,totalSlots+1)));
    let beam=[{counts:Array(9).fill(0),area:0,score:0}];
    for(let t=0;t<ntypes;t++){
      const buckets=new Map(),size=SHAPE_OFFSETS[t].length;
      for(const prev of beam){
        const max=Math.min(Math.floor((totalSlots-prev.area)/size),t===5?virusLimit(state):Infinity);
        for(let n=0;n<=max;n++){
          const counts=prev.counts.slice();counts[t]=n;
          const area=prev.area+n*size,item={counts,area,score:mixUpperScore(state,counts,area)};
          const bucketKey=area+':'+counts[4];const bucket=buckets.get(bucketKey)||[];bucket.push(item);bucket.sort((a,b)=>b.score-a.score);
          bucket.length=Math.min(bucket.length,perArea);buckets.set(bucketKey,bucket);
        }
      }
      beam=[...buckets.values()].flat();
    }
    beam.sort((a,b)=>b.score-a.score);
    const selected=beam.slice(0,Math.max(1,Math.floor(limit*.7))),seen=new Set(selected);
    for(const fraction of [.95,.85,.7,.5,.25,0]){
      const item=beam.find(x=>x.area<=totalSlots*fraction&&!seen.has(x));
      if(item){selected.push(item);seen.add(item);}
    }
    for(const item of beam)if(selected.length<limit&&!seen.has(item)){selected.push(item);seen.add(item);}
    return selected.slice(0,limit);
  }
  function buildPlacementIndex(state){
    const slots=[...unlockedSlots(state)].sort((a,b)=>a-b),slotPos=new Map(slots.map((x,i)=>[x,i]));
    const placements=placementsForState(state).map(p=>{let mask=0n;for(const x of p.cells)mask|=1n<<BigInt(slotPos.get(x));return {...p,mask};});
    const bySlot=Array.from({length:slots.length},()=>[]);placements.forEach((p,idx)=>p.cells.forEach(x=>bySlot[slotPos.get(x)].push(idx)));
    return {slots,placements,bySlot,fullMask:(1n<<BigInt(slots.length))-1n};
  }
  function tileMix(state,mix,index,rng,deadline=Infinity){
    const remaining=mix.slice(),chosen=[],memo=new Set(),{placements,bySlot,fullMask}=index;let nodes=0;
    const emptyBudget=index.slots.length-mix.reduce((n,c,t)=>n+c*SHAPE_OFFSETS[t].length,0);
    if(emptyBudget<0)return null;
    function dfs(used,emptyLeft){
      if(++nodes>50000||performanceNow()>deadline)return false;
      if(remaining.every(x=>x===0))return true;if(used===fullMask)return false;
      if(memo.size<45000){const key=used.toString(36)+'|'+remaining.slice(0,unitsOwned(state)).join(',');if(memo.has(key))return false;memo.add(key);}
      let bestOpts=null,bestSlot=-1;for(let si=0;si<bySlot.length;si++){const bit=1n<<BigInt(si);if((used&bit)!==0n)continue;const opts=[];for(const pi of bySlot[si]){const p=placements[pi];if(remaining[p.type]>0&&(used&p.mask)===0n)opts.push(pi);}if(!opts.length&&emptyLeft===0)return false;if(bestOpts===null||opts.length<bestOpts.length){bestOpts=opts;bestSlot=si;if(opts.length===0)break;}}
      for(let i=bestOpts.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[bestOpts[i],bestOpts[j]]=[bestOpts[j],bestOpts[i]];}
      for(const pi of bestOpts){const p=placements[pi];remaining[p.type]--;chosen.push(p);if(dfs(used|p.mask,emptyLeft))return true;chosen.pop();remaining[p.type]++;}
      return emptyLeft>0&&dfs(used|(1n<<BigInt(bestSlot)),emptyLeft-1);
    }
    return dfs(0n,emptyBudget)?chosen.map(p=>({type:p.type,anchor:p.anchor,cells:p.cells.slice()})):null;
  }
  function arrangementKey(arr){return arr.slice().sort((a,b)=>a.anchor-b.anchor||a.type-b.type).map(x=>x.anchor+':'+x.type).join('|');}
  function organelleSurroundSlots(anchor){
    const surround=new Set(),col=anchor%COLS;
    [anchor-36,anchor-19,anchor-17,anchor+17,anchor+19,anchor+36].forEach(x=>{if(x>=0&&x<BOARD_SIZE)surround.add(x)});
    if(col>1)surround.add(anchor-2);if(col<16)surround.add(anchor+2);
    return surround;
  }
  function generateLayout(state,index,rng,seed=[]){
    const arr=seed.map(p=>({type:p.type,anchor:p.anchor,cells:p.cells.slice()})),used=new Set(arr.flatMap(p=>p.cells));
    const byType=Array.from({length:unitsOwned(state)},(_,t)=>index.placements.filter(p=>p.type===t));
    const counts=rawCounts(arr),weights=byType.map(()=>.05+Math.pow(rng(),2)*4);
    const capacity=rng()<.8?index.slots.length:Math.floor(index.slots.length*(.65+.35*rng()));
    function place(t){
      if(t===5&&counts[t]>=virusLimit(state))return false;
      const legal=byType[t].filter(p=>p.cells.every(c=>!used.has(c)));
      if(!legal.length)return false;
      const p=legal[Math.floor(rng()*legal.length)];arr.push({type:p.type,anchor:p.anchor,cells:p.cells.slice()});p.cells.forEach(c=>used.add(c));counts[t]++;return true;
    }
    // Explicit shield quotas prevent static-DPS selection from erasing Immunoids.
    if(!seed.length&&byType[4])for(let n=Math.floor(rng()*(Math.floor(index.slots.length/5)+1));n>0;n--)if(!place(4))break;
    if(!seed.length&&byType[3])for(let n=Math.floor(rng()*4);n>0;n--)if(!place(3))break;
    for(let n=0;n<180&&used.size<capacity;n++){
      const sum=weights.reduce((a,b)=>a+b,0);if(sum===0)break;
      let roll=rng()*sum,t=0;while(t<weights.length-1&&roll>=weights[t])roll-=weights[t++];
      if(!place(t))weights[t]=0;
    }
    return arr.sort((a,b)=>a.anchor-b.anchor);
  }
  function generateRoleAwareLayout(state,index,rng,seed=[]){
    const arr=seed.map(p=>({type:p.type,anchor:p.anchor,cells:p.cells.slice()})),used=new Set(arr.flatMap(p=>p.cells)),counts=rawCounts(arr),ntypes=unitsOwned(state);
    const byType=Array.from({length:ntypes},(_,t)=>index.placements.filter(p=>p.type===t));
    const typeValue=t=>BASE_DMG[t]/BASE_CD[t]*(1+asNum(state.cellLevels[t])*(1+upgradeQty(state,17))/100);
    function place(p){
      if(!p||p.type>=ntypes||p.cells.some(c=>used.has(c)))return false;
      if(p.type===5&&counts[5]>=virusLimit(state))return false;
      arr.push({type:p.type,anchor:p.anchor,cells:p.cells.slice()});p.cells.forEach(c=>used.add(c));counts[p.type]++;return true;
    }
    function bestPlacement(type,score){
      const legal=(byType[type]||[]).filter(p=>!p.cells.some(c=>used.has(c)));
      let best=null,bestScore=-Infinity;
      for(const p of legal){const s=score(p)+rng()*1e-6;if(s>bestScore){best=p;bestScore=s;}}
      return best;
    }
    if(!seed.length&&byType[4]){
      const shields=1+Math.floor(rng()*Math.max(1,Math.min(4,Math.floor(index.slots.length/18)+1)));
      for(let i=0;i<shields;i++)if(!place(bestPlacement(4,p=>(PROXIMITY_CORES.has(p.anchor)?2:0)+p.cells.length)))break;
    }
    if(byType[3]&&rng()<.85){
      const organs=1+Math.floor(rng()*Math.min(3,Math.max(1,index.slots.length/40)));
      for(let i=0;i<organs;i++)place(bestPlacement(3,p=>{
        const surround=organelleSurroundSlots(p.anchor);
        return index.placements.reduce((n,q)=>n+(q.type!==3&&q.cells.some(c=>surround.has(c))?typeValue(q.type):0),0);
      }));
    }
    if(upgradeQty(state,13)>=1){
      const priority=[7,6,2,3,1,0,5,4].filter(t=>t<ntypes);
      for(const t of priority){
        if(rng()<.35)continue;
        const p=bestPlacement(t,x=>(PROXIMITY_CORES.has(x.anchor)?1000:0)+typeValue(t));
        if(p&&PROXIMITY_CORES.has(p.anchor))place(p);
      }
    }
    if(byType[5]&&counts[5]<virusLimit(state)){
      const p=bestPlacement(5,v=>{
        const col=v.anchor%COLS,row=Math.floor(v.anchor/COLS),adj=new Set();
        if(row>0)adj.add(v.anchor-COLS);if(row<ROWS-1)adj.add(v.anchor+COLS);if(col>0)adj.add(v.anchor-1);if(col<COLS-1)adj.add(v.anchor+1);
        return arr.reduce((n,u)=>n+(u.cells.some(c=>adj.has(c))?u.cells.length:0),0);
      });
      if(p)place(p);
    }
    return generateLayout(state,index,rng,arr);
  }
  function generateSupportLayout(state,index,rng){
    // Build around Organelle first, then deliberately occupy its buff ring with
    // high-output shapes. This gives timed validation candidates that can realize
    // the adjacency multiplier instead of leaving it to random tiling.
    if(unitsOwned(state)<=3)return generateRoleAwareLayout(state,index,rng);
    const arr=[],used=new Set(),counts=Array(9).fill(0),byType=Array.from({length:unitsOwned(state)},(_,t)=>index.placements.filter(p=>p.type===t));
    const place=p=>{if(!p||p.cells.some(c=>used.has(c)))return false;arr.push({type:p.type,anchor:p.anchor,cells:p.cells.slice()});p.cells.forEach(c=>used.add(c));counts[p.type]++;return true;};
    const organelles=Math.min(3,1+Math.floor(rng()*3));
    for(let n=0;n<organelles;n++){
      const legal=(byType[3]||[]).filter(p=>!p.cells.some(c=>used.has(c)));if(!legal.length)break;
      const score=p=>{const ring=organelleSurroundSlots(p.anchor);return index.placements.reduce((sum,q)=>sum+(q.type!==3&&q.cells.some(c=>ring.has(c))?BASE_DMG[q.type]/BASE_CD[q.type]:0),0);};
      legal.sort((a,b)=>score(b)-score(a));place(legal[Math.min(legal.length-1,Math.floor(rng()*Math.min(5,legal.length)))]);
    }
    for(let n=0;n<Math.max(8,Math.floor(index.slots.length*.22));n++){
      const legal=index.placements.filter(p=>p.type<unitsOwned(state)&&p.type!==3&&!(p.type===5&&counts[5]>=virusLimit(state))&&!p.cells.some(c=>used.has(c)));if(!legal.length)break;
      const choice=legal.map(p=>{const supported=arr.filter(x=>x.type===3).some(o=>p.cells.some(c=>organelleSurroundSlots(o.anchor).has(c)));const value=BASE_DMG[p.type]/BASE_CD[p.type];return {p,score:value*(supported?8:1)+rng()*value*.35};}).sort((a,b)=>b.score-a.score)[0];if(!place(choice.p))break;
    }
    return generateLayout(state,index,rng,arr);
  }
  function relocateLayout(state,index,rng,arr){
    if(!arr.length)return generateLayout(state,index,rng);
    const chosen=Math.floor(rng()*arr.length),cell=arr[chosen],rest=arr.filter((_,i)=>i!==chosen),used=new Set(rest.flatMap(p=>p.cells));
    const legal=index.placements.filter(p=>p.type===cell.type&&p.anchor!==cell.anchor&&p.cells.every(c=>!used.has(c)));
    if(!legal.length)return arr;
    const replacement=legal[Math.floor(rng()*legal.length)];
    return [...rest,{type:replacement.type,anchor:replacement.anchor,cells:replacement.cells.slice()}].sort((a,b)=>a.anchor-b.anchor);
  }
  function localImproveLayout(state,index,rng,arr,maxSteps=6,deadline=Infinity){
    // A random layout is good at discovering a cell mix, but poor at arranging a
    // discovered mix around Organelle, Virus and Proximity cells.  This bounded
    // hill climb keeps the exact mix and moves one legal shape at a time, accepting
    // only a real static-combat improvement. Timed simulation still makes the final
    // decision, including shielding and projectile timing.
    let best=arr.map(p=>({type:p.type,anchor:p.anchor,cells:p.cells.slice()}));
    let bestScore=layoutScore(state,best).withJellyUpgrades;
    for(let step=0;step<maxSteps&&performanceNow()<deadline;step++){
      let winner=null,winnerScore=bestScore;
      const order=best.map((_,i)=>i);
      for(let i=order.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
      for(const at of order){
        if(performanceNow()>=deadline)break;
        const cell=best[at],rest=best.filter((_,i)=>i!==at),used=new Set(rest.flatMap(p=>p.cells));
        const legal=index.placements.filter(p=>p.type===cell.type&&p.anchor!==cell.anchor&&p.cells.every(c=>!used.has(c)));
        for(const replacement of legal){
          const next=[...rest,{type:replacement.type,anchor:replacement.anchor,cells:replacement.cells.slice()}].sort((a,b)=>a.anchor-b.anchor);
          const score=layoutScore(state,next).withJellyUpgrades;
          if(score>winnerScore*(1+1e-12)){winner=next;winnerScore=score;}
        }
      }
      if(!winner)break;
      best=winner;bestScore=winnerScore;
    }
    return best;
  }
  function isLegalLayout(state,arr){
    const slots=unlockedSlots(state),used=new Set();let viruses=0;
    for(const p of arr){
      if(p.type<0||p.type>=unitsOwned(state)||!Number.isInteger(p.anchor))return false;
      const cells=footprint(p.type,p.anchor);
      if(!cells||cells.length!==p.cells.length||!cells.every(c=>p.cells.includes(c)))return false;
      if(p.type===5&&++viruses>virusLimit(state))return false;
      for(const c of cells){if(!slots.has(c)||used.has(c))return false;used.add(c);}
    }
    return true;
  }
  function optimizeTimed(state,options={}){
    const start=performanceNow(),timeMs=Math.max(500,asNum(options.timeMs,3500)),current=arrangementFromBoard(state);
    const cal=options.damageScale?{scale:asNum(options.damageScale,1),source:'custom'}:autoDamageScale(state,current),damageScale=cal.scale;
    const reviveDelaySeconds=Math.max(0,asNum(options.reviveDelaySeconds,0)),index=buildPlacementIndex(state);
    const rng=seededRng(asNum(options.searchSeed,0xB00B5)),candidates=new Map(),currentKey=arrangementKey(current);
    const shortlistTarget=Math.max(16,Math.min(120,Math.round(asNum(options.shortlist,48))));
    const report=(stage,detail)=>{if(typeof options.onProgress==='function')options.onProgress({stage,...detail});};
    function add(arr){const key=arrangementKey(arr);if(candidates.has(key))return candidates.get(key);
      const score=layoutScore(state,arr),counts=score.counts,shields=counts[4],prox=arr.filter(p=>PROXIMITY_CORES.has(p.anchor)).length;
      const c={arr,key,proxy:score.withJellyUpgrades,score,counts,shields,prox,
        supportKey:[shields>0,score.organelleBoosted>0,score.infectedSlots>0,prox>0,counts.some((n,t)=>t!==5&&n>=3&&upgradeQty(state,14)>=1)].join(':')};candidates.set(key,c);return c;}
    add(current);
    if(options.incumbentArr&&isLegalLayout(state,options.incumbentArr))add(options.incumbentArr);
    for(let n=0;n<60;n++)add(relocateLayout(state,index,rng,current));
    // Deterministic bounded construction; no exponential mix enumeration on the hot path.
    const generationCount=Math.max(100,Math.min(1200,Math.round(asNum(options.mixLimit,300)*2)));
    for(let i=0;i<generationCount;i++)add(i%5===0?generateSupportLayout(state,index,rng):i%4===0?generateRoleAwareLayout(state,index,rng):generateLayout(state,index,rng));
    // Spend a small, predictable share of the search budget turning the strongest
    // mixes into coordinated support layouts before the costly timed screening.
    const constructionDeadline=start+timeMs*.28;
    const constructionElites=[...candidates.values()].sort((a,b)=>b.proxy-a.proxy).slice(0,Math.max(8,Math.min(28,Math.ceil(shortlistTarget*.6))));
    for(const c of constructionElites){
      if(performanceNow()>=constructionDeadline)break;
      add(localImproveLayout(state,index,rng,c.arr,4,constructionDeadline));
    }
    const ranked=[...candidates.values()].sort((a,b)=>b.proxy-a.proxy),shortlist=new Map();
    const keep=(c,required=false)=>{if(c&&(required||shortlist.size<shortlistTarget))shortlist.set(c.key,c);};
    keep(candidates.get(currentKey),true);
    // Round-robin shield-count lanes ensure defense is actually simulated.
    const lanes=new Map();for(const c of ranked){if(!lanes.has(c.shields))lanes.set(c.shields,[]);lanes.get(c.shields).push(c);}
    const supportLanes=new Map();for(const c of ranked){if(!supportLanes.has(c.supportKey))supportLanes.set(c.supportKey,[]);supportLanes.get(c.supportKey).push(c);}
    const laneDepth=Math.max(2,Math.min(6,Math.ceil(shortlistTarget/16)));
    for(let depth=0;depth<laneDepth;depth++)for(const lane of lanes.values())keep(lane[depth]);
    for(let depth=0;depth<laneDepth&&shortlist.size<shortlistTarget;depth++)for(const lane of supportLanes.values())keep(lane[depth]);
    ranked.slice(0,Math.max(12,Math.floor(shortlistTarget*.45))).forEach(c=>keep(c));
    for(const c of ranked)if(shortlist.size<shortlistTarget)keep(c);
    if(options.incumbentArr)keep(candidates.get(arrangementKey(options.incumbentArr)),true);
    const common={damageScale,useSteroid:options.useSteroid!==false,reviveDelaySeconds,objectiveMode:options.objectiveMode};
    const screenRuns=Math.max(3,Math.min(12,Math.round(asNum(options.screenRuns,4)))),screened=[];let simulated=0,lastPreview=-Infinity;
    function screen(c){if(c.stats)return c; c.stats=simulateMany(state,c.arr,{...common,runs:screenRuns,seed:0x51A7});c.obj=timedObjective(c.stats,options.objectiveMode);screened.push(c);simulated++;if(performanceNow()-lastPreview>100){report('testing layouts',{tested:simulated,candidates:candidates.size,arrangement:c.arr,stats:c.stats});lastPreview=performanceNow();}return c;}
    report('screening',{candidates:candidates.size});
    for(const c of shortlist.values())screen(c);
    // Mutate multiple timed elites. Deleting whole cells leaves legal empty squares;
    // refilling can relocate cores, change mixes, or add shielding.
    const mutations=Math.max(16,Math.min(240,Math.round(timeMs/35)));
    for(let i=0;i<mutations;i++){
      if(i>=16&&performanceNow()>start+timeMs)break;
      screened.sort((a,b)=>b.obj-a.obj);
      const parent=screened[Math.floor(rng()*Math.min(8,screened.length))];
      const removeCount=1+Math.floor(rng()*Math.max(2,parent.arr.length*.15));
      const removed=new Set();for(let n=0;n<removeCount;n++)removed.add(Math.floor(rng()*parent.arr.length));
      const kept=parent.arr.filter((_,i)=>!removed.has(i));
      let child=i%2===0?relocateLayout(state,index,rng,parent.arr):generateLayout(state,index,rng,kept);
      if(i%3!==0)child=localImproveLayout(state,index,rng,child,2,start+timeMs);
      const c=add(child);screen(c);
      if(i%10===0)report('refining',{tested:simulated,bestClearRate:screened[0].stats.clearRate});
    }
    // The cheap screen intentionally admits noisy candidates. Re-run the strongest
    // ones on a larger independent seed set before selecting finalists, so Deep mode
    // rewards robust layouts instead of a lucky four-run result.
    screened.sort((a,b)=>b.obj-a.obj);
    const refineRuns=Math.max(screenRuns,Math.min(96,Math.round(asNum(options.refineRuns,screenRuns))));
    const refineCount=Math.max(0,Math.min(screened.length,Math.round(asNum(options.refineCount,Math.min(12,shortlistTarget)))));
    if(refineRuns>screenRuns&&refineCount){
      for(let i=0;i<refineCount;i++){
        const c=screened[i];report('deep rechecking',{index:i+1,total:refineCount,runs:refineRuns});
        c.stats=simulateMany(state,c.arr,{...common,runs:refineRuns,seed:0x9EED+i*313});c.obj=timedObjective(c.stats,options.objectiveMode);simulated++;
      }
    }
    screened.sort((a,b)=>b.obj-a.obj);
    const finalists=screened.slice(0,Math.max(4,Math.min(12,asNum(options.finalists,8))));
    if(options.incumbentArr){const prior=candidates.get(arrangementKey(options.incumbentArr));if(prior&&!finalists.includes(prior))finalists.push(prior);}
    if(!finalists.some(c=>c.key===currentKey))finalists.push(candidates.get(currentKey));
    const fullRuns=Math.max(8,Math.min(500,Math.round(asNum(options.runs,64))));
    const plans=[];
    for(let i=0;i<finalists.length;i++){
      const c=finalists[i];report('validating',{index:i+1,total:finalists.length,runs:fullRuns});
      // Timing selection uses training seeds; final comparison uses independent seeds.
      const plan=optimizeSteroidStart(state,c.arr,{...common,runs:6,seed:0x57E2});
      const stats=simulateMany(state,c.arr,{...common,runs:fullRuns,seed:0xD00D,steroidStartSeconds:plan.start});
      report('validated layout',{tested:simulated,candidates:candidates.size,arrangement:c.arr,stats});
      plans.push({c,plan,stats,obj:timedObjective(stats,options.objectiveMode)});simulated++;
    }
    plans.sort((a,b)=>b.obj-a.obj);const best=plans[0],baseline=plans.find(p=>p.c.key===currentKey);
    report('complete',{clearRate:best.stats.clearRate,runs:fullRuns});
    return {arrangement:best.c.arr,stats:best.stats,current,currentStats:baseline.stats,damageScale,calibration:cal,
      mixesTested:generationCount,tilings:candidates.size,candidates:candidates.size,simulated,timeMs:performanceNow()-start,
      slots:index.slots.length,score:layoutScore(state,best.c.arr),currentScore:layoutScore(state,current),
      steroidStart:common.useSteroid&&steroidUnlocked(state)?best.plan.start:null,
      currentSteroidStart:common.useSteroid&&steroidUnlocked(state)?baseline.plan.start:null,reviveDelaySeconds,
      alternatives:plans.slice(1,4).map(p=>({arrangement:p.c.arr,stats:p.stats,steroidStart:p.plan.start})),
      searchNote:'Best found by bounded heuristic search; not a proof of the global optimum.'};
  }
  const FEVER_NAMES=['COLD','RASH','SEPSIS','NAUSEA','RABIES','PLAGUE'];
  function optimizeOperation(state,options={}){
    const fevers=options.searchFever===false||!feverUnlocked(state)?[state.fever]:[...new Set([state.fever,...Array.from({length:Math.min(6,Math.floor(upgradeQty(state,16)))},(_,i)=>i)])];
    const begin=performanceNow();let best=null,baseline=null;const feverResults=[];
    for(const fever of fevers){
      const st=cloneState(state);st.fever=fever;
      const result=optimizeTimed(st,{...options,timeMs:Math.max(500,asNum(options.timeMs,4200)/fevers.length),onProgress:p=>options.onProgress?.({...p,fever:FEVER_NAMES[fever]||'None'})});
      if(fever===state.fever)baseline=result;
      feverResults.push({fever,stats:result.stats});
      if(!best||timedObjective(result.stats,options.objectiveMode)>timedObjective(best.stats,options.objectiveMode))best={...result,fever};
    }
    return {...best,currentStats:baseline.currentStats,currentSteroidStart:baseline.currentSteroidStart,currentFever:state.fever,feverResults,timeMs:performanceNow()-begin};
  }
  function clearConfidence(stats){
    const n=stats.runs,p=stats.clearRate,z=1.96,den=1+z*z/n;
    const center=(p+z*z/(2*n))/den,half=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den;
    return [Math.max(0,center-half),Math.min(1,center+half)];
  }
  function upgradeCost(state,orderIndex){
    const t=orderIndex;if(t===0)return 0;const id=UPGRADE_ORDER[t],m=UPGRADE_META[id];if(!m)return Infinity;const base=m.baseCost!==0?m.baseCost:1;
    return Math.max(.1,base)*(1+t/7)*(6+5*t+t*t)*Math.pow(1.4+Math.max(0,t-3)/30,Math.max(0,t-4))*Math.pow(1.3,Math.max(0,t-20))*(1/(1+upgradeQty(state,34)/100))*Math.pow(m.growth,asNum(state.upgrades[id]));
  }
  function upgradeLevelReq(orderIndex){return 15+(2*orderIndex+(Math.floor(orderIndex/15)-Math.floor(orderIndex/11)));}
  function upgradeCandidates(state,arr,options={}){
    const damageScale=asNum(options.damageScale,1),seed=0x5150;
    const reviveDelaySeconds=Math.max(0,asNum(options.reviveDelaySeconds,0));
    const baseStats=simulateMany(state,arr,{runs:12,damageScale,seed,useSteroid:true,reviveDelaySeconds});
    const out=[];
    for(let oi=0;oi<Math.min(40,UPGRADE_ORDER.length);oi++){
      const id=UPGRADE_ORDER[oi],m=UPGRADE_META[id];if(!m)continue;const lv=asNum(state.upgrades[id]);
      const prevOk=oi===0||asNum(state.upgrades[UPGRADE_ORDER[oi-1]])>=1,levelOk=state.researchLevel===0||state.researchLevel>=upgradeLevelReq(oi);if(!prevOk||!levelOk||lv>=m.max)continue;
      const cost=upgradeCost(state,oi),affordable=state.bloodcells>=cost,st=cloneState(state);st.upgrades[id]=lv+1;
      const boardChanging=BOARD_PROGRESS_UPGRADES.has(id),directCombat=DIRECT_COMBAT_UPGRADES.has(id);
      let timed=null;
      if(directCombat&&!boardChanging)timed=simulateMany(st,arr,{runs:12,damageScale,seed,useSteroid:true,reviveDelaySeconds});
      const clearDelta=timed?timed.clearRate-baseStats.clearRate:0,timeSaved=timed&&timed.medianClearTime!=null&&baseStats.medianClearTime!=null?baseStats.medianClearTime-timed.medianClearTime:null;
      const impact=timed?(clearDelta*1000+(timeSaved||0)):0;
      const category=boardChanging?'board':directCombat?'combat':([23,24,25,26,27,33,34,38,39].includes(id)?'economy':'progression');
      out.push({id,orderIndex:oi,name:m.name,level:lv,cost,affordable,boardChanging,directCombat,category,desc:m.desc,levelReq:upgradeLevelReq(oi),timed,clearDelta,timeSaved,impact});
    }
    out.sort((a,b)=>{if(a.affordable!==b.affordable)return a.affordable?-1:1;if(a.category!==b.category){const rank={combat:0,board:1,economy:2,progression:3};return rank[a.category]-rank[b.category];}if(a.timed||b.timed)return b.impact-a.impact||a.cost-b.cost;return a.cost-b.cost;});return out;
  }
  function upgradeRoadmap(state,arr,options={}){
    const baseDamage=Math.max(1e-12,layoutScore(state,arr).withJellyUpgrades),baseCurrency=bloodcellBonuses(state),baseCurrencyMulti=baseCurrency.known?baseCurrency.multiplier:null;
    const unlockNote=id=>{
      if(id>=0&&id<=7)return 'One-time cell unlock; re-optimize to value its new shape and passive.';
      if(id===8)return 'One-time plot-purchase unlock; re-optimize after buying a plot.';
      if(id===9)return 'One-time plot purchasing unlock.';
      if(id===15)return 'Raises the Virus placement cap; re-optimize to test infection layouts.';
      if(id===16)return 'Unlocks or expands Fever choices; compare Fevers after purchase.';
      if(id===28)return 'One-time Amoeba weakening unlock.';
      if(id===29)return 'Unlocks active Stronkroid timing.';
      if(id===35)return 'Adds a manual Critical-condition revival.';
      if(id===36)return 'One-time Critical Condition unlock.';
      return '';
    };
    return upgradeCandidates(state,arr,options).map(u=>{
      const next=cloneState(state);next.upgrades[u.id]=asNum(next.upgrades[u.id])+1;
      const damageRatio=layoutScore(next,arr).withJellyUpgrades/baseDamage,nextCurrency=bloodcellBonuses(next),currencyRatio=baseCurrencyMulti&&nextCurrency.known?nextCurrency.multiplier/baseCurrencyMulti:1;
      const oneOff=UPGRADE_META[u.id].max===1||u.boardChanging,note=unlockNote(u.id);
      const gain=(damageRatio-1)*100+(currencyRatio-1)*65+(u.boardChanging?8:0)+(oneOff?3:0);
      return {...u,damageRatio,currencyRatio,oneOff,note,mathScore:gain/Math.max(1,u.cost),gain};
    }).sort((a,b)=>{if(a.affordable!==b.affordable)return a.affordable?-1:1;return b.mathScore-a.mathScore||b.gain-a.gain||a.cost-b.cost;});
  }
  function findUpgradeTarget(state,arr,options={}){
    // Greedy marginal damage-per-cost progression, validated by the timed model.
    // This is an explicit saving target, never an automatic purchase or save edit.
    const st=cloneState(state),purchases=new Map();let cost=0,stats=null;
    const common={damageScale:asNum(options.damageScale,1),useSteroid:true,reviveDelaySeconds:asNum(options.reviveDelaySeconds,0),steroidStartSeconds:asNum(options.steroidStartSeconds,0)};
    for(let step=0;step<256;step++){
      const base=layoutScore(st,arr).withJellyUpgrades;let best=null;
      for(let oi=0;oi<40;oi++){
        const id=UPGRADE_ORDER[oi],m=UPGRADE_META[id];
        if(![17,18,19,20,21,22,32].includes(id)||st.upgrades[id]>=m.max||st.researchLevel<upgradeLevelReq(oi)||(oi>0&&st.upgrades[UPGRADE_ORDER[oi-1]]<1))continue;
        const price=upgradeCost(st,oi),next=cloneState(st);next.upgrades[id]++;
        const gain=layoutScore(next,arr).withJellyUpgrades/base-1,efficiency=gain/price;
        if(gain>0&&(!best||efficiency>best.efficiency))best={id,price,efficiency};
      }
      if(!best)break;cost+=best.price;st.upgrades[best.id]++;
      purchases.set(best.id,{id:best.id,name:UPGRADE_META[best.id].name,from:state.upgrades[best.id],to:st.upgrades[best.id]});
      if(step%4===3){
        stats=simulateMany(st,arr,{...common,runs:12,seed:0x7A26});
        if(stats.clearRate>=.9){
          stats=simulateMany(st,arr,{...common,runs:96,seed:0x7A27});
          if(stats.clearRate>=.8)break;
        }
      }
    }
    if(!stats||stats.clearRate<.8)return null;
    stats=simulateMany(st,arr,{...common,runs:96,seed:0x7A27});
    return {kind:'saving-target',name:'Damage upgrade plan',cost,shortfall:Math.max(0,cost-state.bloodcells),stats,arrangement:arr,projectedState:st,purchases:[...purchases.values()],
      note:'Estimated saving target using this layout and current cell levels. Buys damage per Bloodcell greedily; other purchase combinations or future EXP gains may be better.'};
  }
  function recommendNextPlot(state,options={}){
    const owned=new Set(state.plots.map(x=>Math.round(asNum(x,-1)))),available=[];for(let i=0;i<PLOTS.length;i++)if(!owned.has(i))available.push(i);
    if(!available.length)return null;
    const start=performanceNow(),totalMs=Math.max(1200,asNum(options.timeMs,5200)),damageScale=Math.max(.000001,asNum(options.damageScale,1)),reviveDelaySeconds=Math.max(0,asNum(options.reviveDelaySeconds,0));
    const stage1Ms=Math.max(120,Math.min(260,Math.floor(totalMs*.52/Math.max(1,available.length)))),first=[];
    for(const idx of available){
      const st=cloneState(state);st.plots.push(idx);
      const r=optimizeTimed(st,{timeMs:stage1Ms,runs:6,mixLimit:70,shortlist:14,damageScale,useSteroid:options.useSteroid!==false,reviveDelaySeconds,objectiveMode:options.objectiveMode});
      first.push({plotIndex:idx,label:plotLabel(idx),slots:plotCells(idx),stats:r.stats,arrangement:r.arrangement,objective:timedObjective(r.stats,options.objectiveMode),quick:true});
    }
    first.sort((a,b)=>b.objective-a.objective);
    const finalists=first.slice(0,Math.min(5,first.length)),left=Math.max(600,totalMs-(performanceNow()-start)),per=Math.max(450,Math.floor(left/Math.max(1,finalists.length)));
    const deep=[];
    for(let j=0;j<finalists.length;j++){
      const f=finalists[j],st=cloneState(state);st.plots.push(f.plotIndex);
      const r=optimizeTimed(st,{timeMs:per,runs:Math.max(12,Math.round(asNum(options.runs,18))),mixLimit:220,shortlist:42,damageScale,useSteroid:options.useSteroid!==false,reviveDelaySeconds,objectiveMode:options.objectiveMode});
      deep.push({...f,stats:r.stats,arrangement:r.arrangement,objective:timedObjective(r.stats,options.objectiveMode),quick:false,search:r});
    }
    deep.sort((a,b)=>b.objective-a.objective);const best=deep[0]||first[0];
    return best?{...best,alternatives:deep.slice(1,4),timeMs:performanceNow()-start}:null;
  }
  function arrangementGrid(arr){const g=Array(BOARD_SIZE).fill(null);for(const p of arr)for(const c of p.cells)g[c]={type:p.type,anchor:p.anchor,isAnchor:c===p.anchor};return g;}
  function formatNumber(n){n=asNum(n);const a=Math.abs(n);if(a<1000)return n.toLocaleString(undefined,{maximumFractionDigits:2});const units=['K','M','B','T','Q','Qi','Sx'];let v=a,u=-1;while(v>=1000&&u<units.length-1){v/=1000;u++;}return(n<0?'-':'')+v.toFixed(v>=100?1:v>=10?2:3).replace(/\.0+$|(?<=\.[0-9]*?)0+$/,'')+units[u];}
  function formatTime(t){if(t==null||!Number.isFinite(t))return '—';return t<60?t.toFixed(2)+'s':Math.floor(t/60)+'m '+(t%60).toFixed(1)+'s';}
  return {VERSION,bonusAudit,bloodcellBonuses,arcadeBloodcellBonus,dpsBloodcellMultiplier,researchGridBonus,cellDetails,CELL_PASSIVES,CELL_ABILITIES,FEVER_NAMES,optimizeOperation,clearConfidence,COLS,ROWS,BOARD_SIZE,FPS,UNIT_NAMES,UNIT_IMG_DIMS,UNIT_VISUAL_OFFSET,UPGRADE_META,UPGRADE_ORDER,PLOTS,SHAPE_OFFSETS,SHAPE_COORDS,BULLET_LAUNCH,PROXIMITY_CORES,BLOCKED_CENTER,SUSHI_ROG_BONUS,
    parseInput,makeState,cloneState,upgradeQty,unitsOwned,virusLimit,feverUnlocked,critUnlocked,steroidUnlocked,reviveCount,bossHP,bossTime,bossAtkCD,cellExpReq,cellExpMultiplier,canLevelCells,obstructionTier,bundleFlag,slotPurchasesLeft,plotCells,plotLabel,
    unlockedSlots,footprint,placementsForState,arrangementFromBoard,rawCounts,effectiveCounts,rawArray,paletteCellDamageBonus,companionGridBonus,dreamCloudBonus,gridAllMultiplier,gridCellDamageBonus,externalDamageStatus,sushiUniqueCount,sushiRogBonus,organelleSpeedMultiplier,organelleBoosted,infectedSlots,combatModel,jellyDamageMultiplier,layoutScore,backInEase,projectileLaunchPosition,projectileHitDelayFrames,simulateOne,simulateMany,autoDamageScale,calibrateToObservedClearTime,steroidStartCandidates,optimizeSteroidStart,optimizeTimed,
    upgradeCost,upgradeLevelReq,upgradeCandidates,upgradeRoadmap,findUpgradeTarget,recommendNextPlot,arrangementGrid,formatNumber,formatTime,arrangementKey,isLegalLayout,relocateLayout,localImproveLayout,generateLayout,generateRoleAwareLayout,generateSupportLayout,enumerateMixes,buildPlacementIndex,tileMix,timedObjective,seededRng};
});
