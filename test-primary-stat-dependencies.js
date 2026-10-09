'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c={console:{log(){},warn(){},error(){},debug(){}},structuredClone};c.self=c;
vm.createContext(c);c.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f}));
c.postMessage=()=>{};c.importScripts('review-target-worker.js');c.ConnectedTrace.disabled=true;
const M=c.PrayerMath,raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),original=JSON.stringify(raw);
const clone=x=>JSON.parse(JSON.stringify(x));
const parse=r=>M.parseData(structuredClone(r.data),r.charNames,r.companion,r.guildData,r.serverVars,r.accountCreateTime,r.tournament);
const set=(r,key,fn)=>{const str=typeof r.data[key]==='string',v=str?JSON.parse(r.data[key]):r.data[key];fn(v);r.data[key]=str?JSON.stringify(v):v;};
const p=parse(raw),stats=q=>q.characters.map(ch=>c.ConnectedPrimaryStats.calculate(ch,q.account,q.characters,M,false).map(s=>s.computed));
const near=(a,b)=>assert(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(b)),`${a} != ${b}`);

// Current levels, not the UI's historical StatList cache, feed account helpers.
for(const ch of p.characters)assert.equal(p.account.charactersLevels[ch.playerId].level,ch.level);
const stale=clone(raw);set(stale,'PVStatList_9',v=>{v[4]=1;});
assert.deepEqual(stats(parse(stale)),stats(p));
for(const ch of p.characters.filter(ch=>ch.class==='Elemental_Sorcerer')){
 const row=ch.addedLevelsBreakdown.categories[0].sources.find(x=>x.name==='Family');
 assert.equal(row.value,Math.floor(M.getUpdatedFamilyBonus(ch,p.account.charactersLevels)));
 assert.equal(row.value,22);
}

// Every account-wide talent sees BOTH super-talent presets, even an empty active preset.
const results={};
for(const mode of ['neither','selected','other']){
 const r=clone(raw);set(r,'Spelunk',s=>{for(const i of [21,33])s[i]=s[i].filter(id=>id!==209);if(mode!=='neither')s[mode==='selected'?21:33].push(209);});
 const q=parse(r);results[mode]=stats(q)[0];
}
assert.deepEqual(results.selected,results.other);assert.notDeepEqual(results.neither,results.other);
const owner={addedLevels:10,superTalentsInfo:{talents:[],allPresetTalents:[{talentIndex:209,presetIndex:1}],bonus:125}};
assert.equal(M.getAllTalentAddedLevels(209,owner,owner),135);
assert.equal(M.getAllTalentAddedLevels(149,owner,owner),0);

// Doot gates only its activation path; research and actual links remain independent.
const ac=clone(p.account),ch=clone(p.characters[0]);ac.hole.godsLinks=[];
ac.research.gridSquares[173].bonuses[0]=0;
const added=()=>M.getTalentAddedLevels(ch.talents,0,-1,-1,0,0,0,ac,ch).breakdown.categories[0].sources.find(x=>x.name==='God Bonus').value;
ac.companions.list[0].acquired=true;ch.skillsInfo.divinity.level=1;assert.equal(added(),0);
ch.skillsInfo.divinity.level=2;assert(added()>0);
ac.companions.list[0].acquired=false;assert.equal(added(),0);
ac.research.gridSquares[173].bonuses[0]=1;assert(added()>0);

// Extract standalone client functions; never execute the full client.
const source=fs.readFileSync(process.env.IDLEON_CLIENT_PATH||'../audit/N.js','utf8');
function extract(name){const start=source.indexOf(name+'=')+name.length+1;assert(start>name.length);let depth=0,quote='',escape=false;
 for(let i=source.indexOf('{',start);i<source.length;i++){const x=source[i];if(quote){if(escape)escape=false;else if(x==='\\')escape=true;else if(x===quote)quote='';continue;}
  if(x==='"'||x==="'"){quote=x;continue;}if(x==='{')depth++;if(x==='}'&&!--depth)return source.slice(start,i+1);}
 throw Error('Unterminated '+name);
}
const tables=require('./inspect-bonus-freshness').catalogs(source).values;
assert.deepEqual(JSON.parse(fs.readFileSync('vendor/idleon-toolbox/data/website-data/shared-data.json','utf8')).research,tables.get('Research'));
const attrs={Research:Array.from({length:8},()=>[]),CustomLists:{h:{Research:tables.get('Research')}}};
const nativeJelly=vm.runInNewContext('('+extract('_customBlock_JellyOperation')+')',{a:{engine:{getGameAttribute:n=>attrs[n]}},c:{asNumber:Number}});
for(const index of [4,10,28,33,36,50,51,57,60])for(const progress of [index,index+1]){
 attrs.Research[7][9]=progress;assert.equal(M.getJellyReward({research:{jellyObstruction:progress}},index),Number(nativeJelly('RoG_BonusQTY',index,0)));
}

// Exalted stamps retain the native /100 inside the percentage pool.
const a=clone(p.account);a.research.jellyObstruction=50;const stamp=M.getExaltedStampBonus(a).value;
a.research.jellyObstruction=51;near(M.getExaltedStampBonus(a).value-stamp,.01);
// Emperor rounding can mask the reward; use enough earned rewards to cross it.
a.accountOptions[369]=2500;a.research.jellyObstruction=28;
const emperorBefore=M.getEmperor({},a);a.research.jellyObstruction=29;const emperorAfter=M.getEmperor({},a);
near(emperorAfter.bonusMulti.totalValue-emperorBefore.bonusMulti.totalValue,.02);
assert(emperorAfter.bonuses.some((b,i)=>b.totalBonus>emperorBefore.bonuses[i].totalBonus));

