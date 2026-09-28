'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/Sofia/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!=='http://localhost:7332')return route.abort();const file=path.resolve(__dirname,'.'+(url.pathname==='/'?'/index.html':url.pathname));return route.fulfill(file.startsWith(__dirname+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile()?{contentType:({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)}:{status:404,body:''});});
 await page.goto('http://localhost:7332/');await page.locator('#quickNotesToggle').click();const raw=fs.readFileSync('../example json.txt','utf8');await page.evaluate(raw=>{document.querySelector('#jsonInput').value=raw;document.querySelector('#parseBtn').click();},raw);
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'divinity'})));
 await page.locator('[data-div-tab="gods"]').click();assert.equal(await page.locator('.divinity-god').count(),10);
 for(const [id,major,minor] of [[1,'Lab Mainframe','Talent LV'],[2,'All kills count 2x','Total Damage'],[4,'Lab also counts','AFK Gains'],[5,'AFK claims','Class EXP'],[7,'Pearl','skill EXP']]){
  await page.locator(`[data-divinity-kind="god"][data-divinity-id="${id}"]`).click();const detail=await page.locator('#divinityDetail').innerText();assert(detail.includes(major));assert(detail.includes(minor));await page.locator('.divinity-close').click();
 }
 await page.locator('[data-divinity-kind="god"][data-divinity-id="1"]').click();
 await page.screenshot({path:'../audit/divinity-third-pass-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'../audit/divinity-third-pass-mobile.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(errors.length,0,errors.join('\n'));
 console.log('Divinity browser: all five corrected god details, ten tiles, mobile overflow and page errors pass.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
