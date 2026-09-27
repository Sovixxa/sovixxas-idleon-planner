'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/Sofia/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
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
 await page.locator('#bubbleStatus').selectOption('Capped');assert(await page.locator('.bubble-optimizer tbody tr').count()>0);
 await page.locator('#bubbleStatus').selectOption('All');await page.locator('#bubbleSearch').fill('gifts');assert.equal(await page.locator('.bubble-optimizer tbody tr').count(),1);
 await page.locator('#bubbleSearch').fill('');await page.locator('#bubbleGoal').selectOption('0.99');await page.locator('#bubbleClass').selectOption('matching');
 const marks=page.locator('[data-bubble-done]');if(await marks.count()){const id=await marks.first().getAttribute('data-bubble-done');await marks.first().click();assert.equal(await page.locator('[data-bubble-done="'+id+'"]').count(),0);await page.locator('[data-bubble-reset]').click();assert.equal(await page.locator('[data-bubble-done="'+id+'"]').count(),1);}
 await page.locator('[data-bubble-collection]').click();await page.locator('.alchemy-catalog').waitFor();await page.locator('#backBubbleOptimizer').click();await page.locator('.bubble-optimizer').waitFor();
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'../audit/bubble-optimizer-desktop.png'});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile overflow');await page.screenshot({path:'../audit/bubble-optimizer-mobile.png'});
 assert.deepEqual(errors,[]);console.log('Bubble optimizer browser: import, worker, all bubbles, capped filter, search, targets, class context, collection round trip and mobile layout pass.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
