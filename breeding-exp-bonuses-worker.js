'use strict';
importScripts('dashboard-math.js','breeding-exp-bonuses-model.js');
onmessage=e=>{try{postMessage({result:BreedingExpBonusesModel.calculate(e.data)});}catch(error){postMessage({error:error.message});}};
