(function(root){
  'use strict';
  const engine=root.BeanValueEngine;if(!engine)return;
  const decode=engine.systems;let lastSave=null,lastSystems=null;
  const calculate=engine.calculate;let calculatedSave=null,calculatedValues=null;
  const pending=new WeakMap();
  // Imports replace the save object. Reuse its decoded systems across pages;
  // keep only one account so old, large model graphs can be collected.
  engine.systems=function(raw){
    if(raw===lastSave&&lastSystems)return lastSystems;
    const result=decode(raw);lastSave=raw;lastSystems=result;return result;
  };
  engine.primeCalculated=function(raw,values){if(Array.isArray(values)){calculatedSave=raw;calculatedValues=values;}};
  if(calculate)engine.calculate=function(raw){
    if(raw===calculatedSave&&calculatedValues)return calculatedValues;
    const values=calculate(raw);engine.primeCalculated(raw,values);return values;
  };
  engine.calculateAsync=function(raw){
    if(raw===calculatedSave&&calculatedValues)return Promise.resolve(calculatedValues);
    if(pending.has(raw))return pending.get(raw);
    if(typeof root.Worker!=='function')return Promise.resolve().then(()=>engine.calculate(raw));
    const job=new Promise((resolve,reject)=>{
      const worker=new root.Worker('gold-food-worker.js');
      const timer=root.setTimeout(()=>finish(new Error('Golden Food calculation timed out. Reopen Beanstalk to retry.')),30000);
      function finish(error,values){root.clearTimeout(timer);worker.terminate();if(error){reject(error);return;}engine.primeCalculated(raw,values);resolve(values);}
      worker.onmessage=event=>finish(event.data.error?new Error(event.data.error):null,event.data.values);
      worker.onerror=event=>finish(new Error(event.message||'Golden Food calculation failed'));
      try{worker.postMessage(raw);}catch(error){finish(error);}
    }).finally(()=>pending.delete(raw));
    pending.set(raw,job);return job;
  };
})(typeof window!=='undefined'?window:globalThis);
