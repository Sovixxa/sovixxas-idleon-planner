'use strict';
importScripts('dashboard-math.js','sailing-trade-model.js');
onmessage=e=>{try{postMessage({result:SailingTradeModel.calculate(e.data)});}catch(error){postMessage({error:error.message});}};
