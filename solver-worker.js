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

  function trainPlaybook(options={}){
    const generations=Math.max(1,Math.min(60,Math.round(Number(options.generations)||3))),untilReliable=generations>=60;
    const remembered=(Array.isArray(options.memory)?options.memory:[])
      .map(x=>x?.arrangement).filter(arr=>Array.isArray(arr)&&E.isLegalLayout(state,arr));
    let best=null,incumbent=remembered[0]||options.incumbentArr||null;
    const perGeneration=Math.max(900,Math.min(4200,Math.round(Number(options.timeMs)||2200)));
    let solved=false,completed=0;
    for(let generation=0;generation<generations;generation++){
      postMessage({type:'progress',progress:{stage:'self-play generation '+(generation+1)+'/'+generations,remembered:remembered.length}});
      const trialState=E.cloneState(state);if(best?.fever!=null)trialState.fever=best.fever;
      const value=E.optimizeOperation(trialState,{...options,timeMs:perGeneration,searchFever:generation===0?options.searchFever:false,incumbentArr:incumbent,searchSeed:(Number(options.searchSeed)||0x71A1)+generation*7919,onProgress:p=>postMessage({type:'progress',progress:{...p,stage:'training '+(generation+1)+'/'+generations+' · '+p.stage}})});
      if(!best||E.timedObjective(value.stats,options.objectiveMode)>E.timedObjective(best.stats,options.objectiveMode))best=value;
      incumbent=best.arrangement;
      completed=generation+1;
      if(untilReliable&&best.stats.clearRate>=.99){solved=true;break;}
    }
    return {best,generations:completed,cap:generations,solved,remembered:remembered.length};
  }


self.onmessage=event=>{
  try{
    const {job,options,result}=event.data;state=event.data.state;
    if(job==='optimize'){
      const value=E.optimizeOperation(state,{...options,onProgress:progress=>postMessage({type:'progress',progress})});
      const chosen=E.cloneState(state);chosen.fever=value.fever;
      value.replay=E.simulateOne(chosen,value.arrangement,{damageScale:value.damageScale,seed:0xD00D,useSteroid:true,steroidStartSeconds:value.steroidStart??0,reviveDelaySeconds:value.reviveDelaySeconds,trace:true});
      postMessage({type:'result',value});
    }else if(job==='plan'){
      state=E.cloneState(state);state.fever=result.fever??state.fever;
      const value=planNextMove(result,options);postMessage({type:'result',value});
    }else if(job==='train'){
      const value=trainPlaybook(options);postMessage({type:'result',value});
    }
  }catch(error){postMessage({type:'error',message:error.message||String(error)});}
};
