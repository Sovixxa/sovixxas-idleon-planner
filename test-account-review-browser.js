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
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'accountReview'})));
 await page.locator('.review-priorities').waitFor({timeout:60000});
 assert.equal(await page.locator('.review-priorities .review-start article').count(),3);
 await page.locator('[data-review-priority]').first().click();
 assert.equal(await page.locator('.review-plan-item').count(),1);
 await page.locator('[data-review-priority]').first().click();
 assert.equal(await page.locator('.review-plan-item').count(),1);
 await page.locator('[data-review-done]').click();
 assert.equal(await page.locator('.review-plan-item.complete').count(),1);
 await page.locator('[data-review-remove]').click();
 assert.equal(await page.locator('.review-plan-item').count(),0);
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:'../audit/account-priorities-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile overflow');
 await page.screenshot({path:'../audit/account-priorities-mobile.png'});
 assert.deepEqual(errors,[]);
 console.log('Account priorities browser: real save worker, top three, checklist deduplication/completion/removal and mobile layout pass.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
