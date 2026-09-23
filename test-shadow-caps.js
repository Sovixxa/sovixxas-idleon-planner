'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const data=require('./shadow-caps-data'),{filter}=require('./shadow-caps');
assert.equal(new Set(data.caps.map(c=>c.id)).size,data.caps.length);
for(const cap of data.caps){for(const field of ['name','system','world','limit','note'])assert(cap[field],cap.id+' '+field);assert(cap.evidence.expression.length>0);}
const sourcePath=path.resolve(__dirname,'../audit/N.js');
if(fs.existsSync(sourcePath)){
 const source=fs.readFileSync(sourcePath,'utf8');
 for(const c of data.caps)assert.equal(source.slice(c.evidence.offset,c.evidence.offset+c.evidence.expression.length),c.evidence.expression,'Client evidence changed: '+c.name);
}else console.log('Local client unavailable; skipped source comparison.');
// Evaluate the actual recorded client expressions with below/at/above-cap inputs.
function evaluate(name,attributes,extras={}){const cap=data.caps.find(c=>c.name===name);return vm.runInNewContext(cap.evidence.expression,{a:{engine:{getGameAttribute:k=>attributes[k]}},c:{asNumber:Number},...extras},{timeout:1000});}
for(const [input,expected] of [[10,.1],[35,.35],[99,.35]])assert.equal(evaluate('Gifts Abound',{DNSM:{h:{AlchBubbles:{h:{Y4:input}}}}}),expected);
for(const [input,expected] of [[20,.8],[50,.5],[200,.5]])assert.equal(evaluate('Startue EXP',{DNSM:{h:{AlchBubbles:{h:{StatueStartEXP:input}}}}}),expected);
for(const [input,expected] of [[20,20],[99,20]])assert.equal(evaluate('Codfrey Rulz OK',{DNSM:{h:{AlchBubbles:{h:{Y13:input}}}}}),expected);
for(const input of [50,1000])assert.equal(evaluate('Royal Riches',{DNSM:{h:{AlchBubbles:{h:{W14:input}}}}}),50);
assert.equal(evaluate('Prisma bubble multiplier',{}, {m:new Proxy({}, {get:()=>()=>1000}),p:new Proxy({}, {get:()=>()=>1000}),q:new Proxy({}, {get:()=>()=>1000})}),4);
assert.equal(filter(data.caps,'World 5','gifts').length,1);
assert.equal(filter(data.caps,'World 1','gifts').length,0);
assert.equal(filter(data.caps,'All','  GIFTS  DIVINITY ').length,1);
assert.equal(filter(data.caps,'All','not-a-real-cap').length,0);
assert.equal(filter(data.caps,'All','').length,data.caps.length);
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
assert.equal((html.match(/id="navShadowCaps"/g)||[]).length,1);
assert(html.indexOf('id="navShadowCaps"')>html.indexOf('<div class="side-section-label">Misc</div>'));
assert(html.indexOf('src="shadow-caps-data.js"')<html.indexOf('src="shadow-caps.js"'));
assert(html.indexOf('src="shadow-caps.js"')<html.indexOf('src="app.js'));
console.log(`Shadow caps: ${data.caps.length} evidence records, consuming-formula boundaries, search and sidebar wiring OK`);
