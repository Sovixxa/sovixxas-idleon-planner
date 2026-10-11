'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://localhost:7331/**',async route=>{
  const pathname=decodeURIComponent(new URL(route.request().url()).pathname);
  if(pathname.startsWith('/__'))return route.fulfill({contentType:'application/json',body:'{}'});
  const file=path.resolve(__dirname,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(__dirname+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory())return route.fulfill({status:404,body:''});
  const type={'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.json':'application/json','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream';
  return route.fulfill({contentType:type,body:fs.readFileSync(file)});
 });

 await page.goto('http://localhost:7331/');
 const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8'));
 await page.locator('#jsonInput').fill(JSON.stringify(raw));await page.locator('#parseBtn').click();
 await page.waitForFunction(()=>/^(Save age|Imported):/.test(document.getElementById('qolFreshness').textContent),{},{timeout:60000});


 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'breeding'})));
 await page.locator('[data-breeding-page="breedingExp"]').click();
 await page.locator('.breed-exp-best').waitFor();
 await page.waitForFunction(()=>document.querySelector('[data-breed-exp-import]')?.textContent.includes('bonus loaded'));
 const importedMultiplier=Number(await page.locator('[name="multi"]').inputValue());
 assert(importedMultiplier>1,'Saved EXP multiplier must replace the x1 placeholder');
 assert.equal(await page.locator('[name="legend"]').inputValue(),'900');
 assert.equal(await page.locator('[name="mode"]').inputValue(),'natural');
 assert.equal(await page.locator('[name="rarity"]').getAttribute('max'),'10');
 assert.equal(await page.locator('.breed-exp-table tbody tr').count(),11);
 assert.equal(await page.locator('[name="rarity"]').inputValue(),'10');
 await page.locator('[name="rarity"]').fill('0');await page.locator('button[type="submit"]').filter({hasText:'Optimize EXP'}).click();
 assert((await page.locator('.breed-exp-best').innerText()).includes('Normal'));
 await page.locator('[name="rarity"]').fill('10');await page.locator('button[type="submit"]').filter({hasText:'Optimize EXP'}).click();
 await page.locator('#quickNotesToggle').click();
 assert.equal(await page.locator('[name="capacity"]').inputValue(),'15','Imported merit-shop egg slots are included');
 await page.locator('.breeding-exp').screenshot({path:'../audit/breeding-exp-desktop.png'});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('.breeding-exp').screenshot({path:'../audit/breeding-exp-mobile.png'});
 await page.locator('[data-breed-exp-tab="bonuses"]').click();
 await page.waitForFunction(()=>document.querySelector('[data-breed-bonus-total] h3')?.textContent.includes('×'));
 assert.equal(await page.locator('[data-breed-bonus-total] h3').textContent(),importedMultiplier.toLocaleString('en-US',{maximumFractionDigits:2})+'×');
 assert.equal(await page.locator('[data-breed-bonus-rows] tr').count(),14);
 await page.locator('[data-breed-bonus-search]').fill('Oinkin');assert.equal(await page.locator('[data-breed-bonus-rows] tr').count(),1);
 assert((await page.locator('[data-breed-bonus-rows]').innerText()).includes('Nest Eggs'));
 await page.locator('[data-breed-bonus-search]').fill('');await page.locator('[data-breed-bonus-hide]').check();assert(await page.locator('[data-breed-bonus-rows] tr').count()<14);
 await page.locator('[data-breed-bonus-hide]').uncheck();await page.locator('[data-breed-bonus-filter]').selectOption('Multiplier');assert.equal(await page.locator('[data-breed-bonus-rows] tr').count(),3);
 await page.locator('[data-breed-bonus-filter]').selectOption('');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('.breed-bonuses').screenshot({path:'../audit/breeding-exp-bonuses-mobile.png'});
 await page.setViewportSize({width:1440,height:1000});await page.locator('.breed-bonuses').screenshot({path:'../audit/breeding-exp-bonuses-desktop.png'});
 await page.locator('[data-breed-exp-tab="optimizer"]').click();assert.equal(await page.locator('[name="rarity"]').inputValue(),'10');
 await page.locator('[data-skill-tab="arenaTeams"]').click();await page.locator('#arenaSize').waitFor();
 const asyncCases=await page.evaluate(async raw=>{
  const NativeWorker=window.Worker,workers=[],host=document.createElement('div');document.body.append(host);
  window.Worker=class {constructor(){workers.push(this);}postMessage(){}terminate(){this.stopped=true;}};
  try{
   window.BreedingExp.render(host,raw,()=>{});
   for(const [name,value] of [['multi','7'],['legend','123']]){const input=host.querySelector(`[name="${name}"]`);input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));}
   workers[0].onmessage({data:{result:{total:99,legendRarity:900}}});
   const preserved=host.querySelector('[name="multi"]').value==='7'&&host.querySelector('[name="legend"]').value==='123'&&workers[0].stopped;
   window.BreedingExp.render(host,raw,()=>{});workers[1].onerror();
   const fallback=host.querySelector('[data-breed-exp-import]').textContent.includes('manually')&&workers[1].stopped;
   window.BreedingExp.render(host,raw,()=>{});host.replaceChildren();await Promise.resolve();
   return {preserved,fallback,stopped:workers[2].stopped};
  }finally{window.Worker=NativeWorker;host.remove();}
 },raw);
 assert.deepEqual(asyncCases,{preserved:true,fallback:true,stopped:true});
 assert.deepEqual(errors,[]);console.log('Breeding EXP browser: save import, navigation, recalculation and mobile overflow passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
