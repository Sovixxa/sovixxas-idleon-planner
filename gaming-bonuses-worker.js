'use strict';
importScripts('dashboard-math.js','gaming-bonuses-model.js');
onmessage=e=>{try{postMessage({result:GamingBonusesModel.calculate(e.data)});}catch(error){postMessage({error:error.message});}};
