importScripts('prayer-math-engine.js','connected-primary-stats.js','afk-save-model.js');
onmessage=e=>{try{postMessage({result:AfkSaveModel.calculate(e.data.raw||e.data,PrayerMath,e.data.options||{})});}catch(error){postMessage({error:error.message});}};
