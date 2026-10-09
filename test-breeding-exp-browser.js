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
 assert.equal(await page.locator('.breed-exp-table tbody tr').count(),11);
 assert.equal(await page.locator('[name="rarity"]').inputValue(),'10');
 await page.locator('[name="rarity"]').fill('0');await page.locator('button[type="submit"]').filter({hasText:'Optimize EXP'}).click();
 assert((await page.locator('.breed-exp-best').innerText()).includes('Normal'));
 await page.locator('[name="rarity"]').fill('10');await page.locator('button[type="submit"]').filter({hasText:'Optimize EXP'}).click();
 await page.locator('#quickNotesToggle').click();
 await page.locator('.breeding-exp').screenshot({path:'../audit/breeding-exp-desktop.png'});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('.breeding-exp').screenshot({path:'../audit/breeding-exp-mobile.png'});
 await page.locator('[data-breed-exp-tab="bonuses"]').click();
 await page.waitForFunction(()=>document.querySelector('[data-breed-bonus-total] h3')?.textContent.includes('×'));
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
 assert.deepEqual(errors,[]);console.log('Breeding EXP browser: save import, navigation, recalculation and mobile overflow passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
