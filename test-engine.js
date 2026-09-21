const E=require('./engine.js');
function assert(x,msg){if(!x)throw new Error(msg)}
for(const [input,expected] of [['{"data":"cut off\\... (732 KB left)','This export is cut off'],['{"data":','This text is not valid JSON']]){
  let message='';try{E.parseInput(input);}catch(error){message=error.message;}
  assert(message.startsWith(expected),'Actionable error for incomplete exports');
}
const importFixture={Research:Array.from({length:19},()=>[])};
assert(E.parseInput('\uFEFF'+JSON.stringify(importFixture)).rawData.Research.length===19,'Import UTF-8 BOM files');
assert(E.SHAPE_OFFSETS[3].join(',')==='0,1,-1,18,-18','Organelle offsets');
assert(E.SHAPE_OFFSETS[6].length===16,'Mito area');
assert(E.SHAPE_OFFSETS[7].length===13,'Gigacyst area');
// Client quirk: Mito at col 15 can wrap +3 into next flat-index row.
const mito=E.footprint(6,15);
assert(mito && mito.includes(18),'Mito wrap placement should reproduce client');
// Plasmid +1 DOES have Lava's explicit wrap guard.
assert(E.footprint(1,17)===null,'Plasmid row wrap must be rejected');
// Organelle -1 at left edge must be rejected.
assert(E.footprint(3,18)===null,'Organelle left wrap must be rejected');
console.log('OK',E.VERSION,'mito@15',mito.join(','));
// Cached adjacency graphs are built from the initial arrangement, independent of later dead-square state.
const orgArr=[
  {type:3,anchor:91,cells:E.footprint(3,91)},
  {type:1,anchor:72,cells:E.footprint(1,72)} // body at 72/73 touches Organelle's -18-ish neighborhood through client rule
];
const orgBoost=E.organelleBoosted(orgArr);
assert(orgBoost instanceof Set,'Organelle boost set');
// Adjacent Viruses infect each other: both one-square bodies become infected slots.
const virArr=[{type:5,anchor:10,cells:[10]},{type:5,anchor:11,cells:[11]}];
const inf=E.infectedSlots(virArr);
assert(inf.has(10)&&inf.has(11)&&inf.size===2,'Adjacent viruses should infect each other');
// Runtime Cell EXP can level cells during a simulated operation.
const R=Array.from({length:19},()=>[]);R[7]=Array(20).fill(0);R[7][9]=11;R[14]=Array(180).fill(-1);R[14][77]=0;R[15]=Array(9).fill(0);R[16]=Array(9).fill(0);R[17]=Array(100).fill(0);R[18]=[];
R[15][0]=100;R[17][0]=1;R[17][10]=1; // Amoeba unlocked + Cell Biology, with banked XP.
const st=E.makeState(R,999,null,null);const ar=E.arrangementFromBoard(st);
const sim=E.simulateOne(st,ar,{seed:1,dpsOnly:true,useSteroid:false});
assert(sim.levelsGained>=1&&sim.runtimeLevels[0]>=1,'Banked Cell EXP should level during Jelly UI updates');
console.log('extra mechanics OK','virus infected',Array.from(inf).join(','),'runtime levels+',sim.levelsGained);
// Cells of Three adds one effective passive count for each full set of three.
const threeState=E.cloneState(st);threeState.upgrades[14]=1;
const triple=E.effectiveCounts(threeState,[0,0,3,0,0,0,0,0]);
assert(triple[2]===4,'Cells of Three boosts three Ribosomes to four effective passives');
assert(E.combatModel(threeState,[{type:2,anchor:19,cells:E.footprint(2,19)},{type:2,anchor:37,cells:E.footprint(2,37)},{type:2,anchor:55,cells:E.footprint(2,55)}]).effectiveCounts[2]===4,'Timed model applies Cells of Three');
console.log('Cells of Three regression OK');
// Partial tilings must allow skipping unusable slots.
const partialState=E.cloneState(st);partialState.upgrades[1]=1;
const index=E.buildPlacementIndex(partialState);
const mix=Array(9).fill(0);mix[1]=1;
const partial=E.tileMix(partialState,mix,index,E.seededRng(7));
assert(partial&&partial.length===1&&partial[0].type===1,'Partial Plasmid board tiles');
assert(E.tileMix(partialState,Array(9).fill(0),index,E.seededRng(7)).length===0,'Empty board legal');
const mixes=E.enumerateMixes(partialState,index.slots.length,80);
assert(mixes.some(m=>m.area>0&&m.area<index.slots.length),'Generator retains partial mixes');
assert(mixes.length<=80,'Mix cap');
const full=E.cloneState(st);for(let i=0;i<8;i++)full.upgrades[i]=1;
const began=Date.now();const fullMixes=E.enumerateMixes(full,164,260);
assert(fullMixes.length<=260&&Date.now()-began<5000,'Full unlock generation bounded');
assert(JSON.stringify(E.simulateMany(st,ar,{runs:8,seed:123}))===JSON.stringify(E.simulateMany(st,ar,{runs:8,seed:123})),'Seed reproducibility');
for(const useSteroid of [false,true]){
  const fixture=E.cloneState(st);fixture.upgrades[29]=useSteroid?1:0;
  const result=E.optimizeTimed(fixture,{timeMs:500,runs:8,damageScale:1,useSteroid});
  assert(result.stats.runs===8&&result.currentStats.runs===8,'Equal finalist run counts');
  assert(E.timedObjective(result.stats)>=E.timedObjective(result.currentStats),'Winner dominates reported baseline');
  if(E.arrangementKey(result.arrangement)===E.arrangementKey(result.current))assert(JSON.stringify(result.stats)===JSON.stringify(result.currentStats),'Identical board identical reported stats');
}
console.log('Search regressions OK');
// Every statically referenced UI element must exist, including next-move panels.
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
for(const [,id] of app.matchAll(/\$\('([^']+)'\)/g))assert(html.includes('id="'+id+'"')||app.includes('id="'+id+'"'),'Missing DOM element '+id);
// Cached fixed multiplier must preserve the original shot-by-shot formula.
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'engine.js'),'utf8');
const reference={module:{exports:{}},performance};
vm.runInNewContext(source.replace('runtimeBase*fixedDamageMulti*feverDamageMultiplier(state,elapsed,coldFirstTick)','runtimeBase*jellyDamageMultiplierForLevels(state,runtimeLevels,elapsed,coldFirstTick)'),reference);
for(const fever of [0,1,4,5]){
  const fixture=E.cloneState(st);fixture.fever=fever;fixture.upgrades[16]=6;
  const opts={seed:42,dpsOnly:true};
  assert(JSON.stringify(E.simulateOne(fixture,ar,opts))===JSON.stringify(reference.module.exports.simulateOne(fixture,ar,opts)),'Cached damage equivalence, fever '+fever);
}
console.log('UI wiring and cached damage regressions OK');
const launch=E.projectileLaunchPosition(6,0,1,-1);
assert(launch[0]===285&&launch[1]===55,'Mito jitter is pixels; only base offsets scale by 18');
const armorState=E.cloneState(st);armorState.obstruction=23;armorState.upgrades[36]=1;
const armor=[{type:4,anchor:18,cells:E.footprint(4,18)},{type:0,anchor:20,cells:[20]},{type:1,anchor:40,cells:E.footprint(1,40)}];
const armorRun=E.simulateOne(armorState,armor,{seed:2,trace:true});
const deaths=armorRun.events.filter(x=>x.type==='death');
assert(deaths.slice(0,4).every(x=>x.immunoid),'Immunoid body squares remain priority targets');
for(let i=1;i<5;i++)assert(Math.abs(deaths[i].time-deaths[i-1].time-3*E.bossAtkCD(23)/60)<1e-8,'Immunoid 3x delay');
assert(deaths.length===7,'One boss hit destroys one square');
assert(JSON.stringify(E.simulateOne(armorState,armor,{seed:2}))===JSON.stringify(E.simulateOne(armorState,armor.slice().reverse(),{seed:2})),'Board ordering cannot change the simulated result');
let posthumous=false;for(let seed=1;seed<=30&&!posthumous;seed++)posthumous=E.simulateOne(armorState,armor,{seed,trace:true}).events.some(x=>x.type==='posthumousHit');
assert(posthumous,'In-flight projectiles hit after core death');
const positive=E.simulateMany(st,ar,{runs:8,damageScale:1e8});assert(positive.clearRate===1,'Reachable boss clears');
const ci=E.clearConfidence({runs:96,clearRate:0});assert(ci[0]===0&&ci[1]>0&&ci[1]<.05,'Zero observed wins is not a proven zero probability');
console.log('Client-quirk combat regressions OK');
// Candidate generation and relocation must visibly explore legal, different layouts.
const searchState=E.cloneState(partialState),searchIndex=E.buildPlacementIndex(searchState),searchRng=E.seededRng(991);
const variants=Array.from({length:40},()=>E.generateLayout(searchState,searchIndex,searchRng));
assert(variants.every(a=>E.isLegalLayout(searchState,a)),'All generated layouts legal');
assert(new Set(variants.map(E.arrangementKey)).size>10,'Generator explores distinct layouts');
const movable=[{type:0,anchor:77,cells:[77]}];
const relocated=E.relocateLayout(searchState,searchIndex,E.seededRng(5),movable);
assert(relocated[0].anchor!==77&&E.rawCounts(relocated)[0]===1&&E.isLegalLayout(searchState,relocated),'Relocation preserves shape and changes anchor');
const previews=[];E.optimizeTimed(searchState,{runs:8,timeMs:500,damageScale:1,onProgress:p=>{if(p.arrangement)previews.push(E.arrangementKey(p.arrangement));}});
assert(new Set(previews).size>1,'Live progress includes distinct candidate boards');
const narrowSearch=E.optimizeTimed(searchState,{runs:8,timeMs:500,damageScale:1,searchSeed:1234,shortlist:16,mixLimit:80,finalists:4});
const wideSearch=E.optimizeTimed(searchState,{runs:8,timeMs:500,damageScale:1,searchSeed:1234,shortlist:48,mixLimit:80,finalists:4});
assert(wideSearch.simulated>narrowSearch.simulated,'Shortlist setting increases screened candidate breadth');
const roleState=E.cloneState(st);roleState.plots=Array.from({length:E.PLOTS.length},(_,i)=>i);for(let i=0;i<8;i++)roleState.upgrades[i]=1;
roleState.upgrades[13]=1;roleState.upgrades[14]=1;roleState.upgrades[15]=4;roleState.upgrades[16]=6;roleState.upgrades[35]=2;roleState.upgrades[36]=1;
const roleIndex=E.buildPlacementIndex(roleState),roleRng=E.seededRng(222),roleSeen=Array(9).fill(0);let proxSeen=false,supportSeen=false;
for(let i=0;i<60;i++){
  const arr=E.generateRoleAwareLayout(roleState,roleIndex,roleRng),score=E.layoutScore(roleState,arr);
  assert(E.isLegalLayout(roleState,arr),'Role-aware generated layout legal');
  E.rawCounts(arr).forEach((n,t)=>{if(n>0)roleSeen[t]++;});
  proxSeen=proxSeen||arr.some(p=>E.PROXIMITY_CORES.has(p.anchor));
  supportSeen=supportSeen||score.organelleBoosted>0||score.infectedSlots>0||E.rawCounts(arr)[4]>0;
}
assert(roleSeen.slice(0,8).every(Boolean),'Role-aware generation samples every playable cell type');
assert(proxSeen&&supportSeen,'Role-aware generation samples proximity/support layouts');
const improvable=E.generateRoleAwareLayout(roleState,roleIndex,E.seededRng(881));
const improved=E.localImproveLayout(roleState,roleIndex,E.seededRng(882),improvable,3);
assert(E.isLegalLayout(roleState,improved),'Local placement improvement remains legal');
assert(E.rawCounts(improved).join(',')===E.rawCounts(improvable).join(','),'Local placement improvement preserves the selected cell mix');
assert(E.layoutScore(roleState,improved).withJellyUpgrades>=E.layoutScore(roleState,improvable).withJellyUpgrades,'Local placement improvement does not reduce static combat');
console.log('Live layout search regressions OK');

