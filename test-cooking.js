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
