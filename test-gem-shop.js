const assert=require('assert/strict'),fs=require('fs'),vm=require('vm'),catalog=require('./gem-shop-data');
const box={console,structuredClone,localStorage:{getItem(){return null}}};box.window=box;vm.createContext(box);vm.runInContext(fs.readFileSync('beanstalk-engine.js','utf8'),box);global.BeanValueEngine=box.BeanValueEngine;
const B=require('./bonus-systems'),raw=JSON.parse(fs.readFileSync('../example json.txt','utf8'));const rows=B.getRows(raw).gemShop;let saved=raw.data.GemItemsPurchased;if(typeof saved==='string')saved=JSON.parse(saved);
assert.equal(rows.length,catalog.length);assert.equal(new Set(rows.map(x=>x.code+':'+x.index)).size,rows.length);
for(const x of rows){assert.equal(x.owned,Number(saved[x.index])||0,x.name);assert(fs.existsSync(x.icon),x.icon);}
assert.equal(rows.find(x=>x.code==='GemQ1').index,111);
assert.equal(rows.find(x=>x.code==='InvBag21').index,55);
for(const section of ['Time Candy','Premium Stones','Cards','Limited Specials','Caverns','World 7'])assert(rows.some(x=>x.section===section),section);
assert(rows.some(x=>x.code==='GemQ12'));assert(!rows.some(x=>/NAME_OF_ITEM|^Blank$/.test(x.name)));
console.log(rows.length+' listings: explicit save indices, missing sections, unique entries, and every sprite passed.');
