importScripts('cog-optimizer-engine.js');
onmessage=event=>{try{const {model,objective}=event.data;const result=CogOptimizer.optimize(model,objective,1600,progress=>postMessage({progress}));postMessage({result});}catch(error){postMessage({error:error.message});}};
