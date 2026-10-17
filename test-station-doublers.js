const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),D=require('./station-doublers');
const c={window:{}};vm.runInNewContext(fs.readFileSync('world7-data.js','utf8'),c);const catalog=c.window.WORLD7_CATALOG;
const sp=Array.from({length:53},()=>[]),sushi=Array.from({length:8},()=>[]),research=Array.from({length:9},()=>[]);
sushi[2]=Array(46).fill(20);research[8]=Array(28).fill(20);sp[52]=[21];sp[51]=[10];
const raw={data:{Sushi:JSON.stringify(sushi),Research:JSON.stringify(research),Spelunk:JSON.stringify(sp)}},before=JSON.stringify(raw);
const s=D.decode('sushi',raw,catalog),m=D.decode('minehead',raw,catalog),row=(rows,id)=>rows.find(x=>x.id===id);
assert.equal(s.rows.length,25);assert.equal(m.rows.length,20);assert(!row(m.rows,6));assert(!row(s.rows,0));
assert.match(row(s.rows,21).without,/20%/);assert.match(row(s.rows,21).withDoubler,/40%/);assert.equal(row(s.rows,21).status,'Applied');
assert.match(row(s.rows,37).without,/^3 base EXP/);assert.match(row(s.rows,37).withDoubler,/^5 base EXP/);
assert.match(row(s.rows,22).without,/^21 hours/);assert.match(row(s.rows,22).withDoubler,/^41 hours/);
assert.match(row(s.rows,2).without,/separate 1.2×/);assert.match(row(s.rows,2).withDoubler,/separate 1.2×/);
assert.match(row(m.rows,14).without,/^1.7×/);assert.match(row(m.rows,14).withDoubler,/^1.9×/);
assert.match(row(m.rows,23).without,/^1.2%/);assert.match(row(m.rows,23).withDoubler,/^1.4%/);
research[8][26]=100;raw.data.Research=research;assert.equal(row(D.decode('minehead',raw,catalog).rows,26).withDoubler,'66.667% cheaper upgrades');
raw.data.Research=JSON.stringify(Array.from({length:9},(_,i)=>i===8?Array(28).fill(20):[]));assert.equal(JSON.stringify(raw),before);
for(const r of [...s.rows,...m.rows]){assert(!/[{}$@_]/.test(r.without+r.withDoubler));assert(fs.existsSync(r.icon));}
assert.equal(D.decode('sushi',{},catalog).available,false);assert.equal(D.decode('minehead',{},catalog).available,false);
console.log('Station doubler eligibility, special formulas, applied states, icons and save preservation pass.');
