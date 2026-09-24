importScripts('cog-optimizer-engine.js');
onmessage=({data})=>{try{const solve=data.options.mode==='realistic'?CogOptimizer.realisticBoard:CogOptimizer.idealBoard;postMessage({result:solve(data.model,data.options,progress=>postMessage({progress}))});}catch(error){postMessage({error:error.message});}};
