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
 await page.locator('[data-skill-tab="bubbleBonuses"]').click();
 await page.locator('.bubble-bonuses').waitFor();
 await page.waitForFunction(()=>document.querySelector('.bubble-bonus-status')?.textContent.includes('Account calculations loaded'),{},{timeout:60000});
 assert.equal(await page.locator('.bubble-bonus-entry').count(),133);assert.equal(await page.locator('.bubble-benefit-group').count(),7);
 assert.equal(await page.locator('[data-skill-tab="bubbleBonuses"][aria-selected="true"]').count(),1);
 await page.locator('#bubbleBonusHideMaxed').click();
 assert.equal(await page.locator('#bubbleBonusHideMaxed').getAttribute('aria-pressed'),'true');
 assert(await page.locator('.bubble-bonus-entry').count()<133);
 assert.equal(await page.locator('[data-bonus-id="Y23"]').count(),0);
 assert.equal(await page.locator('[data-bonus-id="O5"]').count(),1);
 assert.match(await page.locator('.bubble-bonus-status').innerText(),/maxed hidden/);
 await page.locator('#bubbleBonusHideMaxed').click();assert.equal(await page.locator('.bubble-bonus-entry').count(),133);

 await page.locator('#bubbleBonusSearch').fill('damage');assert(await page.locator('.bubble-bonus-entry').count()<133);
 assert.match(await page.locator('[data-bonus-id="O5"] .bubble-bonus-number').innerText(),/Character-dependent/);
 await page.locator('[data-bonus-id="O5"]>summary').click();assert(await page.locator('[data-bonus-id="O5"] .bubble-bonus-source-details').isVisible());
 await page.locator('#bubbleBonusSearch').fill('not-a-real-bonus');assert(await page.locator('.bubble-bonus-empty').isVisible());
 await page.locator('#bubbleBonusSearch').fill('');
 const before=await page.locator('[data-bonus-id="O0"] .bubble-bonus-number').innerText();
 await page.locator('#bubbleBonusClass').selectOption('matching');assert.notEqual(await page.locator('[data-bonus-id="O0"] .bubble-bonus-number').innerText(),before);
 await page.locator('#bubbleBonusAll').check();assert(await page.locator('[data-bonus-id="P31"]>summary').isVisible());
 await page.locator('#bubbleBonusAll').uncheck();await page.locator('#bubbleBonusClass').selectOption('all');
 if(await page.locator('#quickNotes').evaluate(el=>!el.classList.contains('collapsed')))await page.locator('.quick-notes-toggle').click();
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'../audit/bubble-bonuses-desktop.png'});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile overflow');await page.screenshot({path:'../audit/bubble-bonuses-mobile.png'});
 await page.locator('[data-skill-tab="alchemyCollection"]').click();await page.locator('.alchemy-board').waitFor();
 await page.locator('[data-skill-tab="bubbleBonuses"]').click();await page.locator('.bubble-bonuses').waitFor();
 assert.deepEqual(errors,[]);console.log('Bubble Bonuses browser: subtab navigation, worker, grouped values, search, source expansion, class context, all bonuses and mobile pass.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
