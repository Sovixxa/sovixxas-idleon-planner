'use strict';
self.window=self;
// The shared decoder reads optional UI preferences. Workers have no localStorage;
// use defaults here instead of silently returning an empty system map.
self.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
importScripts('beanstalk-engine.js','decoder-cache.js','clicker-models.js','bonus-systems.js','bribes-data.js','armor-sets.js','arcade-page-assets.js','arcade-page-models.js','progression-models.js','world7-data.js','endgame-assets.js','endgame-models.js');
self.onmessage=event=>{
  if(!Object.keys(event.data?.data||event.data||{}).length){self.postMessage({groups:{}});return;}
  try{const systems=self.BonusSystems.systems(event.data),groups=self.BonusSystems.getRows(event.data);Object.assign(groups,self.ArcadePageModels.build(systems,event.data));Object.assign(groups,self.ProgressionModels.build(systems,event.data));Object.assign(groups,self.EndgameModels.build(systems,event.data));const roster=(systems.get('players')||[]).map(p=>({playerID:p.playerID,currentMonster:{details:{Name:p.currentMonster?.details?.Name||p.currentMonster?.details?.name||p.currentMonster?.name||p.currentMonster?.id,AFKtype:p.currentMonster?.details?.AFKtype||p.getActivityType?.()}}}));const clickers=Object.fromEntries(['orion','poppy','bubba'].map(key=>[key,self.ClickerModels.snapshot(systems.get(key),key)]));
 self.postMessage({groups,roster,clickers});}
  catch(error){self.postMessage({error:error?.message||String(error)});}
};
