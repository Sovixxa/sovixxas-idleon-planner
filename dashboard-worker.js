'use strict';
importScripts('dashboard-math.js','dashboard-timers.js','dashboard-model.js');
self.onmessage=event=>{
 const {id,raw,config,materials,observedAt}=event.data;
 try{const result=self.DashboardModel.calculate(raw,config,self.DashboardMath,materials,observedAt);self.postMessage({id,result});}
 catch(error){self.postMessage({id,error:'The account could not be decoded. Load a complete export and retry.'});}
};
