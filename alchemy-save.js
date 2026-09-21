(function(root){
const parse=v=>{if(typeof v==='string'){try{return JSON.parse(v);}catch{return null;}}return v;};
function prisma(state){const data=state?.rawData||{},raw=state?.rawRoot||{};let value;for(const source of [data,raw,raw.data])for(const key of ['OptLacc','OptionsListAccount']){const options=parse(source?.[key]);const candidate=options?.[384]??options?.h?.[384];if(candidate!=null&&value==null)value=String(candidate);}
const keys=new Set();if(value!=null)for(let group=0;group<4;group++)for(let index=0;index<35;index++){// Match the client's isBubbleSuperr substring lookup, including leading sentinel text.
if(value.includes('_abc'[group]+index+','))keys.add(String.fromCharCode(65+group)+index);}
return {keys,available:value!=null};}
const api={prisma};if(typeof module!=='undefined')module.exports=api;else root.AlchemySave=api;
})(typeof window!=='undefined'?window:globalThis);
