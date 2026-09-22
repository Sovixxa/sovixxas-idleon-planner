'use strict';
self.window=self;
importScripts('beanstalk-engine.js','quests.js','quests-v2.js','quests-v3.js','quests-v5.js');
self.onmessage=event=>{
  try{self.postMessage({model:self.QuestsPage.model(event.data)});}
  catch(error){self.postMessage({error:error?.message||String(error)});}
};
