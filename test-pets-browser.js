const fs=require('fs'),vm=require('vm'),assert=require('assert');
const context={console,fetch:()=>new Promise(()=>{}),localStorage:{getItem(){return null;}}};context.window=context;vm.createContext(context);
for(const [,src] of fs.readFileSync('index.html','utf8').matchAll(/<script src="([^"]+)"/g)){
 if(src.split('?')[0]==='app.js')break;
 vm.runInContext(fs.readFileSync(src.split('?')[0],'utf8'),context,{filename:src});
}
const raw=JSON.parse(fs.readFileSync(process.argv[2]||'../example json.txt','utf8'));
const state=context.JellyEngine.parseInput(raw);
const model=context.PetsPage.model(state.rawData,state.rawRoot);
console.log('Pets after loading page scripts:',model.available,model.owned.length);
assert.equal(model.owned.length,88);
