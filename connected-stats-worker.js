importScripts('connected-trace-runtime.js','connected-trace-engine.js','connected-primary-stats.js','connected-stats-model.js');
onmessage=event=>{try{postMessage({result:ConnectedStatsModel.calculate(event.data)});}catch(error){postMessage({error:error.message});}};
