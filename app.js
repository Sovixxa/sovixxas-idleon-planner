(()=>{
  'use strict';
  const E=window.JellyEngine;
  const $=id=>document.getElementById(id);
  let state=null,lastResult=null,currentArrangement=null,currentStats=null,calibration=null,lastNextMove=null;
  const SESSION_KEY='idleon-jelly-json-session-v3';
  const OBS_KEY='idleon-jelly-observed-clear-v1';
  const REVIVE_KEY='idleon-jelly-revive-delay-v1';

  $('version').textContent='engine v'+E.VERSION;

  function fail(msg){$('error').textContent=msg;$('error').classList.remove('hidden');}
  function clearFail(){$('error').classList.add('hidden');$('error').textContent='';}
  function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function pct(x,d=0){return Number.isFinite(x)?(100*x).toFixed(d)+'%':'—';}
  function stat(k,v,sub=''){return `<div class="stat"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div>${sub?`<div class="m-sub">${esc(sub)}</div>`:''}</div>`;}
  function quality(){
    const q=$('searchQuality').value;
    if(q==='quick')return {timeMs:1600,runs:14,mixLimit:170,shortlist:30};
    if(q==='deep')return {timeMs:8500,runs:44,mixLimit:430,shortlist:68};
    return {timeMs:4200,runs:26,mixLimit:290,shortlist:48};
  }
  function currentReviveDelay(){return Math.max(0,Number($('reviveDelay')?.value)||0);}
  function persistInput(){
    try{
      if($('rememberTab').checked&&$('jsonInput').value)sessionStorage.setItem(SESSION_KEY,$('jsonInput').value);
      else sessionStorage.removeItem(SESSION_KEY);
    }catch(_){/* local-only convenience; ignore unavailable storage */}
  }

  function chooseCalibration(){
    const observed=Number($('observedTime').value);
    if(Number.isFinite(observed)&&observed>0){
      try{return E.calibrateToObservedClearTime(state,currentArrangement,observed,{runs:10,useSteroid:true,reviveDelaySeconds:currentReviveDelay()});}
      catch(e){console.warn('Observed-time calibration failed; falling back to saved best DPS.',e);}
    }
    return E.autoDamageScale(state,currentArrangement);
  }

  function calibrationText(cal){
    if(cal?.source==='observedClear')return `Timed model anchored to your observed ${Number(cal.observedSeconds).toFixed(2)}s current-board clear (matched ${E.formatTime(cal.matchedTime)}; damage multiplier ×${cal.scale.toFixed(3)}).`;
    if(cal?.source==='savedBestDps')return `No observed clear entered. External/account-wide Jelly damage is estimated from saved best DPS (multiplier ×${cal.scale.toFixed(3)}). For tighter timing, enter a fresh current-board clear time above.`;
    return 'Using internal Jelly multipliers only; no observed clear or saved best DPS was available for calibration.';
  }

  function renderStateStats(){
    const counts=E.rawCounts(currentArrangement), timer=E.bossTime(state.obstruction), hp=E.bossHP(state.obstruction);
    $('stats').innerHTML=[
      stat('Obstruction',Math.round(state.obstruction),E.formatNumber(hp)+' HP'),
      stat('Operation timer',E.formatTime(timer),'then Critical Condition'),
      stat('Bloodcells',E.formatNumber(state.bloodcells)),
      stat('Unlocked board',E.unlockedSlots(state).size+' squares'),
      stat('Cell levels',state.cellLevels.slice(0,E.unitsOwned(state)).join(' / ')),
      stat('Placed cells',counts.slice(0,E.unitsOwned(state)).reduce((a,b)=>a+b,0),counts.slice(0,E.unitsOwned(state)).join(' / '))
    ].join('');
    const tier=E.obstructionTier(state);
    $('obstructionIcon').src=`assets/JellyOp${Math.max(0,Math.min(71,Math.round(state.obstruction)))}.png`;
    $('obstructionIcon').alt=`Obstruction ${Math.round(state.obstruction)}`;
    $('stateLine').textContent=`Tier ${tier+1} · Fever ${Math.round(state.fever)} · ${E.critUnlocked(state)?'Critical Status unlocked':'failure when timer expires'}${E.steroidUnlocked(state)?' · Steroid available':''}${E.reviveCount(state)?` · ${E.reviveCount(state)} revive(s)`:''}`;
  }

  function renderBoard(el,arr,boardState=state,highlightSlots=null){
    const unlocked=E.unlockedSlots(boardState),tier=E.obstructionTier(boardState),highlight=highlightSlots?new Set(highlightSlots):null;
    el.innerHTML='';
    el.style.setProperty('--jelly-bg',`url("assets/JellyBG_${tier}.png")`);
    for(let i=0;i<E.BOARD_SIZE;i++){
      const slot=document.createElement('div');slot.className='board-slot';
      if(E.BLOCKED_CENTER.has(i))slot.classList.add('center-hole');if(highlight&&highlight.has(i))slot.classList.add('new-slot');
      const img=document.createElement('img');img.className='slot-art';img.alt='';img.draggable=false;
      img.src=`assets/JellySq${unlocked.has(i)?0:1}_${tier}.png`;
      slot.appendChild(img);el.appendChild(slot);
    }
    const obs=document.createElement('img');obs.className='obstruction-center';obs.alt=`Obstruction ${Math.round(boardState.obstruction)}`;obs.draggable=false;
    obs.src=`assets/JellyOp${Math.max(0,Math.min(71,Math.round(boardState.obstruction)))}.png`;el.appendChild(obs);
    for(const p of arr){
      const type=p.type,dims=E.UNIT_IMG_DIMS[type]||[36,36],off=E.UNIT_VISUAL_OFFSET[type]||0;
      const row=Math.floor(p.anchor/E.COLS),col=p.anchor%E.COLS;
      const img=document.createElement('img');img.className='unit-sprite';img.alt=E.UNIT_NAMES[type];img.draggable=false;img.src=`assets/JellyUnit${type}.png`;
      img.style.left=`${((col+off)/E.COLS)*100}%`;img.style.top=`${((row+off)/E.ROWS)*100}%`;
      img.style.width=`${((dims[0]/36)/E.COLS)*100}%`;img.style.height=`${((dims[1]/36)/E.ROWS)*100}%`;
      img.title=`${E.UNIT_NAMES[type]} · anchor ${p.anchor}`;el.appendChild(img);
    }
  }

  function resultMetrics(stats){
    const cr=stats?.clearRate??0, med=stats?.medianClearTime;
    return [
      ['Clear chance',pct(cr,0),`${stats?.runs||0} simulated runs`],
      ['Median clear',E.formatTime(med),med!=null&&med>E.bossTime(state.obstruction)?'after timer / Critical':'inside normal timer'],
      ['Before timer',pct(stats?.normalClearRate??0,0),'clears without Critical'],
      ['Critical clears',pct(stats?.criticalClearRate??0,0),'clears after timer'],
      ['HP at timer',stats?.medianHpAtTimer==null?'—':pct(stats.medianHpAtTimer,1),'median remaining'],
      ['Amoeba stacks',Math.round(stats?.medianAmoebaStacks??0).toLocaleString(),'median by operation end']
    ];
  }
  function renderSummary(el,stats){
    el.innerHTML=resultMetrics(stats).map(([k,v,s])=>`<div class="metric"><div class="m-k">${esc(k)}</div><div class="m-v">${esc(v)}</div><div class="m-sub">${esc(s)}</div></div>`).join('');
  }
  function renderTimeline(el,stats){
    const timer=E.bossTime(state.obstruction),med=stats?.medianClearTime,p90=stats?.p90ClearTime,p10=stats?.p10ClearTime;
    const horizon=Math.max(timer+8,(p90||med||timer)+4,timer*1.22);
    const x=v=>Math.max(0,Math.min(100,(v/horizon)*100));
    const marker=(cls,v,label)=>v==null?'':`<div class="tl-marker ${cls}" style="left:${x(v)}%"><i></i><span>${esc(label)}</span></div>`;
    el.innerHTML=`<div class="tl-title"><span>Operation timing</span><span>${pct(stats?.clearRate??0,0)} clear · ${pct(stats?.criticalEntryRate??0,0)} enter Critical</span></div>
      <div class="tl-track">
        <div class="tl-normal" style="width:${x(timer)}%"></div>
        <div class="tl-critical" style="left:${x(timer)}%;width:${100-x(timer)}%"></div>
        ${marker('timer',timer,`Timer ${timer}s`)}
        ${marker('p10',p10,p10==null?'':`fast ${p10.toFixed(1)}s`)}
        ${marker('median',med,med==null?'':`median ${med.toFixed(1)}s`)}
        ${marker('p90',p90,p90==null?'':`slow ${p90.toFixed(1)}s`)}
      </div>
      <div class="tl-axis"><span>0s</span><span>normal operation</span><span>Critical Condition</span><span>${horizon.toFixed(0)}s</span></div>`;
  }
  function verdict(stats){
    if(!stats)return '';
    if(stats.clearRate>=.999&&stats.medianClearTime!=null)return `<span class="good">${E.formatTime(stats.medianClearTime)}</span><br>${pct(stats.clearRate,0)} clear`;
    if(stats.clearRate>0)return `<span class="good">${pct(stats.clearRate,0)} clear</span><br>${E.formatTime(stats.medianClearTime)}`;
    return `<span class="bad">No simulated clear</span>`;
  }

  function statRank(st){
    if(!st)return-1e99;const cr=st.clearRate||0;if(cr>0)return cr*1e12-1e7*(st.medianClearTime??1e6)-1e5*(st.p90ClearTime??1e6);return-1e10*(st.medianHpAtTimer??1)+(st.avgPeakDps||0);
  }
  function moveSavings(base,st){return base?.medianClearTime!=null&&st?.medianClearTime!=null?base.medianClearTime-st.medianClearTime:null;}
  function renderNextMove(move,baseStats){
    lastNextMove=move;const box=$('nextMove'),wrap=$('nextMoveBoardWrap');
    if(!move){box.innerHTML='<p class="subtitle">No affordable timed-combat move could be scored from this state.</p>';wrap.classList.add('hidden');return;}
    const save=moveSavings(baseStats,move.stats),cost=move.cost||0,left=Math.max(0,state.bloodcells-cost);
    const icon=move.upgradeId!=null?`<img class="move-icon" src="assets/JellyUpg${move.upgradeId}.png" alt="">`:'';
    const action=move.kind==='plot'?`${move.upgradeName?`Buy ${esc(move.upgradeName)}, then `:''}unlock <strong>${esc(move.plot.label)}</strong>`:`Buy <strong>${esc(move.name)}</strong> · Lv ${move.level} → ${move.level+1}`;
    box.innerHTML=`<div class="move-hero">${icon}<div class="move-copy"><div class="move-kicker">FASTEST NEXT CLEAR MOVE</div><div class="move-title">${action}</div><div class="move-detail">${cost>0?`${E.formatNumber(cost)} Bloodcells · ${E.formatNumber(left)} left`:'Uses a plot purchase you already have'}${save!=null?` · <span class="good">${save>0?'−':''}${Math.abs(save).toFixed(2)}s median</span>`:''}</div><div class="move-result">Projected ${E.formatTime(move.stats?.medianClearTime)} median · ${pct(move.stats?.clearRate??0,0)} clear · ${pct(move.stats?.normalClearRate??0,0)} before timer</div></div></div>`;
    if(move.arrangement){
      wrap.classList.remove('hidden');$('nextBoardLabel').textContent=move.kind==='plot'?`Projected layout after ${move.plot.label}`:'Projected layout after upgrade';$('nextBoardVerdict').innerHTML=verdict(move.stats);
      renderBoard($('nextMoveBoard'),move.arrangement,move.projectedState||state,move.plot?.slots||null);renderTimeline($('nextMoveTimeline'),move.stats);
    }else wrap.classList.add('hidden');
  }
  function planNextMove(res,q){
    const reviveDelay=currentReviveDelay(),moves=[],upgs=E.upgradeCandidates(state,res.arrangement,{damageScale:res.damageScale,reviveDelaySeconds:reviveDelay});
    for(const u of upgs){if(!u.affordable||!u.timed||u.category!=='combat')continue;moves.push({kind:'upgrade',upgradeId:u.id,name:u.name,level:u.level,cost:u.cost,stats:u.timed,arrangement:res.arrangement});}
    const plotCredits=E.slotPurchasesLeft(state);let plotState=null,plotCost=0,plotUpg=null;
    if(plotCredits>0){plotState=E.cloneState(state);}
    else{
      plotUpg=upgs.find(u=>u.affordable&&u.id===8);
      if(plotUpg){plotState=E.cloneState(state);plotState.upgrades[8]=Number(plotState.upgrades[8]||0)+1;plotState.bloodcells=Math.max(0,plotState.bloodcells-plotUpg.cost);plotCost=plotUpg.cost;}
    }
    if(plotState){
      $('solverStatus').textContent='Main layout done. Planning the best permanent plot unlock…';
      const plot=E.recommendNextPlot(plotState,{timeMs:q===null?4200:Math.max(2800,Math.min(6500,q.timeMs*1.15)),runs:Math.max(12,q?.runs||18),damageScale:res.damageScale,useSteroid:true,reviveDelaySeconds:reviveDelay});
      if(plot){const projected=E.cloneState(plotState);projected.plots.push(plot.plotIndex);moves.push({kind:'plot',upgradeId:plotUpg?.id??null,upgradeName:plotUpg?.name??null,level:plotUpg?.level??null,cost:plotCost,stats:plot.stats,arrangement:plot.arrangement,projectedState:projected,plot});}
    }
    // Cell-type / virus-capacity unlocks can radically change the board, so re-search them instead of scoring the old layout.
    for(const u of upgs.filter(x=>x.affordable&&x.category==='board'&&x.id!==8&&([0,1,2,3,4,5,6,7,15].includes(x.id)))){
      const st=E.cloneState(state);st.upgrades[u.id]=Number(st.upgrades[u.id]||0)+1;st.bloodcells=Math.max(0,st.bloodcells-u.cost);
      const rr=E.optimizeTimed(st,{timeMs:Math.max(900,Math.min(2200,(q?.timeMs||4200)*.35)),runs:Math.max(10,Math.min(18,q?.runs||18)),mixLimit:150,shortlist:30,damageScale:res.damageScale,useSteroid:true,reviveDelaySeconds:reviveDelay});
      moves.push({kind:'board-upgrade',upgradeId:u.id,name:u.name,level:u.level,cost:u.cost,stats:rr.stats,arrangement:rr.arrangement,projectedState:st});
    }
    moves.sort((a,b)=>statRank(b.stats)-statRank(a.stats));return moves[0]||null;
  }

  function renderCellMix(bestArr){
    const cur=E.rawCounts(currentArrangement),best=E.rawCounts(bestArr||currentArrangement),n=E.unitsOwned(state);
    $('cellMix').innerHTML=Array.from({length:n},(_,i)=>`<div class="cell-chip"><img src="assets/JellyUnit${i}.png" alt="${esc(E.UNIT_NAMES[i])}"><div><div class="name">${esc(E.UNIT_NAMES[i])}</div><div class="count">${best[i]}</div><div class="current-vs">current ${cur[i]} · level ${Math.round(state.cellLevels[i]||0)}</div></div></div>`).join('');
  }

  function impactText(u){
    if(u.boardChanging)return '<span class="neutral">Re-optimize board</span>';
    if(!u.timed&&u.category==='economy')return '<span class="neutral">Economy / Bloodcells</span>';
    if(!u.timed&&u.category==='progression')return '<span class="neutral">EXP / progression</span>';
    if(!u.timed)return '<span class="neutral">Not simulated</span>';
    if(u.clearDelta>0.0005)return `<span class="good">+${(u.clearDelta*100).toFixed(0)}% clear chance</span>`;
    if(u.timeSaved!=null&&u.timeSaved>.02)return `<span class="good">−${u.timeSaved.toFixed(2)}s median</span>`;
    return '<span class="neutral">tiny/no timed gain here</span>';
  }
  function renderUpgrades(arr,stats,damageScale){
    let list=[];
    try{list=E.upgradeCandidates(state,arr,{baseStats:stats,damageScale,reviveDelaySeconds:currentReviveDelay()}).slice(0,12);}catch(e){console.warn('Upgrade simulation failed',e);}
    $('upgrades').innerHTML=list.map(u=>`<article class="upgrade ${u.affordable?'':'unaffordable'}">
      <div class="upgrade-icon-wrap"><img class="upgrade-icon" src="assets/JellyUpg${u.id}.png" alt=""></div>
      <div class="upgrade-main">
        <div class="upgrade-name">${esc(u.name)}${u.boardChanging?'<span class="tag">BOARD</span>':''}</div>
        <div class="upgrade-meta">Lv ${u.level} → ${u.level+1}${u.affordable?' · affordable':' · not enough Bloodcells'}</div>
        <div class="upgrade-desc">${esc(u.desc)}</div>
      </div>
      <div class="upgrade-impact">${impactText(u)}<div class="cost">${E.formatNumber(u.cost)}</div></div>
    </article>`).join('')||'<p class="subtitle">No reachable upgrade candidates in the decoded tree.</p>';
  }

  function renderInitial(){
    currentArrangement=E.arrangementFromBoard(state);
    calibration=chooseCalibration();
    const q=quality();
    currentStats=E.simulateMany(state,currentArrangement,{runs:Math.max(18,q.runs),damageScale:calibration.scale,seed:0xCAFE,useSteroid:true,reviveDelaySeconds:currentReviveDelay()});
    lastResult=null;lastNextMove=null;$('nextMove').innerHTML='<p class="subtitle">Run Optimize timed clear to calculate the next purchase.</p>';$('nextMoveBoardWrap').classList.add('hidden');
    renderStateStats();renderBoard($('currentBoard'),currentArrangement);renderBoard($('bestBoard'),currentArrangement);
    renderSummary($('currentSummary'),currentStats);renderSummary($('bestSummary'),currentStats);renderTimeline($('currentTimeline'),currentStats);renderTimeline($('bestTimeline'),currentStats);
    $('currentVerdict').innerHTML=verdict(currentStats);$('bestVerdict').innerHTML=verdict(currentStats);
    renderCellMix(currentArrangement);renderUpgrades(currentArrangement,currentStats,calibration.scale);
    $('solverStatus').textContent='Loaded. Current layout has been timed. Hit Optimize timed clear to search legal arrangements.';
    $('calibrationNote').textContent=calibrationText(calibration);
  }

  function loadText(text){
    clearFail();
    try{
      state=E.parseInput(text);$('workspace').classList.remove('hidden');persistInput();renderInitial();
      $('workspace').scrollIntoView({behavior:'smooth',block:'start'});
    }catch(e){fail(e?.message||String(e));}
  }

  $('parseBtn').addEventListener('click',()=>loadText($('jsonInput').value));
  $('clearBtn').addEventListener('click',()=>{state=null;lastResult=null;currentArrangement=null;$('jsonInput').value='';$('workspace').classList.add('hidden');clearFail();try{sessionStorage.removeItem(SESSION_KEY);}catch(_){}});
  $('rememberTab').addEventListener('change',persistInput);
  $('jsonInput').addEventListener('input',()=>{if($('rememberTab').checked)persistInput();});
  $('fileInput').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{const text=await f.text();$('jsonInput').value=text;loadText(text);}catch(err){fail(err?.message||String(err));}});
  $('searchQuality').addEventListener('change',()=>{if(state){$('solverStatus').textContent='Search quality changed. Re-run Optimize for a new timed search.';}});
  $('observedTime').addEventListener('change',()=>{try{sessionStorage.setItem(OBS_KEY,$('observedTime').value||'');}catch(_){}if(state){$('solverStatus').textContent='Calibration changed. Re-run Optimize timed clear to apply it.';}});
  if($('reviveDelay'))$('reviveDelay').addEventListener('change',()=>{try{sessionStorage.setItem(REVIVE_KEY,$('reviveDelay').value||'0');}catch(_){}if(state){$('solverStatus').textContent='Revive reaction time changed. Re-run Optimize timed clear.';}});

  $('optimizeBtn').addEventListener('click',()=>{
    if(!state)return;
    const btn=$('optimizeBtn'),q=quality();btn.disabled=true;calibration=chooseCalibration();$('calibrationNote').textContent=calibrationText(calibration);
    $('solverStatus').textContent=`Searching legal tilings and simulating timed operations (${q.runs} RNG runs per finalist)…`;
    setTimeout(()=>{
      try{
        const reviveDelay=currentReviveDelay();
        const res=E.optimizeTimed(state,{...q,damageScale:calibration?.scale,useSteroid:true,reviveDelaySeconds:reviveDelay});lastResult=res;
        renderBoard($('bestBoard'),res.arrangement);renderSummary($('bestSummary'),res.stats);renderTimeline($('bestTimeline'),res.stats);$('bestVerdict').innerHTML=verdict(res.stats);
        renderCellMix(res.arrangement);renderUpgrades(res.arrangement,res.stats,res.damageScale);
        const saved=res.currentStats?.medianClearTime!=null&&res.stats?.medianClearTime!=null?res.currentStats.medianClearTime-res.stats.medianClearTime:null;
        const delta=saved!=null&&saved>0?` Estimated median improvement: ${saved.toFixed(2)}s.`:'';
        const steroid=res.steroidStart==null?'':` Steroid: press at ${res.steroidStart.toFixed(1)}s.`;
        $('solverStatus').textContent=`Main layout done in ${(res.timeMs/1000).toFixed(2)}s. ${res.tilings} legal tilings found from ${res.mixesTested} mix attempts; ${res.simulated} finalists timed.${delta}${steroid} Planning best next move…`;
        setTimeout(()=>{
          try{
            const move=planNextMove(res,q);renderNextMove(move,res.stats);
            $('solverStatus').textContent=`Done. Main layout: ${E.formatTime(res.stats?.medianClearTime)} median, ${pct(res.stats?.clearRate??0,0)} clear.${delta}${steroid}${move?` Next move: ${move.kind==='plot'?(move.upgradeName?move.upgradeName+' + ':'')+move.plot.label:move.name}.`:''}`;
          }catch(e){console.error('Next-move planner failed',e);fail(e?.message||String(e));$('solverStatus').textContent='Main layout finished, but next-move planning hit an error.';}
          btn.disabled=false;
        },30);
        return;
      }catch(e){fail(e?.message||String(e));$('solverStatus').textContent='Optimizer stopped with an error.';console.error(e);}
      btn.disabled=false;
    },30);
  });

  // Local dev-server hot reload. It is localhost-only and carries no game/account data.
  try{
    const ev=new EventSource('/__events');
    ev.addEventListener('reload',()=>{persistInput();location.reload();});
    ev.addEventListener('open',()=>{$('liveBadge').textContent='LOCAL LIVE';$('liveBadge').classList.remove('offline');});
    ev.onerror=()=>{$('liveBadge').textContent='STATIC MODE';$('liveBadge').classList.add('offline');};
  }catch(_){$('liveBadge').textContent='STATIC MODE';}

  try{
    const observed=sessionStorage.getItem(OBS_KEY);if(observed)$('observedTime').value=observed;
    const revive=sessionStorage.getItem(REVIVE_KEY);if(revive&&$('reviveDelay'))$('reviveDelay').value=revive;
  }catch(_){}
  try{fetch('/__status',{cache:'no-store'}).then(r=>r.json()).then(x=>{if(x.autoPull){$('liveBadge').textContent='GIT LIVE';$('liveBadge').title='This localhost server checks the connected Git repo for updates and hot-reloads changes.';}}).catch(()=>{});}catch(_){}

  try{
    const saved=sessionStorage.getItem(SESSION_KEY);
    if(saved){$('jsonInput').value=saved;setTimeout(()=>loadText(saved),0);}
  }catch(_){/* no-op */}
})();
