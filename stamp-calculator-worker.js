'use strict';
importScripts('prayer-math-engine.js','stamp-calculator-data.js');
onmessage=event=>{try{postMessage({result:StampCalculatorData.build(event.data)});}catch(error){postMessage({error:error.message});}};
