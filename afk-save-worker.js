importScripts('prayer-math-engine.js','connected-primary-stats.js','afk-save-model.js');
onmessage=e=>{try{postMessage({result:AfkSaveModel.calculate(e.data,PrayerMath)});}catch(error){postMessage({error:error.message});}};
