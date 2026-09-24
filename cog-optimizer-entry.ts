import {optimizeArrayWithSwaps,evaluateBoard,stripExcogiaBoost,getAssembledExcogiaSlots} from './vendor/idleon-toolbox/parsers/world-3/constructionOptimizer';
export function optimize(model:any,objective='exp',time=1200,onProgress?:any){
 const cog=(s:any)=>({name:s.item,originalIndex:s.index,stats:Object.fromEntries(Object.entries(s.stats).map(([k,v])=>[k,k==='h'?v:{value:Number(v)||0}]))});
 const board=model.board.map((s:any)=>({cog:cog(s),currentAmount:s.locked===false&&(s.empty||s.statsKnown)?1:0,requiredAmount:1,flagPlaced:s.flag}));
 const assembled=getAssembledExcogiaSlots(board);
 board.forEach((s:any,i:number)=>{if(!assembled.has(i)&&s.cog.name.startsWith('CogZA0'))s.cog=stripExcogiaBoost(s.cog);});
 // Workers in production are not included in the spare pool.
 const spareCogs=model.shelf.filter((s:any)=>s.known&&!s.empty&&!s.isPlayer&&s.statsKnown).map(cog);
 const before=evaluateBoard(board);
 const expKey=before.totalPlayerExpRate>0?'totalPlayerExpRate':'totalExpRate';
 const key=objective==='build'?'totalBuildRate':objective==='flag'?'totalFlaggyRate':expKey;
 let result=optimizeArrayWithSwaps(board,{stat:key,time,spareCogs,onProgress});
 if(result[key]<=before[key]+Math.max(1,Math.abs(before[key]))*1e-12)result={...before,moves:[]};
 const layout=model.slots.slice();
 const moves=result.moves.map((m:any)=>{const incoming=layout[m.fromIndex],outgoing=layout[m.to];[layout[m.to],layout[m.fromIndex]]=[incoming,outgoing];return {from:m.fromIndex,to:m.to,incoming,outgoing};});
 return {board:layout.slice(0,96),shelf:layout.slice(108,228),moves,before:before[key],after:result[key],gain:result[key]-before[key],objective,expKey,totalsBefore:beforeTotals(before),totalsAfter:beforeTotals(result)};
}
function beforeTotals(v:any){return {build:v.totalBuildRate,flag:v.totalFlaggyRate,exp:v.totalPlayerExpRate,bonus:v.totalExpRate};}
