'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const filename='../audit/N.js';
if(!fs.existsSync(filename)){console.log('Catalog/client coverage skipped: local game client unavailable.');process.exit(0);}
const client=fs.readFileSync(filename,'utf8'),c={};c.window=c;vm.createContext(c);
for(const file of ['account-data.js','world7-data.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
function list(name){
 const token='.'+name+'=function(){return',position=client.indexOf(token);assert(position>=0,`${name} not found in client`);
 const start=position+token.length;let depth=0,quote='',escaped=false;
 for(let i=start;i<client.length;i++){const ch=client[i];if(quote){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch===quote)quote='';continue;}if(ch==='"'||ch==="'"){quote=ch;continue;}if('[{('.includes(ch))depth++;else if(']})'.includes(ch)&&!--depth)return vm.runInNewContext(client.slice(start,i+1));}
 throw new Error(`Unclosed client catalog: ${name}`);
}
let count=0;for(const catalog of [c.ACCOUNT_CATALOG,c.WORLD7_CATALOG])for(const [name,rows] of Object.entries(catalog)){assert.equal(JSON.stringify(rows),JSON.stringify(list(name)),`${name} diverged from installed client`);count++;}
assert(c.WORLD7_CATALOG.SushiUPG.some(row=>row[0]==='Combo_Meter'));
console.log(`Catalog coverage: ${count} account/World 7 catalogs match installed client, including Sushi Combo Meter and W7 Tasks`);
