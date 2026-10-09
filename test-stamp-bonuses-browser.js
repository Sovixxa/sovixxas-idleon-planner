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
 const save=raw.data||raw;const levels=typeof save.StampLv==='string'?JSON.parse(save.StampLv):save.StampLv;const combat=typeof levels[0]==='string'?JSON.parse(levels[0]):levels[0];combat[3]=10000;levels[0]=combat;save.StampLv=levels;
 await page.locator('#jsonInput').fill(JSON.stringify(raw));await page.locator('#parseBtn').click();
 await page.waitForFunction(()=>/^(Save age|Imported):/.test(document.getElementById('qolFreshness').textContent),{},{timeout:60000});

 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'stamps'})));
 await page.locator('#stampOpenBonuses').click();await page.locator('#stampBonusSearch').waitFor({timeout:60000});
 const count=await page.locator('[data-stamp-id]').count();assert(count>100);
 assert.equal(await page.locator('.bubble-benefit-group').count(),7);
 await page.locator('#stampBonusHideMaxed').click();assert(await page.locator('[data-stamp-id]').count()<count);assert.equal(await page.locator('[data-stamp-id="StampA1"]').count(),1);
 await page.locator('#stampBonusHideMaxed').click();assert.equal(await page.locator('[data-stamp-id]').count(),count);
 await page.locator('#stampBonusSearch').fill('mining');assert(await page.locator('[data-stamp-id]').count()>0&&await page.locator('[data-stamp-id]').count()<count);
 await page.locator('#stampBonusCharacter').selectOption('1');assert.match(await page.locator('.bubble-bonus-explainer').innerText(),new RegExp(raw.charNames[1]));
 await page.locator('[data-stamp-id] summary').first().click();assert(await page.locator('[data-stamp-id] .bubble-bonus-source-details').first().isVisible());
 await page.locator('#stampBonusSearch').fill('');await page.locator('#stampBonusAll').check();
 if(await page.locator('#quickNotes').evaluate(el=>!el.classList.contains('collapsed')))await page.locator('.quick-notes-toggle').click();
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'../audit/stamp-bonuses-desktop.png'});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile overflow');await page.screenshot({path:'../audit/stamp-bonuses-mobile.png'});
 await page.locator('[data-stamp-view="stampCollection"]').click();await page.locator('.stamp-grid').first().waitFor();
 await page.locator('#stampOpenBonuses').click();await page.locator('#stampBonusSearch').waitFor();
 await page.locator('[data-stamp-view="stamps"]').click();await page.locator('#stampStatus').waitFor({timeout:60000});
 assert.deepEqual(errors,[]);console.log('Stamp Bonuses browser: tabs, character selection, grouped values, search, Hide maxed, source details, mobile and calculator round trip pass.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
