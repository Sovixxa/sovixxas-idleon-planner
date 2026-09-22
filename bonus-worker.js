'use strict';
self.window=self;
importScripts('beanstalk-engine.js','bonus-systems.js');
self.onmessage=event=>{
  try{self.postMessage({groups:self.BonusSystems.getRows(event.data)});}
  catch(error){self.postMessage({error:error?.message||String(error)});}
};
