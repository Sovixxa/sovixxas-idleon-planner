const fs=require('fs'),vm=require('vm'),assert=require('assert');
const context={console};context.window=context;vm.createContext(context);
for(const [,src] of fs.readFileSync('index.html','utf8').matchAll(/<script src="([^"]+)"/g)){
 if(src==='app.js')break;
 try{vm.runInContext(fs.readFileSync(src.split('?')[0],'utf8'),context,{filename:src});}catch(e){console.log(src,e.message);}
}
const raw=JSON.parse(fs.readFileSync(process.argv[2]||'../example json.txt','utf8'));
const state=context.JellyEngine.parseInput(raw);
const model=context.PetsPage.model(state.rawData,state.rawRoot);
console.log('Pets after loading page scripts:',model.available,model.owned.length);
assert.equal(model.owned.length,88);
