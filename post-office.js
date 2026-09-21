(function(root){
const parse=v=>{if(typeof v==='string'){try{return JSON.parse(v);}catch{return null;}}return v;};
const level=(data,char,id)=>{const v=parse(data?.['POu_'+char])?.[id];return v!=null&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;};
function bonus(row,points,slot){if(points==null)return null;const n=Math.round(points-(slot?Number(row[12+slot]):0));if(n<=0)return 0;const a=Number(row[1+4*slot]),b=Number(row[2+4*slot]),formula=row[3+4*slot];return formula==='decay'?a*n/(n+b):formula==='intervalAdd'?a+Math.floor(n/b):formula==='add'?(b!==0?((a+b)/b+.5*(n-1))/(a/b)*n*a:a*n):null;}
const api={level,bonus};if(typeof module!=='undefined')module.exports=api;else root.PostOffice=api;
})(typeof window!=='undefined'?window:globalThis);
