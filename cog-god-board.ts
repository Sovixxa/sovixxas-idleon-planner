// Roll formulas: local client _customEvent_WorkbenchStuff2, lines 64557–64569.
// Highest account Construction level is _GenINFO[21] (64754–64757).
export function perfectRollExp(level:number,tier:number){
 const power=Math.pow(3,Math.min(3.4,tier))+.25*Math.pow(level/3+.7,1.4+.05*tier);
 // randomFloatBetween(.4,3) excludes 3; each of the maximum four rolls goes to d.
 const roll=Math.ceil(3*power)-1;
 return (3+Math.floor(Math.min(3,tier)/2))*Math.max(Math.floor(Math.pow(roll,.4)+10*Math.log(Math.max(roll,1))/2.30259-5),2);
}
export function idealBoard(model:any,options:any={},onProgress?:any){
 const level=Number(options.level);
 if(!Number.isFinite(level)||level<1||level>1e7)throw new Error('Enter a roll level between 1 and 10,000,000.');
 const {baseExp,warnings}=prepare(model),before=evaluatePrepared(model,model.slots,baseExp);
 const characters=model.board.filter((s:any)=>s.isPlayer);
 if(!characters.length||characters.some((s:any)=>!baseExp.get(s.index)))throw new Error('Load a save with usable EXP rates for the characters on your board.');
 const candidates:any[]=[];
 const add=(tier:number,shape:string,boost:number,item:string)=>candidates.push({tier,shape,boost,item,d:perfectRollExp(level,tier)});
 add(3,'',0,'Cog3A4');
 for(const shape of ['adjacent','diagonal'])add(2,shape,40,'Cog2'+(shape==='adjacent'?'ad':'di'));
 for(const [shape,suffix] of [['up','up'],['down','do'],['left','le'],['right','ri'],['row','ro'],['column','co'],['corners','cr']])add(3,shape,65,'Cog3'+suffix);
 if(options.jewels!==false){add(4,'',0,'CogCry5');for(const shape of ['row','column'])add(4,shape,155,'CogCry5');}
 // Use the same edge-clipped target geometry as the current-board evaluator.
 const masks=candidates.map(c=>Array.from({length:96},(_,i)=>new Set(getAffectedIndexes({stats:{h:c.shape}},i%12,7-Math.floor(i/12)).filter(([x,y]:number[])=>x>=0&&x<12&&y>=0&&y<8).map(([x,y]:number[])=>(7-y)*12+x))));
 const open=model.board.filter((s:any)=>(options.fullBoard||s.locked===false)&&(s.empty||s.statsKnown)&&!/^Cog(?:ZA0[0-3]|Y)$/.test(s.item)).map((s:any)=>s.index);
 const movable=characters.filter((s:any)=>open.includes(s.index));
 const fixed=model.slots.map((s:any)=>open.includes(s.index)?{...s,item:'Blank',empty:true,stats:{},locked:false}:s);
 const fixedResult=evaluatePrepared(model,fixed,baseExp);
 const fixedD=fixedResult.totals.rawBonus;
 const base=characters.map((s:any)=>baseExp.get(s.index)||0);
 const fixedPositions=characters.map((s:any)=>s.index);
 const solve=(positions:number[])=>{
  const occupied=new Set(positions),tiles=open.filter((i:number)=>!occupied.has(i));
  const weights=tiles.map((i:number)=>candidates.map((c,j)=>positions.reduce((sum,p,k)=>sum+(masks[j][i].has(p)?base[k]*c.boost/100:0),0)));
  let weighted=positions.reduce((sum,p,k)=>sum+base[k]*(1+fixedResult.rates[p].boosts.exp/100),0);
  let d=fixedD;
  const choices=tiles.map((i:number,t:number)=>{
   let best=0;for(let j=1;j<candidates.length;j++)if(candidates[j].d>candidates[best].d||(candidates[j].d===candidates[best].d&&weights[t][j]>weights[t][best]))best=j;
   d+=candidates[best].d;weighted+=weights[t][best];return best;
  });
  for(let pass=0;pass<8;pass++){
   let changed=false;
   for(let t=0;t<tiles.length;t++){
    const old=choices[t],otherD=d-candidates[old].d,otherW=weighted-weights[t][old];
    let best=old,score=(1+d/100)*weighted;
    for(let j=0;j<candidates.length;j++){
     const next=(1+(otherD+candidates[j].d)/100)*(otherW+weights[t][j]);
     if(next>score+Math.abs(score)*1e-12){best=j;score=next;}
    }
    if(best!==old){choices[t]=best;d=otherD+candidates[best].d;weighted=otherW+weights[t][best];changed=true;}
   }
   if(!changed)break;
  }
  return {positions:positions.slice(),tiles,choices,score:(1+d/100)*weighted};
 };
 let best=solve(fixedPositions);
 // Bounded deterministic character relocation and pair swaps; never claim global optimality.
 for(let pass=0;pass<3;pass++){
  let changed=false;
  for(const character of movable){
   const k=characters.indexOf(character);
   for(const target of open){
    if(target===best.positions[k])continue;
    const positions=best.positions.slice(),other=positions.indexOf(target);
    if(other>=0&&!movable.includes(characters[other]))continue;
    if(other>=0)positions[other]=positions[k];positions[k]=target;
    const trial=solve(positions);
    if(trial.score>best.score+Math.abs(best.score)*1e-10){best=trial;changed=true;}
   }
   onProgress?.({message:`Searching ideal placements · pass ${pass+1} / 3`});
  }
  if(!changed)break;
 }
 const slots=fixed.slice();
 best.positions.forEach((p:number,k:number)=>{slots[p]={...characters[k],locked:false};});
 const shopping:any={};
 best.tiles.forEach((p:number,t:number)=>{
  const c=candidates[best.choices[t]],key=`${c.tier}:${c.shape}`;
  slots[p]={...model.slots[p],index:252+p,item:c.item,name:c.tier===4?'Perfect Jewel cog':'Perfect '+(c.tier===3?'Ultimate':'Superb')+' cog',isPlayer:false,empty:false,known:true,statsKnown:true,locked:false,stats:{d:c.d,f:c.boost,h:c.shape},ideal:true};
  if(!shopping[key])shopping[key]={...c,positions:[]};shopping[key].positions.push(p);
 });
 const after=evaluatePrepared(model,slots,baseExp);
 return {slots,board:slots.slice(0,96),before:before.totals,after:after.totals,rates:after.rates,shopping:Object.values(shopping),level,jewels:options.jewels!==false,fullBoard:!!options.fullBoard,warnings,characters:characters.map((s:any,k:number)=>({name:s.name,from:s.index,to:best.positions[k],exp:after.rates[best.positions[k]].exp})),protectedCount:96-open.length,score:best.score};
}

