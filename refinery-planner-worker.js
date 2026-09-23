'use strict';
importScripts('prayer-math-engine.js','refinery-planner-model.js');
onmessage=event=>{try{postMessage({result:RefineryPlannerModel.calculate(event.data)});}catch(error){postMessage({error:error.message});}};
