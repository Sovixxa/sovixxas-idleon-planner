import {optimizeArrayWithSwaps,evaluateBoard,stripExcogiaBoost,getAssembledExcogiaSlots,getAllBoostedCogs} from './vendor/idleon-toolbox/parsers/world-3/constructionOptimizer';
const number=(v:any)=>Number.isFinite(Number(v))?Math.max(0,Number(v)):0;
function makeBoard(slots:any[]){
 const board=slots.slice(0,96).map(s=>({cog:{name:s.item,originalIndex:s.index,stats:s.empty?{}:Object.fromEntries(Object.entries(s.stats).filter(([k])=>'abcdefghijk'.includes(k)&&k.length===1).map(([k,v])=>[k,k==='h'?v:{value:number(v)}]))},currentAmount:s.locked===false&&(s.empty||s.statsKnown)?1:0,requiredAmount:1,flagPlaced:s.flag}));
 const assembled=getAssembledExcogiaSlots(board);
 board.forEach((slot:any,index:number)=>{if(/^CogZA0[0-3]$/.test(slot.cog.name)){
   slot.cog=stripExcogiaBoost(slot.cog);
   if(assembled.has(index))Object.assign(slot.cog.stats,{h:'everything',e:{value:1.25},f:{value:20}});
 }});
 return board;
}
function prepare(model:any){
 const board=makeBoard(model.board),baseline=evaluateBoard(board),boosts=getAllBoostedCogs(board).boosted;
 const expMultiplier=1+baseline.totalExpRate/100,baseExp=new Map(),warnings=[];
 for(let i=0;i<96;i++)if(model.board[i].isPlayer){
   const saved=number(model.board[i].stats.b),factor=expMultiplier*(1+(boosts[i]?.f?.value||0)/100);
   // The client writes FINAL player EXP back into CogMap.b (WorkbenchStuff2).
   // Undo both board factors; tiny-cog and character bonuses are already baked in.
   baseExp.set(model.board[i].index,(saved>0&&saved<1e6?saved+0.5:saved)/factor);
 }
 if(model.board.some((s:any)=>!s.empty&&!s.statsKnown))warnings.push('Some occupied tiles have no saved stats; totals are incomplete.');
 if(model.board.some((s:any)=>s.isPlayer&&s.stats.b==null))warnings.push('Some players have no saved EXP rate; player EXP totals are incomplete.');
 if(model.board.some((s:any)=>s.isPlayer&&number(s.stats.b)>0&&number(s.stats.b)<1e6))warnings.push('The game rounds saved player EXP below 1 million. Suggested EXP is an estimate because the discarded fraction cannot be recovered.');
 if(!model.gemFlagKnown)warnings.push('Gem-shop flag bonus is missing; flag rates exclude that multiplier.');
 const shapes=new Set(['adjacent','diagonal','left','right','up','down','corners','around','row','column','everything']);
 if([...model.board,...model.shelf].some((s:any)=>s.stats.h&&!shapes.has(s.stats.h)))warnings.push('An unknown boost shape is present; its positional bonus cannot be evaluated.');
 return {baseExp,warnings};
}
function evaluatePrepared(model:any,slots:any[],baseExp:Map<number,number>){
 const board=makeBoard(slots),boosts=getAllBoostedCogs(board).boosted;
 board.forEach((slot:any)=>{if(slot.cog.name.startsWith('Player_'))slot.cog.stats.b={value:baseExp.get(slot.cog.originalIndex)||0};});
 const result=evaluateBoard(board),flagMultiplier=model.flagMultiplier??1;
 const tinyExp=model.left.concat(model.right).reduce((sum:number,s:any)=>sum+number(s.stats.tinyExp),0);
 const rates=result.board.map((slot:any,index:number)=>({build:slot.cog.stats.a?.value||0,flag:(slot.cog.stats.c?.value||0)*flagMultiplier,exp:slot.cog.name.startsWith('Player_')?slot.cog.stats.b?.value||0:0,boosts:{build:boosts[index]?.e?.value||0,exp:boosts[index]?.f?.value||0,flag:boosts[index]?.g?.value||0,flagSpeed:boosts[index]?.j?.value||0},stats:board[index].cog.stats,sources:slot.affectedBy||[],targets:slot.affects||[]}));
 const flags=model.slots.filter((s:any)=>s.flag&&(s.index<96||s.index>=228)).map((s:any)=>({index:s.index,rate:result.totalFlaggyRate*flagMultiplier*(1+(s.index<96?rates[s.index].boosts.flagSpeed:0)/100)}));
 const sets=[];
 for(let anchor=0;anchor<84;anchor++)if(anchor%12<11&&[0,1,12,13].every((offset,piece)=>slots[anchor+offset].item==='CogZA0'+piece))sets.push([anchor,anchor+1,anchor+12,anchor+13]);
 const pieces=[0,1,2,3].map(piece=>slots.filter((s:any)=>s.item==='CogZA0'+piece).length);
 return {board,totals:{build:result.totalBuildRate,flag:result.totalFlaggyRate*flagMultiplier,exp:result.totalPlayerExpRate,bonus:result.totalExpRate*(1+tinyExp/100),rawBonus:result.totalExpRate},rates,flags,excogia:{sets,pieces,completeSetsOwned:Math.min(...pieces)}};
}
export function evaluate(model:any,slots=model.slots){const prepared=prepare(model);return {...evaluatePrepared(model,slots,prepared.baseExp),warnings:prepared.warnings};}
export function optimize(model:any,objective='exp',time=1200,onProgress?:any){
 const {baseExp,warnings}=prepare(model),before=evaluatePrepared(model,model.slots,baseExp);
 // Small cogs are only legal on the side rails, never on the main board.
 const spareCogs=model.shelf.filter((s:any)=>s.known&&!s.empty&&!s.isPlayer&&s.statsKnown&&!s.item.startsWith('CogSm')).map((s:any)=>makeBoard([s])[0].cog);
 const expKey=before.totals.exp>0?'totalPlayerExpRate':'totalExpRate';
 const key=objective==='build'?'totalBuildRate':objective==='flag'?'totalFlaggyRate':expKey;
 const result=optimizeArrayWithSwaps(before.board,{stat:key,time,spareCogs,onProgress});
 let layout=model.slots.slice();
 let moves=result.moves.map((m:any)=>{const incoming=layout[m.fromIndex],outgoing=layout[m.to];[layout[m.to],layout[m.fromIndex]]=[incoming,outgoing];return {from:m.fromIndex,to:m.to,incoming,outgoing};});
 let after=evaluatePrepared(model,layout,baseExp);
 const totalKey=objective==='exp'?(expKey==='totalPlayerExpRate'?'exp':'bonus'):objective;
 const tolerance=Math.max(1,Math.abs(before.totals[totalKey]))*1e-12;
 const gain=after.totals[totalKey]-before.totals[totalKey];
 if(gain < -tolerance || (gain<=tolerance&&after.excogia.sets.length<=before.excogia.sets.length)){layout=model.slots.slice();moves=[];after=before;}
 return {board:layout.slice(0,96),shelf:layout.slice(108,228),moves,before:before.totals[totalKey],after:after.totals[totalKey],gain:after.totals[totalKey]-before.totals[totalKey],objective,expKey,totalsBefore:before.totals,totalsAfter:after.totals,ratesBefore:before.rates,ratesAfter:after.rates,flagsBefore:before.flags,flagsAfter:after.flags,excogiaBefore:before.excogia,excogiaAfter:after.excogia,warnings};
}
