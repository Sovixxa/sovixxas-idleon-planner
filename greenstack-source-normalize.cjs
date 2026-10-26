'use strict';
const key=s=>s.toLowerCase().replace(/[’']/g,'').replace(/\s+/g,' ').trim();
function normalizeSources(sources){
 const rows=sources.map(s=>s.replace(/\s+/g,' ').trim().replace(/^(.+?) Vendor$/i,'Shop: $1'));
 const questAliases=new Map(rows.filter(s=>s.startsWith('Quest: ')).map(s=>[key(s.slice(7).replace(' — ',': ')),s]));
 const canonical=rows.map(s=>questAliases.get(key(s))||s);
 const drops=canonical.filter(s=>s.startsWith('Drop: '));
 const hasRecipe=canonical.some(s=>s.startsWith('Craft at the Anvil:'));
 const hasProduction=canonical.some(s=>s.startsWith('Anvil production ('));
 const hasForge=canonical.includes('Smelt ores in the Forge');
 const filtered=canonical.filter(s=>{
  if(hasRecipe&&(s==='Smithing'||s.startsWith('Crafting: Craft at the Anvil')))return false;
  if(hasProduction&&s==='Smithing: Anvil Production')return false;
  if(hasForge&&['Forging','Drop: Fire Forge','Drop: Cinder Forge'].includes(s))return false;
  // Prefer the mapped monster entry over an older bare monster name.
  if(!s.startsWith('Drop: ')&&drops.some(d=>key(d.slice(6).split(' — ')[0].split(' (quest:')[0])===key(s)))return false;
  // Only collapse a location-less drop when a fuller, unconditional entry exists.
  // Quest-gated variants must keep their requirements.
  if(s.startsWith('Drop: ')&&!s.includes(' — ')&&!s.includes(' (quest:')&&drops.some(d=>d.startsWith(s+' — ')&&!d.includes(' (quest:')))return false;
  return true;
 });
 return [...new Map(filtered.map(s=>[key(s),s])).values()];
}
module.exports={normalizeSources};
