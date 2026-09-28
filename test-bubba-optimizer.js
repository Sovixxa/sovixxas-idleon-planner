'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),M=require('./bubba-optimizer');
const near=(a,b)=>assert(Math.abs(a-b)<=1e-10*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
function fixture(){const b=[Array(16).fill(0),Array(28).fill(0),Array(28).fill(0),Array(6).fill(0),Array(8).fill(0),Array(5).fill(0)];b[0][0]=1;b[0][15]=0;return {Bubba:b};}
assert.equal(M.decode({}),null);assert.equal(M.decode({Bubba:'bad'}),null);const raw=fixture(),s=M.decode(raw);assert.equal(M.cost(s,0),1);assert.equal(M.rate(s),0);
const first=M.plan(s);assert.equal(first.steps[0].id,0,'Start a fresh run');assert.equal(first.state.wallet,0);assert.equal(M.rate(first.state),1);
assert.equal(raw.Bubba[1][0],0,'Raw save must not be mutated');
const rich=fixture();rich.Bubba[0][0]=1e12;rich.Bubba[0][4]=1e15;rich.Bubba[1][0]=50;rich.Bubba[1][1]=20;rich.Bubba[1][2]=50;rich.Bubba[1][8]=9;rich.Bubba[3]=[20,15,10,0,120,10];rich.Bubba[0][2]=1;rich.Bubba[0][3]=5;rich.Bubba[0][5]=-50;
const r=M.decode({data:JSON.stringify(rich)}),before=JSON.stringify(r);near(M.doubleChance(r,5),.36);assert.equal(M.patsAvailable(r),M.regularPats(r)+50);
const plan=M.plan(r,{steps:100,reserve:r.wallet*.5,holdCheap:true});assert(plan.spent<=r.wallet*.5);assert(plan.steps.every(x=>![0,2].includes(x.id)));assert(plan.state.wallet>=0);assert(plan.afterWait<=plan.beforeWait);assert.equal(JSON.stringify(r),before);
const locked=M.clone(r);locked.produced=0;assert(M.candidates(locked).every(x=>x.id===0));
const single=M.push(r,{patMode:'current',maxGifts:1}),double=M.push(r,{patMode:'double',maxGifts:1});assert.equal(double.pats-single.pats,M.regularPats(r),'Starting reserve is not duplicated');assert(double.waited>0);
const expired=M.clone(r);expired.hourElapsed=4000;expired.patsUsed=5;const dp=M.push(expired,{patMode:'double',maxGifts:0});assert(dp.waited>3500,'Expired clock starts a fresh hour, not two immediate allowances');
const zero=M.push(r,{maxGifts:0});assert.equal(zero.events.length,0);assert(!zero.reachable);assert.equal(JSON.stringify(r),before);
const over=M.clone(r);over.hourElapsed=3599;over.patsUsed=-50;assert(M.push(over,{patMode:'double'}).reason.includes('Not enough time'));
const noGift=M.clone(r);noGift.gifts=[2,3];const ng=M.push(noGift,{maxGifts:2,patMode:'none'});assert(ng.events.every(x=>x.payout===0));assert(ng.state.wallet<=noGift.wallet);
const capped=M.clone(r);capped.gifts=[1,3];capped.traits[1]=120;const ng2=M.push(capped,{maxGifts:1,patMode:'none',training:1});assert.equal(ng2.state.traits[1],121,'Numbahs exceeds timed-training cap');
const fast=M.push(r,{maxGifts:5,secondsPerGift:.1}),slow=M.push(r,{maxGifts:5,secondsPerGift:20});assert(fast.payout>=slow.payout,'Clicking delay reduces happiness and payouts');
const cal=M.calibrated(r,M.rate(r)*3,M.cost(r,8)*.5);near(M.rate(cal),M.rate(r)*3);near(M.cost(cal,8),M.cost(r,8)*.5);assert.equal(r.productionScale,1);
const ext=fixture();ext.UpgVault=[];ext.UpgVault[65]=100;ext.UpgVault[89]=50;ext.Sushi=[[],[],[],[],[],Array(40).fill(0)];ext.Research=[];ext.Research[7]=[];ext.Research[7][9]=59;ext.Research[7][4]=6;ext.Holes=[];ext.Holes[31]=[[],[],[]];ext.Holes[32]=[[],[],[]];ext.Holes[31][2][18]=10;ext.Holes[32][2][18]=2;const e=M.decode(ext);assert.deepEqual(e.outside,{vault:16,sushi:2,jelly:2.5,fountain:1.5,minehead:.5});ext.Sushi[5][20]=-1;assert.equal(M.decode(ext).outside.sushi,1,'Sushi unlocks are a contiguous prefix');
const saved=JSON.parse(fs.readFileSync('../example json.txt','utf8')),snapshot=JSON.stringify(saved),decoded=M.decode(saved);assert(decoded);assert(Number.isFinite(M.rate(decoded)));M.plan(decoded);M.push(decoded);assert.equal(JSON.stringify(saved),snapshot);
console.log('Bubba optimizer: fresh runs, wrappers, budget, locks, reserve, pats, gifts, decay, calibration, outside bonuses, and save immutability pass.');

const longRun=M.clone(decoded);longRun.paid[8]=100;longRun.paid[10]=0;longRun.wallet=1e200;longRun.produced=1e300;longRun.gifts=[0,0];assert.equal(M.push(longRun,{patMode:"none",maxGifts:300}).events.length,300);assert.equal(M.plan(longRun,{goal:"production",horizon:1e100,steps:500}).steps.length,500);

const future=M.plan(s,{mode:'roadmap',goal:'production',steps:500});
assert.equal(future.steps.length,500,'Roadmap continues beyond current wallet');
assert(future.extra>0);assert(future.steps.some(x=>x.id!==0),'Future production unlocks later upgrades');
near(future.spent,s.wallet+future.extra-future.state.wallet);
assert(future.steps.every(x=>x.wallet>=0));
let cumulative=0;for(const step of future.steps){cumulative+=step.extra;near(step.totalExtra,cumulative);assert.equal(step.future,cumulative>0);}
const reserved=M.plan(r,{mode:'roadmap',goal:'production',steps:500,reserve:r.wallet*.5});
assert(reserved.steps.every(x=>x.wallet>=r.wallet*.5*(1-1e-12)));
assert.equal(JSON.stringify(r),before);
console.log('Roadmap: 500 buys, future unlocks, cumulative funding, reserve, and immutable save pass.');

const late=M.clone(r);late.paid[8]=18;late.paid[0]=10;late.paid[2]=10;late.paid[21]=0;assert(M.plan(late,{mode:"roadmap",goal:"production",holdCheap:true,steps:100}).steps.every(x=>![0,2].includes(x.id)));
