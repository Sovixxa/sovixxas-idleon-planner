'use strict';
importScripts('prayer-math-engine.js','shadow-caps-data.js','stat-todo-model.js','combat-stat-model.js');
onmessage=event=>{try{postMessage({result:CombatStatModel.calculate(event.data.raw,event.data.kind)});}catch(error){postMessage({error:error.message});}};
