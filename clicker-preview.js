(function(root){
 'use strict';
 let worker=null,save=null,sequence=0,idle;
 const pending=new Map();
 function dispose(message='Preview cancelled'){
  root.clearTimeout(idle);worker?.terminate();worker=null;save=null;
  for(const job of pending.values()){root.clearTimeout(job.timer);job.reject(new Error(message));}pending.clear();
 }
 root.ClickerPreview={dispose,calculate(raw,key,amount){
  if(save!==raw)dispose();
  let initial=false;
  if(!worker){worker=new root.Worker('clicker-preview-worker.js');save=raw;initial=true;
   worker.onmessage=({data})=>{const job=pending.get(data.id);if(!job)return;pending.delete(data.id);root.clearTimeout(job.timer);data.error?job.reject(new Error(data.error)):job.resolve(data.values);};
   worker.onerror=event=>dispose(event.message||'Preview failed');
  }
  root.clearTimeout(idle);idle=root.setTimeout(()=>dispose(),30000);
  return new Promise((resolve,reject)=>{const id=++sequence,timer=root.setTimeout(()=>dispose('Preview timed out. Try again.'),20000);pending.set(id,{resolve,reject,timer});try{worker.postMessage({id,key,amount,...(initial?{raw}:{})});}catch(error){dispose(error.message);}});
 }};
 root.addEventListener?.('pagehide',()=>dispose());
})(typeof window!=='undefined'?window:globalThis);