// Account bonus decoding edge cases from the supplied client.
{
 const s=E.makeState([]);s.rawRoot={companion:{l:[]}};s.rawData={OptionsListAccount:[],ArcadeUpg:[],Atoms:[],BundlesReceived:{},Sushi:[[],[],[],[],[],[]]};
 s.rawData.ArcadeUpg[72]=101;
 const near=(x,y)=>assert(Math.abs(x-y)<1e-10,'bonus mismatch '+x+' / '+y);
 near(E.arcadeBloodcellBonus(s).value,10*101/201);
 s.rawRoot.companion.l=['27,0,0,0,0'];near(E.arcadeBloodcellBonus(s).value,20*101/201);
 s.rawRoot.companion.l=['27,0,0,0,1'];near(E.arcadeBloodcellBonus(s).value,10*101/201);
 s.rawData.OptionsListAccount[606]='27';near(E.arcadeBloodcellBonus(s).value,20*101/201);
 s.rawRoot.companion.l=['55,0,0,0,1'];near(E.companionGridBonus(s,55).value,20);
 s.rawData.OptionsListAccount[606]='55';near(E.companionGridBonus(s,55).value,15);
 s.rawRoot.companion.l=['0,0,0,0,0'];assert(!E.companionGridBonus(s,0).known,'unknown active character gate');
 s.rawData.Lv0=Array(15).fill(0);near(E.companionGridBonus(s,0).value,0);s.rawData.Lv0[14]=2;near(E.companionGridBonus(s,0).value,1);
 s.research[0]=[];s.research[0][186]=3;assert(E.bloodcellBonuses(s).dailyAttempts===5,'daily tries uses raw grid level');
 delete s.rawData.Atoms;assert(!E.bloodcellBonuses(s).known,'missing atoms must be flagged');
 s.upgrades[16]=1;s.fever=0;s.upgrades[12]=0;near(E.jellyDamageMultiplier(s,10),E.jellyDamageMultiplier(s,0));
 s.upgrades[12]=1;near(E.jellyDamageMultiplier(s,10)/E.jellyDamageMultiplier(s,0),1.1);
 assert(E.cellDetails(s,[]).length===8,'all eight cell references render');
}
console.log('Account bonus regressions OK');

