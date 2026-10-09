'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!=='http://localhost:7332')return route.abort();const file=path.resolve(__dirname,'.'+(url.pathname==='/'?'/index.html':url.pathname));return route.fulfill(file.startsWith(__dirname+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile()?{contentType:({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)}:{status:404,body:''});});
 await page.goto('http://localhost:7332/');await page.locator('#quickNotesToggle').click();const raw=fs.readFileSync('../example json.txt','utf8');await page.evaluate(raw=>{document.querySelector('#jsonInput').value=raw;document.querySelector('#parseBtn').click();},raw);
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'tome'})));
 await page.waitForFunction(()=>document.querySelectorAll('.tome-grid .progression-card').length===122,{},{timeout:60000});
 await page.getByRole('searchbox',{name:'Search The Tome'}).fill('Successful Jelly');assert.equal(await page.locator('.tome-grid .progression-card').count(),1);await page.locator('.tome-grid .progression-card summary').click();assert((await page.locator('.tome-grid').innerText()).includes('Account Lv 6955'));assert((await page.locator('.tome-grid').innerText()).includes('800 max points'));
 await page.screenshot({path:'../audit/tome-current-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'../audit/tome-current-mobile.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.locator('[data-view=bonuses]').click();assert(!(await page.locator('.collection-grid').innerText()).includes('NaN'));assert.equal(errors.length,0,errors.join('\n'));console.log('Tome browser: 122 metrics, Jelly search/detail, bonuses, mobile overflow and page errors pass.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
