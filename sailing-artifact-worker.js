'use strict';
importScripts('dashboard-math.js','sailing-artifact-model.js');
onmessage=e=>{try{postMessage({result:SailingArtifactModel.calculate(e.data)});}catch(error){postMessage({error:error.message});}};
