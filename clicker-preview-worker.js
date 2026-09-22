'use strict';
self.window=self;
self.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
importScripts('beanstalk-engine.js','clicker-models.js');
let systems;
self.onmessage=({data})=>{
 try{
  if(data.raw)systems=self.BeanValueEngine.systems(data.raw);
  self.postMessage({id:data.id,values:self.ClickerModels.preview(systems.get(data.key),data.key,data.amount)});
 }catch(error){self.postMessage({id:data.id,error:error.message||String(error)});}
};
