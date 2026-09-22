const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c={console:{log(){},warn(){},error(){}},structuredClone,localStorage:{getItem(){return null;}}};c.window=c;vm.createContext(c);
for(const file of ['beanstalk-engine.js','clicker-models.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),systems=c.BeanValueEngine.systems(raw);
for(const key of ['orion','poppy','bubba']){
 const original=systems.get(key),snapshot=structuredClone(c.ClickerModels.snapshot(original,key)),model=c.ClickerModels.hydrate(snapshot,key);
 for(const method of ['getUpgradeCost','getTarpitUpgradeCost','getUpgradeLevel','getFisherooBonus','getMegafeatherQuantity','getMegafishQuantity','getMegafleshQuantity'])if(original[method])for(let i=0;i<12;i++){
  let expected;try{expected=original[method](i);}catch{expected=0;}
  assert.equal(model[method](i),expected??0,`${key}.${method}(${i})`);
 }
 const field={orion:'ownedMegafeathers',poppy:'ownedMegafishes',bubba:'ownedMegaflesh'}[key],saved=original[field];
 for(const amount of [0,1,12,100,12345]){
  const values=c.ClickerModels.preview(original,key,amount);assert.equal(original[field],saved,'Preview restores save');
  original[field]=amount;values.forEach((x,i)=>assert.equal(x.value,original.getGlobalBonus(original.bonuses[i].index)));original[field]=saved;
 }
}
for(const file of ['bonus-systems-v2.js','bonus-systems-v3.js','bonus-systems-v4.js','bonus-systems-v5.js'])assert(!fs.readFileSync(file,'utf8').includes('BonusSystems.systems('),'No clicker render may decode on the UI thread');
const worker={console:c.console,structuredClone};worker.self=worker;vm.createContext(worker);worker.importScripts=(...files)=>files.forEach(file=>vm.runInContext(fs.readFileSync(file,'utf8'),worker));let result;worker.postMessage=value=>result=structuredClone(value);vm.runInContext(fs.readFileSync('clicker-preview-worker.js','utf8'),worker);
for(const [i,key] of ['orion','poppy','bubba'].entries()){
 worker.onmessage({data:{id:i,key,amount:123,...(i===0?{raw}:{})}});assert(!result.error,result.error);assert.equal(result.id,i);assert.deepEqual(result.values,structuredClone(c.ClickerModels.preview(systems.get(key),key,123)));
}
console.log('Clicker snapshots and worker previews match original calculations; renderers do not decode saves.');
