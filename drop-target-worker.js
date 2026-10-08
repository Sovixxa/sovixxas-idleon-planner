'use strict';
importScripts('prayer-math-engine.js','stat-todo-model.js','drop-rate-model.js','drop-source-info.js','drop-target-sources.js','drop-target-model.js');
onmessage=({data})=>{try{postMessage({result:DropTargetModel.plan(data.raw,data.character,data.target,PrayerMath,progress=>postMessage({progress}))});}catch(error){postMessage({error:error.message});}};
