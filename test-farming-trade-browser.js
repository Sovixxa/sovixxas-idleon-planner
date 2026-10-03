'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/Sofia/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://localhost:7338/**',async route=>{const pathname=decodeURIComponent(new URL(route.request().url()).pathname);if(pathname.startsWith('/__'))return route.fulfill({contentType:'application/json',body:'{}'});const file=path.resolve(__dirname,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(__dirname+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory())return route.fulfill({status:404,body:''});return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});});

 await page.goto('http://localhost:7338/');
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'farming'})));
 await page.locator('[data-w6-tab="trade777"]').evaluate(el=>el.click());await page.getByText('Load a complete account export containing Farming data.').waitFor({state:'attached'});
 await page.evaluate(text=>{document.getElementById('jsonInput').value=text;document.getElementById('parseBtn').click();},fs.readFileSync('../example json.txt','utf8'));
 await page.waitForFunction(()=>/^(Save age|Imported):/.test(document.getElementById('qolFreshness').textContent),{},{timeout:60000});
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'farming'})));
 await page.locator('[data-w6-tab="trade777"]').click();await page.locator('[data-bean-base]').waitFor({timeout:60000});
 assert.match(await page.locator('[data-bean-plan]').innerText(),/already too high/);
 await page.locator('[data-bean-base]').selectOption('empty');assert.match(await page.locator('[data-bean-plan]').innerText(),/empty-depot reset/);
 await page.locator('[data-bean-quantity]').fill('-1');assert.match(await page.locator('[data-bean-preview]').innerText(),/non-negative/);
 await page.locator('[data-bean-quantity]').fill('0');assert.match(await page.locator('[data-bean-preview]').innerText(),/0 beans/);
 await page.locator('[data-bean-crop]').selectOption('1');assert(await page.locator('[data-bean-plots] article').count()>0);
 await page.locator('#quickNotesToggle').click();await page.screenshot({path:'../audit/farming-777-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:'../audit/farming-777-mobile.png',fullPage:true});
 await page.locator('[data-w6-tab="crops"]').click();assert.equal(await page.locator('.farm777').count(),0);assert.deepEqual(errors,[]);
 console.log('Farming 777 browser: missing/full save, calculator, reset scenario, input validation, navigation and mobile layout passed.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
