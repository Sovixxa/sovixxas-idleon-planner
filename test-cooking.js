const assert=require('node:assert/strict');
const C=require('./cooking');
const levels=[0,1,2,2,30];
assert.deepEqual(C.forecast(levels,30,1,3),[
  {day:1,id:3,before:2,after:3},{day:2,id:2,before:2,after:3},{day:3,id:3,before:3,after:4}
]);
assert.deepEqual(levels,[0,1,2,2,30],'Forecast must not mutate the export');
assert.deepEqual(C.forecast([29,29],30,3,4),[{day:1,id:1,before:29,after:30},{day:2,id:0,before:29,after:30}]);
assert.deepEqual(C.forecast([0,1,30],30,1),[]);
assert.deepEqual(C.forecast([2],30,0),[]);
assert.equal(C.cost(0),10);
assert.equal(C.cost(10,1,1),C.cost(10)/5);
assert.equal(C.cost(10,1,1.6),C.cost(10)/8);
assert.ok(C.cost(111)/C.cost(110)>1e30,'Level 111 cost wall must be applied');
assert.deepEqual(C.estimate({level:0,stock:2,progress:5,requirement:10,discount:1,companion:0,speed:25,ladleBonus:50}),{needed:10,remaining:8,hours:3,ladles:2});
assert.equal(C.estimate({level:0,stock:10,progress:0,requirement:10,discount:1,companion:0,speed:null,ladleBonus:0}).ladles,0);
assert.equal(C.estimate({level:0,stock:0,progress:0,requirement:10,discount:1,companion:0,speed:null,ladleBonus:0}).hours,null);
assert.equal(C.estimate({level:0,stock:null,progress:0,requirement:10,discount:1,companion:0,speed:100,ladleBonus:0}).hours,null);
const ninja=[];ninja[102]=[];ninja[102][9]='ptu';const sailing=[[],[],[],Array(18).fill(0)];sailing[3][17]=6;
const grim=Array(27).fill(0);grim[26]=20;const spelunk=[[0,0,0,0,0,1]];
const ach=Array(234).fill(0);ach[233]=-1;const options=Array(607).fill(0);options[193]=2;const dream=Array(12).fill(0);dream[11]=3;
const data={Meals:[[107,107,108],[],[0,0,0]],Ninja:ninja,Sailing:sailing,Spelunk:spelunk,Grimoire:grim,BundlesReceived:{bun_s:1},AchieveReg:ach,OptionsListAccount:options,Dream:dream,WeeklyBoss:{d_33:-1}};
const m=C.decode(data,{companion:{l:['162,0,0,0,1']}});
assert.equal(m.cap,160);assert.equal(m.capKnown,true);assert.equal(m.gain,3);assert.equal(m.companion,1.6);assert.equal(m.discount,.58**2/1.1);
const serialized=Object.fromEntries(Object.entries(data).map(([k,v])=>[k,JSON.stringify(v)]));
assert.equal(C.decode(serialized).gain,3);assert.equal(C.decode(serialized).cap,160);
assert.equal(C.decode({...data,OptionsListAccount:undefined,OptLacc:JSON.stringify(options)}).discount,m.discount);
assert.equal(C.decode({}).nmlbKnown,false);assert.equal(C.decode({}).capKnown,false);assert.equal(C.decode({}).discountKnown,false);
console.log('Cooking tests passed: forecast, tie order, cap, paid bonus, cost wall, discounts and estimates.');
// Multi-level planning: stock is consumed once across the whole path.
const input={level:1,stock:5,progress:2,requirement:10,discount:1,companion:0,speed:100,ladleBonus:50,cap:30,steps:3};
const plan=C.targets(input);
assert.equal(plan.length,3);assert.equal(plan[0].ladles,C.estimate(input).ladles);
let totalCost=0;for(let i=0;i<plan.length;i++){totalCost+=Math.ceil(C.cost(1+i));assert.equal(plan[i].ladles,Math.ceil(Math.max(0,(totalCost-5)*10-2)/150));}
assert.equal(C.targets({...input,stock:1000})[2].ladles,0);
assert.equal(C.targets({...input,cap:2}).length,1);
assert.deepEqual(C.targets({...input,level:0}),[]);
assert.deepEqual(C.targets({...input,level:30}),[]);
assert.equal(C.targets({...input,speed:null})[0].ladles,null);
assert.equal(C.targets({...input,stock:null})[0].ladles,null);
assert.deepEqual([{id:1,ladles:null},{id:2,ladles:4},{id:3,ladles:0},{id:4,ladles:4}].sort(C.compareLadles).map(x=>x.id),[3,2,4,1]);
console.log('Cooking planner: cumulative stock/progress, single rounding, level caps, missing rates and cheapest-first ordering pass.');
