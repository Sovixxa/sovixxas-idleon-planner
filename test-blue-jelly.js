const assert=require('node:assert/strict'),B=require('./blue-jelly'),C=require('./cooking');
const meal=(id,requirement=1)=>({id,level:1,stock:0,progress:0,requirement});
const base={meals:[meal(0),meal(1)],speeds:[10,10],ladles:1,cap:3,cost:l=>l===1?10:100};
let result=B.optimize(base);assert.equal(result.gain,2);assert.equal(result.groups.length,2,'Split when two cheap upgrades beat stacking');
result=B.optimize({...base,speeds:[6,4]});assert.equal(result.gain,1);assert.equal(result.groups.length,1,'Stack to reach a level neither kitchen reaches alone');
result=B.optimize({...base,meals:[{...meal(0),stock:8}],speeds:[1,1]});assert.equal(result.gain,1,'Count stock once');
assert.throws(()=>B.optimize({...base,ladles:0}));assert.throws(()=>B.optimize({...base,speeds:[Infinity]}));
assert.equal(B.optimize({...base,meals:[{...meal(0),level:3}]}).groups.length,0);
assert.equal(B.optimize({...base,meals:[{...meal(0),stock:null}]}).groups.length,0);
assert.equal(B.optimize({...base,cap:2,ladles:1e10}).gain,2,'Respect cap');
// Exhaustive independent allocation oracle on small uneven kitchens.
for(let seed=1;seed<=30;seed++){
 const meals=[meal(0,1),meal(1,2),meal(2,3)],speeds=[seed%7+1,seed%11+1,seed%5+1],cap=5;
 const input={meals,speeds,cap,ladles:2,cost:l=>10*l*l};let best=-1;
 for(let code=0;code<27;code++){let n=code;const work=[0,0,0];for(let k=0;k<3;k++){work[n%3]+=speeds[k]*2;n=Math.floor(n/3);}let total=0;for(let m=0;m<3;m++){let stock=work[m]/meals[m].requirement,lv=1;while(lv<cap&&stock>=10*lv*lv){stock-=10*lv*lv;lv++;}total+=lv-1;}best=Math.max(best,total);}
 assert.equal(B.optimize(input).gain,best);
}
const data={Meals:[[1],[0],[0]],Menagerie:[[],[],Array(21).fill(0)]};data.Menagerie[2][20]=1;assert.equal(C.decode(data).cap,40);
const before=JSON.stringify(base);B.optimize(base);assert.equal(JSON.stringify(base),before);
console.log('Blue Jellyfish: exact allocation matches brute force; split, stack, stock, cap, missing data, invalid inputs and immutability pass.');
