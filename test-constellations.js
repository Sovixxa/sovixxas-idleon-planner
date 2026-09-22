'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const listeners={};
const box={
  window:null,
  globalThis:null,
  CustomEvent:class CustomEvent{constructor(type){this.type=type;}},
  addEventListener(type,fn){listeners[type]=fn;},
  dispatchEvent(event){listeners[event.type]?.(event);},
  BonusSystems:{render(){},getRows(){return{constellations:[]};}}
};
box.window=box;box.globalThis=box;
vm.createContext(box);
vm.runInContext(fs.readFileSync('constellations-v2.js','utf8'),box);
const worldFor=box.ConstellationsV2.worldFor;
const source=fs.readFileSync('beanstalk-engine.js','utf8');
const pattern=/new he\((\d+),\{name:"([^"]+)",area:"([^"]*)",[\s\S]{0,360}?starChartPoints:(\d+),requirement:"([^"]*)"/g;
const catalog=[...source.matchAll(pattern)].map(match=>({name:match[2],area:match[3]})).filter(row=>row.name!=='Filler');
const counts={};
for(const row of catalog)counts[worldFor(row)]=(counts[worldFor(row)]||0)+1;
assert.equal(catalog.length,49);
assert.deepEqual({...counts},{W1:10,W2:8,W3:8,W4:7,W5:7,W6:9});
assert.equal(worldFor({name:'D-4',area:'Wurm Highway'}),'W4');
assert.equal(worldFor({name:'E-7',area:'The Worm Nest'}),'W5');
assert.equal(counts.Other,undefined);
console.log('constellations: all 49 entries assigned to their proper worlds');
