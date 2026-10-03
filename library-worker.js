'use strict';
importScripts('dashboard-math.js','library-model.js');
onmessage=event=>{try{postMessage({result:LibraryModel.calculate(event.data)});}catch(error){postMessage({error:error.message});}};
