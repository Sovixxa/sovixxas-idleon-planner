'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),T=require('./outpost-talents'),R=require('./outpost-eta'),D=require('./outpost-eta-data');
const b={console,structuredClone,setTimeout,clearTimeout};b.self=b;b.window=b;vm.createContext(b);vm.runInContext(fs.readFileSync('dashboard-math.js','utf8'),b);
const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),d=typeof raw.data==='string'?JSON.parse(raw.data):raw.data,parsed=b.DashboardMath.parseData(d,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament),rows=R.snapshot(raw,D).rows;
const cs=b.DashboardMath.getOutpostCombatContext(parsed.account,parsed.characters,d,[116]);
const before=JSON.stringify(cs),result=T.analyze(rows,cs,{mapId:116});
assert(!result.error,result.error);assert.equal(cs.length,2);assert.equal(result.scenarios.length,1);assert.equal(cs[0].talentPlan.budget,895);assert.equal(cs[0].talentPlan.sources.Merits,100);
for(const s of result.scenarios){for(const c of cs){const a=s.allocations[c.index];assert.equal(Object.keys(a).length,15);assert(Object.values(a).every(Number.isSafeInteger));assert(Object.values(a).reduce((s,v)=>s+v,0)<=c.talentPlan.budget);for(const t of c.talentPlan.talents)assert(a[t.id]>=0&&a[t.id]<=t.cap);if(c.index===s.active.index)for(const id of [225,226,228,234])assert(a[id]>=1);for(const id of [228,234])assert(a[id]>=c.talentPlan.talents.find(t=>t.id===id).current);}
 for(const id of [203,227])assert.equal(s.allocations[s.active.index][id],s.active.talentPlan.talents.find(t=>t.id===id).current);
 const expected=Math.max(...cs.map(c=>T.warbound(s.active,c,s.allocations[c.index][231])));assert.equal(s.character.warbound,expected);
 assert(s.prediction.eta<=s.baseline.eta);
}
assert.equal(JSON.stringify(cs),before,'Never mutate saved talents');
assert.match(T.html(result),/Only one character fights actively/);assert.equal((T.html(result).match(/points<\/b>/g)||[]).length,30);
assert(T.analyze(rows,[cs[0]],{mapId:116}).error);
const invalid=structuredClone(cs);invalid[0].talentPlan.budget=1;assert(T.analyze(rows,invalid,{mapId:116}).error);
// Brute-force both Warbound and RI choices in a small budget to independently
// verify the search shortcut, including diminishing returns and zero points.
const Model=require('./outpost-eta-model'),small=structuredClone(cs);
for(const c of small){c.talentPlan.budget=8;c.talentPlan.superSlots=0;c.talentPlan.savedSupers=[];c.talentPlan.otherSupers=[];for(const t of c.talentPlan.talents){t.cap=8;t.current=0;t.added=0;t.normalAdded=0;t.superActive=false;t.superOther=false;t.superBonus=0;}c.guardianEquipped=false;c.guardianDuration=0;c.talentPlan.sharedWarboundAdded.fill(0);c.maps=[{id:116,supported:true,count:20,respawn:8,hp:100,damage:1000,skillDamage:1000,hitChance:1,autoWaveSeconds:4}];}
const smallRow={id:116,world:3,remaining:10000,militia:1},optimized=T.analyze([smallRow],small);
for(const active of small.slice(0,1)){let best=Infinity;const other=small.find(c=>c!==active);for(let support=0;support<=0;support++)for(let war=0;war<=4;war++)for(let ri=0;ri<=4-war;ri++){
 const allocations=Object.fromEntries(small.map(c=>[c.index,Object.fromEntries(T.order.map(id=>[id,0]))]));for(const id of [225,226,228,234])allocations[active.index][id]=1;allocations[other.index][231]=support;allocations[active.index][231]=war;allocations[active.index][229]=ri;
 const prediction=Model.estimateAutomatic(smallRow,T.variant(active,small,allocations),!!active.knowsDI);if(prediction.eta!=null)best=Math.min(best,prediction.eta);
}assert(Math.abs(optimized.scenarios.find(s=>s.active.index===active.index).prediction.eta-best)<1e-7);}
console.log('Joint RG talent plan: real budget, caps, fixed Spelunking support, non-stacking Warbound, preserved combat points, full 15-skill layouts, no save mutation and exhaustive small-budget optimality passed.');
console.log(JSON.stringify({active:result.best.active.name,budget:cs[0].talentPlan.budget,warbound:result.best.character.warbound,days:result.best.prediction.eta/86400,allocations:result.best.allocations}));

