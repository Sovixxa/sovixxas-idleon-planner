const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const c={console};vm.createContext(c);
vm.runInContext('structuredClone=value=>JSON.parse(JSON.stringify(value))',c);
for(const f of ['prayer-math-engine.js','stat-todo-model.js','drop-rate-model.js','drop-source-info.js','drop-target-sources.js','drop-target-model.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),M=c.PrayerMath,S=c.DropTargetSources,build=S.build;
const parse=r=>M.parseData(c.structuredClone(r.data),r.charNames,r.companion,r.guildData,r.serverVars,r.accountCreateTime,r.tournament);
const initial=parse(raw),eqIndex=initial.account.equinox.upgrades.findIndex(s=>s.name==='Voter_Rights'),arcIndex=initial.account.arcade.shop.findIndex(s=>s.effect?.includes('Meritocracy_Bonus'));
assert(eqIndex>=0&&arcIndex>=0);
const active=structuredClone(raw);
active.serverVars={...active.serverVars,voteCategories:[27,27],voteCat2:[21,21],ArcadeBonuses:[arcIndex]};
for(const i of [22,24])S.set(active.data,['Spelunk',18,i],0);
S.set(active.data,['Dream',eqIndex+2],1);S.set(active.data,['ArcadeUpg',arcIndex],1);
const isVote=s=>(s.path[0]==='Spelunk'&&s.path[1]===18&&[22,24].includes(s.path[2]))||(s.path[0]==='Dream'&&s.path[1]===eqIndex+2)||(s.path[0]==='ArcadeUpg'&&s.path[1]===arcIndex);
S.build=(...args)=>{const built=build(...args);return {...built,candidates:built.candidates.filter(isVote)};};
try{
 const original=JSON.stringify(active),result=c.DropTargetModel.plan(active,0,Number.MAX_VALUE,M);
 assert.equal(result.options.length,4);assert.equal(result.issues.length,0);
 for(const option of result.options){
  assert(option.gain>0,option.name+' strengthens the active DR vote or sigil meritocracy');
  const replay=structuredClone(active);c.DropTargetModel.apply(replay.data,option);const p=parse(replay);
  assert.equal(M.getDropRate(p.characters[0],p.account,p.characters).dropRate,option.after);
  assert.equal(p.account.voteBallot.selectedBonus.index,27);assert.equal(p.account.voteBallot.selectedMeritocracyBonus.index,21);
 }
 assert.equal(JSON.stringify(active),original);
 const inactive=structuredClone(active);inactive.serverVars.voteCategories=[];inactive.serverVars.voteCat2=[];inactive.serverVars.ArcadeBonuses=[];
 const neutral=c.DropTargetModel.plan(inactive,0,Number.MAX_VALUE,M);
 assert.equal(neutral.options.length,3,'Inactive arcade upgrades are not purchase recommendations');
 assert(neutral.options.every(s=>s.gain===0),'Amplification does not invent a weekly reward');
}finally{S.build=build;}
// A neutral milestone can become valuable after another step. Use a small model
// to isolate the routing behavior, independent of changing game-save fixtures.
const oldLedger=c.DropRateModel.ledger;
S.build=()=>({candidates:[{id:'a',path:['a'],from:0,to:1,name:'A',sources:[],unit:'tier'},{id:'b',path:['b'],from:0,to:1,name:'B',sources:[],unit:'tier'}],notes:[]});
c.DropRateModel.ledger=()=>[];
try{
 const mock={parseData:data=>({characters:[{playerId:0,mapIndex:0}],account:data}),getDropRate:(_,a)=>({dropRate:100+10*a.a+20*a.a*a.b}),getGoldenFoodMulti:()=>({value:1,breakdown:{categories:[]}})};
 const data={a:0,b:0,PVStatList_0:[],EquipOrder_0:[],EquipQTY_0:[],Lv0_0:[],Prayers_0:[],CardEquip_0:[]};
 const result=c.DropTargetModel.plan({data},0,130,mock);
 assert.equal(result.options.find(s=>s.id==='b').gain,0);
 assert(result.reached);assert.equal(result.steps.length,2);assert.equal(result.after,130);
}finally{S.build=build;c.DropRateModel.ledger=oldLedger;}
console.log('Weekly amplification: four native paths, inactive-week guards, replay, unchanged votes, and cumulative neutral-option regression passed.');
