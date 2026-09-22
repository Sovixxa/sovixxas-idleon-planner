'use strict';
self.window=self;
// The shared decoder reads optional UI preferences. Workers have no localStorage;
// use defaults here instead of silently returning an empty system map.
self.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
importScripts('beanstalk-engine.js','bonus-systems.js','bribes-data.js','armor-sets.js','arcade-page-assets.js','arcade-page-models.js','progression-models.js','world7-data.js','endgame-assets.js','endgame-models.js');
self.onmessage=event=>{
  if(!Object.keys(event.data?.data||event.data||{}).length){self.postMessage({groups:{}});return;}
  try{const groups=self.BonusSystems.getRows(event.data);Object.assign(groups,self.ArcadePageModels.build(self.BonusSystems.systems(event.data),event.data));Object.assign(groups,self.ProgressionModels.build(self.BonusSystems.systems(event.data),event.data));Object.assign(groups,self.EndgameModels.build(self.BonusSystems.systems(event.data),event.data));self.postMessage({groups});}
  catch(error){self.postMessage({error:error?.message||String(error)});}
};
