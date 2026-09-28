'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),m=require('./killroy-model');
// Execute the actual installed-client bonus expression, not a second handwritten formula.
const client=fs.readFileSync(process.env.IDLEON_CLIENT_PATH||'../audit/N.js','utf8').replace(/\r?\n/g,''),match=/if\("KillroyBonuses"==\w+\)\s*return\s+/.exec(client);assert(match);
const expression=client.slice(match.index+match[0].length,client.indexOf(';',match.index));
const indexName=/^0==(\w+)\?/.exec(expression)?.[1];assert(indexName,'Missing bonus index parameter');
const clientBonus=(index,level,slot)=>{const options=Array(500).fill(0);options[slot]=level;return vm.runInNewContext(expression,{[indexName]:index,c:{asNumber:Number},a:{engine:{getGameAttribute:key=>{assert.equal(key,'OptionsListAccount');return options;}}}});};
for(const [id,index] of [[11,0],[13,1],[14,2],[15,3],[16,4],[17,5],[18,6]])for(const level of [0,1,2,11,36,50,150,200,300,10000]){
 const raw=clientBonus(index,level,m.curves[id][0]),applied=[15,16,17,18].includes(id)?1+raw/100:raw;
 assert(Math.abs(m.value(id,level)-applied)<1e-12,`client parity: shop ${id}, level ${level}`);
}
assert(client.includes('Math.min(2,m._customBlock_RandomEvent("KillroyBonuses",3,0))'));
assert(client.includes('(1+m._customBlock_RandomEvent("KillroyBonuses",4,0)/100)'));
assert(client.includes('3<=c.asNumber(a.engine.getGameAttribute("OptionsListAccount")[466])'));
assert(client.includes('50<=c.asNumber(a.engine.getGameAttribute("OptionsListAccount")[417])'));
assert(client.includes('"KillroyBonuses",7,0'));assert.equal([...client.matchAll(/_customBlock_RandomEvent\("KillroyBonuses",7,0\)/g)].length,1,'reserved bonus only used by shop description');
console.log('Killroy installed-client parity: seven bonus curves, hidden consumers, Billroy unlock and arcade cap pass.');
