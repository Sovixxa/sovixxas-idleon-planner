'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const quiet={log(){},warn(){},error(){}};
function modules(extra={}){
 const c={console:quiet,structuredClone,localStorage:{getItem(){return null;}},fetch:()=>new Promise(()=>{}),...extra};c.window=c;vm.createContext(c);
 for(const [,src] of fs.readFileSync('index.html','utf8').matchAll(/<script src="([^"]+)"/g)){const file=src.split('?')[0];if(file==='app.js')break;vm.runInContext(fs.readFileSync(file,'utf8'),c,{filename:file});}
 return c;
}
async function main(){
 const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),c=modules();
 c.BonusSystems.getRows(raw); // Orion/Poppy first, before the async pages.
 const groups=await c.BonusSystems.getRowsAsync(raw);
 for(const key of ['bribes','armorSets','tome','slab','research','spelunking'])assert(groups[key]?.length,key);
 for(const [key,rows] of Object.entries(groups))for(const row of rows){if(row.icon?.startsWith('assets/'))assert(fs.existsSync(row.icon),`${key}: ${row.icon}`);assert(!/NaN|undefined/.test(row.effect||''),key);}
 assert.equal(await c.BonusSystems.getRowsAsync(raw),groups);
 assert.equal(Object.keys(await c.BonusSystems.getRowsAsync({})).length,0);
 const workers=[];c.Worker=class{constructor(){workers.push(this);}postMessage(raw){this.raw=raw;}terminate(){this.terminated=true;}};
 const a={data:{id:'a'}},b={data:{id:'b'}};
 const pa=c.BonusSystems.getRowsAsync(a),pb=c.BonusSystems.getRowsAsync(b);
 assert.equal(c.BonusSystems.getRowsAsync(a),pa);await Promise.resolve();
 workers[1].onmessage({data:{groups:{b:[1]}}});await pb;
 assert.equal(c.BonusSystems.getRowsAsync(a),pa,'Other save completing must not discard pending request');
 workers[0].onmessage({data:{groups:{a:[1]}}});await pa;
 const failed={data:{id:'failed'}};const failure=c.BonusSystems.getRowsAsync(failed);await Promise.resolve();workers[2].onerror({message:'test failure'});await assert.rejects(failure,/test failure/);
 const retry=c.BonusSystems.getRowsAsync(failed);await Promise.resolve();workers[3].onmessage({data:{groups:{retry:[]}}});await retry;
 // Late optional item-name loading must not overwrite another page.
 let release;const q={QuestsPage:{model:()=>({rows:[],characters:[]})},fetch:()=>new Promise(r=>release=r)};q.window=q;vm.createContext(q);vm.runInContext(fs.readFileSync('quests-v5.js','utf8'),q);
 const host={dataset:{page:'quests'},innerHTML:'',querySelector:()=>({}),querySelectorAll:()=>[]};q.QuestsPage.render(host,{});host.dataset.page='cards';host.innerHTML='CARDS';release({text:async()=>''});await new Promise(r=>setImmediate(r));assert.equal(host.innerHTML,'CARDS');
 // Exercise the actual worker including empty exports.
 const w={console:quiet,structuredClone};w.self=w;vm.createContext(w);w.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8'),w));let result;w.postMessage=x=>result=x;vm.runInContext(fs.readFileSync('bonus-worker.js','utf8'),w);
 for(const save of [{},{data:{}}]){w.onmessage({data:save});assert(!result.error);assert.equal(Object.keys(result.groups).length,0);}
 w.onmessage({data:raw});assert(!result.error,result.error);for(const key of ['tome','slab','research'])assert(result.groups[key].length);
 let foodResult;w.postMessage=x=>foodResult=x;vm.runInContext(fs.readFileSync('gold-food-worker.js','utf8'),w);w.onmessage({data:raw});assert(!foodResult.error,foodResult.error);assert(foodResult.values.length>0);
 const direct={console:quiet,structuredClone};direct.window=direct;vm.createContext(direct);vm.runInContext(fs.readFileSync('prayer-math-engine.js','utf8'),direct);
 const copy=structuredClone(raw),parsed=direct.PrayerMath.parseData(copy.data||copy,copy.charNames,copy.companion,copy.guildData,copy.serverVars||{},copy.accountCreateTime,copy.tournament);
 assert.equal(foodResult.values.length,parsed.characters.length);
 parsed.characters.forEach((character,id)=>{
  const expected=direct.PrayerMath.getGoldenFoodMulti(character,parsed.account,parsed.characters).value,actual=foodResult.values[id];
  assert.equal(actual.name,character.name);
  assert(Math.abs(actual.multiplier-expected)<1e-9,'Worker must match current Golden Food math, including mastery');
  assert(Math.abs(actual.percent-Math.max(0,(expected-1)*100))<1e-7);
  assert(actual.breakdown.sources.length>0,'Worker must deliver the source breakdown');
 });
 console.log('Runtime integration: browser script order, enriched cache, concurrent saves, retry, quest navigation, all bonus sprites, empty workers OK');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
