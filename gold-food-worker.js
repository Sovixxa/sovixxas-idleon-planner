'use strict';
self.window=self;
self.localStorage={getItem(){return null;}};
importScripts('beanstalk-engine.js');
self.onmessage=event=>{
  try{self.postMessage({values:self.BeanValueEngine.calculate(event.data)});}
  catch(error){self.postMessage({error:error?.message||String(error)});}
};
