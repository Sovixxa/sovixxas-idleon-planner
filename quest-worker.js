'use strict';
self.window=self;
// The game-data decoder reads persisted UI preferences during initialization.
// Web Workers do not expose localStorage, so provide the read-only empty store
// it needs while decoding quest data off the main thread.
self.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{},clear:()=>{}};
importScripts('beanstalk-engine.js','quests.js','quests-v2.js','quests-v3.js','quests-v5.js');
self.onmessage=event=>{
  try{self.postMessage({model:self.QuestsPage.model(event.data)});}
  catch(error){self.postMessage({error:error?.message||String(error)});}
};