const ribbonPrefix='"RibbonBonus"==e)return ',ri=source.indexOf(ribbonPrefix)+ribbonPrefix.length;
const ribbonExpr=source.slice(ri,source.indexOf(';',ri));
const ribbonEnv={m:{_customBlock_GetSetBonus:()=>M.getArmorSetBonus(a,'EMPEROR_SET'),_customBlock_Dreamstuff:()=>a.equinox.challenges[73].current===-1?1:0},q:{_customBlock_JellyOperation:()=>a.research.jellyObstruction>60?5:0}};
const ribbon=vm.runInNewContext('(function(t){return '+ribbonExpr+'})',ribbonEnv);
for(const progress of [60,61])for(const rank of [0,19,20,39,40]){a.research.jellyObstruction=progress;near(M.getRibbonBonus(a,rank),ribbon(rank));}

// Native Meritocracy has a per-character W7 gate and an account voting gate.
const env={a:{engine:{getGameAttribute:n=>({KillsLeft2Advance:Array.from({length:251},()=>[env.lock]),OptionsListAccount:env.opt}[n])}},c:{asNumber:Number,getCurrentSceneName:()=> 'World'},
 m:{_customBlock_Companions:()=>0,_customBlock_Thingies:()=>0,_customBlock_SushiStuff:()=>0,_customBlock_Summoning:()=>0},p:{_customBlock_ArcadeBonus:()=>0},q:{_customBlock_JellyOperation:()=>env.jelly},opt:[],lock:0,jelly:0};
const nativeMerit=vm.runInNewContext('('+extract('_customBlock_Summoning2')+')',env);env.m._customBlock_Summoning2=nativeMerit;
const empty={accountOptions:[],serverVars:{voteCat2:[20,20,21,22]},research:{jellyObstruction:0}};
for(const lock of [0,1])for(const flag of [0,1])for(const jelly of [0,1]){
 env.lock=lock;env.opt[472]=flag;env.jelly=jelly;empty.accountOptions[472]=flag;empty.meritocracyAccessible=!lock;empty.research.jellyObstruction=jelly?34:33;
 near(M.getVoteBallot({},empty).meritocracyMult,nativeMerit('MeritocBonuszMulti',0,0));
}
for(const selected of [9,20,21,22]){
 const r=clone(raw);r.serverVars.voteCat2=[selected,20,21,22];const q=parse(r),locked={...q.characters[0],galleryUnlocked:false},snapshot=JSON.stringify(q.account);
 const scoped=M.getCharacterStatAccount(q.account,locked);
 assert.equal(scoped.voteBallot.meritocracyMult,0);
 if(selected===20)assert(M.getVialsBonusByStat(scoped.alchemy.vials,'AllStatPCT')<M.getVialsBonusByStat(q.account.alchemy.vials,'AllStatPCT'));
 if(selected===21)assert(scoped.alchemy.p2w.sigils[0].bonus<q.account.alchemy.p2w.sigils[0].bonus);
 if(selected===9)assert(scoped.voteBallot.voteMulti<q.account.voteBallot.voteMulti);
 assert.equal(JSON.stringify(q.account),snapshot,'Character context must not mutate shared account bonuses');
}
for(const index of [4,57]){
 const r=clone(raw);set(r,'Research',s=>{s[7][9]=index;});const before=parse(r).account.research.gridPTSearned;
 set(r,'Research',s=>{s[7][9]=index+1;});assert.equal(parse(r).account.research.gridPTSearned,before+1);
}

// Traverse the full parser, not only isolated helpers: Emperor -> summoning ->
// meals, Meritocracy -> vials, and ribbons -> meals -> golden food -> all stats.
for(const index of [28,33,60]){
 const r=clone(raw);r.serverVars.voteCat2=[20,20,21,22];set(r,'OptLacc',o=>{o[369]=2500;});
 set(r,'Research',s=>{s[7][9]=index;});const before=stats(parse(r))[0];
 set(r,'Research',s=>{s[7][9]=index+1;});const after=stats(parse(r))[0];
 after.forEach((value,i)=>assert(value>before[i],`Reward ${index} must reach primary stat ${i}`));
}

// The bubble map and account review consume the same corrected stat worker.
const mapContext={...c};mapContext.self=mapContext;let mapped;mapContext.postMessage=x=>mapped=x;
vm.createContext(mapContext);mapContext.importScripts=()=>{};vm.runInContext(fs.readFileSync('strength-sources-worker.js','utf8'),mapContext);
mapContext.onmessage({data:raw});assert(!mapped.error,mapped.error);
const expected=stats(p);mapped.characters.forEach((char,i)=>['str','agi','wis','luk'].forEach((key,j)=>assert.equal(char.stats[key].computed,expected[i][j])));
assert.equal(JSON.stringify(raw),original);
console.log('Primary-stat dependency fixes: native Jelly/Meritocracy/ribbon oracles, family feedback, live levels, both presets, Divinity gates, reward budgets and 44 bubble-map totals passed.');
