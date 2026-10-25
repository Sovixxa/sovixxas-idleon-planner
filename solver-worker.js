'use strict';
importScripts('engine.js');
const E=self.JellyEngine;
let state;
  function planNextMove(res,q){
    const reviveDelay=res.reviveDelaySeconds,moves=[],upgs=E.upgradeCandidates(state,res.arrangement,{damageScale:res.damageScale,reviveDelaySeconds:reviveDelay});
    for(const u of upgs){if(!u.affordable||!u.timed||u.category!=='combat')continue;const projected=E.cloneState(state);projected.upgrades[u.id]++;moves.push({projectedState:projected,kind:'upgrade',upgradeId:u.id,name:u.name,level:u.level,cost:u.cost,stats:u.timed,arrangement:res.arrangement});}
    const plotCredits=E.slotPurchasesLeft(state);let plotState=null,plotCost=0,plotUpg=null;
    if(plotCredits>0){plotState=E.cloneState(state);}
    else{
      plotUpg=upgs.find(u=>u.affordable&&u.id===8);
      if(plotUpg){plotState=E.cloneState(state);plotState.upgrades[8]=Number(plotState.upgrades[8]||0)+1;plotState.bloodcells=Math.max(0,plotState.bloodcells-plotUpg.cost);plotCost=plotUpg.cost;}
    }
    if(plotState){
      postMessage({type:'progress',progress:{stage:'planning plots'}});
      const plot=E.recommendNextPlot(plotState,{timeMs:q===null?4200:Math.max(2800,Math.min(6500,q.timeMs*1.15)),runs:Math.max(12,q?.runs||18),damageScale:res.damageScale,useSteroid:true,reviveDelaySeconds:reviveDelay,objectiveMode:q.objectiveMode});
      if(plot){const projected=E.cloneState(plotState);projected.plots.push(plot.plotIndex);moves.push({kind:'plot',upgradeId:plotUpg?.id??null,upgradeName:plotUpg?.name??null,level:plotUpg?.level??null,cost:plotCost,stats:plot.stats,arrangement:plot.arrangement,projectedState:projected,plot});}
    }
    // Cell-type / virus-capacity unlocks can radically change the board, so re-search them instead of scoring the old layout.
    for(const u of upgs.filter(x=>x.affordable&&x.category==='board'&&x.id!==8&&([0,1,2,3,4,5,6,7,15].includes(x.id)))){
      const st=E.cloneState(state);st.upgrades[u.id]=Number(st.upgrades[u.id]||0)+1;st.bloodcells=Math.max(0,st.bloodcells-u.cost);
      const rr=E.optimizeTimed(st,{timeMs:Math.max(900,Math.min(2200,(q?.timeMs||4200)*.35)),runs:Math.max(10,Math.min(18,q?.runs||18)),mixLimit:150,shortlist:30,damageScale:res.damageScale,useSteroid:true,reviveDelaySeconds:reviveDelay,objectiveMode:q.objectiveMode});
      moves.push({kind:'board-upgrade',upgradeId:u.id,name:u.name,level:u.level,cost:u.cost,stats:rr.stats,arrangement:rr.arrangement,projectedState:st});
    }
    for(const move of moves){
      const projected=move.projectedState||state;
      const opts={damageScale:res.damageScale,reviveDelaySeconds:reviveDelay,objectiveMode:q.objectiveMode,useSteroid:true};
      const timing=E.optimizeSteroidStart(projected,move.arrangement,{...opts,runs:6,seed:0x57E2});
      move.steroidStart=E.steroidUnlocked(projected)?timing.start:null;
      move.stats=E.simulateMany(projected,move.arrangement,{...opts,runs:q.runs,seed:0xD00D,steroidStartSeconds:timing.start});
    }
    moves.sort((a,b)=>E.timedObjective(b.stats,q.objectiveMode)-E.timedObjective(a.stats,q.objectiveMode));return moves[0]||E.findUpgradeTarget(state,res.arrangement,{damageScale:res.damageScale,reviveDelaySeconds:reviveDelay,steroidStartSeconds:res.steroidStart});
  }

  // Keep the strongest pending preview and send at most one board per 150ms.
  // Status messages flush pending improvements; completion flushes the last one.
  function progressReporter(objectiveMode){
    let best=null,pending=null,last=-Infinity;
    function flush(force=false){if(pending&&(force||Date.now()-last>=150)){postMessage({type:'progress',progress:pending});pending=null;last=Date.now();}}
    return {flush,report(p){
      if(p.arrangement&&p.stats){
        const validated=p.stage.includes('validated layout'),objective=E.timedObjective(p.stats,objectiveMode),filled=p.arrangement.reduce((n,x)=>n+x.cells.length,0);
        if(best&&(best.validated&&!validated||best.validated===validated&&(objective<best.objective||objective===best.objective&&filled<=best.filled)))return;
        best={validated,objective,filled};pending=p;flush();
      }else{flush();postMessage({type:'progress',progress:p});}
    }};
  }

  function trainPlaybook(options={}){
    const generations=Math.max(1,Math.min(60,Math.round(Number(options.generations)||3))),untilReliable=generations>=60;
    const remembered=(Array.isArray(options.memory)?options.memory:[])
      .map(x=>x?.arrangement).filter(arr=>Array.isArray(arr)&&E.isLegalLayout(state,arr));
    let best=null,baseline=null,incumbent=remembered[0]||options.incumbentArr||null;
    const calibration=options.damageScale?{scale:options.damageScale}:E.autoDamageScale(state,E.arrangementFromBoard(state));
    options={...options,damageScale:calibration.scale};
    const perGeneration=Math.max(900,Math.min(4200,Math.round(Number(options.timeMs)||2200)));
    let solved=false,completed=0;const progress=progressReporter(options.objectiveMode);
    for(let generation=0;generation<generations;generation++){
      postMessage({type:'progress',progress:{stage:'self-play generation '+(generation+1)+'/'+generations,remembered:remembered.length}});
      const trialState=E.cloneState(state);if(best?.fever!=null)trialState.fever=best.fever;
      const value=E.optimizeOperation(trialState,{...options,timeMs:perGeneration,searchFever:generation===0?options.searchFever:false,incumbentArr:incumbent,incumbentFever:best?.fever??options.memory?.[0]?.fever,incumbentSteroidStart:best?.steroidStart??options.memory?.[0]?.steroidStart,searchSeed:(Number(options.searchSeed)||0x71A1)+generation*7919,onProgress:p=>progress.report({...p,stage:'training '+(generation+1)+'/'+generations+' · '+p.stage})});
      if(!baseline)baseline={current:value.current,currentStats:value.currentStats,currentSteroidStart:value.currentSteroidStart,currentFever:state.fever};
      if(best&&best.stats.runs!==value.stats.runs){
        const runs=Math.max(best.stats.runs,value.stats.runs);
        for(const result of [best,value])if(result.stats.runs!==runs){
          const st=E.cloneState(state);st.fever=result.fever;
          result.stats=E.simulateMany(st,result.arrangement,{...options,runs,seed:0xD00D,steroidStartSeconds:result.steroidStart??0});
        }
      }
      if(!best||E.timedObjective(value.stats,options.objectiveMode)>E.timedObjective(best.stats,options.objectiveMode))best=value;
      incumbent=best.arrangement;
      completed=generation+1;
      if(untilReliable&&best.stats.clearRate>=.99){solved=true;break;}
    }
    if(baseline.currentStats.runs!==best.stats.runs)baseline.currentStats=E.simulateMany(state,baseline.current,{...options,runs:best.stats.runs,seed:0xD00D,steroidStartSeconds:baseline.currentSteroidStart??0});
    best={...best,...baseline};
    if(E.timedObjective(best.currentStats,options.objectiveMode)>E.timedObjective(best.stats,options.objectiveMode))best={...best,arrangement:best.current,stats:best.currentStats,fever:state.fever,steroidStart:best.currentSteroidStart,score:E.layoutScore(state,best.current)};
    solved=untilReliable&&best.stats.clearRate>=.99;
    progress.flush(true);
    return {best,generations:completed,cap:generations,solved,remembered:remembered.length};
  }


