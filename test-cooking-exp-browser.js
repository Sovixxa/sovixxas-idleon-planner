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
 await page.locator('#changeJsonBtn').click();
 const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8'));
 await page.locator('#jsonInput').fill(JSON.stringify(raw));await page.locator('#parseBtn').click();
 await page.waitForFunction(()=>/^(Save age|Imported):/.test(document.getElementById('qolFreshness').textContent),{},{timeout:60000});



 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'cooking'})));
 await page.locator('[data-cook-tab="Cooking EXP"]').click();
 await page.waitForFunction(()=>document.querySelector('[data-cook-exp-total]')?.textContent.includes('46 sources'),{},{timeout:60000});
 assert.equal(await page.locator('[data-cook-exp-rows] tr').count(),46);
 await page.locator('[data-cook-exp-filter]').selectOption('multi');
 assert.equal(await page.locator('[data-cook-exp-rows] tr').count(),4);
 await page.locator('[data-cook-exp-filter]').selectOption('');
 await page.locator('[data-cook-exp-search]').fill('chow');
 assert.equal(await page.locator('[data-cook-exp-rows] tr').count(),1);
 await page.locator('[data-cook-exp-search]').fill('');
 assert.equal(await page.locator('[data-cook-exp-character]').count(),0,'Account view has no character selector');
 assert((await page.locator('[data-cook-exp-total]').textContent()).includes('Account-wide'));
 assert((await page.locator('.cook-exp-account thead').textContent()).includes('Maximum / hard cap'));
 assert((await page.locator('[data-cook-exp-rows]').textContent()).includes('450'));
 await page.locator('[data-cook-exp-hide]').check();
 assert(await page.locator('[data-cook-exp-rows] tr').count()<46);
 await page.locator('[data-cook-exp-hide]').uncheck();
 await page.evaluate(()=>document.querySelector('#quickNotesToggle')?.click());
 await page.screenshot({path:'../audit/cooking-exp-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No mobile page overflow');
 await page.screenshot({path:'../audit/cooking-exp-mobile.png',fullPage:true});
 await page.locator('[data-cook-tab="Meals"]').click();
 assert(await page.locator('.cook-meal').count()>0);
 assert.deepEqual(errors,[]);
 console.log('Cooking EXP browser: navigation, loaded total, all sources, search, filters, account view, caps and breakpoints, hide maxed, mobile width and Meals return passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
