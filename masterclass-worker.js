self.window=self;self.localStorage={getItem(){return null},setItem(){}};
importScripts('beanstalk-engine.js','royal-armory-data.js','royal-armory.js','masterclass-model.js');
self.onmessage=({data})=>{try{const rawData=typeof data.raw?.data==='string'?JSON.parse(data.raw.data):(data.raw?.data||data.raw||{});const systems=data.key==='royalArmory'||rawData[self.MasterclassModel.configs[data.key].save]==null?null:self.BeanValueEngine.systems(data.raw);self.postMessage({model:self.MasterclassModel.snapshot(data.key,data.raw,systems)});}catch(e){self.postMessage({error:e.message});}};
