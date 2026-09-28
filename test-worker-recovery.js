'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function runtime(file){
 const workers=[],timers=new Map();let sequence=0;
 const c={console,setTimeout(fn){const id=++sequence;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);},Worker:class{constructor(){workers.push(this);}postMessage(){}terminate(){this.terminated=true;}}};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(file,'utf8'),c,{filename:file});return {c,workers,timers};
}
(async()=>{
 const failures=[];
 for(const [file,get,field,payload] of [
  ['cooking.js',c=>raw=>c.Cooking.calculate(raw.data,raw),'error',{characters:[]}],
  ['bubble-optimizer.js',c=>raw=>c.BubbleOptimizer.prepare(raw),'warning',{multipliers:{}}],
  ['stamp-calculator.js',c=>raw=>c.StampCalculator.load(raw),null,{rows:[]}]
 ])for(const mode of ['error','timeout','reported','postMessage','constructor']){
  try{
   const {c,workers,timers}=runtime(file),load=get(c),raw={data:{}};
   if(mode==='postMessage'||mode==='constructor'){
    const Base=c.Worker;let firstAttempt=true;
    c.Worker=class extends Base{constructor(){if(mode==='constructor'&&firstAttempt){firstAttempt=false;throw Error('Worker creation failed');}super();}postMessage(){if(firstAttempt){firstAttempt=false;throw Error('Message could not be sent');}}};
   }
   const first=load(raw);
   const failure=first.then(result=>({result}),error=>({error}));
   const initialWorkers=mode==='constructor'?0:1;assert.equal(workers.length,initialWorkers);
   if(mode==='error')workers[0].onerror({});else if(mode==='timeout')[...timers.values()][0]();else if(mode==='reported')workers[0].onmessage({data:{[field||'error']:'Calculation failed'}});
   const outcome=await failure;
   if(field)assert(outcome.result?.[field],file+' must identify failure');else assert(outcome.error?.message,'Worker loading errors must reject with a message');
   if(initialWorkers)assert(workers[0].terminated);assert.equal(timers.size,0);
   const retry=load(raw);assert.equal(workers.length,initialWorkers+1,file+' must retry the same save after '+mode);
   workers.at(-1).onmessage({data:field?payload:{result:payload}});
   assert.deepEqual(await retry,payload);
   assert.deepEqual(await load(raw),payload);assert.equal(workers.length,initialWorkers+1,'Successful results stay cached');assert.equal(timers.size,0);
  }catch(error){failures.push(file+' '+mode+': '+error.message);}
 }
 assert.deepEqual(failures,[]);
 console.log('Worker recovery: cooking, bubble multipliers and stamps retry the same save after errors/timeouts, clean up workers/timers and cache successful results.');
})().catch(error=>{console.error(error);process.exitCode=1;});
