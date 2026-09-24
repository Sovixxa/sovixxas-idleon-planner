(function(root){'use strict';
const parse=v=>{if(typeof v==='string')try{return JSON.parse(v);}catch{return null;}return v;};
const known=v=>v==null||v===''||typeof v==='boolean'||!Number.isFinite(Number(v))||Number(v)<0?null:Number(v);
function companion(raw={}){
 const data=parse(raw.data)||raw,sources=[raw,data];let list=null,options=null;
 for(const source of sources){const comp=parse(source.companion??source.Companion),rows=parse(comp?.l??(Array.isArray(comp)?comp:null));if(Array.isArray(rows))list=rows;const opt=parse(source.OptionsListAccount??source.OptLacc);if(opt&&typeof opt==='object')options=opt;}
 const borrowed=options?.[606]??options?.h?.[606],borrowKnown=borrowed!=null;
 if(borrowKnown&&String(borrowed).split(',').some(x=>x.trim()!==''&&Number(x)===27))return{multiplier:2,note:'Borrowed Spirit Reindeer: 2× Arcade bonuses.'};
 let owned=false,upgraded=false,invalid=false;
 for(const row of list||[]){const parts=Array.isArray(row)?row:String(row).split(',');if(Number(parts[0])!==27)continue;owned=true;const level=known(parts[4]);if(level==null)invalid=true;else if(level>=1)upgraded=true;}
 if(owned&&!upgraded&&!invalid)return{multiplier:2,note:'Spirit Reindeer: 2× Arcade bonuses.'};
 if(owned&&upgraded&&borrowKnown)return{multiplier:1,note:'Upgraded Spirit Reindeer: this client checks for the base pet bonus exactly and does not apply doubling. Its 2.5× pet description disagrees; verify in game.',discrepancy:true};
 if(list!==null&&borrowKnown&&!owned)return{multiplier:1,note:'No Spirit Reindeer bonus recorded.'};
 return{multiplier:null,note:'Companion bonus unknown: ownership, upgrade or borrowed-bonus data is missing.'};
}
function bonus(item,level,pet){
 level=known(level);if(level==null)return{base:null,total:null};
 const value=item.formula==='add'?item.base*level:item.formula==='decay'?item.base*level/(level+item.scale):item.formula==='intervalAdd'?item.base+Math.floor(level/item.scale):null;
 const base=value==null?null:value*(level===101?2:1);
 return{base,total:base==null||pet?.multiplier==null?null:base*pet.multiplier};
}
const api={known,companion,bonus};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeModel=api;
})(typeof window!=='undefined'?window:globalThis);
