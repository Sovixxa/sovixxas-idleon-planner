'use strict';
// Full local audit. Several tests need ../example json.txt; see the audit report.
const fs=require('node:fs'),{spawnSync}=require('node:child_process');
const build=spawnSync(process.execPath,['build-static.js'],{cwd:__dirname,stdio:'inherit',windowsHide:true});
if(build.status!==0)process.exit(build.status||1);
const results=[];
const files=fs.readdirSync(__dirname).filter(file=>/^test-.*\.js$/.test(file)).sort();
for(const file of files){
 const start=Date.now();
 const result=spawnSync(process.execPath,[file],{cwd:__dirname,encoding:'utf8',timeout:240000,maxBuffer:8*1024*1024,windowsHide:true});
 results.push({file,code:result.status,error:result.error?.message,ms:Date.now()-start,output:(result.stdout||'')+(result.stderr||'')});
 fs.writeFileSync(__dirname+'/audit-all-tests.log',JSON.stringify(results,null,2));
 console.log(`${result.status===0?'PASS':'FAIL'} ${file} (${Date.now()-start} ms)`);
}
const failures=results.filter(result=>result.code!==0);
console.log(`${results.length-failures.length}/${results.length} test files passed. Details: audit-all-tests.log`);
process.exitCode=failures.length?1:0;
