(function(root){
'use strict';
const cache=new WeakMap();
function load(raw){
 if(!raw||typeof raw!=='object')return Promise.reject(Error('Import a complete save.'));
 if(cache.has(raw))return cache.get(raw);
 const promise=new Promise((resolve,reject)=>{
  const worker=new Worker('carry-capacity-worker.js');
  const finish=(error,result)=>{clearTimeout(timer);worker.terminate();error?reject(Error(error)):resolve(result);};
  const timer=setTimeout(()=>finish('Capacity calculation timed out.'),90000);
  worker.onmessage=event=>finish(event.data.error,event.data.result);
  worker.onerror=event=>finish(event.message||'Capacity calculation failed.');
  worker.postMessage(raw);
 });
 cache.set(raw,promise);promise.catch(()=>cache.delete(raw));return promise;
}
root.CarryCapacity={load};
})(globalThis);