// Independently evaluate the RG-specific TotalTalentPoints branch from the client.
const nativeSource=fs.readFileSync('../audit/live-N-outpost-2026-10-07.js','utf8');
const marker=nativeSource.indexOf('1+(m._customBlock_Thingies("OrbletMarketBonus",2,0)');
assert(marker>0);const start=nativeSource.lastIndexOf('Math.floor(',marker);let depth=0,end=start;
for(let i=start+'Math.floor'.length;i<nativeSource.length;i++){if(nativeSource[i]==='(')depth++;else if(nativeSource[i]===')'&&--depth===0){end=i+1;break;}}
const expr=nativeSource.slice(start,end),p=cs[0].talentPlan.sources,parse=v=>typeof v==='string'?JSON.parse(v):v,g=parse(d.RoyalG),armory=require('./vendor/idleon-toolbox/data/website-data/armoryUpgrades.json'),market=require('./vendor/idleon-toolbox/data/website-data/shared-data.json').orbletMarket;
const nativeBudget=vm.runInNewContext(expr,{Math,d:[0,0,0,0,0],c:{asNumber:Number},a:{engine:{getGameAttribute:key=>{assert.equal(key,'Tasks');return parsed.account.tasks;}}},q:{_customBlock_JellyOperation:(key,id)=>parsed.account.research.jellyObstruction>id?(id===6?15:20):0},m:{
 _customBlock_Thingies:(key,id)=>Math.floor(Number(g[23][id])*market[id].bonusPerLevel),
 _customBlock_Spelunk:(key,id)=>key==='ShopUpgBonus'?parsed.account.spelunking.upgrades[id].bonus:Number(parse(d.Spelunk)[0][id])>=1?1:0,
 _customBlock_Summoning:(key,id)=>parsed.account.grimoire.upgrades[id].bonus,
 _customBlock_Windwalker:(key,id)=>parsed.account.compass.upgrades[id].bonus,
 _customBlock_Companions:id=>p.Companion,
 _customBlock_RoyalG:(key,id)=>Number(g[2][id])*armory[id].bonusPerLevel
}});
assert.equal(nativeBudget,cs[0].talentPlan.budget);
console.log('RG talent budget matches the actual client TotalTalentPoints expression.');

const tooSmall=structuredClone(small);tooSmall.forEach(c=>c.talentPlan.budget=3);assert(T.analyze([smallRow],tooSmall).error);
const noUnlock=structuredClone(small);noUnlock[0].talentPlan.talents.find(t=>t.id===225).cap=0;assert(T.analyze([smallRow],noUnlock).error);
console.log('Access skills, protected Orb/orblet investment and infeasible-reserve handling passed.');

