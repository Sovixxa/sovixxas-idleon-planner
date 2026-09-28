const assert=require('node:assert/strict');
const {poolKind,groupedRows}=require('./connected-bonuses');
for(const [row,expected] of [
 [{stage:'Base Damage',operation:'multiply',value:2},'Multipliers'],
 [{stage:'Base multiplier',operation:'add',value:1},'Base'],
 [{stage:'True Multiplicative',value:2},'True multipliers'],
 [{stage:'Cap',value:90},'Caps & rules'],
 [{id:'result',name:'Result',formula:'min(90, value)',parents:[0]},'Final total'],
 [{id:'display',name:'Display',formula:'floor(value)',parents:[0]},'Final total'],
 [{id:'mixed',name:'Mixed',formula:'(Base + (Value × Scale))',parents:[0]},'Intermediate calculations'],
 [{stage:'Additive · % Mob Respawn',value:12},'Additive'],
 [{stage:'Multiplicative · % Money',value:2},'Multipliers'],
 [{name:'Card Percent Bonus',value:10},'Percentage inputs']
])assert.equal(poolKind(row),expected,JSON.stringify(row));
const rows=[{name:'low',stage:'Additive',value:-2},{name:'high',stage:'Additive',value:100},{name:'zero',stage:'Additive',value:0},{name:'rule',stage:'Additive'}],before=JSON.stringify(rows);
const html=groupedRows(rows,r=>r.name);assert(html.indexOf('>high<')<html.indexOf('>zero<'));assert(html.indexOf('>zero<')<html.indexOf('>low<'));assert(html.indexOf('>low<')<html.indexOf('>rule<'));assert.equal(JSON.stringify(rows),before);
console.log('Pool audit: operation precedence, final caps, mixed expressions, descending order and immutable inputs pass.');
