const assert=require('node:assert/strict'),fs=require('node:fs');require('./palette-data');const P=require('./palette-doublers');
const sp=Array.from({length:50},()=>[]);sp[9]=Array(37).fill(60);sp[18][10]=5;sp[0][8]=1;sp[49]=Array(37).fill(0);
const raw={data:{Spelunk:JSON.stringify(sp),Gaming:Array(13).fill('')}};const before=JSON.stringify(raw),m=P.decode(raw);
assert.equal(m.rows.length,37);assert.equal(m.rows[5].effects[0],'8.15x Artifact Find chance');assert.equal(m.rows[5].effects[1],'15.29x Artifact Find chance');assert.equal(m.rows[5].effects[2],'29.59x Artifact Find chance');
assert.equal(m.rows[0].implemented,false);assert.equal(JSON.stringify(raw),before);
sp[49][5]=2;raw.data.Spelunk=sp;assert.equal(P.decode(raw).rows[5].status,'2 stars · Max');assert.equal(P.decode(raw).rows[5].current,m.rows[5].effects[2]);
const letters='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';raw.data.Gaming[12]=letters[49]+letters[59];assert.equal(P.decode(raw).rows[25].bonuses[0],m.rows[25].bonuses[0]*2.5);
sp[9][5]=0;assert.equal(P.decode(raw).rows[5].status,'Locked');assert.equal(P.decode({}).available,false);
console.log('Palette star scaling, account boosts, superbits, applied stars, missing data and save preservation pass.');