// Saved supers occupy slots on every page, not just the RG page. Free slots
// can boost clearing without charging their bonus levels to the point budget.
const freeSupers=structuredClone(small);for(const c of freeSupers){c.talentPlan.superSlots=1;c.talentPlan.superBonus=50;}
const superPlan=T.analyze([smallRow],freeSupers);assert(!superPlan.error);
assert(superPlan.best.prediction.eta<optimized.best.prediction.eta);
for(const c of superPlan.characters){assert(c.talentPlan.newSupers.length<=1);for(const id of c.talentPlan.newSupers){const t=c.talentPlan.talents.find(t=>t.id===id);assert(t.superActive);assert.equal(t.added,50);assert.equal(t.superBonus,50);assert(superPlan.best.allocations[c.index][id]>=1);}}
const occupied=structuredClone(freeSupers);for(const c of occupied)c.talentPlan.savedSupers=[167];
const occupiedPlan=T.analyze([smallRow],occupied);assert(occupiedPlan.characters.every(c=>c.talentPlan.newSupers.length===0));
assert.equal(occupiedPlan.best.prediction.eta,optimized.best.prediction.eta);
// A Warbound super in the opposite preset must still contribute exactly once
// to account-wide Warbound, while local effective levels stay preset-specific.
const crossRaw=structuredClone(d),sp=parse(crossRaw.Spelunk),owner=cs[1],ownSlot=20+owner.index+12*owner.talentPlan.preset,otherSlot=20+owner.index+12*(1-owner.talentPlan.preset);
sp[ownSlot]=parse(sp[ownSlot]).map(id=>Number(id)===231?-1:id);sp[otherSlot]=parse(sp[otherSlot]);const free=sp[otherSlot].indexOf(-1);assert(free>=0);sp[otherSlot][free]=231;crossRaw.Spelunk=sp;
const crossParsed=b.DashboardMath.parseData(crossRaw,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);
const cross=b.DashboardMath.getOutpostCombatContext(crossParsed.account,crossParsed.characters,crossRaw,[116]);
assert.equal(cross[0].talentPlan.sharedWarboundAdded[owner.index],cs[0].talentPlan.sharedWarboundAdded[owner.index]);
const moved=cross[1].talentPlan.talents.find(t=>t.id===231);assert.equal(moved.superActive,false);assert.equal(moved.superOther,true);assert.equal(moved.superBonus,0);
assert.match(T.html(superPlan),/ADD SUPER/);assert.match(T.html(result),/KEEP SUPER/);
console.log('Super slots, other-page reservations, free level accounting, zero-point protection and opposite-preset Warbound passed.');
assert.equal(cross[0].warbound,cs[0].warbound,'Saved ETA also counts opposite-preset shared Warbound');
const superMarker='if("SuperTalentPTS_totaltospend"==d)return ',superStart=nativeSource.indexOf(superMarker)+superMarker.length,superExpr=nativeSource.slice(superStart,nativeSource.indexOf(';',superStart));
for(const c of cs){const slots=vm.runInNewContext(superExpr,{Math,c:{asNumber:Number},a:{engine:{getGameAttribute:key=>{assert.equal(key,'Lv0');return parse(d['Lv0_'+c.index]);}}},m:{_customBlock_Spelunk:(key,id)=>Number(parse(d.Spelunk)[0][id])>=1?1:0}});assert.equal(c.talentPlan.superSlots,slots);}
console.log('Super slot capacity matches the client expression; saved ETA uses both presets for shared Warbound.');
// At 100% Regal chance, levels inside a mob interval are redundant, but
// crossing an interval remains valuable. A super bonus shifts those thresholds.
const capped=structuredClone(small);
for(const c of capped){c.talentPlan.budget=40;c.talentPlan.regalMarket=100000;c.talentPlan.regalJelly=0;c.knowsDI=true;for(const t of c.talentPlan.talents)t.cap=40;const ri=c.talentPlan.talents.find(t=>t.id===229);ri.added=50;ri.normalAdded=0;ri.superActive=true;ri.superBonus=50;c.talentPlan.savedSupers=[229];c.talentPlan.superSlots=1;}
capped[1].talentPlan.talents.find(t=>t.id===231).current=40;
const cappedPlan=T.analyze([smallRow],capped);
for(const s of cappedPlan.scenarios){const a=s.allocations[s.active.index],t=s.active.talentPlan.talents.find(t=>t.id===229);assert.equal(s.character.riChance,1);assert.equal((a[229]+t.added)%t.y2,0,'Stop at the last affordable extra-mob breakpoint once chance is capped');const without=structuredClone(s.allocations);without[s.active.index][229]--;assert(T.variant(s.active,capped,without).riMobs<s.character.riMobs);}
assert.match(T.html(cappedPlan),/capped at 100%/);
// If the active owner has far stronger shared added levels, support Warbound
// must be released rather than spending points on a bonus that cannot win.
const dominated=structuredClone(small);
for(const c of dominated){c.knowsDI=false;c.talentPlan.sharedWarboundAdded[c.index]=1000;}
const dominatedPlan=T.analyze([smallRow],dominated);
for(const s of dominatedPlan.scenarios){const other=dominated.find(c=>c.index!==s.active.index);assert.equal(s.allocations[other.index][231],0);assert.equal(T.variant(s.active,dominated,s.allocations).warbound,s.character.warbound);}
// Warbound never reaches a finite hard cap: its marginal gain decreases.
const decayOwner=small[0],decayActive=small[0];
assert(T.warbound(decayActive,decayOwner,200)>T.warbound(decayActive,decayOwner,100));
assert(T.warbound(decayActive,decayOwner,201)-T.warbound(decayActive,decayOwner,200)<T.warbound(decayActive,decayOwner,101)-T.warbound(decayActive,decayOwner,100));
console.log('Capped Regal chance, super-shifted mob breakpoints, diminishing Warbound returns and preserved support points passed.');
// Orblet multi-drop is not capped at a 100% double-drop chance: integer
// guaranteed drops plus the fractional roll can produce up to five drops.
assert(nativeSource.includes('Math.min(5,1+(m._customBlock_RoyalG("OrbletMultiDrop",'));
assert.match(T.html(result),/Above 100% can produce additional drops/);

// Second RG is a protected Spelunking character, even when it has spare
// points/super slots or would be the faster active clearer.
const spelunking=structuredClone(small);
const second=spelunking[1];second.talentPlan.budget=100;second.talentPlan.superSlots=3;second.talentPlan.superBonus=50;
for(const t of second.talentPlan.talents){t.cap=100;t.current=[235,236,237,238,239].includes(t.id)?10:t.id===231?7:0;}
const protectedPlan=T.analyze([smallRow],spelunking);
assert(!protectedPlan.error);assert.equal(protectedPlan.best.active.index,spelunking[0].index);
assert.equal(protectedPlan.scenarios.length,1);
for(const t of second.talentPlan.talents)assert.equal(protectedPlan.best.allocations[second.index][t.id],t.current);
assert.deepEqual(protectedPlan.characters[1].talentPlan.newSupers,[]);
assert.match(T.html(protectedPlan),/Spelunking · keep saved build/);
assert.match(T.html(protectedPlan),/second RG is read-only/);
assert.equal(T.variant(protectedPlan.best.active,protectedPlan.characters,protectedPlan.best.allocations).warbound,protectedPlan.best.character.warbound);
console.log('Second RG keeps every saved point and super assignment; existing Warbound is included and only the first RG is optimized.');
