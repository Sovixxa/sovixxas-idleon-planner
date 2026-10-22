(function(root){'use strict';
// Geometry matches _customBlock_ResearchStuff/Grid_ShapeVertices and
// _customEvent_ResearchStuffs: one of four inset corners must be inside.
const relevant=[31,50,51,52,68,70,72,90,91,92,93,94,110,112,125];
const rad=0.01745329251994278;
function definitions(data){return data[0].map((points,id)=>({id,name:data[3][id].replaceAll('_',' '),bonus:Number(data[5][id]),size:data[1][id].split(',').map(Number),points:points.split(';').map(p=>p.split(',').map(Number))}));}
function vertices(shape,p){const [w,h]=shape.size,c=Math.cos(p.angle*rad),s=Math.sin(p.angle*rad);return shape.points.map(([x,y])=>[Math.round(w/2+p.x+(x-w/2)*c-(y-h/2)*s),Math.round(h/2+p.y+(x-w/2)*s+(y-h/2)*c)]);}
function inside(x,y,v){let yes=false;for(let i=0,j=v.length-1;i<v.length;j=i++){const [xi,yi]=v[i],[xj,yj]=v[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)yes=!yes;}return yes;}
function covers(v,id){const x=18+30*(id%20),y=27+30*Math.floor(id/20);return inside(x,y,v)||inside(x+21,y,v)||inside(x,y+21,v)||inside(x+21,y+21,v);}
function coverage(shape,p,nodes){const v=vertices(shape,p),xs=v.map(v=>v[0]),ys=v.map(v=>v[1]),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);return nodes.filter(id=>{const x=18+30*(id%20),y=27+30*Math.floor(id/20);return x<=right&&x+21>=left&&y<=bottom&&y+21>=top&&covers(v,id);});}
function legal(shape,p){return Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.angle)&&p.x>=10&&p.y>=20&&p.x+shape.size[0]<=616&&p.y+shape.size[1]<=375;}
function rates(state,raw,defs,observation=null){
 const old=state.gridSquares.map(x=>Number(x.bonuses[0])||0),base=old.map((b,i)=>b/(1+(defs[raw[1]?.[i]]?.bonus||0)/100));
 const additive=state.researchEXPmultiBreakdown.categories.flatMap(x=>x.sources).find(x=>x.name==='(1 + total additive % / 100)')?.value;
 if(!(additive>0))throw Error('Research EXP breakdown is unavailable. Refresh your save.');
 const sources=state.researchEXPmultiBreakdown.categories.flatMap(x=>x.sources),source=name=>Number(sources.find(x=>x.name===name)?.value)||0,extras=state.shapeRateExtras||{},button=source('Button Bonus')||1,sticker=source('Sticker multiplier')||1;
 const totalLevels=(raw[4]||[]).slice(0,state.occurrencesToBeFound).reduce((s,v)=>s+Math.max(0,Number(v)||0),0);
 const additiveNodes=[[31,1],[50,1],[51,1],[90,1],[110,1],[112,state.totalOccurrencesFound],[94,totalLevels]];
 const count=Array.from({length:80},()=>[0,0,0]);
 for(let i=0;i<(raw[5]||[]).length;i+=4){const obs=Number(raw[5][i+2]),type=Number(raw[5][i+3]);if(obs>=0&&obs<80&&type>=0&&type<3)count[obs][type]++;}
 const neighbors=i=>[i%8?i-1:-1,i%8<7?i+1:-1,i-8,i+8].filter(j=>j>=0&&j<80);
 const terms=state.observations.filter(o=>o.found&&o.unlocked).map(o=>({id:o.index,req:Math.max(1,o.insightExpREQ),lv:o.insightLevel,k:neighbors(o.index).reduce((s,i)=>s+count[i][2],0),exp:count[o.index][0]*o.unitExp/(1+old[93]*o.insightLevel/100),insight:count[o.index][1]*o.unitInsight/Math.max(1,o.insightExpREQ)/(1+(old[91]+old[92])/100)}));
 return owners=>{
  const b=id=>base[id]*(1+(defs[owners[id]]?.bonus||0)/100);
  let add=additive;for(const [id,weight] of additiveNodes)add+=(b(id)-old[id])*weight/100;
  add+=(extras.stickerAddSlope||0)*(b(68)-old[68])/100;
  const stickerRatio=(sticker+(extras.stickerMultiSlope||0)*(b(68)-old[68]))/sticker,buttonRatio=(1+(button-1)*(1+b(125)/100)/(1+old[125]/100))/button;
  const expRatio=stickerRatio*buttonRatio*add/additive*(1+b(70)/100)/(1+old[70]/100),kal=state.kaleiBase+(b(52)-old[52]+b(72)-old[72])/100,insightRatio=1+(b(91)+b(92))/100;
  let exp=0,insight=0,target=0;const bonus93=b(93);for(const o of terms){const k=1+o.k*kal;exp+=o.exp*(1+bonus93*o.lv/100)*k;insight+=o.insight*insightRatio*k;if(o.id===observation)target=o.insight*insightRatio*k*o.req;}return {exp:exp*expRatio,insight,target};
 };
}
function ownersFor(layout,order,defs,nodes){const owners=Array(240).fill(-1);for(const id of order)for(const cell of coverage(defs[id],layout[id],nodes))if(owners[cell]===-1)owners[cell]=id;return owners;}
function plan(state,raw,data,config={},progress=()=>{}){
 const allDefs=definitions(data),savedOwners=Array.from({length:240},(_,i)=>raw[1]?.[i]!=null&&Number.isInteger(Number(raw[1][i]))?Number(raw[1][i]):-1);
 const owned=Math.min(10,Math.max(state.shapesOwned,...savedOwners.map(x=>x+1))),defs=allDefs.slice(0,owned);
 const saved=defs.map((d,i)=>({x:Number(raw[6]?.[4*i]),y:Number(raw[6]?.[4*i+1]),angle:Number(raw[6]?.[4*i+2])||0}));
 if(saved.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))throw Error('Shape positions are missing from this save. Load a fresh full export.');
 const scoreRates=rates(state,raw,allDefs,config.observation),before=scoreRates(savedOwners),goal=config.goal==='insight'?'insight':'exp';
 const metric=Number.isInteger(config.observation)?'target':goal;
 const score=owners=>scoreRates(owners)[metric];
 const nodes=state.gridSquares.filter(x=>x.canSelect).map(x=>x.index),targets=relevant.filter(id=>state.gridSquares[id]?.level>0);
 const beforeScore=before[metric];
 if(!owned||!targets.length||!(beforeScore>0))return {before,after:before,shapes:defs,saved,layout:saved,owners:savedOwners,steps:[],order:[],nodes:state.gridSquares,canRotate:!!state.canRotateShapes,reason:!owned?'No shapes are unlocked yet.':!(beforeScore>0)?'Place lenses for this goal in-game and refresh your save before optimizing shapes.':'No purchased Research targets are available.'};
 const maskOf=(shape,p)=>coverage(shape,p,targets).reduce((m,id)=>m|(1<<targets.indexOf(id)),0);
 const park=defs.map((d,id)=>{for(let y=20;y<=375-d.size[1];y+=5)for(let x=10;x<=616-d.size[0];x+=5){const p={x,y,angle:saved[id].angle};if(!coverage(d,p,nodes).length)return p;}return null;});
 if(park.some(p=>!p))throw Error('Could not find a clear staging position for every shape. This save needs a move-by-move overlap search.');
 const candidates=defs.map((d,id)=>{
  progress(`Searching ${d.name} (${id+1}/${owned})…`);
  const byMask=new Map();
  const add=p=>{if(!legal(d,p))return;const mask=maskOf(d,p);if(!mask)return;const prior=byMask.get(mask),distance=Math.abs(p.x-saved[id].x)+Math.abs(p.y-saved[id].y)+Math.abs(p.angle-saved[id].angle)/5;if(!prior||distance<prior.distance)byMask.set(mask,{...p,mask,distance});};
  add(saved[id]);
  const angles=state.canRotateShapes?Array.from({length:24},(_,i)=>i*15):[saved[id].angle];
  // Coarse translation and rotations, then refine promising layouts below.
  for(const angle of angles)for(let y=20;y<=375-d.size[1];y+=5)for(let x=10;x<=616-d.size[0];x+=5)add({x,y,angle});
  return [...byMask.values(),{...park[id],mask:0,distance:9999}];
 });
 const strengths=defs.map(d=>d.id).sort((a,b)=>defs[b].bonus-defs[a].bonus);
 const orders=[strengths,[...strengths].reverse(),defs.map(d=>d.id)];
 // Deterministic restarts vary overlap priority, rather than silently claiming stacking.
 for(let k=1;k<owned;k++)orders.push([...strengths.slice(k),...strengths.slice(0,k)]);
 let best=null;
 function ownersFromMasks(layout,order){const owners=Array(240).fill(-1);for(const id of order){const mask=layout[id].mask;for(let j=0;j<targets.length;j++)if(mask&(1<<j)&&owners[targets[j]]===-1)owners[targets[j]]=id;}return owners;}
 function improve(order){let layout=defs.map((d,i)=>({...park[i],mask:0})),value=score(ownersFromMasks(layout,order));
  for(let pass=0;pass<4;pass++){let changed=false;for(const id of order){let choice=layout[id],top=value;const prior=layout[id];for(const p of candidates[id]){layout[id]=p;const v=score(ownersFromMasks(layout,order));if(v>top+Math.max(1e-12,Math.abs(top)*1e-10)){choice=p;top=v;}}layout[id]=choice;if(choice!==prior){changed=true;value=top;}}if(!changed)break;}
  return {layout:layout.map(p=>({...p})),order:[...order],value};
 }
 for(let i=0;i<orders.length;i++){progress(`Comparing layout ${i+1}/${orders.length}…`);const r=improve(orders[i]);if(!best||r.value>best.value)best=r;}
 // Refine each chosen placement at one-pixel offsets and legal 5-degree rotations.
 for(let pass=0;pass<3;pass++)for(const id of best.order){const seed=best.layout[id];let choice=seed,top=best.value;const angles=state.canRotateShapes?[-10,-5,0,5,10].map(v=>(seed.angle+v+360)%360):[seed.angle];for(const angle of angles)for(let dx=-4;dx<=4;dx++)for(let dy=-4;dy<=4;dy++){const p={x:seed.x+dx,y:seed.y+dy,angle};if(!legal(defs[id],p))continue;p.mask=maskOf(defs[id],p);best.layout[id]=p;const v=score(ownersFromMasks(best.layout,best.order));if(v>top+Math.max(1e-12,Math.abs(top)*1e-10)){choice=p;top=v;}}best.layout[id]=choice;best.value=top;}
 // Keep a shape at its saved position when moving it would not improve the goal.
 // This preserves unrelated account bonuses instead of leaving spare shapes parked.
 for(const id of best.order){if(!legal(defs[id],saved[id]))continue;const previous=best.layout[id],p={...saved[id],mask:maskOf(defs[id],saved[id])};best.layout[id]=p;const value=score(ownersFromMasks(best.layout,best.order));if(value>=best.value-Math.abs(best.value)*1e-12)best.value=value;else best.layout[id]=previous;}
 const layout=best.layout.map(({x,y,angle})=>({x,y,angle})),owners=ownersFor(layout,best.order,defs,nodes),after=scoreRates(owners);
 if(after[metric]<=beforeScore*(1+1e-9))return {before,after:before,shapes:defs,saved,layout:saved,owners:savedOwners,steps:[],order:[],nodes:state.gridSquares,canRotate:!!state.canRotateShapes,reason:'No better layout found. Keep your current shapes.'};
 const steps=defs.map((d,id)=>({id,phase:'park',from:saved[id],to:park[id],covers:[]}));
 for(const id of best.order)steps.push({id,phase:'place',from:park[id],to:layout[id],covers:owners.map((v,i)=>v===id?i:-1).filter(i=>i>=0)});
 return {before,after,shapes:defs,saved,layout,owners,steps,order:best.order,nodes:state.gridSquares,goal,canRotate:!!state.canRotateShapes};
}
const api={definitions,vertices,inside,covers,coverage,legal,rates,ownersFor,plan};if(typeof module==='object')module.exports=api;root.ResearchShapesModel=api;
})(typeof window==='object'?window:globalThis);
