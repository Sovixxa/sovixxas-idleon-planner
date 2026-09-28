(function(root){
 'use strict';
 const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v;}catch{return null;}},number=v=>v==null||v===''||!Number.isFinite(Number(v))?null:Number(v);
 const clean=v=>String(v??'').replaceAll('_',' ').replaceAll('膛','').replace('(Tap for more info)','').trim();
 const sum=(a,fn=(s,v)=>s+v)=>Array.isArray(a)&&a.every(v=>number(v)!==null)?a.reduce((s,v)=>fn(s,Number(v)),0):null;
 function unlock(order){return 350+40*order+5*Math.max(0,order-35)+10*Math.max(0,order-60)+10*Math.max(0,order-80)+15*Math.max(0,order-100);}
 function score(value,entry,unlocked){
  if(!unlocked)return 0;if(value===null)return null;
  const key=Number(entry[1]),type=Number(entry[2]),max=Number(entry[3]),log=Math.log(Math.max(1,value))/2.30259;
  const pct=type===0?(value<0?0:(1.7*value/(value+key))**.7):type===1?2.4*log/(2*log+key):type===2?Math.min(1,value/key):type===3?(value>5*key?0:(1.2*(6*key-value)/(7*key-value))**5):type===4?(2*Math.min(key,value)/(Math.min(key,value)+key))**.7:0;
  return Math.ceil(pct*max);
 }
 function lateValues(raw){
  const d=raw?.data||raw||{},r=parse(d.Research),s=parse(d.Spelunk),o=parse(d.OptionsListAccount??d.OptLacc),royal=parse(d.RoyalG),maps=parse(d.RoyalMaps),sushi=parse(d.Sushi);
  const add=(a,b)=>a+b,rounded=(a,b)=>Math.round(a+b);
  let unique=null;if(Array.isArray(sushi?.[5])){unique=0;for(const v of sushi[5].slice(0,64)){if(number(v)===null){unique=null;break;}if(Number(v)<0)break;unique++;}}
  return {109:Array.isArray(s?.[46])?s[46].length:null,110:number(r?.[7]?.[4]),111:Array.isArray(r?.[11])?r[11].length:null,112:sum(r?.[9],rounded),113:number(o?.[498]),114:sum(r?.[0],rounded),115:sum(r?.[12],(a,b)=>a+Math.round(Math.max(0,b))),116:unique,117:number(o?.[594]),118:sum(royal?.[0],(a,b)=>a+Math.max(0,b)),119:Array.isArray(maps)?maps.filter(v=>Array.isArray(parse(v))&&parse(v).length>=3).length:null,120:sum(royal?.[5],add),121:number(r?.[7]?.[9])};
 }
 function build(tome,raw){
  const catalog=root.TOME_CURRENT_DATA,late=lateValues(raw),count=Math.max(1,tome.lines[0]?.currentValues?.length||0),level=number(tome.totalAccountLevel);
  const candidates=Array.from({length:count},(_,player)=>catalog.Tome.map((entry,id)=>{
   const order=catalog.order.indexOf(id),required=unlock(order),unlocked=level!==null&&level>=required,value=id>=109?late[id]:number(tome.lines.find(x=>x.index===id)?.currentValues?.[player]);
   const points=score(value,entry,unlocked),target=Number(entry[3]),bounded=[2,4].includes(Number(entry[2]));
   return {id,order,name:clean(entry[0]),effect:entry[5]==='filler'?'':clean(entry[5]),icon:'assets/TomeClaim.png',score:points,target,bounded,progress:points===null?0:Math.max(0,Math.min(1,points/target)),value:value===null?'Unknown':value,unlock:required,level:points===null?'Unknown':points.toLocaleString('en-US')+' points',status:!unlocked?'missing':points===null?'unknown':bounded&&points>=target?'maxed':'active',detail:points===null?'The required saved progress is unavailable.':bounded?`Maximum: ${target} points`:`Benchmark: ${target} points. This metric can scale beyond its benchmark; it has no finite reachable cap.`};
  }));
  const totals=candidates.map(rows=>rows.reduce((total,row)=>total+(row.score??0),0)),player=totals.indexOf(Math.max(...totals)),rows=candidates[player],unknown=rows.filter(r=>r.score===null).length;
  const summary=`Calculated score: ${totals[player].toLocaleString('en-US')}${unknown?' (known metrics only)':''} · ${raw.charNames?.[player]||'Character '+(player+1)}${unknown?' · '+unknown+' unavailable metrics':''}`;
  for(const row of rows)row.summary=summary;
  return {rows:rows.sort((a,b)=>a.order-b.order),score:totals[player],complete:unknown===0};
 }
 root.TomeCurrent={build,score,unlock,lateValues};
})(typeof window!=='undefined'?window:globalThis);
