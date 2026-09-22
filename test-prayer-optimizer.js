'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const errors=[];
const c={console:{log(){},warn(){},error:(...args)=>errors.push(String(args[0]))},structuredClone,setTimeout};
vm.createContext(c);
for(const file of ['prayer-math-engine.js','prayer-model.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c,{filename:file});
const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),original=JSON.stringify(raw),M=c.PrayerMath,P=c.PrayerModel;
const ctx=P.context(raw),id=ctx.characters[0].playerId;
assert.equal(errors.length,0,'Full JSON must parse without silently failed sections');
assert.equal(ctx.slots.base,8);assert.equal(ctx.slots.gem,4);assert.equal(ctx.slots.total,12);
const lower=JSON.parse(JSON.stringify(raw));const gems=JSON.parse(lower.data.GemItemsPurchased);gems[114]=0;lower.data.GemItemsPurchased=gems;
assert.equal(P.slots(lower,M).total,8);gems[114]=2;assert.equal(P.slots(lower,M).total,10);
delete lower.data.GemItemsPurchased;assert.equal(P.slots(lower,M).total,null);
const empty=P.evaluate(ctx,id,[]),sampler=P.evaluate(ctx,id,[9]);
assert.equal(empty.sample,90);assert.equal(sampler.sample,90,'Already-capped sample rate must not show a fake gain');
assert.equal(P.evaluate(ctx,id,[14]).dungeon,1,'Double rewards consume double passes');
const noBits={...ctx.account,gaming:{...ctx.account.gaming,superbitsUpgrades:[]}};
const plain={...ctx,account:noBits,cache:new Map()};
const base=P.evaluate(plain,id,[]),brain=P.evaluate(plain,id,[0]);
const prayer0=ctx.prayers.find(p=>p.prayerIndex===0),curse0=Math.round(prayer0.x2*(1+(prayer0.level-1)/10));
assert(Math.abs(brain.stats.monsterHp/base.stats.monsterHp-(1+curse0/100))<1e-10);
const curseOnly={...plain,account:{...plain.account,prayers:plain.account.prayers.map(p=>p.prayerIndex===6?{...p,x1:0}:p)},cache:new Map()};
const precise=P.evaluate(curseOnly,id,[6]),prayer6=ctx.prayers.find(p=>p.prayerIndex===6),curse6=Math.round(prayer6.x2*(1+(prayer6.level-1)/10));
assert(precise.damage<base.damage&&precise.damage/base.damage>1-curse6/100,'Damage softcaps must be applied after the prayer curse');
const floored=x2=>P.evaluate({...curseOnly,account:{...curseOnly.account,prayers:curseOnly.account.prayers.map(p=>p.prayerIndex===6?{...p,x2}:p)},cache:new Map()},id,[6]).damage;
assert.equal(floored(100),floored(1000),'Larger curses past the damage floor must not lower it further');
const giants=P.evaluate(plain,id,[5]),glitter=P.evaluate(plain,id,[5,18]),prayer18=ctx.prayers.find(p=>p.prayerIndex===18),curse18=Math.round(prayer18.x2*(1+(prayer18.level-1)/10));
assert(Math.abs(glitter.giants/giants.giants-1/(1+curse18/100))<1e-10);
assert.equal(P.evaluate(plain,id,[18]).giants,0,'Glitterbug requires Tachion');
const snitch=P.evaluate(plain,id,[3]);assert.equal(snitch.stats.shinyDivisor,1+Math.round(ctx.prayers.find(p=>p.prayerIndex===3).x2*5.9));
const long={...ctx,characters:ctx.characters.map(ch=>({...ch,savedSeconds:24*3600})),cache:new Map()};
assert.equal(P.evaluate(long,id,[2]).timeFactor,10/24);
const missing={...ctx,characters:ctx.characters.map(ch=>({...ch,savedSeconds:null})),cache:new Map()};
assert.equal(P.evaluate(missing,id,[2]).exp,null);
// Execute the installed game's own prayer contribution function with controlled state.
if(fs.existsSync('../audit/N.js')){
 const source=fs.readFileSync('../audit/N.js','utf8'),start=source.indexOf('_customBlock_prayersReal=function(e,t){')+'_customBlock_prayersReal='.length,end=source.indexOf('},p._customBlock_eventStatus',start)+1;
 assert(start>30&&end>start);
 const game={Math,c:{asNumber:Number},m:{_customBlock_GamingStatType:(_,i)=>game.bits.includes(i)?1:0}};
 game.a={engine:{getGameAttribute:key=>game.attributes[key]}};vm.createContext(game);
 const fn=vm.runInContext('('+source.slice(start,end)+')',game);
 for(const bits of [[],[9],[39],[53],[9,39,53]])for(const equipped of [[],[1,9,18]]){
  game.bits=bits;game.attributes={DNSM:{h:{}},PrayersActive:equipped.length?equipped:[-1,-1,-1],PrayersUnlocked:ctx.account.prayers.map(p=>p.level),CustomLists:{h:{PrayerInfo:ctx.account.prayers.map(p=>['','','',p.x1,p.x2])}}};
  const labels={9:'No_more_Praying',39:'Prayers_Begone',53:'Prayers_Aint_Meta'};
  const account={prayers:ctx.account.prayers,gaming:{superbitsUpgrades:bits.map(i=>({name:labels[i],unlocked:true}))}};
  for(const p of ctx.prayers){const actual=M.getPrayerBonusAndCurse(equipped.map(i=>ctx.account.prayers[i]),p.name,account);assert.equal(actual.bonus,fn(p.prayerIndex,0));assert.equal(actual.curse,fn(p.prayerIndex,1));}
 }
}
(async()=>{
 const result=await P.analyze(ctx,id,'combat');
 assert(result.optimized>=result.baseline);assert(result.selected.length<=12);assert(!result.selected.includes(5),'No mandatory giant prayer for AFK');
 for(const row of result.rows)if(row.before>0&&row.after!==null){assert(Math.abs(row.buffChange+row.curseChange+row.passiveChange-row.change)<1e-7,'Contributions must sum to net gain');}
 const printing=await P.analyze(ctx,id,'printing');assert.equal(printing.selected.length,0);assert.equal(printing.rows.find(r=>r.index===9).verdict,'Not needed');
 const trapping=await P.analyze(ctx,id,'trapping');assert(trapping.selected.includes(3));
 const minigame=await P.analyze(ctx,id,'minigame');assert(!minigame.selected.includes(10),'Per-play cost outweighs the reward on this save');
 assert(P.targets(ctx).areas.some(a=>a.mapId===216&&a.target==='caveC'),'Include dynamic combat targets found in the JSON');
 const savedCharacter=JSON.stringify(ctx.characters[8]);
 const plan=P.planningContext(ctx,8,'combat',{mode:'plan',mapId:1});
 const first=P.evaluate(plan,8,[]);
 assert(Number.isFinite(first.kills)&&first.kills>0,'A saved skiller must project combat output in a chosen area');
 assert.equal(first.timeFactor,1);
 assert.equal(plan.characters[8].afkType,'FIGHTING');
 assert.equal(plan.characters[8].mapIndex,1);
 const second=P.planningContext(ctx,8,'combat',{mode:'plan',mapId:302});
 assert.notEqual(P.evaluate(second,8,[]).stats.monsterHp,first.stats.monsterHp,'Planned maps must have separate cached results');
 const projection=await P.analyze(ctx,8,'combat',()=>{},{mode:'plan',mapId:1});
 assert.equal(projection.planning.mapId,1);assert(Number.isFinite(projection.optimized));
 const critter=P.targets(ctx).critters[0];
 const noTraps={...ctx,d:{...ctx.d,PldTraps_8:[]},plans:new Map()};
 const trapPlan=P.planningContext(noTraps,8,'trapping',{mode:'plan',critter:critter.id});
 assert(Number.isFinite(P.evaluate(trapPlan,8,[3]).shinies),'Planning shinies must work before traps are placed');
 const noPlays={...ctx,account:{...ctx.account,accountOptions:ctx.account.accountOptions.map((v,i)=>i===33?0:v)},plans:new Map()};
 const miniPlan=P.planningContext(noPlays,8,'minigame',{mode:'plan',mapId:54});
 assert(P.evaluate(miniPlan,8,[10]).minigame>0,'Planning keeps per-play output when today’s plays are exhausted');
 assert.equal(JSON.stringify(ctx.characters[8]),savedCharacter,'Planning must not change the saved character');
 assert.throws(()=>P.planningContext(ctx,8,'combat',{mode:'plan',mapId:999999}),/supported planning area/);
 assert.equal(JSON.stringify(raw),original,'The imported JSON must remain unchanged');
 const UI=require('./prayer-optimizer.js');const html=UI.resultHtml(result);
 assert(result.rows.every(row=>row.bonusText.length>0));
 assert(html.includes('Use '));assert(html.includes('Curse contribution'));assert(!/check in game|try and compare|data-prayer-hours|data-prayer-slots|Math score/i.test(html));
 assert(html.includes('12 available'));
 assert.throws(()=>P.context({}),/Prayer levels/);
 console.log('Prayer optimizer: JSON decoding, source-function parity, slots, combined tradeoffs, saved cap, passive loss, sample cap, trapping, minigame costs and non-mutation pass.');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
