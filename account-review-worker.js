'use strict';
self.window=self;
self.localStorage={getItem:()=>null};
importScripts('beanstalk-engine.js','decoder-cache.js','stamps-data.js','alchemy-data.js','construction-data.js','world4-data.js','armor-sets.js','quests.js','quests-v2.js','quests-v3.js','quests-v5.js','account-review.js');
self.onmessage=event=>{
  try{self.postMessage({report:self.AccountReview.model(event.data)});}
  catch(error){self.postMessage({error:error?.message||String(error)});}
};
