'use strict';
importScripts('prayer-math-engine.js','shadow-caps-data.js','stat-todo-model.js','drop-rate-model.js');
onmessage=event=>{try{postMessage({result:DropRateModel.calculate(event.data)});}catch(error){postMessage({error:error.message});}};
