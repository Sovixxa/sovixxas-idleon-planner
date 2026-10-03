const fs=require('fs'),vm=require('vm'),assert=require('assert');
const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8'));
function worker(file){const c={console:{log(){},warn(){},error(){},debug(){}},structuredClone};c.self=c;c.window=c;vm.createContext(c);c.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f}));c.postMessage=v=>c.output=structuredClone(v);c.importScripts(file);return c;}
const source=worker('account-review-worker.js');source.onmessage({data:raw});
const actions=source.output.report.priorities.filter(a=>a.preview);
const w=worker('account-review-impact-worker.js');

const data=typeof raw.data==='string'?JSON.parse(raw.data):raw.data||raw;
const read=v=>typeof v==='string'?JSON.parse(v):v;
const h=read(data.Holes),sum=read(data.Summon);
if(h?.[31]?.[1]?.[16]!=null){const from=h[31][1][16];w.onmessage({data:{raw,actions:[{kind:'fountain',id:36,water:1,index:16,from,to:from+1}],character:0,goal:'damage'}});assert(!w.output.error,w.output.error);assert(w.output.result.after>w.output.result.before);}
if(sum?.[0]?.[79]!=null){const from=sum[0][79];w.onmessage({data:{raw,actions:[{kind:'summoning',id:79,from,to:from+1}],character:0,goal:'damage'}});assert(!w.output.error,w.output.error);assert(w.output.result.after>w.output.result.before);}
const before=JSON.stringify(raw);
const damage=actions.filter(a=>a.preview.kind==='bubble'&&['QUICK SLAP','BIG MEATY CLAWS','NAME I GUESS'].includes(a.sourceName));
assert(damage.length>=2);
function preview(list,goal='damage',includeLevels=false){w.onmessage({data:{raw,actions:list.map(a=>a.preview),character:0,goal,includeLevels}});assert(!w.output.error,w.output.error);return w.output.result;}
const result=preview(damage);assert(result.after>result.before,'Damage upgrades must change modeled total');assert(Math.abs(result.relative-(result.after/result.before-1)*100)<1e-10);
const single=preview([damage[0]]);assert(result.after>=single.after);
const cap=actions.find(a=>a.preview.kind==='stamp'&&a.preview.cap);assert(cap);
const capResult=preview([cap]);assert.equal(capResult.before,capResult.after,'Cap alone grants no stats');
preview([cap],'damage',true);
for(const goal of ['afk','exp','drop','samples','skill','cooking'])assert(Number.isFinite(preview([damage[0]],goal).after),goal);
w.onmessage({data:{raw,actions:[{...damage[0].preview,from:-1}],character:0,goal:'damage'}});assert(w.output.error);
assert.equal(JSON.stringify(raw),before,'Preview must not mutate save');
console.log('Goal preview: combined damage, primary-stat recalculation, cap-only behavior, conditional levels, all goal metrics, stale-action rejection and save purity pass.');
