'use strict';
self.window=self;
importScripts('prayer-math-engine.js');
self.onmessage=event=>{
 try{
  const raw=event.data,data=PrayerMath.parseData(structuredClone(raw.data||raw),raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);
  if(!data.characters?.length)throw new Error('No character data could be decoded.');
  const values=data.characters.map((character,id)=>{
   const result=PrayerMath.getGoldenFoodMulti(character,data.account,data.characters),categories=result.breakdown.categories;
   const multipliers=categories.find(x=>x.name==='Multiplicative').sources;
   const additive=categories.find(x=>x.name==='Additive');
   const family=Math.max(1,additive.sources.find(x=>x.name==='Family Bonus')?.value||0);
   const sources=additive.sources.filter(x=>!['Family Bonus','The Family Guy'].includes(x.name)).map(x=>({...x}));
   for(const section of additive.subSections||[])for(const source of section.sources||[])sources.push({...source});
   const outer=1+multipliers.reduce((sum,x)=>sum+x.value,0)/100;
   const subtotal=sources.reduce((sum,x)=>sum+x.value,0);
   const reconstructed=(family+subtotal/100)*outer;
   if(Math.abs(reconstructed-result.value)>1e-7*Math.max(1,result.value))throw new Error('Golden Food breakdown does not reconcile.');
   const meals=data.account.cooking.meals.filter(x=>x.stat==='zGoldFood').map(x=>({name:x.name.replaceAll('_',' '),level:x.level,mastery:x.cookingMasteryNode?.level||0,masteryMulti:x.cookingMasteryNode?.multi||1,ribbon:data.account.grimoire?.ribbons?.[28+x.index]||0}));
   return {id,name:character.name,percent:Math.max(0,(result.value-1)*100),multiplier:result.value,breakdown:{family,outer,subtotal,multipliers,sources:sources.map(x=>({...x,contribution:x.value*outer})),baselineContribution:(family*outer-1)*100,meals}};
  });
  self.postMessage({values});
 }catch(error){self.postMessage({error:error?.message||String(error)});}
};