self.onmessage=event=>{
  try{
    const {job,options,result}=event.data;state=event.data.state;
    if(job==='practice'){
      state=E.cloneState(state);state.fever=options.fever;
      postMessage({type:'result',value:E.simulateOne(state,options.arrangement,{...options,damageScale:options.damageScale??E.autoDamageScale(event.data.state,E.arrangementFromBoard(event.data.state)).scale})});
    }else if(job==='upgrades'){
      postMessage({type:'result',value:E.planUpgradePurchases(state,options.arrangement,options)});
    }else if(job==='initial'||job==='calibrate'){
      const arrangement=E.arrangementFromBoard(state);
      let calibration;
      if(Number.isFinite(options.observed)&&options.observed>0){
        try{calibration=E.calibrateToObservedClearTime(state,arrangement,options.observed,{runs:10,useSteroid:true,reviveDelaySeconds:options.reviveDelaySeconds});}catch(_){}
      }
      calibration=calibration||E.autoDamageScale(state,arrangement);
      const value=job==='calibrate'?calibration:{calibration,stats:E.simulateMany(state,arrangement,{runs:options.runs,damageScale:calibration.scale,seed:0xCAFE,useSteroid:true,reviveDelaySeconds:options.reviveDelaySeconds})};
      postMessage({type:'result',value});
    }else if(job==='optimize'){
      const progress=progressReporter(options.objectiveMode);
      const value=E.optimizeOperation(state,{...options,onProgress:p=>progress.report(p)});
      progress.flush(true);
      const chosen=E.cloneState(state);chosen.fever=value.fever;
      value.replay=E.simulateOne(chosen,value.arrangement,{damageScale:value.damageScale,seed:0xD00D,useSteroid:options.useSteroid!==false,steroidStartSeconds:value.steroidStart??0,reviveDelaySeconds:value.reviveDelaySeconds,trace:true});
      postMessage({type:'result',value});
    }else if(job==='plan'){
      state=E.cloneState(state);state.fever=result.fever??state.fever;
      const value=planNextMove(result,options);postMessage({type:'result',value});
    }else if(job==='train'){
      const value=trainPlaybook(options),chosen=E.cloneState(state);chosen.fever=value.best.fever;
      value.best.replay=E.simulateOne(chosen,value.best.arrangement,{damageScale:value.best.damageScale,seed:0xD00D,useSteroid:options.useSteroid!==false,steroidStartSeconds:value.best.steroidStart??0,reviveDelaySeconds:value.best.reviveDelaySeconds,trace:true});
      postMessage({type:'result',value});
    }
  }catch(error){postMessage({type:'error',message:error.message||String(error)});}
};
