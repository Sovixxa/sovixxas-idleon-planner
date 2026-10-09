'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
const shards=8,parallel=Math.min(shards,Math.max(1,Number(process.env.AUDIT_JOBS)||Math.min(4,os.availableParallelism()))),results=[];let next=0;
fs.mkdirSync(path.join(__dirname,'../audit'),{recursive:true});
async function worker(){while(next<shards){const shard=next++;const code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['test-review-target-scan.js',String(shard),String(shards)],{cwd:__dirname,windowsHide:true,stdio:'inherit'});child.once('error',reject);child.once('exit',resolve);});results.push({shard,code});}}
Promise.all(Array.from({length:parallel},worker)).then(()=>{console.log(JSON.stringify(results.sort((a,b)=>a.shard-b.shard)));process.exitCode=results.some(r=>r.code!==0)?1:0;}).catch(error=>{console.error(error);process.exitCode=1;});
