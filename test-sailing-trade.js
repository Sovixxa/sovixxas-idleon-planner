'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),M=require('./sailing-trade-model');
assert.equal(M.inputNumber('7.77M'),7770000);assert.equal(M.inputNumber('7,770,000'),7770000);assert.equal(M.inputNumber('7.77e6'),7770000);assert.equal(M.inputNumber('-1'),null);assert.equal(M.inputNumber('Infinity'),null);assert.equal(M.inputNumber(''),null);
for(const scale of [1,1e3,1e6,1e15]){assert(M.qualifies(776*scale));assert(M.qualifies(777*scale));assert(M.qualifies(778*scale));assert(M.qualifies(774.5*scale));assert(M.qualifies(779.5*scale));assert(!M.qualifies(780*scale));assert(!M.qualifies(773*scale));}
assert(!M.qualifies(0));assert(!M.qualifies(Infinity));
const floor=100,offer={stock:3000,rate:2};const p=M.plan(offer,floor);assert(p.add>0);assert(M.qualifies(M.plan(offer,floor,p.targetStock).gold));
const poor=M.plan({stock:0,rate:7.775},100);assert.equal(poor.targetStock,100);assert.equal(poor.add,100);assert(M.plan({stock:100,rate:7.775},100).ready);
for(let i=0;i<250;i++){const offer={stock:10**(i%15)*(1+i%31),rate:1.5*1.6**(i%15)},floor=10**(i%11),plan=M.plan(offer,floor);if(!plan.ready){const next=M.plan(offer,floor,plan.targetStock);assert(next.ready,'Suggested target must actually qualify and be affordable');assert(plan.add>=0);}}
const ctx={Date,structuredClone,console};vm.createContext(ctx);for(const f of ['dashboard-math.js','sailing-trade-model.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
const raw=JSON.parse(fs.readFileSync('../example json.txt')),before=JSON.stringify(raw),now=Date.UTC(2026,9,3,8),result=ctx.SailingTradeModel.calculate(raw,ctx.DashboardMath,now);
assert.equal(result.offers.length,40);assert(result.floor>0);assert.equal(result.unlocked,15);assert.equal(result.completed,true);assert.equal(JSON.stringify(raw),before);assert.equal(ctx.Date,Date);assert(ctx.SailingTradeModel.calculate({}).missing);
result.offers.forEach((o,i)=>{assert(o.lootIndex>=1&&o.lootIndex<=30);assert.equal(o.end-o.start,21600000);if(i)assert.equal(o.start,result.offers[i-1].end);});assert(result.offers[0].start<=now&&result.offers[0].end>now);
// Check leading-digit acceptance against the bundled game's actual expression.
const client=fs.readFileSync('../audit/N.js','utf8'),at=client.indexOf('_customBlock_Reg_ach_add_status(300'),start=client.lastIndexOf('this._DN7=',at),end=client.indexOf(',774<=',start);
assert(start>0&&end>start);const expr=client.slice(start+10,end).replaceAll('c.asNumber(this._GenINFO[107])','gold');
for(const gold of [7.775,1000,1000000,773000,774000,776000,777999,778000,779999,780000,7.775e15]){const actual=vm.runInNewContext(expr,{gold,Math,k:{_customBlock_getLOG:n=>Math.log(Math.max(n,1))/2.30259}});assert.equal(M.prefix(gold),actual);}
console.log('777 trade: input formats, client acceptance rule, affordable targets across scales, first-boat floor, deterministic six-hour forecast, save immutability passed.');
