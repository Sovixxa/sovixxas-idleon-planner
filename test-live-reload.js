'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function fixture(hostname='localhost'){
  const events={},visibility={},streams=[];let reloads=0,saves=0;
  const doc={readyState:'loading',visibilityState:'visible',addEventListener:(k,v)=>visibility[k]=v,removeEventListener:k=>delete visibility[k]};
  const c={document:doc,location:{hostname,reload(){reloads++;}},addEventListener:(k,v)=>events[k]=v,removeEventListener:k=>delete events[k],EventSource:class{constructor(){this.events={};streams.push(this);}addEventListener(k,v){this.events[k]=v;}close(){this.closed=true;}}};c.window=c;
  vm.runInNewContext(fs.readFileSync('live-reload.js','utf8'),c);
  const badge={textContent:'',classList:{add(){},remove(){}}};
  const stop=c.PlannerLiveReload.start({badge,beforeReload(){saves++;}});
  return{doc,events,visibility,streams,stop,badge,get reloads(){return reloads;},get saves(){return saves;}};
}
const f=fixture();assert.equal(f.streams.length,0,'Never open a persistent connection before page load');
f.doc.readyState='complete';f.events.load();assert.equal(f.streams.length,1);
f.doc.visibilityState='hidden';f.visibility.visibilitychange();assert(f.streams[0].closed,'Background tabs release browser connection slots');
f.streams[0].events.reload();assert.equal(f.reloads,0,'Ignore stale stream events');
f.doc.visibilityState='visible';f.visibility.visibilitychange();assert.equal(f.streams.length,2);
f.visibility.visibilitychange();assert.equal(f.streams.length,2,'No duplicate stream');
f.streams[1].events.reload();assert.equal(f.saves,1);assert.equal(f.reloads,1);assert(f.streams[1].closed);
f.events.pageshow();assert.equal(f.streams.length,3);f.events.pagehide();assert(f.streams[2].closed);
f.stop();assert(!f.visibility.visibilitychange);
const hosted=fixture('example.com');assert.equal(hosted.streams.length,0);assert.equal(hosted.badge.textContent,'STATIC MODE');
console.log('Live reload: starts after load, releases hidden tabs, resumes safely, ignores stale events and skips hosted sites');
