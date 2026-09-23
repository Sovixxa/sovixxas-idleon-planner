'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('app.js','utf8');
const navigation=source.slice(source.indexOf('  function selectSideNav('),source.indexOf("  $('tabHome').addEventListener"));
const nodes=new Map();
const $=id=>{if(!nodes.has(id))nodes.set(id,{classList:{values:new Set(),toggle(key,on){on?this.values.add(key):this.values.delete(key);},add(key){this.values.add(key);},remove(key){this.values.delete(key);}}});return nodes.get(id);};
const context={$,state:null,practice:null,SKILL_PAGES:{},document:{querySelector:()=>null,querySelectorAll:()=>[]},renderWorldPage(){},selectWorkspaceTab(){}};
vm.createContext(context);vm.runInContext(navigation,context);
for(const name of ['communitySheets','credits','shadowCaps','loadouts']){
 context.selectSideNav(name);
 assert(!$('workspace').classList.values.has('hidden'),`${name} must be visible without a save`);
 assert($('inputPanel').classList.values.has('hidden'));
}
context.selectSideNav('home');assert(!$('inputPanel').classList.values.has('hidden'));
const html=fs.readFileSync('dist/index.html','utf8');
const release=html.match(/app\.js\?v=([a-f0-9]{12})/)[1];
for(const [,file] of html.matchAll(/(?:src|href)="([^"?]+\.(?:js|css))\?/g))assert(html.includes(`${file}?v=${release}`));
for(const name of ['drop-rate','combat-stat-tabs']){
 const script=fs.readFileSync(`dist/${name}.js`,'utf8');
 assert(script.includes(`-worker.js?v=${release}`));
}
for(const name of ['drop-rate-worker','combat-stat-worker']){
 const script=fs.readFileSync(`dist/${name}.js`,'utf8');
 for(const file of ['prayer-math-engine.js','stat-todo-model.js'])assert(script.includes(`${file}?v=${release}`));
 new vm.Script(script);
}
console.log('Public navigation and versioned page/worker dependency graph pass.');
