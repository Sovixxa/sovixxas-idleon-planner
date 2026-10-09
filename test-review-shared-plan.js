'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');const c={console:{log(){},warn(){},error(){},debug(){}}};c.self=c;vm.createContext(c);vm.runInContext('structuredClone=v=>JSON.parse(JSON.stringify(v))',c);c.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8'),c));c.postMessage=()=>{};c.importScripts('review-target-worker.js');const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),original=JSON.stringify(raw),s=c.ReviewTargetModel.session(raw),p=s.parse(raw.data),M=c.PrayerMath;

const build=c.ReviewTargetSources.build;
c.ReviewTargetSources.build=(...args)=>{const r=build(...args);return {...r,candidates:r.candidates.filter(x=>x.system==='Stamps'&&/Sword|Fist|Fighting|Diamond|Drop|Golden Sixes|Golden Apple/.test(x.name)||x.path[0]==='Holes'&&x.path[1]===22&&x.path[2]===9||['Golden food','Post Office','Talents','Character & family levels'].includes(x.system)&&!x.sharedProvider)};};
for(const metric of ['damage','afkKills','dropRate']){
 const result=s.accountWide('plan',metric,.0000001),r=result.results[0].result;
 assert.equal(result.results.length,1);assert(result.sharedGain&&!result.overview);assert.equal(r.before,0);assert.equal(r.unit,'% gain');assert(r.options.length>0);assert(r.options.every(c.ReviewTargetSources.isAccountWide));
 assert(!r.options.some(x=>['Golden food','Post Office','Talents','Character & family levels'].includes(x.system)));
 assert(r.steps.length>0,metric+' has a shared upgrade route');const replay=structuredClone(raw.data);for(const step of r.steps){assert(!step.refills.length);for(const patch of step.patches)assert(!/_\d+$/.test(patch.path[0]),'No personal patch');c.ReviewTargetModel.apply(replay,step);}
 const after=s.parse(replay),before=[];for(const ch of p.characters){if([39,40,70,71,118,119].includes(Number(ch.mapIndex)))continue;try{const value=c.ReviewTargetMetrics.evaluate(p,ch.playerId,metric,raw.data,M).value;if(value>0)before.push({id:ch.playerId,value});}catch{}}
 const expected=before.reduce((sum,e)=>sum+100*(c.ReviewTargetMetrics.evaluate(after,e.id,metric,replay,M).value/e.value-1),0)/before.length;
 assert(Math.abs(expected-r.after)<=1e-8*Math.max(1,Math.abs(expected)),metric+' exact cumulative shared-only replay');
}
assert.equal(JSON.stringify(raw),original);console.log('Shared-only damage, AFK and drop-rate plans: enabled targets, one result, no personal upgrades or refills, exact cumulative replay.');
