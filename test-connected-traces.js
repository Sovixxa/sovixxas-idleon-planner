const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');const raw=JSON.parse(fs.readFileSync('../example json.txt')),before=JSON.stringify(raw),errors=[];
function ctx(trace){const c={console:{log(){},warn(){},error:(...a)=>errors.push(a.join(' '))},structuredClone};vm.createContext(c);for(const f of (trace?['connected-trace-runtime.js','connected-trace-engine.js','connected-primary-stats.js']:['prayer-math-engine.js']).concat('connected-stats-model.js'))vm.runInContext(fs.readFileSync(f,'utf8'),c);return c;}
const normal=ctx(false).ConnectedStatsModel.calculate(raw),traced=ctx(true).ConnectedStatsModel.calculate(raw);assert.deepEqual(errors,[]);assert.equal(JSON.stringify(raw),before);
let count=0;for(let i=0;i<traced.characters.length;i++)for(const e of traced.characters[i].entries){const old=normal.characters[i].entries.find(x=>x.id===e.id);assert.equal(e.value,old.value,'Value drift '+e.id);if(e.value!==null)assert(e.rows.length||e.trace?.rows.length,'Missing ledger '+e.id);if(e.trace){assert.equal(e.trace.displayValue,e.value);for(let r=0;r<e.trace.rows.length;r++)for(const p of e.trace.rows[r].parents)assert(p<r,'Trace must only refer to earlier inputs');}count++;}for(const e of traced.account){assert.equal(e.value,normal.account.find(x=>x.id===e.id).value,'Account drift '+e.id);assert(e.rows.length||e.trace?.rows.length,'Account ledger '+e.id);}
const hp=traced.characters[0].entries.find(e=>e.id==='maxHp');assert(hp.trace.rows.some(r=>/stamp/i.test(r.name)));assert(hp.trace.rows.some(r=>/flat hp/i.test(r.name)));assert(hp.trace.rows.at(-1).formula.includes('×'));
const mastery=traced.characters[0].entries.find(e=>e.id==='mastery');assert(mastery.trace.rows.some(r=>r.formula.includes('min(0.8')));
console.log('Connected ledgers: '+count+' character totals + '+traced.account.length+' account totals have source evidence; all values match the uninstrumented engine, source dependencies are ordered, HP sources and mastery cap are present, input save unchanged.');

const primaryEntries=traced.characters.flatMap(c=>c.entries.filter(e=>e.primary));assert.equal(primaryEntries.length,44);
for(const e of primaryEntries){const p=e.primary;assert(p.rows.length>35);assert.equal(p.computed,Math.floor(p.baseTotal*p.multiplier+p.outside));assert.equal(p.difference,e.value-p.computed);assert(Number.isFinite(p.computed));assert.equal(p.unknown.length,0);}
const agi=primaryEntries.find(e=>e.id==='agility');assert.equal(agi.value,31166367);assert(agi.primary.rows.some(r=>r.name.includes('Golden Grilled Cheese Nomwich')));assert(!agi.primary.rows.some(r=>r.name.includes('Golden Cake')));assert(agi.primary.rows.some(r=>r.name.includes('SWIFT STEPPIN')));assert(agi.primary.rows.some(r=>r.stage==='Equipment amplification %'));
console.log('Primary stat source reconstruction: 44 ledgers, independent formula arithmetic, explicit differences and AGI source identities pass.');

const isolated=ctx(true),M=isolated.PrayerMath,d=typeof raw.data==='string'?JSON.parse(raw.data):structuredClone(raw.data),parsed=M.parseData(d,raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);
const calculate=character=>isolated.ConnectedPrimaryStats.calculate(character,parsed.account,parsed.characters,M).find(e=>e.stat==='AGI');
const originalAgi=calculate(parsed.characters[0]),changed=structuredClone(parsed.characters[0]);changed.stats.agility+=1000000;
assert.equal(calculate(changed).computed,originalAgi.computed,'Saved total must not be used to fit the reconstruction');
const foodChanged=structuredClone(parsed.characters[0]);foodChanged.food.find(f=>f.Effect==='AllStatz').amount=1;
assert(calculate(foodChanged).computed<originalAgi.computed,'Golden stat-food quantity must affect reconstructed AGI');
console.log('Primary stats: saved-total independence and golden-food quantity sensitivity pass.');
