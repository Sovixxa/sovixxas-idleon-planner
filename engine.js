(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root) root.JellyEngine=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  const VERSION='0.4.1-timed-visual';
  const COLS=18, ROWS=10, BOARD_SIZE=180, FPS=60;
  const UNIT_NAMES=['Amoeba','Plasmid','Ribosome','Organelle','Immunoid','Virus','Mitochondria','Gigacyst','Bruhollio'];
  const UNIT_IMG_DIMS=[[36,36],[73,36],[36,109],[110,110],[73,73],[36,36],[147,147],[184,183],[36,36]];
  const UNIT_VISUAL_OFFSET=[0,0,0,-1,0,0,0,-2,0];
  const BASE_CD=[145,60,400,160,750,200,10,20,30];
  const BASE_DMG=[1,1.2,12,6,20,1,2,4,1];
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
  const DIRECT_COMBAT_UPGRADES=new Set([13,14,17,18,19,20,21,22,28,29,32,35,36]);
  const BOARD_PROGRESS_UPGRADES=new Set([0,1,2,3,4,5,6,7,8,9,15,16]);
  const ROG_BONUS=[50,35,25,5,1,1,15,40,25,30,100,50,1,1,5,4,200,1,25,20,150,30,10,40,30,1,30,200,2,20,20,25,3,1,1,1,1,10,35,75,15,5,25,3,1,1,30,6,3,25,1,200,3,20,60,5,1,1,150,20,5,3,25,25,1,1,1,1,1,1,1,1];
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
    const obj=typeof input==='string'?JSON.parse(input):input;
    const data=obj&&obj.data&&typeof obj.data==='object'?obj.data:obj;
    if(!data||data.Research==null) throw new Error('Could not find Research in this JSON. Paste either the full IdleOn export or the data-only export.');
    const research=typeof data.Research==='string'?JSON.parse(data.Research):data.Research;
    if(!Array.isArray(research)||research.length<19) throw new Error('Research exists, but its format is not the Jelly Operator schema this build expects.');
    let researchLevel=0;
    for(const [k,v] of Object.entries(data)) if(/^Lv0_\d+$/.test(k)&&Array.isArray(v)) researchLevel=Math.max(researchLevel,asNum(v[20],0));
    return makeState(research,researchLevel,data);
  }
  function makeState(research,researchLevel=0,rawData=null){
    const R=research;
    return {
      research:R,researchLevel,rawData,
      board:Array.isArray(R[14])?R[14].slice():Array(BOARD_SIZE).fill(-1),
      cellExp:Array.isArray(R[15])?R[15].slice():Array(10).fill(0),
      cellLevels:Array.isArray(R[16])?R[16].slice():Array(10).fill(0),
      upgrades:Array.isArray(R[17])?R[17].slice():Array(100).fill(0),
      plots:Array.isArray(R[18])?R[18].slice():[],
      bloodcells:asNum(R[7]?.[11]), obstruction:asNum(R[7]?.[9]), successfulOps:asNum(R[7]?.[10]),
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
  function footprint(type,anchor){
    const ar=Math.floor(anchor/COLS),ac=anchor%COLS,out=[];
    for(const [dr,dc] of SHAPE_COORDS[type]||[[0,0]]){const r=ar+dr,c=ac+dc;if(r<0||r>=ROWS||c<0||c>=COLS)return null;out.push(r*COLS+c);}return out;
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
    return b&&typeof b==='object'&&asNum(b[key],0)>0?1:0;
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
  function feverDamageMultiplier(state,elapsedSeconds){
    if(!feverUnlocked(state))return 1;
    const f=Math.round(state.fever);
    if(f===0)return 1+Math.max(0,Math.floor(elapsedSeconds))/100;
    if(f===1)return 2;
    if(f===4)return 1.5;
    return 1;
  }
  function feverSpeedMultiplier(state){
    if(!feverUnlocked(state))return 1;
    const f=Math.round(state.fever);if(f===4)return 1.25;if(f===5)return 1.4;return 1;
  }
  function jellyDamageMultiplier(state,elapsedSeconds=0){
    const q=id=>upgradeQty(state,id),totalLv=state.cellLevels.reduce((a,b)=>a+asNum(b),0);
    return (1+(q(18)+q(19)+q(20))/100)*(1+q(21)/100)*(1+q(22)/100)*(1+q(32)*Math.floor(totalLv/100)/100)*feverDamageMultiplier(state,elapsedSeconds);
  }
  function combatModel(state,arr){
    const counts=rawCounts(arr),pass=passiveMultipliers(state,counts),boosted=organelleBoosted(arr),infected=infectedSlots(arr);
    const virusMulti=1+infected.size/10;
    const globalSpeed=pass.speed*feverSpeedMultiplier(state);
    const globalDamage=pass.damage*virusMulti;
    const units=arr.map((p,idx)=>{
      const t=p.type,lv=asNum(state.cellLevels[t]),levelMulti=1+lv*(1+upgradeQty(state,17))/100;
      const prox=upgradeQty(state,13)>=1&&PROXIMITY_CORES.has(p.anchor)?1+upgradeQty(state,13)/100:1;
      const org=boosted.has(p.anchor)?1.5+Math.min(.25,Math.max(0,rogBonus(state,63)/100)):1;
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
    const model=combatModel(state,arr),units=model.units;
    const damageScale=Math.max(.000001,asNum(options.damageScale,1));
    const dpsOnly=!!options.dpsOnly;
    const hpMax=dpsOnly?1e300:bossHP(state.obstruction);
    let hp=hpMax,elapsed=0,frame=0,stack=0,bossCounter=0;
    const timer=bossTime(state.obstruction),crit=critUnlocked(state),bossCD=bossAtkCD(state.obstruction);
    let revives=reviveCount(state),roidFrames=0,roidUsed=false;
    let pendingRevive=null;
    const reviveDelayFrames=Math.max(0,Math.round(asNum(options.reviveDelaySeconds,.12)*FPS));
    const steroidStart=Math.max(0,asNum(options.steroidStartSeconds,0));
    const dead=Array(BOARD_SIZE).fill(false),progress=Array(units.length).fill(0);
    for(let i=0;i<units.length;i++)progress[i]=randInt(rng,0,Math.max(5,Math.floor(units[i].cd-1)));
    const projectiles=[];const damageBuckets=[];let bucketDamage=0,peak3s=0,hpAtTimer=null,criticalEntered=false,bossHits=0;
    const maxSeconds=Math.max(timer+5,asNum(options.maxSeconds,dpsOnly?timer+12:timer+90));
    let result='timeout';
    while(elapsed<maxSeconds){
      frame++;elapsed=frame/FPS;
      if(!roidUsed&&options.useSteroid!==false&&steroidUnlocked(state)&&elapsed>=steroidStart){roidFrames=300;roidUsed=true;}
      const roid=roidFrames>0?roidMulti(state):1;
      if(roidFrames>0)roidFrames--;
      if(pendingRevive&&frame>=pendingRevive.frame){dead[pendingRevive.cell]=false;pendingRevive=null;}
      for(let i=0;i<units.length;i++){
        const u=units[i];if(dead[u.anchor])continue;
        progress[i]+=.65*roid*u.orgBoost*u.prox;
        if(progress[i]>=u.cd){
          progress[i]=0;
          const dmg=u.baseDamage*jellyDamageMultiplier(state,elapsed)*(1+stack/100)*damageScale;
          projectiles.push({hitFrame:frame+Math.max(1,Math.round(u.travel*FPS)),damage:dmg,type:u.type});
        }
      }
      for(let i=projectiles.length-1;i>=0;i--)if(projectiles[i].hitFrame<=frame){
        const p=projectiles[i];hp-=p.damage;bucketDamage+=p.damage;if(upgradeQty(state,28)>=1&&p.type===0)stack++;projectiles.splice(i,1);
      }
      if(frame%FPS===0){
        damageBuckets.unshift(bucketDamage);bucketDamage=0;if(damageBuckets.length>5)damageBuckets.length=5;
        if(damageBuckets.length>=4){const d=(damageBuckets[1]+damageBuckets[2]+damageBuckets[3])/3;peak3s=Math.max(peak3s,d);}
      }
      if(!dpsOnly&&hp<=0){result='clear';break;}
      if(elapsed>timer&&hpAtTimer===null){hpAtTimer=dpsOnly?null:Math.max(0,hp/hpMax);criticalEntered=true;}
      if(!dpsOnly&&elapsed>timer){
        bossCounter++;
        if(!crit)bossCounter+=9999;
        if(bossCounter>=bossCD){
          bossCounter=0;const alive=[],immunoid=[];
          for(const u of units)for(const c of u.cells)if(!dead[c]){alive.push(c);if(u.type===4)immunoid.push(c);}
          if(!crit||alive.length===0){result='fail';break;}
          const pool=immunoid.length?immunoid:alive,target=pool[randInt(rng,0,pool.length-1)];dead[target]=true;bossHits++;
          if(immunoid.length)bossCounter=-2*bossCD;
          if(options.autoRevive!==false&&revives>0&&!pendingRevive){
            const r=chooseRevive(model,dead,units,revives);
            if(r>=0){revives--;pendingRevive={cell:r,frame:frame+reviveDelayFrames};}
          }
        }
      }
    }
    if(dpsOnly)result='dps';
    return {result,clear:result==='clear',time:result==='clear'?elapsed:null,elapsed,hpRemaining:dpsOnly?null:Math.max(0,hp),hpFraction:dpsOnly?null:Math.max(0,hp/hpMax),hpAtTimer,criticalEntered,amoebaStacks:stack,peak3s,bossHits,revivesLeft:revives,steroidUsed:roidUsed,steroidStart:roidUsed?steroidStart:null,reviveDelaySeconds:reviveDelayFrames/FPS};
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
      medianHpAtTimer:hpTimer.length?median(hpTimer):null,avgPeakDps:peaks.length?peaks.reduce((a,b)=>a+b,0)/peaks.length:0,medianAmoebaStacks:stacks.length?median(stacks):0,medianBossHits:bossHits.length?median(bossHits):0,
      results:options.keepRuns?out:undefined
    };
  }
  function autoDamageScale(state,arr){
    if(!(state.bestDps>0)||!arr.length)return {scale:1,source:'internal',modelPeak:0};
    const peaks=[];for(let i=0;i<5;i++)peaks.push(simulateOne(state,arr,{dpsOnly:true,damageScale:1,useSteroid:true,maxSeconds:bossTime(state.obstruction)+8,seed:0xA11CE+i*1777}).peak3s);
    const modelPeak=median(peaks)||0;if(modelPeak<=0)return {scale:1,source:'internal',modelPeak};
    return {scale:clamp(state.bestDps/modelPeak,.05,500),source:'savedBestDps',modelPeak};
  }
  function calibrateToObservedClearTime(state,arr,observedSeconds,options={}){
    const target=asNum(observedSeconds,0);
    if(!(target>0)||!arr.length)return autoDamageScale(state,arr);
    const runs=Math.max(6,Math.min(24,Math.round(asNum(options.runs,10))));
    const reviveDelaySeconds=Math.max(0,asNum(options.reviveDelaySeconds,.12));
    const simAt=scale=>simulateMany(state,arr,{runs,damageScale:scale,seed:0x0B5E,useSteroid:options.useSteroid!==false,steroidStartSeconds:asNum(options.steroidStartSeconds,0),reviveDelaySeconds,maxSeconds:Math.max(target+45,bossTime(state.obstruction)+90)});
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
    if(!steroidUnlocked(state))return {start:0,stats:simulateMany(state,arr,{...options,useSteroid:false}),tested:1};
    const candidates=steroidStartCandidates(state),runs=Math.max(5,Math.min(18,Math.round(asNum(options.runs,9))));
    let best=null;
    for(const start of candidates){
      const stats=simulateMany(state,arr,{...options,runs,useSteroid:true,steroidStartSeconds:start,seed:Math.round(asNum(options.seed,0x57E2))+Math.round(start*131)});
      const obj=timedObjective(stats);
      if(!best||obj>best.objective)best={start,stats,objective:obj,tested:candidates.length};
    }
    return best;
  }
  function timedObjective(stats){
    const cr=stats.clearRate;
    if(cr>0){const t=stats.medianClearTime??1e9,p90=stats.p90ClearTime??t;return cr*1e12-1e7*t-1e5*p90;}
    const hp=stats.medianHpAtTimer==null?1:stats.medianHpAtTimer;return -1e10*hp+stats.avgPeakDps;
  }
  function mixUpperScore(state,counts,totalSlots){
    const e=effectiveCounts(state,counts);let sum=0;
    const gd=(1+2*e[7])*(1+.5*e[2]+.1*e[0]),gs=(1+.5*e[6])*(1+.25*e[3]+.15*e[1]);
    for(let t=0;t<counts.length;t++){const lv=asNum(state.cellLevels[t]),lm=1+lv*(1+upgradeQty(state,17))/100;sum+=counts[t]*(5*BASE_DMG[t]*lm)/(1.5*BASE_CD[t]);}
    if(counts[3]>0)sum*=1.5;const vu=counts[5]>0?1+totalSlots/10:1;return sum*gd*gs*vu;
  }
  function enumerateMixes(state,totalSlots,limit=260){
    const ntypes=unitsOwned(state),areas=SHAPE_COORDS.map(x=>x.length),counts=Array(9).fill(0),best=[],vlim=virusLimit(state);
    function push(){const c=counts.slice(),score=mixUpperScore(state,c,totalSlots);best.push({counts:c,score});if(best.length>limit*4){best.sort((a,b)=>b.score-a.score);best.length=limit*2;}}
    function rec(t,remaining){if(t===ntypes){if(remaining===0)push();return;}const area=areas[t];let max=Math.floor(remaining/area);if(t===5)max=Math.min(max,vlim);for(let n=0;n<=max;n++){counts[t]=n;rec(t+1,remaining-n*area);}counts[t]=0;}
    rec(0,totalSlots);best.sort((a,b)=>b.score-a.score);return best.slice(0,limit);
  }
  function buildPlacementIndex(state){
    const slots=[...unlockedSlots(state)].sort((a,b)=>a-b),slotPos=new Map(slots.map((x,i)=>[x,i]));
    const placements=placementsForState(state).map(p=>{let mask=0n;for(const x of p.cells)mask|=1n<<BigInt(slotPos.get(x));return {...p,mask};});
    const bySlot=Array.from({length:slots.length},()=>[]);placements.forEach((p,idx)=>p.cells.forEach(x=>bySlot[slotPos.get(x)].push(idx)));
    return {slots,placements,bySlot,fullMask:(1n<<BigInt(slots.length))-1n};
  }
  function tileMix(state,mix,index,rng,deadline=Infinity){
    const remaining=mix.slice(),chosen=[],memo=new Set(),{placements,bySlot,fullMask}=index;let nodes=0;
    function dfs(used){
      if((++nodes&2047)===0&&performanceNow()>deadline)return false;if(used===fullMask)return remaining.every(x=>x===0);
      if(memo.size<45000){const key=used.toString(36)+'|'+remaining.slice(0,unitsOwned(state)).join(',');if(memo.has(key))return false;memo.add(key);}
      let bestOpts=null;for(let si=0;si<bySlot.length;si++){const bit=1n<<BigInt(si);if((used&bit)!==0n)continue;const opts=[];for(const pi of bySlot[si]){const p=placements[pi];if(remaining[p.type]>0&&(used&p.mask)===0n)opts.push(pi);}if(!opts.length)return false;if(bestOpts===null||opts.length<bestOpts.length){bestOpts=opts;if(opts.length===1)break;}}
      for(let i=bestOpts.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[bestOpts[i],bestOpts[j]]=[bestOpts[j],bestOpts[i]];}
      for(const pi of bestOpts){const p=placements[pi];remaining[p.type]--;chosen.push(p);if(dfs(used|p.mask))return true;chosen.pop();remaining[p.type]++;}return false;
    }
    return dfs(0n)?chosen.map(p=>({type:p.type,anchor:p.anchor,cells:p.cells.slice()})):null;
  }
  function arrangementKey(arr){return arr.slice().sort((a,b)=>a.anchor-b.anchor||a.type-b.type).map(x=>x.anchor+':'+x.type).join('|');}
  function optimizeTimed(state,options={}){
    const timeMs=Math.max(120,asNum(options.timeMs,3500)),start=performanceNow(),deadline=start+timeMs;
    const current=arrangementFromBoard(state),cal=options.damageScale?{scale:asNum(options.damageScale,1),source:'custom'}:autoDamageScale(state,current),damageScale=cal.scale;
    const reviveDelaySeconds=Math.max(0,asNum(options.reviveDelaySeconds,.12));
    const index=buildPlacementIndex(state),mixes=enumerateMixes(state,index.slots.length,Math.max(80,Math.min(450,Math.round(asNum(options.mixLimit,260))))),rng=seededRng(0xB00B5+state.obstruction+Math.round(state.bloodcells)%997);
    const candidates=new Map();
    function add(arr){if(!arr)return;const k=arrangementKey(arr);if(candidates.has(k))return;const proxy=layoutScore(state,arr).withJellyUpgrades;candidates.set(k,{arr,proxy});}
    add(current);let tilings=0,mixesTested=0;
    for(const m of mixes){if(performanceNow()>deadline*.72+start*.28)break;const attempts=(m.counts[3]>0||m.counts[4]>0||m.counts[5]>0)?5:2;for(let a=0;a<attempts;a++){if(performanceNow()>deadline*.72+start*.28)break;mixesTested++;const arr=tileMix(state,m.counts,index,rng,deadline);if(arr){tilings++;add(arr);}}}
    const shortlist=[...candidates.values()].sort((a,b)=>b.proxy-a.proxy).slice(0,Math.max(18,Math.min(70,Math.round(asNum(options.shortlist,46)))));
    // Keep Immunoid-bearing layouts even when their static proxy is lower; they can dominate after the timer.
    const survival=[...candidates.values()].filter(x=>x.arr.some(p=>p.type===4)).sort((a,b)=>b.proxy-a.proxy).slice(0,18);for(const x of survival)if(!shortlist.some(y=>arrangementKey(y.arr)===arrangementKey(x.arr)))shortlist.push(x);
    let bestArr=current,bestStats=simulateMany(state,current,{runs:Math.max(10,Math.round(asNum(options.runs,24)/2)),damageScale,seed:0xC011,useSteroid:options.useSteroid!==false,steroidStartSeconds:asNum(options.steroidStartSeconds,0),reviveDelaySeconds}),bestObj=timedObjective(bestStats),simulated=1;
    for(const c of shortlist){if(performanceNow()>deadline)break;const left=deadline-performanceNow(),runs=Math.max(6,Math.min(Math.round(asNum(options.runs,24)),Math.floor(left/18)));const st=simulateMany(state,c.arr,{runs,damageScale,seed:0xD00D+simulated*101,useSteroid:options.useSteroid!==false,steroidStartSeconds:asNum(options.steroidStartSeconds,0),reviveDelaySeconds});simulated++;const obj=timedObjective(st);if(obj>bestObj){bestObj=obj;bestArr=c.arr;bestStats=st;}}
    let steroidPlan={start:0,stats:bestStats,tested:1};
    if(options.useSteroid!==false&&steroidUnlocked(state)){
      steroidPlan=optimizeSteroidStart(state,bestArr,{runs:Math.max(6,Math.floor(asNum(options.runs,24)/2)),damageScale,reviveDelaySeconds,maxSeconds:bossTime(state.obstruction)+90});
      bestStats=steroidPlan.stats;
    }
    let currentSteroidPlan={start:0,stats:null,tested:1};
    if(options.useSteroid!==false&&steroidUnlocked(state))currentSteroidPlan=optimizeSteroidStart(state,current,{runs:Math.max(6,Math.floor(asNum(options.runs,24)/2)),damageScale,reviveDelaySeconds,maxSeconds:bossTime(state.obstruction)+90});
    const currentStats=currentSteroidPlan.stats||simulateMany(state,current,{runs:Math.max(12,Math.round(asNum(options.runs,24))),damageScale,seed:0xCAFE,useSteroid:false,reviveDelaySeconds});
    return {arrangement:bestArr,stats:bestStats,current,currentStats,damageScale,calibration:cal,mixesTested,tilings,candidates:candidates.size,simulated,timeMs:performanceNow()-start,slots:index.slots.length,score:layoutScore(state,bestArr),currentScore:layoutScore(state,current),steroidStart:steroidUnlocked(state)?steroidPlan.start:null,currentSteroidStart:steroidUnlocked(state)?currentSteroidPlan.start:null,reviveDelaySeconds};
  }
  function upgradeCost(state,orderIndex){
    const t=orderIndex;if(t===0)return 0;const id=UPGRADE_ORDER[t],m=UPGRADE_META[id];if(!m)return Infinity;const base=m.baseCost!==0?m.baseCost:1;
    return Math.max(.1,base)*(1+t/7)*(6+5*t+t*t)*Math.pow(1.4+Math.max(0,t-3)/30,Math.max(0,t-4))*Math.pow(1.3,Math.max(0,t-20))*(1/(1+upgradeQty(state,34)/100))*Math.pow(m.growth,asNum(state.upgrades[id]));
  }
  function upgradeLevelReq(orderIndex){return 15+(2*orderIndex+(Math.floor(orderIndex/15)-Math.floor(orderIndex/11)));}
  function upgradeCandidates(state,arr,options={}){
    const damageScale=asNum(options.damageScale,1),seed=0x5150;
    const reviveDelaySeconds=Math.max(0,asNum(options.reviveDelaySeconds,.12));
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
  function recommendNextPlot(state,options={}){
    const owned=new Set(state.plots.map(x=>Math.round(asNum(x,-1)))),available=[];for(let i=0;i<PLOTS.length;i++)if(!owned.has(i))available.push(i);
    if(!available.length)return null;
    const start=performanceNow(),totalMs=Math.max(1200,asNum(options.timeMs,5200)),damageScale=Math.max(.000001,asNum(options.damageScale,1)),reviveDelaySeconds=Math.max(0,asNum(options.reviveDelaySeconds,.12));
    const stage1Ms=Math.max(120,Math.min(260,Math.floor(totalMs*.52/Math.max(1,available.length)))),first=[];
    for(const idx of available){
      const st=cloneState(state);st.plots.push(idx);
      const r=optimizeTimed(st,{timeMs:stage1Ms,runs:6,mixLimit:70,shortlist:14,damageScale,useSteroid:options.useSteroid!==false,reviveDelaySeconds});
      first.push({plotIndex:idx,label:plotLabel(idx),slots:plotCells(idx),stats:r.stats,arrangement:r.arrangement,objective:timedObjective(r.stats),quick:true});
    }
    first.sort((a,b)=>b.objective-a.objective);
    const finalists=first.slice(0,Math.min(5,first.length)),left=Math.max(600,totalMs-(performanceNow()-start)),per=Math.max(450,Math.floor(left/Math.max(1,finalists.length)));
    const deep=[];
    for(let j=0;j<finalists.length;j++){
      const f=finalists[j],st=cloneState(state);st.plots.push(f.plotIndex);
      const r=optimizeTimed(st,{timeMs:per,runs:Math.max(12,Math.round(asNum(options.runs,18))),mixLimit:220,shortlist:42,damageScale,useSteroid:options.useSteroid!==false,reviveDelaySeconds});
      deep.push({...f,stats:r.stats,arrangement:r.arrangement,objective:timedObjective(r.stats),quick:false,search:r});
    }
    deep.sort((a,b)=>b.objective-a.objective);const best=deep[0]||first[0];
    return best?{...best,alternatives:deep.slice(1,4),timeMs:performanceNow()-start}:null;
  }
  function arrangementGrid(arr){const g=Array(BOARD_SIZE).fill(null);for(const p of arr)for(const c of p.cells)g[c]={type:p.type,anchor:p.anchor,isAnchor:c===p.anchor};return g;}
  function formatNumber(n){n=asNum(n);const a=Math.abs(n);if(a<1000)return n.toLocaleString(undefined,{maximumFractionDigits:2});const units=['K','M','B','T','Q','Qi','Sx'];let v=a,u=-1;while(v>=1000&&u<units.length-1){v/=1000;u++;}return(n<0?'-':'')+v.toFixed(v>=100?1:v>=10?2:3).replace(/\.0+$|(?<=\.[0-9]*?)0+$/,'')+units[u];}
  function formatTime(t){if(t==null||!Number.isFinite(t))return '—';return t<60?t.toFixed(2)+'s':Math.floor(t/60)+'m '+(t%60).toFixed(1)+'s';}
  return {VERSION,COLS,ROWS,BOARD_SIZE,FPS,UNIT_NAMES,UNIT_IMG_DIMS,UNIT_VISUAL_OFFSET,UPGRADE_META,UPGRADE_ORDER,PLOTS,SHAPE_COORDS,PROXIMITY_CORES,BLOCKED_CENTER,
    parseInput,makeState,cloneState,upgradeQty,unitsOwned,virusLimit,feverUnlocked,critUnlocked,steroidUnlocked,reviveCount,bossHP,bossTime,bossAtkCD,obstructionTier,bundleFlag,slotPurchasesLeft,plotCells,plotLabel,
    unlockedSlots,footprint,placementsForState,arrangementFromBoard,rawCounts,effectiveCounts,organelleBoosted,infectedSlots,combatModel,layoutScore,simulateOne,simulateMany,autoDamageScale,calibrateToObservedClearTime,steroidStartCandidates,optimizeSteroidStart,optimizeTimed,
    upgradeCost,upgradeLevelReq,upgradeCandidates,recommendNextPlot,arrangementGrid,formatNumber,formatTime,arrangementKey};
});
