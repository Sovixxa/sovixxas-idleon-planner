const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');const c={console:{log(){},warn(){},error(){}},structuredClone};vm.createContext(c);for(const f of ['prayer-math-engine.js','connected-stats-model.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);const raw=JSON.parse(fs.readFileSync('../example json.txt')),before=JSON.stringify(raw),report=c.ConnectedStatsModel.calculate(raw);assert.equal(JSON.stringify(raw),before);assert.equal(report.characters.length,raw.charNames.length);assert(report.account.length>=25);for(const ch of report.characters){assert(ch.entries.length>60);assert.equal(new Set(ch.entries.map(x=>x.id)).size,ch.entries.length);for(const e of ch.entries)assert(e.value===null||Number.isFinite(e.value));assert.equal(ch.entries.find(e=>e.id==='sample').value,90);}console.log('Extra totals:',report.characters[0].entries.length+report.account.length,'Unknown:',report.characters[0].entries.filter(e=>e.value===null).map(e=>e.title));console.log('Extra stats save immutability, roster, finite values, unique IDs and sample cap pass.');

const parsed=c.PrayerMath.parseData(structuredClone(raw.data),raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament),ch=parsed.characters[0],math=c.PrayerMath,entries=report.characters[0].entries;
const get=id=>entries.find(e=>e.id===id).value;
assert.equal(get('defence'),math.getMaxDamage(ch,parsed.characters,parsed.account).defence.value);
assert.equal(get('cash'),math.getCashMulti(ch,parsed.account,parsed.characters).cashMulti);
assert.equal(get('afk.MINING'),math.getAfkGain({...ch,afkType:'MINING'},parsed.characters,parsed.account).afkGains*100);
assert.equal(get('capacity.bOre'),math.getItemCapacity('bOre',ch,parsed.account,false).value);
assert.equal(report.account.find(e=>e.id==='bits').value,math.getBitsMulti(parsed.account).value);
assert.equal(c.ConnectedStatsModel.calculate({}).characters.length,0);
console.log('Combat, money, activity AFK percentage, capacity and account bits match their native calculations; empty exports stay empty.');
