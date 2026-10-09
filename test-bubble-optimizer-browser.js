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

 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'alchemy'})));
 await page.locator('.bubble-optimizer').waitFor({timeout:60000});
 await page.waitForFunction(()=>!document.querySelector('.bubble-optimizer .review-note').textContent.includes('loading or unavailable'),{},{timeout:60000});
 assert.equal(await page.locator('.bubble-optimizer tbody tr').count(),133);
 const materialRows=await page.evaluate(async raw=>{const report=BubbleOptimizer.model(raw,ALCHEMY_CATALOG);return report.rows.map(r=>({name:r.name,categories:UpgradeMaterials.bubble(r)}));},raw);
 const materialOptions=await page.locator('#bubbleMaterial option').allTextContents();
 for(const category of materialOptions.filter(s=>s!=='All')){
  await page.locator('#bubbleMaterial').selectOption(category);
  const expected=materialRows.filter(r=>r.categories.includes(category));
  assert.equal(await page.locator('.bubble-optimizer tbody tr').count(),expected.length,category+' row count');
  const text=await page.locator('.bubble-optimizer tbody').innerText();
  for(const row of expected)assert(text.includes(row.name),category+': '+row.name);
  for(const name of await page.locator('.bubble-todo h4 strong').allTextContents())assert(expected.some(r=>r.name===name),category+' recommendation: '+name);
 }
 await page.locator('#bubbleMaterial').selectOption('All');
 await page.locator('#bubbleClicks').fill('2');await page.locator('#bubbleClicks').dispatchEvent('change');
 await page.locator('#bubbleMethod').selectOption('Candy / materials');
 assert(await page.locator('[data-candy-yield]').count()>0);
 assert.equal(await page.locator('[data-bubble-details][open]').count(),0);
 await page.locator('article').filter({has:page.locator('[data-candy-yield]')}).first().locator('summary').click();
 await page.locator('[data-candy-yield]').first().fill('1000000000');await page.locator('[data-candy-yield]').first().dispatchEvent('change');
 assert.match(await page.locator('.bubble-todo').innerText(),/2 candies for this session/);
 assert(await page.locator('.bubble-todo .bubble-name img').first().evaluate(img=>img.complete&&img.naturalWidth>0));
 await page.locator('#bubbleMethod').selectOption('Atoms');
 assert(await page.locator('.bubble-todo article').count()>0);
 if(!await page.locator('.bubble-todo article details').first().evaluate(el=>el.open))await page.locator('.bubble-todo article').first().locator('summary').click();
 await page.locator('#bubbleAtomClicks').fill('1');await page.locator('#bubbleAtomClicks').dispatchEvent('change');
 assert.match(await page.locator('.bubble-todo article').first().innerText(),/This session: 1 clicks/);
 await page.locator('#bubbleAtomClicks').fill('0');await page.locator('#bubbleAtomClicks').dispatchEvent('change');
 assert.match(await page.locator('.bubble-todo article').first().innerText(),/This session: 0 clicks/);
 await page.locator('#bubbleMethod').selectOption('All');
 await page.locator('#bubbleStatus').selectOption('Capped');assert(await page.locator('.bubble-optimizer tbody tr').count()>0);
 await page.locator('#bubbleStatus').selectOption('All');await page.locator('#bubbleSearch').fill('gifts');assert.equal(await page.locator('.bubble-optimizer tbody tr').count(),1);
 await page.locator('#bubbleSearch').fill('');await page.locator('#bubbleGoal').selectOption('0.99');await page.locator('#bubbleClass').selectOption('matching');
 const marks=page.locator('[data-bubble-done]');if(await marks.count()){const id=await marks.first().getAttribute('data-bubble-done');await marks.first().evaluate(button=>{button.closest('details').open=true;});await marks.first().click();assert.equal(await page.locator('[data-bubble-done="'+id+'"]').count(),0);await page.locator('[data-bubble-reset]').click();assert.equal(await page.locator('[data-bubble-done="'+id+'"]').count(),1);}
 await page.locator('[data-bubble-collection]').click();await page.locator('.alchemy-catalog').waitFor();await page.locator('#backBubbleOptimizer').click();await page.locator('.bubble-optimizer').waitFor();
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'../audit/bubble-optimizer-desktop.png'});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile overflow');await page.screenshot({path:'../audit/bubble-optimizer-mobile.png'});
 assert.deepEqual(errors,[]);console.log('Bubble optimizer browser: import, worker, all bubbles, capped filter, search, targets, class context, collection round trip and mobile layout pass.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
