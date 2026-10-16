'use strict';
const fs=require('node:fs');
function edit(file,fn){const s=fs.readFileSync(file,'utf8'),next=fn(s);if(next!==s)fs.writeFileSync(file,next);}
edit('index.html',s=>s.includes('src="menagerie.js"')?s:s.replace('<script src="world7-data.js"></script>','<script src="world7-data.js"></script>\n  <script src="update-catalog-data.js"></script>\n  <script src="menagerie.js"></script>\n  <link rel="stylesheet" href="menagerie.css">').replace('<button id="navResearch"','<button id="navMenagerie" class="side-link"><img class="side-icon" src="assets/MenaIconO0.png" width="20" height="20" alt=""><span class="side-link-label">Menagerie</span></button><button id="navResearch"'));
edit('app.js',s=>{
 if(!s.includes('SKILL_PAGES.menagerie='))s=s.replace('  const BASELINES={',"  SKILL_PAGES.menagerie={title:'Luminous Menagerie',world:'World 7',copy:'Missions, unlocks, boosts, and jellyfish progression.'};\n  const BASELINES={");
 if(!s.includes("name==='menagerie'"))s=s.replace("    if(name==='research')", "    if(name==='menagerie'){window.Menagerie.render($('worldContent'),loadedExport||state?.rawRoot||{});return;}\n    if(name==='research')");
 s=s.replace('const catalog=window.ARCADE_CATALOG||[];',"const catalog=(window.ARCADE_CATALOG||[]).filter(x=>!/who knows/i.test(x.description));");
 s=s.replace("+'+'+value.toLocaleString(undefined,{maximumFractionDigits:2})+(item.description.includes('{%')?'%':'')", "+(item.description.includes('}x')?(1+value/100).toLocaleString(undefined,{maximumFractionDigits:3})+'×':'+'+value.toLocaleString(undefined,{maximumFractionDigits:2})+(item.description.includes('{%')?'%':''))");
 s=s.replace("replace(/^\\+\\{%?\\s*/,'')","replace(/^(?:\\+\\{%?|\\}x)\\s*/,'')");
 s=s.replaceAll("level===101?'done'","level>=101?'done'").replaceAll("level===101?'✦ Cosmo-balled'","level===102?'✦ Omega-balled':level===101?'✦ Cosmo-balled'").replaceAll("level===101?'Cosmo-balled'","level===102?'Omega-balled':level===101?'Cosmo-balled'");
 s=s.replace("level===101?' · Cosmo-balled (saved as 101)'","level===102?' · Omega-balled (saved as 102)':level===101?' · Cosmo-balled (saved as 101)'").replace('including level-101 doubling.','including Cosmo doubling and Omega sextupling.').replace('At exactly level 101, the client doubles the result.','Saved level 101 doubles the result; saved level 102 multiplies it by six.');
 s=s.replace("esc(item.description.replace('{',bonus.toLocaleString(undefined,{maximumFractionDigits:3})))","esc(item.description.replace('{',bonus.toLocaleString(undefined,{maximumFractionDigits:3})).replace('}',(1+bonus/100).toLocaleString(undefined,{maximumFractionDigits:3})))");
 return s;
});
edit('beanstalk-engine.js',s=>s.replace('e===101&&(r*=2),this.hasCompanion27', 'e===101&&(r*=2),e===102&&(r*=6),this.hasCompanion27').replace('case 6:return this.data.qtyBonus+(this.data.transcendentBonusQty??0)', 'case 7:return this.data.qtyBonus+(this.data.verisimilitudeBonusQty??0);case 6:return this.data.qtyBonus+(this.data.transcendentBonusQty??0)'));
edit('test-catalog-coverage.js',s=>s.includes("filename:'beanstalk-engine.js'")?s:s.replace('let count=0;',"vm.runInContext(fs.readFileSync('beanstalk-engine.js','utf8'),c,{filename:'beanstalk-engine.js'});\nlet count=0;"));
edit('build-static.js',s=>s.replace('test-|extract-|build-|server', 'test-|extract-|build-|refresh-|apply-update-|client-source-utils|server'));
