const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),E=require('./engine'),{handler}=require('./client-source-utils');
const source=fs.readFileSync('../audit/N.js','utf8'),r=vm.runInNewContext('('+handler(source,'Research')+')()');
for(const cleared of [0,1,12,64,72]){
 const rows=E.obstructionRewards({obstruction:cleared});assert.equal(rows.length,72);
 assert.equal(rows.filter(r=>r.status==='Cleared').length,cleared);
 rows.forEach((row,i)=>{
  assert.equal(row.name,r[45][i].replaceAll('_',' '));
  const expected=r[46][i].replaceAll('{',String(Number(r[47][i]))).replaceAll('}',String(Number((1+Number(r[47][i])/100).toFixed(2)))).replaceAll('_',' ').replaceAll('@',' · ');
  assert.equal(row.bonus,expected);assert.equal(row.status,i<cleared?'Cleared':i===cleared?'Current':'Locked');
  assert(Number.isFinite(row.hp)&&row.hp>0);assert(row.timer>0);
 });
}
assert(E.obstructionRewards(null).every(r=>r.status==='Load save'));
console.log('All 72 obstruction names, bonuses, secondary rewards and unlock boundaries match the local client.');
