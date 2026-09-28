'use strict';
// Compare public catalog expressions, never execute either full game client.
// Usage: node inspect-bonus-freshness.js <reference-client> <current-client> <report.json>
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
function catalogs(source){
 const values=new Map(),unresolved=[];
 for(const match of source.matchAll(/\b[A-Za-z_$][\w$]*\.([A-Za-z0-9_]+)\s*=\s*function\s*\(\)\s*\{\s*return\s*(?=\[|["'])/g)){
  const start=match.index+match[0].length;let depth=0,quote='',escaped=false,end=-1;
  for(let i=start;i<source.length;i++){
   const ch=source[i];if(quote){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch===quote)quote='';continue;}
   if(ch==='"'||ch==="'"){quote=ch;continue;}
   if('[{('.includes(ch))depth++;else if(']})'.includes(ch)){if(depth===0){end=i;break;}depth--;}
   if(ch===';'&&depth===0){end=i;break;}
  }
  if(end<0){unresolved.push(match[1]);continue;}
  try{const value=vm.runInNewContext('('+source.slice(start,end)+')',Object.create(null),{timeout:1000});if(Array.isArray(value))values.set(match[1],JSON.parse(JSON.stringify(value)));}
  catch{unresolved.push(match[1]);}
 }
 return {values,unresolved};
}
function main(){
const [referencePath,currentPath,outputPath]=process.argv.slice(2);
if(!referencePath||!currentPath||!outputPath)throw Error('Provide reference client, current client and report paths.');
const reference=fs.readFileSync(referencePath,'utf8'),current=fs.readFileSync(currentPath,'utf8');
const before=catalogs(reference),after=catalogs(current),matched=[],changed=[],removed=[];
for(const [name,value] of before.values){
 if(!after.values.has(name)){removed.push(name);continue;}
 const next=after.values.get(name);
 if(JSON.stringify(value)===JSON.stringify(next))matched.push(name);
 else{
  const rows=[];
  if(Array.isArray(value)&&Array.isArray(next))for(let i=0;i<Math.max(value.length,next.length);i++)if(JSON.stringify(value[i])!==JSON.stringify(next[i]))rows.push({index:i,before:value[i],after:next[i]});
  changed.push({name,beforeCount:value.length,afterCount:next.length,rows});
 }
}
const added=[...after.values.keys()].filter(name=>!before.values.has(name));
const sha=source=>crypto.createHash('sha256').update(source).digest('hex');
const report={checkedAt:new Date().toISOString(),referencePath,currentPath,referenceSha256:sha(reference),currentSha256:sha(current),matchedCount:matched.length,matched,changed,added,removed,unresolved:{reference:before.unresolved,current:after.unresolved},scope:'Catalog data only. Matching catalogs do not establish calculation or platform equivalence.'};
fs.writeFileSync(outputPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,matched:undefined,changed:changed.map(({rows,...entry})=>({...entry,changedRows:rows.length}))},null,2));
}
module.exports={catalogs};
if(require.main===module)main();