// Revival Shots are immediate clicks in the shipped operation UI. The optimal-mode
// simulator must restore the square in the very update that Critical kills it.
{
 const s=E.makeState(Array.from({length:19},()=>[]));
 s.obstruction=12;s.upgrades[0]=1;s.upgrades[35]=1;s.upgrades[36]=1;
 const r=E.simulateOne(s,[{type:0,anchor:77,cells:[77]}],{seed:77,damageScale:.000001,maxSeconds:36.6,trace:true});
 const death=r.events.find(x=>x.type==='death'),revive=r.events.find(x=>x.type==='revive');
 assert(death&&revive&&death.time===revive.time&&revive.immediate,'default revive occurs in the same operation update');
}
console.log('Immediate revive regression OK');

// The browser practice lab feeds explicit revival clicks into the same combat loop.
{
 const s=E.makeState(Array.from({length:19},()=>[]));
 s.obstruction=12;s.upgrades[0]=1;s.upgrades[35]=1;s.upgrades[36]=1;
 const r=E.simulateOne(s,[{type:0,anchor:77,cells:[77]}],{seed:77,damageScale:.000001,maxSeconds:40,autoRevive:false,manualRevives:[{time:36.4,square:77}],trace:true});
 assert(r.events.some(x=>x.type==='revive'&&x.manual&&x.square===77),'manual practice revive is applied by the combat loop');
}
console.log('Manual practice action regression OK');

// The upgrade roadmap must keep one-off and board-changing effects visible instead
// of treating them as zero-value damage upgrades.
{
 const s=E.cloneState(searchState),roadmap=E.upgradeRoadmap(s,E.arrangementFromBoard(s),{damageScale:1});
 assert(roadmap.length>0&&roadmap.every(x=>Number.isFinite(x.damageRatio)&&Number.isFinite(x.currencyRatio)),'upgrade roadmap computes damage and currency math');
 const unlockState=E.makeState(Array.from({length:19},()=>[])),unlockRoadmap=E.upgradeRoadmap(unlockState,[],{damageScale:1});
 assert(unlockRoadmap.some(x=>x.oneOff&&x.note),'upgrade roadmap explains a reachable one-off effect');
}
console.log('Upgrade roadmap regressions OK');
