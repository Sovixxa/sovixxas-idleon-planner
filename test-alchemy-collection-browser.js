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


 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'alchemyCollection'})));
 await page.locator('.alchemy-board').waitFor();
 assert.equal(await page.locator('.alchemy-bubble').count(),133);
 assert.match(await page.locator('.alchemy-summary').innerText(),/133 \/ 133 unlocked/);
 if(await page.locator('#quickNotes').evaluate(el=>!el.classList.contains('collapsed')))await page.locator('.quick-notes-toggle').click();
 await page.locator('[data-bubble-id="O1"]').hover();
 await page.waitForFunction(()=>document.querySelector('#alchemyHover .alchemy-bonus-scope')?.textContent.includes('Account bonus'),{},{timeout:60000});
 assert.match(await page.locator('#alchemyHover .alchemy-bonus-value').innerText(),/10\./);
 let previousDimmed=Infinity;
 for(const threshold of [80,90,95,99]){
  await page.locator('[data-alchemy-threshold="'+threshold+'"]').click();
  const count=await page.locator('.alchemy-bubble.threshold-met').count();assert(count>0&&count<=previousDimmed);previousDimmed=count;
  assert.equal(await page.locator('[data-alchemy-threshold="'+threshold+'"]').getAttribute('aria-pressed'),'true');
 }
 assert(await page.locator('[data-bubble-id="Y23"]').evaluate(el=>el.classList.contains('threshold-met')));
 assert(!(await page.locator('[data-bubble-id="O0"]').evaluate(el=>el.classList.contains('threshold-met'))));
 assert(!(await page.locator('[data-bubble-id="O11"]').evaluate(el=>el.classList.contains('threshold-met'))));
 await page.locator('[data-alchemy-threshold="0"]').click();assert.equal(await page.locator('.threshold-met').count(),0);
 const capped=page.locator('[data-bubble-id="Y23"]');await capped.scrollIntoViewIfNeeded();await capped.hover();
 await page.waitForFunction(()=>document.querySelector('#alchemyHover .alchemy-bonus-scope')?.textContent.includes('Account bonus'),{},{timeout:60000});
 assert.equal(await page.locator('#alchemyHover .alchemy-bonus-value').innerText(),'35% of 35%');
 assert.match(await page.locator('#alchemyHover .alchemy-bonus-effect').innerText(),/35/);
 assert(!/[{}$]/.test(await page.locator('#alchemyHover .alchemy-bonus-effect').innerText()));
 assert(await page.locator('#alchemyHover').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;}));
 await page.keyboard.press('Escape');assert(!(await page.locator('#alchemyHover').isVisible()));
 await page.locator('[data-bubble-id="O0"]').focus();await page.locator('#alchemyHover').waitFor({state:'visible'});
 assert.match(await page.locator('#alchemyHover .alchemy-bonus-title').innerText(),/Prisma/);
 await page.locator('[data-bubble-id="O0"]').click();assert(await page.locator('#alchemyDetail').isVisible());
 await page.locator('#alchemyDetailClose').click();assert(!(await page.locator('#alchemyDetail').isVisible()));
 await page.locator('[data-bubble-id="O1"]').hover();
 await page.screenshot({path:'../audit/alchemy-collection-hover-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile overflow');
 await page.locator('[data-bubble-id="O1"]').click();assert(await page.locator('#alchemyDetail').isVisible());
 await page.screenshot({path:'../audit/alchemy-collection-mobile.png'});
 await page.locator('#backBubbleOptimizer').click();await page.locator('.bubble-optimizer').waitFor();
 assert.equal(await page.locator('#alchemyHover').count(),0);
 assert.deepEqual(errors,[]);console.log('Alchemy collection: live catalog, hover bonus/cap, Prisma, keyboard, Escape, pinned details, viewport bounds, mobile and navigation pass.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
